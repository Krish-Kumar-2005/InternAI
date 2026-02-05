import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api"; 

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing");

  useEffect(() => {
    const verifyPayment = async () => {
      const plan = searchParams.get("plan");
      const user_id = searchParams.get("user_id");
      const order_id = searchParams.get("order_id");

      if (!plan || !user_id || !order_id) {
        setStatus("error");
        return;
      }

      try {
        // 🔥 Call Backend to Update DB
        const response = await api.post("/payment/confirm-payment", {
          order_id: order_id,
          user_id: user_id,
          plan_name: plan
        });

        if (response.data.status === "success") {
          setStatus("success");
          
          // Wait 2s then reload to force Navbar update
          setTimeout(() => {
            if (plan.toLowerCase().includes("recruiter")) {
               window.location.href = "/recruiter";
            } else {
               window.location.href = "/student";
            }
          }, 2000);
          
        } else {
          setStatus("error");
        }

      } catch (err) {
        console.error("Verification Error:", err);
        setStatus("error");
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-10 rounded-[2rem] shadow-xl text-center max-w-md w-full">
        {status === "processing" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-slate-800">Verifying Payment...</h2>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-black text-slate-800">Payment Successful!</h2>
            <p className="text-slate-500 mt-2">Activating your plan...</p>
          </>
        )}

        {status === "error" && (
          <>
             <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-slate-800">Verification Failed</h2>
            <p className="text-slate-500 mt-2">Please contact support.</p>
            <button onClick={() => navigate("/")} className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Go Home</button>
          </>
        )}
      </div>
    </div>
  );
}