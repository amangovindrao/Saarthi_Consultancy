"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const MEMORY_KEY = "consult_ai_chat_history";
const MAX_MEMORY = 5;
const WELCOME_MSG = {
  sender: "ai",
  text: "👋 Hi! I'm your Saarthi Consultancy assistant. I can help you find experts, book consultations, or answer questions.",
  suggestions: ["Book a doctor", "Find teachers", "How does this work?"]
};

function loadMemory() {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return null;
}

function saveMemory(messages) {
  try {
    // Save last MAX_MEMORY user+ai message pairs (skip the welcome)
    const toSave = messages
      .filter((m) => m.sender === "user" || (m.sender === "ai" && m.text !== WELCOME_MSG.text))
      .slice(-MAX_MEMORY * 2);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(toSave));
  } catch {}
}

export default function ChatBot() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [conversationContext, setConversationContext] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [hasMemory, setHasMemory] = useState(false);
  const [showMemoryBanner, setShowMemoryBanner] = useState(false);
  const chatEndRef = useRef(null);

  // On mount, detect if there's stored memory
  useEffect(() => {
    const mem = loadMemory();
    if (mem && mem.length > 0) {
      setHasMemory(true);
    }
  }, []);

  // Restore memory when chat opens for the first time
  useEffect(() => {
    if (isOpen) {
      setPulse(false);
      if (hasMemory) {
        const mem = loadMemory();
        if (mem && mem.length > 0) {
          setMessages([
            WELCOME_MSG,
            {
              sender: "ai",
              text: "💾 I remember our last conversation! Here's what we discussed:",
            },
            ...mem,
            {
              sender: "ai",
              text: "How can I help you today?",
            },
          ]);
          setShowMemoryBanner(true);
          setHasMemory(false); // Only restore once
          setTimeout(() => setShowMemoryBanner(false), 4000);
        }
      }
    }
  }, [isOpen, hasMemory]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save to localStorage on each new message
  const saveMessages = useCallback((msgs) => {
    saveMemory(msgs);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    const newMessages = [...messages, { sender: "user", text: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data } = await api.post("/ai-help", {
        user_query: userMessage,
        conversation_context: conversationContext,
      });

      const aiMsg = {
        sender: "ai",
        text: data.response,
        action: data.action || null,
        data: data.data || null,
        suggestions: data.suggestions || null,
      };

      const updatedMessages = [...newMessages, aiMsg];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);

      setConversationContext((prev) => [
        ...prev,
        { role: "user", text: userMessage },
        {
          role: "ai",
          text: data.response,
          action: data.action,
          data: data.data,
        },
      ]);

      if (data.action === "confirm_booking" && data.data?.selected_expert) {
        const expertId = data.data.selected_expert.id;
        setTimeout(() => {
          if (typeof window !== "undefined" && localStorage.getItem("token")) {
            router.push(`/booking/${expertId}`);
          } else {
            const loginMsg = [...updatedMessages, {
              sender: "ai",
              text: "Please log in first to complete your booking. I'll redirect you to the login page.",
            }];
            setMessages(loginMsg);
            saveMessages(loginMsg);
            setTimeout(() => router.push("/login"), 1500);
          }
        }, 1000);
      }
    } catch {
      const errorMessages = [...newMessages, {
        sender: "ai",
        text: "Sorry, I'm having trouble connecting. Please try again in a moment.",
      }];
      setMessages(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMemory = () => {
    localStorage.removeItem(MEMORY_KEY);
    setMessages([WELCOME_MSG]);
    setConversationContext([]);
    setShowMemoryBanner(false);
  };

  const renderMessage = (text) => {
    const parts = text.split("\n").map((line, i) => {
      const formatted = line.replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="font-semibold">$1</strong>'
      );
      return (
        <span key={i}>
          {i > 0 && <br />}
          <span dangerouslySetInnerHTML={{ __html: formatted }} />
        </span>
      );
    });
    return parts;
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 ${
          isOpen
            ? "rotate-0 bg-slate-800 text-white hover:bg-slate-700"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30 hover:scale-105"
        }`}
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {pulse && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500" />
              </span>
            )}
            {hasMemory && !pulse && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4">
                <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white">💾</span>
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          style={{ animation: "slideUp 0.25s ease-out" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl">
                  🤖
                </div>
                <div>
                  <h3 className="font-bold text-sm">Saarthi Consultancy AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-blue-100">Online • Book & ask questions</span>
                  </div>
                </div>
              </div>
              {/* Clear memory button */}
              <button
                onClick={clearMemory}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs text-white/70 transition hover:bg-white/20 hover:text-white"
                title="Clear chat history"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Memory Banner */}
          {showMemoryBanner && (
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-xs text-amber-700 font-medium flex items-center gap-2"
              style={{ animation: "fadeIn 0.3s ease-out" }}
            >
              <span>💾</span> Previous conversation restored from memory
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                style={{ animation: `fadeIn 0.3s ease-out ${Math.min(i * 0.05, 0.3)}s both` }}
              >
                {msg.sender === "ai" && (
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs text-white">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all duration-200 ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-sm hover:bg-blue-700"
                      : "bg-white text-slate-700 border border-slate-100 rounded-bl-sm hover:shadow-md"
                  }`}
                >
                  {renderMessage(msg.text)}
                  
                  {msg.suggestions && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {msg.suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setInput(s);
                            setTimeout(() => {
                              const form = document.getElementById("chatbot-form");
                              if (form) form.requestSubmit();
                            }, 50);
                          }}
                          className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-600 hover:text-white"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start" style={{ animation: "fadeIn 0.3s ease-out" }}>
                <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs text-white">
                  AI
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-400" style={{ animation: "pulse 1s ease-in-out infinite" }} />
                    <div className="h-2 w-2 rounded-full bg-blue-400" style={{ animation: "pulse 1s ease-in-out 0.15s infinite" }} />
                    <div className="h-2 w-2 rounded-full bg-blue-400" style={{ animation: "pulse 1s ease-in-out 0.3s infinite" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form id="chatbot-form" onSubmit={handleSubmit} className="border-t border-slate-100 bg-white p-3">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-12 text-sm transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:shadow-sm"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m-7 7l7-7 7 7" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
