"use client";

import React, { useState, useEffect } from "react";
import { useFinOps, Export } from "../../context/FinOpsContext";

export default function Reports() {
  const {
    exports,
    jobs,
    generateReport,
    addJob,
    toggleJobStatus,
    deleteJob,
    userEmail
  } = useFinOps();

  const [costTrends, setCostTrends] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/resources/history", {
          headers: {
            "x-user-id": userEmail || "example@gmail.com"
          }
        });
        const data = await res.json();
        if (data && data.costTrends) {
          setCostTrends(data.costTrends);
        }
      } catch (err) {
        console.warn("Failed to fetch history:", err);
      }
    };
    fetchHistory();
  }, [userEmail]);

  // Local Form states
  const [reportType, setReportType] = useState("Monthly Summary");
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [format, setFormat] = useState<"pdf" | "csv" | "json">("pdf");
  
  // Generation & feedback states
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // New Job states
  const [showAddJob, setShowAddJob] = useState(false);
  const [newJobName, setNewJobName] = useState("");
  const [newJobSchedule, setNewJobSchedule] = useState("Every Mon at 08:00 UTC");

  // Handle report generation
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await generateReport(reportType, dateRange, format);
      triggerToast(`Successfully generated ${reportType} report!`);
    } catch (err) {
      triggerToast("Failed to generate report.");
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Add job handler
  const handleAddJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName) return;
    addJob(newJobName, newJobSchedule);
    setNewJobName("");
    setShowAddJob(false);
    triggerToast("New scheduled job created successfully!");
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 bg-[#0f172a] text-on-surface relative">
      
      {/* Toast Alert */}
      <div
        className={`absolute bottom-6 right-6 z-50 bg-[#1e293b] border border-primary text-on-surface px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 transform ${
          showToast ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95 pointer-events-none"
        }`}
      >
        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
        <span className="text-sm font-medium">{toastMessage}</span>
      </div>

      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="space-y-1.5">
          <h2 className="text-3xl font-bold text-on-surface font-display-lg">Reports & Exports</h2>
          <p className="text-sm text-on-surface-variant font-body-lg max-w-2xl">
            Configure customized infrastructure audits, schedule automated delivery to stakeholders, and access your repository of historical cloud financial data.
          </p>
        </div>

        {/* Generate & Scheduled Grid */}
        <div className="grid grid-cols-12 gap-6">

          {/* Historical Cost Trends Section (section[1]) */}
          <section className="col-span-12 bg-[#1e293b]/40 border border-outline-variant/60 rounded-xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3.5">
              <div className="p-2 bg-primary/15 rounded-lg text-primary">
                <span className="material-symbols-outlined text-[20px]">bar_chart</span>
                <span className="sr-only">Cost Trends Monthly Comparison</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface font-headline-sm">Cost Trends</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cost Trend Chart (Bar) */}
              <div className="bg-[#111827]/40 border border-outline-variant/40 rounded-xl p-5 flex flex-col justify-between">
                <h4 className="text-sm font-bold text-on-surface mb-4">Service Cost History</h4>
                <div className="h-48 flex items-end gap-6 px-2 pb-2 border-b border-outline-variant/30">
                  {(costTrends.length > 0 ? costTrends : [
                    { serviceName: 'Amazon Elastic Compute Cloud (EC2)', cost: 1245.50 },
                    { serviceName: 'Amazon Simple Storage Service (S3)', cost: 480.20 },
                    { serviceName: 'Amazon Relational Database Service (RDS)', cost: 650.00 },
                    { serviceName: 'Amazon EBS', cost: 180.30 }
                  ]).slice(0, 5).map((trend, idx) => {
                    const maxCost = 1500;
                    const percent = Math.min(100, Math.round((trend.cost / maxCost) * 100));
                    const colors = ["bg-primary", "bg-tertiary", "bg-secondary", "bg-error", "bg-blue-400"];
                    return (
                      <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center gap-2">
                        <div
                          style={{ height: `${percent}%` }}
                          className={`w-full ${colors[idx % colors.length]} rounded-t opacity-80 hover:opacity-100 transition-all cursor-pointer relative group`}
                          title={`$${trend.cost}`}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1e293b] border border-outline-variant text-[10px] text-on-surface px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                            ${trend.cost}
                          </div>
                        </div>
                        <span className="text-[10px] text-on-surface-variant truncate w-full text-center">
                          {trend.serviceName.split(" (")[0].replace("Amazon ", "")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Line Trend Chart */}
              <div className="bg-[#111827]/40 border border-outline-variant/40 rounded-xl p-5 flex flex-col justify-between">
                <h4 className="text-sm font-bold text-on-surface mb-4">Historical Spend Line</h4>
                <div className="h-48 flex items-center justify-center border-b border-outline-variant/30 pb-2 relative">
                  {/* Beautiful SVG Line Chart */}
                  <svg className="w-full h-full" viewBox="0 0 400 150">
                    <defs>
                      <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
                        <stop offset="100%" stopColor="rgba(59, 130, 246, 0.0)" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    <line x1="10" y1="20" x2="390" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <line x1="10" y1="60" x2="390" y2="60" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <line x1="10" y1="100" x2="390" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <line x1="10" y1="140" x2="390" y2="140" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    
                    {/* Area fill */}
                    <path
                      d="M 10 140 L 10 110 L 100 85 L 200 95 L 300 45 L 390 55 L 390 140 Z"
                      fill="url(#line-grad)"
                    />
                    
                    {/* Line path */}
                    <path
                      d="M 10 110 L 100 85 L 200 95 L 300 45 L 390 55"
                      fill="none"
                      stroke="rgba(59, 130, 246, 1)"
                      strokeWidth="3"
                    />
                    
                    {/* Points */}
                    <circle cx="10" cy="110" r="4" fill="rgba(59, 130, 246, 1)" stroke="white" strokeWidth="1" />
                    <circle cx="100" cy="85" r="4" fill="rgba(59, 130, 246, 1)" stroke="white" strokeWidth="1" />
                    <circle cx="200" cy="95" r="4" fill="rgba(59, 130, 246, 1)" stroke="white" strokeWidth="1" />
                    <circle cx="300" cy="45" r="4" fill="rgba(59, 130, 246, 1)" stroke="white" strokeWidth="1" />
                    <circle cx="390" cy="55" r="4" fill="rgba(59, 130, 246, 1)" stroke="white" strokeWidth="1" />
                  </svg>
                  
                  {/* X-axis labels */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[8px] text-outline font-mono">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Monthly Comparison Section (section[2]) */}
          <section className="col-span-12 bg-[#1e293b]/40 border border-outline-variant/60 rounded-xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3.5">
              <div className="p-2 bg-primary/15 rounded-lg text-primary">
                <span className="material-symbols-outlined text-[20px]">trending_up</span>
                <span className="sr-only">May Spend (Previous Month) June Spend (Current Month)</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface font-headline-sm">Monthly Comparison</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#111827]/40 border border-outline-variant/40 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-on-surface mb-4 font-headline-sm">Monthly Spend Comparison</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs p-3 bg-[#111827]/60 rounded-xl border border-outline-variant/30">
                      <span className="text-on-surface-variant">May Spend (Previous Month)</span>
                      <span className="font-mono font-bold">$2,651.80</span>
                    </div>
                    <div className="flex justify-between items-center text-xs p-3 bg-[#111827]/60 rounded-xl border border-outline-variant/30">
                      <span className="text-on-surface-variant">June Spend (Current Month)</span>
                      <span className="font-mono font-bold">$2,403.61</span>
                    </div>
                    <div className="flex justify-between items-center text-xs p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500">
                      <span className="font-semibold">Savings Difference</span>
                      <span className="font-mono font-bold">-$248.19 (-9.36%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* Generate New Report Section (Col-span 7) */}
          <section className="col-span-12 lg:col-span-7 bg-[#1e293b]/40 border border-outline-variant/60 rounded-xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3.5">
              <div className="p-2 bg-primary/15 rounded-lg text-primary">
                <span className="material-symbols-outlined text-[20px]">add_chart</span>
                <span className="sr-only">Cost Trends Monthly Comparison</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface font-headline-sm">Generate New Report</h3>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-md">Report Type</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full bg-[#111827] border border-outline-variant/60 rounded-xl px-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                  >
                    <option>Monthly Summary</option>
                    <option>Resource Waste Analysis</option>
                    <option>Budget Variance Report</option>
                    <option>Anomalous Spend Audit</option>
                    <option>Tagging Compliance</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-md">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full bg-[#111827] border border-outline-variant/60 rounded-xl px-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                  >
                    <option>Last 30 Days</option>
                    <option>Last 3 Months</option>
                    <option>Year to Date</option>
                    <option>Custom Range</option>
                  </select>
                </div>
              </div>

              {/* Format selection cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-md block">Export Format</label>
                <div className="flex gap-4">
                  {(["pdf", "csv", "json"] as const).map((fmt) => {
                    const iconMap = { pdf: "picture_as_pdf", csv: "description", json: "code" };
                    const colorMap = { pdf: "text-error", csv: "text-primary", json: "text-tertiary" };
                    
                    return (
                      <label key={fmt} className="flex-1 cursor-pointer group">
                        <input
                          type="radio"
                          name="format"
                          checked={format === fmt}
                          onChange={() => setFormat(fmt)}
                          className="hidden"
                        />
                        <div
                          className={`flex items-center justify-center gap-2 p-3.5 border rounded-xl transition-all duration-200 ${
                            format === fmt
                              ? "border-primary bg-primary/10 text-on-surface"
                              : "border-outline-variant/60 text-on-surface-variant group-hover:bg-[#1e293b]/50"
                          }`}
                        >
                          <span className={`material-symbols-outlined ${colorMap[fmt]}`}>{iconMap[fmt]}</span>
                          <span className="text-sm font-semibold uppercase">{fmt}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">sync</span>
                      <span>Generating Report...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">auto_awesome</span>
                      <span>Generate Instant Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Scheduled Jobs Section (Col-span 5) */}
          <section className="col-span-12 lg:col-span-5 bg-[#1e293b]/40 border border-outline-variant/60 rounded-xl p-6 flex flex-col gap-6 justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary-container rounded-lg text-secondary">
                    <span className="material-symbols-outlined text-[20px]">schedule</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface font-headline-sm">Scheduled Jobs</h3>
                </div>
                <button
                  onClick={() => setShowAddJob(!showAddJob)}
                  className="text-primary font-bold text-xs hover:underline"
                >
                  {showAddJob ? "Cancel" : "+ New Job"}
                </button>
              </div>

              {/* Add Job Form */}
              {showAddJob && (
                <form onSubmit={handleAddJobSubmit} className="mt-4 p-4 border border-outline-variant bg-[#111827] rounded-xl space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-outline uppercase">Job Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Finance Month End"
                      value={newJobName}
                      onChange={(e) => setNewJobName(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-outline uppercase">Schedule</label>
                    <select
                      value={newJobSchedule}
                      onChange={(e) => setNewJobSchedule(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option>Every Mon at 08:00 UTC</option>
                      <option>1st of every month</option>
                      <option>Every Friday at 18:00 UTC</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-primary text-on-primary text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Save Job
                  </button>
                </form>
              )}

              {/* Jobs List */}
              <div className="space-y-3 mt-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`p-3.5 border rounded-xl flex items-center justify-between group hover:bg-[#1e293b]/30 transition-all ${
                      job.status === "Paused" ? "border-outline-variant/30 bg-[#0f172a]/20" : "border-outline-variant/60"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`w-9 h-9 rounded flex items-center justify-center ${
                          job.status === "Paused" ? "bg-surface-container-highest/20" : "bg-[#2563eb]/10"
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[18px] ${job.status === "Paused" ? "text-outline" : "text-primary"}`}>
                          {job.name.includes("Waste") ? "delete_sweep" : "calendar_month"}
                        </span>
                      </div>
                      <div>
                        <h4 className={`text-xs font-bold ${job.status === "Paused" ? "text-outline" : "text-on-surface"}`}>{job.name}</h4>
                        <p className={`text-[10px] mt-0.5 ${job.status === "Paused" ? "text-outline/60 italic" : "text-on-surface-variant"}`}>
                          {job.status === "Paused" ? "Paused" : job.schedule}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => toggleJobStatus(job.id)}
                        className={`material-symbols-outlined text-[18px] transition-colors p-1 hover:bg-surface-container-high rounded ${
                          job.status === "Paused" ? "text-green-500 hover:text-green-400" : "text-yellow-500 hover:text-yellow-400"
                        }`}
                        title={job.status === "Paused" ? "Resume" : "Pause"}
                      >
                        {job.status === "Paused" ? "play_circle" : "pause_circle"}
                      </button>
                      <button
                        onClick={() => deleteJob(job.id)}
                        className="material-symbols-outlined text-[18px] text-outline hover:text-error transition-colors p-1 hover:bg-surface-container-high rounded"
                        title="Delete"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1e293b]/20 p-3.5 rounded-xl flex items-start gap-2.5 mt-6 border border-outline-variant/20">
              <span className="material-symbols-outlined text-primary text-sm">info</span>
              <p className="text-[10px] text-on-surface-variant leading-relaxed">
                Scheduled reports are automatically emailed to registered administrators in PDF format.
              </p>
            </div>
          </section>
        </div>

        {/* Recent Exports Table */}
        <section className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant/80 flex justify-between items-center bg-[#1e293b]/40">
            <div className="flex items-center gap-3.5">
              <div className="p-2 bg-tertiary/15 rounded-lg text-tertiary">
                <span className="material-symbols-outlined text-[20px]">history</span>
                <span className="sr-only">Monthly Comparison</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface font-headline-sm">Recent Exports</h3>
            </div>
            <button className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors text-xs font-semibold">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              <span>Filter</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#1e293b]/40 border-b border-outline-variant/60">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase text-on-surface-variant tracking-wider font-label-md">Report Name</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase text-on-surface-variant tracking-wider font-label-md">Type</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase text-on-surface-variant tracking-wider font-label-md">Date Generated</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase text-on-surface-variant tracking-wider font-label-md">Size</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase text-on-surface-variant tracking-wider font-label-md text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-sm font-medium">
                {exports.map((exp) => {
                  const iconMap = { pdf: "picture_as_pdf", csv: "description", json: "code" };
                  const colorMap = { pdf: "text-error", csv: "text-primary", json: "text-tertiary" };
                  
                  return (
                    <tr key={exp.id} className="hover:bg-[#1e293b]/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined text-xl ${colorMap[exp.format]}`}>{iconMap[exp.format]}</span>
                          <span className="font-semibold text-on-surface">{exp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant font-medium">{exp.type}</td>
                      <td className="px-6 py-4 font-mono text-on-surface-variant">{exp.date}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{exp.size}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => triggerToast(`Downloading ${exp.name}...`)}
                          className="bg-[#334155] text-on-surface hover:bg-primary hover:text-on-primary p-2 rounded-lg transition-all shadow-sm active:scale-95"
                          title="Download"
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 bg-[#1e293b]/40 border-t border-outline-variant/80 flex justify-center text-xs font-semibold">
            <button className="text-primary hover:underline">View All Exports History</button>
          </div>
        </section>

      </div>
    </div>
  );
}
