import json
import logging
from typing import Dict, Any, List
import google.generativeai as genai
from backend.config import settings

logger = logging.getLogger("civicmind.agents.impact_simulator")

# Initialize Gemini if key is provided
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

def run_impact_simulator(category: str, severity: str, description: str, current_cost_est: float = 500.0) -> Dict[str, Any]:
    """
    AI Impact Simulator: Simulates the compounding consequences of civic neglect over 30 days.
    Returns:
        Dict: {
            "infrastructureDeterioration": str,
            "safetyRisks": str,
            "publicHealthImpacts": str,
            "trafficDisruption": str,
            "additionalComplaints": int,
            "costEscalation": List[Dict[str, Any]],
            "narrativeSummary": str
        }
    """
    if not settings.GEMINI_API_KEY:
        return run_impact_simulator_simulation(category, severity, current_cost_est)

    try:
        prompt = f"""
        You are the Civic Neglect Simulator Agent for CivicMind India - Smart Municipal Platform.
        Simulate and predict what will happen if the following civic issue is left completely UNRESOLVED for 30 days:
        
        - Category: {category}
        - Severity: {severity}
        - Description: {description}
        - Current Repair Cost: ₹{current_cost_est}
        
        Generate a detailed prediction JSON object containing:
        1. "infrastructureDeterioration": Detailed explanation of physical damage progression.
        2. "safetyRisks": Danger to pedestrians, cyclists, motorists, and children.
        3. "publicHealthImpacts": Disease risks, vectors, environmental toxins, standing water hazards.
        4. "trafficDisruption": Impact on lane capacity, detour delays, local commerce, emergency vehicles.
        5. "additionalComplaints": Integer number of community complaints expected to accumulate over 30 days.
        6. "costEscalation": List of exactly 4 dictionaries representing financial cost growth:
           [
             {{"day": 1, "cost": {current_cost_est}}},
             {{"day": 7, "cost": estimated_cost}},
             {{"day": 14, "cost": estimated_cost}},
             {{"day": 30, "cost": estimated_cost}}
           ]
        7. "narrativeSummary": A compelling, highly professional 2-3 sentence warning suitable for municipal presentation.
        
        Return ONLY valid raw JSON matching the schema. No markdown wrapper.
        """
        
        logger.info(f"Invoking Gemini 2.5 Pro to simulate 30-day neglect impact for {category}...")
        
        try:
            model = genai.GenerativeModel("gemini-2.5-pro")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
        except Exception as pro_error:
            logger.warning(f"Pro model failed: {pro_error}. Trying Flash...")
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
        result = json.loads(response.text.strip())
        logger.info(f"Impact Simulator completed successfully for {category}.")
        return {
            "infrastructureDeterioration": result.get("infrastructureDeterioration", "Structural damage will expand."),
            "safetyRisks": result.get("safetyRisks", "Hazard level will increase."),
            "publicHealthImpacts": result.get("publicHealthImpacts", "Environmental factors will worsen."),
            "trafficDisruption": result.get("trafficDisruption", "Commute speed will slow down."),
            "additionalComplaints": int(result.get("additionalComplaints", 15)),
            "costEscalation": result.get("costEscalation", [
                {"day": 1, "cost": current_cost_est},
                {"day": 7, "cost": current_cost_est * 1.5},
                {"day": 14, "cost": current_cost_est * 2.2},
                {"day": 30, "cost": current_cost_est * 5.0}
            ]),
            "narrativeSummary": result.get("narrativeSummary", "Immediate intervention is highly advised to avoid safety failures.")
        }
        
    except Exception as e:
        logger.error(f"Error in Impact Simulator: {e}. Falling back to simulation.")
        return run_impact_simulator_simulation(category, severity, current_cost_est)

def run_impact_simulator_simulation(category: str, severity: str, current_cost: float) -> Dict[str, Any]:
    """
    Simulation mode providing highly realistic 30-day degradation details for hackathon show-and-tell.
    """
    # Base multipliers based on severity
    mults = {"Low": 2.0, "Medium": 3.5, "High": 5.2, "Critical": 8.0}
    mult = mults.get(severity, 3.5)
    
    cost_1 = current_cost
    cost_7 = round(current_cost * (1.0 + (mult * 0.15)), 2)
    cost_14 = round(current_cost * (1.0 + (mult * 0.40)), 2)
    cost_30 = round(current_cost * (1.0 + (mult * 1.00)), 2)
    
    additional_complaints = int(mult * 4)

    simulations = {
        "Pothole": {
            "infrastructureDeterioration": "As vehicle traffic impacts the unprotected edges, the asphalt layers will fracture further. Rainwater seepage will erode the underlying gravel sub-base, causing the pothole's diameter to expand by 250% and its depth to double, potentially causing minor sinkholes in sub-surface layers.",
            "safetyRisks": "High risk of tire blowouts, rim fractures, and steering alignment failure. Drivers will attempt sudden lane swerves to avoid the crater, significantly increasing head-on and sideswipe collision risks. Cyclists and motorbikes face severe crash/injury hazards.",
            "publicHealthImpacts": "Stagnant rainwater will pool in the crater cavity, forming breeding pools for mosquitoes and harboring oil run-off, petroleum residues, and road chemicals.",
            "trafficDisruption": "Average traffic flow speeds will reduce by 20% as vehicles slow to navigate the damage. Lane capability drops by 50% during peak commute hours, adding substantial commute delays and local micro-economic loss.",
            "narrativeSummary": "If left unresolved, this pothole will degrade from a minor asphalt fracture into a deep, lane-blocking structural crater. Early repair costs ₹12,000, whereas delayed sub-base reconstruction will balloon to over ₹1,00,000."
        },
        "Water Leakage": {
            "infrastructureDeterioration": "Constant water flow will wash away base aggregates under the asphalt, causing void formation. Sub-surface erosion will lead to localized road cave-ins (sinkholes) and water damage in nearby building basements.",
            "safetyRisks": "Road surface friction will drop by 60% due to mud and moss growth, creating high hydroplaning risks for motor vehicles. Flowing water will freeze (if cold weather) creating black ice hazards.",
            "publicHealthImpacts": "Standing clean water mixes with soil, forming mud pools that invite microbial breeding. Reduced local water pressure can trigger back-siphonage contamination in adjacent residential pipes.",
            "trafficDisruption": "Continuous street flooding forces vehicles to redirect, reducing a 2-lane road to a single lane. Pedestrians are completely blocked from crossing, forcing unsafe detours into high-speed lanes.",
            "narrativeSummary": "This minor pipeline joint failure will escalate into a major water-main rupture, washing out road base stability. Repair costs will grow ten-fold once trenching, utility rerouting, and sinkhole repair are required."
        },
        "Garbage Dump": {
            "infrastructureDeterioration": "Organic acids from decomposing garbage will react with and pit the asphalt binder, stripping pavement coating. Drainage inlets will get blocked by blowing trash bags and cardboard.",
            "safetyRisks": "Loose glass, heavy construction debris, and metal nails scattered around the dump site pose puncture hazards to vehicle tires and laceration risks to neighborhood children.",
            "publicHealthImpacts": "Uncontrolled decomposition of organic waste generates toxic leachates that sink into groundwater. Attic rats, mice, stray dogs, and flies will colonize the dump site, creating a serious public health vector risk.",
            "trafficDisruption": "Spilling pile will block pedestrian walkways, forcing residents onto traffic roads. Sanitation odors will deter customers from local retail shops, reducing commercial foot traffic.",
            "narrativeSummary": "What is currently a minor pile of household debris will grow into a toxic, pest-infested illegal dump site. Simple sweep and cleanup costs will expand into hazardous bio-waste haulage operations."
        },
        "Broken Streetlight": {
            "department": "BESCOM (Electricity & Streetlights)",
            "infrastructureDeterioration": "Unaddressed electrical housing leakage will lead to terminal wiring short-circuits. Moisture will corrode internal brackets and fuses, requiring full light pole replacement rather than a simple LED replacement.",
            "safetyRisks": "A 100-meter dark zone increases crime, theft, and assault probability by 300%. Nighttime pedestrian visibility is severely reduced, making it difficult for drivers to spot crosswalk usage.",
            "publicHealthImpacts": "Local residents report increased stress, anxiety, and a decreased sense of community security, leading to localized social isolation after sunset.",
            "trafficDisruption": "Nighttime traffic flow slows down by 15% due to driver caution, while vehicle collision rates in the dark intersection increase significantly.",
            "narrativeSummary": "This broken streetlight creates a dangerous dark pocket in the community grid, inviting vandalism and rising crime rates. Resolving this early requires a simple bulb replacement (₹2,500), whereas replacing a water-damaged grid feed costs ₹20,000."
        },
        "Drainage Issue": {
            "infrastructureDeterioration": "Prolonged waterlogging will completely saturate the sub-base, weakening the soil load-bearing capacity. Asphalt layers will swell, crack, and lift, leading to immediate complete road surface failure.",
            "safetyRisks": "Standing water hides deep potholes and open sewer grates, creating severe hazards for motorists and pedestrians. Heavy rain will cause immediate flash flooding of surrounding homes.",
            "publicHealthImpacts": "Stagnant gutter water generates toxic odors, mold spores, and serves as an active breeding ground for mosquitoes, increasing local viral transmission risks.",
            "trafficDisruption": "Severe localized flooding blocks the entire street. Public buses and emergency response vehicles (ambulances/fire trucks) face complete blockages and must take 15-minute detours.",
            "narrativeSummary": "A blocked storm drain is currently a localized flooding issue, but will trigger widespread asphalt surface peeling and structural flooding. Quick jetting is cheap, but repairing flooded foundations and collapsed roads is extremely expensive."
        }
    }

    # Retrieve or default
    sim = simulations.get(category, {
        "infrastructureDeterioration": "Physical degradation of the structure will continue as exposure to traffic and environmental weather weakens material bonds. Structural defects will expand by 200% over the next 30 days.",
        "safetyRisks": "Increasing hazard risk for neighborhood residents, pedestrians, and moving traffic. Accidents or injuries due to structural deterioration are highly likely.",
        "publicHealthImpacts": "Accumulation of moisture, debris, or vector-breeding sites will trigger localized environmental hazards and health complaints.",
        "trafficDisruption": "Slowing of local traffic flow and disruption of walkways, leading to commute delays and commercial inconvenience.",
        "narrativeSummary": "Early intervention will stabilize the structure. Allowing this issue to remain unresolved will compound repair costs, safety hazards, and community dissatisfaction."
    })

    return {
        "infrastructureDeterioration": sim["infrastructureDeterioration"],
        "safetyRisks": sim["safetyRisks"],
        "publicHealthImpacts": sim["publicHealthImpacts"],
        "trafficDisruption": sim["trafficDisruption"],
        "additionalComplaints": additional_complaints,
        "costEscalation": [
            {"day": 1, "cost": cost_1},
            {"day": 7, "cost": cost_7},
            {"day": 14, "cost": cost_14},
            {"day": 30, "cost": cost_30}
        ],
        "narrativeSummary": sim["narrativeSummary"]
    }
