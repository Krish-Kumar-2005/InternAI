from fastapi import APIRouter, UploadFile, File, Body, HTTPException, Response
from pydantic import BaseModel
import requests
import re
import io
import os
from dotenv import load_dotenv
load_dotenv()
# Import services
from app.services.resume_parser import parse_resume
from app.services.resume_editor import edit_pdf_metadata
# Updated imports for the new pipeline
from app.services.doc_converter import convert_docx_to_html, convert_pdf_to_docx_stream, patch_docx_with_html
from app.services.supabase import supabase

router = APIRouter()

# --- Data Models ---
class SuggestionRequest(BaseModel):
    text: str
    profession: str 

class OptimizeRoleRequest(BaseModel):
    text: str
    profession: str 

class SaveDraftRequest(BaseModel):
    user_id: str
    html_content: str
    title: str

class ExportRequest(BaseModel):
    html_content: str
    source_filename: str  # Needed to find the Source of Truth DOCX

# -------------------------------------------
# 🧠 LOCAL INTELLIGENCE ENGINE (Ollama)
# -------------------------------------------
def ask_local_ai(prompt: str):
    try:
        url = os.getenv("OLLAMA_URL")
        model = os.getenv("OLLAMA_MODEL")

        data = {
            "model": model,
            "prompt": prompt,
            "stream": False
        }

        response = requests.post(url, json=data)

        if response.status_code == 200:
            return response.json()['response']

        return None

    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        return None

# -------------------------------------------
# 🛠️ ROUTES
# -------------------------------------------

@router.post("/import-for-editor")
async def import_for_editor(file: UploadFile = File(...)):
    """
    STEP 1: IMPORT
    PDF/DOCX -> Source of Truth DOCX (Stored Temp) -> HTML (For Editor)
    Returns HTML and the filename to track the source.
    """
    try:
        file_bytes = await file.read()
        filename = file.filename
        
        docx_stream = None

        if filename.endswith(".docx"):
            docx_stream = io.BytesIO(file_bytes)
        
        elif filename.endswith(".pdf"):
            # Convert PDF to DOCX and get the stream
            # This function also saves the temp DOCX for us
            await file.seek(0)
            print(f"🔄 Creating Source of Truth for: {filename}")
            docx_stream, _ = convert_pdf_to_docx_stream(file_bytes, filename)
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported format. Use .docx or .pdf")

        if docx_stream:
            # Convert to HTML for Tiptap AND save the source file
            html_content = convert_docx_to_html(docx_stream, filename)
            return {
                "html": html_content,
                "source_filename": filename # Frontend must send this back for export!
            }
        else:
            raise HTTPException(status_code=500, detail="Conversion failed")

    except Exception as e:
        print(f"❌ Import Route Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suggest")
def suggest_changes(request: SuggestionRequest):
    print(f"🧠 Optimizing phrase: '{request.text}' for {request.profession}...")
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

@router.post("/save-draft")
async def save_draft(request: SaveDraftRequest):
    try:
        print(f"💾 Saving draft for User {request.user_id}...")
        data = {
            "user_id": request.user_id,
            "title": request.title,
            "content": request.html_content,
            "status": "draft"
        }
        response = supabase.table("resume_drafts").insert(data).execute()
        return {"status": "success", "message": "Draft saved"}
    except Exception as e:
        print(f"❌ Save Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export-resume")
async def export_resume(request: ExportRequest):
    """
    STEP 5: EXPORT (PATCHING STRATEGY)
    Loads Original DOCX -> Patches text from HTML -> Returns 100% formatted DOCX
    
    🔥 FIX: Now accepts JSON Pydantic Model to avoid 422 Errors.
    """
    try:
        print(f"📤 Exporting by patching source: {request.source_filename}...")
        
        # Use the patching function with data from the request object
        docx_stream = patch_docx_with_html(request.source_filename, request.html_content)
        
        if not docx_stream:
            raise HTTPException(status_code=500, detail="Export patching failed. Source file might be missing.")
            
        return Response(
            content=docx_stream.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": "attachment; filename=Optimized_Resume.docx"
            }
        )

    except Exception as e:
        print(f"❌ Export Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Keep existing utility routes ---
@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    try:
        text = parse_resume(file)
        return {"resume_text": text}
    except Exception as e:
        return {"resume_text": "Could not parse PDF text automatically."}

@router.post("/optimize-role")
def optimize_resume_for_role(request: OptimizeRoleRequest):
    prompt = (
        f"Rewrite resume summary for {request.profession}. Keep under 100 words.\nOriginal:\n{request.text}"
    )
    optimized_text = ask_local_ai(prompt)
    if not optimized_text:
        raise HTTPException(status_code=503, detail="Local AI not running")
    return { "optimized_text": optimized_text.strip(), "new_score": 92 }