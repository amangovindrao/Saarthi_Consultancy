"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function ExpertDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    if (window.localStorage.getItem("role") !== "expert") {
      router.push("/dashboard");
      return;
    }

    const fetchData = async () => {
      try {
        const statsRes = await api.get("/expert-stats");
        setStats(statsRes.data);

        const bookingsRes = await api.get("/expert-bookings");
        setBookings(bookingsRes.data);
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

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      await api.post("/expert-booking-status", { booking_id: bookingId, status: newStatus });
      // Update local state
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    } catch (err) {
      alert("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
          <p className="text-sm font-medium text-slate-500">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 pb-24 pt-12">
        <div className="mx-auto max-w-5xl px-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Expert Workspace</h1>
          <p className="mt-2 text-indigo-100">Manage your consultations and connect with clients</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 -mt-16">
        {/* Navigation Tabs */}
        <div className="mb-8 flex gap-2 rounded-2xl bg-white p-2 shadow-sm border border-slate-100">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "overview" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "bookings" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            📅 Appointments
          </button>
        </div>

        {/* Tab Content: Overview */}
        {activeTab === "overview" && stats && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" style={{ animation: "fadeIn 0.4s ease-out" }}>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Bookings</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total_bookings}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Completed Sessions</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.completed_bookings}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Earnings</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">₹{stats.total_earnings}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Average Rating</p>
              <p className="mt-2 text-3xl font-bold text-amber-500">⭐ {stats.average_rating > 0 ? stats.average_rating.toFixed(1) : "N/A"}</p>
            </div>
          </div>
        )}

        {/* Tab Content: Bookings */}
        {activeTab === "bookings" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ animation: "fadeIn 0.4s ease-out" }}>
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <span className="mb-4 text-4xl">📅</span>
                <h3 className="text-lg font-semibold text-slate-900">No appointments yet</h3>
                <p className="mt-1 text-slate-500">When users book your services, they will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex flex-col sm:flex-row gap-6 p-6 transition hover:bg-slate-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-slate-900">{booking.patient_name || booking.user_name || "Client"}</h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            booking.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-700"
                              : booking.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {booking.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Date: {new Date(booking.booking_time).toLocaleDateString()} at {new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {booking.reason && (
                        <p className="mt-3 text-sm text-slate-700 border-l-2 border-slate-200 pl-3">
                          <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider block mb-1">Reason</span>
                          {booking.reason}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 sm:w-48 shrink-0 justify-center">
                      <Link
                        href={`/messages/${booking.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
                      >
                        💬 Chat
                      </Link>
                      
                      {booking.status === "confirmed" && (
                        <button
                          onClick={() => updateBookingStatus(booking.id, "completed")}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-600"
                        >
                          ✅ Mark Completed
                        </button>
                      )}
                      {booking.status === "pending" && (
                        <button
                          onClick={() => updateBookingStatus(booking.id, "confirmed")}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-600"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
