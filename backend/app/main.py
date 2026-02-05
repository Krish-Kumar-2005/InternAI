from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

# ---------------- IMPORTS ----------------
#
from app.api import resume, job, fake, match, recruiter, payment
# 🔥 IMPORT SUPABASE CLIENT
from app.services.supabase import supabase

# ---------------- CREATE APP ----------------
#
app = FastAPI(
    title="AI Internship Intelligence",
    description="Backend API for AI-powered resume parsing, job matching, and recruiter pipelines.",
    version="1.0"
)

# ---------------- CORS ----------------
#
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- 🔥 PYDANTIC MODEL FOR STATUS UPDATE ----------------
#
class ApplicationStatus(BaseModel):
    # 🔴 FIX: Changed from 'int' to 'str' to handle UUIDs (e.g. "fb858feb-...")
    application_id: str  
    status: str

# ---------------- 🔥 ROUTE TO SAVE SHORTLIST STATUS ----------------
#
@app.post("/application/update-status", tags=["Applications"])
async def update_application_status(payload: ApplicationStatus):
    """
    Updates the status of an application (e.g., 'Shortlisted', 'Pending') in Supabase.
    This ensures data persists after reload.
    """
    try:
        print(f"🔄 Updating App ID {payload.application_id} -> {payload.status}")

        # 1. Update Supabase
        response = supabase.table('applications')\
            .update({'status': payload.status})\
            .eq('id', payload.application_id)\
            .execute()

        # 2. Check for success
        data = response.data if hasattr(response, 'data') else response
        
        return {"status": "success", "message": "Status saved to Database", "data": data}

    except Exception as e:
        print(f"❌ Error updating status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- REGISTER ROUTERS ----------------
#
app.include_router(payment.router, prefix="/api/payment", tags=["Payment"])
app.include_router(resume.router, prefix="/resume", tags=["Resume AI"])
app.include_router(job.router, prefix="/job", tags=["Job Board"])
app.include_router(recruiter.router, prefix="/recruiter", tags=["Recruiter Tools"])
app.include_router(fake.router, prefix="/fake", tags=["Authenticity Verification"])
app.include_router(match.router, prefix="/match", tags=["Matching Engine"])

# ---------------- GLOBAL ERROR HANDLER ----------------
#
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("🔥 SERVER ERROR:", exc)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": str(exc),
            "path": request.url.path,
        },
    )

# ---------------- HEALTH CHECK ----------------
#
@app.get("/", tags=["Health"])
async def root():
    return {"status": "online", "message": "Backend is running"}

# ---------------- RUN ----------------
#
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)