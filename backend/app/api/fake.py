from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import joblib
import os
import numpy as np

router = APIRouter()

# Robust path handling
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_PATH = os.path.join(BASE_DIR, "fake_job_model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "tfidf_vectorizer.pkl")

try:
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
except Exception as e:
    model = None
    vectorizer = None

class TrustReport(BaseModel):
    verdict: str
    score: int
    signals: List[str]
    is_verified: bool

class JobText(BaseModel):
    description: str

@router.post("/check", response_model=TrustReport)
def fake_check(job: JobText):
    if not model or not vectorizer:
        raise HTTPException(status_code=500, detail="ML models failed to load.")

    # 1. ML Prediction logic
    text_vector = vectorizer.transform([job.description])
    probabilities = model.predict_proba(text_vector)[0]
    
    # Starting base score with a 20-point professional floor
    base_score = (float(probabilities[1]) * 80) + 20    
    desc = job.description.lower()
    score_mod = 0

    # 2. Optimized Heuristic Boosters
    professional_headers = ["requirements", "qualifications", "responsibilities", "benefits", "experience"]
    header_count = sum(1 for h in professional_headers if h in desc)
    
    # Increased weight: +10 per header found (Max +50)
    score_mod += (header_count * 10) 

    # Length Booster: +15 for detailed descriptions over 600 chars
    if len(job.description) > 600: 
        score_mod += 15
    
    # Big Tech/Enterprise Trust Signals
    trust_keywords = ["interview", "stipend", "duration", "full-time", "office", "deadline"]
    if any(tech in desc for tech in trust_keywords):
        score_mod += 10
    
    # 3. Hard Penalty for Scam Patterns
    scam_terms = ["whatsapp", "telegram", "registration fee", "limited seats", "urgent hiring", "pay to apply"]
    penalty = 0
    if any(term in desc for term in scam_terms):
        penalty = 60

    # 4. Final Score Calculation
    final_score = int(np.clip(base_score + score_mod - penalty, 5, 98)) 
    
    # Threshold check: Verified if 75 or higher
    is_verified = final_score >= 75

    # 5. Dynamic Trust Signals
    signals = []
    if header_count >= 3: 
        signals.append("Standard professional structure detected")
    if len(job.description) > 600: 
        signals.append("Comprehensive job details provided")
    if penalty == 0: 
        signals.append("No common scam keywords detected")
    else:
        signals.append("Caution: High-risk contact methods/fees found")

    return TrustReport(
        verdict="Verified" if is_verified else "Caution",
        score=final_score,
        signals=signals if signals else ["Unusual posting metadata"],
        is_verified=is_verified
    )