import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

// 👇 Change this when deploying to Vercel/Render
const BACKEND_BASE_URL = "http://localhost:8000"; 

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  
  // 🔥 Track User Plan
  const [userPlan, setUserPlan] = useState(null); 

  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // 🔥 Pricing Modal State
  const [showPricing, setShowPricing] = useState(false);
  const [billingRole, setBillingRole] = useState("student");
  const [paymentStep, setPaymentStep] = useState("plans"); 
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingInfo, setBillingInfo] = useState({ name: "", phone: "", email: "" });
  
  const dropdownRef = useRef(null);
  const modalScrollRef = useRef(null);

  // ---------------------------------------------------------
  // 1️⃣ AUTH LISTENER: Handles Login / Logout State
  // ---------------------------------------------------------
  useEffect(() => {
    const handleUserSession = (session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // Auto-set billing role based on user role if logged in
      if (currentUser?.user_metadata?.user_role) {
        setBillingRole(currentUser.user_metadata.user_role);
      }
    };

    // Check initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      handleUserSession(user ? { user } : null);
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => handleUserSession(session)
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  // ---------------------------------------------------------
  // 2️⃣ DATA FETCHER: Runs on login AND route change (Fixes UI sync)
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user) {
        setUserPlan(null); // Reset if logged out
        return;
      }

      // 🔥 Fetch Plan directly from 'profiles' table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('plan, plan_status')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error("Error fetching plan:", error);
        setUserPlan("Free"); // Fallback safety
        return;
      }

      // If plan is active, save it. Otherwise default to Free.
      if (profile?.plan_status === 'active' && profile?.plan) {
        setUserPlan(profile.plan);
      } else {
        setUserPlan("Free");
      }
    };

    fetchUserPlan();
    
    // 🔥 CRITICAL FIX: Added 'location.pathname' dependency
    // This forces the plan to re-check immediately when the user navigates back from Payment
  }, [user, location.pathname]); 

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowDropdown(false);
    navigate("/auth");
  };

  // 🔥 3. PLAN SELECTION LOGIC
  const handlePlanSelect = (plan) => {
    // Free Plan -> Activate immediately
    if (Number(plan.price) === 0) {
      alert(`✅ Free plan activated: ${plan.title}`);
      setShowPricing(false);
      return;
    }

    // Paid Plan -> Go to Billing
    setSelectedPlan(plan);
    setPaymentStep("billing"); 
    
    // Scroll modal to top
    setTimeout(() => {
        if (modalScrollRef.current) {
            modalScrollRef.current.scrollTop = 0; 
        }
    }, 50);
  };

  // 🔥 4. PAYMENT HANDLER
  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!user) {
        alert("Please log in to continue.");
        navigate("/auth");
        return;
    }

    const API_ENDPOINT = `${BACKEND_BASE_URL}/api/payment/create-order`;
    
    try {
      console.log("🟣 Requesting Payment Link...", API_ENDPOINT);
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: Number(selectedPlan.price), 
          email: billingInfo.email,
          phone: billingInfo.phone,
          name: billingInfo.name,
          user_id: user.id, // ✅ Sending User ID (Crucial for DB update)
          plan_name: selectedPlan.title // ✅ Sending Plan Name
        })
      });
      
      const data = await res.json();

      if (!data.payment_url) {
        alert(`❌ Error: ${data.detail || "Check backend console"}`);
        return;
      }

      // Redirect to Cashfree
      window.location.href = data.payment_url;

    } catch (err) {
      console.error(err);
      alert("Backend Error. Is uvicorn running?");
    }
  };

  const isRecruiter = user?.user_metadata?.user_role === 'recruiter';
  const isActive = (path) => location.pathname === path;

  // 🔥 CRITICAL: Only consider it a "Paid Plan" if it's NOT 'Free'
  const isPaidUser = userPlan && userPlan.toLowerCase() !== "free";

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 font-sans tracking-tight bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 transition-all duration-300 supports-[backdrop-filter]:bg-white/70">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center h-20">
            
            {/* --- BRANDING --- */}
            <Link to="/" className="flex items-center gap-3 group select-none">
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shadow-lg shadow-slate-300/50 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-900 leading-none tracking-tighter group-hover:text-blue-600 transition-colors">Intern Ai</span>
              </div>
            </Link>

            {/* --- CENTERED NAVIGATION (Desktop) --- */}
            {user && (
              <div className="hidden md:flex items-center gap-2">
                {!isRecruiter ? (
                  <>
                    <NavLink to="/student" active={isActive("/student")} label="Analysis" />
                    <NavLink to="/resume-fixer" active={isActive("/resume-fixer")} label="Resume Fixer" />
                    <NavLink to="/student-jobs" active={isActive("/student-jobs")} label="Jobs" />
                    <NavLink to="/student-applications" active={isActive("/student-applications")} label="Tracker" />
                  </>
                ) : (
                  <>
                    <NavLink to="/recruiter" active={isActive("/recruiter")} label="Dashboard" />
                    <NavLink to="/recruiter-post" active={isActive("/recruiter-post")} label="Post Job" />
                  </>
                )}
              </div>
            )}

            {/* --- RIGHT ACTIONS --- */}
            <div className="flex items-center gap-6">
              
              {/* 🔥 PRICING BUTTON: Shows only if user is NOT paid */}
              {!isPaidUser && (
                <button 
                  onClick={() => { setShowPricing(true); setPaymentStep("plans"); }}
                  className="hidden sm:block text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Pricing
                </button>
              )}

              {!user ? (
                <Link to="/auth" className="bg-[#0055FF] text-white px-7 py-3 rounded-full font-bold text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all duration-300">
                  Get Started
                </Link>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  
                  {/* PROFILE PILL */}
                  <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={`group flex items-center gap-3 pl-1.5 pr-4 py-1.5 rounded-full border transition-all duration-300 
                      ${showDropdown 
  ? "bg-white border-blue-500 shadow-xl shadow-blue-100 ring-2 ring-blue-50 scale-[1.02]" 
  : "bg-white/50 border-slate-400 hover:bg-white hover:border-slate-600 hover:shadow-lg hover:-translate-y-0.5"
}`}
                  >
                    <div className="relative w-9 h-9 rounded-full overflow-hidden shadow-sm ring-1 ring-slate-900/5 group-hover:ring-slate-900/10 transition-all">
                      <img 
                        src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=0F172A&color=fff`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 mr-1">
                    <span className="text-sm font-black text-slate-900 tracking-tight leading-none">
                       {user.user_metadata?.full_name?.split(' ')[0] || "User"}
                    </span>
                    {isPaidUser && (
                       <span className="text-[10px] mb-0.5 filter drop-shadow-sm transform scale-110">💎</span>
                    )}
                  </div>  
                  </button>

                  {/* MEGA DROPDOWN */}
                  {showDropdown && (
                    <div className="absolute right-0 top-16 w-80 bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-3 animate-in fade-in slide-in-from-top-2 duration-200 z-50 origin-top-right">
                      <div className="p-5 bg-slate-50 rounded-[1.5rem] mb-2 border border-slate-100">
                        <p className="text-sm font-black text-slate-900 truncate">{user.user_metadata?.full_name || "User"}</p>
                        <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{user.email}</p>
                        
                        {/* 🔥 SHOW PLAN BADGE IN PROFILE */}
                        <div className="mt-3">
                          <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${isPaidUser ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}>
                            Plan: {userPlan || "Free"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 p-1">
                        {!isRecruiter && (
                          <>
                            <DropdownItem 
                                to="/my-projects" 
                                icon="🚀" 
                                label="My Projects" 
                                sub="Manage your portfolio"
                                onClick={() => setShowDropdown(false)}
                                active
                            />
                            <DropdownItem 
                                to="/resume-history" 
                                icon="📂" 
                                label="History" 
                                sub="Previous analysis reports"
                                onClick={() => setShowDropdown(false)}
                            />
                          </>
                        )}
                      </div>

                      <div className="h-[1px] bg-slate-100 my-2 mx-2"></div>

                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[1.5rem] hover:bg-red-50 text-slate-600 hover:text-red-600 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform text-xs">⛔</div>
                        <span className="text-sm font-bold">Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Toggle */}
              <button 
                className="md:hidden p-2 text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path></svg>
              </button>
            </div>
          </div>
        </div>

        {/* --- MOBILE MENU OVERLAY --- */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-2xl border-t border-slate-100 shadow-2xl absolute w-full left-0 animate-in slide-in-from-top-5">
            <div className="p-4 space-y-2">
              {!isRecruiter ? (
                <>
                  <MobileLink to="/student" label="Analysis" active={isActive("/student")} onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/resume-fixer" label="Resume Fixer" active={isActive("/resume-fixer")} onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/student-jobs" label="Job Board" active={isActive("/student-jobs")} onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/student-applications" label="Tracker" active={isActive("/student-applications")} onClick={() => setMobileMenuOpen(false)} />
                  <div className="h-[1px] bg-slate-100 my-3"></div>
                  <MobileLink to="/my-projects" label="🚀 My Projects" onClick={() => setMobileMenuOpen(false)} />
                </>
              ) : (
                <>
                  <MobileLink to="/recruiter" label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/recruiter-post" label="Post Job" onClick={() => setMobileMenuOpen(false)} />
                </>
              )}
              
              {/* 🔥 SHOW MOBILE PRICING BUTTON IF FREE/NULL */}
              {!isPaidUser && (
                <button 
                    onClick={() => { setShowPricing(true); setMobileMenuOpen(false); }}
                    className="block w-full text-left px-5 py-4 rounded-2xl font-bold text-base text-blue-600 hover:bg-blue-50 transition-all"
                >
                    💎 View Pricing
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* 🔥 PRICING MODAL */}
      {showPricing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md z-0 animate-in fade-in duration-300" 
            onClick={() => setShowPricing(false)}
          ></div>

          <div className="relative bg-white w-full max-w-5xl h-auto max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-300">
            <div className="pt-8 pb-4 px-8 flex flex-col items-center border-b border-gray-50 bg-white z-20 relative">
              <button 
                onClick={() => setShowPricing(false)}
                className="absolute top-8 right-8 w-10 h-10 rounded-full bg-gray-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all font-bold text-lg cursor-pointer"
              >
                ✕
              </button>

              {paymentStep === "plans" ? (
                <>
                  <h3 className="text-3xl font-black text-slate-900 mb-2">Choose your Plan</h3>
                  
                  {/* 🔥 ROLE LOCK LOGIC */}
                  {!user ? (
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl relative mt-2">
                        <div 
                          className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-in-out ${
                            billingRole === 'student' ? 'left-1.5' : 'left-[calc(50%+3px)]'
                          }`}
                        ></div>
                        <button onClick={() => setBillingRole("student")} className={`relative z-10 px-8 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 cursor-pointer ${billingRole === 'student' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>🎓 For Students</button>
                        <button onClick={() => setBillingRole("recruiter")} className={`relative z-10 px-8 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 cursor-pointer ${billingRole === 'recruiter' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>💼 For Recruiters</button>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-1 rounded-full mt-2 uppercase tracking-wide">
                        Showing {billingRole} Plans
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-black text-slate-900 mb-2">Billing Details</h3>
                  <button onClick={() => setPaymentStep("plans")} className="text-xs font-bold text-slate-400 hover:text-slate-600 mb-2 cursor-pointer">← Back to Plans</button>
                </>
              )}
            </div>

            <div key={paymentStep} ref={modalScrollRef} className="flex-1 overflow-y-auto p-8 bg-slate-50/50 relative z-10">
              {paymentStep === "plans" && (
                <>
                  {billingRole === 'student' && (
                    <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto h-full items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <PricingCard 
                        title="3-Trial Starter" 
                        price="0" 
                        features={["3 Free AI Resume Scans", "Basic Feature Access", "Standard Support", "Manual Job Search"]} 
                        onSelect={() => handlePlanSelect({ title: "Student Starter", price: 0 })}
                      />
                      <PricingCard 
                        title="Pro Career" 
                        price="49" 
                        highlight={true}
                        features={["Unlimited Job Matches", "AI Resume Optimization", "Priority Application", "Skill Gap Analysis", "GitHub Portfolio Review"]} 
                        onSelect={() => handlePlanSelect({ title: "Pro Career", price: 49 })}
                      />
                    </div>
                  )}

                  {billingRole === 'recruiter' && (
                    <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto h-full items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <PricingCard 
                        title="3-Trial Hiring" 
                        price="0" 
                        features={["Post 3 Free Jobs", "3 AI Candidate Scans", "Basic Feature Access", "Manual Screening"]} 
                        onSelect={() => handlePlanSelect({ title: "Basic Hiring", price: 0 })}
                      />
                      <PricingCard 
                        title="Recruiter Suite" 
                        price="299" 
                        highlight={true}
                        features={["Post Unlimited Jobs", "AI Candidate Ranking", "Fraud Protection", "GitHub Code Analysis", "Bulk Email Integration"]} 
                        onSelect={() => handlePlanSelect({ title: "Recruiter Suite", price: 299 })}
                      />
                    </div>
                  )}
                </>
              )}

              {paymentStep === "billing" && (
                <div className="max-w-md mx-auto bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 animate-in zoom-in-95 relative z-20">
                    <form onSubmit={handlePayment} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Full Name</label>
                        <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-slate-50 font-semibold text-gray-700" value={billingInfo.name} onChange={e => setBillingInfo({...billingInfo, name: e.target.value})} placeholder="e.g. Krish Kumar" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Email Address</label>
                        <input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-slate-50 font-semibold text-gray-700" value={billingInfo.email} onChange={e => setBillingInfo({...billingInfo, email: e.target.value})} placeholder="e.g. krish@example.com" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Phone Number</label>
                        <input type="tel" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-slate-50 font-semibold text-gray-700" value={billingInfo.phone} onChange={e => setBillingInfo({...billingInfo, phone: e.target.value})} placeholder="e.g. 9876543210" />
                      </div>
                      <div className="pt-4">
                        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] transition-all cursor-pointer relative z-50">
                          Pay ₹{selectedPlan?.price} Now
                        </button>
                        <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">Secured by Cashfree • 100% Safe</p>
                      </div>
                    </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- SUB-COMPONENTS ---
const NavLink = ({ to, active, label }) => (
  <Link 
    to={to} 
    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
      active 
        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 transform scale-105" 
        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
    }`}
  >
    {label}
  </Link>
);

const DropdownItem = ({ to, icon, label, sub, onClick, active }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center gap-4 px-4 py-3 rounded-[1.5rem] transition-all duration-200 group ${
      active ? "bg-[#0055FF]/5 hover:bg-[#0055FF]/10" : "hover:bg-slate-50"
    }`}
  >
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition-transform group-hover:scale-110 ${active ? "bg-[#0055FF]/10 text-[#0055FF]" : "bg-slate-100 text-slate-500"}`}>
      {icon}
    </div>
    <div>
      <p className={`text-sm font-bold ${active ? "text-[#0055FF]" : "text-slate-800"}`}>{label}</p>
      <p className="text-[11px] font-semibold text-slate-400">{sub}</p>
    </div>
  </Link>
);

const MobileLink = ({ to, label, onClick, active }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`block w-full px-5 py-4 rounded-2xl font-bold text-base transition-all ${
      active 
      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
      : "text-slate-600 hover:bg-slate-50"
    }`}
  >
    {label}
  </Link>
);

function PricingCard({ title, price, features, highlight = false, onSelect }) {
  return (
    <div className={`relative p-8 rounded-[2rem] border h-full flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] ${highlight ? 'bg-white border-blue-200 shadow-2xl shadow-blue-100 ring-4 ring-blue-50' : 'bg-white border-gray-100 shadow-lg'}`}>
      
      {highlight && <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">Most Popular</span>}
      
      <div>
        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">{title}</h4>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-black text-slate-900">₹{price}</span>
          {price !== "0" && <span className="text-slate-400 font-bold">/month</span>}
        </div>
        <ul className="space-y-4 mb-8">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-600">
              <span className={`mt-0.5 min-w-[1.25rem] h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${highlight ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
      
      <button 
        type="button" 
        onClick={(e) => {
            e.stopPropagation(); 
            onSelect();
        }}
        className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer relative z-50 ${highlight ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
      >
        {price === "0" ? "Get Started" : "Select Plan"}
      </button>
    </div>
  )
}