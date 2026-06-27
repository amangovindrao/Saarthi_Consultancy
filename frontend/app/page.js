"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

const dailyTips = [
  { category: "📚 Study", icon: "📚", color: "from-emerald-500 to-teal-400", bg: "bg-emerald-50", tips: [
    "Use active recall — test yourself instead of re-reading.",
    "Apply the Pomodoro technique: 25 min focus + 5 min break.",
    "Teach concepts to someone else to deepen understanding.",
    "Organize notes with mind maps or flashcards.",
    "Review material within 24 hours to boost retention by 80%.",
  ]},
  { category: "💪 Health", icon: "💪", color: "from-blue-500 to-cyan-400", bg: "bg-blue-50", tips: [
    "Drink at least 8 glasses of water daily.",
    "Aim for 7-9 hours of quality sleep every night.",
    "Take a 5-minute stretch break every hour of sitting.",
    "Eat a rainbow — include colorful fruits and vegetables.",
    "Practice 10 minutes of mindfulness or deep breathing daily.",
  ]},
  { category: "🚀 Career", icon: "🚀", color: "from-violet-500 to-purple-400", bg: "bg-violet-50", tips: [
    "Keep your resume concise and tailored to each role.",
    "Build a strong LinkedIn presence and network regularly.",
    "Set clear short-term and long-term career goals.",
    "Practice mock interviews — confidence matters.",
    "Upskill continuously — online courses are your friend.",
  ]},
];

const faqItems = [
  { q: "How do I book a consultation?", a: "Browse our experts page, select a professional, pick a time slot, and complete the booking with your preferred payment method. It's that simple!" },
  { q: "Are the experts verified?", a: "Yes! Every expert on our platform goes through a thorough verification process. We check their credentials, experience, and professional background." },
  { q: "How do video consultations work?", a: "Once your booking is confirmed and paid, a 'Join Call' button appears in your Dashboard at the scheduled time. Just click it to start your secure video session." },
  { q: "What payment methods are accepted?", a: "We accept UPI, Credit Cards, Debit Cards, and Net Banking. All payments are processed securely through our platform." },
  { q: "Can I message my expert before the session?", a: "Yes! Once your booking is confirmed, you can use the built-in messaging system to communicate with your expert before and after sessions." },
];

const features = [
  {
    icon: "🩺",
    title: "Expert Doctors",
    desc: "Consult verified medical professionals from the comfort of your home.",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: "📚",
    title: "Top Teachers",
    desc: "Get personalized academic guidance from experienced educators.",
    color: "from-emerald-500 to-teal-400",
  },
  {
    icon: "📹",
    title: "Video Sessions",
    desc: "Secure, high-quality video consultations with screen sharing.",
    color: "from-violet-500 to-purple-400",
  },
  {
    icon: "💬",
    title: "Direct Messaging",
    desc: "Chat with your expert before and after your session.",
    color: "from-amber-500 to-orange-400",
  },
  {
    icon: "🤖",
    title: "AI Assistant",
    desc: "Smart chatbot to help you find experts and book instantly.",
    color: "from-pink-500 to-rose-400",
  },
  {
    icon: "⭐",
    title: "Ratings & Reviews",
    desc: "Read reviews and rate your experience after every session.",
    color: "from-indigo-500 to-blue-400",
  },
];

const stats = [
  { value: "500+", label: "Consultations" },
  { value: "50+", label: "Experts" },
  { value: "4.8", label: "Avg Rating" },
  { value: "24/7", label: "Support" },
];

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("token")));
  }, []);

  return (
    <div className="-mt-6 -mx-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-6 py-24 text-white">
        {/* Animated gradient orbs */}
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute left-1/2 top-1/3 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            Platform is live — Book your first session today
          </div>

          <h1 className="text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Expert Consultations,{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              One Click Away
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-blue-100/80">
            Connect with verified doctors and teachers for personalized
            consultations. Book instantly, consult via secure video, and get the
            guidance you need.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/experts"
              className="group flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-slate-900 shadow-xl transition-all hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-0.5"
            >
              Browse Experts
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            {!isLoggedIn && (
              <Link
                href="/register"
                className="rounded-xl border-2 border-white/20 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
              >
                Create Account
              </Link>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="relative mx-auto mt-20 max-w-3xl">
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-extrabold text-white">
                  {stat.value}
                </p>
                <p className="text-xs uppercase tracking-wider text-blue-200/60">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">
            How It Works
          </h2>
          <p className="mt-3 text-slate-500">
            Get expert guidance in just 4 simple steps
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "1", icon: "🔍", title: "Find", desc: "Browse our verified experts" },
            { step: "2", icon: "📅", title: "Book", desc: "Pick a time that works for you" },
            { step: "3", icon: "💳", title: "Pay", desc: "Secure payment, multiple options" },
            { step: "4", icon: "📹", title: "Consult", desc: "Join your video session" },
          ].map((item) => (
            <div
              key={item.step}
              className="group relative rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl transition-transform group-hover:scale-110">
                {item.icon}
              </div>
              <div className="absolute -top-3 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow">
                {item.step}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Everything You Need
          </h2>
          <p className="mt-3 text-slate-500">
            A complete platform for expert consultations
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-xl shadow-sm transition-transform group-hover:scale-110`}
              >
                <span className="drop-shadow">{f.icon}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Daily Tips Feed */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700">
            🔥 Daily Tips
          </div>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">Stay Sharp Every Day</h2>
          <p className="mt-3 text-slate-500">Quick tips to boost your studies, health, and career</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
          {dailyTips.map((section) => {
            const todayIndex = new Date().getDate() % section.tips.length;
            const tip = section.tips[todayIndex];
            return (
              <div key={section.category} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${section.color} text-xl shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                  {section.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900">{section.category}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  💡 {tip}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  Updated today
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Basic Q&A */}
      <QASection />

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-16 text-center text-white">
        <h2 className="text-3xl font-extrabold">
          Ready to Get Started?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-blue-100">
          Join thousands of users who trust our platform for expert
          consultations. Your first session is just a click away.
        </p>
        <Link
          href="/experts"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-blue-600 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-0.5"
        >
          Find an Expert →
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 px-6 py-8 text-center text-sm text-slate-400">
        <p>© 2026 Saarthi Consultancy. All rights reserved.</p>
        <p className="mt-1">Built with ❤️ for better healthcare & education</p>
      </footer>
    </div>
  );
}

function QASection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
            🧑‍🤝‍🧑 Q&A
          </div>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">Common Questions</h2>
          <p className="mt-3 text-slate-500">Everything you need to know about our platform</p>
        </div>
        <div className="mt-10 space-y-3">
          {faqItems.map((item, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <span className="pr-4 text-sm font-semibold text-slate-900">{item.q}</span>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm transition-all duration-300 ${
                  openIndex === i ? "bg-blue-600 text-white rotate-180" : "bg-slate-100 text-slate-500"
                }`}>
                  ▾
                </span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openIndex === i ? "max-h-40 pb-5" : "max-h-0"}`}>
                <p className="px-6 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
