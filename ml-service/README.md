# ML Triage Microservice

FastAPI microservice for patient triage prediction using ML model.

## Setup (Day 3)

1. Place trained model files in `models/` folder:
   - `trained_model.joblib`
   - `feature_names.json`
   - `model_config.json`

2. Update `main.py` with model loading logic

3. Run with Docker:
```bash
   docker-compose up -d
```

4. Test endpoint:
```bash
   curl http://localhost:8000/health
   curl -X POST http://localhost:8000/predict \
     -H "Content-Type: application/json" \
     -d '{"age": 45, "symptoms": ["fever", "cough"]}'
```

## API Endpoints (implemented Day 3)

- `GET /health` - Health check
- `POST /predict` - Get triage prediction
- `GET /config` - Get model config