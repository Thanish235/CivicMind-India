import json
import logging
from fastapi.testclient import TestClient
from backend.main import app

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("civicmind.test")

def run_integration_tests():
    logger.info("=== Starting CivicMind AI Integration Tests ===")

    # Initialize TestClient inside context manager to trigger startup events (database seeding & model training)
    with TestClient(app) as client:
        # 1. Health Check
        logger.info("[Test 1] Verifying backend health check...")
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        logger.info(f"Health Check Passed: {data}")

        # 2. Register Citizen
        logger.info("[Test 2] Registering Citizen User...")
        citizen_payload = {
            "userId": "test_citizen_99",
            "name": "Jane Tester",
            "email": "jane.tester@civicmind.org",
            "role": "citizen"
        }
        response = client.post("/api/auth/register", json=citizen_payload)
        assert response.status_code == 200
        citizen_data = response.json()
        assert citizen_data["userId"] == "test_citizen_99"
        assert citizen_data["points"] == 10 # Starting bonus points
        logger.info(f"Citizen Registered: {citizen_data}")

        # 3. Report a Civic Issue
        logger.info("[Test 3] Submitting new unique issue (large pothole)...")
        issue_payload = {
            "reporterId": "test_citizen_99",
            "description": "Large pothole in front of 124 Main Street, causing traffic swerving and damage to tires.",
            "location": {
                "lat": 37.7840,
                "lng": -122.4023,
                "address": "124 Main St, San Francisco, CA",
                "city": "San Francisco"
            },
            "mediaUrl": "https://example.com/pothole_image.jpg",
            "mediaType": "image"
        }
        response = client.post("/api/issues/report", json=issue_payload)
        assert response.status_code == 200
        report_data = response.json()
        assert report_data["status"] == "success"
        issue_id = report_data["issueId"]
        logger.info(f"Issue reported successfully: {report_data}")

        # 4. Check Duplicate Detection (Report same issue again at same location)
        logger.info("[Test 4] Submitting same issue to test Duplicate Detection & Merging...")
        duplicate_payload = {
            "reporterId": "test_citizen_99",
            # Highly similar text to trigger duplicate verification threshold
            "description": "Large pothole in front of 124 Main Street, causing traffic swerving and damage to tires. Reported again by another resident.",
            "location": {
                "lat": 37.7842, # Very close to previous coordinate
                "lng": -122.4022,
                "address": "126 Main St, San Francisco, CA",
                "city": "San Francisco"
            },
            "mediaUrl": "https://example.com/pothole_dup.jpg",
            "mediaType": "image"
        }
        response = client.post("/api/issues/report", json=duplicate_payload)
        assert response.status_code == 200
        dup_data = response.json()
        assert dup_data["status"] == "merged"
        assert dup_data["mergedInto"] == issue_id
        logger.info(f"Duplicate detection verified. Merged successfully: {dup_data}")

        # 5. Upvote/Validate the Issue
        logger.info("[Test 5] Citizen validating the primary issue...")
        validation_payload = {
            "issueId": issue_id,
            "userId": "citizen_user_2",
            "vote": "confirm",
            "comment": "Confirmed, almost hit my car yesterday."
        }
        response = client.post("/api/validations/submit", json=validation_payload)
        assert response.status_code == 200
        val_data = response.json()
        assert val_data["status"] == "success"
        logger.info(f"Validation submitted. Updated scores: {val_data}")

        # 6. Retrieve Issue Details
        logger.info("[Test 6] Fetching issue details and AI resolution plan...")
        response = client.get(f"/api/issues/{issue_id}")
        assert response.status_code == 200
        details = response.json()
        assert details["issue"]["issueId"] == issue_id
        assert details["resolution"] is not None
        assert details["resolution"]["department"] is not None
        logger.info(f"Issue Details & Plan retrieved: {details['resolution']}")

        # 7. Run AI Impact Simulator (Killer Feature)
        logger.info("[Test 7] Executing AI 30-Day Neglect Impact Simulator...")
        response = client.get(f"/api/issues/{issue_id}/simulate-impact")
        assert response.status_code == 200
        sim_data = response.json()
        assert "infrastructureDeterioration" in sim_data
        assert len(sim_data["costEscalation"]) == 4
        logger.info(f"AI Impact Simulator executed successfully. Warning: {sim_data['narrativeSummary']}")

        # 8. Fetch Authority Analytics (DBSCAN Clusters & Forecasts)
        logger.info("[Test 8] Fetching Dashboard Analytics (Hotspots & Forecasts)...")
        response = client.get("/api/analytics/dashboard")
        assert response.status_code == 200
        analytics = response.json()
        assert analytics["totalIssues"] >= 1
        assert len(analytics["riskHotspots"]) >= 1 # Hotspot cluster from seeded + reported data
        logger.info(f"DBSCAN Risk Hotspots: {analytics['riskHotspots']}")
        logger.info(f"Complaint Weekly Forecast: {analytics['nextWeekForecastCount']}")

        # 9. Verify Citizen Leaderboard
        logger.info("[Test 9] Fetching citizen gamification leaderboard...")
        response = client.get("/api/analytics/leaderboard")
        assert response.status_code == 200
        leaderboard = response.json()
        assert len(leaderboard) >= 2
        logger.info(f"Gamification Leaderboard: {leaderboard}")

    logger.info("=== All Integration Tests Completed Successfully! (100% Passed) ===")

if __name__ == "__main__":
    run_integration_tests()
