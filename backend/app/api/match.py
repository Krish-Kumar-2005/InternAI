from fastapi import APIRouter
from pydantic import BaseModel
from app.services.semantic_matcher import semantic_match
from app.services.skill_gap import skill_gap_analysis

router = APIRouter()

class MatchInput(BaseModel):
    resume_text: str
    job_description: str

@router.post("/")
def match(match_data: MatchInput):
    # 1. Calculate the overall semantic match score
    score = semantic_match(
        match_data.resume_text,
        match_data.job_description
    )

    # 2. Get detailed skill analysis (found and missing)
    # Ensure your skill_gap_analysis function returns a dict like:
    # {"found_skills": [...], "missing_skills": [...]}
    skill_gap = skill_gap_analysis(
        match_data.resume_text,
        match_data.job_description
    )

    # 3. Determine the match verdict
    verdict = "Excellent Match" if score > 75 else \
              "Good Match" if score > 55 else \
              "Needs Improvement"

    # 4. Return structured data for Radar Chart & SkillGapCard
    return {
        "match_score": int(score),
        "verdict": verdict,
        "found_skills": skill_gap.get("found_skills", []),   # 🔥 Required for Radar Chart 'user' data
        "missing_skills": skill_gap.get("missing_skills", []), # 🔥 Required for Radar Chart 'gaps'
        "raw_analysis": skill_gap # Kept for backward compatibility if needed
    }