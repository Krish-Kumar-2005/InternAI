import { useState } from "react";
import api from "../services/api";

export default function BulletOptimizer() {
  const [original, setOriginal] = useState("");
  const [optimized, setOptimized] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOptimize = async () => {
    if (original.length < 15) return alert("Please enter a more detailed bullet point.");
    setLoading(true);
    try {
      // This calls the /ai/optimize-bullet endpoint we registered in main.py
      const res = await api.post("/ai/optimize-bullet", { text: original });
      setOptimized(res.data.optimized);
    } catch (err) {
      alert("Error: " + (err.response?.data?.detail || "AI Service Unavailable"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-blue-50/40">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">✨</span>
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">XYZ Bullet Optimizer</h3>
      </div>
      
      <div className="space-y-5">
        <div>
          <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-wider">Describe an accomplishment</label>
          <textarea
            className="w-full border-2 border-gray-50 rounded-2xl p-4 text-sm focus:border-blue-500 outline-none font-medium bg-gray-50/50 transition-all"
            rows={3}
            placeholder="Example: I worked on the EcoML project to track carbon."
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
          />
        </div>

        <button
          onClick={handleOptimize}
          disabled={loading}
          className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50"
        >
          {loading ? "AI is rewriting..." : "Optimize with XYZ Formula"}
        </button>

        {optimized && (
          <div className="p-6 bg-green-50/50 border border-green-100 rounded-3xl animate-in zoom-in-95 duration-300">
            <p className="text-[10px] font-black text-green-600 uppercase mb-3">Suggested XYZ Bullet:</p>
            <p className="text-sm font-bold text-slate-800 leading-relaxed italic">"{optimized}"</p>
            <button 
              onClick={() => { navigator.clipboard.writeText(optimized); alert("Copied!"); }}
              className="mt-4 text-[10px] font-black text-slate-400 hover:text-green-600 uppercase underline decoration-2 underline-offset-4"
            >
              Copy to Clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}