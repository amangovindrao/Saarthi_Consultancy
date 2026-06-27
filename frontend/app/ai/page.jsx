"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import AICharacter from "@/components/AICharacter";

const AI_MEMORY_KEY = "consult_ai_fullchat_history";
const MAX_MEMORY = 5;

function loadAIMemory() {
  try {
    const raw = localStorage.getItem(AI_MEMORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch { return null; }
}

function saveAIMemory(messages) {
  try {
    const toSave = messages.filter((m) => m.role === "user" || (m.role === "ai" && m.category !== "greeting")).slice(-MAX_MEMORY * 2);
    localStorage.setItem(AI_MEMORY_KEY, JSON.stringify(toSave));
  } catch {}
}

export default function AIPage() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [aiState, setAiState] = useState("idle");
  const [isLocked, setIsLocked] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }

    const greeting = { role: "ai", content: "Hello! I am your AI assistant. How can I help you today?", category: "greeting" };
    const mem = loadAIMemory();
    if (mem && mem.length > 0) {
      setMessages([
        greeting,
        { role: "ai", content: "💾 I remember our last conversation:", category: "system" },
        ...mem,
        { role: "ai", content: "How can I help you now?", category: "system" },
      ]);
    } else {
      setMessages([greeting]);
    }
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pre-load voices for TTS
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      // Chrome needs this event listener to load voices properly sometimes
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel(); 

    // Remove markdown symbols (**, *, etc.) for cleaner speech
    const cleanText = text.replace(/[*_#`]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-IN"; // Indian English / Hinglish support
    utterance.pitch = 1.05; // Slightly pleasant pitch
    utterance.rate = 1.05; // Slightly faster for natural flow
    
    // Try to find a premium Indian female voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.includes('en-IN') || 
      v.lang.includes('hi-IN') ||
      v.name.includes('India') ||
      v.name.includes('Veena') ||
      v.name.includes('Aditi')
    ) || voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Zira'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setAiState("speaking");
    utterance.onend = () => setAiState("idle");
    utterance.onerror = () => setAiState("idle");

    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (textToSend) => {
    if (!textToSend.trim() || aiState === "thinking") return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: textToSend }]);
    setAiState("thinking");

    try {
      const { data } = await api.post("/ai-chat", { message: textToSend });
      
      setMessages((prev) => {
        const updated = [...prev, { role: "ai", content: data.reply, category: data.category, suggestions: data.suggestions }];
        saveAIMemory(updated);
        return updated;
      });
      
      // Speak the response aloud!
      if (window.speechSynthesis) {
        speakText(data.reply);
      } else {
        setAiState("speaking");
        setTimeout(() => setAiState("idle"), 3000);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setAiState("locked");
        setIsLocked(true);
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "Upgrade required — AI access is not enabled for your account.", category: "locked" }
        ]);
      } else if (err.response?.status === 401) {
        // Handle session expiration (e.g. backend restarted with sqlite)
        alert("Your session has expired. Please log in again.");
        localStorage.removeItem("token");
        router.push("/login");
      } else {
        setAiState("idle");
        setMessages((prev) => [...prev, { role: "ai", content: "Sorry, I encountered an error. Please try again." }]);
      }
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const unlockAI = async () => {
    try {
      setAiState("thinking");
      await api.post("/unlock-ai");
      localStorage.setItem("ai_access", "true");
      setIsLocked(false);
      
      const unlockMsg = "🎉 Premium AI features unlocked! How can I assist you now?";
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: unlockMsg, category: "system" }
      ]);
      
      if (window.speechSynthesis) {
        speakText("Premium AI features unlocked! How can I assist you now?");
      } else {
        setAiState("speaking");
        setTimeout(() => setAiState("idle"), 3000);
      }
    } catch (err) {
      alert("Failed to unlock AI");
      setAiState("locked");
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
  };

  // ---- Voice Input via Web Speech API (free, no paid API) ----
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN"; // Support for Hinglish and Indian English
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setAiState("listening");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentText = finalTranscript || interimTranscript;
      setInput(currentText);

      // Auto-send when the user stops speaking and we have a final transcript
      if (finalTranscript) {
        sendMessage(finalTranscript);
        recognition.stop();
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setAiState("idle");
    };

    recognition.onerror = () => {
      setIsListening(false);
      setAiState("idle");
    };

    recognition.start();
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setAiState("idle");
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-4 text-center sm:mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">AI Assistant</h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">Talk to me — type or use your voice 🎙️</p>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden sm:gap-6">
        {/* Left Panel: AI Character */}
        <div className="hidden w-72 flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-slate-900 to-slate-800 shadow-xl lg:flex relative overflow-hidden">
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent_70%)]" />
          <AICharacter state={aiState} />

          {/* Voice button on AI panel */}
          <button
            onClick={isListening ? stopVoice : startVoice}
            disabled={isLocked}
            className={`mt-6 flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition-all duration-300 ${
              isListening
                ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30 animate-pulse"
                : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/10"
            } disabled:opacity-30`}
          >
            {isListening ? (
              <><span className="h-2 w-2 rounded-full bg-white animate-ping" /> Stop Listening</>
            ) : (
              <><span>🎙️</span> Speak to AI</>
            )}
          </button>
        </div>

        {/* Right Panel: Chat Interface */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 sm:p-6 sm:space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ animation: `fadeIn 0.3s ease-out ${Math.min(idx * 0.05, 0.3)}s both` }}
              >
                <div className={`flex max-w-[90%] flex-col sm:max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-sm sm:px-5 sm:py-3.5 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : msg.category === "locked"
                          ? "bg-red-50 border border-red-100 text-red-800 rounded-bl-sm"
                          : "bg-white border border-slate-100 text-slate-700 rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                    {/* Category Badge */}
                    {msg.category && !["general", "greeting", "system", "locked", "fun"].includes(msg.category) && (
                      <div className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {msg.category}
                      </div>
                    )}
                  </div>

                  {/* Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && msg.role === "ai" && (
                    <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSuggestionClick(sug)}
                          className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-all duration-200 hover:bg-blue-100 hover:shadow-sm hover:-translate-y-0.5 sm:px-3 sm:py-1.5"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Unlock Button */}
                  {msg.category === "locked" && (
                    <button
                      onClick={unlockAI}
                      className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                    >
                      <span>🔓</span> Unlock Premium AI
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {aiState === "thinking" && (
              <div className="flex justify-start" style={{ animation: "fadeIn 0.3s ease-out" }}>
                <div className="rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-5 py-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-blue-400" style={{ animation: "pulse 1s ease-in-out infinite" }} />
                      <div className="h-2 w-2 rounded-full bg-blue-400" style={{ animation: "pulse 1s ease-in-out 0.2s infinite" }} />
                      <div className="h-2 w-2 rounded-full bg-blue-400" style={{ animation: "pulse 1s ease-in-out 0.4s infinite" }} />
                    </div>
                    <span className="text-xs text-slate-400">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input form */}
          <form onSubmit={handleSend} className="border-t border-slate-100 bg-white p-3 sm:p-4">
            <div className="relative flex items-center gap-2">
              {/* Mobile voice button */}
              <button
                type="button"
                onClick={isListening ? stopVoice : startVoice}
                disabled={isLocked}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 lg:hidden ${
                  isListening
                    ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                } disabled:opacity-30`}
              >
                {isListening ? (
                  <div className="h-3 w-3 rounded-sm bg-white" />
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 1a3 3 0 00-3 3v4a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  </svg>
                )}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLocked || aiState === "thinking"}
                placeholder={isListening ? "Listening..." : isLocked ? "AI is locked..." : "Ask me anything..."}
                className={`w-full rounded-2xl border bg-slate-50 py-3 pl-4 pr-14 text-sm transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 sm:py-3.5 sm:pl-5 ${
                  isListening ? "border-pink-300 ring-2 ring-pink-200" : "border-slate-200"
                }`}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLocked || aiState === "thinking"}
                className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m-7 7l7-7 7 7" />
                </svg>
              </button>
            </div>
            {isListening && (
              <p className="mt-2 text-center text-xs text-pink-500 font-medium" style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
                🎙️ Listening... speak now
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
