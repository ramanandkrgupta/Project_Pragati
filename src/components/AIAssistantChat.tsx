import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Bot,
  User as UserIcon,
  HelpCircle,
  Minimize2,
  Trash2,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { sendChatMessage } from '../services/api';
import { ChatMessage, SuggestedProject } from '../types';

const PROMPT_SUGGESTIONS = [
  'Why is this project at risk?',
  'Which projects are becoming high risk?',
  'What projects are delayed?',
  'What changed this month?',
  'Which projects require intervention?',
  'Explain this project\'s risk.',
  'Show projects with schedule slippage.',
];

export const AIAssistantChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('Analyzing telemetry...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const projectDetailMatch = location.pathname.match(/^\/projects\/([a-zA-Z0-9_-]+)$/);
  const currentProjectId = projectDetailMatch ? projectDetailMatch[1] : undefined;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'msg-init',
          role: 'model',
          text: 'PRAGATI AI COPILOT initialized. Live telemetry and risk models are loaded.\n\nAsk any question regarding portfolio risks, cost overruns, timeline delays, or recommended officer interventions.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, []);

  const handleSend = async (userText?: string) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || loading) return;

    setErrorMessage(null);
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = newHistory
        .filter((m) => !m.isError && m.id !== 'msg-init')
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const res = await sendChatMessage(textToSend, historyPayload, currentProjectId);

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        role: 'model',
        text: res.reply,
        suggestedProjects: res.suggestedProjects,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errMsg = err.message || 'Failed to communicate with PRAGATI AI Copilot.';
      setErrorMessage(errMsg);

      const errorBotMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'model',
        text: `⚠️ **AI Copilot Notice:** ${errMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorBotMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `msg-${Date.now()}-reset`,
        role: 'model',
        text: 'Telemetry cache reset. Live portfolio monitoring engine active. How can I assist your review?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setErrorMessage(null);
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          id="btn-open-ai-assistant"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-[#003B6F] hover:bg-[#005A9C] px-5 py-3 text-xs font-bold text-white shadow-xl border-2 border-[#E87500] hover:scale-105 active:scale-95 transition-all focus:outline-hidden font-sans"
          aria-label="Open PRAGATI AI Copilot"
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span>PRAGATI AI COPILOT</span>
        </button>
      )}

      {/* Institutional Copilot Chat Window */}
      {isOpen && (
        <div
          id="ai-assistant-modal"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col w-[94vw] sm:w-[460px] h-[600px] max-h-[85vh] rounded-lg bg-white border-2 border-[#003B6F] shadow-2xl overflow-hidden font-sans"
        >
          {/* Institutional Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0B1F33] text-white border-b-2 border-[#E87500]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-[#003B6F] border border-[#005A9C]">
                <Sparkles className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                  PRAGATI AI COPILOT
                </h3>
                <p className="text-[10px] text-slate-400">
                  {currentProjectId ? `Context: ${currentProjectId}` : 'National Infrastructure Telemetry'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300">
              <button
                onClick={handleClearChat}
                title="Clear History"
                className="p-1 hover:text-white"
                aria-label="Clear Chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1 hover:text-white"
                aria-label="Close Copilot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active Context Banner */}
          {currentProjectId && (
            <div className="flex items-center justify-between bg-blue-50 px-3.5 py-1.5 border-b border-blue-200 text-[11px] text-[#003B6F]">
              <span className="font-semibold">Grounded on active project telemetry</span>
              <button
                onClick={() => handleSend(`Give me a detailed risk analysis for project ${currentProjectId}`)}
                className="font-bold underline hover:text-[#005A9C]"
              >
                Analyze Project
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F5F7FA]">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[90%] rounded-lg p-3.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#003B6F] text-white'
                        : m.isError
                        ? 'bg-rose-50 text-[#C62828] border border-rose-200'
                        : 'bg-white text-[#172033] border border-[#D9E1E8] shadow-xs'
                    }`}
                  >
                    <div className="space-y-1.5 whitespace-pre-wrap">
                      {m.text.split('\n').map((paragraph, pIdx) => {
                        if (!paragraph.trim()) return <div key={pIdx} className="h-1" />;
                        return (
                          <p key={pIdx}>
                            {paragraph.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return (
                                  <strong key={i} className="font-bold text-[#003B6F]">
                                    {part.slice(2, -2)}
                                  </strong>
                                );
                              }
                              return part;
                            })}
                          </p>
                        );
                      })}
                    </div>

                    {!isUser && !m.isError && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-[#138808]">
                          <ShieldCheck className="h-3 w-3" />
                          <span>AI-generated assessment — officer review required</span>
                        </span>
                      </div>
                    )}

                    {/* Referenced Projects */}
                    {m.suggestedProjects && m.suggestedProjects.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Referenced Projects:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {m.suggestedProjects.map((sp) => (
                            <button
                              key={sp.id}
                              onClick={() => handleProjectClick(sp.id)}
                              className="inline-flex items-center gap-1 bg-[#F5F7FA] hover:bg-blue-50 px-2 py-0.5 rounded text-[10px] font-semibold text-[#003B6F] border border-slate-200"
                            >
                              <span>{sp.project_name.slice(0, 24)}...</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 rounded bg-white border border-[#D9E1E8] px-3 py-2 text-xs text-slate-600 w-fit">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#003B6F]" />
                <span className="font-semibold text-[11px]">{loadingText}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          {!loading && (
            <div className="px-3 py-2 bg-slate-100 border-t border-[#D9E1E8] overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
              {PROMPT_SUGGESTIONS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="rounded bg-white border border-[#D9E1E8] px-2.5 py-1 text-[10px] font-bold text-[#003B6F] hover:bg-blue-50 transition-colors shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-[#D9E1E8]">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Ask about project risks, delay root causes, recommendations..."
                className="w-full rounded border border-[#D9E1E8] bg-[#F5F7FA] pl-3 pr-10 py-2 text-xs text-[#172033] focus:border-[#005A9C] focus:bg-white focus:outline-hidden"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="absolute right-1.5 rounded p-1.5 text-white bg-[#003B6F] hover:bg-[#005A9C] disabled:bg-slate-300 transition-colors"
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
