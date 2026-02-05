from app.utils.skills_list import SKILLS
from app.utils.text_cleaner import clean_text
import re

def extract_skills(text: str):
    """Extracts skills from a text based on a predefined library."""
    cleaned_text = clean_text(text).lower()
    found = []

    for skill in SKILLS:
        skill_lower = skill.lower()
        # Use word boundaries to ensure 'Java' doesn't match 'JavaScript'
        if re.search(rf"\b{re.escape(skill_lower)}\b", cleaned_text):
            found.append(skill)

    return list(set(found))

def skill_gap_analysis(resume_text: str, job_text: str):
    # 1. Identify what the job actually requires
    job_skills = extract_skills(job_text)
    
    # 2. Identify which of those job requirements are in the resume
    # We only care about resume skills that are relevant to this specific job
    resume_text_cleaned = clean_text(resume_text).lower()
    found_in_resume = []
    
    for skill in job_skills:
        skill_lower = skill.lower()
        if re.search(rf"\b{re.escape(skill_lower)}\b", resume_text_cleaned):
            found_in_resume.append(skill)

    # 3. Identify the gaps (required by job but missing from resume)
    missing = [s for s in job_skills if s not in found_in_resume]

    # 🔥 RETURN DATA MAPPED TO FRONTEND REQUIREMENTS
    return {
        "found_skills": found_in_resume, # Points where you match the job
        "job_skills": job_skills,       # These will become the radar chart axes
        "missing_skills": missing        # Points where the chart will show a gap
    }