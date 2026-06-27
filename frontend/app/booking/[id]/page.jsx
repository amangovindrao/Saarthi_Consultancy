"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";

const DEV_RAZORPAY_SECRET = "rzp_test_dummy_secret";

async function createHmacSignature(message, secret) {
  const encoder = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await window.crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const reasonsByCategory = {
  doctor: [
    { value: "", label: "Select a reason..." },
    { value: "general_checkup", label: "General Checkup" },
    { value: "symptoms", label: "Specific Symptoms / Illness" },
    { value: "follow_up", label: "Follow-Up Visit" },
    { value: "prescription", label: "Prescription / Medication Review" },
    { value: "lab_results", label: "Lab Results Discussion" },
    { value: "second_opinion", label: "Second Opinion" },
    { value: "other", label: "Other" },
  ],
  teacher: [
    { value: "", label: "Select a reason..." },
    { value: "concept_doubt", label: "Concept Doubt / Clarification" },
    { value: "exam_prep", label: "Exam Preparation" },
    { value: "homework_help", label: "Homework / Assignment Help" },
    { value: "career_guidance", label: "Career Guidance" },
    { value: "skill_learning", label: "New Skill / Topic Learning" },
    { value: "project_help", label: "Project Guidance" },
    { value: "other", label: "Other" },
  ],
};

const languageOptions = [
  { value: "english", label: "🇬🇧 English" },
  { value: "hindi", label: "🇮🇳 Hindi" },
  { value: "both", label: "🌐 English + Hindi" },
];

const categoryConfig = {
  doctor: { gradient: "from-blue-500 to-cyan-400", icon: "🩺" },
  teacher: { gradient: "from-emerald-500 to-teal-400", icon: "📚" },
};

function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function BookingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [expert, setExpert] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    datetime: "",
    reason: "",
    meeting_type: "online",
    notes: "",
    urgency: "normal",
    preferred_language: "english",
    payment_method: "cash",
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    const fetchExpert = async () => {
      try {
        const { data } = await api.get(`/experts/${id}`);
        setExpert(data);
      } catch (err) {
        setError(err.response?.data?.detail || "Could not load expert");
      }
    };
    if (id) fetchExpert();
  }, [id, router]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canProceedStep1 = form.datetime && form.reason;
  const canProceedStep2 = true; // notes & language are optional

  const onBook = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await api.post("/book", {
        expert_id: Number(id),
        booking_time: new Date(form.datetime).toISOString(),
        reason: form.reason,
        meeting_type: form.meeting_type,
        notes: form.notes,
        urgency: form.urgency,
        preferred_language: form.preferred_language,
        payment_method: "cash", // Hardcoded cash for now to avoid payment verification error
      });

      setShowConfetti(true);
      setMessage("🎉 Booking confirmed! Redirecting to dashboard...");
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch (err) {
      setError(err.response?.data?.detail || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const config = expert
    ? categoryConfig[expert.category] || categoryConfig.doctor
    : categoryConfig.doctor;

  return (
    <div className="mx-auto max-w-2xl pb-12">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link href="/experts" className="hover:text-blue-600 transition-colors">
          Experts
        </Link>
        <span>›</span>
        {expert && (
          <>
            <Link
              href={`/expert/${id}`}
              className="hover:text-blue-600 transition-colors"
            >
              {expert.name}
            </Link>
            <span>›</span>
          </>
        )}
        <span className="font-medium text-slate-700">Book</span>
      </nav>

      {/* Expert Summary Card */}
      {expert && (
        <div className="mb-8 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${config.gradient} text-lg font-bold text-white shadow`}
          >
            {getInitials(expert.name)}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">{expert.name}</h2>
            <p className="text-sm text-slate-500">
              {expert.specialization} • {expert.experience_years}yr experience
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Fee
            </p>
            <p className="text-xl font-bold text-slate-900">
              ₹{expert.consultation_fee}
            </p>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step >= s
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 w-12 rounded-full transition-colors ${
                  step > s ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      <form
        onSubmit={onBook}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
      >
        {/* Step 1: Schedule & Reason */}
        {step === 1 && (
          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-900">
              📅 Schedule & Reason
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              When do you want to consult and why?
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Preferred Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.datetime}
                  onChange={(e) => updateForm("datetime", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Reason for Consultation{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.reason}
                  onChange={(e) => updateForm("reason", e.target.value)}
                  required
                >
                  {(reasonsByCategory[expert?.category] || reasonsByCategory.doctor).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Meeting Type
                </label>
                <div className="mt-2 flex gap-3">
                  {[
                    { value: "online", label: "💻 Online Video Call" },
                    { value: "offline", label: "🏥 Offline (In-Person Clinic)" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateForm("meeting_type", opt.value)}
                      className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                        form.meeting_type === opt.value
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Urgency
                </label>
                <div className="mt-2 flex gap-3">
                  {[
                    {
                      value: "normal",
                      label: "Normal",
                      color: "bg-green-50 text-green-700 border-green-200",
                      active:
                        "bg-green-600 text-white border-green-600 shadow-md",
                    },
                    {
                      value: "urgent",
                      label: "Urgent",
                      color: "bg-red-50 text-red-700 border-red-200",
                      active: "bg-red-600 text-white border-red-600 shadow-md",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateForm("urgency", opt.value)}
                      className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                        form.urgency === opt.value ? opt.active : opt.color
                      }`}
                    >
                      {opt.value === "urgent" && "🔴 "}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
                className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-900">
              📝 Additional Details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Help the expert prepare for your session.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Describe your concern / topic
                </label>
                <textarea
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  rows={4}
                  placeholder="e.g., I've been having headaches for the past week... OR I need help understanding calculus derivatives..."
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">
                  This helps the expert understand your needs before the session.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Preferred Language
                </label>
                <div className="mt-2 flex gap-3">
                  {languageOptions.map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() =>
                        updateForm("preferred_language", lang.value)
                      }
                      className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                        form.preferred_language === lang.value
                          ? "border-blue-600 bg-blue-600 text-white shadow-md"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
              >
                Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment & Confirm */}
        {step === 3 && (
          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-900">
              💳 Payment & Confirm
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose your payment method and confirm your booking.
            </p>

            {/* Booking Summary */}
            <div className="mt-6 space-y-3 rounded-xl bg-slate-50 p-5">
              {[
                { label: "Expert", value: expert?.name },
                { label: "Date & Time", value: form.datetime ? new Date(form.datetime).toLocaleString() : "—" },
                { label: "Reason", value: (reasonsByCategory[expert?.category] || reasonsByCategory.doctor).find((r) => r.value === form.reason)?.label || form.reason },
                { label: "Meeting", value: form.meeting_type === "online" ? "💻 Online Video Call" : "🏥 Offline (In-Person Clinic)" },
                { label: "Notes", value: form.notes || "None provided" },
                { label: "Urgency", value: form.urgency === "urgent" ? "🔴 Urgent" : "Normal" },
                { label: "Language", value: languageOptions.find((l) => l.value === form.preferred_language)?.label || form.preferred_language },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between border-b border-slate-200/50 pb-3 last:border-0 last:pb-0">
                  <span className="text-sm font-medium text-slate-500">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-800 text-right max-w-[60%]">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Payment Method Selector */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-slate-700">
                Payment Method
              </label>
              <div className="mt-3">
                <div className="flex items-center gap-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-5 shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                    💵
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-800">Cash / Pay at Clinic</h3>
                    <p className="mt-0.5 text-sm text-emerald-600">
                      Skip online payment. You will pay the expert directly during your consultation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="mt-6 flex items-center justify-between rounded-xl bg-blue-50 px-5 py-4">
              <span className="text-sm font-medium text-blue-700">Total Amount</span>
              <span className="text-2xl font-bold text-blue-700">₹{expert?.consultation_fee}</span>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            {message && (
              <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">{message}</div>
            )}

            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                disabled={loading}
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading || !form.payment_method}
                className={`rounded-xl bg-gradient-to-r ${config.gradient} px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50`}
              >
                {loading ? "Processing..." : "Confirm Booking →"}
              </button>
            </div>
          </div>
        )}

        {/* Confetti Overlay */}
        {showConfetti && (
          <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-5%`,
                  animationDuration: `${1.5 + Math.random() * 2}s`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  fontSize: `${14 + Math.random() * 14}px`,
                }}
              >
                {["🎉", "✨", "🎊", "💙", "⭐"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
