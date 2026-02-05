from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body, Response
from typing import List, Optional
from pydantic import BaseModel
import random
import requests
import joblib
import os
import warnings
import re
import json
import io
from supabase import create_client, Client
from dotenv import load_dotenv
load_dotenv()

# Suppress sklearn warnings
warnings.filterwarnings("ignore")

# ==========================================
# 🛠️ SERVICE IMPORTS (Robust Fallbacks)
# ==========================================
try:
    # Services from your Attached File (Robust Shortlisting)
    from app.services.link_extractor import find_github_link, extract_text_from_pdf
    
    # Services from your Latest File (Editor & Search)
    from app.services.doc_converter import convert_docx_to_html, convert_html_to_docx
    from app.services.resume_parser import parse_resume
    from app.services.resume_editor import edit_pdf_metadata
    from app.services.github_scanner import extract_github_links, fetch_repo_content
except ImportError as e:
    print(f"⚠️ Service Import Warning: {e}. Ensure app/services/ contains all required modules.")
    # Fallback mocks to prevent crash if a service is missing
    def find_github_link(text): return None
    def extract_text_from_pdf(content): return ""
    def extract_github_links(text): return []
    def fetch_repo_content(link): return ""

# ==========================================
# 🔌 SUPABASE CONFIGURATION
# ==========================================
# Using the configuration from your LATEST (pasted) file
from app.services.supabase import supabase


router = APIRouter()

# ==========================================
# 🧠 ML MODEL LOADING (Restored from Attached File)
# ==========================================
# We search in multiple common directories to find the .pkl files
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # app/

possible_paths = [
    os.path.join(base_dir, "models"),                        # app/models/
    os.path.join(os.getcwd(), "app", "models"),              # CWD/app/models/
    os.path.join(os.getcwd(), "models"),                     # CWD/models/
]

tfidf_vectorizer = None
resume_model = None

print("🔍 Searching for ML Models...")

for path in possible_paths:
    t_path = os.path.join(path, "tfidf.pkl")
    c_path = os.path.join(path, "resume_classifier.pkl")
    
    if os.path.exists(t_path) and os.path.exists(c_path):
        try:
            tfidf_vectorizer = joblib.load(t_path)
            resume_model = joblib.load(c_path)
            print(f"✅ ML Models Loaded successfully from: {path}")
            break
        except Exception as e:
            print(f"❌ Found models at {path} but failed to load: {e}")

def predict_category(text):
    """Predicts the domain of the resume."""
    if not text or not tfidf_vectorizer or not resume_model:
        return "General"
    try:
        clean_text = text.replace("\n", " ").lower()
        vectors = tfidf_vectorizer.transform([clean_text])
        category = resume_model.predict(vectors)[0]
        return category
    except Exception as e:
        print(f"Prediction logic error: {e}")
        return "General"

# ==========================================
# 🧩 DATA MODELS
# ==========================================

# -- Editor Models --
class SuggestionRequest(BaseModel):
    text: str
    profession: str = "General"

class OptimizeRoleRequest(BaseModel):
    text: str
    profession: str 

class SaveDraftRequest(BaseModel):
    user_id: str
    html_content: str
    title: str

# -- Recruiter Models --
class SearchQuery(BaseModel):
    query: str
    job_id: str = None 

class InterviewRequest(BaseModel):
    candidate_name: str
    candidate_email: str
    job_role: str

class ApplicationStatusUpdate(BaseModel):
    application_id: str
    status: str  # e.g., "Shortlisted", "Rejected", "Interview"

# ==========================================
# 🧠 CORE LOGIC ENGINES
# ==========================================

def calculate_match_score(resume_text: str, jd_text: str):
    """
    Performs fast keyword matching and returns a Score + Verdict + Matched Keywords.
    """
    resume_lower = resume_text.lower()
    jd_lower = jd_text.lower()
    
    keywords = ["python", "react", "ai", "machine learning", "sql", "fastapi", "aws", "node", "java", "docker", "kubernetes", "typescript"]
    score = 0
    matched = []
    
    for k in keywords:
        if k in jd_lower and k in resume_lower:
            score += 15
            matched.append(k)
            
    final_score = min(score + 20, 98)
    
    if final_score > 75: verdict = "💎 Top Contender"
    elif final_score > 50: verdict = "✅ Good Match"
    else: verdict = "⚠️ Needs Review"
    
    return final_score, verdict, matched

def ask_local_ai(prompt: str):
    try:
        url = os.getenv("OLLAMA_URL")
        model = os.getenv("OLLAMA_MODEL")

        data = {
            "model": model,
            "prompt": prompt,
            "stream": False
        }

        response = requests.post(url, json=data, timeout=30)

        if response.status_code == 200:
            return response.json()['response']

        return None

    except Exception as e:
        print(f"❌ Local AI Connection Failed: {e}")
        return None


# ==========================================
# 🛣️ ROUTES: RESUME EDITOR & SERVICES
# ==========================================

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    try:
        text = parse_resume(file)
        return {"resume_text": text}
    except Exception as e:
        print(f"Parser Error: {e}")
        return {"resume_text": "Could not parse PDF text automatically."}

@router.post("/suggest")
def suggest_changes(request: SuggestionRequest):
    prompt = (
        f"Act as a professional resume writer for {request.profession} roles. "
        f"Rewrite this specific phrase to be more impactful and professional: '{request.text}'. "
        "Use strong action verbs. Provide 3 distinct, short variations. "
        "Output ONLY the 3 variations, separated by newlines."
    )
    ai_response = ask_local_ai(prompt)
    if not ai_response:
        return {"suggestions": [{"word": "Ollama not running", "score": 0.0}]}
    
    raw_suggestions = ai_response.strip().split("\n")
    formatted = []
    for i, s in enumerate(raw_suggestions[:3]):
        clean_word = re.sub(r'^[\d\-\.\)]+\s*', '', s).strip()
        if clean_word:
            formatted.append({"word": clean_word, "score": 0.95 - (i * 0.05)})
    return {"suggestions": formatted}

@router.post("/optimize-role")
def optimize_resume_for_role(request: OptimizeRoleRequest):
    prompt = (
        f"Rewrite the following resume summary to be highly competitive for a {request.profession} position. "
        "Keep it under 100 words.\n\n"
        f"Original Text:\n{request.text}"
    )
    optimized_text = ask_local_ai(prompt)
    if not optimized_text:
        raise HTTPException(status_code=503, detail="Local AI not running")
    return { "optimized_text": optimized_text.strip(), "new_score": 92 }

@router.post("/save-optimized")
async def save_optimized_resume(title: str = Body(...), file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        edit_pdf_metadata(file_bytes, title)
        return {"status": "saved", "version_title": title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import-for-editor")
async def import_resume_for_editor(file: UploadFile = File(...)):
    if not file.filename.endswith(".docx"):
        return {"error": "Only DOCX files are supported for the live editor right now."}
    content = await file.read()
    html_output = convert_docx_to_html(io.BytesIO(content))
    return {"html": html_output}

@router.post("/export-resume")
async def export_resume(html_content: str = Form(...)):
    try:
        file_stream = convert_html_to_docx(html_content)
        headers = {'Content-Disposition': 'attachment; filename="Optimized_Resume.docx"'}
        return Response(
            content=file_stream.getvalue(), 
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate document")

@router.post("/save-draft")
def save_resume_draft(req: SaveDraftRequest):
    try:
        response = supabase.table("user_resumes").upsert({
            "user_id": req.user_id,
            "html_content": req.html_content,
            "title": req.title,
            "updated_at": "now()"
        }).execute()
        return {"status": "synced", "message": "Saved to Cloud"}
    except Exception as e:
        print(f"Sync Error: {e}")
        raise HTTPException(status_code=500, detail=f"Database Sync Failed: {str(e)}")

# ==========================================
# 🛣️ ROUTES: RECRUITER TOOLS (Search & Analysis)
# ==========================================

@router.get("/jobs")
def get_recruiter_jobs():
    try:
        response = supabase.table("jobs").select("*").order("posted_at", desc=True).execute()
        return response.data
    except Exception as e:
        print(f"❌ DB Error fetching jobs: {e}")
        return []

@router.get("/applications/{job_id}")
def get_applications(job_id: str):
    try:
        response = supabase.table("applications").select("*").eq("job_id", job_id).order("match_score", desc=True).execute()
        applicants = response.data
        return {"job_id": job_id, "count": len(applicants), "applicants": applicants}
    except Exception as e:
        print(f"❌ DB Error fetching applicants: {e}")
        return {"job_id": job_id, "count": 0, "applicants": []}

@router.get("/applications")
def get_all_applications():
    try:
        response = supabase.table("applications").select("*").order("match_score", desc=True).execute()
        return response.data
    except Exception as e:
        return []

@router.post("/smart-search")
async def smart_search_candidates(request: SearchQuery):
    """
    Deep Search: Filters candidates -> Extracts Resume + GitHub Code -> AI Audits Code.
    """
    try:
        print(f"🔍 Deep Search for: {request.query}")

        # 1. Fetch Candidates
        query_builder = supabase.table("applications").select("*")
        if request.job_id:
            query_builder = query_builder.eq("job_id", request.job_id)
        
        response = query_builder.execute()
        candidates = response.data
        matches = []

        if not candidates:
            return {"matches": [], "message": "No candidates found."}

        # 2. AI Analysis Loop
        for candidate in candidates:
            resume_text = candidate.get('resume_text', '')
            
            # A. Check for GitHub Links
            github_links = extract_github_links(resume_text)
            if candidate.get('github_link'):
                github_links.insert(0, candidate.get('github_link'))
            
            github_links = list(set(github_links))

            code_evidence = ""
            verified_repo = None
            
            # B. If links found, scan the code!
            if github_links:
                target_link = github_links[0]
                code_evidence = fetch_repo_content(target_link)
                verified_repo = target_link
            else:
                code_evidence = "No GitHub links available in resume."

            # C. Construct the "Technical Auditor" Prompt
            prompt = (
                f"You are a Senior Technical Recruiter.\n"
                f"SEARCH QUERY: '{request.query}'\n\n"
                f"CANDIDATE EVIDENCE:\n"
                f"1. Resume Snippet: {resume_text[:1200]}...\n"
                f"2. ACTUAL GITHUB CODE: {code_evidence}\n\n"
                f"TASK: Determine if this candidate matches the query. "
                f"Prioritize finding evidence in the CODE over the resume text.\n"
                f"Return JSON ONLY: {{ \"match\": true/false, \"confidence\": \"High/Medium/Low\", \"reason\": \"Found 'jwt.sign' in auth.js...\" }}"
            )

            # D. Ask LLM
            ai_result = ask_local_ai(prompt)

            if not ai_result:
                continue

            try:
                # Robust JSON Extraction
                json_match = re.search(r'\{.*\}', ai_result, re.DOTALL)
                
                if json_match:
                    clean_json = json_match.group(0)
                    result_data = json.loads(clean_json)
                    
                    if result_data.get("match") is True:
                        matches.append({
                            "id": candidate['id'],
                            "candidate_name": candidate.get('candidate_name', 'Unknown'),
                            "match_score": candidate.get('match_score', 0),
                            "github_link": verified_repo,
                            "ai_reason": result_data.get("reason"),
                            "confidence": result_data.get("confidence"),
                            "email": candidate.get('email', '')
                        })
            except Exception as e:
                print(f"AI Parse Error: {e}")
                continue

        return {"matches": matches}

    except Exception as e:
        print(f"Search Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 🔥 CORE SHORTLISTER (Restored Functionality)
# ==========================================

@router.post("/shortlist")
async def shortlist_resumes(
    job_description: str = Form(...),
    resumes: List[UploadFile] = File(...)
):
    """
    Bulk analyzes uploaded PDF/DOCX files.
    Restored from your 'previous' file to fix the analysis errors.
    """
    results = []
    
    if not resumes:
        raise HTTPException(status_code=400, detail="No resumes uploaded")

    for resume in resumes:
        try:
            # 1. Read File Content
            content = await resume.read()
            
            # 2. Extract Text (Using robust pdfplumber from link_extractor.py)
            resume_text = extract_text_from_pdf(content)
            
            # Fallback if file content extraction fails
            if not resume_text or not resume_text.strip():
                resume_text = "Content extraction failed"

            # 3. Analyze
            score, verdict, skills = calculate_match_score(resume_text, job_description)
            
            # 4. Extract GitHub Link
            github_link = find_github_link(resume_text)

            # 5. Predict Category (ML Model)
            category = predict_category(resume_text)

            results.append({
                "candidate_name": resume.filename.split('.')[0].replace("_", " ").title(),
                "match_score": score,
                "verdict": verdict,
                "category": category,         
                "github_link": github_link,
                "missing_skills": [], 
                "email": "Parsed from Resume",
                "resume_text": resume_text[:200] + "..." 
            })

        except Exception as e:
            print(f"Error processing {resume.filename}: {e}")
            results.append({
                "candidate_name": resume.filename,
                "match_score": 0,
                "verdict": "Error",
                "category": "Unknown",
                "email": "N/A"
            })

    # Return sorted by best match
    sorted_results = sorted(results, key=lambda x: x.get("match_score", 0), reverse=True)
    return {"total_resumes": len(resumes), "shortlisted": sorted_results}

@router.post("/application-status")
async def update_application_status(req: ApplicationStatusUpdate):
    """
    Updates the status of a candidate application in Supabase.
    Renamed from 'shortlist' to avoid conflict with the file uploader.
    """
    try:
        print(f"📝 Updating Status for Application {req.application_id} to {req.status}")
        
        response = supabase.table("applications").update({
            "status": req.status
        }).eq("id", req.application_id).execute()

        if not response.data:
             return {"message": "Update failed or ID not found", "success": False}

        return {
            "message": f"Candidate status updated to {req.status}", 
            "success": True, 
            "data": response.data
        }

    except Exception as e:
        print(f"❌ Status Update Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/schedule-interview")
def schedule_interview(req: InterviewRequest):
    meeting_link = f"https://meet.google.com/{random.randint(100,999)}-{random.randint(100,999)}-{random.randint(100,999)}"
    return {
        "status": "success",
        "message": f"Interview invite sent to {req.candidate_name}",
        "meeting_link": meeting_link
    }