// components/CodeDetectiveCard.jsx
export default function CodeDetectiveCard({ githubData }) {
  const isSuspicious = githubData.score < 60;

  return (
    <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${isSuspicious ? 'bg-red-50/30 border-red-100' : 'bg-white border-slate-100'}`}>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            🕵️‍♂️ Code Detective Report
          </h3>
          <p className="text-sm text-slate-500 font-medium">Analyzing GitHub Activity for <span className="font-mono text-slate-700">@{githubData.username}</span></p>
        </div>
        <div className={`text-2xl font-black ${isSuspicious ? 'text-red-500' : 'text-green-500'}`}>
          {githubData.score}/100
        </div>
      </div>

      {/* The Evidence Grid */}
      <div className="grid grid-cols-2 gap-4">
        
        {/* Metric 1: Commit Consistency */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Commit Pattern</p>
          <div className="flex items-center gap-2">
            {githubData.commit_spread === 'organic' ? (
              <span className="text-green-600 font-bold text-sm">✅ Consistent (Over 3 mos)</span>
            ) : (
              <span className="text-red-500 font-bold text-sm">🚩 Spike Detected (1 day)</span>
            )}
          </div>
        </div>

        {/* Metric 2: Code Ownership */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Code Ownership</p>
          <div className="flex items-center gap-2">
            {githubData.is_forked ? (
               <span className="text-amber-500 font-bold text-sm">⚠️ Forked Repo</span>
            ) : (
               <span className="text-blue-600 font-bold text-sm">🔹 Original Repo</span>
            )}
          </div>
        </div>

      </div>

      {/* The "Smoking Gun" Warning */}
      {isSuspicious && (
        <div className="mt-6 p-4 bg-red-100 rounded-xl border border-red-200 flex gap-3 items-start">
          <span className="text-xl">🚨</span>
          <div>
            <h4 className="text-sm font-bold text-red-800">Suspicious Activity Detected</h4>
            <p className="text-xs text-red-600 mt-1 leading-relaxed">
              This candidate pushed <strong>45 files</strong> in a single commit on <strong>Jan 24</strong>. 
              This usually indicates downloading a project zip and uploading it as their own.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}