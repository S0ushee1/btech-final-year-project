"""
Flask routes for traffic violation detection API
"""

from flask import Blueprint, request, jsonify, current_app, send_from_directory, Response, stream_with_context
from werkzeug.utils import secure_filename
from .models import db, ViolationReport, User, LoginAudit
from .utils import process_media, get_metadata, validate_media_file
from .statuses import ReportStatus, normalize_status
import os
import json
from datetime import datetime, timedelta
import uuid
import time
import jwt
from sqlalchemy.exc import SQLAlchemyError
from pathlib import Path
from collections import defaultdict, deque
from functools import wraps

main_bp = Blueprint('main', __name__)
_RATE_LIMIT_BUCKETS: dict[str, deque] = defaultdict(deque)


def _json_error(http_status: int, code: str, message: str, **extra):
    payload = {
        "success": False,
        "error": message,
        "error_code": code,
    }
    payload.update(extra)
    return jsonify(payload), http_status


def rate_limit(limit_per_minute: int, bucket_name: str, config_key: str | None = None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            now = time.time()
            window_start = now - 60
            effective_limit = int(current_app.config.get(config_key, limit_per_minute)) if config_key else limit_per_minute
            client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
            key = f"{bucket_name}:{client_ip}"
            bucket = _RATE_LIMIT_BUCKETS[key]
            while bucket and bucket[0] < window_start:
                bucket.popleft()
            if len(bucket) >= effective_limit:
                return _json_error(
                    429,
                    "RATE_LIMIT_EXCEEDED",
                    "Too many requests. Please retry after some time.",
                    retry_after_seconds=60,
                )
            bucket.append(now)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def _make_token(user: User) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=int(current_app.config.get("JWT_EXPIRATION_HOURS", 24)))).timestamp()),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def _make_stream_token(user: User, ttl_minutes: int = 15) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "purpose": "reports_stream",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ttl_minutes)).timestamp()),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def _decode_token_from_header() -> dict | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    try:
        return jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def _decode_token_value(token: str) -> dict | None:
    try:
        return jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def require_auth(role: str | None = None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = _decode_token_from_header()
            if not claims:
                return _json_error(401, "AUTH_REQUIRED", "Missing or invalid access token")

            if role and claims.get("role") != role:
                return _json_error(403, "FORBIDDEN", "Insufficient role for this action")

            request.user_claims = claims
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def _client_ip() -> str:
    return request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")


def _append_login_audit_file(payload: dict) -> None:
    logs_dir = Path(current_app.root_path).parent / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    out_file = logs_dir / "login_audit.jsonl"
    with out_file.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=True) + "\n")


def _record_login_attempt(email: str, success: bool, user: User | None = None, reason: str | None = None) -> None:
    try:
        audit = LoginAudit(
            email=email,
            user_id=user.id if user else None,
            role=user.role if user else None,
            success=success,
            ip_address=_client_ip(),
            user_agent=(request.user_agent.string if request.user_agent else None),
            reason=reason,
        )
        db.session.add(audit)
        db.session.commit()
        _append_login_audit_file(audit.to_dict())
    except Exception as exc:
        db.session.rollback()
        current_app.logger.warning("event=login_audit_failed err=%s", str(exc))


@main_bp.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = "citizen"

    if not name or not email or len(password) < 6:
        return _json_error(400, "INVALID_REGISTRATION_INPUT", "Name, valid email and password (min 6 chars) are required")

    existing = User.query.filter_by(email=email).first()
    if existing:
        return _json_error(409, "EMAIL_ALREADY_EXISTS", "Email already registered")

    user = User(name=name, email=email, role=role, created_by_user_id=None)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = _make_token(user)
    return jsonify({"success": True, "token": token, "user": user.to_dict()}), 201


@main_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return _json_error(400, "INVALID_LOGIN_INPUT", "Email and password are required")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        _record_login_attempt(email=email or "unknown", success=False, user=user, reason="invalid_credentials")
        return _json_error(401, "INVALID_CREDENTIALS", "Invalid email or password")

    _record_login_attempt(email=email, success=True, user=user, reason="login_success")
    token = _make_token(user)
    return jsonify({"success": True, "token": token, "user": user.to_dict()}), 200


@main_bp.route("/auth/me", methods=["GET"])
@require_auth()
def get_me():
    user_id = int(request.user_claims["sub"])
    user = User.query.get(user_id)
    if not user:
        return _json_error(404, "USER_NOT_FOUND", "User not found")
    return jsonify({"success": True, "user": user.to_dict()}), 200


@main_bp.route("/auth/stream-token", methods=["GET"])
@require_auth()
def get_stream_token():
    user_id = int(request.user_claims["sub"])
    user = User.query.get(user_id)
    if not user:
        return _json_error(404, "USER_NOT_FOUND", "User not found")
    ttl_minutes = int(current_app.config.get("STREAM_TOKEN_TTL_MINUTES", 15))
    token = _make_stream_token(user, ttl_minutes=ttl_minutes)
    return jsonify({"success": True, "stream_token": token, "expires_in_seconds": ttl_minutes * 60}), 200


@main_bp.route("/auth/profile", methods=["PUT"])
@require_auth()
def update_profile():
    user_id = int(request.user_claims["sub"])
    user = User.query.get(user_id)
    if not user:
        return _json_error(404, "USER_NOT_FOUND", "User not found")

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return _json_error(400, "INVALID_PROFILE_INPUT", "Name is required")

    user.name = name
    db.session.commit()
    return jsonify({"success": True, "message": "Profile updated", "user": user.to_dict()}), 200


@main_bp.route("/auth/password", methods=["PUT"])
@require_auth()
def change_password():
    user_id = int(request.user_claims["sub"])
    user = User.query.get(user_id)
    if not user:
        return _json_error(404, "USER_NOT_FOUND", "User not found")

    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if len(new_password) < 6:
        return _json_error(400, "INVALID_NEW_PASSWORD", "New password must be at least 6 characters")
    if not user.check_password(current_password):
        return _json_error(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect")

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"success": True, "message": "Password changed successfully"}), 200


@main_bp.route("/admin/users/authority", methods=["POST"])
@require_auth(role="authority")
def create_authority_user():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or len(password) < 6:
        return _json_error(400, "INVALID_AUTHORITY_INPUT", "Name, email and password (min 6 chars) are required")
    if User.query.filter_by(email=email).first():
        return _json_error(409, "EMAIL_ALREADY_EXISTS", "Email already registered")

    creator_id = int(request.user_claims["sub"])
    authority = User(name=name, email=email, role="authority", created_by_user_id=creator_id)
    authority.set_password(password)
    db.session.add(authority)
    db.session.commit()
    return jsonify({"success": True, "message": "Authority user created", "user": authority.to_dict()}), 201


@main_bp.route("/admin/users", methods=["GET"])
@require_auth(role="authority")
def list_users_with_creator():
    users = User.query.order_by(User.created_at.desc()).all()
    creator_ids = {u.created_by_user_id for u in users if u.created_by_user_id}
    creators = {}
    if creator_ids:
        creator_rows = User.query.filter(User.id.in_(creator_ids)).all()
        creators = {c.id: c for c in creator_rows}

    payload = []
    for user in users:
        creator = creators.get(user.created_by_user_id)
        item = user.to_dict()
        item["creator_name"] = creator.name if creator else None
        item["creator_email"] = creator.email if creator else None
        payload.append(item)

    return jsonify({"success": True, "count": len(payload), "users": payload}), 200


@main_bp.route("/admin/login-audits", methods=["GET"])
@require_auth(role="authority")
def list_login_audits():
    limit = min(int(request.args.get("limit", 100)), 500)
    offset = max(int(request.args.get("offset", 0)), 0)
    audits = (
        LoginAudit.query
        .order_by(LoginAudit.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return jsonify({
        "success": True,
        "count": len(audits),
        "audits": [a.to_dict() for a in audits],
    }), 200

@main_bp.route('/upload', methods=['POST'])
@rate_limit(30, "upload", "RATE_LIMIT_UPLOAD_PER_MIN")
@require_auth(role="citizen")
def upload():
    """
    Endpoint for uploading media for violation detection
    
    Expected form data:
    - file: image/video file
    - location: (optional) location string
    - user_id: (optional) user identifier
    - comments: (optional) additional comments
    """
    try:
        # Validate file presence
        if 'file' not in request.files:
            return _json_error(400, "MISSING_FILE", "Please select a file to upload", result="invalid_input")
        
        file = request.files['file']
        
        # Validate filename
        if file.filename == '':
            return _json_error(400, "EMPTY_FILENAME", "Selected file has no name", result="invalid_input")

        max_size_bytes = int(current_app.config.get("MAX_CONTENT_LENGTH", 100 * 1024 * 1024))
        is_valid, validation_error = validate_media_file(file, max_size_bytes)
        if not is_valid:
            return _json_error(400, "INVALID_MEDIA_FILE", "Invalid media file", result="invalid_input", message=validation_error)

        # Generate unique filename to avoid collisions
        original_filename = secure_filename(file.filename)
        ext = os.path.splitext(original_filename)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
        path = os.path.join(upload_folder, unique_filename)
        
        # Save file
        file.save(path)
        
        # Get optional form data
        location = request.form.get('location', 'Unknown Location')
        user_id = request.form.get('user_id', 'anonymous')
        comments = request.form.get('comments', '')

        # Guard against oversized location payloads (e.g., full address + maps URL)
        # that can exceed strict DB varchar limits in some environments.
        if not location:
            location = "Unknown Location"
        location = str(location).strip()
        if len(location) > 190:
            location = f"{location[:187]}..."

        # Optional auth: if token provided, trust token user id instead of form field.
        user_name = "Anonymous"
        claims = _decode_token_from_header()
        if claims and claims.get("sub"):
            user_id = claims["sub"]
            try:
                _user_obj = User.query.get(int(claims["sub"]))
            except (TypeError, ValueError):
                _user_obj = None
            if _user_obj:
                user_name = _user_obj.name

        # Create initial report in PENDING state before AI processing.
        new_report = ViolationReport(
            violation_type="Processing",
            evidence_path=path,
            confidence_score=0.0,
            status=ReportStatus.PENDING.value,
            location=location,
            user_id=user_id,
            user_name=user_name,
            comments=comments,
        )
        db.session.add(new_report)
        try:
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            try:
                if os.path.exists(path):
                    os.remove(path)
            except OSError:
                pass
            return _json_error(
                400,
                "INVALID_LOCATION_LENGTH",
                "Location details are too long. Please shorten the address or map URL.",
                result="invalid_input",
            )
        
        # Extract metadata
        metadata = get_metadata(path)
        metadata['location'] = location
        metadata['user_id'] = user_id
        
        # Run AI analysis
        analysis = process_media(path, current_app.config)
        if analysis["status"] != "ok":
            db.session.delete(new_report)
            db.session.commit()
            try:
                if os.path.exists(path):
                    os.remove(path)
            except OSError:
                pass

            return _json_error(
                400,
                analysis.get("error_code", "MEDIA_PROCESSING_FAILED"),
                "Media processing failed",
                result="invalid_input",
                message=analysis.get("error", "Unable to process media"),
            )

        has_violation = bool(analysis["has_violation"])
        confidence = float(analysis["confidence_score"])
        violation_types = list(analysis["violations"])
        detection_state = analysis.get("detection_state", "violated" if has_violation else "non_violated")
        evidence_snapshot_path = analysis.get("evidence_snapshot_path")
        evidence_frame_index = analysis.get("evidence_frame_index")
        analysis_error_code = analysis.get("error_code")
        
        response_data = {
            "success": True,
            "result": detection_state,
            "filename": original_filename,
            "stored_as": unique_filename,
            "metadata": metadata,
            "violations": violation_types,
            "confidence_score": confidence,
            "error_code": analysis_error_code,
            "evidence": {
                "snapshot_path": evidence_snapshot_path,
                "frame_index": evidence_frame_index,
            },
            "analysis": {
                "has_violation": has_violation,
                "confidence_score": confidence,
                "violation_types": violation_types if violation_types else ["Non-Violated"],
                "violation_count": len(violation_types),
                "detection_state": detection_state,
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if detection_state == "needs_manual_review":
            workflow_status = ReportStatus.NEEDS_MANUAL_REVIEW.value
        elif has_violation and violation_types:
            workflow_status = ReportStatus.AI_DETECTED.value
        else:
            workflow_status = ReportStatus.NO_VIOLATION.value

        violation_type_str = ", ".join(violation_types) if violation_types else "No Violation (AI)"
        new_report.violation_type = violation_type_str
        new_report.confidence_score = confidence
        new_report.status = workflow_status
        try:
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return _json_error(
                500,
                "REPORT_SAVE_FAILED",
                "Report analysis completed but saving failed. Please retry.",
            )

        response_data["report_id"] = new_report.id
        response_data["workflow_status"] = workflow_status
        if workflow_status == ReportStatus.NEEDS_MANUAL_REVIEW.value:
            response_data["message"] = f"Potential violation found. Report #{new_report.id} queued for manual review."
            http_status = 201
        elif workflow_status == ReportStatus.AI_DETECTED.value:
            response_data["message"] = f"Violation detected by AI. Report #{new_report.id} created."
            http_status = 201
        else:
            response_data["message"] = f"No violation detected by AI. Report #{new_report.id} logged."
            http_status = 200

        current_app.logger.info(
            "event=upload_processed report_id=%s result=%s workflow_status=%s confidence=%.2f violations=%s",
            new_report.id,
            detection_state,
            workflow_status,
            confidence,
            "|".join(violation_types) if violation_types else "none",
        )
        return jsonify(response_data), http_status
        
    except Exception as e:
        current_app.logger.exception("event=upload_failed err=%s", str(e))
        return _json_error(500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request")

@main_bp.route('/reports', methods=['GET'])
@require_auth()
def get_reports():
    """
    Get all violation reports with optional filtering
    Query parameters:
    - status: filter by status
    - limit: number of records to return
    - offset: pagination offset
    """
    try:
        status = request.args.get('status')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        query = ViolationReport.query
        requester_role = request.user_claims.get("role")
        requester_id = request.user_claims.get("sub")

        if requester_role == "citizen":
            query = query.filter_by(user_id=str(requester_id))
        
        if status:
            normalized_status = normalize_status(status)
            if not normalized_status:
                return _json_error(400, "INVALID_STATUS_FILTER", "Invalid report status filter")
            query = query.filter_by(status=normalized_status)
        
        reports = query.order_by(ViolationReport.created_at.desc()).limit(limit).offset(offset).all()
        
        return jsonify({
            "success": True,
            "count": len(reports),
            "reports": [report.to_dict() for report in reports]
        }), 200
        
    except Exception as e:
        current_app.logger.exception("event=get_reports_failed err=%s", str(e))
        return _json_error(500, "REPORTS_FETCH_FAILED", "Failed to fetch reports")

@main_bp.route('/reports/<int:report_id>', methods=['GET'])
@require_auth()
def get_report(report_id):
    """Get specific violation report by ID"""
    try:
        report = ViolationReport.query.get_or_404(report_id)
        requester_role = request.user_claims.get("role")
        requester_id = request.user_claims.get("sub")
        if requester_role == "citizen" and str(report.user_id) != str(requester_id):
            return _json_error(403, "FORBIDDEN", "You can only view your own reports")
        return jsonify({
            "success": True,
            "report": report.to_dict()
        }), 200
    except Exception:
        return _json_error(404, "REPORT_NOT_FOUND", "Report not found")

@main_bp.route('/reports/<int:report_id>/review', methods=['PUT'])
@rate_limit(60, "review", "RATE_LIMIT_REVIEW_PER_MIN")
@require_auth(role="authority")
def review_report(report_id):
    """Update report status (for admin use)"""
    try:
        report = ViolationReport.query.get_or_404(report_id)
        
        data = request.get_json()
        if not data:
            return _json_error(400, "INVALID_JSON_BODY", "Invalid JSON body")

        if 'status' in data:
            requested_status = normalize_status(data['status'])
            allowed_transitions = {ReportStatus.CONFIRMED.value, ReportStatus.REJECTED.value}
            if requested_status not in allowed_transitions:
                return _json_error(
                    400,
                    "INVALID_REVIEW_STATUS",
                    "Review status must be CONFIRMED or REJECTED",
                )
            report.status = requested_status
        if 'fine_amount' in data:
            report.fine_amount = data['fine_amount']
        if 'admin_notes' in data:
            report.admin_notes = data['admin_notes']
        
        report.reviewed_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Report updated successfully",
            "report": report.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.exception("event=review_failed report_id=%s err=%s", report_id, str(e))
        return _json_error(500, "REVIEW_UPDATE_FAILED", "Failed to update report")


@main_bp.route('/reports/stream', methods=['GET'])
def stream_reports():
    """
    SSE stream for report updates.
    Auth can be provided either via Authorization Bearer header or ?token=... query.
    """
    claims = _decode_token_from_header()
    if not claims:
        stream_token = (request.args.get("stream_token") or "").strip()
        if stream_token:
            claims = _decode_token_value(stream_token)
            if claims and claims.get("purpose") != "reports_stream":
                claims = None

    if not claims:
        return _json_error(401, "AUTH_REQUIRED", "Missing or invalid access token")

    requester_role = claims.get("role")
    requester_id = str(claims.get("sub") or "")
    poll_seconds = max(int(current_app.config.get("REPORT_STREAM_POLL_SECONDS", 3)), 1)

    def _stream_scope():
        scoped_query = ViolationReport.query
        if requester_role == "citizen":
            scoped_query = scoped_query.filter_by(user_id=requester_id)
        return scoped_query

    def _event_payload(event_type: str, report: ViolationReport, previous_status: str | None = None):
        payload = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "report": report.to_dict(),
        }
        if previous_status is not None:
            payload["previous_status"] = previous_status
        return payload

    def event_stream():
        last_seen: dict[int, dict] = {}
        yield f"event: ready\ndata: {json.dumps({'status': 'connected', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
        while True:
            try:
                latest_reports = (
                    _stream_scope()
                    .order_by(ViolationReport.id.desc())
                    .limit(100)
                    .all()
                )
                current_seen: dict[int, dict] = {}
                has_events = False

                for report in latest_reports:
                    snapshot = {
                        "status": report.status,
                        "created_at": report.created_at.isoformat() if report.created_at else None,
                        "reviewed_at": report.reviewed_at.isoformat() if report.reviewed_at else None,
                    }
                    current_seen[report.id] = snapshot
                    previous = last_seen.get(report.id)
                    if previous is None:
                        payload = _event_payload("report_created", report)
                        yield f"data: {json.dumps(payload)}\n\n"
                        has_events = True
                        continue

                    if previous.get("status") != snapshot["status"]:
                        payload = _event_payload("status_changed", report, previous_status=previous.get("status"))
                        yield f"data: {json.dumps(payload)}\n\n"
                        has_events = True

                    if previous.get("reviewed_at") != snapshot["reviewed_at"] and snapshot["reviewed_at"] is not None:
                        payload = _event_payload("report_reviewed", report)
                        yield f"data: {json.dumps(payload)}\n\n"
                        has_events = True

                if not has_events:
                    yield "event: ping\ndata: {}\n\n"
                else:
                    yield "event: synced\ndata: {}\n\n"

                last_seen.clear()
                last_seen.update(current_seen)

                time.sleep(poll_seconds)
            except GeneratorExit:
                break
            except Exception as exc:
                current_app.logger.warning("event=reports_stream_error err=%s", str(exc))
                break

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return Response(stream_with_context(event_stream()), mimetype='text/event-stream', headers=headers)

@main_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Traffic Violation Detection API"
    }), 200


@main_bp.route('/media/<path:filename>', methods=['GET'])
def serve_media(filename):
    """Serve uploaded media for authenticated users."""
    upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
    safe_name = os.path.basename(filename)
    return send_from_directory(upload_folder, safe_name)
