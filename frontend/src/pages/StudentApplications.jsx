import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { Link, useNavigate } from "react-router-dom"; // ✅ Added useNavigate
import api from "../services/api"; 

// --- CUSTOM CSS FOR ANIMATIONS ---
const animationStyles = `
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes zoom-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes pulse-ring {
    0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
    100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
  }
  .animate-card-entry {
    animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .animate-modal {
    animation: zoom-in 0.2s ease-out forwards;
  }
  .animate-pulse-ring {
    animation: pulse-ring 2s infinite;
  }
  .scrollbar-hide::-webkit-scrollbar {
      display: none;
  }
  .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
  }

  /* 🔥 CARD UI CSS (Dull Moose Style) */
  .uiverse-card {
    margin: auto;
    width: 100%;
    background-color: #fefefe;
    border-radius: 1rem;
    padding: 0.5rem;
    color: #141417;
    border: 1px solid #f3f4f6;
    box-shadow: 0 4px 20px -5px rgba(0,0,0,0.1);
  }
  .uiverse-card__hero {
    background-color: #fef4e2;
    border-radius: 0.5rem 0.5rem 0 0;
    padding: 1.5rem;
    font-size: 0.875rem;
  }
  .uiverse-card__hero .uiverse-card__job-title {
    margin: 1.5rem 0;
    font-size: 1.75rem;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }
  .uiverse-card__hero-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    color: #9ca3af;
  }
  .uiverse-card__footer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    font-weight: 700;
    font-size: 0.875rem;
  }
  @media (min-width: 340px) {
    .uiverse-card__footer {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }
  .uiverse-card__btn {
    width: 100%;
    font-weight: 600;
    border: none;
    display: block;
    cursor: pointer;
    text-align: center;
    padding: 0.75rem 1.5rem;
    border-radius: 1rem;
    background-color: #141417;
    color: #fff;
    font-size: 0.875rem;
    transition: transform 0.2s ease;
  }
  .uiverse-card__btn:hover {
    transform: scale(1.02);
  }
  @media (min-width: 340px) {
    .uiverse-card__btn {
      width: max-content;
    }
  }
`;

// --- HELPER LOGIC ---
const getStatusStep = (status) => {
  const s = status?.toLowerCase() || "";
  if (s.includes("hired") || s.includes("offer")) return 4;
  if (s.includes("interview")) return 3;
  if (s.includes("shortlist")) return 2;
  return 1; 
};

const getStatusColor = (status) => {
  const s = status?.toLowerCase() || "";
  if (s.includes("reject")) return 'bg-rose-50 text-rose-600 border-rose-100';
  if (s.includes("offer") || s.includes("hired")) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (s.includes("interview")) return 'bg-amber-50 text-amber-600 border-amber-100';
  if (s.includes("shortlist")) return 'bg-violet-50 text-violet-600 border-violet-100';
  return 'bg-blue-50 text-blue-600 border-blue-100';
};

const calculateSkillGaps = (jd, resume) => {
  if (!jd || !resume) return ["General Skills"];
  const commonTech = [
    "python", "django", "flask", "fastapi", "pandas", "numpy", "scikit-learn", "pytorch", "tensorflow", "keras",
    "react", "react.js", "next.js", "node", "node.js", "express", "javascript", "typescript", "html", "css", "tailwind",
    "java", "spring", "springboot", "c++", "c#", ".net", "php", "laravel", "ruby", "rails",
    "sql", "mysql", "postgresql", "mongodb", "redis", "firebase", "supabase", "aws", "azure", "gcp", "docker", "kubernetes",
    "git", "github", "ci/cd", "jenkins", "linux", "agile", "scrum", "rest api", "graphql"
  ];
  const jdLower = jd.toLowerCase();
  const resumeLower = resume.toLowerCase();
  const requiredSkills = commonTech.filter(tech => {
    const escapedTech = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
    const regex = new RegExp(`\\b${escapedTech}\\b`, 'i');
    return regex.test(jdLower);
  });
  const gaps = requiredSkills.filter(tech => {
    const escapedTech = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTech}\\b`, 'i');
    return !regex.test(resumeLower);
  });
  return gaps.length > 0 ? gaps : ["Advanced Concepts"];
};

// --- COMPONENTS ---

const ApplicationModal = ({ app, onClose }) => {
  const navigate = useNavigate(); // 🔥 Hook for navigation
  const [feedback, setFeedback] = useState(null);
  
  // Project Suggestion States
  const [suggestedProject, setSuggestedProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false); // 🔥 Loading state for save

  const isRejected = app.status?.toLowerCase().includes("reject");
  const missingSkills = calculateSkillGaps(app.jobs?.description, app.resume_text);

  useEffect(() => {
    const fetchFeedback = async () => {
        if (!app?.job_id) return;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('job_id', app.job_id)
            .eq('receiver_id', user.id)
            .eq('type', 'email_update') 
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        setFeedback(data);
    };
    fetchFeedback();
  }, [app]);

  const handleGenerateProject = async () => {
    setLoadingProject(true);
    try {
      const res = await api.post("/job/recommend-project", {
        missing_skills: missingSkills,
        current_role: "Student"
      });
      setSuggestedProject(res.data);
    } catch (err) {
      alert("AI is busy. Try again.");
    } finally {
      setLoadingProject(false);
    }
  };

  // 🔥 NEW: Save Project, Add Checkpoints, & Navigate
  const handleStartBuilding = async () => {
    if (!suggestedProject) return;
    setSavingProject(true);

    // 1. Define standard checkpoints (Tasks)
    const dummyTasks = [
      { text: "Initialize Git repository & set up project structure", completed: false },
      { text: "Design database schema & configure Supabase", completed: false },
      { text: "Build core backend API endpoints", completed: false },
      { text: "Develop frontend UI components", completed: false },
      { text: "Integrate AI/ML model (if applicable)", completed: false },
      { text: "Final testing & Deployment", completed: false }
    ];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          alert("Please login first.");
          return;
      }

      // 2. Insert into Supabase
      const { error } = await supabase.from('student_projects').insert([{
        user_id: user.id,
        title: suggestedProject.title,
        description: suggestedProject.description,
        tech_stack: Array.isArray(suggestedProject.tech_stack) 
            ? suggestedProject.tech_stack.join(', ') 
            : suggestedProject.tech_stack,
        tasks: dummyTasks,
        progress: 0,
        status: 'In Progress'
      }]);

      if (error) throw error;

      // 3. Navigate
      alert("🚀 Project Created! Redirecting to Workspace...");
      navigate("/my-projects");

    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to create project.");
    } finally {
      setSavingProject(false);
    }
  };

  if (!app) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-modal max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900">{app.jobs?.title}</h2>
            <p className="text-slate-500 font-medium text-sm mt-1">{app.jobs?.company} • {app.jobs?.location}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors font-bold">✕</button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Status & Skills */}
          <div className="flex gap-4">
            <div className="flex-1 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide border ${getStatusColor(app.status)}`}>
                {app.status}
              </span>
            </div>

            {isRejected ? (
                <div className="flex-1 p-4 rounded-2xl bg-orange-50 border border-orange-100 relative group overflow-hidden">
                   <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">Missing Skills</p>
                   <div className="flex flex-wrap gap-1">
                      {missingSkills.slice(0, 3).map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-orange-200 text-orange-600 text-[10px] font-bold rounded shadow-sm">
                             {skill}
                          </span>
                      ))}
                      {missingSkills.length > 3 && <span className="text-[10px] text-orange-400 font-bold self-center">+{missingSkills.length - 3}</span>}
                   </div>
                   
                   <button 
                     onClick={handleGenerateProject}
                     disabled={loadingProject || suggestedProject}
                     className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm text-orange-500 hover:scale-110 hover:shadow-md transition-all z-10"
                     title="Generate Learning Project"
                   >
                     {loadingProject ? <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div> : "💡"}
                   </button>
                </div>
            ) : (
                <div className="flex-1 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AI Match Score</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-black ${app.match_score >= 80 ? "text-emerald-500" : app.match_score >= 50 ? "text-amber-500" : "text-rose-500"}`}>
                      {app.match_score}%
                    </span>
                    <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${app.match_score >= 80 ? "bg-emerald-500" : app.match_score >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${app.match_score}%` }}></div>
                    </div>
                  </div>
                </div>
            )}
          </div>

          {/* 🔥 UPDATED CARD UI WITH FUNCTIONAL BUTTON */}
          {suggestedProject && (
             <div className="animate-fade-in-up uiverse-card">
                <div className="uiverse-card__hero">
                   <div className="uiverse-card__hero-header">
                      <span>🚀 Recommended</span>
                      <span>AI Generated</span>
                   </div>
                   
                   <h2 className="uiverse-card__job-title">{suggestedProject.title}</h2>
                   
                   <p className="text-slate-700 leading-relaxed text-sm font-medium mb-4">
                     {suggestedProject.description}
                   </p>

                   {/* Tech Stack Chips */}
                   <div className="flex flex-wrap gap-2 mt-4">
                      {Array.isArray(suggestedProject.tech_stack) 
                         ? suggestedProject.tech_stack.map((tech, i) => (
                             <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600">
                               {tech}
                             </span>
                           ))
                         : typeof suggestedProject.tech_stack === 'string'
                           ? suggestedProject.tech_stack.split(',').map((tech, i) => (
                               <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600">
                                 {tech.trim()}
                               </span>
                             ))
                           : <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600">General Tech</span>
                      }
                   </div>
                </div>

                <div className="uiverse-card__footer">
                   <div className="text-xs text-slate-400 font-medium">Build this to improve skills</div>
                   <button 
                     onClick={handleStartBuilding} 
                     disabled={savingProject}
                     className="uiverse-card__btn"
                   >
                     {savingProject ? "Creating Workspace..." : "Start Building"}
                   </button>
                </div>
             </div>
          )}

          {/* RECRUITER FEEDBACK */}
          {feedback && (
             <div className="animate-fade-in-up">
                <h4 className="text-sm font-black text-slate-900 mb-2 flex items-center gap-2">
                    💬 Recruiter Feedback
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">NEW</span>
                </h4>
                <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {feedback.content}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-right">
                    Received: {new Date(feedback.created_at).toLocaleDateString()}
                </p>
             </div>
          )}

          {/* Resume Snippet */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Resume Data</h4>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500 font-mono overflow-hidden whitespace-pre-wrap max-h-32">
              {app.resume_text ? app.resume_text.substring(0, 300) + "..." : "No resume text available."}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-white hover:shadow-sm transition-all">Close</button>
        </div>
      </div>
    </div>
  );
};

// 2. Modern Step Tracker
const ApplicationTracker = ({ status }) => {
  const currentStep = getStatusStep(status);
  const isRejected = status?.toLowerCase().includes("reject");

  const steps = [
    { label: "Applied", step: 1 },
    { label: "Shortlisted", step: 2 },
    { label: "Interview", step: 3 },
    { label: "Offer", step: 4 },
  ];

  if (isRejected) {
    return (
      <div className="mt-6 bg-rose-50/50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-3 animate-pulse">
        <span className="flex items-center justify-center w-6 h-6 bg-rose-100 rounded-full text-sm">✕</span> 
        <span>Application Status: Not Selected</span>
      </div>
    );
  }

  return (
    <div className="mt-8 relative px-2">
      {/* Connecting Line */}
      <div className="absolute top-3 left-5 right-5 h-0.5 bg-slate-100 -z-10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-500 transition-all duration-1000 ease-out rounded-full"
          style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
        ></div>
      </div>

      {/* Steps */}
      <div className="flex justify-between items-start">
        {steps.map((item) => {
          const isActive = currentStep >= item.step;
          const isCurrent = currentStep === item.step;

          return (
            <div key={item.step} className="flex flex-col items-center gap-2">
              <div className="relative">
                {/* Pulsing Ring for Current Step */}
                {isCurrent && <div className="absolute inset-0 rounded-full animate-pulse-ring"></div>}
                
                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 transition-all duration-500 z-10 bg-white ${
                    isActive 
                      ? "border-indigo-600 text-indigo-600 shadow-md scale-110" 
                      : "border-slate-200 text-slate-300"
                  }`}
                >
                  {/* FIXED TICK MARK */}
                  {isActive ? (
                    <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="font-bold">{item.step}</span>
                  )}
                </div>
              </div>
              
              <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                isActive ? "text-indigo-600" : "text-slate-300"
              }`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    if (filter === "All") {
      setFilteredApps(applications);
    } else {
      setFilteredApps(applications.filter(app => app.status === filter));
    }
  }, [filter, applications]);

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("applications")
          .select(`
            *,
            jobs (
              id,
              title,
              company,
              location,
              type,
              salary,
              description
            )
          `)
          .eq("user_id", user.id)
          .order("applied_at", { ascending: false });

        if (error) throw error;
        setApplications(data || []);
        setFilteredApps(data || []);
      }
    } catch (err) {
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-20 pt-24">
      <style>{animationStyles}</style>
      
      {selectedApp && <ApplicationModal app={selectedApp} onClose={() => setSelectedApp(null)} />}

      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 animate-card-entry" style={{ animationDelay: '0ms' }}>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-3">
              My <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Applications</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg">
              Track your journey from application to offer letter.
            </p>
          </div>
          <Link 
            to="/student-jobs" 
            className="mt-6 md:mt-0 bg-white text-slate-900 border border-slate-200 px-6 py-3 rounded-full font-bold text-sm shadow-sm hover:shadow-md hover:border-indigo-200 hover:text-indigo-600 transition-all duration-300 flex items-center gap-2 group"
          >
            <span>🔍</span> Find More Jobs
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        <div className="flex gap-2 mb-10 overflow-x-auto pb-4 scrollbar-hide animate-card-entry" style={{ animationDelay: '100ms' }}>
          {["All", "New", "Shortlisted", "Interview", "Offer", "Rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 border backdrop-blur-sm whitespace-nowrap ${
                filter === status 
                  ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20 transform scale-105" 
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-64 bg-white rounded-[2rem] border border-slate-100 shadow-sm animate-pulse"></div>
             ))}
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-slate-200 animate-card-entry">
            <div className="text-7xl mb-6 grayscale opacity-20 animate-bounce">🚀</div>
            <h3 className="text-2xl font-bold text-slate-400 mb-2">No applications found</h3>
            <p className="text-slate-400 font-medium">
              {filter === "All" ? "Your career journey starts with a single click." : `You have no applications in '${filter}' status.`}
            </p>
            {filter === "All" && (
                <Link to="/student-jobs" className="inline-block mt-8 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all">
                  Browse Open Roles
                </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredApps.map((app, index) => (
              <div 
                key={app.id} 
                className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-indigo-100 hover:-translate-y-2 transition-all duration-500 ease-out relative overflow-hidden animate-card-entry"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-bl-[100px] -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative z-10 flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors duration-300 line-clamp-1">
                      {app.jobs?.title || "Unknown Role"}
                    </h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                        {app.jobs?.location || "Remote"}
                      </span>
                      <span>•</span>
                      <span>{app.jobs?.company || "Unknown Company"}</span>
                    </p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border shadow-sm ${getStatusColor(app.status)}`}>
                    {app.status || "Applied"}
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-3 mb-8">
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Match</span>
                      <div className={`text-sm font-black ${
                          app.match_score >= 80 ? "text-emerald-500" : 
                          app.match_score >= 50 ? "text-amber-500" : "text-rose-500"
                        }`}>
                          {app.match_score}%
                        </div>
                    </div>
                    {app.jobs?.salary && (
                        <div className="text-xs font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                           {app.jobs.salary}
                        </div>
                    )}
                </div>

                <div className="relative z-10 pt-2">
                   <ApplicationTracker status={app.status} />
                </div>

                <div className="relative z-10 flex justify-between items-center mt-8 pt-6 border-t border-slate-50">
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                      Applied {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                    <button 
                      onClick={() => setSelectedApp(app)} 
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors duration-300"
                    >
                      View Details
                    </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}