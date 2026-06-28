from fastapi import APIRouter
from backend.database import get_db
from backend.agents import run_governance_agent

router = APIRouter(prefix="/analytics", tags=["Governance Analytics"])

@router.get("/dashboard")
def get_dashboard_analytics():
    """Exposes all authority-level maps, metrics, risk hotspots, and trend charts."""
    # Runs the Governance Intelligence Agent which processes DBSCAN clustering and trend projections
    analytics_data = run_governance_agent()
    return analytics_data

@router.get("/leaderboard")
def get_citizen_leaderboard():
    """Retrieves top citizens sorted by their earned gamification points."""
    db = get_db()
    
    # Fetch citizens sorted by points descending (or fetch all and sort)
    users_stream = db.collection("users").stream()
    leaderboard = []
    
    for doc in users_stream:
        data = doc.to_dict()
        if data.get("role") == "citizen":
            leaderboard.append({
                "userId": data.get("userId"),
                "name": data.get("name"),
                "points": data.get("points", 0),
                "badges": data.get("badges", [])
            })
            
    # Sort leaderboard by points descending
    leaderboard = sorted(leaderboard, key=lambda x: x["points"], reverse=True)
    
    # Return top 20 citizens
    return leaderboard[:20]
