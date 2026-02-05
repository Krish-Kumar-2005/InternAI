import joblib
import os
from app.utils.text_cleaner import clean_text

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "../models/fake_job_model.pkl")
VEC_PATH = os.path.join(BASE_DIR, "../models/tfidf_vectorizer.pkl")

model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VEC_PATH)

def detect_fake_job(job_text: str):
    cleaned = clean_text(job_text)
    vec = vectorizer.transform([cleaned])
    prediction = model.predict(vec)[0]
    prob = model.predict_proba(vec)[0].max()

    return {
        "is_fake": bool(prediction),
        "confidence": round(prob * 100, 2)
    }
# Example usage: