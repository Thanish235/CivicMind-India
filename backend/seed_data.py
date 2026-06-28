import logging
import uuid
from datetime import datetime, timedelta
from backend.database import get_db
from backend.agents.validation_agent import get_text_embedding
from backend.agents.risk_agent import run_risk_agent

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("civicmind.seed")

def seed_database():
    db = get_db()
    logger.info("Starting database seeding...")
    
    # 1. Create Mock Users
    users = [
        {
            "userId": "citizen_user_1",
            "name": "Aarav Sharma",
            "email": "aarav.sharma@civicmind.in",
            "role": "citizen",
            "points": 85,
            "badges": ["Welcome Citizen", "Pioneer Reporter", "Community Witness"]
        },
        {
            "userId": "citizen_user_2",
            "name": "Priya Nair",
            "email": "priya.nair@civicmind.in",
            "role": "citizen",
            "points": 140,
            "badges": ["Welcome Citizen", "Active Reporter", "Civic Champion", "Super Verifier"]
        },
        {
            "userId": "authority_user_1",
            "name": "Commissioner Rajesh Kumar",
            "email": "rajesh.kumar@bbmp.gov.in",
            "role": "authority",
            "points": 0,
            "badges": []
        }
    ]
    
    for u in users:
        db.collection("users").document(u["userId"]).set(u)
    logger.info(f"Seeded {len(users)} users.")

    # 2. Create Mock Issues
    # We choose coordinates around Bengaluru, Karnataka center point: lat=12.9716, lng=77.5946
    # We cluster issues in Indiranagar close to each other to form a DBSCAN Risk Hotspot
    now = datetime.utcnow()
    
    issues_raw = [
        {
            "reporterId": "citizen_user_1",
            "category": "Pothole",
            "description": "Deep structural pothole opening up near the MG Road Metro Station exit. Vehicles are forced to take sudden turns, creating high collision risks.",
            "severity": "High",
            "lat": 12.9756,
            "lng": 77.6068,
            "address": "M.G. Road Metro Station, Bengaluru, Karnataka",
            "city": "Bengaluru",
            "mediaUrl": "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop", # Mock placeholder image
            "mediaType": "image",
            "locationImpactScore": 75.0, # near school/transit
            "nearbyCriticalZones": ["Transit Hub/Station", "Commercial Zone/Market"],
            "verificationCount": 8,
            "duplicateCount": 2,
            "status": "reported"
        },
        {
            "reporterId": "citizen_user_2",
            "category": "Road Damage",
            "description": "Severe cracking and sub-base erosion on Indiranagar 100 Feet Road junction. Developing into multiple interconnected potholes.",
            "severity": "High",
            "lat": 12.9719, # Close to 12th Main Road (Cluster member 1)
            "lng": 77.6412,
            "address": "100 Feet Road, Indiranagar, Bengaluru, Karnataka",
            "city": "Bengaluru",
            "mediaUrl": "https://images.unsplash.com/photo-1584467541268-b040f83be3fd?q=80&w=600&auto=format&fit=crop",
            "mediaType": "image",
            "locationImpactScore": 70.0,
            "nearbyCriticalZones": ["Commercial Zone/Market"],
            "verificationCount": 5,
            "duplicateCount": 1,
            "status": "assigned"
        },
        {
            "reporterId": "citizen_user_1",
            "category": "Pothole",
            "description": "Large dangerous asphalt cavity near the Indiranagar 12th Main Road crosswalk. Serious hazard for two-wheelers and cyclists.",
            "severity": "Medium",
            "lat": 12.9725, # Close to 100 Feet Road (Cluster member 2)
            "lng": 77.6415,
            "address": "12th Main Road, Indiranagar, Bengaluru, Karnataka",
            "city": "Bengaluru",
            "mediaUrl": "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop",
            "mediaType": "image",
            "locationImpactScore": 75.0,
            "nearbyCriticalZones": ["Commercial Zone/Market"],
            "verificationCount": 3,
            "duplicateCount": 0,
            "status": "reported"
        },
        {
            "reporterId": "citizen_user_2",
            "category": "Water Leakage",
            "description": "Main clean water supply line burst under the sidewalk, spraying water 3 feet high and flooding the entrance of Sagar Hospitals.",
            "severity": "Critical",
            "lat": 12.9279, # Independent location
            "lng": 77.5912,
            "address": "30th Cross Road, Jayanagar, Bengaluru, Karnataka",
            "city": "Bengaluru",
            "mediaUrl": "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?q=80&w=600&auto=format&fit=crop",
            "mediaType": "image",
            "locationImpactScore": 85.0, # near hospital
            "nearbyCriticalZones": ["Hospital/Healthcare"],
            "verificationCount": 14,
            "duplicateCount": 4,
            "status": "in_progress"
        },
        {
            "reporterId": "citizen_user_1",
            "category": "Garbage Dump",
            "description": "Massive pile of solid municipal waste and commercial packaging dumped illegally on the pavement, attracting stray dogs and cattle.",
            "severity": "Medium",
            "lat": 12.9822,
            "lng": 77.6083,
            "address": "Commercial Street, Tasker Town, Bengaluru, Karnataka",
            "city": "Bengaluru",
            "mediaUrl": "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=600&auto=format&fit=crop",
            "mediaType": "image",
            "locationImpactScore": 35.0,
            "nearbyCriticalZones": ["Commercial Zone/Market"],
            "verificationCount": 4,
            "duplicateCount": 0,
            "status": "under_review"
        },
        {
            "reporterId": "citizen_user_2",
            "category": "Broken Streetlight",
            "description": "Flickering streetlight bulb under the Cantonment Railway Station bridge, creating a dark, unsafe visibility pocket on the road.",
            "severity": "Low",
            "lat": 12.9930,
            "lng": 77.5978,
            "address": "Cantonment Station Road, Vasanth Nagar, Bengaluru, Karnataka",
            "city": "Bengaluru",
            "mediaUrl": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?q=80&w=600&auto=format&fit=crop",
            "mediaType": "image",
            "locationImpactScore": 20.0,
            "nearbyCriticalZones": ["Transit Hub/Station"],
            "verificationCount": 2,
            "duplicateCount": 0,
            "status": "resolved"
        }
    ]

    for item in issues_raw:
        issue_id = str(uuid.uuid4())
        created_time = (now - timedelta(days=float(2 + hash(item["description"]) % 10))).isoformat()
        
        # Run Risk Agent logic to generate score
        risk_results = run_risk_agent(
            category=item["category"],
            severity=item["severity"],
            location_impact_score=item["locationImpactScore"],
            verification_count=item["verificationCount"],
            duplicate_count=item["duplicateCount"]
        )
        
        risk_score = risk_results["riskScore"]
        future_severity = risk_results["futureSeverity"]
        accident_prob = risk_results["accidentProbability"]
        escalation_prob = risk_results["escalationProbability"]
        
        # Priority calculation
        severity_weight = {"Low": 20, "Medium": 50, "High": 80, "Critical": 100}.get(item["severity"], 50)
        validation_bonus = min(item["verificationCount"] * 5.0, 15.0)
        priority_score = (severity_weight * 0.35) + (item["locationImpactScore"] * 0.25) + (risk_score * 0.25) + (validation_bonus * 0.15)
        priority_score = min(max(priority_score, 10.0), 100.0)
        
        # Create corresponding resolution plan
        resolution_id = str(uuid.uuid4())
        res_data = {
            "resolutionId": resolution_id,
            "issueId": issue_id,
            "department": f"BBMP {item['category']} Division",
            "timeline": "2 Days" if item["severity"] in ["High", "Critical"] else "1 Week",
            "resources": ["Crew of 3 workers", "Safety cones", "Repair aggregate materials"],
            "recommendedActions": [
                "Deploy safety warnings and demarcate lanes.",
                "Inspect site and assess structural integrity.",
                "Fill or patch damaged sections standard municipal protocols."
            ],
            "costEstimate": 35000.0 if item["severity"] == "Medium" else 120000.0 if item["severity"] == "High" else 300000.0 if item["severity"] == "Critical" else 12000.0,
            "assignedTo": "BBMP Contractor Grade-1" if item["status"] in ["assigned", "in_progress"] else None,
            "status": "completed" if item["status"] == "resolved" else "assigned" if item["status"] in ["assigned", "in_progress"] else "pending",
            "updatedAt": created_time
        }
        db.collection("resolutions").document(resolution_id).set(res_data)
        
        # Text embedding (empty lists or simulated for mock)
        embedding = get_text_embedding(item["description"])
        
        issue_data = {
            "issueId": issue_id,
            "reporterId": item["reporterId"],
            "category": item["category"],
            "description": item["description"],
            "aiDescription": f"[AI Generated] Verified {item['category']} with {item['severity']} severity levels.",
            "status": item["status"],
            "severity": item["severity"],
            "confidenceScore": 0.95,
            "location": {
                "lat": item["lat"],
                "lng": item["lng"],
                "address": item["address"],
                "city": item["city"]
            },
            "mediaUrl": item["mediaUrl"],
            "mediaType": item["mediaType"],
            "priorityScore": float(round(priority_score, 1)),
            "riskScore": float(round(risk_score, 1)),
            "futureSeverity": future_severity,
            "accidentProbability": accident_prob,
            "escalationProbability": escalation_prob,
            "verificationCount": item["verificationCount"],
            "duplicateCount": item["duplicateCount"],
            "trustScore": float(50.0 + (item["duplicateCount"] * 10) + (item["verificationCount"] * 5)),
            "locationImpactScore": item["locationImpactScore"],
            "nearbyCriticalZones": item["nearbyCriticalZones"],
            "isDuplicate": False,
            "mergedInto": None,
            "embedding": embedding,
            "resolutionId": resolution_id,
            "createdAt": created_time,
            "updatedAt": created_time
        }
        db.collection("issues").document(issue_id).set(issue_data)
        
    logger.info("Successfully seeded mock issue database with hotspot clusters!")

if __name__ == "__main__":
    seed_database()
