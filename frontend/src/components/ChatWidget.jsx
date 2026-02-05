import { useState, useEffect, useRef } from "react";
import { supabase } from "../services/supabaseClient";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [view, setView] = useState("list"); // 'list', 'chat', 'directory'
  
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [directory, setDirectory] = useState([]); 
  const [searchQuery, setSearchQuery] = useState("");
  
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef();
  
  // Ref for file input
  const fileInputRef = useRef(null);

  // --- 1. SETUP & DATA ---
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchConversations(user.id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!user) return;
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new;
        if (activeChat && newMsg.sender_id === activeChat.id) {
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
        fetchConversations(user.id);
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [user, activeChat]);

  // --- 2. DATA FETCHING ---
  const fetchConversations = async (userId) => {
    const { data: sent } = await supabase.from('messages').select('receiver_id').eq('sender_id', userId);
    const { data: received } = await supabase.from('messages').select('sender_id').eq('receiver_id', userId);
    
    const contactIds = [...new Set([...(sent?.map(m => m.receiver_id)||[]), ...(received?.map(m => m.sender_id)||[])])];
    
    if (contactIds.length === 0) {
        setConversations([]);
        return;
    }

    const { data: profiles } = await supabase.from('profiles').select('*').in('id', contactIds);
    
    const chats = (profiles || []).map(p => ({
        id: p.id,
        name: p.full_name || p.email?.split('@')[0] || "User",
        avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${p.email}&background=0F172A&color=fff`,
        isOnline: false 
    }));
    
    setConversations(chats);
  };

  const fetchDirectory = async () => {
    if (!user) return;
    const myRole = user.user_metadata?.user_role || 'student';
    const targetRole = myRole === 'student' ? 'recruiter' : 'student';

    let query = supabase.from('profiles').select('*').neq('id', user.id);
    if (targetRole) query = query.eq('role', targetRole);

    const { data, error } = await query;
    if (error) return;

    const realUsers = data.map(u => ({
      id: u.id,
      name: u.full_name || u.email?.split('@')[0] || "User",
      role: u.role ? (u.role.charAt(0).toUpperCase() + u.role.slice(1)) : "User",
      avatar: u.avatar_url || `https://ui-avatars.com/api/?name=${u.email}&background=random`,
      isOnline: false 
    }));

    setDirectory(realUsers);
  };

  const openDirectory = () => {
    setView("directory");
    fetchDirectory();
  };

  const startChat = (contact) => {
    setActiveChat(contact);
    setView("chat");
    loadChatMessages(contact);
  };

  const loadChat = (contact) => {
    setActiveChat(contact);
    setView("chat");
    loadChatMessages(contact);
  };

  const loadChatMessages = async (contact) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    scrollToBottom();
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;
    
    const tempMsg = {
      id: Date.now(),
      sender_id: user.id,
      content: newMessage,
      created_at: new Date().toISOString()
    };
    setMessages([...messages, tempMsg]);
    scrollToBottom();
    const msgToSend = newMessage;
    setNewMessage("");

    await supabase.from('messages').insert([{
      sender_id: user.id,
      receiver_id: activeChat.id,
      content: msgToSend
    }]);
    
    fetchConversations(user.id);
  };

  const scrollToBottom = () => setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

  // --- STYLES ---
  const styles = `
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes popIn { 0% { transform: scale(0.9) opacity(0); } 80% { transform: scale(1.05); opacity( 1); } 100% { transform: scale(1); opacity: 1; } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
    .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
    .animate-pop-in { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    .animate-float:hover { animation: float 2s ease-in-out infinite; }

    /* 🔥 COWARDLY GOAT CSS FIX */
    .container-ia-chat {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: end;
      width: 100%;
      height: 50px; /* Explicit height to help centering */
    }

    /* INPUT FIELD */
    .input-text {
      width: 100%;
      height: 44px; /* Fixed height for pill shape */
      margin-left: 110px; /* Space for the 3 icons */
      padding: 0 50px 0 20px; /* Left pad text, Right pad for Voice/Send */
      border-radius: 50px;
      border: none;
      outline: none;
      background-color: #f1f5f9; /* Slate-100 pill color */
      color: #334155;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.05);
      z-index: 10; /* Above icons */
      position: relative;
    }

    .input-text::placeholder { color: #94a3b8; font-weight: 500; }

    /* ANIMATION: When typing, expand input left */
    .input-text:focus,
    .input-text:not(:placeholder-shown) {
      margin-left: 0px;
    }

    /* ICONS CONTAINER (Left Side) */
    .container-upload-files {
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%); /* Vertically center */
      display: flex;
      gap: 12px;
      color: #94a3b8;
      transition: all 0.5s;
      z-index: 5; /* Below input */
    }

    .upload-file {
      cursor: pointer;
      transition: transform 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .upload-file:hover { color: #64748b; transform: scale(1.1); }

    /* Hide Icons when Input Expands */
    .input-text:focus ~ .container-upload-files,
    .input-text:not(:placeholder-shown) ~ .container-upload-files {
      opacity: 0;
      transform: translateY(-50%) translateX(-20px);
      pointer-events: none;
    }

    /* SEND BUTTON (Hidden by default) */
    .label-text {
      position: absolute;
      right: 5px;
      top: 50%;
      transform: translateY(-50%) scale(0.5); /* Centered but small */
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.05);
      z-index: 20;
      background: #3b82f6;
      color: white;
      border-radius: 50%;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    /* Show Send Button when Typing */
    .input-text:not(:placeholder-shown) ~ .label-text {
      opacity: 1;
      visibility: visible;
      transform: translateY(-50%) scale(1); /* Pop in */
      pointer-events: all;
    }

    /* VOICE BUTTON (Visible by default) */
    .label-voice {
      position: absolute;
      right: 15px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.5s;
      color: #64748b;
      z-index: 15;
    }

    /* Hide Voice Button when Typing */
    .input-text:not(:placeholder-shown) ~ .label-voice {
      opacity: 0;
      transform: translateY(-50%) scale(0);
    }
  `;

  return (
    <>
      <style>{styles}</style>

      {/* --- LAUNCHER --- */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-full shadow-2xl shadow-blue-900/20 hover:scale-110 hover:shadow-blue-600/30 transition-all duration-500 animate-pop-in group"
        >
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
          <svg className="w-7 h-7 animate-float" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* --- WIDGET CONTAINER --- */}
      <div 
        className={`fixed bottom-0 right-6 z-50 w-96 bg-white/95 backdrop-blur-xl rounded-t-[1.5rem] shadow-[0_-5px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-200/60 flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) origin-bottom-right ${
          isOpen 
            ? isExpanded 
              ? "opacity-100 translate-y-0 scale-100 h-[600px]" 
              : "opacity-100 translate-y-0 scale-100 h-16" 
            : "opacity-0 translate-y-10 scale-90 pointer-events-none h-0"
        }`}
      >
        
        {/* --- HEADER --- */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="h-16 flex-shrink-0 bg-white/50 border-b border-slate-100 flex items-center justify-between px-5 cursor-pointer rounded-t-[1.5rem] hover:bg-white/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            {(view === 'chat' || view === 'directory') && (
               <button onClick={(e) => { e.stopPropagation(); setView('list'); }} className="p-1 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
               </button>
            )}
            
            <div className="flex flex-col">
              <span className="font-black text-slate-800 text-sm tracking-tight block">
                {view === 'directory' ? 'New Message' : view === 'chat' ? activeChat.name : 'Messages'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                {view === 'directory' ? 'Find People' : view === 'chat' ? 'Active Now' : 'Inbox'}
              </span>
            </div>
          </div>
          
          <div className="flex gap-1 items-center">
             {view === 'list' && (
               <button onClick={(e) => { e.stopPropagation(); openDirectory(); }} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-all mr-1">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
               </button>
             )}

             <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
               {isExpanded ? 
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg> :
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
               }
             </button>
             <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </div>

        {/* --- CONTENT AREA --- */}
        <div className={`flex-grow flex flex-col overflow-hidden bg-[#F8FAFC] transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0"}`}>
          
          {/* VIEW 1: CONVERSATION LIST */}
          {view === "list" && (
            <div className="flex-grow overflow-y-auto p-3 space-y-2">
              {conversations.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-300 animate-slide-up">
                   <div className="text-4xl mb-2">📬</div>
                   <p className="text-xs font-bold">No messages yet</p>
                   <button onClick={openDirectory} className="mt-4 text-blue-600 text-xs font-bold hover:underline">Start a chat</button>
                 </div>
              ) : (
                conversations.map((c, idx) => (
                  <div 
                    key={c.id} 
                    onClick={() => loadChat(c)} 
                    className="p-3 rounded-2xl flex items-center gap-4 bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-blue-100 cursor-pointer transition-all duration-300 group animate-slide-up"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div className="relative">
                      <img src={c.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                      {c.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>}
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-sm font-black text-slate-700 group-hover:text-blue-600 transition-colors">{c.name}</h4>
                      <p className="text-xs text-slate-400 truncate font-medium">Click to open chat</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VIEW 2: DIRECTORY */}
          {view === "directory" && (
            <div className="flex-grow flex flex-col">
              <div className="p-3 bg-white border-b border-slate-100">
                <input 
                  autoFocus
                  placeholder="Search name..."
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex-grow overflow-y-auto p-3 space-y-2">
                {directory.length === 0 ? (
                  <div className="text-center p-4 text-slate-400 text-xs">No users found.</div>
                ) : (
                  directory
                  .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((u, idx) => (
                  <div 
                    key={u.id} 
                    onClick={() => startChat(u)} 
                    className="p-3 rounded-2xl flex items-center gap-4 bg-white border border-slate-100 hover:bg-blue-50 cursor-pointer transition-all animate-slide-up"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <img src={u.avatar} className="w-10 h-10 rounded-full" />
                    <div>
                      <h4 className="text-sm font-black text-slate-800">{u.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{u.role}</p>
                    </div>
                    <div className="ml-auto bg-blue-100 text-blue-600 p-2 rounded-full">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                  </div>
                )))}
              </div>
            </div>
          )}

{/* VIEW 3: ACTIVE CHAT */}
          {view === "chat" && (
            <>
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id;
                  
                  // 🔥 CHECK FOR SYSTEM MSG (Recruiter Updates)
                  const isSystem = msg.type === "email_update"; 

                  // 1. Render System Notification (e.g. Rejection/Invite)
                  if (isSystem) {
                      return (
                          <div key={i} className="flex justify-center animate-slide-up">
                              <div className="max-w-[90%] bg-blue-50 border border-blue-100 text-slate-600 p-4 rounded-xl text-xs font-medium text-center shadow-sm">
                                  <span className="block text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-2">📢 Application Update</span>
                                  {msg.content}
                              </div>
                          </div>
                      );
                  }

                  // 2. Render Standard Chat Message
                  return (
                    <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-slide-up`}>
                      <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-bold leading-relaxed shadow-sm transition-all hover:scale-[1.02] ${
                        isMe 
                        ? "bg-slate-900 text-white rounded-tr-sm shadow-slate-900/10" 
                        : "bg-white text-slate-600 border border-slate-100 rounded-tl-sm shadow-slate-200/50"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  )
                })}
                <div ref={scrollRef}></div>
              </div>

              {/* 🔥 ANIMATED INPUT AREA */}
              <div className="p-3 bg-white border-t border-slate-100">
                <div className="container-ia-chat">
                  
                  {/* File Input (Hidden) */}
                  <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => alert(`File selected: ${e.target.files[0]?.name}`)} />

                  {/* 1. MAIN INPUT (Must be FIRST for sibling selector logic) */}
                  <input 
                    className="input-text" 
                    type="text" 
                    placeholder="Ask Anything..." 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage(e)}
                  />

                  {/* 2. ICONS (Left - Sibling) */}
                  <div className="container-upload-files">
                    {/* Camera */}
                    <div className="upload-file" onClick={() => fileInputRef.current?.click()} title="Camera">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    </div>
                    {/* Gallery */}
                    <div className="upload-file" onClick={() => fileInputRef.current?.click()} title="Gallery">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    {/* Folder */}
                    <div className="upload-file" onClick={() => fileInputRef.current?.click()} title="Files">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                  </div>

                  {/* 3. SEND BUTTON (Right - Sibling) */}
                  <button className="label-text" onClick={sendMessage}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  </button>

                  {/* 4. VOICE ICON (Right - Sibling) */}
                  <div className="label-voice">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                  </div>

                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}