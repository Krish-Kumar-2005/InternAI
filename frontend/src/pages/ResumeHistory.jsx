import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import api from "../services/api";

// --- ICONS ---
const UploadIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

export default function ResumeHistory() {
  const [versions, setVersions] = useState([]);
  const [newVersionName, setNewVersionName] = useState("");
  const [userNote, setUserNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchVersions(); }, []);

  const fetchVersions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('resume_versions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVersions(data || []);
    } catch (err) { console.error("Error fetching versions:", err); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!newVersionName) return alert("Give your version a name first!");
    
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/resume/upload", form);
      const extractedText = res.data.resume_text;

      let aiMetadata = { category: "General", target_company: null, tags: [] };
      try {
          const labelRes = await api.post("/resume/smart-label", {
              resume_text: extractedText,
              user_note: userNote
          });
          aiMetadata = labelRes.data;
      } catch (aiErr) { console.warn("AI Labeling failed", aiErr); }

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('resume_versions').insert([{
        user_id: user.id,
        version_name: newVersionName,
        resume_text: extractedText,
        category: aiMetadata.category,
        target_company: aiMetadata.target_company,
        ai_tags: aiMetadata.tags
      }]);

      if (error) throw error;

      setNewVersionName("");
      setUserNote("");
      fetchVersions();
      alert(`✅ Uploaded & Categorized as ${aiMetadata.category}`);

    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to save resume.");
    } finally {
      setLoading(false);
    }
  };

  const deleteVersion = async (id) => {
    if (!window.confirm("Are you sure you want to delete this version?")) return;
    const { error } = await supabase.from('resume_versions').delete().eq('id', id);
    if (!error) fetchVersions();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-28 pb-20 px-6 font-sans text-slate-900">
      
      <style>{`
        /* --- UPLOAD BUTTON --- */
        .uiverse-save-btn {
          font-family: inherit;
          font-size: 20px;
          background: #212121;
          color: white;
          fill: rgb(155, 153, 153);
          padding: 0.7em 1em;
          padding-left: 0.9em;
          display: flex;
          align-items: center;
          cursor: pointer;
          border: none;
          border-radius: 15px;
          font-weight: 1000;
          transition: all 0.3s ease-in-out;
          box-shadow: 0px 10px 20px rgba(0,0,0,0.1);
        }
        .uiverse-save-btn span { display: block; margin-left: 0.3em; transition: all 0.3s ease-in-out; }
        .uiverse-save-btn svg { display: block; transform-origin: center center; transition: transform 0.3s ease-in-out; stroke: rgb(155, 153, 153); }
        .uiverse-save-btn:hover { background: #000; transform: translateY(-2px); box-shadow: 0px 15px 25px rgba(0,0,0,0.2); }
        .uiverse-save-btn:hover .svg-wrapper { transform: scale(1.25); transition: 0.5s linear; }
        .uiverse-save-btn:hover svg { transform: translateX(1.2em) scale(1.1); stroke: #fff; }
        .uiverse-save-btn:hover span { opacity: 0; transition: 0.5s linear; }
        .uiverse-save-btn:active { transform: scale(0.95); }

        /* --- 🔥 NEW CARD UI (Dull Moose) --- */
        .card {
          margin: auto;
          width: 100%; /* Adjusted for grid layout */
          background-color: #fefefe;
          border-radius: 1rem;
          padding: 0.5rem;
          color: #141417;
          border: 1px solid #e5e7eb;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        .card__hero {
          background-color: #fef4e2;
          border-radius: 0.5rem 0.5rem 0 0;
          padding: 1.5rem;
          font-size: 0.875rem;
        }

        .card__hero .card__job-title {
          margin: 1.5rem 0 1rem 0; /* Adjusted margins */
          font-size: 1.5rem; /* Slightly smaller for grid */
          font-weight: 600;
          line-height: 1.2;
          padding-right: 0.5rem;
        }

        .card__hero-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-direction: row;
          flex-wrap: nowrap;
          gap: 1rem;
          font-weight: 700;
          color: #888;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .card__footer {
          display: flex;
          justify-content: flex-start;
          align-items: start;
          flex-direction: column;
          flex-wrap: nowrap;
          padding: 1rem 0.75rem 0.75rem 0.75rem;
          row-gap: 1rem;
          font-weight: 700;
          font-size: 0.875rem;
        }

        @media (min-width: 340px) {
          .card__footer {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
          }
        }

        .card__job-summary {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .card__btn {
          width: 100%;
          font-weight: 700;
          border: none;
          display: block;
          cursor: pointer;
          text-align: center;
          padding: 0.5rem 1.25rem;
          border-radius: 1rem;
          background-color: #141417;
          color: #fff;
          font-size: 0.875rem;
          transition: background-color 0.2s;
        }
        .card__btn:hover {
          background-color: #333;
        }

        @media (min-width: 340px) {
          .card__btn {
            width: max-content;
          }
        }
        
        .delete-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: #ef4444;
            padding: 4px;
            border-radius: 6px;
            transition: background 0.2s;
        }
        .delete-btn:hover {
            background: #fee2e2;
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Resume <span className="text-blue-600">Vault</span>
            </h1>
            <p className="text-slate-500 font-medium mt-2 text-lg">
              AI-powered archive for every application you send.
            </p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Versions</p>
            <p className="text-3xl font-black text-slate-800">{versions.length}</p>
          </div>
        </div>

        {/* UPLOAD SECTION */}
        <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-xl shadow-slate-200/60 mb-16 border border-slate-100 animate-in zoom-in-95 duration-500">
             <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="flex-1 space-y-2">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Version Identity</label>
                   <input 
                     type="text" 
                     placeholder="e.g. 'Software Engineer - Google'"
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:border-slate-300 focus:bg-white outline-none transition-all"
                     value={newVersionName}
                     onChange={(e) => setNewVersionName(e.target.value)}
                   />
                </div>
                <div className="flex-[1.5] space-y-2">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Context for AI</label>
                   <input 
                     type="text" 
                     placeholder="e.g. 'Tailored for senior backend role using Python/Django...'"
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:border-slate-300 focus:bg-white outline-none transition-all"
                     value={userNote}
                     onChange={(e) => setUserNote(e.target.value)}
                   />
                </div>
             </div>

             <div className="flex justify-end">
                <input type="file" id="vault-upload" className="hidden" onChange={handleUpload} />
                <label htmlFor="vault-upload" className="uiverse-save-btn">
                  {loading ? (
                    <span className="!ml-0 !opacity-100">Processing...</span>
                  ) : (
                    <>
                      <div className="svg-wrapper">
                        <UploadIcon />
                      </div>
                      <span>Upload</span>
                    </>
                  )}
                </label>
             </div>
        </div>

        {/* 🔥 NEW RESUME GRID (Using Dull Moose UI) */}
        {versions.length === 0 ? (
           <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[2rem]">
              <div className="text-6xl mb-4 grayscale opacity-20">🗄️</div>
              <h3 className="text-xl font-bold text-slate-400">Vault is Empty</h3>
              <p className="text-sm text-slate-400 mt-2">Upload your first resume to see AI categorization.</p>
           </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {versions.map((v, i) => (
              // 🔥 CARD COMPONENT START
              <div 
                key={v.id} 
                className="card animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="card__hero">
                  <div className="card__hero-header">
                    <span>{new Date(v.created_at).toLocaleDateString()}</span>
                    <button onClick={() => deleteVersion(v.id)} className="delete-btn" title="Delete">
                        <TrashIcon />
                    </button>
                  </div>
                  <h2 className="card__job-title" title={v.version_name}>
                    {v.version_name}
                  </h2>
                  <p className="text-xs font-medium text-slate-600 line-clamp-2">
                    {v.target_company ? `Target: ${v.target_company}` : "General Application"}
                  </p>
                </div>

                <div className="card__footer">
                  <div className="card__job-summary">
                    <div className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] uppercase font-bold text-slate-500">
                        {v.category || "General"}
                    </div>
                    {v.ai_tags && v.ai_tags[0] && (
                        <div className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] uppercase font-bold text-slate-500">
                            {v.ai_tags[0]}
                        </div>
                    )}
                  </div>
                  <button className="card__btn">Open</button>
                </div>
              </div>
              // 🔥 CARD COMPONENT END
            ))}
          </div>
        )}
      </div>
    </div>
  );
}