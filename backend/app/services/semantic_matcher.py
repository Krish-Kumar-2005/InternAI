from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from app.utils.text_cleaner import clean_text

model = SentenceTransformer("all-MiniLM-L6-v2")

def semantic_match(resume_text: str, job_text: str):
    resume_clean = clean_text(resume_text)
    job_clean = clean_text(job_text)

    embeddings = model.encode(
        [resume_clean, job_clean],
        normalize_embeddings=True   # 🔥 CRITICAL FIX
    )

    similarity = cosine_similarity(
        [embeddings[0]],
        [embeddings[1]]
    )[0][0]

    return float(round(similarity * 100, 2))
