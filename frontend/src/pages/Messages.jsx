import { useState, useEffect, useRef } from "react";
import { supabase } from "../services/supabaseClient";

export default function Messages() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);
  const scrollRef = useRef();

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
        if (activeChat && (newMsg.sender_id === activeChat.id || newMsg.sender_id === user.id)) {
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
        fetchConversations(user.id); 
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [user, activeChat]);

  const fetchConversations = async (userId) => {
    const { data: sent } = await supabase.from('messages').select('receiver_id').eq('sender_id', userId);
    const { data: received } = await supabase.from('messages').select('sender_id').eq('receiver_id', userId);

    const contactIds = [...new Set([
      ...(sent?.map(m => m.receiver_id) || []), 
      ...(received?.map(m => m.sender_id) || [])
    ])];

    const mockContacts = contactIds.map(id => {
        const generatedName = `User ${id.slice(0, 4)}`;
        return {
            id: id,
            name: generatedName,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(generatedName)}&background=random&color=fff&size=128`,
            role: "Contact"
        };
    });

    setConversations(mockContacts);
  };

  const loadChat = async (contact) => {
    setActiveChat(contact);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    
    setMessages(data || []);
    scrollToBottom();
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async (e) => {
    e?.preventDefault(); 
    if (!newMessage.trim() && !attachment) return;

    const finalContent = attachment 
        ? `${newMessage} \n\n📎 [Attachment: ${attachment.name}]` 
        : newMessage;

    await supabase.from('messages').insert([{
      sender_id: user.id,
      receiver_id: activeChat.id,
      content: finalContent,
    }]);

    setNewMessage("");
    removeAttachment();
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div className="h-screen bg-[#F8FAFC] pt-24 pb-6 px-6 font-sans flex text-slate-900">
      
      {/* 🔥 CSS FOR COWARDLY GOAT UI (Corrected Sibling Selectors) */}
      <style>{`
        .container-ia-chat {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: end;
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
        }

        /* INPUT FIELD (Must be first in DOM for ~ selectors to work) */
        .input-text {
          width: 100%;
          margin-left: 110px; /* Space for Camera, Image, Folder icons */
          padding: 1rem 1.5rem;
          padding-right: 50px;
          border-radius: 50px;
          border: none;
          outline: none;
          background-color: #f1f5f9;
          color: #334155;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.05);
          z-index: 10;
        }

        .input-text::placeholder { color: #94a3b8; font-weight: 600; }

        /* When focused/typing, collapse left margin */
        .input-text:focus,
        .input-text:not(:placeholder-shown) {
          margin-left: 10px;
        }

        /* ICONS CONTAINER (Positioned absolute left) */
        .container-upload-files {
          position: absolute;
          left: 0;
          display: flex;
          gap: 8px;
          color: #94a3b8;
          transition: all 0.5s;
          z-index: 5;
        }

        .upload-file {
          padding: 6px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .upload-file:hover { color: #475569; transform: scale(1.1); }

        /* Hide icons when input is active */
        .input-text:focus ~ .container-upload-files,
        .input-text:not(:placeholder-shown) ~ .container-upload-files {
          opacity: 0;
          visibility: hidden;
          transform: translateX(-20px);
          pointer-events: none;
        }

        /* SEND BUTTON (Hidden by default) */
        .label-text {
          position: absolute;
          right: 6px;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          outline: none;
          cursor: pointer;
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.05);
          z-index: 20;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          opacity: 0;
          transform: scale(0.5);
          visibility: hidden;
          pointer-events: none;
        }

        /* Show Send Button when input has text */
        .input-text:not(:placeholder-shown) ~ .label-text {
          opacity: 1;
          visibility: visible;
          transform: scale(1);
          pointer-events: all;
        }

        /* VOICE BUTTON (Visible by default) */
        .label-voice {
          position: absolute;
          right: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.5s;
          color: #64748b;
          z-index: 15;
        }

        /* Hide Voice Button when typing */
        .input-text:not(:placeholder-shown) ~ .label-voice {
          opacity: 0;
          visibility: hidden;
          transform: scale(0.5);
        }
      `}</style>

      <div className="max-w-7xl w-full mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden flex">
        
        {/* SIDEBAR */}
        <div className="w-1/3 border-r border-slate-100 bg-slate-50/50 flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Messages</h2>
          </div>
          <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2">
            {conversations.length === 0 ? (
              <p className="text-center text-xs font-bold text-slate-400 mt-10">No conversations yet.</p>
            ) : (
              conversations.map((contact) => (
                <div 
                  key={contact.id} 
                  onClick={() => loadChat(contact)}
                  className={`p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all ${activeChat?.id === contact.id ? "bg-white shadow-md border border-slate-100" : "hover:bg-white hover:shadow-sm"}`}
                >
                  <img 
                    src={contact.avatar} 
                    alt={contact.name} 
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=User&background=ccc&color=fff"; }} 
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{contact.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Click to Chat</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className="w-2/3 flex flex-col bg-white">
          {activeChat ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-white/80 backdrop-blur-md z-10">
                <img src={activeChat.avatar} alt="Active" className="w-10 h-10 rounded-full border border-slate-100 shadow-sm" />
                <div>
                  <h3 className="font-black text-lg text-slate-800">{activeChat.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-400">Online</span>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-[#F8FAFC]">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] p-4 rounded-2xl text-sm font-medium shadow-sm whitespace-pre-wrap ${isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"}`}>
                        {msg.content}
                        <div className={`text-[9px] font-bold mt-1 text-right opacity-70 ${isMe ? "text-blue-100" : "text-slate-300"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef}></div>
              </div>

              {/* 🔥 NEW UI: INPUT AREA */}
              <div className="p-6 border-t border-slate-100 bg-white">
                
                {/* Attachment Preview */}
                {attachment && (
                    <div className="mb-4 flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl w-fit border border-blue-100 animate-in fade-in slide-in-from-bottom-2">
                        <span className="text-xs font-bold text-blue-600 truncate max-w-[200px]">📎 {attachment.name}</span>
                        <button onClick={removeAttachment} className="text-blue-400 hover:text-blue-700 font-bold ml-2">✕</button>
                    </div>
                )}

                {/* --- CUSTOM CHAT INPUT COMPONENT --- */}
                <div className="container-ia-chat">
                  
                  {/* Hidden Real File Input */}
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

                  {/* 🔥 CRITICAL ORDER: 
                    Input must be FIRST for sibling selectors (~) to work on subsequent elements 
                  */}
                  <input 
                    className="input-text" 
                    type="text" 
                    placeholder="Ask Anything..." 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage(e)}
                  />

                  {/* 1. LEFT ICONS (Hidden when typing) */}
                  <div className="container-upload-files">
                    {/* Camera */}
                    <div className="upload-file" title="Camera" onClick={() => fileInputRef.current?.click()}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                    </div>
                    {/* Image */}
                    <div className="upload-file" title="Gallery" onClick={() => fileInputRef.current?.click()}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    </div>
                    {/* Folder */}
                    <div className="upload-file" title="File" onClick={() => fileInputRef.current?.click()}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                  </div>

                  {/* 2. SEND BUTTON (Visible when typing) */}
                  <button className="label-text" onClick={sendMessage} title="Send Message">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5"></line>
                        <polyline points="5 12 12 5 19 12"></polyline>
                    </svg>
                  </button>

                  {/* 3. VOICE BUTTON (Visible when empty) */}
                  <div className="label-voice">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                  </div>

                </div>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-300">
              <div className="text-6xl mb-4 grayscale opacity-20">💬</div>
              <h3 className="text-xl font-black">Select a conversation</h3>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}