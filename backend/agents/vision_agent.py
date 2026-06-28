import json
import logging
from typing import Dict, Any, Optional
import google.generativeai as genai
from backend.config import settings

logger = logging.getLogger("civicmind.agents.vision")

# Initialize Gemini if key is provided
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    logger.info("Gemini API successfully configured in Vision Agent.")
else:
    logger.warning("GEMINI_API_KEY not found in environment. Vision Agent will run in Simulation Mode.")

def run_vision_agent(media_url: str, media_bytes: Optional[bytes] = None, media_type: str = "image") -> Dict[str, Any]:
    """
    Vision Agent: Analyzes uploaded media (image/video) to detect civic issues.
    Returns:
        Dict: {
            "category": str,
            "severity": str,
            "confidenceScore": float,
            "description": str
        }
    """
    if not settings.GEMINI_API_KEY or (not media_bytes and not media_url):
        return run_vision_agent_simulation(media_url)

    try:
        # Prompt for Gemini
        prompt = """
        You are the Vision Agent for CivicMind AI, an autonomous civic issue intelligence platform.
        Analyze the provided image/video and identify the civic issue present.
        
        You must return a JSON object with the following fields:
        1. "category": Must be one of the following exact strings:
           - "Pothole"
           - "Water Leakage"
           - "Garbage Dump"
           - "Broken Streetlight"
           - "Road Damage"
           - "Drainage Issue"
           - "Public Infrastructure"
        2. "severity": Must be one of: "Low", "Medium", "High", "Critical"
        3. "confidenceScore": A float between 0.0 and 1.0 representing your detection confidence.
        4. "description": A concise, formal, and structured description suitable for municipal work orders. Include details about the damage size, environment, and immediate hazards if visible.
        
        Response MUST be raw JSON only, matching this structure.
        """
        
        # Configure model
        # Using gemini-2.5-flash as the default fast vision model
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        # Prepare contents
        mime_type = "image/jpeg"
        if media_type == "video":
            mime_type = "video/mp4"
            
        contents = [
            {"mime_type": mime_type, "data": media_bytes},
            prompt
        ]
        
        logger.info(f"Invoking Gemini 2.5 Vision model for {media_type} analysis...")
        response = model.generate_content(
            contents,
            generation_config={"response_mime_type": "application/json"}
        )
        
        result = json.loads(response.text.strip())
        logger.info(f"Gemini Vision Agent result: {result}")
        return {
            "category": result.get("category", "Public Infrastructure"),
            "severity": result.get("severity", "Medium"),
            "confidenceScore": float(result.get("confidenceScore", 0.85)),
            "description": result.get("description", "A civic issue detected by the Vision Agent.")
        }
        
    except Exception as e:
        logger.error(f"Error in Vision Agent Gemini execution: {e}. Falling back to simulation.")
        return run_vision_agent_simulation(media_url)

def run_vision_agent_simulation(media_url: str) -> Dict[str, Any]:
    """
    Failsafe simulation mode for hackathon demonstrations when API keys are not present or errors occur.
    """
    url_lower = media_url.lower()
    
    if "pothole" in url_lower:
        return {
            "category": "Pothole",
            "severity": "High",
            "confidenceScore": 0.96,
            "description": "[SIMULATED AI] Large pothole detected in the center of the asphalt roadway. Measures approximately 1.2 meters in diameter with a depth of 15 cm. Poses significant hazard to motor vehicles, cyclists, and traffic flow."
        }
    elif "water" in url_lower or "leak" in url_lower:
        return {
            "category": "Water Leakage",
            "severity": "High",
            "confidenceScore": 0.91,
            "description": "[SIMULATED AI] Severe water main leak detected. Continuous high-pressure freshwater escaping from a fractured joint under the pavement, causing minor erosion of sub-base layers and flooding the adjacent pedestrian sidewalk."
        }
    elif "garbage" in url_lower or "trash" in url_lower or "waste" in url_lower:
        return {
            "category": "Garbage Dump",
            "severity": "Medium",
            "confidenceScore": 0.98,
            "description": "[SIMULATED AI] Unauthorized solid waste disposal detected on public space. Contains household refuse, cardboard, plastics, and discarded furniture. Approximately 3 cubic meters of waste accumulating, attracting pests and creating aesthetic disruption."
        }
    elif "light" in url_lower or "lamp" in url_lower:
        return {
            "category": "Broken Streetlight",
            "severity": "Low",
            "confidenceScore": 0.94,
            "description": "[SIMULATED AI] Non-functional street lighting fixture detected. Physical damage or bulb burn-out causing complete illumination failure. Results in decreased visibility and reduced public safety in the pedestrian pathway."
        }
    elif "drain" in url_lower or "sewer" in url_lower or "flood" in url_lower:
        return {
            "category": "Drainage Issue",
            "severity": "Critical",
            "confidenceScore": 0.89,
            "description": "[SIMULATED AI] Blocked drainage inlet or storm drain overflow detected. Accumulated debris, leaves, and trash obstructing water intake. Results in severe localized street flooding, blocking lane traffic."
        }
    elif "road" in url_lower or "crack" in url_lower:
        return {
            "category": "Road Damage",
            "severity": "Medium",
            "confidenceScore": 0.92,
            "description": "[SIMULATED AI] Severe structural road cracking (alligator cracking pattern) detected over a 5-meter stretch. Indicates base layer failure under traffic loads. If left unaddressed, will rapidly degrade into potholes."
        }
    else:
        return {
            "category": "Public Infrastructure",
            "severity": "Medium",
            "confidenceScore": 0.85,
            "description": "[SIMULATED AI] Visible structural issue detected in public infrastructure. Requires on-site assessment to verify exact damage type and safety clearance."
        }
