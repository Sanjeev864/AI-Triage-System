# AI Triage System

Modernized triage platform with:
- Node.js + Express + TypeScript backend (`backend`)
- FastAPI ML microservice (`ml-service`)
- React frontend (`frontend`)
- Docker Compose services for PostgreSQL and Redis

## Architecture

- `frontend` -> REST + Socket.IO -> `backend`
- `backend` -> HTTP prediction/parsing calls -> `ml-service`
- `backend` prepared for PostgreSQL + Redis integration

## Quick Start

1. Start infra + ML service:
   - `docker-compose up -d --build`
2. Backend:
   - `cd backend`
   - `npm install`
   - `cp .env.example .env`
   - `npm run dev`
3. Frontend:
   - `cd frontend`
   - `npm install`
   - `cp ../.env.example .env` (optional: extract only `REACT_APP_API_URL`)
   - `npm start`

## Migrated Feature Endpoints

The new backend keeps your existing triage feature endpoints:
- `POST /api/triage`
- `POST /api/ambulance/pretriage`
- `POST /api/mass-casualty`
- `POST /api/vitals/update`
- `GET /api/vitals/history/:patientId`
- `GET /api/queue`
- `POST /api/override`
- `POST /api/discharge`
- `GET /api/beds`
- `POST /api/beds/update`
- `GET /api/audit`
- `POST /api/handover`
- `POST /api/parse-complaint`

Socket events:
- `queue_update`
- `ambulance_incoming`
- `patient_upgraded`
- `bed_update`

## Notes

- Legacy Flask backend files are still present for safety, but the new runtime path is `backend/src/index.ts`.
- The ML service supports both trained-model inference (if model files exist) and a deterministic fallback classifier.
