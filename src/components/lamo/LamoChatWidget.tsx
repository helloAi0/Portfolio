'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface MessageCitation {
  source: string;
  title: string;
  status: string;
  url?: string;
}

interface NavigationPill {
  label: string;
  href: string;
  badge?: string;
}

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  confidence?: string;
  citations?: MessageCitation[];
  suggestedActions?: NavigationPill[];
  isUnanswered?: boolean;
  questionId?: string;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  'Tell me about this engineer.',
  'What robotics projects has he developed?',
  'Does he know ROS 2?',
  'What is his educational background?',
  'Show me his verified skills.',
  'How can I contact him?',
];

export default function LamoChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [followupEmail, setFollowupEmail] = useState<{ [qId: string]: string }>({});
  const [followupStatus, setFollowupStatus] = useState<{ [qId: string]: 'idle' | 'sending' | 'sent' | 'error' }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session ID
  useEffect(() => {
    let sid = typeof window !== 'undefined' ? localStorage.getItem('lamo_session_id') : null;
    if (!sid) {
      sid = 'ses_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      if (typeof window !== 'undefined') {
        localStorage.setItem('lamo_session_id', sid);
      }
    }
    setSessionId(sid);

    // Initial greeting
    setMessages([
      {
        id: 'msg_welcome',
        role: 'ASSISTANT',
        content:
          'Welcome to the imperial engineering portfolio of Sahil Depurwala. I am **LAMO**, his Personal AI Portfolio Manager. I answer questions regarding his robotics research, autonomous systems, AI/ML models, and verified academic credentials.',
        confidence: 'VERIFIED',
        citations: [
          { source: 'Profile:SahilDepurwala', title: 'Sahil Depurwala Profile', status: 'VERIFIED', url: '/journey' },
        ],
        suggestedActions: [
          { label: 'Explore Robotics', href: '/projects?category=Robotics' },
          { label: 'Academic Journey', href: '/journey' },
          { label: 'Coding Arena', href: '/coding-arena' },
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      role: 'USER',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/lamo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId,
        }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: 'asst_' + Date.now(),
        role: 'ASSISTANT',
        content: data.answer || "I don't currently have verified information about that specific experience. I can forward this question to the portfolio owner for clarification.",
        confidence: data.confidence || 'UNKNOWN',
        citations: data.citations || [],
        suggestedActions: data.suggestedActions || [],
        isUnanswered: !!data.isUnanswered,
        questionId: data.questionId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('LAMO chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'asst_err_' + Date.now(),
          role: 'ASSISTANT',
          content: "I don't currently have verified information about that specific experience. I can forward this question to the portfolio owner for clarification.",
          confidence: 'UNKNOWN',
          citations: [],
          suggestedActions: [{ label: 'View Projects', href: '/projects' }],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowupSubmit = async (qId: string) => {
    const email = followupEmail[qId]?.trim();
    if (!email) return;

    setFollowupStatus((prev) => ({ ...prev, [qId]: 'sending' }));

    try {
      const res = await fetch('/api/lamo/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: qId,
          visitorEmail: email,
        }),
      });

      if (res.ok) {
        setFollowupStatus((prev) => ({ ...prev, [qId]: 'sent' }));
      } else {
        setFollowupStatus((prev) => ({ ...prev, [qId]: 'error' }));
      }
    } catch {
      setFollowupStatus((prev) => ({ ...prev, [qId]: 'error' }));
    }
  };

  const clearChat = () => {
    const sid = 'ses_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    setSessionId(sid);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lamo_session_id', sid);
    }
    setMessages([
      {
        id: 'msg_welcome_' + Date.now(),
        role: 'ASSISTANT',
        content: 'Conversation history reset. How may I assist you with Sahil Depurwala\'s engineering portfolio?',
        confidence: 'VERIFIED',
        citations: [],
        suggestedActions: [
          { label: 'Robotics Projects', href: '/projects?category=Robotics' },
          { label: 'Technical Skills', href: '/skills' },
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center space-x-3 px-4 py-3 bg-[#0d1017]/95 hover:bg-[#151923] border border-[#d4af37]/60 hover:border-[#d4af37] text-[#e2e8f0] rounded-full shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95"
          aria-label="Open LAMO AI Portfolio Manager"
        >
          {/* Glowing pulse ring */}
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#d4af37]/30 to-[#ffd700]/10 blur opacity-60 group-hover:opacity-100 transition duration-300"></span>

          {/* Horse / Imperial Shield Icon */}
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#1b202c] border border-[#d4af37]/80 text-[#d4af37] font-serif text-sm font-bold shadow-inner">
            Λ
          </div>

          <div className="relative text-left pr-1">
            <div className="text-[10px] tracking-widest uppercase font-mono text-[#d4af37] font-semibold">
              AI Manager
            </div>
            <div className="text-xs font-semibold text-white tracking-wide">
              Ask LAMO
            </div>
          </div>

          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[440px] h-[600px] max-h-[85vh] flex flex-col bg-[#0b0d13] border border-[#d4af37]/40 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#11151f] border-b border-[#d4af37]/20">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#181d28] border border-[#d4af37] flex items-center justify-center text-[#d4af37] font-serif font-bold text-sm">
                Λ
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-serif font-bold text-white tracking-wide">
                    LAMO
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 font-mono">
                    PORTFOLIO AI
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-mono">
                  Sahil Depurwala • Verified Knowledge
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={clearChat}
                title="Reset conversation"
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[88%] rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'USER'
                      ? 'bg-gradient-to-r from-[#212735] to-[#1a1f2b] text-white border border-[#d4af37]/30 rounded-br-none shadow-md'
                      : 'bg-[#121622] text-gray-200 border border-gray-800/80 rounded-bl-none shadow-lg'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Verification Badge */}
                  {msg.role === 'ASSISTANT' && msg.confidence && (
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                          msg.confidence === 'VERIFIED'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                            : msg.confidence === 'OWNER_CONFIRMED'
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                            : msg.confidence === 'IN_PROGRESS'
                            ? 'bg-blue-950/60 text-blue-400 border border-blue-800/50'
                            : 'bg-neutral-900 text-gray-400 border border-gray-800'
                        }`}
                      >
                        {msg.confidence}
                      </span>

                      {msg.questionId && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          Ref: {msg.questionId}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Citations List */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                        Verified Sources:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {msg.citations.map((c, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1c2230] text-gray-300 border border-gray-700/60"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] mr-1"></span>
                            {c.title || c.source}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Navigation Actions */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, idx) => (
                        <Link
                          key={idx}
                          href={action.href}
                          onClick={() => setIsOpen(false)}
                          className="text-[11px] font-mono px-2 py-1 rounded bg-[#181d29] hover:bg-[#22293a] text-[#d4af37] hover:text-[#ffd700] border border-[#d4af37]/30 hover:border-[#d4af37] transition inline-flex items-center space-x-1"
                        >
                          <span>{action.label}</span>
                          <span>→</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Inline Follow-up capture for Unanswered Questions */}
                  {msg.isUnanswered && msg.questionId && (
                    <div className="mt-3 p-2.5 rounded-lg bg-[#181d28] border border-amber-500/30">
                      <p className="text-[11px] text-amber-200/90 mb-2">
                        Would you like Sahil to follow up with you directly once he answers?
                      </p>

                      {followupStatus[msg.questionId] === 'sent' ? (
                        <div className="text-[11px] text-emerald-400 font-mono">
                          ✓ Notification saved. Sahil has been notified!
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="email"
                            placeholder="Your email address"
                            value={followupEmail[msg.questionId] || ''}
                            onChange={(e) =>
                              setFollowupEmail({ ...followupEmail, [msg.questionId!]: e.target.value })
                            }
                            className="flex-1 px-2 py-1 text-xs bg-[#0f121a] border border-gray-700 rounded text-white focus:outline-none focus:border-[#d4af37]"
                          />
                          <button
                            onClick={() => handleFollowupSubmit(msg.questionId!)}
                            disabled={followupStatus[msg.questionId] === 'sending'}
                            className="px-2.5 py-1 text-xs bg-[#d4af37] hover:bg-[#aa7c11] text-black font-semibold rounded transition"
                          >
                            {followupStatus[msg.questionId] === 'sending' ? 'Saving...' : 'Notify Me'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-gray-500 font-mono mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-center space-x-2 p-3 bg-[#121622] border border-gray-800 rounded-xl w-24">
                <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Starter Chips */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-gray-800/80 bg-[#0d1017]/80 flex flex-wrap gap-1.5">
              <span className="text-[10px] text-gray-400 font-mono w-full mb-0.5">
                Suggested prompts:
              </span>
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="text-[11px] px-2 py-1 rounded bg-[#161b26] hover:bg-[#202738] text-gray-300 hover:text-white border border-gray-700/60 transition text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <div className="p-3 bg-[#11151f] border-t border-[#d4af37]/20">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Sahil's robotics, AI, or skills..."
                maxLength={400}
                className="flex-1 bg-[#0b0e14] border border-gray-700/70 focus:border-[#d4af37] text-xs sm:text-sm text-white placeholder-gray-500 rounded-lg px-3 py-2.5 focus:outline-none transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="px-3.5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#aa7c11] disabled:opacity-40 text-black font-semibold text-xs sm:text-sm rounded-lg hover:brightness-110 active:scale-95 transition"
                aria-label="Send query"
              >
                Send
              </button>
            </form>
            <div className="flex justify-between items-center mt-1.5 px-1 text-[10px] text-gray-500 font-mono">
              <span>Strict RAG • Grounded Knowledge Only</span>
              <span>{input.length}/400</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
