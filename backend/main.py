import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import auth, issues, validations, analytics
from backend.agents.risk_agent import train_risk_model

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("civicmind.main")

app = FastAPI(
    title="CivicMind AI Backend",
    description="Autonomous Civic Issue Intelligence & Resolution Platform - Hackathon Edition",
    version="1.0.0"
)

# Configure CORS for local development & API interactions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this. For hackathons, * is optimal.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Route Blueprints
app.include_router(auth.router, prefix="/api")
app.include_router(issues.router, prefix="/api")
app.include_router(validations.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")

@app.on_event("startup")
def startup_event():
    logger.info("CivicMind AI FastAPI server starting up...")
    try:
        # Pre-train the ML Risk prediction model if not present
        train_risk_model()
        
        # If running in mock DB mode, seed the database so there's immediate rich analytics
        from backend.database import is_mock_db
        if is_mock_db:
            from backend.seed_data import seed_database
            seed_database()
    except Exception as e:
        logger.error(f"Error during startup initialization: {e}")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "CivicMind AI Platform Backend",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    from backend.config import settings
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
