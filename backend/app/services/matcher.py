import joblib
import os
from sklearn.metrics.pairwise import cosine_similarity

from app.utils.text_cleaner import clean_text
from app.services.skill_gap import skill_gap_analysis

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VEC_PATH = os.path.join(BASE_DIR, "../models/tfidf_vectorizer.pkl")

vectorizer = joblib.load(VEC_PATH)


def match_resume_to_job(resume_text: str, job_text: str):
    """
    Match resume with job description using TF-IDF + cosine similarity
    and return ATS-style structured result.
    """

    # 1️⃣ Clean text
    resume_clean = clean_text(resume_text)
    job_clean = clean_text(job_text)

    # 2️⃣ TF-IDF similarity
    vectors = vectorizer.transform([resume_clean, job_clean])
    similarity = cosine_similarity(vectors[0], vectors[1])[0][0]
    match_score = round(similarity * 100, 2)

    # 3️⃣ Verdict logic
    if match_score >= 70:
        verdict = "Strong Fit"
    elif match_score >= 40:
        verdict = "Moderate Fit"
    else:
        verdict = "Not a Fit"

    # 4️⃣ Skill gap analysis (USING YOUR FUNCTION)
    skill_gap = skill_gap_analysis(
        resume_text=resume_clean,
        job_text=job_clean
    )

    # 5️⃣ Final response
    return {
        "match_score": match_score,
        "verdict": verdict,
        "missing_skills": skill_gap["missing_skills"]
    }
