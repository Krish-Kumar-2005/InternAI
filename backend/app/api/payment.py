from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from app.services.cashfree_service import create_payment_link, verify_payment_status

router = APIRouter()

# 🔥 SUPABASE ADMIN CREDENTIALS
SUPABASE_URL = "https://wdqkqqmvxgerlespfdes.supabase.co"
# ⚠️ IMPORTANT: Ensure this is your SERVICE_ROLE key (starts with ey...), not the Anon key.
# The Service Role key bypasses RLS policies to ensure the write always succeeds.
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcWtxcW12eGdlcmxlc3BmZGVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA3ODEzMCwiZXhwIjoyMDgyNjU0MTMwfQ.w0JgbOsxEgrzrdAM1beVkT4g6Da_1AaA4ggOZGSFL8o"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class OrderRequest(BaseModel):
    amount: float
    email: str
    phone: str
    name: str
    user_id: str
    plan_name: str

class VerifyRequest(BaseModel):
    order_id: str
    user_id: str
    plan_name: str

@router.post("/create-order")
def api_create_order(req: OrderRequest):
    return create_payment_link(req.amount, req.email, req.phone, req.name, req.user_id, req.plan_name)

@router.post("/verify-payment")
def api_verify_payment(req: VerifyRequest):
    """
    🔥 1. Check Cashfree Status
    🔥 2. If 'PAID', UPSERT Supabase 'profiles' table securely
    """
    print(f"🔍 Verifying Order: {req.order_id} for User: {req.user_id}")
    
    # 1. Verify with Cashfree
    status = verify_payment_status(req.order_id)
    
    if status == "PAID":
        try:
            # 2. UPSERT Database (Insert or Update)
            # This fixes the issue where the Recruiter profile might not exist yet.
            data_to_upsert = {
                "id": req.user_id,  # Critical for mapping
                "plan": req.plan_name,
                "plan_status": "active",
                "payment_id": req.order_id,
                "updated_at": "now()"
            }

            # Using .upsert() ensures the row is created if missing. 
            # We do NOT use .eq() with upsert.
            response = supabase.table("profiles").upsert(data_to_upsert).execute()
            
            # Safe check for response data
            data = response.data if hasattr(response, 'data') else response
            
            print(f"✅ Database Updated/Created: {data}")
            return {"status": "success", "message": "Plan Activated"}
        
        except Exception as e:
            print(f"❌ Database Update Failed: {e}")
            raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
            
    elif status == "PENDING":
        return {"status": "pending", "message": "Payment is processing"}
    
    else:
        raise HTTPException(status_code=400, detail="Payment Failed or Cancelled")