"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import api from "@/lib/api";

export default function ExpertRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    category: "doctor",
    specialization: "",
    consultation_fee: 500,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/register/expert", form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-2xl animate-slideUp">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl text-emerald-600">
            ⏳
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Registration Successful!</h1>
          <p className="mt-4 text-lg text-slate-600">
            Your application to join as an expert has been received. 
            <br /><br />
            Our admin team will review your profile. Once approved, you will be listed on the platform and can start accepting bookings.
          </p>
          <div className="mt-10">
            <Link href="/login" className="rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl" style={{ animation: "slideUp 0.4s ease-out" }}>
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 text-3xl text-white shadow-lg">
              👨‍⚕️
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Join as an Expert</h1>
            <p className="mt-2 text-slate-500">Provide consultations and grow your practice</p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Full Name</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:shadow-sm"
                  placeholder="Dr. John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Email</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:shadow-sm"
                  placeholder="you@example.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Password</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:shadow-sm"
                  placeholder="Min. 6 characters"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Category</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:shadow-sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                >
                  <option value="doctor">Doctor</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Specialization</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:shadow-sm"
                  placeholder="e.g. Cardiologist"
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Consultation Fee (₹)</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:shadow-sm"
                  type="number"
                  min="0"
                  value={form.consultation_fee}
                  onChange={(e) => setForm({ ...form, consultation_fee: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" style={{ animation: "fadeIn 0.2s ease-out" }}>
                ⚠️ {error}
              </div>
            )}

            <button
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-4 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating Expert Account...
                </span>
              ) : "Create Expert Account"}
            </button>
          </form>

          <div className="mt-8 flex justify-center gap-4 text-sm text-slate-500">
            <Link href="/login" className="font-semibold text-blue-600 transition-colors hover:text-blue-700">
              Sign in instead
            </Link>
            <span>•</span>
            <Link href="/register" className="font-semibold text-blue-600 transition-colors hover:text-blue-700">
              Register as User
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
