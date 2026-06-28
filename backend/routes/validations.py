import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.database import get_db
from backend.routes.issues import update_user_points

router = APIRouter(prefix="/validations", tags=["Validations"])

class ValidationSchema(BaseModel):
    issueId: str
    userId: str
    vote: str # "upvote" | "confirm" | "reject"
    comment: Optional[str] = None

@router.post("/submit")
def submit_validation(val: ValidationSchema):
    db = get_db()
    
    # 1. Verify issue exists
    issue_ref = db.collection("issues").document(val.issueId)
    issue_snap = issue_ref.get()
    if not issue_snap.exists:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    issue_data = issue_snap.to_dict()
    
    # 2. Check if user already validated this issue to prevent voting spam
    existing_vals = db.collection("validations") \
        .where("issueId", "==", val.issueId) \
        .where("userId", "==", val.userId) \
        .stream()
        
    if list(existing_vals):
        raise HTTPException(status_code=400, detail="You have already validated/voted on this issue.")
        
    # 3. Save validation entry
    val_id = str(uuid.uuid4())
    val_data = {
        "validationId": val_id,
        "issueId": val.issueId,
        "userId": val.userId,
        "vote": val.vote,
        "comment": val.comment,
        "timestamp": datetime.utcnow().isoformat()
    }
    db.collection("validations").document(val_id).set(val_data)
    
    # 4. Update issue validation and trust stats
    v_count = issue_data.get("verificationCount", 0) + 1
    t_score = issue_data.get("trustScore", 50.0)
    
    # Recalculate Trust Score
    if val.vote == "confirm" or val.vote == "upvote":
        t_score += 5.0
    elif val.vote == "reject":
        t_score -= 15.0 # High penalty for rejection votes
        
    t_score = min(max(t_score, 0.0), 100.0)
    
    # Recalculate dynamic Priority Score
    # Formula: Base + (VerificationCount * 5.0, capped)
    sev_weight = {"Low": 20, "Medium": 50, "High": 80, "Critical": 100}.get(issue_data.get("severity"), 50)
    base_priority = (sev_weight * 0.35) + (issue_data.get("locationImpactScore", 10) * 0.25) + (issue_data.get("riskScore", 10) * 0.25)
    val_bonus = min(v_count * 5.0, 15.0) # Up to 15 bonus points
    new_priority = min(base_priority + val_bonus, 100.0)
    
    issue_ref.update({
        "verificationCount": v_count,
        "trustScore": float(round(t_score, 1)),
        "priorityScore": float(round(new_priority, 1)),
        "updatedAt": datetime.utcnow().isoformat()
    })
    
    # 5. Reward the citizen for confirming/validating (+5 points)
    update_user_points(val.userId, 5, "Community Witness")
    
    return {
        "status": "success",
        "message": "Validation logged successfully.",
        "newVerificationCount": v_count,
        "newTrustScore": t_score,
        "newPriorityScore": round(new_priority, 1)
    }

@router.get("/issue/{issue_id}")
def get_validations_for_issue(issue_id: str):
    db = get_db()
    stream = db.collection("validations").where("issueId", "==", issue_id).stream()
    vals = []
    for doc in stream:
        vals.append(doc.to_dict())
    return vals
