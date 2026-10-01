# Traffic Vision Project Documentation

## 1. Overview

Traffic Vision is a full-stack traffic violation reporting and review platform. Citizens can upload image or video evidence of suspected traffic violations, and the backend analyzes the media with a YOLO-based detection pipeline plus rule-based logic. Authority users can then review, confirm, or reject reports from an operations dashboard.

The repository is split into two main applications:

- `backend/`: Flask API, SQLAlchemy models, authentication, media processing, and AI-assisted detection.
- `frontend/`: React + TypeScript + Vite interface for citizens and authority users.

## 2. Core Capabilities

- Citizen registration and login
- Authority login and authority account creation
- Media upload for traffic violation reporting
- AI-assisted report analysis using YOLOv8 and OpenCV
- Rule-based violation classification
- Report lifecycle tracking from upload to review
- Real-time report updates through Server-Sent Events (SSE) with polling fallback
- Audit logging for login attempts
- Analytics and dashboard views for authority users

## 3. High-Level Architecture

### Backend

- Framework: Flask
- ORM: Flask-SQLAlchemy
- Migration support: Flask-Migrate
- Authentication: JWT with `PyJWT`
- AI/model layer: Ultralytics YOLO (`backend/yolov8n.pt`)
- Image/video processing: OpenCV + Pillow
- Production server: Waitress

### Frontend

- Framework: React 18 + TypeScript
- Bundler/dev server: Vite
- Styling: Tailwind CSS + custom component styling
- State management: React context via `AppContext`
- Navigation: app-level state routing in `App.tsx`
- UI extras: toast system, command palette, realtime badge, activity rail

## 4. Repository Structure

```text
bolt/
  backend/
    app/
      __init__.py
      detector.py
      models.py
      routes.py
      statuses.py
      utils.py
      violation_rules.py
    tests/
      conftest.py
      test_api_publish_ready.py
      test_detection_state.py
      test_regression_samples.py
    run.py
    requirements.txt
    pytest.ini
    yolov8n.pt
    uploads/
    logs/
    instance/

  frontend/
    public/
    src/
      components/
      context/
      lib/
      pages/
      App.tsx
      index.css
      main.tsx
    package.json
    vite.config.ts
    tailwind.config.js
    postcss.config.js

  PROJECT_DOCUMENTATION.md
```

## 5. Backend Documentation

### 5.1 Application Setup

The Flask app is created in `backend/app/__init__.py`.

Key runtime behavior:

- Loads environment variables from `.env`
- Creates `instance/` and `uploads/` directories if missing
- Uses SQLite by default for local development
- Registers the main blueprint from `backend/app/routes.py`
- Enables CORS based on configuration
- Auto-creates tables in development mode
- Applies lightweight runtime schema patching for older SQLite databases

### 5.2 Backend Configuration

Main configuration values:

- `DATABASE_URL`
- `SECRET_KEY`
- `JWT_EXPIRATION_HOURS`
- `CORS_ORIGINS`
- `FLASK_ENV`
- `UPLOAD_FOLDER`
- `MODEL_PATH`
- `MAX_CONTENT_LENGTH`
- `VIDEO_MIN_VIOLATION_FRAMES`
- `DEFAULT_VIOLATION_CONFIDENCE_THRESHOLD`
- `STRICT_RULE_THRESHOLDS`
- `RATE_LIMIT_UPLOAD_PER_MIN`
- `RATE_LIMIT_REVIEW_PER_MIN`

Defaults currently used in code:

- SQLite database in `backend/instance/traffic.db`
- JWT expiration: `24` hours
- Upload limit: `100 MB`
- Upload rate limit: `30` requests/minute
- Review rate limit: `60` requests/minute

### 5.3 Data Models

#### `User`

Stored in the `users` table.

Fields:

- `id`
- `name`
- `email`
- `password_hash`
- `role`
- `created_by_user_id`
- `created_at`

Roles:

- `citizen`
- `authority`

#### `ViolationReport`

Stored in the `violation_reports` table.

Fields:

- `id`
- `violation_type`
- `evidence_path`
- `confidence_score`
- `status`
- `location`
- `user_id`
- `user_name`
- `comments`
- `fine_amount`
- `admin_notes`
- `created_at`
- `reviewed_at`

#### `LoginAudit`

Stored in the `login_audits` table and also appended to `backend/logs/login_audit.jsonl`.

Fields:

- `id`
- `email`
- `user_id`
- `role`
- `success`
- `ip_address`
- `user_agent`
- `reason`
- `created_at`

### 5.4 Report Statuses

Canonical backend statuses are defined in `backend/app/statuses.py`.

- `PENDING`
- `AI_DETECTED`
- `NEEDS_MANUAL_REVIEW`
- `NO_VIOLATION`
- `CONFIRMED`
- `REJECTED`

The frontend maps these to UI-friendly labels such as `Pending Review`, `Needs Manual Review`, and `Confirmed/Fine Issued`.

### 5.5 Authentication and Authorization

Protected routes use JWT bearer tokens.

Main auth endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /auth/stream-token`
- `PUT /auth/profile`
- `PUT /auth/password`

Role restrictions:

- Citizen-only: `POST /upload`
- Authority-only:
  - `POST /admin/users/authority`
  - `GET /admin/users`
  - `GET /admin/login-audits`
  - `PUT /reports/<id>/review`

### 5.6 Media Upload and Processing Flow

The upload flow is implemented mainly in `backend/app/routes.py` and `backend/app/utils.py`.

Flow:

1. Citizen uploads an image or video to `POST /upload`.
2. Backend validates file type, file size, and filename.
3. The file is saved into `backend/uploads/` with a UUID-based filename.
4. A `ViolationReport` is created in `PENDING` state.
5. Media metadata is extracted.
6. The AI pipeline processes the media.
7. Violations, confidence, and detection state are computed.
8. Report status is updated to:
   - `AI_DETECTED`
   - `NEEDS_MANUAL_REVIEW`
   - `NO_VIOLATION`
9. Response payload returns analysis details and the created report ID.

### 5.7 AI and Detection Pipeline

The detection layer uses:

- `backend/app/detector.py` for YOLO inference helpers
- `backend/app/violation_rules.py` for rule-based traffic violation logic
- `backend/app/utils.py` for media validation, metadata extraction, and orchestration

Examples of supported detection categories mentioned in the codebase/documentation:

- Wrong lane usage
- Zebra crossing obstruction
- Stop line violation
- Triple riding
- No helmet
- Mobile phone use while riding
- Reckless or dangerous driving

### 5.8 Realtime Updates

The backend exposes `GET /reports/stream` as an SSE endpoint.

Behavior:

- Accepts authentication through bearer token or `stream_token`
- Sends `ready`, `ping`, and report-change events
- Scopes citizen users to only their own reports
- Polls internally at a configurable interval and emits status changes

### 5.9 API Summary

#### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /auth/stream-token`
- `PUT /auth/profile`
- `PUT /auth/password`

#### Admin

- `POST /admin/users/authority`
- `GET /admin/users`
- `GET /admin/login-audits`

#### Reports

- `POST /upload`
- `GET /reports`
- `GET /reports/<report_id>`
- `PUT /reports/<report_id>/review`
- `GET /reports/stream`

#### Utility

- `GET /health`
- `GET /media/<filename>`

### 5.10 Error Shape

Most backend errors follow this structure:

```json
{
  "success": false,
  "error": "Human readable message",
  "error_code": "MACHINE_READABLE_CODE"
}
```

## 6. Frontend Documentation

### 6.1 Frontend Structure

The frontend lives under `frontend/src/` and is organized into:

- `components/`: shared UI building blocks and status/realtime widgets
- `context/`: app-wide state and theme providers
- `pages/`: citizen and authority page views
- `lib/`: utilities such as the toast helper

### 6.2 Main Application Flow

`frontend/src/App.tsx` controls page navigation using component state instead of React Router.

Public pages:

- `home`
- `how-it-works`
- `login`
- `register`

Citizen pages:

- `report`
- `my-reports`
- `report-detail`
- `profile`

Authority pages:

- `home`
- `dashboard`
- `all-reports`
- `report-detail`
- `analytics`
- `profile`

The app also includes:

- keyboard shortcut support for a command palette (`Ctrl/Cmd + K`)
- a toast viewport for app-wide notifications
- role-based navigation rendering

### 6.3 AppContext Responsibilities

`frontend/src/context/AppContext.tsx` centralizes the main client-side behavior:

- login and registration
- logout
- current user/session hydration
- local storage persistence
- report fetching and mapping
- report upload
- authority review updates
- profile update
- password change
- realtime stream connection and fallback polling

### 6.4 Realtime Behavior

When a user is logged in:

1. The frontend requests a stream token from `/auth/stream-token`.
2. It opens an `EventSource` connection to `/reports/stream`.
3. Report-change events trigger `refreshReports()`.
4. If the stream fails, the app falls back to polling every 10 seconds.
5. It retries the SSE connection with backoff up to 30 seconds.

Realtime state is tracked as:

- `idle`
- `connecting`
- `live`
- `polling`

### 6.5 Key Pages

- `Home.tsx`: landing page and primary entry to the reporting flow
- `HowItWorks.tsx`: explanation of the reporting and review process
- `AuthPage.tsx`: combined login/register interface
- `ReportViolation.tsx`: citizen upload flow
- `MyReports.tsx`: citizen report history
- `ReportDetail.tsx`: detailed report evidence and decision state
- `AuthorityDashboard.tsx`: authority review queue/dashboard
- `AllReports.tsx`: broader report list for authority operations
- `Analytics.tsx`: authority-focused metrics and reporting
- `Profile.tsx`: profile and account management

### 6.6 Frontend Runtime Configuration

Environment variable:

- `VITE_API_BASE_URL`

Fallback value in code:

- `http://127.0.0.1:5000`

## 7. Local Setup

### 7.1 Backend Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

Default backend URL:

- `http://127.0.0.1:5000`

Optional `.env` values can be added in `backend/` if needed.

### 7.2 Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Typical frontend dev URL:

- `http://127.0.0.1:5173`

Optional frontend `.env` example:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
```

## 8. Testing and Validation

### Backend tests

```powershell
cd backend
pytest
```

Included backend test files:

- `test_api_publish_ready.py`
- `test_detection_state.py`
- `test_regression_samples.py`

### Frontend checks

```powershell
cd frontend
npm run typecheck
npm run lint
npm run build
```

## 9. Security and Operational Notes

- The default `SECRET_KEY` is suitable only for development and should be replaced in real deployments.
- Uploaded media is served from `/media/<filename>` by basename and does not currently enforce route-level auth checks.
- Rate limiting is in-memory and will reset on process restart.
- AI decisions are assistive and should not replace manual authority review.
- Uploads, logs, and SQLite database files will continue growing unless retention rules are added.

## 10. Known Project Notes

- Frontend navigation is state-based rather than URL-router based.
- The repository currently contains generated/runtime directories such as `uploads/`, `logs/`, `instance/`, `venv/`, and `node_modules/`.
- The frontend `package.json` still includes `@supabase/supabase-js`, but the current app context is built around the Flask backend API.

## 11. Primary Source Files

Backend:

- `backend/app/__init__.py`
- `backend/app/routes.py`
- `backend/app/models.py`
- `backend/app/utils.py`
- `backend/app/detector.py`
- `backend/app/violation_rules.py`
- `backend/app/statuses.py`

Frontend:

- `frontend/src/App.tsx`
- `frontend/src/context/AppContext.tsx`
- `frontend/src/context/ThemeContext.tsx`
- `frontend/src/pages/*.tsx`
- `frontend/src/components/*.tsx`
