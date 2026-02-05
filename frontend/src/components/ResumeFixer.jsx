import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import api from "../services/api";
import ResumeEditor from "../components/ResumeEditor"; 

// 🔥 Import the CSS we just fixed
import "./ResumeFixerPage.css"; 

const PROFESSIONS = [
  "AI Engineer", "Machine Learning Engineer", "Data Scientist", "Python Developer",
  "Backend Developer", "Full Stack Developer", "DevOps Engineer", "Cloud Architect",
  "Cybersecurity Analyst", "Product Manager"
];

export default function ResumeFixerPage() {
  const [resumeFile, setResumeFile] = useState(null);
  const [editorContent, setEditorContent] = useState("");
  const [targetProfession, setTargetProfession] = useState(PROFESSIONS[0]);
  const [loading, setLoading] = useState(false); 
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); 
  const [impactScore, setImpactScore] = useState(0); 
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };
    getUser();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith(".docx")) {
        alert("⚠️ Please upload a .docx file for the Live Editor.");
        return;
      }
      setResumeFile(file);
      setTimeout(() => setImpactScore(72), 800);
    }
  };

  useEffect(() => {
    const loadDocument = async () => {
      if (!resumeFile) return;

      setLoading(true);
      const formData = new FormData();
      formData.append("file", resumeFile);

      try {
        const res = await api.post("/resume/import-for-editor", formData);
        
        if (res.data.html) {
          setEditorContent(res.data.html);
        } else {
          setEditorContent(res.data.text || "<p>Error loading content.</p>");
        }
      } catch (err) {
        console.error("Import Error:", err);
        alert("Failed to connect to backend conversion service.");
        setResumeFile(null); 
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [resumeFile]);

  const handleCloudSync = async () => {
    if (!user) return alert("Please log in to save.");
    setSaveStatus("saving");
    try {
        await api.post("/resume/save-draft", {
            user_id: user.id,
            html_content: editorContent,
            title: resumeFile.name
        });
        setSaveStatus("synced");
        setTimeout(() => setSaveStatus(""), 3000);
        if(impactScore < 95) setImpactScore(prev => prev + 2);
    } catch (err) {
        console.error("Sync Error:", err);
        setSaveStatus("error");
    }
  };

  const handleExport = async () => {
    setIsSaving(true);
    const formData = new FormData();
    formData.append("html_content", editorContent);

    try {
      const response = await api.post("/resume/export-resume", formData, {
        responseType: 'blob', 
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Optimized_${targetProfession.replace(" ", "_")}_Resume.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

    } catch (err) {
      console.error("Export Error:", err);
      alert("Export failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20 font-sans text-slate-900 select-none">
      <div className="max-w-[1600px] mx-auto px-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-10 border-b border-slate-200 pb-6 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Resume <span className="text-blue-600">Editor</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-2">
              Import .docx, Edit with AI, and Export perfectly.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Role:</span>
            <select 
              value={targetProfession} 
              onChange={(e) => setTargetProfession(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 shadow-sm focus:border-blue-500 outline-none cursor-pointer hover:border-blue-400 transition-colors"
            >
              {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* --- LEFT: EDITOR WORKSPACE --- */}
          <div className="lg:col-span-9 bg-gray-100 rounded-3xl shadow-inner border border-slate-200 overflow-hidden h-[850px] relative animate-slide-up">
            
            {!resumeFile ? (
              // UPLOAD STATE
              <div className="h-full flex flex-col items-center justify-center bg-slate-50/50">
                 <input 
                    type="file" 
                    accept=".docx" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    id="docx-upload" 
                 />
                 <label htmlFor="docx-upload" className="cursor-pointer flex flex-col items-center group">
                    <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 border border-slate-100">
                      <span className="text-5xl">📝</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">Upload Resume</h3>
                    <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">.DOCX Format Only</p>
                 </label>
              </div>
            ) : (
              // EDITOR STATE (Scrollable Area)
              <div className="h-full overflow-y-auto custom-scrollbar relative">
                 {/* Loading Overlay */}
                 {loading && (
                    <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <h3 className="text-xl font-black text-slate-800 animate-pulse">Converting Document...</h3>
                    </div>
                 )}

                 {/* 🔥 The Editor Component */}
                 <ResumeEditor 
                    initialContent={editorContent} 
                    onUpdate={(html) => setEditorContent(html)} 
                 />
              </div>
            )}
          </div>

          {/* --- RIGHT: SIDEBAR (Controls & Score) --- */}
          <div className="lg:col-span-3 space-y-6 sticky top-28 select-none animate-slide-up" style={{ animationDelay: "0.2s" }}>
            
            {/* Impact Score Panel */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center transition-all hover:shadow-md">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Resume Impact</h3>
              <div className="relative w-40 h-40 flex items-center justify-center">
                 <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                    <circle 
                      cx="50" cy="50" r="45" 
                      stroke={impactScore > 80 ? "#22c55e" : "#2563eb"} 
                      strokeWidth="8" fill="none" 
                      strokeDasharray="282.7" 
                      strokeDashoffset={282.7 - (282.7 * impactScore) / 100} 
                      style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }} 
                      strokeLinecap="round" 
                    />
                 </svg>
                 <span className="absolute text-4xl font-bold text-slate-900">{impactScore}</span>
              </div>
              <p className="text-xs text-center text-slate-400 mt-4 font-medium">
                  {impactScore > 80 ? "Great job! Ready to apply." : "Keep optimizing to boost score."}
              </p>
            </div>

            {/* Actions Panel */}
            {resumeFile && (
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-blue-100 flex flex-col gap-4">
                   <div className="flex items-center gap-2 mb-2">
                       <span className={`h-2.5 w-2.5 rounded-full ${saveStatus === 'saving' ? 'bg-yellow-400 animate-pulse' : saveStatus === 'synced' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                           {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'synced' ? 'All Changes Saved' : 'Unsaved Changes'}
                       </span>
                   </div>

                   <button 
                      onClick={handleCloudSync}
                      className="w-full py-4 bg-white border-2 border-slate-100 hover:border-blue-200 text-slate-600 hover:text-blue-600 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                   >
                      <span>☁️</span> Save Draft
                   </button>
                   
                   <button 
                      onClick={handleExport}
                      disabled={isSaving}
                      className="w-full py-4 bg-slate-900 text-white hover:bg-blue-600 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                   >
                      {isSaving ? (
                        <>
                           <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           Exporting...
                        </>
                      ) : (
                        <>
                           <span>📥</span> Download DOCX
                        </>
                      )}
                   </button>
                </div>
            )}
            
            {/* Guide Panel */}
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
               <h4 className="text-blue-800 font-bold text-sm mb-2">💡 Pro Tip</h4>
               <p className="text-xs text-blue-600 font-medium leading-relaxed">
                  Highlight any weak sentence in your resume to rewrite it instantly with AI.
               </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}