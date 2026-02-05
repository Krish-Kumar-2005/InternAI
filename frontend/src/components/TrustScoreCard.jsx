export default function TrustScoreCard({ data }) {
  const isSafe = data.risk_level === "LOW";
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Job Authenticity</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-4xl font-bold">{data.trust_score}</span>
            <span className="text-gray-400 text-sm">/100</span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isSafe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {data.risk_level} Risk
        </span>
      </div>
    </div>
  );
} 