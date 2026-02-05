export default function MatchScoreCard({ data }) {
  // Round the score to avoid long decimals seen in your screenshot
  const displayScore = Math.round(data?.match_score || 0);

  return (
    <div className="bg-blue-600 rounded-2xl p-7 text-white shadow-lg shadow-blue-100 transition-all">
      <p className="text-xs font-bold uppercase tracking-wider opacity-80">
        Resume Match Score
      </p>
      <h3 className="text-6xl font-black mt-2 leading-none">
        {displayScore}%
      </h3>
      <div className="mt-5 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
        <span className="text-xs font-bold uppercase">Verdict:</span>
        <span className="text-sm font-medium">{data?.verdict || "Analyzing..."}</span>
      </div>
    </div>
  );
}