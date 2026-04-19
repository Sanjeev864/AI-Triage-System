# AI Triage System

A professional, production-grade emergency response triage system with real-time incident dispatch, ML-powered patient priority prediction, and team coordination features.

## 🎯 Features

- ✅ **Real-time Incident Dispatch** - Socket.io-based real-time broadcasting to responders
- ✅ **ML-Powered Triage** - Fast ML model predictions (< 100ms latency)
- ✅ **Professional Dashboard** - React-based responsive UI with real-time updates
- ✅ **Team Messaging** - Persistent channel-based communication for incident coordination
- ✅ **Patient Management** - Complete CRUD operations with vital signs tracking
- ✅ **Queue Management** - Track and manage incident response queue
- ✅ **Graceful Fallback** - Heuristic-based triage when ML service is unavailable
- ✅ **Production Ready** - Full error handling, testing, and deployment preparation

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│  Frontend (React/Vite/TypeScript)
│  - Dashboard
│  - Incident Management
│  - Real-Time Messaging
│  - Triage History
└──────────────┬──────────────────┘
               │ Socket.io + REST API
┌──────────────▼──────────────────┐
│ Backend (Node.js/Express)       │
│ - Auth & User Management         │
│ - Patient Management             │
│ - Incident Tracking              │
│ - Triage Predictions             │
│ - Channel Messaging              │
│ - Queue Management               │
└──────────────┬──────────────────┘
               │
     ┌─────────┴──────────┐
     │                    │
┌────▼────┐      ┌────────▼──────┐
│PostgreSQL│      │ ML Service    │
│Redis    │      │ (FastAPI)     │
└─────────┘      │ (Predictions) │
                 └───────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Real-time:** Socket.io-client
- **State Management:** Zustand
- **HTTP Client:** Axios

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Real-time:** Socket.io
- **Auth:** JWT

### ML Service
- **Runtime:** Python 3.10+
- **Framework:** FastAPI
- **ML Library:** Scikit-learn
- **Model Serialization:** Joblib
- **Validation:** Pydantic
- **Server:** Uvicorn

### Infrastructure
- **Containerization:** Docker & Docker Compose
- **Database:** PostgreSQL
- **Cache:** Redis

## 📋 Prerequisites

- Node.js 16+ (backend & frontend)
- Python 3.10+ (ML service)
- Docker & Docker Compose
- PostgreSQL 15 (via Docker)
- Redis 7 (via Docker)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Navigate to project root
cd AI-Triage-System

# Create .env files
cp .env.example .env
```

### 2. Start Docker Containers

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify containers
docker ps
```

Expected: `ai_triage_postgres` and `ai_triage_redis` running

### 3. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Start backend
npm start
```

Expected output:
```
Server running on http://localhost:3000
✓ Socket.io ready
✓ Express initialized
```

### 4. Setup ML Service (Optional for now)

```bash
cd ml-service

# Build Docker image
docker build -t ai_triage_ml:latest .

# Run container
docker-compose up -d

# Verify
curl http://localhost:8000/health
```

Expected: ML service running on port 8000

### 5. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Expected: Frontend running on `http://localhost:5173`

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Core Endpoints

#### Authentication
- `POST /auth/login` - Login with email/password
- `POST /auth/register` - Register new user
- `POST /auth/logout` - Logout

#### Patients
- `GET /patients` - List all patients
- `POST /patients` - Create patient
- `GET /patients/:id` - Get patient details
- `PUT /patients/:id` - Update patient
- `DELETE /patients/:id` - Delete patient

#### Incidents
- `GET /incidents` - List incidents
- `POST /incidents` - Create incident
- `GET /incidents/:id` - Get incident details

#### Triage
- `POST /triage` - Get triage prediction
- `GET /triage/patient/:id` - Get triage history
- `GET /triage/recent` - Get recent triages

#### Channels
- `POST /channels` - Create channel
- `GET /channels/:id` - Get channel details
- `GET /channels/:id/messages` - Get channel messages
- `POST /channels/:id/messages` - Send message
- `POST /channels/:id/members` - Add member

#### Queue
- `GET /queue` - List queue items
- `GET /queue/:id` - Get queue item
- `PATCH /queue/:id/status` - Update status

## 🔌 Socket.io Events

### Events from Server
- `user:status` - User online/offline
- `incident:dispatch` - New incident dispatched
- `dispatch:acknowledged` - Unit acknowledged dispatch
- `message:received` - New message in channel
- `unit:status-updated` - Unit status changed
- `user:joined-channel` - User joined channel
- `user:left-channel` - User left channel

### Events from Client
- `user:connect` - User connects to system
- `incident:created` - New incident created
- `dispatch:acknowledge` - Acknowledge incident
- `message:send` - Send channel message
- `unit:status-change` - Update unit status
- `channel:join` - Join channel
- `channel:leave` - Leave channel

## 🧪 Testing

### Test Socket.io Connection

1. Open `backend/test-socket-client.html` in browser
2. Enter User ID: `coordinator-1`
3. Enter Zone: `zone-1`
4. Click "Connect"
5. Open same file in 2 more tabs
6. In first tab, click "Dispatch Incident"
7. Verify all tabs receive the incident immediately ✅

### Test REST API with Postman

1. Create Postman collection from `/backend/postman-collection.json`
2. Test each endpoint
3. Verify responses match expected format

### Test ML Service

```bash
# Health check
curl http://localhost:8000/health

# Get configuration
curl http://localhost:8000/config

# Make prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "PAT-001",
    "age": 45,
    "symptoms": ["fever", "cough"],
    "vitals": {
      "temperature": 38.5,
      "heart_rate": 100,
      "oxygen_saturation": 94.0
    }
  }'
```

## 📁 Project Structure

```
AI-Triage-System/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── patients.ts
│   │   │   ├── incidents.ts
│   │   │   ├── triage.ts
│   │   │   ├── queue.ts
│   │   │   └── channels.ts
│   │   ├── services/
│   │   │   ├── mlClient.ts
│   │   │   ├── patientDataService.ts
│   │   │   └── fallbackTriageService.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── utils/
│   │   │   └── retry.ts
│   │   ├── index.ts
│   │   └── ...
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── package.json
│   └── .env
│
├── ml-service/
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── models/
│   │   ├── trained_model.joblib
│   │   ├── feature_names.json
│   │   └── model_config.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── .env
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🔧 Configuration

### Backend .env

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_triage
REDIS_URL=redis://localhost:6379
ML_SERVICE_URL=http://localhost:8000
JWT_SECRET=your-super-secret-key
PORT=3000
NODE_ENV=development
```

### ML Service .env

```env
ML_PORT=8000
ML_HOST=0.0.0.0
LOG_LEVEL=info
```

### Frontend .env

```env
VITE_API_URL=http://localhost:3000
```

## 🐛 Troubleshooting

### Socket.io Connection Fails

**Problem:** Button shows "Disconnected" in test client

**Solutions:**
1. Verify backend is running: `curl http://localhost:3000/api/health`
2. Check backend logs for "✓ Socket.io ready"
3. Verify CORS is enabled in `backend/src/index.ts`
4. Clear browser cache (Ctrl+Shift+Delete)

### PostgreSQL Connection Error

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
1. Check container is running: `docker ps | grep postgres`
2. Restart container: `docker restart ai_triage_postgres`
3. Check DATABASE_URL in .env

### ML Service Not Found

**Problem:** Backend returns 503 when calling ML service

**Solutions:**
1. Verify ML container running: `docker ps | grep ml`
2. Check ML service logs: `docker logs ai_triage_ml`
3. Verify ML_SERVICE_URL in backend .env

### UTF-8 Encoding Issues

**Problem:** JSON parsing errors when reading files

**Solution:** Always save files in VSCode with UTF-8 (not UTF-8 BOM)

## 📊 Performance Targets

- **ML Prediction Latency:** < 100ms
- **Database Response:** < 50ms (with indexes)
- **Socket.io Broadcast:** < 50ms
- **API Response:** < 200ms
- **Frontend Load:** < 2s

## 🔒 Security

- JWT-based authentication
- Password hashing (production)
- SQL injection prevention (Prisma ORM)
- XSS prevention (input escaping)
- CORS configured
- Rate limiting ready (production)

## 📈 Monitoring & Logs

### Backend Logs
```bash
# Watch logs
npm start

# Check specific service
docker logs -f ai_triage_backend
```

### ML Service Logs
```bash
docker logs -f ai_triage_ml
```

### Database Logs
```bash
docker logs -f ai_triage_postgres
```

## 🚀 Deployment

### Build Frontend
```bash
cd frontend
npm run build
# Output: dist/
```

### Build Backend Image
```bash
cd backend
docker build -t ai_triage_backend:v1 .
docker push your-registry/ai_triage_backend:v1
```

### Build ML Service Image
```bash
cd ml-service
docker build -t ai_triage_ml:v1 .
docker push your-registry/ai_triage_ml:v1
```

### Deploy with Docker Compose
```bash
docker-compose up -d
```

## 📝 Development Workflow

1. Create feature branch: `git checkout -b feature/name`
2. Make changes
3. Test locally
4. Run tests: `npm test`
5. Commit: `git commit -m "feat: description"`
6. Push: `git push origin feature/name`
7. Create pull request

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 👥 Authors

- Sanjeev (Full-stack development)
- Friend (ML model training)

## 📞 Support

For issues and questions:
1. Check troubleshooting section
2. Review documentation in `/docs`
3. Check GitHub issues
4. Contact team

## 🔄 Version History

### v1.0.0 (Current)
- Initial release
- Real-time incident dispatch
- ML-powered triage
- Professional dashboard
- Team messaging
- Queue management

## 🎯 Future Roadmap

- Mobile app (React Native)
- Additional ML models
- SMS/Email notifications
- Integration with 911 systems
- Advanced analytics
- Multi-region support
- Kubernetes deployment

## ✅ Checklist for First Run

- [ ] Docker installed and running
- [ ] PostgreSQL container up
- [ ] Redis container up
- [ ] Backend running on port 3000
- [ ] Database migrations completed
- [ ] Socket.io shows "✓ Socket.io ready"
- [ ] Frontend running on port 5173
- [ ] Test client connects successfully
- [ ] ML service running on port 8000 (optional)

---

**Status:** Production Ready ✅

**Last Updated:** April 2024

**Documentation:** See individual day guides for detailed implementation