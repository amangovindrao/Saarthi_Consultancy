"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ExpertCard from "@/components/ExpertCard";
import api from "@/lib/api";

const categories = [
  { value: "", label: "All Experts", icon: "✨" },
  { value: "doctor", label: "Doctors", icon: "🩺" },
  { value: "teacher", label: "Teachers", icon: "📚" },
];

export default function ExpertsPage() {
  const router = useRouter();
  const [experts, setExperts] = useState([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchExperts = async (selectedCategory = "") => {
    setLoading(true);
    setError("");
    try {
      const params = selectedCategory ? { category: selectedCategory } : {};
      const { data } = await api.get("/experts", { params });
      setExperts(data.experts || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load experts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.localStorage.getItem("role") === "expert") {
      router.push("/expert-panel");
      return;
    }
    fetchExperts();
  }, [router]);

  const doctorCount = experts.filter((e) => e.category === "doctor").length;
  const teacherCount = experts.filter((e) => e.category === "teacher").length;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6">
      {/* Hero Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Find Your Expert
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-slate-500">
          Connect with verified doctors and teachers for personalized
          consultations. Book instantly, consult securely.
        </p>

        {/* Stats */}
        <div className="mt-6 flex items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{experts.length}</p>
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Experts
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{doctorCount}</p>
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Doctors
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {teacherCount}
            </p>
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Teachers
            </p>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => {
              setCategory(cat.value);
              fetchExperts(cat.value);
            }}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              category === cat.value
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-100 bg-white shadow-sm"
            >
              <div className="h-24 rounded-t-2xl bg-gradient-to-r from-slate-200 to-slate-100" />
              <div className="p-6">
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-48 rounded bg-slate-100" />
                <div className="mt-4 flex gap-3">
                  <div className="h-12 w-16 rounded-lg bg-slate-100" />
                  <div className="h-12 w-16 rounded-lg bg-slate-100" />
                  <div className="h-12 w-16 rounded-lg bg-slate-100" />
                </div>
                <div className="mt-5 h-10 rounded-xl bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <span className="text-3xl">⚠️</span>
          <p className="mt-2 font-medium text-red-700">{error}</p>
          <button
            onClick={() => fetchExperts(category)}
            className="mt-4 rounded-full bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && experts.length === 0 && (
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <span className="text-5xl">🔍</span>
          <h3 className="mt-4 text-xl font-bold text-slate-900">
            No experts found
          </h3>
          <p className="mt-2 text-slate-500">
            {category
              ? `No ${category}s available right now. Try a different category.`
              : "Check back soon for new experts!"}
          </p>
        </div>
      )}

      {!loading && !error && experts.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {experts.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} />
          ))}
        </div>
      )}
    </section>
  );
}
