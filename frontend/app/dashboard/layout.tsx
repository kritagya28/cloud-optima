"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFinOps } from "../context/FinOpsContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, logout, activeRegion, setActiveRegion, searchTerm, setSearchTerm, resources } = useFinOps();
  const router = useRouter();
  const pathname = usePathname();

  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Array<{ id: string; text: string; read: boolean; time: string }>>([]);
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const isLight = document.documentElement.classList.contains("light") || localStorage.getItem("theme") === "light";
      if (isLight) {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        setTheme("light");
      } else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        setTheme("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    }
  };

  // Dynamically populate notifications based on anomalies/underutilized resources
  useEffect(() => {
    const alerts = [];
    const criticals = resources.filter(r => r.status === "Critical");
    const idles = resources.filter(r => r.status === "Idle" || r.status === "Orphaned");

    criticals.forEach((r, idx) => {
      alerts.push({
        id: `crit-${idx}`,
        text: `Critical anomaly: '${r.name}' is underutilized ($${r.cost}/mo).`,
        read: false,
        time: "Just now"
      });
    });

    idles.slice(0, 3).forEach((r, idx) => {
      alerts.push({
        id: `idle-${idx}`,
        text: `Waste advisory: EBS volume/Instance '${r.name}' is idle (Potential saving: $${r.cost}).`,
        read: false,
        time: "10m ago"
      });
    });

    // Default notifications if no alerts
    if (alerts.length === 0) {
      alerts.push({
        id: "welcome",
        text: "Welcome to CloudOptix! Your cloud operating system is active and secure.",
        read: true,
        time: "1h ago"
      });
    }

    setNotifications(alerts);
  }, [resources]);

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0b1326] text-white">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-outline">Loading secure workspace...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: "dashboard" },
    { name: "Resource Scanner", href: "/dashboard/scanner", icon: "troubleshoot" },
    { name: "Reports", href: "/dashboard/reports", icon: "analytics" },
    { name: "Settings", href: "/dashboard/settings", icon: "settings" },
  ];

  return (
    <div className="flex h-screen bg-[#0f172a] overflow-hidden text-on-surface font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-outline-variant bg-[#111827] flex flex-col justify-between py-6 px-4 shrink-0 z-50">
        <div>
          <div className="mb-10 px-2 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary font-headline-sm tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px]">cloud_done</span>
                CloudOptix
              </h1>
              <p className="text-[11px] text-on-surface-variant font-label-md uppercase tracking-wider mt-0.5">FinOps Enterprise</p>
            </div>
            <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-mono">v4.2</span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold border-l-4 border-primary"
                      : "text-on-surface-variant hover:bg-surface-container-high/40 hover:text-on-surface"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? "text-primary" : "text-on-surface-variant"}`}>
                    {item.icon}
                  </span>
                  <span className="text-sm">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="border-t border-outline-variant/50 pt-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 overflow-hidden rounded-full border border-outline-variant bg-surface-container-highest">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="w-full h-full object-cover" src={user.avatar} alt={user.name} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">{user.name}</p>
              <p className="text-xs text-on-surface-variant truncate">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="text-on-surface-variant hover:text-error transition-colors p-1.5 hover:bg-error/10 rounded-lg"
              title="Logout"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-outline-variant bg-[#0f172a]/80 backdrop-blur-md flex justify-between items-center px-8 shrink-0 z-40">
          <div className="flex items-center gap-8 flex-1 max-w-xl">
            <h2 className="text-lg font-bold text-on-surface shrink-0 hidden md:block">AWS Cost Manager</h2>
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                className="w-full bg-[#111827]/80 border border-outline-variant/50 rounded-full pl-11 pr-4 py-2 text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Search resources, reports, configuration..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-5 ml-6">
            {/* Region Toggles */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] border border-outline-variant/60 rounded-full text-xs">
              <span className="material-symbols-outlined text-[16px] text-primary">public</span>
              <select
                value={activeRegion}
                onChange={(e) => setActiveRegion(e.target.value)}
                className="bg-transparent text-on-surface outline-none cursor-pointer font-medium"
              >
                <option value="us-east-1" className="bg-[#111827]">US-East-1 (Virginia)</option>
                <option value="eu-west-1" className="bg-[#111827]">EU-West-1 (Ireland)</option>
                <option value="us-west-2" className="bg-[#111827]">US-West-2 (Oregon)</option>
                <option value="global" className="bg-[#111827]">Global Scope</option>
              </select>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container/30 rounded-full flex relative cursor-default"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[#1e293b] border border-outline-variant rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 bg-[#111827] border-b border-outline-variant flex justify-between items-center">
                    <span className="font-bold text-[10px] text-on-surface uppercase tracking-wider">Alerts & Notifications</span>
                    {notifications.some(n => !n.read) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllNotificationsAsRead();
                        }}
                        className="text-[10px] text-primary hover:underline font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/30 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-on-surface-variant">
                        No notifications to display.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`p-3.5 hover:bg-[#334155]/30 transition-colors cursor-pointer flex gap-3 ${!n.read ? "bg-primary/5" : ""}`}
                        >
                          <span className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${!n.read ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                            {!n.read ? "info" : "check_circle"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-normal ${!n.read ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>{n.text}</p>
                            <span className="text-[9px] text-outline mt-1 block font-mono">{n.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle (Dark/Light mode) */}
            <button
              onClick={toggleTheme}
              className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container/30 rounded-full flex cursor-default"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className="material-symbols-outlined text-[20px]">
                {theme === "dark" ? "light_mode" : "dark_mode"}
              </span>
            </button>

            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container/30 rounded-full flex cursor-default">
              <span className="material-symbols-outlined text-[20px]">help_outline</span>
            </button>
            
            <div className="h-6 w-px bg-outline-variant/60"></div>
            
            <button
              onClick={() => router.push("/dashboard/reports")}
              className="bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-primary/10 transition-colors"
            >
              Export Report
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
