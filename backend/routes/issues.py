import uuid
from datetime import datetime
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from backend.database import get_db
from backend.agents import (
    run_vision_agent,
    run_geo_agent,
    run_validation_agent,
    run_risk_agent,
    run_resolution_agent,
    run_impact_simulator
)

logger = logging.getLogger("civicmind.routes.issues")
router = APIRouter(prefix="/issues", tags=["Issues"])

class LocationSchema(BaseModel):
    lat: float
    lng: float
    address: str
    city: str

class IssueReportSchema(BaseModel):
    reporterId: str
    description: str
    location: LocationSchema
    mediaUrl: str
    mediaType: str = "image" # "image" | "video" | "voice"

class StatusUpdateSchema(BaseModel):
    status: str # "reported" | "under_review" | "assigned" | "in_progress" | "resolved"
    authorityUserId: str

def update_user_points(user_id: str, points_to_add: int, badge_to_award: Optional[str] = None):
    """Utility to reward points & badges on user submission."""
    db = get_db()
    try:
        user_ref = db.collection("users").document(user_id)
        user_snap = user_ref.get()
        if user_snap.exists:
            user_data = user_snap.to_dict()
            new_points = user_data.get("points", 0) + points_to_add
            badges = user_data.get("badges", [])
            
            if badge_to_award and badge_to_award not in badges:
                badges.append(badge_to_award)
                
            user_ref.update({
                "points": new_points,
                "badges": badges
            })
            logger.info(f"Rewarded user {user_id} with {points_to_add} points.")
    except Exception as e:
        logger.error(f"Error rewarding points to user {user_id}: {e}")

@router.post("/report")
def report_issue(report: IssueReportSchema):
    db = get_db()
    
    issue_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    
    # 1. Run Vision Agent (Gemini Vision)
    logger.info(f"Triggering Vision Agent for uploaded media: {report.mediaUrl}")
    vision_results = run_vision_agent(report.mediaUrl, media_type=report.mediaType)
    category = vision_results["category"]
    severity = vision_results["severity"]
    confidence = vision_results["confidenceScore"]
    ai_description = vision_results["description"]
    
    # 2. Run Geo Intelligence Agent (Google Places / Proximity Context)
    logger.info(f"Triggering Geo Agent for coordinates: {report.location.lat}, {report.location.lng}")
    geo_results = run_geo_agent(report.location.lat, report.location.lng)
    location_impact_score = geo_results["locationImpactScore"]
    nearby_zones = geo_results["nearbyCriticalZones"]
    
    # 3. Run Community Validation Agent (Embedding / Duplicate scan)
    logger.info("Triggering Community Validation Agent for duplicate checking...")
    val_results = run_validation_agent(
        description=report.description, 
        city=report.location.city, 
        lat=report.location.lat, 
        lng=report.location.lng
    )
    
    is_duplicate = val_results["isDuplicate"]
    primary_issue_id = val_results["primaryIssueId"]
    duplicate_count = val_results["duplicateCount"]
    verification_count = val_results["verificationCount"]
    trust_score = val_results["trustScore"]
    embedding = val_results["embedding"]

    if is_duplicate and primary_issue_id:
        # Merge duplicate: Save duplicate report but link to primary issue
        logger.info(f"Issue identified as duplicate. Merging into primary: {primary_issue_id}")
        
        # Save the duplicate report details
        dup_issue_data = {
            "issueId": issue_id,
            "reporterId": report.reporterId,
            "category": category,
            "description": f"[DUPLICATE] {report.description}",
            "status": "reported",
            "severity": severity,
            "confidenceScore": confidence,
            "location": report.location.dict(),
            "mediaUrl": report.mediaUrl,
            "mediaType": report.mediaType,
            "priorityScore": 0.0,
            "riskScore": 0.0,
            "isDuplicate": True,
            "mergedInto": primary_issue_id,
            "createdAt": created_at,
            "updatedAt": created_at
        }
        db.collection("issues").document(issue_id).set(dup_issue_data)
        
        # Update the primary issue counters in Firestore
        primary_ref = db.collection("issues").document(primary_issue_id)
        primary_snap = primary_ref.get()
        if primary_snap.exists:
            p_data = primary_snap.to_dict()
            new_dup_count = p_data.get("duplicateCount", 0) + 1
            new_ver_count = p_data.get("verificationCount", 0) + 1
            
            # Recalculate dynamic priority with new confirmations
            severity_weight = {"Low": 20, "Medium": 50, "High": 80, "Critical": 100}.get(p_data.get("severity"), 50)
            base_priority = (severity_weight * 0.35) + (p_data.get("locationImpactScore", 10) * 0.25) + (p_data.get("riskScore", 10) * 0.25)
            val_weight = min(new_ver_count * 5, 15)
            new_priority = min(base_priority + val_weight, 100.0)
            
            primary_ref.update({
                "duplicateCount": new_dup_count,
                "verificationCount": new_ver_count,
                "priorityScore": round(new_priority, 1)
            })
            
        # Reward reporter with helper points
        update_user_points(report.reporterId, 5, "Community Guard")
        
        return {
            "status": "merged",
            "message": "This issue matches an existing report and has been linked to prevent duplicate cleanup efforts.",
            "issueId": issue_id,
            "mergedInto": primary_issue_id
        }

    # If unique, proceed with full AI risk profiling and planning
    # 4. Run Risk Prediction Agent (XGBoost/LightGBM Model)
    logger.info("Triggering ML Risk Prediction Agent...")
    risk_results = run_risk_agent(
        category=category,
        severity=severity,
        location_impact_score=location_impact_score,
        verification_count=verification_count,
        duplicate_count=duplicate_count
    )
    risk_score = risk_results["riskScore"]
    future_severity = risk_results["futureSeverity"]
    accident_probability = risk_results["accidentProbability"]
    escalation_probability = risk_results["escalationProbability"]
    
    # 5. AI Priority Engine Formula
    # Formula: (SeverityWeight * 0.35) + (LocationImpact * 0.25) + (RiskScore * 0.25) + (ValidationBonus * 0.15)
    severity_weight = {"Low": 20, "Medium": 50, "High": 80, "Critical": 100}.get(severity, 50)
    validation_bonus = min(verification_count * 5.0, 100.0)
    
    priority_score = (severity_weight * 0.35) + (location_impact_score * 0.25) + (risk_score * 0.25) + (validation_bonus * 0.15)
    priority_score = min(max(priority_score, 10.0), 100.0)
    
    # 6. Run Resolution Planning Agent (Gemini 2.5 Pro)
    logger.info("Triggering Resolution Planning Agent...")
    resolution_results = run_resolution_agent(
        category=category,
        severity=severity,
        description=report.description,
        risk_score=risk_score
    )
    
    # Calculate Estimated Cost
    # Heuristics based on category and severity (INR scale)
    cost_base = {"Low": 12000.0, "Medium": 35000.0, "High": 120000.0, "Critical": 300000.0}.get(severity, 50000.0)
    cost_cat = {"Water Leakage": 40000.0, "Drainage Issue": 50000.0, "Road Damage": 80000.0}.get(category, 0.0)
    total_cost_est = cost_base + cost_cat
    
    # Save Resolution details
    resolution_id = str(uuid.uuid4())
    res_data = {
        "resolutionId": resolution_id,
        "issueId": issue_id,
        "department": resolution_results["department"],
        "timeline": resolution_results["estimatedRepairTime"],
        "resources": resolution_results["requiredResources"],
        "recommendedActions": resolution_results["recommendedActions"],
        "costEstimate": total_cost_est,
        "assignedTo": None,
        "status": "pending",
        "updatedAt": created_at
    }
    db.collection("resolutions").document(resolution_id).set(res_data)

    # Save Primary Issue record
    issue_data = {
        "issueId": issue_id,
        "reporterId": report.reporterId,
        "category": category,
        "description": report.description,
        "aiDescription": ai_description,
        "status": "reported",
        "severity": severity,
        "confidenceScore": confidence,
        "location": report.location.dict(),
        "mediaUrl": report.mediaUrl,
        "mediaType": report.mediaType,
        "priorityScore": float(round(priority_score, 1)),
        "riskScore": float(round(risk_score, 1)),
        "futureSeverity": future_severity,
        "accidentProbability": accident_probability,
        "escalationProbability": escalation_probability,
        "verificationCount": verification_count,
        "duplicateCount": duplicate_count,
        "trustScore": trust_score,
        "locationImpactScore": location_impact_score,
        "nearbyCriticalZones": nearby_zones,
        "isDuplicate": False,
        "mergedInto": None,
        "embedding": embedding,
        "resolutionId": resolution_id,
        "createdAt": created_at,
        "updatedAt": created_at
    }
    db.collection("issues").document(issue_id).set(issue_data)
    
    # Reward reporter with unique report points (+15 points)
    update_user_points(report.reporterId, 15, "Pioneer Reporter")
    
    return {
        "status": "success",
        "message": "Civic issue successfully analyzed and logged.",
        "issueId": issue_id,
        "category": category,
        "severity": severity,
        "priorityScore": round(priority_score, 1),
        "riskScore": round(risk_score, 1)
    }

@router.get("/")
def get_all_issues(status: Optional[str] = None, category: Optional[str] = None, reporterId: Optional[str] = None):
    db = get_db()
    ref = db.collection("issues")
    
    query = ref.where("isDuplicate", "==", False)
    
    if status:
        query = query.where("status", "==", status)
    if category:
        query = query.where("category", "==", category)
    if reporterId:
        query = query.where("reporterId", "==", reporterId)
        
    stream = query.stream()
    issues_list = []
    
    for doc in stream:
        data = doc.to_dict()
        # Clean embedding vectors from response to reduce payload size
        if "embedding" in data:
            del data["embedding"]
        issues_list.append(data)
        
    # Sort by priorityScore descending
    issues_list = sorted(issues_list, key=lambda x: x.get("priorityScore", 0.0), reverse=True)
    return issues_list

@router.get("/{issue_id}")
def get_issue_details(issue_id: str):
    db = get_db()
    issue_snap = db.collection("issues").document(issue_id).get()
    if not issue_snap.exists:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    issue_data = issue_snap.to_dict()
    if "embedding" in issue_data:
        del issue_data["embedding"]
        
    # Fetch linked resolution plan
    resolution_id = issue_data.get("resolutionId")
    resolution_plan = None
    if resolution_id:
        res_snap = db.collection("resolutions").document(resolution_id).get()
        if res_snap.exists:
            resolution_plan = res_snap.to_dict()
            
    # Fetch linked duplicate submissions
    duplicates_stream = db.collection("issues").where("mergedInto", "==", issue_id).stream()
    duplicates = []
    for doc in duplicates_stream:
        dup = doc.to_dict()
        duplicates.append({
            "issueId": dup.get("issueId"),
            "reporterId": dup.get("reporterId"),
            "mediaUrl": dup.get("mediaUrl"),
            "createdAt": dup.get("createdAt")
        })
        
    return {
        "issue": issue_data,
        "resolution": resolution_plan,
        "duplicates": duplicates
    }

@router.put("/{issue_id}/status")
def update_issue_status(issue_id: str, status_update: StatusUpdateSchema):
    db = get_db()
    issue_ref = db.collection("issues").document(issue_id)
    issue_snap = issue_ref.get()
    
    if not issue_snap.exists:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    issue_data = issue_snap.to_dict()
    old_status = issue_data.get("status")
    
    issue_ref.update({
        "status": status_update.status,
        "updatedAt": datetime.utcnow().isoformat()
    })
    
    # If a resolution plan exists, sync its status too
    res_id = issue_data.get("resolutionId")
    if res_id:
        res_ref = db.collection("resolutions").document(res_id)
        res_status = "assigned" if status_update.status in ["assigned", "in_progress"] else "completed" if status_update.status == "resolved" else "pending"
        res_ref.update({
            "status": res_status,
            "updatedAt": datetime.utcnow().isoformat()
        })
        
    logger.info(f"Issue {issue_id} status updated from {old_status} to {status_update.status} by {status_update.authorityUserId}")
    return {"message": "Status updated successfully", "new_status": status_update.status}

@router.get("/{issue_id}/simulate-impact")
def simulate_neglect_impact(issue_id: str):
    db = get_db()
    issue_snap = db.collection("issues").document(issue_id).get()
    if not issue_snap.exists:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    issue_data = issue_snap.to_dict()
    
    # Get current resolution estimate cost if available
    res_id = issue_data.get("resolutionId")
    current_cost = 500.0
    if res_id:
        res_snap = db.collection("resolutions").document(res_id).get()
        if res_snap.exists:
            current_cost = res_snap.to_dict().get("costEstimate", 500.0)
            
    # Run the Impact Simulator Agent
    simulation_results = run_impact_simulator(
        category=issue_data.get("category", "Pothole"),
        severity=issue_data.get("severity", "Medium"),
        description=issue_data.get("description", ""),
        current_cost_est=current_cost
    )
    
    return simulation_results
