import { useState, useEffect, useRef } from "react";
import { supabase } from "../services/supabaseClient";
import { Link } from "react-router-dom";

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  
  // 🔥 GitHub State
  const [showGithubPopover, setShowGithubPopover] = useState(false);
  const [githubRepos, setGithubRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [githubToken, setGithubToken] = useState(null);
  
  const popoverRef = useRef(null);

  useEffect(() => {
    fetchProjects();
    checkGithubConnection();

    // Close popover when clicking outside
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowGithubPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update local state when project changes
  useEffect(() => {
    if (selectedProject) {
        setShowGithubPopover(false);
        setRepoSearch(""); 
    }
  }, [selectedProject]);

  // 🔥 1. CHECK GITHUB CONNECTION & FETCH REPOS DIRECTLY
  const checkGithubConnection = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if we have a provider token (only present if signed in via GitHub)
    if (session?.provider_token) {
        setGithubToken(session.provider_token);
        fetchGithubRepos(session.provider_token);
    }
  };

  // 🔥 2. FETCH REPOS FROM GITHUB API (No Database Save)
  const fetchGithubRepos = async (token) => {
    if (!token) return;
    setLoadingRepos(true);
    try {
        const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json"
            }
        });
        
        if (res.ok) {
            const data = await res.json();
            setGithubRepos(data); 
        } else {
            console.error("Failed to fetch repos from GitHub");
        }
    } catch (err) {
        console.error("GitHub API Error", err);
    } finally {
        setLoadingRepos(false);
    }
  };

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('student_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error) {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0]);
      }
    }
    setLoading(false);
  };

  const toggleTask = async (projectIndex, taskIndex) => {
    const updatedProjects = [...projects];
    const project = updatedProjects[projectIndex];
    project.tasks[taskIndex].completed = !project.tasks[taskIndex].completed;
    const completedCount = project.tasks.filter(t => t.completed).length;
    project.progress = Math.round((completedCount / project.tasks.length) * 100);
    setProjects(updatedProjects);
    setSelectedProject(project);
    await supabase.from('student_projects').update({ tasks: project.tasks, progress: project.progress }).eq('id', project.id);
  };

  // 🔥 LINK REPO TO PROJECT (Updates only the project link)
  const linkRepo = async (repoUrl) => {
      const updatedProject = { ...selectedProject, github_link: repoUrl };
      setSelectedProject(updatedProject);
      setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));

      await supabase
        .from('student_projects')
        .update({ github_link: repoUrl })
        .eq('id', updatedProject.id);
      
      setShowGithubPopover(false);
  };

  const handleGithubLogin = async () => {
      await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
              scopes: 'repo', // Request access to private repos
              redirectTo: window.location.href 
          }
      });
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    await supabase.from('student_projects').delete().eq('id', id);
    fetchProjects();
  };

  const filteredRepos = githubRepos.filter(repo => 
      repo.name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-24 pb-20 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto px-6">
        
        <div className="flex justify-between items-end mb-10 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">My <span className="text-blue-600">Projects</span></h1>
            <p className="text-slate-500 font-medium mt-2">Track your AI-generated capstone projects.</p>
          </div>
          <Link to="/student" className="text-sm font-bold text-slate-400 hover:text-slate-600">← Back to Dashboard</Link>
        </div>

        {loading ? (
          <div className="text-center py-20 opacity-50 font-bold animate-pulse">Loading Workspace...</div>
        ) : projects.length === 0 && !githubToken ? (
          <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <div className="text-6xl mb-4 grayscale opacity-20">🚀</div>
            <h3 className="text-xl font-bold text-slate-400">No Active Projects</h3>
            <p className="text-slate-400 mt-2 text-sm mb-6">Go to the Dashboard or Connect GitHub to start.</p>
            <div className="flex gap-4 justify-center">
                <Link to="/student" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all">
                Generate Project
                </Link>
                <button onClick={handleGithubLogin} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all">
                Connect GitHub
                </button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 h-[75vh]">
            
            {/* LEFT: Project List + GitHub Repos */}
            <div className="lg:col-span-4 bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-slate-400 uppercase text-xs tracking-widest">Active Builds</h3>
                {!githubToken && (
                    <button onClick={handleGithubLogin} className="text-[10px] font-bold text-blue-600 hover:underline">Connect GitHub</button>
                )}
              </div>
              
              <div className="overflow-y-auto p-4 space-y-3 flex-grow custom-scrollbar">
                {/* 1. Active Projects List */}
                {projects.map((p, idx) => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedProject(p)}
                    className={`p-5 rounded-2xl cursor-pointer border transition-all ${selectedProject?.id === p.id ? "bg-blue-50 border-blue-200 shadow-inner" : "bg-white border-slate-100 hover:border-blue-100"}`}
                  >
                    <h4 className={`font-bold text-sm mb-1 ${selectedProject?.id === p.id ? "text-blue-700" : "text-slate-700"}`}>{p.title}</h4>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                      <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${p.progress}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase">
                      <span>{p.progress}% Done</span>
                      <span className={p.status === 'Completed' ? "text-green-500" : "text-orange-400"}>{p.status}</span>
                    </div>
                  </div>
                ))}

                {/* 2. 🔥 GITHUB REPO LIST (Displayed Directly Here) */}
                {githubRepos.length > 0 && (
                    <>
                        <div className="mt-6 mb-2 px-2 flex items-center gap-2">
                            <svg className="w-3 h-3 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                            <h3 className="font-black text-slate-300 uppercase text-[10px] tracking-widest">My Repositories</h3>
                        </div>
                        {githubRepos.map(repo => (
                            <a 
                                key={repo.id}
                                href={repo.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 rounded-2xl border border-slate-50 bg-white hover:border-blue-200 hover:shadow-md transition-all group"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-xs text-slate-700 group-hover:text-blue-600 truncate max-w-[150px]">{repo.name}</h4>
                                    <svg className="w-3 h-3 text-slate-300 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{repo.language || "Code"}</span>
                                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">★ {repo.stargazers_count}</span>
                                </div>
                            </a>
                        ))}
                    </>
                )}
              </div>
            </div>

            {/* RIGHT: Workspace & Tasks */}
            <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 flex flex-col relative overflow-hidden">
              {selectedProject ? (
                <>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 leading-tight">{selectedProject.title}</h2>
                      <div className="flex gap-2 mt-3">
                        {selectedProject.tech_stack?.split(',').map((tech, i) => (
                          <span key={i} className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-200 uppercase tracking-wide">{tech.trim()}</span>
                        ))}
                      </div>
                    </div>

                    {/* 🔥 GITHUB REPO CONNECTOR (Top Right) */}
                    <div className="flex items-center gap-3">
                        <div className="relative" ref={popoverRef}>
                            {selectedProject.github_link ? (
                                <a 
                                    href={selectedProject.github_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-full hover:scale-110 transition-all shadow-md group"
                                    title="View Code on GitHub"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                    <span className="absolute top-full mt-2 right-0 w-max px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Open Repo</span>
                                </a>
                            ) : (
                                <button 
                                    onClick={() => {
                                        setShowGithubPopover(!showGithubPopover);
                                        // Auto-fetch if token exists
                                        if (!showGithubPopover && githubToken) fetchGithubRepos(githubToken);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-full text-xs font-bold hover:bg-slate-200 transition-all border border-slate-200"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                    Connect Repo
                                </button>
                            )}

                            {/* 🔥 GITHUB REPO PICKER POPOVER */}
                            {showGithubPopover && (
                                <div className="absolute top-full right-0 mt-3 w-80 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs font-black text-slate-400 uppercase">Select Repository</h4>
                                        <button onClick={() => setShowGithubPopover(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                                    </div>

                                    {!githubToken ? (
                                        <div className="text-center py-4">
                                            <p className="text-xs text-slate-500 mb-3">Connect GitHub to fetch your repositories.</p>
                                            <button 
                                                onClick={handleGithubLogin} 
                                                className="w-full py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                                Login via GitHub
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <input 
                                                type="text" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:border-blue-500 outline-none mb-3"
                                                placeholder="Search your repos..."
                                                value={repoSearch}
                                                onChange={(e) => setRepoSearch(e.target.value)}
                                            />
                                            
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                                                {loadingRepos ? (
                                                    <p className="text-center text-xs text-slate-400 py-4">Fetching repos...</p>
                                                ) : filteredRepos.length > 0 ? (
                                                    filteredRepos.map((repo) => (
                                                        <button 
                                                            key={repo.id}
                                                            onClick={() => linkRepo(repo.html_url)}
                                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-700 flex justify-between items-center group transition-colors"
                                                        >
                                                            <span className="truncate max-w-[180px]">{repo.name}</span>
                                                            <span className="text-blue-600 text-[10px] uppercase opacity-0 group-hover:opacity-100 transition-opacity">Connect</span>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <p className="text-center text-xs text-slate-400 py-4">No repositories found.</p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <button onClick={() => deleteProject(selectedProject.id)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
                            🗑️
                        </button>
                    </div>
                  </div>

                  <p className="text-slate-600 font-medium leading-relaxed mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    {selectedProject.description}
                  </p>

                  <div className="flex-grow overflow-y-auto custom-scrollbar">
                    <h3 className="font-black text-slate-400 uppercase text-xs tracking-widest mb-4">✅ Daily Development Tasks</h3>
                    <div className="space-y-3">
                      {selectedProject.tasks && selectedProject.tasks.length > 0 ? (
                        selectedProject.tasks.map((task, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => toggleTask(projects.findIndex(p => p.id === selectedProject.id), idx)}
                            className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all group ${task.completed ? "bg-green-50 border-green-100 opacity-60" : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-md"}`}
                          >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? "bg-green-500 border-green-500 text-white" : "border-slate-300 group-hover:border-blue-400"}`}>
                              {task.completed && "✓"}
                            </div>
                            <span className={`font-bold text-sm ${task.completed ? "text-green-700 line-through" : "text-slate-700"}`}>
                              {task.text}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-slate-400 text-sm font-bold">No tasks generated.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="text-6xl mb-6 grayscale opacity-10">📂</div>
                    <h3 className="text-xl font-bold text-slate-300">Select a project or repository</h3>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}