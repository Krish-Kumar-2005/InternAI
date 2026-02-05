import requests
import uuid
from fastapi import HTTPException
from urllib.parse import quote
from dotenv import load_dotenv
import os
load_dotenv()
# ==========================================
# 💸 CASHFREE CONFIGURATION (SANDBOX)
# ==========================================
CLIENT_ID = os.getenv("CASHFREE_CLIENT_ID")
CLIENT_SECRET = os.getenv("CASHFREE_CLIENT_SECRET")
API_VERSION = os.getenv("CASHFREE_API_VERSION")
BASE_URL = os.getenv("CASHFREE_BASE_URL")
def create_payment_link(amount: float, email: str, phone: str, name: str, user_id: str, plan_name: str):
    """
    Creates a Cashfree Payment Link and returns the URL.
    """
    try:
        headers = {
            "x-client-id": CLIENT_ID,
            "x-client-secret": CLIENT_SECRET,
            "x-api-version": API_VERSION,
            "Content-Type": "application/json"
        }
        
        link_id = f"LINK_{uuid.uuid4().hex[:12]}"
        encoded_plan = quote(plan_name)
        
        # 🔥 CRITICAL FIX: Point to the actual frontend success page
        # This ensures the user comes back to a page that triggers the DB update
        return_url = f"http://localhost:5173/payment/success?order_id={link_id}&user_id={user_id}&plan={encoded_plan}"
        
        payload = {
            "customer_details": {
                "customer_phone": phone,
                "customer_email": email,
                "customer_name": name,
                "customer_id": user_id
            },
            "link_notify": {
                "send_sms": True,
                "send_email": True
            },
            "link_id": link_id,
            "link_amount": float(amount),
            "link_currency": "INR",
            "link_purpose": f"InternAI {plan_name}",
            "link_return_url": return_url
        }

        response = requests.post(f"{BASE_URL}/links", json=payload, headers=headers)
        data = response.json()

        if response.status_code == 200 and "link_url" in data:
            return {"payment_url": data["link_url"], "order_id": link_id}
        
        print(f"❌ Cashfree Error: {data}")
        raise HTTPException(status_code=400, detail=data.get("message", "Payment Creation Failed"))

    except Exception as e:
        print(f"❌ Service Exception: {e}")
        raise e

def verify_payment_status(order_id: str):
    """
    🔥 Checks the status of the order from Cashfree
    """
    try:
        headers = {
            "x-client-id": CLIENT_ID,
            "x-client-secret": CLIENT_SECRET,
            "x-api-version": API_VERSION
        }
        
        # Check by link_id (Cashfree Link API)
        response = requests.get(f"{BASE_URL}/links/{order_id}", headers=headers)
        data = response.json()
        
        if response.status_code == 200:
            return data.get("link_status", "PENDING") # PAID, PENDING, EXPIRED
            
        return "FAILED"

    except Exception as e:
        print(f"❌ Verification Error: {e}")
        return "ERROR"