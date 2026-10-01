# Automated Detection of Traffic Violations Through Vision-Based Systems

B.Tech Final Year Project, Department of Computer Science and Engineering,
Institute of Aeronautical Engineering, Hyderabad

**Team:** M Ghnana Sousheel, S Surya Teja, M. Adharsh
**Guide:** B. Ramesh

## Overview
A crowdsourced traffic violation reporting system. Citizens upload images or
videos of violations. A YOLOv8 detector extracts vehicles and people, and a
rule-based inference engine flags violations such as triple riding, wrong-lane
usage and crosswalk obstruction. Authorities review the flagged reports on a
dashboard and confirm or reject them.

## Architecture
1. **Client tier:** citizen portal (React, Vite, Tailwind CSS)
2. **Application and AI tier:** Python REST API with YOLOv8 and a rule engine
3. **Administration tier:** dashboard for traffic authorities

## Project Structure

bolt/
backend/ Python API, detector, violation rules
frontend/ React web app
interface-images/ UI screenshots



## Setup

### Backend
```bash
cd bolt/backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

### Frontend
```bash
cd bolt/frontend
npm install
npm run dev
```

Edit `.env` with your own values before running. Never commit the real `.env` file.

## Results
Proof-of-concept evaluation on 20 citizen-submitted files: 65% overall accuracy,
80% on capacity (overloading) violations. Known limitations: small-object
detection (mobile phones) and dynamic zone inference.

## Tech Stack
Python, YOLOv8, OpenCV, Deep SORT, React, TypeScript, Tailwind CSS
