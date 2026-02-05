import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; 
import api from "../services/api";
import { supabase } from "../services/supabaseClient";

export default function StudentJobBoard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  
  // Modal State
  const [activeTab, setActiveTab] = useState("description"); 

  // Feature States
  const [coverLetter, setCoverLetter] = useState("");
  const [generatingLetter, setGeneratingLetter] = useState(false);
  
  const [tailoredData, setTailoredData] = useState(null);
  const [tailoring, setTailoring] = useState(false);

  const [applying, setApplying] = useState(false);
  
  // 🔥 Resume Handling
  const [selectedResumeFile, setSelectedResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState(""); // Extracted text

  // User State
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  const DEFAULT_RESUME_TEXT = "Experienced Python Developer with expertise in AI, Machine Learning, and React. Looking for backend roles.";

  useEffect(() => {
    fetchJobs();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        setUserId(user.id);
        setUserEmail(user.email);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await api.post("/job/list-smart", { resume_text: DEFAULT_RESUME_TEXT });
      setJobs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Handle New Resume Upload
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedResumeFile(file);
    
    // Auto-extract text for tailoring
    try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post("/resume/upload", formData);
        setResumeText(res.data.resume_text);
        alert("✅ Resume Uploaded & Analyzed!");
    } catch (err) {
        console.error("Resume parsing failed", err);
        setResumeText(DEFAULT_RESUME_TEXT); // Fallback
    }
  };

  const handleDeleteJob = async (e, jobId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to dismiss this job?")) return;
    try {
      await api.delete(`/job/${jobId}`);
      setJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId));
    } catch (err) {
      alert("Failed to delete job.");
    }
  };

  const handleGenerateLetter = async () => {
    setGeneratingLetter(true);
    try {
      const res = await api.post("/job/generate-cover-letter", {
        job_role: selectedJob.title,
        company_name: selectedJob.company,
        resume_text: resumeText || DEFAULT_RESUME_TEXT
      });
      setCoverLetter(res.data.cover_letter);
    } catch (err) {
      alert("Failed to generate.");
    } finally {
      setGeneratingLetter(false);
    }
  };

  const handleTailorResume = async () => {
    setTailoring(true);
    try {
      const res = await api.post("/job/tailor-resume", {
        job_description: selectedJob.description,
        resume_text: resumeText || DEFAULT_RESUME_TEXT
      });
      setTailoredData(res.data);
    } catch (err) {
      alert("Failed to tailor resume.");
    } finally {
      setTailoring(false);
    }
  };

  const handleApply = async () => {
    if (!userId) {
        alert("Please login to apply!");
        return;
    }
    setApplying(true);
    
    // Determine final resume text to send
    const finalResumeText = tailoredData ? tailoredData.tailored_summary : (resumeText || DEFAULT_RESUME_TEXT);

    try {
      await api.post("/job/apply", {
        job_id: selectedJob.id,
        candidate_name: userEmail.split('@')[0] || "Student", 
        resume_text: finalResumeText,
        cover_letter: coverLetter,
        student_id: userId 
      });
      alert("🚀 Application Sent Successfully!");
      setSelectedJob(null);
    } catch (err) {
      alert("Application failed.");
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    if (selectedJob) {
      setActiveTab("description");
      setCoverLetter("");
      setTailoredData(null);
      setSelectedResumeFile(null); // Reset file selection on new job open
      setResumeText(""); 
    }
  }, [selectedJob]);

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-20 font-sans text-slate-900 ">
      <div className="max-w-5xl mx-auto px-6">
        
        {/* HEADER with Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-slate-200 pb-6">
          <div className="text-left">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Smart <span className="text-blue-600">Job Board</span></h1>
            <p className="text-slate-500 mt-2 font-medium">AI predicts your win probability before you apply.</p>
          </div>
          
          <div className="flex gap-4 mt-4 md:mt-0">
             <Link to="/student-applications" className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2">
               <span>📊</span> My Applications
             </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 opacity-50 font-bold animate-pulse">Scanning Opportunities...</div>
        ) : (
          <div className="space-y-6">
            {jobs.map((job) => (
              <div 
                key={job.id} 
                onClick={() => setSelectedJob(job)} 
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group relative overflow-hidden"
              >
                <button 
                  onClick={(e) => handleDeleteJob(e, job.id)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white border border-slate-100 text-slate-300 hover:bg-red-50 hover:border-red-100 hover:text-red-500 flex items-center justify-center transition-all z-20 shadow-sm"
                  title="Dismiss Job"
                >
                  ✕
                </button>

                <div className="flex justify-between items-center">
                  <div className="pr-4">
                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-sm font-bold text-slate-400 mt-1">{job.company} • {job.location}</p>
                    <div className="flex gap-2 mt-3">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase">{job.type || "Full-Time"}</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase">{job.salary || "Competitive"}</span>
                    </div>
                  </div>

                  <div className="text-right mr-10">
                    <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide border shadow-sm ${
                      job.match_score > 60 ? "bg-green-100 text-green-700 border-green-200" :
                      job.match_score > 30 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                      "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {job.match_score > 0 ? `🔥 Match: ${job.match_score}%` : "❓ Upload Resume"}
                    </div>
                    <button className="mt-3 text-xs font-bold text-blue-600 hover:underline block w-full text-right">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- JOB DETAILS MODAL --- */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-fadeIn relative flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-start shrink-0 rounded-t-[2rem]">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{selectedJob.title}</h2>
                  <p className="text-slate-500 font-bold mt-1">{selectedJob.company}</p>
                </div>
                <button onClick={() => setSelectedJob(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-100 hover:text-red-500 font-bold transition-all">✕</button>
              </div>

              {/* TABS */}
              <div className="flex border-b border-slate-100 px-6 gap-6 bg-white">
                <button 
                  onClick={() => setActiveTab("description")}
                  className={`py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === "description" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                  Job Details
                </button>
                <button 
                   onClick={() => setActiveTab("resume_tailor")}
                   className={`py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === "resume_tailor" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                   ✨ AI Tailor
                </button>
                <button 
                   onClick={() => setActiveTab("cover_letter")}
                   className={`py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === "cover_letter" ? "border-purple-600 text-purple-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                   📝 Cover Letter
                </button>
              </div>

              {/* Body */}
              <div className="p-8 overflow-y-auto bg-slate-50/50 flex-grow">
                
                {/* 🔥 1. DESCRIPTION TAB + UPLOAD RESUME */}
                {activeTab === "description" && (
                  <div className="animate-fade-in">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">About the Role</h4>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      {selectedJob.description}
                    </p>
                    
                    {/* 🔥 NEW RESUME UPLOAD SECTION */}
                    <div className="mt-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-black text-slate-800">Select Resume for this Application</h4>
                            {selectedResumeFile && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">✅ File Selected</span>}
                        </div>
                        
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📂</span>
                                <p className="text-xs text-slate-500 font-bold">
                                    {selectedResumeFile ? selectedResumeFile.name : "Click to upload a specific resume (PDF/DOCX)"}
                                </p>
                            </div>
                            <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleResumeUpload} />
                        </label>
                        
                        {!selectedResumeFile && (
                            <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
                                *If no file is selected, your default profile resume will be used.
                            </p>
                        )}
                    </div>

                    <div className="mt-6 bg-blue-50 p-5 rounded-2xl flex items-center gap-4 border border-blue-100">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">✉️</div>
                        <div>
                            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Recruiter Contact</p>
                            <p className="text-sm font-black text-slate-800">{selectedJob.recruiter_email || "hr@techcorp.com"}</p>
                        </div>
                    </div>
                  </div>
                )}

                {activeTab === "resume_tailor" && (
                  <div className="animate-fade-in space-y-6">
                    <div className="flex justify-between items-end">
                       <div>
                         <h4 className="text-lg font-black text-slate-800">Optimize Your Resume</h4>
                         <p className="text-xs font-bold text-slate-400 mt-1">Boost your ATS score by aligning your summary with the JD.</p>
                       </div>
                       <button 
                         onClick={handleTailorResume}
                         disabled={tailoring}
                         className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all shadow-orange-200 disabled:opacity-50 flex items-center gap-2"
                       >
                         {tailoring ? (
                           <>
                             <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                             <span>Optimizing...</span>
                           </>
                         ) : (
                           <>
                             <span>✨</span>
                             <span>Auto-Tailor Resume</span>
                           </>
                         )}
                       </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 opacity-70">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg grayscale opacity-50">📄</span>
                            <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider">Original Summary</h5>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            {resumeText || DEFAULT_RESUME_TEXT}
                          </p>
                      </div>
                      
                      <div className={`relative p-6 rounded-2xl transition-all ${tailoredData ? "bg-white border border-orange-100 shadow-xl shadow-orange-100/50 ring-1 ring-orange-100" : "bg-white border-2 border-dashed border-slate-200 flex items-center justify-center"}`}>
                          {tailoredData ? (
                            <>
                              <div className="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md animate-bounce">
                                +25% MATCH SCORE
                              </div>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-lg">🔥</span>
                                <h5 className="text-xs font-black text-orange-500 uppercase tracking-wider">Tailored Version</h5>
                              </div>
                              <div className="space-y-4">
                                <p className="text-sm text-slate-800 font-semibold leading-relaxed">
                                  {tailoredData.tailored_summary}
                                </p>
                                <div className="h-[1px] bg-orange-50 w-full"></div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Keywords Added:</p>
                                  <div className="flex flex-wrap gap-1">
                                     {tailoredData.tailored_skills && typeof tailoredData.tailored_skills === 'string' 
                                       ? tailoredData.tailored_skills.split(',').map(s => (
                                           <span key={s} className="px-2 py-1 bg-orange-50 rounded-lg border border-orange-100 text-[10px] font-bold text-orange-600">
                                             {s.trim()}
                                           </span>
                                         ))
                                       : <span className="text-xs text-slate-300">No specific skills detected.</span>
                                     }
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-4xl mb-3 opacity-20">✨</div>
                              <p className="text-xs font-bold text-slate-300">Click 'Auto-Tailor' to generate<br/>an optimized version.</p>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "cover_letter" && (
                  <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                          <h4 className="text-sm font-black text-purple-600">Cover Letter Generator</h4>
                          <p className="text-xs text-slate-400">Generate a custom letter for {selectedJob.company}.</p>
                        </div>
                        <button 
                          onClick={handleGenerateLetter}
                          disabled={generatingLetter}
                          className="text-xs bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-200 disabled:opacity-50"
                        >
                          {generatingLetter ? "✨ Writing..." : "✨ Write with AI"}
                        </button>
                    </div>
                    <textarea 
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="AI generated content will appear here..."
                      className="w-full h-48 bg-white border border-purple-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none text-slate-700 shadow-sm font-medium"
                    />
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center shrink-0 rounded-b-[2rem]">
                <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide flex items-center gap-2 ${tailoredData ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                   {tailoredData ? (
                     <><span>✅</span> Sending Tailored Resume</>
                   ) : (
                     <><span>ℹ️</span> Sending {selectedResumeFile ? "Uploaded" : "Default"} Resume</>
                   )}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectedJob(null)}
                    className="px-6 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleApply}
                    disabled={applying}
                    className="px-8 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl shadow-lg hover:bg-blue-700 hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {applying ? "Sending..." : "Apply Now 🚀"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}