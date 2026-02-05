import re
from app.services.fake_job_detector import detect_fake_job
from app.utils.text_cleaner import clean_text

# Suspicious rule patterns
SUSPICIOUS_PATTERNS = {
    "registration_fee": r"(registration fee|pay.*fee|payment required)",
    "guaranteed_job": r"(guaranteed job|100% placement|sure placement)",
    "high_stipend": r"(₹\s?\d{4,}|[0-9]{4,}\s?stipend)",
    "no_interview": r"(no interview|direct joining)",
    "whatsapp_only": r"(whatsapp|telegram)"
}

def trust_score_analysis(job_text: str):
    job_clean = clean_text(job_text)

    # 1️⃣ ML Prediction
    ml_result = detect_fake_job(job_text)
    ml_fake = ml_result["is_fake"]
    ml_conf = float(ml_result["confidence"])  # ensure Python float

    # 2️⃣ Rule-based checks
    rule_hits = []
    for reason, pattern in SUSPICIOUS_PATTERNS.items():
        if re.search(pattern, job_clean):
            rule_hits.append(reason)

    # 3️⃣ Scoring logic (balanced)
    score = 100.0

    # ML contribution
    if ml_fake:
        score -= ml_conf * 0.8      # penalize if fake
    else:
        score += ml_conf * 0.2      # reward if genuine

    # Rule-based penalties
    score -= len(rule_hits) * 8

    # Clamp score
    score = max(0, min(100, round(score, 2)))

    # 4️⃣ Risk level
    if score >= 75:
        risk = "LOW"
    elif score >= 45:
        risk = "MEDIUM"
    else:
        risk = "HIGH"

    return {
        "trust_score": score,
        "risk_level": risk,
        "ml_prediction": {
            "is_fake": ml_fake,
            "confidence": ml_conf
        },
        "red_flags": rule_hits
    }
