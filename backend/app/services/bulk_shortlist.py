from app.services.resume_parser import parse_resume
from app.services.semantic_matcher import semantic_match
from app.services.skill_gap import skill_gap_analysis

def shortlist_resumes(resume_files, job_description: str):
    results = []

    for file in resume_files:
        try:
            resume_text = parse_resume(file)

            match_score = semantic_match(resume_text, job_description)
            skill_gap = skill_gap_analysis(resume_text, job_description)

            verdict = (
                "Excellent Fit" if match_score >= 75 else
                "Good Fit" if match_score >= 55 else
                "Not a Fit"
            )

            results.append({
                "candidate_name": file.filename,
                "match_score": match_score,
                "verdict": verdict,
                "missing_skills": skill_gap["missing_skills"]
            })

        except Exception as e:
            results.append({
                "candidate_name": file.filename,
                "error": str(e)
            })

    # 🔥 Sort candidates by match score (descending)
    results = sorted(
        results,
        key=lambda x: x.get("match_score", 0),
        reverse=True
    )

    return results
