import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"; 
import { supabase } from "../services/supabaseClient";

export default function Auth() {
  const navigate = useNavigate(); 
  const [searchParams] = useSearchParams();

  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // 🟢 1. HANDLE PAYMENT SUCCESS & UPDATE DATABASE
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const paymentId = searchParams.get("payment_id");
      const isSuccess = searchParams.get("payment_success");

      if (paymentId || isSuccess) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            console.log("💰 Payment detected! Upgrading user:", user.email);

            const { error } = await supabase
              .from('profiles')
              .update({ 
                plan: 'pro', 
                payment_id: paymentId || 'mock_id' 
              })
              .eq('id', user.id);

            if (error) throw error;

            alert("🎉 Payment Successful! Welcome to InternAI Pro.");
          }
        } catch (error) {
          console.error("❌ Database Update Failed:", error.message);
          alert("Payment received, but database update failed. Contact support.");
        }
        
        navigate("/"); 
      }
    };

    handlePaymentSuccess();
  }, [searchParams, navigate]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, user_role: role, plan: 'free' }
          }
        });
        if (error) throw error;
        alert("Verification link sent! Please check your inbox.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) navigate("/");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin, data: { user_role: role, full_name: fullName } },
    });
    if (error) alert(error.message);
  };

  const handleGitHubAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin, scopes: 'repo read:user', data: { user_role: role, full_name: fullName } },
    });
    if (error) alert(error.message);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white font-sans text-gray-900 relative">
      
      {/* 🔥 CSS FOR MODERN SHEEP BUTTON */}
      <style>{`
        .modern-sheep-btn {
          --primary-color: #1563ff;
          --secondary-color: #fff;
          --hover-color: #111;
          --arrow-width: 10px;
          --arrow-stroke: 2px;
          box-sizing: border-box;
          border: 0;
          border-radius: 20px;
          color: var(--secondary-color);
          padding: 1em 1.8em;
          background: var(--primary-color);
          display: flex;
          transition: 0.2s background;
          align-items: center;
          justify-content: center; /* Center content */
          gap: 0.6em;
          font-weight: bold;
          cursor: pointer;
          width: 100%; /* Fill container */
          font-size: 16px; /* Adjust font size */
          margin-top: 1rem;
        }

        .modern-sheep-btn .arrow-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .modern-sheep-btn .arrow {
          margin-top: 1px;
          width: var(--arrow-width);
          background: var(--primary-color);
          height: var(--arrow-stroke);
          position: relative;
          transition: 0.2s;
        }

        .modern-sheep-btn .arrow::before {
          content: "";
          box-sizing: border-box;
          position: absolute;
          border: solid var(--secondary-color);
          border-width: 0 var(--arrow-stroke) var(--arrow-stroke) 0;
          display: inline-block;
          top: -3px;
          right: 3px;
          transition: 0.2s;
          padding: 3px;
          transform: rotate(-45deg);
        }

        .modern-sheep-btn:hover {
          background-color: var(--hover-color);
        }

        .modern-sheep-btn:hover .arrow {
          background: var(--secondary-color);
        }

        .modern-sheep-btn:hover .arrow:before {
          right: 0;
        }
        
        .modern-sheep-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>

      {/* Navbar Placeholder */}
      <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <div className="text-2xl font-black tracking-tighter lg:text-white text-blue-600">
          InternAI
        </div>
      </nav>

      {/* LEFT SIDE: Branding */}
      <div className="hidden lg:flex flex-col justify-center p-16 bg-blue-600 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500 rounded-full -mr-32 -mt-32 opacity-50 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full -ml-20 -mb-20 opacity-20"></div>

        <div className="relative z-10">
          <div className="mb-10 flex items-center gap-3">
             <span className="text-5xl">🚀</span>
             <h1 className="text-6xl font-black tracking-tighter text-white">
               Intern<span className="text-blue-200">AI</span>
             </h1>
          </div>
          <p className="text-xl text-blue-100 mb-12 max-w-md font-medium leading-relaxed">
            Verify job authenticity and master your career match with our industry-leading AI matching engine.
          </p>
          <div className="space-y-6 text-white">
            <FeatureItem icon="🛡️" text="Fraud detection for job postings." />
            <FeatureItem icon="🎯" text="Precision resume matching scores." />
            <FeatureItem icon="📈" text="Personalized skill-gap analysis." />
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Form */}
      <div className="flex flex-col justify-center items-center p-8 bg-gray-50/30 pt-24 lg:pt-0">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl shadow-blue-100 border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black tracking-tight text-gray-900">
                {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-gray-500 font-medium mt-3">
              {isSignUp ? "Start your journey with InternAI today" : "Log in to your workspace"}
            </p>
          </div>

          {isSignUp && (
            <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8">
              <button 
                type="button"
                onClick={() => setRole("student")}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${role === 'student' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}
              >🎓 Student</button>
              <button 
                type="button"
                onClick={() => setRole("recruiter")}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${role === 'recruiter' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}
              >💼 Recruiter</button>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <input 
                type="text" 
                placeholder="Full Name" 
                required
                className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-600 outline-none transition-all font-semibold bg-gray-50/50"
                onChange={(e) => setFullName(e.target.value)}
              />
            )}
            <input 
              type="email" 
              placeholder="Email Address" 
              required
              className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-600 outline-none transition-all font-semibold bg-gray-50/50"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Password" 
              required
              className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-600 outline-none transition-all font-semibold bg-gray-50/50"
              onChange={(e) => setPassword(e.target.value)}
            />
            
            {/* 🔥 MODERN SHEEP BUTTON */}
            <button className="modern-sheep-btn" type="submit" disabled={loading}>
              {loading ? "Processing..." : (isSignUp ? "Register Now" : "Sign In")}
              <div className="arrow-wrapper">
                <div className="arrow"></div>
              </div>
            </button>

          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-5 text-gray-400 font-black tracking-[0.2em]">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={handleGoogleAuth} className="flex items-center justify-center gap-3 bg-white border-2 border-gray-100 hover:border-blue-600 text-gray-700 font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-sm hover:shadow-md">
              <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-5 h-5" alt="Google" /> Google
            </button>
            <button type="button" onClick={handleGitHubAuth} className="flex items-center justify-center gap-3 bg-[#24292e] border-2 border-[#24292e] text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-sm hover:shadow-md hover:bg-black">
              <img src="https://www.svgrepo.com/show/512317/github-142.svg" className="w-5 h-5 invert" alt="GitHub" /> GitHub
            </button>
          </div>

          <p className="text-center mt-10 text-sm font-bold text-gray-500">
            {isSignUp ? "Already a member?" : "New to the platform?"}{" "}
            <button 
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 font-black hover:underline underline-offset-8 decoration-2"
            >
              {isSignUp ? "Log In" : "Create Account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper Component
function FeatureItem({ icon, text }) {
  return (
    <div className="flex items-center gap-5 bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-md transition-transform hover:scale-105">
      <span className="text-3xl bg-white/20 p-3 rounded-xl shadow-inner">{icon}</span>
      <span className="font-bold text-lg">{text}</span>
    </div>
  );
}