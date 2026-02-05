import React, { useState } from "react";
import api from "../services/api";

// --- LOCAL SKELETONS ---
const SkeletonCard = () => (
  <div className="p-4 rounded-2xl border border-slate-100 bg-white space-y-3 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
      <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
    </div>
    <div className="h-3 bg-slate-200 rounded w-1/4"></div>
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

const getInitials = (name) => name ? name.charAt(0).toUpperCase() : "?";

export default function PipelineView({ 
  jobs, 
  loadingJobs, 
  selectedJob, 
  loadPipeline, 
  pipelineApplicants, 
  analyzingPipeline, 
  openReviewModal,
  onShortlistCandidate, // Handles both Add & Remove based on current status
  onAutoShortlist       
}) {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const handleSmartSearch = async () => {
    if (!searchQuery.trim() || !selectedJob) return;
    setIsSearching(true);
    setSearchResults(null);
    try {
        const res = await api.post("/recruiter/smart-search", { 
            query: searchQuery,
            job_id: selectedJob.id 
        });
        setSearchResults(res.data.matches);
    } catch (err) {
        alert("Search failed. Ensure backend is running.");
    } finally {
        setIsSearching(false);
    }
  };

  const clearSearch = () => {
      setSearchQuery("");
      setSearchResults(null);
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8 animate-fade-in">
      
      {/* --- LEFT SIDEBAR: JOBS --- */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm h-[80vh] overflow-y-auto custom-scrollbar">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Active Roles</h3>
          
          {loadingJobs ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : jobs.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">No jobs found.<br/>Post a job to start.</div>
          ) : (
            jobs.map((job) => (
              <div 
                key={job.id} 
                onClick={() => { loadPipeline(job); setSearchResults(null); setSearchQuery(""); }} 
                className={`p-4 rounded-2xl cursor-pointer border transition-all group ${
                  selectedJob?.id === job.id 
                  ? "bg-blue-50 border-blue-200 shadow-sm" 
                  : "bg-white border-slate-100 hover:border-blue-100 hover:shadow-sm"
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className={`font-bold text-sm ${selectedJob?.id === job.id ? "text-blue-700" : "text-slate-800"}`}>{job.title}</h4>
                  {selectedJob?.id === job.id && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                </div>
                <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-1 rounded ${job.applications_count > 0 ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}>
                  {job.applications_count} Applied
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- RIGHT CONTENT: APPLICANTS --- */}
      <div className="lg:col-span-9">
         {!selectedJob ? (
            <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-[2rem] border border-slate-200 shadow-sm text-slate-400">
              <div className="text-6xl mb-4 grayscale opacity-20">📂</div>
              <p className="font-bold text-lg">Select a Job</p>
              <p className="text-sm mt-1">View applicants and AI insights.</p>
            </div>
         ) : (
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
                
                {/* HEADER */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Applicants for {selectedJob.title}</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total: {pipelineApplicants.length}</p>
                    </div>
                    
                    <button 
                      onClick={onAutoShortlist}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
                    >
                      <span>✨</span> AI Auto-Shortlist
                    </button>
                  </div>

                  {/* SEARCH BAR */}
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ask AI: 'Did any candidate use JavaScript for Auth in their GitHub projects?'" 
                      className="w-full pl-4 pr-32 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-700 placeholder-slate-400 text-sm transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
                    />
                    <div className="absolute right-1 top-1 flex gap-1">
                        {searchResults && (
                          <button onClick={clearSearch} className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-red-500 bg-white rounded-lg">✕</button>
                        )}
                        <button 
                          onClick={handleSmartSearch}
                          disabled={isSearching || !searchQuery}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700 disabled:opacity-50 transition-all"
                        >
                          {isSearching ? "Analysing Code..." : "Deep Search"}
                        </button>
                    </div>
                  </div>
                </div>
                
                {/* LIST CONTENT */}
                <div className="p-8 bg-slate-50/30 flex-grow">
                  {analyzingPipeline ? (
                      <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
                  ) : searchResults ? (
                      // 🔥 DISPLAY SEARCH RESULTS
                      <div className="space-y-4 animate-fade-in">
                          {searchResults.length === 0 ? <p className="text-center text-slate-400 font-bold">No technical matches found.</p> : null}
                          
                          {searchResults.map((match) => (
                            <div key={match.id} className="bg-white p-6 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-sm flex flex-col gap-3">
                               <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black">{getInitials(match.candidate_name)}</div>
                                     <div>
                                        <h4 className="font-bold text-slate-800">{match.candidate_name}</h4>
                                        {/* VERIFICATION BADGE */}
                                        {match.confidence === 'High' && match.github_link ? (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200 mt-1 w-fit">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                                                Code Verified on GitHub
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded mt-1 w-fit">Resume Match</span>
                                        )}
                                     </div>
                                  </div>
                                  {match.github_link && (
                                    <a href={match.github_link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold hover:underline">View Code ↗</a>
                                  )}
                               </div>
                               <div className="p-3 bg-white rounded-xl border border-slate-100 text-sm text-slate-600 italic">
                                  " {match.ai_reason} "
                               </div>
                            </div>
                          ))}
                      </div>
                  ) : pipelineApplicants.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400"><div className="text-4xl mb-4 grayscale opacity-20">📭</div><p className="font-bold">No applications yet.</p></div>
                  ) : (
                      // 🔥 DISPLAY REGULAR APPLICANTS
                      <div className="space-y-4">
                          {pipelineApplicants.map((app) => (
                            <div key={app.id} className={`relative bg-white p-6 rounded-2xl border transition-all flex items-center justify-between group ${app.status === 'Shortlisted' ? 'border-green-200 bg-green-50/30' : 'border-slate-100 hover:shadow-md'}`}>
                              
                              {/* 🔥 TOGGLE BUTTON: ADD (Check) OR REMOVE (Cross) */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); onShortlistCandidate(app); }}
                                className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all z-20 border shadow-sm ${
                                    app.status === 'Shortlisted' 
                                    ? "bg-white border-red-200 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500" // Remove Style
                                    : "bg-slate-50 border-slate-200 text-slate-300 hover:bg-green-500 hover:text-white hover:border-green-500 opacity-0 group-hover:opacity-100" // Add Style
                                }`}
                                title={app.status === 'Shortlisted' ? "Remove from Shortlist" : "Add to Shortlist"}
                              >
                                {app.status === 'Shortlisted' ? (
                                    // Cross Icon (Remove)
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                ) : (
                                    // Check Icon (Add)
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                )}
                              </button>

                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 font-black text-lg">
                                    {getInitials(app.candidate_name)}
                                  </div>
                                  <div>
                                      <div className="flex items-center gap-2">
                                          <h4 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{app.candidate_name}</h4>
                                          {app.status === 'Shortlisted' && <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded border border-green-200 uppercase tracking-wide">Shortlisted</span>}
                                          {app.category && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${app.category.toLowerCase().includes("data") ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}>{app.category}</span>}
                                      </div>
                                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{app.email}</p>
                                  </div>
                              </div>

                              <div className="flex items-center gap-8 pr-12">
                                  <div className="text-right">
                                      <div className={`text-2xl font-black ${app.match_score >= 80 ? "text-green-500" : app.match_score >= 50 ? "text-yellow-500" : "text-slate-300"}`}>{app.match_score}%</div>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Match Score</p>
                                  </div>
                                  <button onClick={() => openReviewModal(app)} className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm">👁️</button>
                              </div>
                           </div>
                          ))}
                      </div>
                  )}
                </div>
            </div>
         )}
      </div>
    </div>
  );
}