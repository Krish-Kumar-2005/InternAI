import { useState } from "react";
import api from "../services/api";

export default function RecruiterJobPost() {
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [posted, setPosted] = useState(false);

  const generateAI = async () => {
    if (!title) return alert("Please enter a job title first.");
    setLoading(true);
    try {
      const res = await api.post("/job/generate-jd", { title, skills });
      
      // 🔥 Improvement: Check if backend sent an error message
      if (res.data.description && res.data.description.startsWith("Error:")) {
        alert(res.data.description); // Show alert: "Ollama is not running..."
      } else {
        setDescription(res.data.description);
      }
    } catch (err) {
      alert("AI Generation failed. Check backend console.");
    } finally {
      setLoading(false);
    }
  };

  const postJob = async () => {
    if (!title || !description) return;
    try {
      await api.post("/job/post", {
        title,
        company: "TechCorp (You)",
        location: "Remote",
        description
      });
      setPosted(true);
      setTimeout(() => setPosted(false), 3000);
      setTitle("");
      setSkills("");
      setDescription("");
    } catch (err) {
      alert("Failed to post job.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-20 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto px-6">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900">Post a <span className="text-blue-600">New Role</span></h1>
          {/* 📝 UPDATED TEXT: Reflects Local AI usage */}
          <p className="text-slate-500 mt-2">Let our <span className="font-bold text-purple-600">Local AI Agent</span> write the perfect job description for you.</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
          
          {/* Step 1: Basics */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Job Title</label>
              <input 
                value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Junior Python Developer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Required Skills (Optional)</label>
              <input 
                value={skills} onChange={(e) => setSkills(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Django, AWS, Docker"
              />
            </div>
            
            {/* AI Generator Button */}
            <div className="flex justify-end">
               <button 
                 onClick={generateAI}
                 disabled={loading}
                 className="px-6 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-black uppercase tracking-wide hover:bg-purple-200 transition-colors flex items-center gap-2"
               >
                 {loading ? (
                    <>
                        <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Thinking (Local AI)...</span>
                    </>
                 ) : "✨ Auto-Generate with AI"}
               </button>
            </div>

            {/* Step 2: Description */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Job Description</label>
              <textarea 
                value={description} onChange={(e) => setDescription(e.target.value)}
                rows={10}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm leading-relaxed text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="AI will fill this for you..."
              />
            </div>

            {/* Post Button */}
            <button 
              onClick={postJob}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-transform active:scale-95"
            >
              {posted ? "✅ Job Posted Successfully!" : "🚀 Publish Job Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}