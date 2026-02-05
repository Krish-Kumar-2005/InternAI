import os
from sentence_transformers import SentenceTransformer, util
from PyPDF2 import PdfReader, PdfWriter
from io import BytesIO

# Load the model once for semantic suggestions
model = SentenceTransformer('all-MiniLM-L6-v2')

# High-impact professional keywords for Context-Aware Substitution
IMPACT_KEYWORDS = [
    "Spearheaded", "Engineered", "Orchestrated", "Optimized", 
    "Scaled", "Automated", "Architected", "Mentored"
]
impact_embeddings = model.encode(IMPACT_KEYWORDS)

def get_impact_suggestions(word: str):
    """Deep Learning: Suggests professional synonyms based on impact score."""
    word_embedding = model.encode(word)
    # Compare input word to our high-impact list
    similarities = util.cos_sim(word_embedding, impact_embeddings)[0]
    results = []
    for i, sim in enumerate(similarities):
        if sim > 0.4: # Similarity threshold
            results.append({"word": IMPACT_KEYWORDS[i], "score": float(sim)})
    return sorted(results, key=lambda x: x['score'], reverse=True)

def edit_pdf_metadata(file_bytes: bytes, new_title: str):
    """Edits PDF metadata to improve ATS searchability."""
    reader = PdfReader(BytesIO(file_bytes))
    writer = PdfWriter()

    for page in reader.pages:
        writer.add_page(page)

    # Adding ATS-friendly metadata
    metadata = {
        "/Title": new_title,
        "/Author": "AI Internship Intelligence Fixer",
        "/Subject": "Optimized Resume",
        "/Keywords": "ATS-Friendly, Professional, Verified"
    }
    writer.add_metadata(metadata)

    output_stream = BytesIO()
    writer.write(output_stream)
    return output_stream.getvalue()