"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(window.localStorage.getItem("token")));
    setRole(window.localStorage.getItem("role"));
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const logout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("role");
    window.localStorage.removeItem("ai_access");
    setIsLoggedIn(false);
    setRole(null);
    router.push("/login");
  };

  const linkClass = (href) =>
    `text-sm font-medium transition-all duration-200 hover:text-blue-600 ${
      pathname === href ? "text-blue-600" : "text-slate-600"
    }`;

  return (
    <nav className={`sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md transition-all duration-300 ${
      scrolled ? "border-slate-200 shadow-sm" : "border-slate-200/80"
    }`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900 transition-all duration-200 hover:opacity-80">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md transition-transform duration-300 hover:scale-110">S</span>
          Saarthi Consultancy
        </Link>
        <div className="flex items-center gap-5">
          {isLoggedIn ? (
            <>
              {role === "admin" ? (
                // Admin Links
                <>
                  <Link href="/admin" className={linkClass("/admin")}>
                    Admin Panel
                  </Link>
                </>
              ) : role === "expert" ? (
                // Expert Links
                <>
                  <Link href="/expert-panel" className={linkClass("/expert-panel")}>
                    Expert Panel
                  </Link>
                </>
              ) : (
                // User Links
                <>
                  <Link href="/experts" className={linkClass("/experts")}>
                    Find Experts
                  </Link>
                  <Link href="/dashboard" className={linkClass("/dashboard")}>
                    Dashboard
                  </Link>
                </>
              )}
              
              <Link href="/profile" className={linkClass("/profile")}>
                Profile
              </Link>
              <Link href="/ai" className={`${linkClass("/ai")} flex items-center gap-1`}>
                <span className="text-base">✨</span> AI
              </Link>
              <button
                onClick={logout}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm ring-1 ring-slate-900 transition-all duration-300 hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5"
                type="button"
              >
                Logout
              </button>
            </>
          ) : (
            // Logged out links
            <>
              <Link href="/experts" className={linkClass("/experts")}>
                Find Experts
              </Link>
              <Link href="/register/expert" className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-200">
                Be an Expert
              </Link>
              <Link href="/login" className={linkClass("/login")}>
                Sign In
              </Link>
              <Link href="/register" className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-blue-500/20 hover:-translate-y-0.5">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
