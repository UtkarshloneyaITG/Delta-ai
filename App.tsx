
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  MessageSquare,
  FileText,
  Code,
  HelpCircle,
  Settings,
  History,
  Search,
  Trash2,
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  Send,
  MoreVertical,
  Copy,
  Download,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw
} from 'lucide-react';
import { Session, Message, AIMode, AIRole, UserSettings } from './types';
import { geminiService } from './services/geminiService';
import { MODELS, SUGGESTIONS } from './constants';

const App: React.FC = () => {
  // State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    model: 'gemini-3-flash-preview',
    temperature: 0.7,
    maxTokens: 2048,
    sidebarCollapsed: false
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const savedSessions = localStorage.getItem('Delta_sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) setActiveSessionId(parsed[0].id);
    } else {
      createNewSession();
    }

    const savedSettings = localStorage.getItem('Delta_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('Delta_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('Delta_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.replace('bg-slate-50', 'bg-slate-900');
      document.body.classList.replace('text-slate-900', 'text-slate-100');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.replace('bg-slate-900', 'bg-slate-50');
      document.body.classList.replace('text-slate-100', 'text-slate-900');
    }
  }, [settings]);

  // Scrolling
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isStreaming]);

  const createNewSession = async (initialPrompt?: string) => {
    const id = Date.now().toString();
    const newSession: Session = {
      id,
      title: initialPrompt ? 'New Conversation' : 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      mode: AIMode.CHAT,
      role: AIRole.GENERAL
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(id);
    return id;
  };

  const handleSendMessage = async (textOverride?: string) => {
    const text = textOverride || inputValue;
    if (!text.trim() || isStreaming) return;

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      targetSessionId = await createNewSession();
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      mode: activeSession?.mode || AIMode.CHAT
    };

    setSessions(prev => prev.map(s => {
      if (s.id === targetSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMsg],
          lastUpdatedAt: Date.now()
        };
      }
      return s;
    }));

    setInputValue('');
    setIsStreaming(true);

    // Initial AI message placeholder
    const aiMsgId = (Date.now() + 1).toString();
    const initialAiMsg: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      mode: activeSession?.mode || AIMode.CHAT
    };

    setSessions(prev => prev.map(s => {
      if (s.id === targetSessionId) {
        return { ...s, messages: [...s.messages, initialAiMsg] };
      }
      return s;
    }));

    // Start Streaming
    try {
      const currentSession = sessions.find(s => s.id === targetSessionId);
      const stream = geminiService.streamResponse(
        text,
        currentSession?.messages || [],
        currentSession?.mode || AIMode.CHAT,
        currentSession?.role || AIRole.GENERAL,
        settings.model
      );

      let accumulated = '';
      for await (const chunk of stream) {
        accumulated += chunk;
        setSessions(prev => prev.map(s => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              messages: s.messages.map(m => m.id === aiMsgId ? { ...m, content: accumulated } : m)
            };
          }
          return s;
        }));
      }

      // If this was the first message, generate a title
      if (currentSession?.messages.length === 0) {
        const title = await geminiService.generateTitle(text);
        setSessions(prev => prev.map(s => s.id === targetSessionId ? { ...s, title } : s));
      }
    } catch (err) {
      console.error(err);
      setSessions(prev => prev.map(s => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            messages: s.messages.map(m =>
              m.id === aiMsgId
                ? { ...m, content: "Error: Failed to get response. Please check your network or API key." }
                : m
            )
          };
        }
        return s;
      }));
    } finally {
      setIsStreaming(false);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions.length > 0 ? newSessions[0].id : null);
    }
  };

  const toggleSessionMode = (mode: AIMode) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, mode } : s));
  };

  const toggleSessionRole = (role: AIRole) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, role } : s));
  };

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.messages.some(m => m.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={`flex h-screen w-full transition-colors duration-300 ${settings.theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* Sidebar */}
      <aside className={`flex flex-col border-r transition-all duration-300 ease-in-out ${settings.theme === 'dark' ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white/50'} ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
        <div className="flex items-center justify-between p-4 border-b border-inherit">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Plus size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight">Delta AI</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-md transition-colors">
            <Menu size={20} />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={() => createNewSession()}
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-md active:scale-95"
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>

          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${settings.theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100/50 border-slate-200'}`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-hide">
          {filteredSessions.map(session => (
            <button
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative ${activeSessionId === session.id ? (settings.theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (settings.theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100')}`}
            >
              <div className={`p-1.5 rounded-lg ${activeSessionId === session.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
                {session.mode === AIMode.CHAT && <MessageSquare size={14} />}
                {session.mode === AIMode.DOCUMENT && <FileText size={14} />}
                {session.mode === AIMode.CODE && <Code size={14} />}
                {session.mode === AIMode.EXPLANATION && <HelpCircle size={14} />}
              </div>
              <div className="flex-1 text-left truncate text-sm font-medium">
                {session.title || 'New Conversation'}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={14} className="text-slate-400 hover:text-red-500" onClick={(e) => deleteSession(session.id, e)} />
              </div>
            </button>
          ))}
        </div>

        <div className={`p-4 border-t border-inherit space-y-2 ${settings.theme === 'dark' ? 'bg-slate-950/80' : 'bg-slate-50/80'}`}>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <Settings size={18} className="text-slate-400" />
            <span>Settings</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-red-500 transition-colors">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className={`h-16 flex items-center justify-between px-6 border-b transition-colors backdrop-blur-md sticky top-0 z-10 ${settings.theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/80'}`}>
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                <Menu size={20} />
              </button>
            )}
            <div>
              <h1 className="font-semibold">{activeSession?.title || 'Chat'}</h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                {settings.model.split('-').slice(0, 2).join(' ')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-slate-200/50 dark:bg-slate-800/50 rounded-lg p-1">
              {[AIMode.CHAT, AIMode.DOCUMENT, AIMode.CODE].map(m => (
                <button
                  key={m}
                  onClick={() => toggleSessionMode(m)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeSession?.mode === m ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))}
              className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              {settings.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
          {activeSession?.messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12 space-y-12">
              <div className="text-center space-y-4">
                <div className="inline-flex p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl text-indigo-600 dark:text-indigo-400 mb-2">
                  <Plus size={40} />
                </div>
                <h2 className="text-3xl font-bold">What can I help you build today?</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                  Delta AI can help you write code, design interfaces, draft professional documents, and more. Select a mode to get started.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputValue(s);
                      handleSendMessage(s);
                    }}
                    className={`text-left p-4 rounded-2xl border transition-all hover:shadow-md group ${settings.theme === 'dark' ? 'border-slate-800 bg-slate-800/50 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
                        <MessageSquare size={16} />
                      </div>
                      <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{s}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8 pb-32">
              {activeSession?.messages.map((msg, idx) => (
                <div key={msg.id} className={`flex gap-4 group animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
                    {msg.role === 'user' ? 'U' : 'N'}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {msg.role === 'user' ? 'You' : 'Delta AI'}
                      </span>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded text-slate-400"><Copy size={14} /></button>
                          <button className="p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded text-slate-400"><ThumbsUp size={14} /></button>
                          <button className="p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded text-slate-400"><ThumbsDown size={14} /></button>
                        </div>
                      )}
                    </div>
                    <div className={`text-sm leading-relaxed whitespace-pre-wrap font-normal ${msg.role === 'assistant' && msg.content === '' ? 'animate-pulse' : ''}`}>
                      {msg.content === '' ? (
                        <div className="flex gap-1 py-2">
                          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce"></div>
                          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce [animation-delay:-0.3s]"></div>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-slate-50 dark:from-slate-900 via-slate-50/80 dark:via-slate-900/80 to-transparent pointer-events-none`}>
          <div className="max-w-4xl mx-auto relative pointer-events-auto">
            {/* Persona Selector Pill */}
            <div className="flex justify-center mb-3">
              <div className="flex bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-full px-1.5 py-1 shadow-sm border border-slate-200 dark:border-slate-700">
                {Object.values(AIRole).map(r => (
                  <button
                    key={r}
                    onClick={() => toggleSessionRole(r)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeSession?.role === r ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {r.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className={`relative flex items-end gap-2 p-2 pl-4 rounded-2xl border transition-all focus-within:ring-2 focus-within:ring-indigo-500 shadow-xl ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <textarea
                rows={1}
                placeholder="Message Delta AI..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1 max-h-48 py-2 bg-transparent outline-none resize-none text-sm font-medium"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <div className="flex items-center gap-1">
                <button
                  disabled={!inputValue.trim() || isStreaming}
                  onClick={() => handleSendMessage()}
                  className={`p-2 rounded-xl transition-all ${inputValue.trim() && !isStreaming ? 'bg-indigo-600 text-white shadow-lg active:scale-95' : 'text-slate-400 bg-slate-100 dark:bg-slate-700'}`}
                >
                  {isStreaming ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-center text-slate-400 font-medium">
              Delta AI can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border animate-in zoom-in-95 duration-200 ${settings.theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between p-6 border-b border-inherit">
              <h2 className="text-xl font-bold">Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">AI Model</label>
                <div className="space-y-2">
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSettings(s => ({ ...s, model: m.id }))}
                      className={`w-full flex flex-col text-left p-3 rounded-xl border transition-all ${settings.model === m.id ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      <span className="font-bold text-sm">{m.name}</span>
                      <span className="text-xs text-slate-500">{m.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Creativity (Temperature)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              <div className="pt-4 border-t border-inherit flex gap-3">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
