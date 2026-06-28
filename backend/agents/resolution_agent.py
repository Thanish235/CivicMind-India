import json
import logging
from typing import Dict, Any, List
import google.generativeai as genai
from backend.config import settings

logger = logging.getLogger("civicmind.agents.resolution")

# Initialize Gemini if key is provided
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

def run_resolution_agent(category: str, severity: str, description: str, risk_score: float) -> Dict[str, Any]:
    """
    Resolution Planning Agent: Generates detailed execution and engineering plans for authorities.
    Returns:
        Dict: {
            "department": str,
            "repairPriority": str,
            "estimatedRepairTime": str,
            "requiredResources": List[str],
            "recommendedActions": List[str]
        }
    """
    if not settings.GEMINI_API_KEY:
        return run_resolution_agent_simulation(category, severity)

    try:
        prompt = f"""
        You are the Resolution Planning Agent for CivicMind India - Smart Municipal Platform.
        Generate a detailed municipal resolution plan for the following civic issue:
        
        - Category: {category}
        - Severity: {severity}
        - Risk Score: {risk_score}/100
        - Description: {description}
        
        Generate a JSON response containing exactly:
        1. "department": The municipal department responsible (e.g., "BBMP Engineering Department (Roads)", "BWSSB (Water Supply & Sewerage)", "BESCOM (Electricity & Streetlights)", "BBMP Solid Waste Management Division", "BWSSB Stormwater Drain Division", "BBMP Infrastructure Division").
        2. "repairPriority": One of "Critical", "High", "Medium", "Low".
        3. "estimatedRepairTime": An estimated time frame (e.g., "2 Days", "48 Hours", "1 Week").
        4. "requiredResources": A JSON list of tools, vehicles, crew numbers, and raw materials needed.
        5. "recommendedActions": A JSON list of step-by-step technical instructions for repair and safety.
        
        Return ONLY valid raw JSON matching the schema. Do not output markdown code blocks outside JSON.
        """
        
        logger.info(f"Invoking Gemini 2.5 Pro for resolution planning for {category}...")
        
        # Use gemini-2.5-pro for high-reasoning planning tasks as requested by the user
        # (falling back to gemini-2.5-flash if there's any quota error)
        try:
            model = genai.GenerativeModel("gemini-2.5-pro")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
        except Exception as pro_error:
            logger.warning(f"Gemini 2.5 Pro failed/throttled: {pro_error}. Trying Gemini 2.5 Flash...")
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
        result = json.loads(response.text.strip())
        logger.info(f"Resolution Planning Agent successfully completed plan for {category}")
        
        return {
            "department": result.get("department", "Public Works Department"),
            "repairPriority": result.get("repairPriority", severity),
            "estimatedRepairTime": result.get("estimatedRepairTime", "3 Days"),
            "requiredResources": result.get("requiredResources", ["Standard utility crew", "Safety barriers"]),
            "recommendedActions": result.get("recommendedActions", ["Deploy safety barriers around the site", "Dispatch inspector to verify damage severity", "Execute standard repair protocol"])
        }
        
    except Exception as e:
        logger.error(f"Error in Resolution Planning Agent: {e}. Falling back to simulation.")
        return run_resolution_agent_simulation(category, severity)

def run_resolution_agent_simulation(category: str, severity: str) -> Dict[str, Any]:
    """
    Simulation mode providing high-quality, category-specific resolution plans when API is unavailable.
    """
    # Adjust priority
    repair_priority = severity
    if severity == "Critical":
        repair_priority = "Critical"
        est_time = "24-48 Hours"
    elif severity == "High":
        est_time = "3 Days"
    elif severity == "Medium":
        est_time = "5-7 Days"
    else:
        est_time = "2 Weeks"

    plans = {
        "Pothole": {
            "department": "BBMP Engineering Department (Roads)",
            "requiredResources": [
                "Asphalt patching truck",
                "3-person road crew",
                "Traffic cones and safety barricades",
                "Hot-mix asphalt (1.5 tons)",
                "Compactor/vibratory roller",
                "Tack coat emulsion"
            ],
            "recommendedActions": [
                "Block off the damaged lane using standard safety cones and signs.",
                "Excavate the pothole, removing loose gravel and moisture.",
                "Apply an asphalt tack coat to the edges and base for bonding.",
                "Fill the cavity with hot-mix asphalt in 2-inch layers.",
                "Compact each layer using a mechanical roller until flush with the road level.",
                "Seal the perimeter edges to prevent water seepage."
            ]
        },
        "Water Leakage": {
            "department": "BWSSB (Water Supply & Sewerage)",
            "requiredResources": [
                "Backhoe excavator",
                "Utility water pump",
                "4-person emergency plumbing crew",
                "Replacement pipe sleeve (6-inch steel/PVC)",
                "Trench shoring jacks",
                "Temporary bypass pipes"
            ],
            "recommendedActions": [
                "Locate and isolate the local main water gate valves to reduce flow pressure.",
                "Delineate the repair site to protect pedestrians from water accumulation.",
                "Excavate the ground above the pipe segment using backhoe and shoring.",
                "Pump out standing water to expose the fractured pipe section.",
                "Install a stainless steel repair sleeve or splice in a new pipe segment.",
                "Slowly restore water pressure, check for leaks, and backfill the trench."
            ]
        },
        "Garbage Dump": {
            "department": "BBMP Solid Waste Management Division",
            "requiredResources": [
                "Flatbed dump truck",
                "Front-end loader tractor",
                "2-person waste management crew",
                "Bio-degradable disinfectant sprayers",
                "No-dumping warning signs",
                "Sanitation PPE kits"
            ],
            "recommendedActions": [
                "Cordon off the dumping zone to allow heavy equipment operations.",
                "Utilize the front-end loader to clear bulk garbage into the dump truck.",
                "Manually sweep and collect remaining debris and micro-plastics.",
                "Spray the area with organic disinfectants and odor neutralizers.",
                "Install 'No Dumping - AI Monitored' signage and trash bins.",
                "Notify neighborhood volunteers to monitor the zone."
            ]
        },
        "Broken Streetlight": {
            "department": "BESCOM (Electricity & Streetlights)",
            "requiredResources": [
                "Bucket utility truck (cherry picker)",
                "2-person electrical team",
                "150W LED replacement luminaire",
                "Digital multimeters & wire strippers",
                "Safety harnesses and gloves"
            ],
            "recommendedActions": [
                "Position the bucket truck safely under the non-functional streetlight.",
                "Isolate the local circuit breaker to ensure electrical safety.",
                "Ascend and open the light fixture housing.",
                "Test wire voltage to identify if it is a bulb burn-out or wiring fault.",
                "Replace the old fixture with a highly energy-efficient 150W LED lamp.",
                "Re-energize the circuit, test operation, and secure the housing."
            ]
        },
        "Drainage Issue": {
            "department": "BWSSB Stormwater Drain Division",
            "requiredResources": [
                "High-pressure water jetting truck",
                "Vactor vacuum utility vehicle",
                "4-person sewer maintenance crew",
                "Silt screens and trash rakes",
                "Gas detector & entry harnesses"
            ],
            "recommendedActions": [
                "Deploy safety markers around the flooded drainage inlet.",
                "Clear heavy trash and branches blocking the metal grating.",
                "Open the manhole and perform gas testing before crew entry.",
                "Insert high-pressure water jetting nozzle to break internal silt blockages.",
                "Vacuum out accumulated mud and debris using the vactor truck.",
                "Verify clear flow using dye testing and replace heavy-duty grating."
            ]
        },
        "Road Damage": {
            "department": "BBMP Infrastructure Division",
            "requiredResources": [
                "Asphalt milling machine",
                "Heavy steam roller",
                "5-person paving crew",
                "Sub-base gravel (aggregate)",
                "Bituminous binder course"
            ],
            "recommendedActions": [
                "Set up a comprehensive traffic detour plan and safety signage.",
                "Mill the damaged surface layer (top 2 inches) using the milling machine.",
                "Re-grade and compact the sub-base if structural erosion is present.",
                "Apply aggregate base and spray binder bituminous emulsion.",
                "Lay down the new asphalt surface course using a paving machine.",
                "Run the steam roller repeatedly to compact and finish the pavement."
            ]
        }
    }

    # Fetch plan template or default
    plan = plans.get(category, {
        "department": "Public Infrastructure Department",
        "requiredResources": [
            "Standard public works maintenance truck",
            "2 maintenance workers",
            "Basic warning signage"
        ],
        "recommendedActions": [
            "Mark the hazard area to prevent accidents.",
            "Dispatch a specialist team to examine the infrastructure damage.",
            "Determine repair specifications and order materials."
        ]
    })

    return {
        "department": plan["department"],
        "repairPriority": repair_priority,
        "estimatedRepairTime": est_time,
        "requiredResources": plan["requiredResources"],
        "recommendedActions": plan["recommendedActions"]
    }
