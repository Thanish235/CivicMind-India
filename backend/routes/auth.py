from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from backend.database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserRegister(BaseModel):
    userId: str
    name: str
    email: str
    role: str = "citizen" # "citizen" or "authority"

class UserResponse(BaseModel):
    userId: str
    name: str
    email: str
    role: str
    points: int
    badges: List[str]

@router.post("/register", response_model=UserResponse)
def register_user(user: UserRegister):
    db = get_db()
    user_ref = db.collection("users").document(user.userId)
    user_snap = user_ref.get()
    
    if user_snap.exists:
        # User already exists, return existing profile
        data = user_snap.to_dict()
        return UserResponse(**data)
    
    # Create new user profile with default gamification values
    new_user_data = {
        "userId": user.userId,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "points": 10 if user.role == "citizen" else 0, # Starting bonus points
        "badges": ["Welcome Citizen"] if user.role == "citizen" else [],
    }
    
    user_ref.set(new_user_data)
    return UserResponse(**new_user_data)

@router.get("/profile/{user_id}", response_model=UserResponse)
def get_user_profile(user_id: str):
    db = get_db()
    user_snap = db.collection("users").document(user_id).get()
    if not user_snap.exists:
        raise HTTPException(status_code=404, detail="User profile not found")
    return UserResponse(**user_snap.to_dict())

@router.post("/reward-points")
def reward_points(user_id: str, points: int, reason: str):
    db = get_db()
    user_ref = db.collection("users").document(user_id)
    user_snap = user_ref.get()
    if not user_snap.exists:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_data = user_snap.to_dict()
    current_points = user_data.get("points", 0)
    new_points = current_points + points
    
    # Check for badge milestones
    badges = user_data.get("badges", [])
    if new_points >= 100 and "Civic Champion" not in badges:
        badges.append("Civic Champion")
    if new_points >= 50 and "Active Reporter" not in badges:
        badges.append("Active Reporter")
        
    user_ref.update({
        "points": new_points,
        "badges": badges
    })
    
    return {"message": f"Successfully rewarded {points} points. Reason: {reason}", "new_points": new_points, "badges": badges}
