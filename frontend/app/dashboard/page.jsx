"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [videoInfo, setVideoInfo] = useState(null);
  const [userName, setUserName] = useState("");

  // Rating States
  const [ratingBookingId, setRatingBookingId] = useState(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  // Messaging States
  const [chatBookingId, setChatBookingId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Countdown
  const [countdown, setCountdown] = useState(null);

  // AI usage
  const [aiAccess, setAiAccess] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    if (window.localStorage.getItem("role") === "expert") {
      router.push("/expert-panel");
      return;
    }
    fetchBookings();
    fetchUserInfo();
    setAiAccess(localStorage.getItem("ai_access") === "true");
  }, [router]);

  const fetchUserInfo = async () => {
    try {
      const { data } = await api.get("/me");
      setUserName(data.name || "");
      if (data.ai_access) {
        setAiAccess(true);
        localStorage.setItem("ai_access", "true");
      }
    } catch {}
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Countdown timer for next upcoming booking
  useEffect(() => {
    if (bookings.length === 0) return;
    const confirmed = bookings
      .filter((b) => b.status === "confirmed")
      .map((b) => ({ ...b, time: new Date(b.booking_time).getTime() }))
      .filter((b) => b.time > Date.now())
      .sort((a, b) => a.time - b.time);

    if (confirmed.length === 0) return;
    const nextBooking = confirmed[0];

    const timer = setInterval(() => {
      const diff = nextBooking.time - Date.now();
      if (diff <= 0) {
        setCountdown(null);
        clearInterval(timer);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setCountdown({ days, hours, minutes, seconds, bookingId: nextBooking.id });
    }, 1000);

    return () => clearInterval(timer);
  }, [bookings]);

  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/my-bookings");
      setBookings(data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
      setError(err.response?.data?.detail || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const joinCall = async (bookingId) => {
    try {
      const { data } = await api.get("/video-token", {
        params: { booking_id: bookingId },
      });
      setVideoInfo({ bookingId, channelName: data.channel_name, token: data.token, appId: data.app_id });
    } catch (err) {
      setVideoInfo(null);
      alert(err.response?.data?.detail || "Could not generate video token");
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setRatingSubmitting(true);
    try {
      await api.post("/review", { booking_id: ratingBookingId, rating: Number(ratingVal), comment: ratingComment });
      setRatingSuccess(true);
      setTimeout(() => {
        setRatingBookingId(null);
        setRatingComment("");
        setRatingVal(5);
        setRatingSuccess(false);
        fetchBookings();
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to submit review");
    } finally {
      setRatingSubmitting(false);
    }
  };

  // Messaging functions
  const openChat = async (bookingId) => {
    setChatBookingId(bookingId);
    setChatMessages([]);
    setChatLoading(true);
    try {
      const { data } = await api.get(`/messages/${bookingId}`);
      setChatMessages(data || []);
    } catch (err) {
      // No messages yet is fine
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const content = chatInput.trim();
    setChatInput("");
    try {
      const { data } = await api.post("/messages", { booking_id: chatBookingId, content });
      setChatMessages((prev) => [...prev, data]);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to send message");
    }
  };

  const reasonLabels = {
    general_checkup: "General Checkup",
    symptoms: "Specific Symptoms / Illness",
    follow_up: "Follow-Up Visit",
    prescription: "Prescription / Medication Review",
    lab_results: "Lab Results Discussion",
    second_opinion: "Second Opinion",
    concept_doubt: "Concept Doubt / Clarification",
    exam_prep: "Exam Preparation",
    homework_help: "Homework / Assignment Help",
    career_guidance: "Career Guidance",
    skill_learning: "New Skill / Topic Learning",
    project_help: "Project Guidance",
    other: "Other",
  };

  const paymentLabels = {
    upi: "📱 UPI",
    credit_card: "💳 Credit Card",
    debit_card: "🏧 Debit Card",
    net_banking: "🏦 Net Banking",
  };

  // Stats
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length;
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;

  // Last session
  const sortedByTime = [...bookings].sort((a, b) => new Date(b.booking_time) - new Date(a.booking_time));
  const lastSession = sortedByTime[0] || null;
  const lastSessionDate = lastSession ? new Date(lastSession.booking_time) : null;
  const lastSessionLabel = lastSessionDate
    ? lastSessionDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "No sessions";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <div className="absolute inset-2 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" style={{ animationDirection: "reverse", animationDuration: "0.6s" }} />
        </div>
        <p className="mt-5 font-medium text-slate-600">Loading your dashboard...</p>
        <p className="mt-1 text-xs text-slate-400">Fetching your bookings and sessions</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {userName ? `Welcome back, ${userName.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Manage your consultations and sessions</p>
        </div>
        <button
          onClick={() => router.push("/experts")}
          className="group rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 hover:brightness-110 hover:-translate-y-0.5"
        >
          + New Booking
        </button>
      </div>

      {/* Stats Cards — 5 columns */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl transition-transform duration-300 group-hover:scale-110">📊</div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{totalBookings}</p>
              <p className="text-xs uppercase tracking-wider text-slate-400">Total</p>
            </div>
          </div>
        </div>
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl transition-transform duration-300 group-hover:scale-110">✅</div>
            <div>
              <p className="text-2xl font-extrabold text-emerald-600">{confirmedBookings}</p>
              <p className="text-xs uppercase tracking-wider text-slate-400">Confirmed</p>
            </div>
          </div>
        </div>
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-violet-200">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-xl transition-transform duration-300 group-hover:scale-110">🏆</div>
            <div>
              <p className="text-2xl font-extrabold text-violet-600">{completedBookings}</p>
              <p className="text-xs uppercase tracking-wider text-slate-400">Completed</p>
            </div>
          </div>
        </div>
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-amber-200">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl transition-transform duration-300 group-hover:scale-110">🕐</div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-tight">{lastSessionLabel}</p>
              <p className="text-xs uppercase tracking-wider text-slate-400">Last Session</p>
            </div>
          </div>
        </div>
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-pink-200 cursor-pointer" onClick={() => router.push("/ai")}>
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-transform duration-300 group-hover:scale-110 ${aiAccess ? "bg-emerald-50" : "bg-pink-50"}`}>
              {aiAccess ? "✨" : "🔒"}
            </div>
            <div>
              <p className={`text-sm font-extrabold leading-tight ${aiAccess ? "text-emerald-600" : "text-pink-600"}`}>
                {aiAccess ? "Active" : "Locked"}
              </p>
              <p className="text-xs uppercase tracking-wider text-slate-400">AI Status</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI CTA */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 p-8 text-white shadow-xl relative">
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-3xl shadow-inner backdrop-blur-md transition-transform hover:scale-110">
            ✨
          </div>
          <h2 className="text-2xl font-bold">Have questions? Ask AI</h2>
          <p className="mt-2 max-w-lg text-sm text-slate-300">
            Get instant advice on your career, health, studies, or ask anything else to our intelligent assistant.
          </p>
          <button 
            onClick={() => router.push("/ai")}
            className="mt-6 rounded-xl bg-white px-8 py-3 text-sm font-bold text-slate-900 shadow-xl transition hover:scale-105"
          >
            Ask AI Now
          </button>
        </div>
        
        {/* Decorative background circles */}
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
      </div>

      {/* Countdown Timer */}
      {countdown && (
        <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">⏰ Next Appointment — Booking #{countdown.bookingId}</p>
              <p className="mt-1 text-xs text-blue-200">Get ready for your session!</p>
            </div>
            <div className="flex gap-3">
              {[
                { value: countdown.days, label: "Days" },
                { value: countdown.hours, label: "Hrs" },
                { value: countdown.minutes, label: "Min" },
                { value: countdown.seconds, label: "Sec" },
              ].map((unit) => (
                <div key={unit.label} className="text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 font-mono text-xl font-bold backdrop-blur-sm">
                    {String(unit.value).padStart(2, "0")}
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-blue-200">{unit.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center shadow-sm">
          <span className="mb-4 text-5xl">📅</span>
          <h3 className="text-xl font-bold text-slate-900">No bookings yet</h3>
          <p className="mt-2 text-slate-500">When you book an expert, it will appear here.</p>
          <button onClick={() => router.push("/experts")} className="mt-6 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            Find an Expert
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {bookings.map((booking) => (
            <div key={booking.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-medium text-slate-500">#{booking.id}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  booking.status === "confirmed" ? "bg-emerald-100 text-emerald-700" :
                  booking.status === "completed" ? "bg-blue-100 text-blue-700" :
                  booking.status === "cancelled" ? "bg-red-100 text-red-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {booking.status}
                </span>
              </div>

              {/* Card Body */}
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-lg">🧑‍⚕️</div>
                  <div>
                    <p className="text-xs text-slate-400">Expert</p>
                    <p className="text-sm font-bold text-slate-900">Expert #{booking.expert_id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-lg">📅</div>
                  <div>
                    <p className="text-xs text-slate-400">Scheduled</p>
                    <p className="text-sm font-semibold text-slate-800">{new Date(booking.booking_time).toLocaleString()}</p>
                  </div>
                </div>

                {booking.reason && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-lg">📋</div>
                    <div>
                      <p className="text-xs text-slate-400">Reason</p>
                      <p className="text-sm font-medium text-slate-700">{reasonLabels[booking.reason] || booking.reason}</p>
                    </div>
                  </div>
                )}

                {booking.notes && (
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-400 mb-1">Notes</p>
                    <p className="text-xs text-slate-600 line-clamp-2">{booking.notes}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {booking.urgency === "urgent" && (
                    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">🔴 Urgent</span>
                  )}
                  {booking.preferred_language && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                      🌐 {booking.preferred_language.charAt(0).toUpperCase() + booking.preferred_language.slice(1)}
                    </span>
                  )}
                  {booking.payment_method && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                      {paymentLabels[booking.payment_method] || booking.payment_method}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
                <button type="button" onClick={() => joinCall(booking.id)} disabled={booking.status !== "confirmed"}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400">
                  📹 Join
                </button>
                {["confirmed", "completed"].includes(booking.status) && (
                  <>
                    <Link href={`/messages/${booking.id}`}
                      className="flex-1 flex justify-center items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100">
                      💬 Message
                    </Link>
                    <button type="button" onClick={() => setRatingBookingId(booking.id)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                      ⭐ Rate
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Info */}
      {videoInfo && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/50 shadow-lg">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
            <h2 className="text-lg font-semibold">📹 Secure Video Session</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Room</p>
              <p className="font-mono text-sm font-medium text-slate-900">{videoInfo.channelName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Token</p>
              <p className="font-mono text-xs text-slate-600 break-all">{videoInfo.token?.slice(0, 40)}...</p>
            </div>
          </div>
        </div>
      )}

      {/* Messaging Modal */}
      {chatBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex h-[500px] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">💬</div>
                <div>
                  <h3 className="text-sm font-bold">Chat — Booking #{chatBookingId}</h3>
                  <p className="text-xs text-blue-100">Message your expert</p>
                </div>
              </div>
              <button onClick={() => setChatBookingId(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-3">
              {chatLoading && (
                <div className="text-center text-sm text-slate-400 py-8">Loading messages...</div>
              )}
              {!chatLoading && chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <span className="text-4xl">💬</span>
                  <p className="mt-3 text-sm text-slate-500">No messages yet. Start the conversation!</p>
                </div>
              )}
              {chatMessages.map((msg) => {
                const isMe = msg.sender_name !== "System"; // simplified — in real app compare with current user
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[75%]">
                      <p className={`text-[10px] font-medium mb-0.5 ${isMe ? "text-right text-blue-500" : "text-slate-400"}`}>
                        {msg.sender_name}
                      </p>
                      <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-slate-100 text-slate-700 rounded-bl-sm"
                      }`}>
                        {msg.content}
                      </div>
                      <p className={`text-[10px] mt-0.5 ${isMe ? "text-right" : ""} text-slate-300`}>
                        {new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={sendMessage} className="border-t border-slate-100 bg-white p-3">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-12 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button type="submit" disabled={!chatInput.trim()}
                  className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm transition disabled:opacity-30">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m-7 7l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {ratingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" style={{ animation: "fadeIn 0.2s ease-out" }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl" style={{ animation: "slideUp 0.3s ease-out" }}>
            {ratingSuccess ? (
              <div className="flex flex-col items-center py-8 text-center" style={{ animation: "fadeIn 0.3s ease-out" }}>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl" style={{ animation: "pulse 0.6s ease-out" }}>✅</div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">Review Submitted!</h3>
                <p className="mt-2 text-sm text-slate-500">Thank you for your feedback</p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl">⭐</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Rate your Session</h3>
                    <p className="text-sm text-slate-500">Booking #{ratingBookingId}</p>
                  </div>
                </div>
                <form onSubmit={submitReview} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">How was your experience?</label>
                    <div className="flex items-center justify-center gap-3">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button key={num} type="button" onClick={() => setRatingVal(num)}
                          className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-all duration-200 hover:scale-110 ${
                            ratingVal >= num ? "bg-amber-100 text-amber-500 shadow-md scale-105" : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                          }`}>
                          ⭐
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-center text-xs text-slate-400">
                      {ratingVal === 1 ? "Poor" : ratingVal === 2 ? "Fair" : ratingVal === 3 ? "Good" : ratingVal === 4 ? "Very Good" : "Excellent!"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Comments (Optional)</label>
                    <textarea value={ratingComment} onChange={(e) => setRatingComment(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:shadow-sm"
                      rows={3} placeholder="Share your experience with this expert..." />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setRatingBookingId(null)} disabled={ratingSubmitting}
                      className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300">
                      Cancel
                    </button>
                    <button type="submit" disabled={ratingSubmitting}
                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:brightness-110 disabled:opacity-70">
                      {ratingSubmitting ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
