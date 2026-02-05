// components/IntegrityBadge.jsx
export default function IntegrityBadge({ score, status }) {
  const getColor = () => {
    if (status === "Verified") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "Suspicious") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-rose-100 text-rose-700 border-rose-200";
  };

  const getIcon = () => {
    if (status === "Verified") return "🛡️"; // or a checkmark SVG
    if (status === "Suspicious") return "⚠️";
    return "⛔";
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getColor()} w-fit`}>
      <span className="text-xs">{getIcon()}</span>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-wider leading-none">{status}</span>
        <span className="text-[9px] font-bold opacity-80 leading-none mt-0.5">{score}% Original</span>
      </div>
    </div>
  );
}