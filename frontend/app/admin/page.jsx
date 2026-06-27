"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [pendingExperts, setPendingExperts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    if (localStorage.getItem("role") !== "admin") {
      router.push("/dashboard");
      return;
    }

    const fetchData = async () => {
      try {
        const statsRes = await api.get("/admin/dashboard-stats");
        setStats(statsRes.data);

        const expRes = await api.get("/admin/pending-experts");
        setPendingExperts(expRes.data);

        const bookRes = await api.get("/admin/bookings");
        setBookings(bookRes.data);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const approveExpert = async (id) => {
    try {
      await api.post("/admin/approve-expert", { expert_id: id });
      setPendingExperts(pendingExperts.filter((e) => e.id !== id));
      setStats({ ...stats, total_experts: stats.total_experts + 1 });
    } catch (err) {
      alert("Failed to approve expert");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 pb-24 pt-12">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Control Panel</h1>
          <p className="mt-2 text-slate-400">Manage the platform, verify experts, and monitor bookings.</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 -mt-16">
        <div className="mb-8 flex gap-2 rounded-2xl bg-white p-2 shadow-sm border border-slate-100">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "overview" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab("verification")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "verification" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            🛡️ Verifications ({pendingExperts.length})
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "bookings" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            📅 All Bookings
          </button>
        </div>

        {activeTab === "overview" && stats && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 animate-fadeIn">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total_users}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Verified Experts</p>
              <p className="mt-2 text-3xl font-bold text-indigo-600">{stats.total_experts}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Bookings</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.total_bookings}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Platform Revenue</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">₹{stats.total_revenue}</p>
            </div>
          </div>
        )}

        {activeTab === "verification" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm animate-fadeIn">
            {pendingExperts.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No experts pending verification.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingExperts.map((exp) => (
                  <div key={exp.id} className="flex flex-col sm:flex-row gap-6 p-6">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900">{exp.name}</h3>
                      <p className="text-sm text-slate-500">{exp.email} • {exp.category.toUpperCase()} • {exp.experience_years} Yrs Exp</p>
                      <p className="mt-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{exp.bio || "No bio provided."}</p>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => approveExpert(exp.id)}
                        className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 shadow-sm hover:shadow-md"
                      >
                        Approve Expert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm animate-fadeIn overflow-hidden">
            {bookings.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No bookings on the platform yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-4 font-medium">User</th>
                      <th className="p-4 font-medium">Expert</th>
                      <th className="p-4 font-medium">Time</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Meeting</th>
                      <th className="p-4 font-medium text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-4 font-medium text-slate-900">{b.user_name}</td>
                        <td className="p-4 text-slate-600">{b.expert_name}</td>
                        <td className="p-4 text-slate-500">{new Date(b.booking_time).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            b.status === "confirmed" ? "bg-emerald-100 text-emerald-700" :
                            b.status === "completed" ? "bg-blue-100 text-blue-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>{b.status.toUpperCase()}</span>
                        </td>
                        <td className="p-4 text-slate-500">{b.meeting_type.toUpperCase()}</td>
                        <td className="p-4 text-right font-bold text-slate-700">₹{b.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
