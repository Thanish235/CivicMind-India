import logging
import math
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from backend.config import settings
from backend.database import get_db

logger = logging.getLogger("civicmind.agents.validation")

# Initialize Gemini if key is provided
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    logger.info("Gemini API successfully configured in Validation Agent.")

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculates cosine similarity between two vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    magnitude_v1 = math.sqrt(sum(a * a for a in v1))
    magnitude_v2 = math.sqrt(sum(b * b for b in v2))
    if magnitude_v1 == 0 or magnitude_v2 == 0:
        return 0.0
    return dot_product / (magnitude_v1 * magnitude_v2)

def get_text_embedding(text: str) -> List[float]:
    """Generates embedding vector for a given string using Gemini API."""
    if not settings.GEMINI_API_KEY:
        # Return empty list if no key, triggers fallback duplicate detection
        return []
    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document"
        )
        return result.get("embedding", [])
    except Exception as e:
        logger.error(f"Error generating embedding via Gemini: {e}")
        return []

def get_word_set(text: str) -> set:
    """Tokenizes and cleans text to return a set of unique words."""
    words = text.lower().replace(".", "").replace(",", "").replace("-", " ").split()
    # Filter short stop words
    return {w for w in words if len(w) > 3}

def run_jaccard_similarity(text1: str, text2: str) -> float:
    """Fallback text similarity calculation using Jaccard Similarity."""
    set1 = get_word_set(text1)
    set2 = get_word_set(text2)
    if not set1 or not set2:
        return 0.0
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    return len(intersection) / len(union)

def run_validation_agent(description: str, city: str, lat: float, lng: float) -> Dict[str, Any]:
    """
    Validation Agent: Analyzes new issues for duplicates and evaluates authenticity and trust scores.
    Returns:
        Dict: {
            "isDuplicate": bool,
            "primaryIssueId": Optional[str],
            "duplicateCount": int,
            "verificationCount": int,
            "trustScore": float,
            "embedding": List[float]
        }
    """
    logger.info(f"Running Validation Agent for issue in {city}...")
    
    # 1. Generate text embedding for new issue description
    new_embedding = get_text_embedding(description)
    
    db = get_db()
    # Fetch existing unresolved issues in the same city to minimize scan overhead
    existing_issues_ref = db.collection("issues").where("status", "!=", "resolved").where("location.city", "==", city)
    existing_issues = [doc.to_dict() for doc in existing_issues_ref.stream()]
    
    duplicate_detected = False
    primary_issue_id = None
    duplicate_count = 0
    verification_count = 0
    
    # Similarity threshold: 0.82 for cosine embedding, 0.40 for Jaccard word-set
    threshold = 0.82 if new_embedding else 0.40
    
    for issue in existing_issues:
        # Check spatial distance (issues must be within ~150 meters to be duplicates)
        loc = issue.get("location", {})
        ex_lat = loc.get("lat")
        ex_lng = loc.get("lng")
        
        if ex_lat is not None and ex_lng is not None:
            # Quick bounding box distance check (approx 150m is roughly 0.0013 degrees)
            if abs(lat - ex_lat) > 0.0013 or abs(lng - ex_lng) > 0.0013:
                continue
        
        # Calculate text similarity
        similarity = 0.0
        ex_embedding = issue.get("embedding", [])
        
        if new_embedding and ex_embedding:
            similarity = cosine_similarity(new_embedding, ex_embedding)
        else:
            similarity = run_jaccard_similarity(description, issue.get("description", ""))
            
        if similarity > threshold:
            logger.info(f"Duplicate issue detected! Matches issueId: {issue.get('issueId')} with similarity {similarity:.2f}")
            duplicate_detected = True
            primary_issue_id = issue.get("issueId")
            duplicate_count = issue.get("duplicateCount", 0) + 1
            verification_count = issue.get("verificationCount", 0) + 1
            break

    # Calculate Trust Score (scaled 0-100)
    # Formula: base 50 + duplicate_count * 10 + verification_count * 5 (capped at 100)
    trust_score = 50.0
    if duplicate_detected:
        trust_score += (duplicate_count * 10) + (verification_count * 5)
    trust_score = min(max(trust_score, 10.0), 100.0)

    return {
        "isDuplicate": duplicate_detected,
        "primaryIssueId": primary_issue_id,
        "duplicateCount": duplicate_count,
        "verificationCount": verification_count,
        "trustScore": float(trust_score),
        "embedding": new_embedding
    }
