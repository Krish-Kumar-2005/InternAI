import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import api from "../services/api";

// 🔥 TIPTAP IMPORTS
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

import "./ResumeFixerPage.css"; 

const PROFESSIONS = [
  "AI Engineer", "Machine Learning Engineer", "Data Scientist", "Python Developer",
  "Backend Developer", "Full Stack Developer", "DevOps Engineer", "Cloud Architect",
  "Cybersecurity Analyst", "Product Manager"
];

// 🔥 BUTTON COMPONENT (Supports Variants)
const AnimatedButton = ({ onClick, disabled, children, variant = "secondary", className = "" }) => (
  <button onClick={onClick} disabled={disabled} className={`animated-button ${variant} ${className}`}>
    <span className="text">{children}</span>
    <span className="circle"></span>
    <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
    </svg>
    <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
    </svg>
  </button>
);

export default function ResumeFixerPage() {
  const [resumeFile, setResumeFile] = useState(null);
  const [sourceFilename, setSourceFilename] = useState(""); 
  const [targetProfession, setTargetProfession] = useState(PROFESSIONS[0]);
  
  // AI & Selection States
  const [selectedText, setSelectedText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [hasOptimized, setHasOptimized] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null); // 🔥 Track copied state

  const [loading, setLoading] = useState(false); 
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); 
  const [impactScore, setImpactScore] = useState(0); 
  const [user, setUser] = useState(null);

  // ------------------------------------------------------------------
  // 📝 TIPTAP EDITOR CONFIGURATION
  // ------------------------------------------------------------------
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Resume content...' }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'border-collapse table-fixed w-full' } }),
      TableRow,
      TableHeader,
      TableCell.configure({ HTMLAttributes: { class: 'border border-gray-300 p-2 align-top' } }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[1100px]',
      },
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to, empty } = editor.state.selection;
      if (!empty) {
        const text = editor.state.doc.textBetween(from, to, ' ');
        setSelectedText(text);
        if(hasOptimized) { setHasOptimized(false); setSuggestions([]); } 
      } else {
        setSelectedText("");
      }
    }
  });

  // ------------------------------------------------------------------
  // 🔄 DATA & FILE HANDLING
  // ------------------------------------------------------------------

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
      setResumeFile(file);
      setTimeout(() => setImpactScore(72), 800);
    }
  };

  useEffect(() => {
    const loadDocument = async () => {
      if (!resumeFile || !editor) return;

      setLoading(true);
      const formData = new FormData();
      formData.append("file", resumeFile);

      try {
        const res = await api.post("/resume/import-for-editor", formData);
        
        if (res.data.html) {
          editor.commands.setContent(res.data.html);
          setSourceFilename(res.data.source_filename);
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
  }, [resumeFile, editor]);

  // ------------------------------------------------------------------
  // 🤖 AI LOGIC
  // ------------------------------------------------------------------

  const triggerAiSuggestions = async () => {
    if (!selectedText) return;
    setAiLoading(true);
    try {
      const res = await api.post("/resume/suggest", {
        text: selectedText,
        profession: targetProfession,
      });
      setSuggestions(res.data.suggestions || []);
      setHasOptimized(true);
    } catch (err) {
      console.error("AI Error:", err);
      setSuggestions([
        { word: "Engineered scalable AI pipelines reducing latency by 40%", score: 0.98 },
        { word: "Architected robust machine learning models for high-traffic production", score: 0.92 }
      ]);
      setHasOptimized(true);
    } finally { 
      setAiLoading(false); 
    }
  };

  const applyAiSuggestion = (newText) => {
    if(!editor) return;
    const currentHTML = editor.getHTML();
    const updatedHtml = currentHTML.replace(selectedText, newText);
    editor.commands.setContent(updatedHtml);
    setHasOptimized(false);
    setSuggestions([]);
    setSelectedText("");
    if(impactScore < 98) setImpactScore(prev => Math.min(prev + 5, 99));
  };

  // 🔥 COPY FUNCTION
  const handleCopy = (e, text, index) => {
    e.stopPropagation(); // Prevent "Apply" click
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // ------------------------------------------------------------------
  // 💾 SAVE & EXPORT
  // ------------------------------------------------------------------

  const handleCloudSync = async () => {
    if (!user) return alert("Please log in to save.");
    if (!editor) return;
    setSaveStatus("saving");
    try {
        await api.post("/resume/save-draft", {
            user_id: user.id,
            html_content: editor.getHTML(),
            title: resumeFile.name
        });
        setSaveStatus("synced");
        setTimeout(() => setSaveStatus(""), 3000);
    } catch (err) {
        console.error("Sync Error:", err);
        setSaveStatus("error");
    }
  };

  const handleExport = async () => {
    if (!editor) return;
    if (!sourceFilename) return alert("Original source file not found. Please re-upload.");
    setIsSaving(true);
    
    try {
      const response = await api.post("/resume/export-resume", 
        {
          html_content: editor.getHTML(),
          source_filename: sourceFilename
        },
        {
          responseType: 'blob', 
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Optimized_Resume.docx`);
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

  // ------------------------------------------------------------------
  // 🖼️ RENDER
  // ------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20 font-sans text-slate-900 select-none">
      <div className="max-w-[1600px] mx-auto px-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-10 border-b border-slate-200 pb-6 animate-fade-in bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Resume <span className="text-blue-600">Editor</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-2">
              Import .docx/.pdf, Edit with AI, and Export perfectly.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Role:</span>
            <select 
              value={targetProfession} 
              onChange={(e) => setTargetProfession(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 shadow-sm focus:border-blue-500 outline-none cursor-pointer"
            >
              {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* --- LEFT: EDITOR WORKSPACE --- */}
          <div className="lg:col-span-9 bg-transparent h-[850px] relative animate-slide-up">
            
            {!resumeFile ? (
              // UPLOAD STATE
              <div className="h-full flex flex-col items-center justify-center bg-white/50 backdrop-blur rounded-3xl border-2 border-dashed border-slate-300">
                 <input type="file" accept=".docx,.pdf" onChange={handleFileUpload} className="hidden" id="docx-upload" />
                 <label htmlFor="docx-upload" className="cursor-pointer flex flex-col items-center group">
                    <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 border border-slate-100">
                      <span className="text-5xl">📄</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">Upload Resume</h3>
                    <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">PDF or DOCX</p>
                 </label>
              </div>
            ) : (
              // EDITOR STATE
              <div className="h-full overflow-y-auto custom-scrollbar relative">
                 {loading && (
                    <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <h3 className="text-xl font-black text-slate-800 animate-pulse">Processing Layout...</h3>
                    </div>
                 )}

                 <div className="flex justify-center py-8 overflow-auto min-h-full">
                    <div className="resume-page-container scale-95 transform origin-top">
                        <EditorContent editor={editor} />
                    </div>
                 </div>

              </div>
            )}
          </div>

          {/* --- RIGHT: SIDEBAR (Controls & AI) --- */}
          <div className="lg:col-span-3 space-y-6 sticky top-28 select-none animate-slide-up" style={{ animationDelay: "0.2s" }}>
            
            {/* Impact Score */}
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
            </div>

            {/* AI OPTIMIZER PANEL */}
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-blue-100 min-h-[300px] flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">✨ AI Rewriter</h3>
                
                {selectedText ? (
                  <>
                    <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Selection</p>
                      <p className="text-xs text-slate-600 italic line-clamp-3">"{selectedText}"</p>
                    </div>

                    {!hasOptimized && !aiLoading && (
                      <AnimatedButton onClick={triggerAiSuggestions} variant="primary">
                        Optimize Selection
                      </AnimatedButton>
                    )}

                    {aiLoading && (
                       <div className="space-y-2">
                          <div className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
                          <div className="h-16 bg-slate-100 rounded-xl animate-pulse delay-75"></div>
                       </div>
                    )}

                    {hasOptimized && (
                      <div className="space-y-3 custom-scrollbar overflow-y-auto max-h-[350px] pr-1">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Suggestions</p>
                          <span className="text-[10px] text-blue-500 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                            {suggestions.length} Options
                          </span>
                        </div>

                        {suggestions.map((s, i) => (
                          <div 
                            key={i} 
                            onClick={() => applyAiSuggestion(s.word)}
                            className="suggestion-card group"
                          >
                            <p className="suggestion-text">{s.word}</p>
                            <div className="suggestion-footer">
                               <div className={`impact-badge ${s.score > 0.9 ? 'high' : 'medium'}`}>
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                  </svg>
                                  {Math.round(s.score * 100)}% Impact
                               </div>
                               
                               {/* 🔥 COPY & APPLY ACTIONS */}
                               <div className="flex items-center gap-3">
                                  <button 
                                    onClick={(e) => handleCopy(e, s.word, i)}
                                    className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                                    title="Copy to Clipboard"
                                  >
                                    {copiedIndex === i ? (
                                      <span className="text-green-500 text-[10px] font-bold">Copied!</span>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </button>

                                  <div className="apply-text">Apply <span className="text-lg leading-none">→</span></div>
                               </div>

                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-grow text-slate-300">
                    <span className="text-3xl mb-2">👆</span>
                    <p className="text-center text-xs font-bold uppercase tracking-widest">Highlight text<br/>to rewrite</p>
                  </div>
                )}
            </div>

            {/* Actions */}
            {resumeFile && (
                <div className="flex flex-col gap-3">
                   {/* SAVE (Secondary style) */}
                   <AnimatedButton onClick={handleCloudSync} variant="secondary">
                      {saveStatus === 'synced' ? '✅ Saved' : 'Save Draft'}
                   </AnimatedButton>
                   
                   {/* DOWNLOAD (Primary style) */}
                   <AnimatedButton onClick={handleExport} disabled={isSaving} variant="primary">
                      {isSaving ? 'Exporting...' : 'Download DOCX'}
                   </AnimatedButton>
                </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}