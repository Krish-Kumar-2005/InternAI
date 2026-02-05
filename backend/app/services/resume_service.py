from app.services.semantic_matcher import semantic_match
from app.services.skill_gap import skill_gap_analysis

def analyze_resume_against_job(resume_text: str, job_text: str):
    match_score = semantic_match(resume_text, job_text)
    skill_gap = skill_gap_analysis(resume_text, job_text)

    verdict = (
        "Excellent Fit" if match_score >= 75 else
        "Good Fit" if match_score >= 55 else
        "Not a Fit"
    )

    return {
        "match_score": match_score,
        "verdict": verdict,
        "skills": skill_gap
    }
