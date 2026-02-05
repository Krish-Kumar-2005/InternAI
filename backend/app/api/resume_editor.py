from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response
from app.services.doc_converter import convert_docx_to_html, convert_html_to_docx

router = APIRouter()

# -------------------------------------------
# 📝 RESUME EDITOR ROUTES
# -------------------------------------------

@router.post("/resume/import-for-editor")
async def import_resume_for_editor(file: UploadFile = File(...)):
    """
    1. Receives a .docx file from Frontend.
    2. Converts it to HTML using Mammoth.
    3. Sends HTML back to be loaded into the TipTap Editor.
    """
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported for the live editor.")
    
    try:
        content = await file.read()
        html_output = convert_docx_to_html(content)
        return {"html": html_output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")

@router.post("/resume/export-resume")
async def export_resume(html_content: str = Form(...)):
    """
    1. Receives edited HTML from Frontend.
    2. Converts it back to .docx.
    3. Returns the file as a download.
    """
    file_stream = convert_html_to_docx(html_content)
    
    if not file_stream:
        raise HTTPException(status_code=500, detail="Failed to generate document")

    headers = {
        'Content-Disposition': 'attachment; filename="Optimized_Resume.docx"'
    }
    return Response(
        content=file_stream.getvalue(), 
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        headers=headers
    )