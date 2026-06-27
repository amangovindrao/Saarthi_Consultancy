"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.booking_id;
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${bookingId}`);
      // Only update if there are new messages to avoid cursor jumping
      setMessages((prev) => {
        if (prev.length !== res.data.length) {
          setTimeout(scrollToBottom, 100);
          return res.data;
        }
        return prev;
      });
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Maybe not authorized or token expired
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await api.get("/me");
        setCurrentUser(userRes.data);
        await fetchMessages();
      } catch (err) {
        if (err.response?.status === 401) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    init();

    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [bookingId, router]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const payload = {
        booking_id: parseInt(bookingId),
        content: newMessage,
      };
      
      // Optimistic update
      const tempMsg = {
        id: Date.now(),
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        content: newMessage,
        sent_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMsg]);
      setNewMessage("");
      setTimeout(scrollToBottom, 50);

      await api.post("/messages", payload);
      await fetchMessages();
    } catch (err) {
      alert("Failed to send message. Make sure the booking is confirmed.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Consultation Chat</h1>
              <p className="text-sm text-slate-500">Booking #{bookingId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-y-auto p-6">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <span className="mb-2 text-4xl">💬</span>
              <p className="text-slate-600">No messages yet. Say hello!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUser?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${
                      isMine
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
                    }`}
                  >
                    {!isMine && (
                      <p className="mb-1 text-xs font-bold text-slate-400">{msg.sender_name}</p>
                    )}
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className={`mt-1 text-right text-[10px] ${isMine ? "text-blue-200" : "text-slate-400"}`}>
                      {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white p-4">
        <form onSubmit={handleSendMessage} className="mx-auto flex max-w-4xl items-center gap-3">
          <input
            type="text"
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-6 py-4 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:opacity-50"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
