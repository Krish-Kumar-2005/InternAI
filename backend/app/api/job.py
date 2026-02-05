from fastapi import APIRouter, Body, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
import requests
import uuid
import os

import json
from dotenv import load_dotenv
import re
from supabase import create_client, Client
from app.services.link_extractor import extract_text_from_pdf, find_github_link
from io import BytesIO
load_dotenv()

# 🔥 IMPORTS FOR AUTOMATION
try:
    from app.services.job_importer import fetch_job_content
except ImportError:
    # Fallback if file missing
    def fetch_job_content(url): return ""

# ==========================================
# 🔌 SUPABASE CONFIGURATION
# ==========================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)    
router = APIRouter()

# --- Data Models ---
class JDRequest(BaseModel):
    title: str
    skills: Optional[str] = "General"

class JobPostRequest(BaseModel):
    title: str
    company: str
    location: str
    description: str
    recruiter_email: Optional[str] = "hr@techcorp.com"
    recruiter_id: Optional[str] = None 

class ApplicationRequest(BaseModel):
    job_id: str
    candidate_name: str
    resume_text: str
    cover_letter: Optional[str] = ""
    student_id: Optional[str] = None

class ImportUrlRequest(BaseModel):
    url: str

class CoverLetterRequest(BaseModel):
    job_role: str
    company_name: str
    resume_text: str

class TailorRequest(BaseModel):
    job_description: str
    resume_text: str

class InterviewRequest(BaseModel):
    resume_text: str
    job_description: str

class EmailRequest(BaseModel):
    candidate_name: str
    job_title: str
    action: str # "shortlist" or "reject"
    missing_skills: Optional[List[str]] = []

class ProjectRequest(BaseModel):
    missing_skills: List[str]
    current_role: str = "Student"

# -------------------------------------------
# 🧠 HELPER FUNCTIONS
# -------------------------------------------
def ask_local_ai(prompt: str):
    """
    Sends prompts to your local Ollama (Phi-3) instance.
    """
    print("🧠 Sending prompt to Local Ollama (Phi-3)...")
    try:
        url = "http://localhost:11434/api/generate"
        data = {
            "model": "phi3",
            "prompt": prompt,
            "stream": False
        }
        response = requests.post(url, json=data)
        if response.status_code == 200:
            return response.json()['response']
        else:
            return None
    except Exception as e:
        print(f"❌ Ollama Error: {e}")
        return None


def extract_email(text: str) -> Optional[str]:
    match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    return match.group(0) if match else None

def extract_github_link(text: str) -> List[str]:
    """
    🔥 Updated: Extracts the FIRST GitHub profile/repo link from text using robust regex.
    """
    if not text:
        return None
    
    patterns = [
        r'(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_-]+)(?:/([a-zA-Z0-9_-]+))?',
        r'github\s*[:\-@]\s*([a-zA-Z0-9_-]+)',
        r'github\.com\s*/\s*([a-zA-Z0-9_-]+)',
    ]
    
    found_links = set()
    
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                username = match[0]
                repo = match[1] if len(match) > 1 and match[1] else None
            else:
                username = match
                repo = None
            
            if username.lower() in ['site', 'com', 'org', 'net']: 
                continue

            if repo:
                link = f"https://github.com/{username}/{repo}"
            else:
                link = f"https://github.com/{username}"
            
            found_links.add(link)
    
    if found_links:
        return list(found_links)[0]
    
    return None

def calculate_skills_gap(jd_text, resume_text):
    """Simple keyword matching to find missing skills."""
    if not jd_text or not resume_text: return []
    keywords = ["python", "react", "javascript", "node", "sql", "aws", "docker", "kubernetes", "ai", "ml", "java", "c++", "typescript", "figma", "pandas", "numpy", "pytorch", "tensorflow", "django", "flask"]
    
    jd_lower = jd_text.lower()
    resume_lower = resume_text.lower()
    
    required_skills = [k for k in keywords if k in jd_lower]
    missing = [k for k in required_skills if k not in resume_lower]
    
    return missing[:5]

# --- ROUTES ---

# 🔥 SHORTLISTING ENGINE
@router.post("/recruiter/shortlist")
async def shortlist_candidates(
    job_description: str = Form(...),
    resumes: List[UploadFile] = File(...)
):
    results = []
    
    for file in resumes:
        content = await file.read()
        text = extract_text_from_pdf(content)
        
        if not text.strip():
            text = "Could not parse resume text."

        prompt = (
            f"Compare this resume to the Job Description.\n"
            f"JD: {job_description[:500]}...\n"
            f"Resume: {text[:500]}...\n"
            f"Give a match score (0-100) and a verdict (Good Match, Average, Poor).\n"
            f"Format: Score: 85 | Verdict: Good Match"
        )
        ai_output = ask_local_ai(prompt) or "Score: 0 | Verdict: Review"
        
        score = 50
        verdict = "Needs Review"
        if "Score:" in ai_output:
            try:
                score_part = ai_output.split("Score:")[1].split("|")[0].strip()
                score = int(re.search(r'\d+', score_part).group())
            except: pass
        if "Verdict:" in ai_output:
            try: verdict = ai_output.split("Verdict:")[1].strip()
            except: pass

        github_link = None
        links = find_github_link(text)
        if isinstance(links, list) and len(links) > 0:
             github_link = links[0]
        elif isinstance(links, str):
            github_link = links

        missing_skills = calculate_skills_gap(job_description, text)

        results.append({
            "candidate_name": file.filename.split('.')[0].replace("_", " ").title(),
            "match_score": score,
            "verdict": verdict,
            "resume_text": text, 
            "github_link": github_link,
            "missing_skills": missing_skills   
        })

    results.sort(key=lambda x: x['match_score'], reverse=True)
    return {"shortlisted": results}


# 🔥 RECRUITER DASHBOARD: Get ALL Jobs (FIXED: Fetches Application Count)
@router.get("/all")
def get_all_jobs():
    """
    Fetches ALL jobs from the database (Bypasses RLS).
    """
    try:
        # 🔥 FIX: Fetch count of applications for each job
        response = supabase.table("jobs")\
            .select("*, applications(count)")\
            .order("created_at", desc=True)\
            .execute()
        return response.data
    except Exception as e:
        print(f"❌ Fetch Error: {e}")
        return []

# --- Add this Data Model near the top with others ---
class StatusUpdateRequest(BaseModel):
    application_id: str
    status: str

# --- Add this Endpoint near the bottom ---
@router.post("/application/update-status")
def update_application_status(req: StatusUpdateRequest):
    try:
        # Update the status in Supabase
        response = supabase.table("applications")\
            .update({"status": req.status})\
            .eq("id", req.application_id)\
            .execute()
            
        return {"status": "success", "message": "Status updated"}
    except Exception as e:
        print(f"❌ Update Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")

# 🔥 RECRUITER DASHBOARD: Get Applications for a specific Job
@router.get("/{job_id}/applications")
def get_job_applications(job_id: str):
    """
    Fetches all candidates for a specific job.
    """
    try:
        response = supabase.table("applications")\
            .select("*")\
            .eq("job_id", job_id)\
            .order("match_score", desc=True)\
            .execute()
        return response.data
    except Exception as e:
        print(f"❌ App Fetch Error: {e}")
        return []

# 🔥 JOB POSTING
@router.post("/post")
def post_job(job: JobPostRequest):
    try:
        job_data = {
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "description": job.description,
            "recruiter_email": job.recruiter_email,
            "type": "Full-time",       
            "salary": "Competitive",
            "status": "Open",
        }
        
        if job.recruiter_id:
            job_data["posted_by"] = job.recruiter_id

        data = supabase.table("jobs").insert(job_data).execute()
        
        if not data.data:
             raise HTTPException(status_code=500, detail="Job was sent to DB but no data returned.")

        return {"status": "success", "job": data.data[0]}
    except Exception as e:
        print(f"❌ Database Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save job: {str(e)}")

# 🔥 RECRUITER AI: Generate Interview Questions
@router.post("/recruiter/generate-questions")
def generate_interview_questions(req: InterviewRequest):
    prompt = (
        f"You are a Senior Tech Recruiter. Generate 5 specific interview questions.\n"
        f"JOB DESCRIPTION:\n{req.job_description[:500]}...\n\n"
        f"CANDIDATE RESUME:\n{req.resume_text[:1000]}..."
    )
    questions = ask_local_ai(prompt)
    if not questions: raise HTTPException(status_code=500, detail="AI failed to generate questions.")
    return {"questions": questions}

# --- Update the Route ---
@router.post("/recruiter/generate-email")
def generate_email(req: EmailRequest):
    if req.action == "shortlist":
        tone = "Exciting, professional, inviting for an interview."
        content_instruction = "Invite them for an interview."
    else:
        tone = "Polite, empathetic, constructive, and encouraging."
        
        # --- 👇 MODIFIED LOGIC FOR BULLET POINTS 👇 ---
        if req.missing_skills and len(req.missing_skills) > 0:
            skills_str = ", ".join(req.missing_skills)
            content_instruction = (
                f"Inform them we are not moving forward. "
                f"Explicitly list these missing skills using bullet points or a clear list format: {skills_str}. "
                f"Suggest they build projects using these specific technologies to improve their profile."
            )
        # ---------------------------------------------
        else:
            content_instruction = "Inform them we are not moving forward. Wish them luck."

    prompt = (
        f"Write a professional email for a candidate named '{req.candidate_name}' "
        f"who applied for the role '{req.job_title}'.\n"
        f"Action: {req.action.upper()}.\n"
        f"Tone: {tone}\n"
        f"Key Instruction: {content_instruction}\n"
        f"Keep it under 150 words. Signature: 'The Hiring Team'."
    )
    
    email_body = ask_local_ai(prompt)
    if not email_body: 
        raise HTTPException(status_code=500, detail="AI failed to generate email.")
    
    return {"email_body": email_body}

# 🔥 IMPROVED JD GENERATOR
@router.post("/generate-jd")
def generate_job_description(req: JDRequest):
    prompt = (
        f"Write a professional Job Description for a '{req.title}' role.\n"
        f"Required Skills: {req.skills}.\n\n"
        f"Structure the output with these headings:\n"
        f"1. Role Overview\n"
        f"2. Key Responsibilities (bullet points)\n"
        f"3. Requirements (bullet points)\n"
        f"4. Benefits\n\n"
        f"Keep it professional and engaging."
    )
    description = ask_local_ai(prompt)
    if not description: return {"description": "Error: AI could not generate text."}
    return {"description": description}

@router.post("/tailor-resume")
def tailor_resume(req: TailorRequest):
    prompt = (
        f"Act as an expert Resume Writer. Tailor the following resume to better match the Job Description.\n"
        f"Return ONLY a JSON object with keys: 'tailored_summary' and 'tailored_skills'.\n\n"
        f"JOB DESCRIPTION:\n{req.job_description[:1000]}\n\n"
        f"RESUME:\n{req.resume_text[:1000]}"
    )
    ai_response = ask_local_ai(prompt)
    if not ai_response: raise HTTPException(status_code=500, detail="AI failed to tailor resume.")

    try:
        start = ai_response.find('{')
        end = ai_response.rfind('}') + 1
        json_str = ai_response[start:end]
        data = json.loads(json_str)
        return data
    except:
        return {
            "tailored_summary": ai_response,
            "tailored_skills": "See summary."
        }

@router.delete("/{job_id}")
def delete_job(job_id: str):
    try:
        response = supabase.table("jobs").delete().eq("id", job_id).execute()
        return {"status": "success", "message": "Job deleted successfully!"}
    except Exception as e:
        print(f"❌ Delete Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete job.")

@router.post("/generate-cover-letter")
def generate_cover_letter(req: CoverLetterRequest):
    prompt = (
        f"Write a professional, passionate cover letter for a '{req.job_role}' position at '{req.company_name}'.\n"
        f"Use the following resume details to highlight why I am a good fit:\n{req.resume_text[:1000]}\n"
        f"Keep it concise (under 200 words)."
    )
    cover_letter = ask_local_ai(prompt)
    if not cover_letter: raise HTTPException(status_code=500, detail="AI failed to generate letter.")
    return {"cover_letter": cover_letter}

@router.post("/import-url")
def import_job_from_url(req: ImportUrlRequest):
    print(f"🌍 Fetching URL: {req.url}")
    raw_text = fetch_job_content(req.url)
    if not raw_text:
        return {"status": "error", "message": "⚠️ Site blocked the bot. Please copy-paste manually."}

    prompt = (
        f"Analyze the following job posting text and extract the details.\n"
        f"Return ONLY a valid JSON object with these keys: title, company, location, description.\n"
        f"Raw Text:\n{raw_text[:2500]}"
    )

    ai_response = ask_local_ai(prompt)
    try:
        start = ai_response.find('{')
        end = ai_response.rfind('}') + 1
        json_str = ai_response[start:end]
        parsed_data = json.loads(json_str)
        return parsed_data
    except Exception as e:
        print(f"AI Parse Fail: {ai_response}")
        return {
            "title": "Imported Job", 
            "company": "Unknown", 
            "location": "Remote", 
            "description": raw_text[:1000]
        }

@router.post("/list-smart")
def list_jobs_smart(resume_text: str = Body("", embed=True)):
    try:
        response = supabase.table("jobs").select("*").order("created_at", desc=True).execute()
        real_jobs = response.data
        
        smart_jobs = []
        for job in real_jobs:
            if not resume_text or len(resume_text) < 10:
                probability = "❓ Upload Resume"
                final_score = 0
            else:
                description = job.get("description", "") or ""
                jd_lower = description.lower()
                
                resume_lower = resume_text.lower()
                score = 0
                keywords = ["python", "react", "ai", "machine learning", "sql", "java", "aws", "node", "pandas", "numpy"]
                
                for k in keywords:
                    if k in jd_lower and k in resume_lower: score += 20
                
                final_score = min(score, 98)
                probability = "🔥 High" if final_score > 60 else "✅ Medium" if final_score > 30 else "⚠️ Low"

            smart_jobs.append({
                **job,
                "win_probability": probability,
                "match_score": final_score
            })
        return smart_jobs
    except Exception as e:
        print(f"❌ Fetch Error: {e}")
        return [] 

@router.post("/apply")
def apply_for_job(app: ApplicationRequest):
    try:
        # 1. Fetch the actual Job Description from Supabase to compare against
        job_res = supabase.table("jobs").select("description").eq("id", app.job_id).single().execute()
        job_description = job_res.data.get("description", "") if job_res.data else ""

        # 2. Calculate AI Score (Dynamic)
        final_score = 40 # Default fallback score
        
        if job_description and app.resume_text:
            # Create a prompt for Ollama to score the match
            prompt = (
                f"You are an ATS (Applicant Tracking System).\n"
                f"Rate the match between the Resume and Job Description on a scale of 0 to 100.\n"
                f"JOB DESCRIPTION: {job_description[:1000]}\n"
                f"RESUME: {app.resume_text[:1000]}\n"
                f"CRITERIA: Focus on matching skills, experience levels, and tech stack.\n"
                f"OUTPUT: Return ONLY a single number (e.g. 85)."
            )
            
            ai_response = ask_local_ai(prompt)
            
            # Parse the number from AI response
            if ai_response:
                try:
                    # Find the first number in the response
                    import re
                    match = re.search(r'\d+', str(ai_response))
                    if match:
                        final_score = int(match.group())
                        # Ensure score is within 0-100
                        final_score = min(max(final_score, 10), 99)
                except Exception as parse_err:
                    print(f"⚠️ Score Parse Error: {parse_err}")

        # 3. Extract GitHub Link
        github_url = find_github_link(app.resume_text)

        # 4. Prepare Data
        app_data = {
            "job_id": app.job_id,
            "candidate_name": app.candidate_name,
            "email": "student@example.com", # In production, fetch from user profile
            "resume_text": app.resume_text,
            "cover_letter": app.cover_letter,
            "status": "New",
            "match_score": final_score, # 🔥 Now uses the AI score
            "github_link": github_url, 
        }

        if app.student_id:
            app_data["user_id"] = app.student_id
        
        # 5. Insert into Database
        data = supabase.table("applications").insert(app_data).execute()
        return {"status": "success", "message": "Application saved to Database!", "score": final_score}
    
    except Exception as e:
        print(f"❌ Apply Error: {e}")
        return {"status": "error", "message": "Could not save application."}
# Add this class to your Pydantic models at the top
class ResumeLabelRequest(BaseModel):
    resume_text: str
    user_note: Optional[str] = ""

# 🔥 NEW ENDPOINT: Analyze Resume Context
@router.post("/resume/smart-label")
def smart_label_resume(req: ResumeLabelRequest):
    """
    Uses Ollama to analyze a resume + user note to generate tags.
    """
    prompt = (
        f"Analyze this resume text and the user's intent note.\n"
        f"RESUME PREVIEW: {req.resume_text[:800]}\n"
        f"USER NOTE: {req.user_note}\n\n"
        f"TASK:\n"
        f"1. Identify the 'Category' (e.g. Data Science, Fullstack, DevOps).\n"
        f"2. Identify the 'Target Company' if mentioned in the note (otherwise null).\n"
        f"3. Extract top 3 'Tags' (skills/tech).\n\n"
        f"Return ONLY valid JSON like: {{ \"category\": \"Data Science\", \"target_company\": \"Google\", \"tags\": [\"Python\", \"NLP\", \"Pandas\"] }}"
    )

    ai_response = ask_local_ai(prompt)
    
    # Default structure
    result = {"category": "General", "target_company": None, "tags": []}

    try:
        # JSON Parsing Logic
        if ai_response:
            clean_json = ai_response.replace("```json", "").replace("```", "").strip()
            start = clean_json.find('{')
            end = clean_json.rfind('}') + 1
            if start != -1:
                result = json.loads(clean_json[start:end])
    except Exception as e:
        print(f"⚠️ Labeling Error: {e}")
    
    return result


# 🔥 NEW: PROJECT RECOMMENDATION AI
@router.post("/recommend-project")
def recommend_project(req: ProjectRequest):
    """
    🔥 Uses Local Ollama to generate a project idea based on missing skills.
    """
    skills_str = ", ".join(req.missing_skills) if req.missing_skills else "General Full Stack"
    
    prompt = (
        f"A computer science student wants to build a portfolio project to learn these skills: {skills_str}.\n"
        f"Suggest ONE impressive, unique capstone project idea that uses these technologies.\n"
        f"Format the response as a JSON object with keys: 'title', 'description', 'tech_stack'.\n"
        f"Keep the description under 2 sentences."
    )

    ai_response = ask_local_ai(prompt)
    
    if not ai_response:
        return {
            "title": "AI Resume Builder",
            "description": "Build a tool that uses AI to format and optimize resumes automatically.",
            "tech_stack": "Python, React, NLP"
        }

    try:
        start = ai_response.find('{')
        end = ai_response.rfind('}') + 1
        data = json.loads(ai_response[start:end])
        return data
    except:
        return {
            "title": "Custom Learning Project",
            "description": ai_response[:200],
            "tech_stack": skills_str
        }
    
