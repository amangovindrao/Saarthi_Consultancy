"use client";

import Link from "next/link";

const categoryConfig = {
  doctor: {
    gradient: "from-blue-500 to-cyan-400",
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: "🩺",
    border: "border-blue-200",
    glow: "hover:shadow-blue-200/50",
  },
  teacher: {
    gradient: "from-emerald-500 to-teal-400",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    icon: "📚",
    border: "border-emerald-200",
    glow: "hover:shadow-emerald-200/50",
  },
};

function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ExpertCard({ expert }) {
  const config = categoryConfig[expert.category] || categoryConfig.doctor;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${config.glow} ${config.border}`}
    >
      {/* Gradient Header */}
      <div
        className={`relative bg-gradient-to-r ${config.gradient} px-6 pb-10 pt-6`}
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
            {config.icon} {expert.category}
          </span>
          <div className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-sm text-amber-300">★</span>
            <span className="text-xs font-bold text-white">
              {expert.rating > 0 ? expert.rating.toFixed(1) : "New"}
            </span>
          </div>
        </div>
        {/* Verified badge */}
        <div className="absolute -bottom-0 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs shadow-md">
          ✓
        </div>
      </div>

      {/* Avatar overlapping header */}
      <div className="relative -mt-8 px-6">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${config.gradient} text-xl font-bold text-white shadow-lg ring-4 ring-white`}
        >
          {getInitials(expert.name)}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
          {expert.name}
        </h3>
        <p className="mt-0.5 text-sm font-medium text-slate-500">
          {expert.specialization || "General Consultation"}
        </p>

        {expert.bio && (
          <p className="mt-3 text-xs leading-relaxed text-slate-500 line-clamp-2">
            {expert.bio}
          </p>
        )}

        {/* Stats row */}
        <div className="mt-4 flex items-center gap-3">
          <div className={`rounded-lg ${config.bg} px-2.5 py-1.5`}>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Exp
            </p>
            <p className={`text-sm font-bold ${config.text}`}>
              {expert.experience_years}yr
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 px-2.5 py-1.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Rating
            </p>
            <p className="text-sm font-bold text-amber-600">
              {expert.rating > 0 ? expert.rating.toFixed(1) : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Fee
            </p>
            <p className="text-sm font-bold text-slate-800">
              ₹{expert.consultation_fee}
            </p>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/expert/${expert.id}`}
          className={`mt-5 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${config.gradient} px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110`}
        >
          View Profile
          <span className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
