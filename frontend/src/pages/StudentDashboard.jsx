import { useState, useEffect } from "react";
import api from "../services/api";
import { supabase } from "../services/supabaseClient";
import { useNavigate } from "react-router-dom"; 
import MatchScoreCard from "../components/MatchScoreCard";
import SkillGapCard from "../components/SkillGapCard";
import ChatWidget from "../components/ChatWidget"; 
import ProjectSuggestionCard from "../components/ProjectSuggestionCard"; 
import { projectSuggestions } from "../utils/projectSuggestions";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

import "../styles/StudentDashboard.css";

// --- ICONS ---
const CloudIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" opacity="0" /> 
    <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-6 h-6 text-white scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function StudentDashboard() {
  const navigate = useNavigate();
  
  const [jobDesc, setJobDesc] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  
  // 🔥 Upload Animation State: 'idle' | 'uploading' | 'success'
  const [uploadStatus, setUploadStatus] = useState("idle");

  const [aiProject, setAiProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('analysis_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error) setHistory(data);
  };

  const fetchAiProject = async (missingSkills) => {
    setLoadingProject(true);
    try {
      const res = await api.post("/job/recommend-project", {
        missing_skills: missingSkills,
        current_role: "Student"
      });
      setAiProject(res.data);
    } catch (err) {
      console.error("Failed to get project idea", err);
    } finally {
      setLoadingProject(false);
    }
  };

  const handleStartBuilding = async () => {
    if (!aiProject) return;
    
    const dummyTasks = [
      { text: "Initialize Git repository & set up project structure", completed: false },
      { text: "Design database schema & configure Supabase", completed: false },
      { text: "Build core backend API endpoints", completed: false },
      { text: "Develop frontend UI components", completed: false },
      { text: "Integrate AI/ML model integration", completed: false },
      { text: "Final testing & Deployment", completed: false }
    ];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("Please login first.");

      const { error } = await supabase.from('student_projects').insert([{
        user_id: user.id,
        title: aiProject.title,
        description: aiProject.description,
        tech_stack: aiProject.tech_stack,
        tasks: dummyTasks,
        progress: 0,
        status: 'In Progress'
      }]);

      if (error) throw error;

      alert("🚀 Project Saved! Redirecting to Workspace...");
      navigate("/my-projects");

    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save project.");
    }
  };

  const getRadarData = (matchData) => {
    if (!matchData) return [];
    const found = (matchData.found_skills || []).map((s) => ({
      skill: s,
      user: 100,
      required: 100,
    }));
    const missing = (matchData.missing_skills || []).map((s) => ({
      skill: s,
      user: 20,
      required: 100,
    }));
    return [...found, ...missing].slice(0, 8);
  };

  // 🔥 UPDATED: Upload Resume with Animation Logic
  const uploadResume = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadStatus("uploading"); // Start Animation

    try {
      const form = new FormData();
      form.append("file", file);
      
      // Artificial delay to show the nice animation (1.5s)
      const [res] = await Promise.all([
        api.post("/resume/upload", form),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]);

      setResumeText(res.data.resume_text);
      setUploadStatus("success"); // Show Tick
      
    } catch (err) {
      console.error(err);
      alert("Resume upload failed.");
      setUploadStatus("idle"); // Reset on fail
    }
  };

  const analyze = async () => {
    if (jobDesc.length < 50 || !resumeText) {
      alert("Please provide both a Job Description and a Resume.");
      return;
    }

    setLoading(true);
    setAiProject(null); 
    try {
      const [trustRes, matchRes] = await Promise.all([
        api.post("/fake/check", { description: jobDesc }),
        api.post("/match/", { resume_text: resumeText, job_description: jobDesc }),
      ]);

      setResult({
        trust: trustRes.data,
        match: matchRes.data,
      });

      if (matchRes.data.missing_skills && matchRes.data.missing_skills.length > 0) {
         fetchAiProject(matchRes.data.missing_skills);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('analysis_history').insert([{
          user_id: user.id,
          job_description: jobDesc.substring(0, 100) + "...",
          match_score: matchRes.data.match_score,
          verdict: matchRes.data.verdict,
          missing_skills: matchRes.data.missing_skills || []
        }]);
        fetchHistory();
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("AI analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#F8FAFC] pt-24 overflow-hidden flex flex-col font-sans text-gray-900 animate-page-in">
      
      {/* 🔥 INJECT CSS FOR ANIMATED BUTTONS */}
      <style>{`
        /* --- UPLOAD BUTTON (Ugly Dolphin Animation) --- */
        .upload-btn-wrapper {
          position: relative;
          width: 100%;
          height: 60px;
          border-radius: 15px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        /* State: Idle (Default) */
        .upload-btn-idle {
          width: 100%;
          height: 100%;
          background: #212121;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 800;
          transition: background 0.3s;
        }
        .upload-btn-wrapper:hover .upload-btn-idle {
          background: #000;
        }

        /* State: Uploading (Spinner) */
        .upload-btn-loading {
          width: 100%;
          height: 100%;
          background: #212121;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* State: Success (Green Tick) */
        .upload-btn-success {
          width: 100%;
          height: 100%;
          background: #22c55e; /* Green-500 */
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: white;
          font-weight: 800;
          animation: popIn 0.3s ease-out forwards;
        }
        @keyframes popIn {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        /* --- ANALYZE BUTTON (Shy Sloth) --- */
        .uiverse-analyze-btn {
          padding: 15px 25px;
          border: unset;
          border-radius: 15px;
          color: #212121;
          z-index: 1;
          background: #ffffff;
          position: relative;
          font-weight: 1000;
          font-size: 17px;
          -webkit-box-shadow: 4px 8px 19px -3px rgba(0,0,0,0.27);
          box-shadow: 4px 8px 19px -3px rgba(0,0,0,0.27);
          transition: all 250ms;
          overflow: hidden;
          cursor: pointer;
          width: 50%;
          display: flex;
          justify-content: center;
        }
        .uiverse-analyze-btn::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 0;
          border-radius: 15px;
          background-color: #212121;
          z-index: -1;
          -webkit-box-shadow: 4px 8px 19px -3px rgba(0,0,0,0.27);
          box-shadow: 4px 8px 19px -3px rgba(0,0,0,0.27);
          transition: all 250ms
        }
        .uiverse-analyze-btn:hover { color: #e8e8e8; }
        .uiverse-analyze-btn:hover::before { width: 100%; }
        .uiverse-analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="max-w-[1600px] mx-auto px-6 flex-grow flex flex-col overflow-hidden w-full">
        
        <div className="mb-10 text-center shrink-0">
          <h2 className="text-4xl font-black italic tracking-tighter">
            Analyze Your <span className="text-blue-600">Fit</span>
          </h2>
          <p className="text-gray-400 mt-2 text-sm font-bold uppercase tracking-widest">
            AI-powered resume optimization & Job Trust Verify
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 flex-grow overflow-hidden pb-10">
          
          {/* LEFT COLUMN: INPUTS & HISTORY */}
          <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl glass-card">
              <label className="block text-xs font-black mb-4 text-gray-400 uppercase tracking-widest">1. Job Description</label>
              <textarea
                className="w-full border-gray-100 border-2 rounded-2xl p-5 text-sm outline-none bg-gray-50/30 font-medium resize-none h-64 focus:border-blue-500 transition-all"
                placeholder="Paste the requirements..."
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
              />
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl glass-card">
              <label className="block text-xs font-black mb-4 text-gray-400 uppercase tracking-widest">2. Your Resume</label>
              
              {/* 🔥 3. ANIMATED UPLOAD BUTTON */}
              <div className="py-4">
                <input 
                  type="file" 
                  accept=".pdf,.docx" 
                  onChange={uploadResume} 
                  className="hidden" 
                  id="dash-up" 
                  disabled={uploadStatus === 'uploading' || uploadStatus === 'success'}
                />
                <label htmlFor="dash-up" className="block">
                  <div className="upload-btn-wrapper">
                    
                    {/* STATE 1: IDLE */}
                    {uploadStatus === 'idle' && (
                      <div className="upload-btn-idle">
                        <CloudIcon />
                        <span>UPLOAD RESUME</span>
                      </div>
                    )}

                    {/* STATE 2: LOADING */}
                    {uploadStatus === 'uploading' && (
                      <div className="upload-btn-loading">
                        <div className="spinner"></div>
                      </div>
                    )}

                    {/* STATE 3: SUCCESS */}
                    {uploadStatus === 'success' && (
                      <div className="upload-btn-success">
                        <CheckIcon />
                        <span>UPLOADED</span>
                      </div>
                    )}

                  </div>
                </label>
              </div>

            </div>

            {/* 🔥 ANALYZE BUTTON (Shy Sloth Style) */}
            <div className="flex justify-center w-full">
              <button onClick={analyze} disabled={loading} className="uiverse-analyze-btn">
                {loading ? "AI Processing..." : "Run AI Analysis"}
              </button>
            </div>

            {history.length > 0 && (
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">🕒 Recent Activity</h3>
                <div className="space-y-3">
                  {history.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                      <p className="font-bold text-gray-700 text-xs truncate max-w-[150px]">{item.job_description}</p>
                      <div className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-blue-600 font-black text-[10px]">{item.match_score}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: ANALYTICS & PROJECTS */}
          <div className="lg:col-span-8 space-y-10 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="animate-pulse space-y-10">
                <div className="grid md:grid-cols-2 gap-8 items-stretch">
                  <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl h-[450px] flex flex-col">
                    <div className="h-4 w-32 bg-slate-100 rounded-full skeleton mb-8"></div>
                    <div className="flex-grow w-full bg-slate-50 rounded-[2rem] skeleton"></div>
                  </div>
                  <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl flex flex-col items-center justify-center relative">
                    <div className="h-4 w-24 bg-slate-100 rounded-full absolute top-10 left-10 skeleton"></div>
                    <div className="w-48 h-48 rounded-full border-8 border-slate-100 skeleton"></div>
                    <div className="h-6 w-32 bg-slate-100 rounded-full mt-8 skeleton"></div>
                  </div>
                </div>
              </div>
            ) : result ? (
              <div className="animate-card-in space-y-10">
                <div className="grid md:grid-cols-2 gap-8 items-stretch">
                  <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl h-[450px] flex flex-col glass-card">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">🕸️ Skill overlap map</h3>
                    <div className="flex-grow w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={getRadarData(result.match)}>
                          <PolarGrid stroke="#f1f5f9" />
                          <PolarAngleAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 800 }} />
                          <PolarRadiusAxis tick={false} domain={[0, 100]} />
                          <Radar name="You" dataKey="user" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.6} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl flex flex-col items-center justify-center relative glass-card">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest absolute top-10 left-10">Authenticity</h3>
                    <div className="relative w-48 h-48 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                        <circle
                          cx="50" cy="50" r="40"
                          stroke={result.trust.score >= 75 ? "#2563eb" : "#f97316"}
                          strokeWidth="8" fill="none"
                          strokeDasharray="251.2"
                          strokeDashoffset={251.2 - (251.2 * result.trust.score) / 100}
                          style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-5xl font-black text-slate-900 normal-weight">{result.trust.score}%</span>
                    </div>
                    <p className={`mt-8 font-black uppercase text-base tracking-widest ${result.trust.score >= 75 ? "text-blue-600" : "text-orange-500"}`}>{result.trust.verdict}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-stretch">
                  <MatchScoreCard data={result.match} />
                  <SkillGapCard data={{ missing_skills: result.match.missing_skills || [] }} />
                </div>

                <div className="mt-12">
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter italic">🚀 Portfolio <span className="text-blue-600">Level Up</span></h3>
                    <div className="h-[1px] flex-grow bg-gray-100"></div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-blue-600 w-24 h-24 rounded-bl-[100%] opacity-10 transition-all group-hover:scale-150"></div>
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                        ✨ AI Generated
                      </div>
                      <div className="text-3xl">🚀</div>
                    </div>

                    {loadingProject ? (
                      <div className="animate-pulse space-y-4">
                        <div className="h-6 bg-slate-100 rounded w-3/4 skeleton"></div>
                        <div className="h-4 bg-slate-100 rounded w-full skeleton"></div>
                        <div className="h-4 bg-slate-100 rounded w-5/6 skeleton"></div>
                      </div>
                    ) : aiProject ? (
                      <>
                        <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight">
                          {aiProject.title}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                          {aiProject.description}
                        </p>
                        
                        <div className="mb-6">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Tech Stack</p>
                          <div className="flex flex-wrap gap-2">
                            {aiProject.tech_stack && typeof aiProject.tech_stack === 'string' ? (
                                aiProject.tech_stack.split(',').map((tech, i) => (
                                <span key={i} className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200">
                                    {tech.trim()}
                                </span>
                                ))
                            ) : (
                                <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200">
                                    {String(aiProject.tech_stack || "General")}
                                </span>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={handleStartBuilding} 
                          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                        >
                          Start Building →
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-10 opacity-50">
                        <p className="text-xs font-bold text-slate-400">Run analysis to get a project idea.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-gray-200 rounded-[4rem] bg-white flex flex-col items-center justify-center text-gray-300">
                <div className="text-9xl mb-8 opacity-20 grayscale">📊</div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Waiting for Input</h3>
              </div>
            )}
          </div>

        </div>
      </div>
      <ChatWidget />
    </div>
  );
}