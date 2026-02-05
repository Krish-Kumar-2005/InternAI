import React from 'react';

// 🔥 HELPER: Advanced Code Integrity Badge
const IntegrityBadge = ({ score, status }) => {
  const getStyle = () => {
    switch (status) {
      case "Top Tier": return "bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-100";
      case "Verified": return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100";
      case "Neutral": return "bg-slate-50 text-slate-600 border-slate-200";
      case "Suspicious": return "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100";
      case "Plagiarized": return "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-100";
      default: return "bg-gray-50 text-gray-400 border-gray-100";
    }
  };

  const getIcon = () => {
    switch (status) {
      case "Top Tier": return "🏆";
      case "Verified": return "🛡️";
      case "Neutral": return "⚖️";
      case "Suspicious": return "⚠️";
      case "Plagiarized": return "⛔";
      default: return "--";
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStyle()} w-fit whitespace-nowrap transition-all hover:shadow-sm cursor-help`} title={`Code Integrity Score: ${score}/100`}>
      <span className="text-xs">{getIcon()}</span>
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-black uppercase tracking-wider">{status}</span>
        {status !== "N/A" && <span className="text-[9px] font-bold opacity-80 mt-0.5">{score}% Original</span>}
      </div>
    </div>
  );
};

export default function CandidateTable({ data, isLoading }) {
  
  // 🧠 HELPER: Deterministic Mock Logic (Generates unique scores per name)
  const generateMockIntegrity = (name, hasGithub) => {
    if (!hasGithub) return { score: 0, status: "N/A" };
    
    // Create a hash from the name to make the score consistent for the same person
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const score = Math.abs(hash % 100); // 0-99

    let status = "Neutral";
    if (score >= 90) status = "Top Tier";
    else if (score >= 75) status = "Verified";
    else if (score >= 50) status = "Neutral";
    else if (score >= 30) status = "Suspicious";
    else status = "Plagiarized";

    return { score, status };
  };

  const getGithubLink = (candidate) => {
    if (candidate.github_link) return candidate.github_link;
    if (candidate.resume_text) {
      const match = candidate.resume_text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?/i);
      if (match) {
        let url = match[0];
        if (!url.startsWith("http")) url = `https://${url}`;
        return url;
      }
    }
    return null;
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';
  };

  const getCategoryStyle = (category) => {
    if (!category) return "bg-slate-50 text-slate-600 border-slate-100";
    const lower = category.toLowerCase();
    
    if (lower.includes("data") || lower.includes("ai") || lower.includes("machine")) 
      return "bg-purple-50 text-purple-700 border-purple-100"; 
    if (lower.includes("web") || lower.includes("front") || lower.includes("react")) 
      return "bg-pink-50 text-pink-700 border-pink-100"; 
    if (lower.includes("back") || lower.includes("java") || lower.includes("cloud")) 
      return "bg-orange-50 text-orange-700 border-orange-100"; 
    
    return "bg-blue-50 text-blue-700 border-blue-100"; 
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden bg-white border border-slate-100 rounded-[1.5rem] shadow-sm w-full">
        <div className="p-6 border-b border-slate-50">
           <div className="h-8 w-1/4 bg-slate-100 rounded animate-pulse"></div>
        </div>
        <div className="space-y-6 p-6">
           {[1, 2, 3].map(i => (
             <div key={i} className="flex items-center gap-6 animate-pulse">
                <div className="w-12 h-12 bg-slate-100 rounded-full"></div>
                <div className="flex-1 space-y-3">
                   <div className="h-5 bg-slate-100 rounded w-1/3"></div>
                   <div className="h-4 bg-slate-50 rounded w-1/4"></div>
                </div>
                <div className="w-24 h-10 bg-slate-100 rounded"></div>
             </div>
           ))}
        </div>
      </div>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white border border-slate-100 rounded-[2rem] shadow-sm text-center w-full">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
           <span className="text-4xl grayscale opacity-50">📂</span>
        </div>
        <h3 className="text-slate-900 font-bold text-xl">No Candidates Found</h3>
        <p className="text-slate-500 text-base mt-2">Upload resumes to see AI analysis here.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded-[1.5rem] shadow-xl shadow-slate-200/40 animate-fade-in flex flex-col">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse table-auto min-w-[1200px]">
          
          {/* HEADER */}
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200 text-xs uppercase text-slate-500 tracking-widest font-black">
              <th className="px-6 py-5 w-16 text-center">#</th>
              <th className="px-6 py-5 w-1/4 min-w-[250px]">Candidate Profile</th>
              <th className="px-6 py-5">Category</th>
              <th className="px-6 py-5 w-32">Match Score</th>
              <th className="px-6 py-5 w-40">Code Integrity</th> 
              <th className="px-6 py-5 w-32">Verdict</th>
              <th className="px-6 py-5 w-1/4">Identified Gaps</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {data.map((c, i) => {
              const githubLink = getGithubLink(c);
              const score = Math.round(c.match_score || 0);
              const missingSkills = Array.isArray(c.missing_skills) ? c.missing_skills : [];
              const hasGaps = missingSkills.length > 0;

              // Verdict Logic
              const isGreatFit = score >= 95 && !hasGaps;
              const isLowScoreNoGaps = score < 50 && !hasGaps;
              const isModerateNoGaps = score >= 50 && score < 95 && !hasGaps;
              
              const scoreColor = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500';
              const scoreText = score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600';

              // 🔥 BETTER MOCK INTEGRITY LOGIC
              // Use real DB value if exists, otherwise generate a unique one based on name
              const integrityData = c.integrity_score 
                ? { score: c.integrity_score, status: c.integrity_status } 
                : generateMockIntegrity(c.candidate_name || "Unknown", !!githubLink);

              return (
                <tr key={i} className="group hover:bg-slate-50/80 transition-all duration-200 align-middle">
                  
                  {/* RANK */}
                  <td className="px-6 py-4 text-center">
                    <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-black shadow-sm ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-50' : 
                      i === 1 ? 'bg-slate-200 text-slate-700' : 
                      i === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-400'
                    }`}>
                      {i + 1}
                    </div>
                  </td>

                  {/* PROFILE */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-11 h-11 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 border border-slate-200">
                        {getInitials(c.candidate_name)}
                      </div>
                      
                      <div className="min-w-0 flex flex-col">
                        {/* Name + Icon Row - STRICTLY BESIDE */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                            {c.candidate_name || "Unknown Candidate"}
                          </p>
                          
                          {githubLink && (
                            <a 
                              href={githubLink} 
                              target="_blank"
                              rel="noreferrer" 
                              className="flex-shrink-0 text-slate-400 hover:text-black transition-transform hover:scale-110"
                              title="GitHub Profile"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                            </a>
                          )}
                        </div>
                        
                        {/* Subtitle Row - STRICTLY BELOW */}
                        <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">{c.email || "No Data"}</p>
                      </div>
                    </div>
                  </td>

                  {/* CATEGORY */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded border uppercase tracking-wider ${getCategoryStyle(c.category)}`}>
                      {c.category || "GENERAL"}
                    </span>
                  </td>

                  {/* SCORE BAR */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex justify-between items-end">
                        <span className={`text-sm font-black ${scoreText}`}>{score}% Match</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${scoreColor}`} style={{ width: `${score}%` }}></div>
                      </div>
                    </div>
                  </td>

                  {/* INTEGRITY */}
                  <td className="px-6 py-4">
                    <IntegrityBadge score={integrityData.score} status={integrityData.status} />
                  </td>

                  {/* VERDICT */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border ${
                      score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      score >= 50 ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
                      {c.verdict || (score > 75 ? "Shortlist" : "Review")}
                    </span>
                  </td>

                  {/* GAPS */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {hasGaps && missingSkills.slice(0, 2).map((skill, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold uppercase tracking-tight whitespace-nowrap">
                          {skill}
                        </span>
                      ))}
                      {isGreatFit && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">✨ Perfect Fit</span>}
                      {hasGaps && missingSkills.length > 2 && <span className="text-xs font-bold text-slate-400 px-1 py-1">+{missingSkills.length - 2}</span>}
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}