import os
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any
import joblib

# ML Imports
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
try:
    import xgboost as xgb
except ImportError:
    xgb = None

try:
    import lightgbm as lgb
except ImportError:
    lgb = None

from backend.config import settings

logger = logging.getLogger("civicmind.agents.risk")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../ml/risk_model.joblib")
ENCODER_PATH = os.path.join(os.path.dirname(__file__), "../ml/label_encoder.joblib")

CATEGORY_MAPPING = {
    "Pothole": 0,
    "Water Leakage": 1,
    "Garbage Dump": 2,
    "Broken Streetlight": 3,
    "Road Damage": 4,
    "Drainage Issue": 5,
    "Public Infrastructure": 6
}

SEVERITY_MAPPING = {
    "Low": 0,
    "Medium": 1,
    "High": 2,
    "Critical": 3
}

def train_risk_model():
    """Generates synthetic dataset and trains XGBoost/RandomForest model."""
    logger.info("Training Risk Prediction ML model on synthetic dataset...")
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    # 1. Generate Synthetic Data
    np.random.seed(42)
    num_samples = 1500
    
    # Random feature values
    categories = np.random.choice(list(CATEGORY_MAPPING.keys()), size=num_samples)
    severities = np.random.choice(list(SEVERITY_MAPPING.keys()), size=num_samples)
    location_impact = np.random.uniform(10, 100, size=num_samples)
    verification_count = np.random.poisson(lam=5, size=num_samples)
    duplicate_count = np.random.poisson(lam=2, size=num_samples)
    
    data = pd.DataFrame({
        "category": categories,
        "severity": severities,
        "location_impact": location_impact,
        "verification_count": verification_count,
        "duplicate_count": duplicate_count
    })
    
    # Encode categorical features
    data["category_encoded"] = data["category"].map(CATEGORY_MAPPING)
    data["severity_encoded"] = data["severity"].map(SEVERITY_MAPPING)
    
    # Create target Risk Score (0-100) using a non-linear formula + noise
    # Base risk depending on severity and impact
    base_risk = (data["severity_encoded"] * 22) + (data["location_impact"] * 0.35)
    # Category adjustments (Drainage and Water leakage have higher escalation risk)
    cat_adj = data["category_encoded"].apply(lambda x: 12 if x in [1, 5] else 5)
    # Validation multiplier (more confirmations means higher urgency/verified risk)
    val_adj = np.minimum(data["verification_count"] * 1.5, 10)
    
    noise = np.random.normal(0, 3, size=num_samples)
    risk_score = base_risk + cat_adj + val_adj + noise
    data["risk_score"] = np.clip(risk_score, 0, 100)
    
    # 2. Train Model
    features = ["category_encoded", "severity_encoded", "location_impact", "verification_count", "duplicate_count"]
    X = data[features]
    y = data["risk_score"]
    
    model = None
    if xgb is not None:
        logger.info("XGBoost library available. Training XGBRegressor...")
        model = xgb.XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
        model.fit(X, y)
    elif lgb is not None:
        logger.info("LightGBM library available. Training LGBMRegressor...")
        model = lgb.LGBMRegressor(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
        model.fit(X, y)
    else:
        logger.info("XGBoost/LightGBM unavailable. Falling back to Scikit-Learn RandomForestRegressor...")
        model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
        model.fit(X, y)
        
    # Save the model
    joblib.dump(model, MODEL_PATH)
    logger.info(f"ML Model trained and saved successfully at {MODEL_PATH}")

def run_risk_agent(category: str, severity: str, location_impact_score: float, verification_count: int, duplicate_count: int) -> Dict[str, Any]:
    """
    Risk Prediction Agent: Uses trained XGBoost/RF regressor to predict future risk and probabilities.
    Returns:
        Dict: {
            "riskScore": float,
            "futureSeverity": str,
            "accidentProbability": float,
            "escalationProbability": float
        }
    """
    # Ensure model is trained and loaded
    if not os.path.exists(MODEL_PATH):
        try:
            train_risk_model()
        except Exception as e:
            logger.error(f"Failed to train model dynamically: {e}")

    try:
        model = joblib.load(MODEL_PATH)
        
        # Prepare feature vector
        cat_enc = CATEGORY_MAPPING.get(category, 6)
        sev_enc = SEVERITY_MAPPING.get(severity, 1)
        
        # Feature array matching feature order:
        # ["category_encoded", "severity_encoded", "location_impact", "verification_count", "duplicate_count"]
        features = np.array([[cat_enc, sev_enc, location_impact_score, verification_count, duplicate_count]])
        
        # Run prediction
        predicted_risk = float(model.predict(features)[0])
        predicted_risk = min(max(predicted_risk, 0.0), 100.0)
        
        # Calculate derived probabilities (accident and escalation) based on predictions + severity
        # Accident Probability: Higher for potholes/road damage near high impact zones
        base_acc = 0.15 + (sev_enc * 0.20) + (location_impact_score * 0.003)
        if category in ["Pothole", "Road Damage", "Broken Streetlight"]:
            base_acc += 0.15
        accident_prob = min(max(base_acc, 0.05), 0.95)
        
        # Escalation Probability: Higher for water leakage/drainage and high severity
        base_esc = 0.10 + (sev_enc * 0.22) + (duplicate_count * 0.05)
        if category in ["Water Leakage", "Drainage Issue", "Garbage Dump"]:
            base_esc += 0.20
        escalation_prob = min(max(base_esc, 0.05), 0.95)
        
        # Determine future severity class
        future_sev = "Low"
        if predicted_risk > 85:
            future_sev = "Critical"
        elif predicted_risk > 65:
            future_sev = "High"
        elif predicted_risk > 40:
            future_sev = "Medium"
            
        logger.info(f"Risk Agent Prediction: Risk Score {predicted_risk:.2f}, Future Severity: {future_sev}")
        
        return {
            "riskScore": float(round(predicted_risk, 1)),
            "futureSeverity": future_sev,
            "accidentProbability": float(round(accident_prob, 2)),
            "escalationProbability": float(round(escalation_prob, 2))
        }
        
    except Exception as e:
        logger.error(f"Error executing Risk Agent ML model: {e}. Running mathematical heuristic fallback.")
        return run_risk_agent_fallback(category, severity, location_impact_score, verification_count, duplicate_count)

def run_risk_agent_fallback(category: str, severity: str, location_impact_score: float, verification_count: int, duplicate_count: int) -> Dict[str, Any]:
    """
    Mathematical fallback heuristic that mimics the ML model's logic.
    """
    sev_enc = SEVERITY_MAPPING.get(severity, 1)
    cat_enc = CATEGORY_MAPPING.get(category, 6)
    
    # Base risk score calculation
    base = (sev_enc * 22) + (location_impact_score * 0.35)
    cat_adj = 12 if cat_enc in [1, 5] else 5
    val_adj = min(verification_count * 1.5, 10)
    
    risk_score = min(max(base + cat_adj + val_adj, 10.0), 100.0)
    
    # Probabilities
    accident_prob = min(max(0.15 + (sev_enc * 0.20) + (location_impact_score * 0.003) + (0.15 if cat_enc in [0, 4, 3] else 0.0), 0.05), 0.95)
    escalation_prob = min(max(0.10 + (sev_enc * 0.22) + (duplicate_count * 0.05) + (0.20 if cat_enc in [1, 5, 2] else 0.0), 0.05), 0.95)
    
    future_sev = "Low"
    if risk_score > 85:
        future_sev = "Critical"
    elif risk_score > 65:
        future_sev = "High"
    elif risk_score > 40:
        future_sev = "Medium"
        
    return {
        "riskScore": float(round(risk_score, 1)),
        "futureSeverity": future_sev,
        "accidentProbability": float(round(accident_prob, 2)),
        "escalationProbability": float(round(escalation_prob, 2))
    }
