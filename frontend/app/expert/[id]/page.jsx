"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";

const categoryConfig = {
  doctor: {
    gradient: "from-blue-500 to-cyan-400",
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: "🩺",
  },
  teacher: {
    gradient: "from-emerald-500 to-teal-400",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    icon: "📚",
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

export default function ExpertDetailsPage() {
  const { id } = useParams();
  const [expert, setExpert] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpert = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/experts/${id}`);
        setExpert(data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load expert");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchExpert();
    }
  }, [id]);

  if (loading)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  if (error)
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
        <span className="text-4xl">⚠️</span>
        <p className="mt-3 text-red-700">{error}</p>
        <Link
          href="/experts"
          className="mt-4 inline-block rounded-full bg-slate-900 px-6 py-2 text-sm text-white"
        >
          Back to Experts
        </Link>
      </div>
    );
  if (!expert) return null;

  const config = categoryConfig[expert.category] || categoryConfig.doctor;

  return (
    <div className="mx-auto max-w-3xl pb-12">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link href="/experts" className="hover:text-blue-600 transition-colors">
          Experts
        </Link>
        <span>›</span>
        <span className="text-slate-700 font-medium">{expert.name}</span>
      </nav>

      {/* Profile Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
        {/* Gradient Header */}
        <div
          className={`relative bg-gradient-to-r ${config.gradient} px-8 pb-16 pt-8`}
        >
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
              {config.icon} {expert.category}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
              ✓ Verified
            </span>
          </div>
        </div>

        {/* Avatar + Info */}
        <div className="relative px-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br ${config.gradient} text-3xl font-bold text-white shadow-xl ring-4 ring-white shrink-0`}
            >
              {getInitials(expert.name)}
            </div>
            <div className="pb-2">
              <h1 className="text-2xl font-extrabold text-slate-900">
                {expert.name}
              </h1>
              <p className="text-sm font-medium text-slate-500">
                {expert.specialization || "General Consultation"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100 px-8">
          <div className="py-5 text-center">
            <p className="text-2xl font-bold text-slate-900">
              {expert.experience_years}
            </p>
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Years Exp
            </p>
          </div>
          <div className="py-5 text-center">
            <p className="text-2xl font-bold text-amber-500">
              ★ {expert.rating > 0 ? expert.rating.toFixed(1) : "New"}
            </p>
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Rating
            </p>
          </div>
          <div className="py-5 text-center">
            <p className="text-2xl font-bold text-slate-900">
              ₹{expert.consultation_fee}
            </p>
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Per Session
            </p>
          </div>
        </div>

        {/* Bio */}
        <div className="px-8 py-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            About
          </h2>
          <p className="mt-3 leading-relaxed text-slate-700">
            {expert.bio || "No bio available."}
          </p>
        </div>

        {/* CTA */}
        <div className="border-t border-slate-100 px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <p className="text-slate-500 text-sm">
                Ready to consult?
              </p>
              <p className="text-lg font-bold text-slate-900">
                Book a session for{" "}
                <span className={config.text}>
                  ₹{expert.consultation_fee}
                </span>
              </p>
            </div>
            <Link
              href={`/booking/${expert.id}`}
              className={`rounded-xl bg-gradient-to-r ${config.gradient} px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110`}
            >
              Book Now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
