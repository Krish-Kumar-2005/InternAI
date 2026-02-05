import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { supabase } from "../services/supabaseClient";
import CandidateTable from "../components/CandidateTable";
import PipelineView from "../components/PipelineView"; 
import "./RecruiterDashboard.css";
import ChatWidget from "../components/ChatWidget"; 

// --- 🎨 ANDROID 16 STYLE FLUID LOADER ---
const SmartSplashLoader = ({ onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(onComplete, 600); 
    }, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/30 backdrop-blur-xl transition-opacity duration-700 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <style>{`
        @keyframes android-rotate { 100% { transform: rotate(360deg); } }
        @keyframes android-dash {
          0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 89, 200; stroke-dashoffset: -35px; }
          100% { stroke-dasharray: 89, 200; stroke-dashoffset: -124px; }
        }
        .android-loader-svg { animation: android-rotate 2s linear infinite; transform-origin: center; }
        .android-loader-circle { stroke: #2563eb; stroke-dasharray: 80, 200; stroke-dashoffset: 0; animation: android-dash 1.5s ease-in-out infinite; stroke-linecap: round; }
      `}</style>
      <div className="relative w-20 h-20 mb-8">
        <svg className="android-loader-svg w-full h-full" viewBox="25 25 50 50">
          <circle className="android-loader-circle" cx="50" cy="50" r="20" fill="none" strokeWidth="4" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-slate-800 tracking-widest uppercase animate-pulse">Syncing Workspace...</h2>
    </div>
  );
};

// --- SKELETONS ---
const SkeletonCard = () => (
  <div className="p-4 rounded-2xl border border-slate-100 bg-white space-y-3 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
      <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
    </div>
    <div className="h-3 bg-slate-200 rounded w-1/4"></div>
    <div className="flex gap-2 mt-2">
      <div className="h-6 bg-slate-200 rounded w-16"></div>
      <div className="h-6 bg-slate-200 rounded w-16"></div>
    </div>
  </div>
);

const SkeletonRow = () => (
  <div className="p-6 rounded-2xl border border-slate-100 bg-white flex items-center justify-between animate-pulse mb-4">
    <div className="flex items-center gap-4 w-full">
      <div className="w-12 h-12 rounded-full bg-slate-200"></div>
      <div className="space-y-2 flex-1 max-w-sm">
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
      </div>
    </div>
    <div className="h-8 w-16 bg-slate-200 rounded"></div>
  </div>
);

// 🔥 HELPER: Auto-detect GitHub links
const getGithubLink = (text) => {
  if (!text) return null;
  const match = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?/i);
  if (!match) return null;
  let url = match[0];
  if (!url.startsWith("http")) url = `https://${url}`;
  return url;
};

// 🔥 HELPER: Advanced Skill Gap Calculator
const calculateSkillGaps = (jd, resume) => {
  if (!jd || !resume) return ["Pending Analysis"];
  
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
  
  return gaps;
};

export default function RecruiterDashboard() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [showSplash, setShowSplash] = useState(false);
  
  // 🔥 Access Loading State
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);

  // --- POST JOB STATE ---
  const [showPostModal, setShowPostModal] = useState(false);
  const [newJob, setNewJob] = useState({ title: "", company: "TechCorp", location: "Remote", description: "" });
  const [posting, setPosting] = useState(false);

  // --- PIPELINE & SHORTLIST STATE ---
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [pipelineApplicants, setPipelineApplicants] = useState([]);
  const [analyzingPipeline, setAnalyzingPipeline] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  
  const [jobDesc, setJobDesc] = useState("");
  const [files, setFiles] = useState([]);
  const [shortlistResult, setShortlistResult] = useState(null);
  const [loadingShortlist, setLoadingShortlist] = useState(false);

  // --- CANDIDATE REVIEW STATE ---
  const [reviewCandidate, setReviewCandidate] = useState(null);
  const [skillGaps, setSkillGaps] = useState([]); 
  const [aiQuestions, setAiQuestions] = useState("");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);

  const [userId, setUserId] = useState(null);

  // --- 1️⃣ ACCESS CHECK & INIT (Replaces old useEffect) ---
  useEffect(() => {
    const initDashboard = async () => {
      // 1. Check Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth";
        return;
      }

      // 2. Check Plan Status in DB
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_status")
        .eq("id", user.id)
        .single();

      // If plan is NOT active, deny access
      if (profile?.plan_status !== "active") {
        alert("⚠️ Access Denied: Please upgrade to a Recruiter Plan to access the Dashboard.");
        window.location.href = "/"; // Redirect to home (Navbar shows Pricing)
        return;
      }

      // 3. Plan Active! Proceed.
      setUserId(user.id);
      setIsLoadingAccess(false);

      // 4. Show Splash (Only once per session)
      const hasSeenSplash = sessionStorage.getItem("recruiter_splash_shown");
      if (!hasSeenSplash) setShowSplash(true);

      // 5. Load Data
      fetchJobs(user.id);
    };

    initDashboard();
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem("recruiter_splash_shown", "true");
  }, []);

  // 1. Fetch JOBS
  const fetchJobs = async (uid) => {
    setLoadingJobs(true);
    try {
      const res = await api.get("/job/all");
      const data = res.data;

      const formatted = (data || []).map(job => ({
        ...job,
        applications_count: job.applications?.[0]?.count || 0
      }));

      setJobs(formatted);
      
      if (formatted.length > 0) {
        loadPipeline(formatted[0]);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoadingJobs(false);
    }
  };

  // 2. Load Applicants
  const loadPipeline = async (job) => {
    setSelectedJob(job);
    setAnalyzingPipeline(true);
    setPipelineApplicants([]);

    try {
      const res = await api.get(`/job/${job.id}/applications`);
      const data = res.data;

      const formatted = (data || []).map(app => {
         let gaps = [];
         if ((app.match_score || 0) < 95) {
             gaps = calculateSkillGaps(job.description, app.resume_text || "");
             if (gaps.length === 0 && app.match_score < 50) gaps = ["Skills Mismatch"];
         }

         return {
            ...app,
            candidate_name: app.candidate_name || "Unknown Candidate",
            github_link: app.github_link || getGithubLink(app.resume_text || ""),
            category: app.category || "General",
            missing_skills: gaps,
            status: app.status || "Pending",
            match_score: app.match_score || 0
         };
      });

      setPipelineApplicants(formatted);
    } catch (err) {
      console.error("Pipeline load failed:", err);
    } finally {
      setAnalyzingPipeline(false);
    }
  };

  // --- ACTIONS ---

  const handlePostJob = async () => {
    if (!newJob.title || !newJob.description) {
      alert("Please fill in at least Title and Description.");
      return;
    }
    setPosting(true);
    try {
      await api.post("/job/post", {
        ...newJob,
        recruiter_id: userId || null 
      });
      alert("Job Posted Successfully! 🚀");
      setShowPostModal(false);
      setNewJob({ title: "", company: "TechCorp", location: "Remote", description: "" });
      fetchJobs(userId);
    } catch (err) {
      console.error(err);
      alert("Failed to post job.");
    } finally {
      setPosting(false);
    }
  };

  // 🔥 FEATURE 1: AUTO SHORTLIST LOGIC
  const handleAutoShortlist = async () => {
    const threshold = 50; // 75% Match
    
    // Select ALL high-scoring candidates (even if already shortlisted, to sync)
    const candidatesToShortlist = pipelineApplicants.filter(
        app => Number(app.match_score) >= threshold 
    );

    if (candidatesToShortlist.length === 0) {
        alert("⚠️ No candidates found with a match score above 50%.");
        return;
    }

    if (!window.confirm(`🤖 AI Insight:\nFound ${candidatesToShortlist.length} high-match candidates (>75%).\n\nShortlist them automatically?`)) {
        return;
    }

    // Optimistic Update
    const updatedList = pipelineApplicants.map(app => 
        (Number(app.match_score) >= threshold) ? { ...app, status: 'Shortlisted' } : app
    );
    setPipelineApplicants(updatedList);

    try {
        await Promise.all(candidatesToShortlist.map(candidate => 
            api.post('/application/update-status', { 
                application_id: candidate.id, 
                status: 'Shortlisted' 
            })
        ));
        alert(`✅ Successfully shortlisted ${candidatesToShortlist.length} candidates!`);
    } catch (err) {
        console.error("Auto shortlist failed", err);
    }
  };

  // 🔥 FEATURE 2: INDIVIDUAL SHORTLIST (TOGGLE LOGIC)
  const handleShortlistCandidate = async (candidate) => {
    const isShortlisted = candidate.status === 'Shortlisted';
    const newStatus = isShortlisted ? 'Pending' : 'Shortlisted';

    // Safety Check: Low Score Warning
    if (!isShortlisted && candidate.match_score < 60) {
        const confirmLowScore = window.confirm(
            `⚠️ AI Warning:\n${candidate.candidate_name} has a low match score (${candidate.match_score}%).\n\nAre you sure you want to shortlist?`
        );
        if (!confirmLowScore) return;
    }

    // Safety Check: Removal Warning
    if (isShortlisted) {
        const confirmRemove = window.confirm(`Remove ${candidate.candidate_name} from the shortlist?`);
        if (!confirmRemove) return;
    }

    // Optimistic Update
    setPipelineApplicants(prev => prev.map(app => 
        app.id === candidate.id ? { ...app, status: newStatus } : app
    ));

    try {
        await api.post('/application/update-status', { 
            application_id: candidate.id, 
            status: newStatus 
        });
    } catch (err) {
        console.error("Status update failed", err);
        alert("Failed to update status.");
    }
  };

  const handleShortlist = async () => {
    if (!jobDesc || files.length === 0) return alert("Provide JD & Resume");
    setLoadingShortlist(true);
    const formData = new FormData();
    formData.append("job_description", jobDesc);
    files.forEach(file => formData.append("resumes", file));
    try {
      const res = await api.post("/recruiter/shortlist", formData);
      
      const enrichedData = {
        ...res.data,
        shortlisted: (res.data.shortlisted || []).map(candidate => {
          let gaps = candidate.missing_skills || [];
          const score = candidate.match_score || 0;

          if (score < 95) {
             const calculatedGaps = calculateSkillGaps(jobDesc, candidate.resume_text || "");
             if (gaps.length === 0) gaps = calculatedGaps;
             if (gaps.length === 0 && score < 50) gaps = ["Content Mismatch"];
          }

          return {
             ...candidate,
             category: candidate.category || "Parsed Resume",
             missing_skills: gaps,
             github_link: candidate.github_link || getGithubLink(candidate.resume_text || "")
          };
        })
      };

      setShortlistResult(enrichedData);
    } catch { alert("Analysis failed."); } finally { setLoadingShortlist(false); }
  };

  const openReviewModal = (candidate) => {
    setReviewCandidate(candidate);
    let gaps = candidate.missing_skills;
    if (!gaps || gaps.length === 0) {
         gaps = calculateSkillGaps(selectedJob?.description || jobDesc, candidate.resume_text);
    }
    setSkillGaps(gaps);
    setAiQuestions("");
    setGeneratedEmail("");
  };

  const handleGenerateQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const res = await api.post("/job/recruiter/generate-questions", {
        resume_text: reviewCandidate.resume_text || "No resume text available",
        job_description: selectedJob.description
      });
      setAiQuestions(res.data.questions);
    } catch (err) { alert("AI Failed to generate questions."); } finally { setLoadingQuestions(false); }
  };

  const handleGenerateEmail = async (action) => {
    setLoadingEmail(true);
    try {

      const skillsToMention = skillGaps && skillGaps.length > 0 
        ? skillGaps 
        : ["specific technical requirements"];

      const res = await api.post("/job/recruiter/generate-email", {
        candidate_name: reviewCandidate.candidate_name,
        job_title: selectedJob.title,
        action: action,
        missing_skills: action === "reject" ? skillsToMention : [] // Only send skills if rejecting
      });
      setGeneratedEmail(res.data.email_body);
    } catch (err) { alert("AI Failed to generate email."); } finally { setLoadingEmail(false); }
  };

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : "?";

  // 🔥 BLOCK RENDER UNTIL ACCESS IS VERIFIED
  if (isLoadingAccess) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="font-bold text-slate-500 animate-pulse">Verifying Recruiter Access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans text-slate-900 relative">
      {showSplash && <SmartSplashLoader onComplete={handleSplashComplete} />}

      <div className="max-w-[1600px] mx-auto px-6 pt-24">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-slate-200 pb-8 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Recruiter <span className="text-blue-600">Hub</span>
            </h1>
            <p className="text-slate-500 font-medium mt-2">
              Manage roles, track candidates, and automate shortlisting.
            </p>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button 
                  onClick={() => setActiveTab("pipeline")}
                  className={`px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                    activeTab === "pipeline" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  🚀 Pipeline
                </button>
                <button 
                  onClick={() => setActiveTab("shortlist")}
                  className={`px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                    activeTab === "shortlist" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  ⚡ AI Shortlist
                </button>
             </div>
             
             <button 
                onClick={() => setShowPostModal(true)}
                className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all"
                title="Post New Job"
             >
                <span className="text-2xl font-light">＋</span>
             </button>
          </div>
        </div>

        {/* POST JOB MODAL */}
        {showPostModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-8 relative">
              <button onClick={() => setShowPostModal(false)} className="absolute top-6 right-6 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold hover:bg-red-50 hover:text-red-500 transition-all">✕</button>
              <h2 className="text-2xl font-black text-slate-800 mb-6">Post a New Role</h2>
              <div className="space-y-4">
                <input className="input-field w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" placeholder="Job Title" value={newJob.title} onChange={(e) => setNewJob({...newJob, title: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                   <input className="input-field w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" placeholder="Location" value={newJob.location} onChange={(e) => setNewJob({...newJob, location: e.target.value})} />
                   <input className="input-field w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold" placeholder="Company" value={newJob.company} onChange={(e) => setNewJob({...newJob, company: e.target.value})} />
                </div>
                <textarea className="input-field w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium h-32 resize-none" placeholder="Job Description..." value={newJob.description} onChange={(e) => setNewJob({...newJob, description: e.target.value})} />
                <button onClick={handlePostJob} disabled={posting} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50">
                  {posting ? "Posting..." : "🚀 Publish Job"}
                </button>
              </div>
            </div>
          </div>
        )}

    {/* CANDIDATE REVIEW MODAL */}
        {reviewCandidate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
              
              {/* HEADER: Candidate Info & Score */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-black">{getInitials(reviewCandidate.candidate_name)}</div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-slate-800">{reviewCandidate.candidate_name}</h2>
                            {reviewCandidate.category && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${reviewCandidate.category.toLowerCase().includes("data") ? "bg-purple-50 text-purple-600 border-purple-100" : reviewCandidate.category.toLowerCase().includes("web") ? "bg-pink-50 text-pink-600 border-pink-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}>{reviewCandidate.category}</span>}
                            {reviewCandidate.github_link && (
                                <a href={reviewCandidate.github_link} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-black transition-colors" title="View GitHub Projects">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                </a>
                            )}
                        </div>
                        <p className="text-sm font-bold text-slate-400">{reviewCandidate.email}</p>
                    </div>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                    <div className="text-right"><div className="text-3xl font-black text-blue-600">{reviewCandidate.match_score}%</div><p className="text-xs font-bold text-slate-400 uppercase">Match Score</p></div>
                    {skillGaps.length > 0 ? (
                        <div className="flex gap-1 mt-1 justify-end flex-wrap max-w-[200px]">
                            {skillGaps.map((skill, i) => (
                                <span key={i} className="px-2 py-0.5 bg-red-50 text-red-500 border border-red-100 rounded text-[10px] font-bold uppercase">{skill}</span>
                            ))}
                        </div>
                    ) : <span className="text-[10px] text-green-500 font-bold">No Major Gaps</span>}
                 </div>
              </div>

              {/* BODY: Resume & Actions */}
              <div className="flex flex-1 overflow-hidden">
                 
                 {/* LEFT COLUMN: Resume */}
                 <div className="w-1/2 p-8 overflow-y-auto border-r border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Resume Summary</h4>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">{reviewCandidate.resume_text ? reviewCandidate.resume_text.substring(0, 500) + "..." : "No resume text available."}</p>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Cover Letter</h4>
                    <p className="text-slate-600 text-sm leading-relaxed italic">"{reviewCandidate.cover_letter || "No cover letter provided."}"</p>
                 </div>

                 {/* RIGHT COLUMN: Tools */}
                 <div className="w-1/2 p-8 overflow-y-auto bg-slate-50/50">
                    
                    {/* AI Prep Section */}
                    <div className="mb-8">
                       <div className="flex justify-between items-center mb-4"><h4 className="text-blue-600 font-bold">🤖 AI Interview Prep</h4><button onClick={handleGenerateQuestions} disabled={loadingQuestions} className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-lg font-bold hover:bg-blue-200">{loadingQuestions ? "Generating..." : "Generate Questions"}</button></div>
                       {aiQuestions ? <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap shadow-sm">{aiQuestions}</div> : <div className="text-xs text-slate-400 italic">Click generate to get custom questions based on this resume.</div>}
                    </div>

                    {/* UPDATED: Quick Actions (Internal Send) */}
                    <div>
                       <h4 className="text-slate-600 font-bold mb-4">📧 Quick Actions</h4>
                       
                       <div className="flex gap-2 mb-4">
                          <button onClick={() => handleGenerateEmail("shortlist")} className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors">✅ Draft Invite</button>
                          <button onClick={() => handleGenerateEmail("reject")} className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors">❌ Draft Rejection</button>
                       </div>

                       {generatedEmail && (
                         <div className="animate-fade-in">
                            <textarea 
                                className="w-full h-40 p-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 resize-none font-medium text-slate-600" 
                                value={generatedEmail} 
                                onChange={(e) => setGeneratedEmail(e.target.value)} 
                            />
                            
                            <div className="flex gap-3 justify-end">
                                {/* Copy Button */}
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedEmail);
                                        alert("Email copied to clipboard!");
                                    }}
                                    className="px-4 py-2 text-slate-500 font-bold text-xs hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    📋 Copy
                                </button>
                                
                                {/* Internal Send Button */}
                                <button 
                                    onClick={async () => {
                                        if (!reviewCandidate.id) return alert("Error: Candidate ID missing.");
                                        try {
                                            // 1. Update Application Status
                                            await api.post('/application/update-status', { 
                                                application_id: reviewCandidate.id, 
                                                status: generatedEmail.includes("invite") ? "Shortlisted" : "Rejected"
                                            });

                                            // 2. Send Message to Internal Database (Student Tracker)
                                            const { error } = await supabase.from('messages').insert({
                                                sender_id: userId,
                                                receiver_id: reviewCandidate.user_id, // Ensure this exists on candidate object
                                                job_id: selectedJob.id,
                                                content: generatedEmail,
                                                type: 'email_update'
                                            });

                                            if (error) throw error;
                                            alert("✅ Message sent to Student Tracker!");
                                            setReviewCandidate(null); 
                                        } catch (err) {
                                            console.error("Send failed:", err);
                                            alert("Failed to send message internally.");
                                        }
                                    }}
                                    className="px-6 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    🚀 Send to Student Tracker
                                </button>
                            </div>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-slate-100 flex justify-end">
                  <button onClick={() => setReviewCandidate(null)} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black">Close Review</button>
              </div>
            </div>
          </div>
        )}
        {/* 🔥 PIPELINE TAB REPLACED WITH COMPONENT */}
        {activeTab === "pipeline" && (
          <PipelineView 
            jobs={jobs}
            loadingJobs={loadingJobs}
            selectedJob={selectedJob}
            loadPipeline={loadPipeline}
            pipelineApplicants={pipelineApplicants}
            analyzingPipeline={analyzingPipeline}
            openReviewModal={openReviewModal}
            onShortlistCandidate={handleShortlistCandidate} // Individual Toggle
            onAutoShortlist={handleAutoShortlist}           // Bulk Sync
          />
        )}

        {/* SHORTLIST TAB */}
        {activeTab === "shortlist" && (
           <div className="grid lg:grid-cols-3 gap-8 animate-fade-in">
             <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><label className="block text-xs font-bold text-slate-400 uppercase mb-3">Paste JD</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm h-40" value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} /></div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><label className="block text-xs font-bold text-slate-400 uppercase mb-3">Upload Resumes</label><input type="file" multiple onChange={(e) => setFiles([...e.target.files])} /></div>
                <button onClick={handleShortlist} disabled={loadingShortlist} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 shadow-lg">{loadingShortlist ? "Analyzing..." : "✨ Start Shortlisting"}</button>
             </div>
             <div className="lg:col-span-2">
                {shortlistResult ? <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden"><div className="p-6 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-800">Results</h3></div><div className="p-2"><CandidateTable data={shortlistResult.shortlisted} /></div></div> : <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200 text-center p-10"><div className="text-5xl mb-4 grayscale opacity-20">🤖</div><p className="text-slate-300 font-bold">Ready to Shortlist</p></div>}
             </div>
           </div>
        )}
      </div>
      <ChatWidget />
    </div>
  );
}
