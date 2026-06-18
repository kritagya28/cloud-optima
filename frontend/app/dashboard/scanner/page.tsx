"use client";

import React, { useState, useEffect } from "react";
import { useFinOps, Resource } from "../../context/FinOpsContext";

export default function ResourceScanner() {
  const {
    resources,
    activeRegion,
    terminateResource,
    resizeResource,
    releaseResource,
    deleteResource,
    rescanInventory,
    isScanning,
    searchTerm
  } = useFinOps();

  // Local filter states
  const [selectedService, setSelectedService] = useState("All Services");
  const [statusFilter, setStatusFilter] = useState<"All" | "Orphaned" | "Idle" | "Critical">("All");
  const [animateProgress, setAnimateProgress] = useState(false);

  useEffect(() => {
    setAnimateProgress(true);
  }, []);

  // Compute live potential savings
  // Let's make it baseline 11794.50 + cost of any unoptimized resource in the list
  const unoptimizedCost = resources.reduce((acc, r) => {
    if (["Critical", "Orphaned", "Idle"].includes(r.status)) {
      return acc + r.cost;
    }
    return acc;
  }, 0);

  const baselineCost = 11794.50; // $12,482.50 - sum of unoptimized resources cost ($148 + $3.6 + $512.4 + $24 = $688)
  const currentSavingsPotential = baselineCost + unoptimizedCost;

  // Filter resources
  const scannerResources = resources.filter((r) => {
    // 1. Global Search Filter
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Active Region Filter
    const matchesRegion = activeRegion === "global" ? true : r.region === activeRegion;

    // 3. Service Type Filter
    let matchesService = true;
    if (selectedService === "EC2 Instances") matchesService = r.category === "EC2";
    else if (selectedService === "RDS Databases") matchesService = r.category === "RDS";
    else if (selectedService === "EBS Volumes") matchesService = r.category === "EBS Volume";
    else if (selectedService === "S3 Buckets") matchesService = r.category === "S3";

    // 4. Status Filter
    let matchesStatus = true;
    if (statusFilter === "Orphaned") matchesStatus = r.status === "Orphaned";
    else if (statusFilter === "Idle") matchesStatus = r.status === "Idle";
    else if (statusFilter === "Critical") matchesStatus = r.status === "Critical";

    return matchesSearch && matchesRegion && matchesService && matchesStatus;
  });

  // Bulk actions
  const handleReleaseAllEIP = () => {
    const eip = resources.find(r => r.category === "Elastic IP" && r.status === "Orphaned");
    if (eip) releaseResource(eip.id);
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 bg-[#0f172a] text-on-surface">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-on-surface font-display-lg">Resource Scanner</h2>
            <p className="text-sm text-on-surface-variant mt-1.5 font-body-lg">
              Optimize infrastructure by identifying idle, orphaned, or underutilized cloud resources.
            </p>
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-xl text-sm font-semibold hover:bg-[#334155] transition-all">
              <span className="material-symbols-outlined text-[20px]">file_download</span>
              Export CSV
            </button>
            <button
              onClick={rescanInventory}
              disabled={isScanning}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:opacity-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[20px] ${isScanning ? "animate-spin" : ""}`}>
                sync
              </span>
              {isScanning ? "Scanning..." : "Rescan Inventory"}
            </button>
          </div>
        </div>

        {/* Filter & Summary Bar */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-9 bg-[#1e293b]/40 border border-outline-variant/50 backdrop-blur-md rounded-xl p-4 flex flex-wrap gap-6 items-center">
            
            {/* Service Filter */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-outline uppercase tracking-wider font-label-md">Service</span>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="bg-[#111827] border border-outline-variant/60 rounded-xl px-4 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option>All Services</option>
                <option>EC2 Instances</option>
                <option>RDS Databases</option>
                <option>EBS Volumes</option>
                <option>S3 Buckets</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-3 border-l border-outline-variant/60 pl-6">
              <span className="text-[11px] font-bold text-outline uppercase tracking-wider font-label-md">Status</span>
              <div className="flex gap-1.5">
                {(["All", "Orphaned", "Idle", "Critical"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      statusFilter === status
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-[#111827] text-outline border-outline-variant/60 hover:bg-surface-container-high"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Potential Savings Box */}
          <div className="col-span-12 lg:col-span-3 bg-[#1e293b]/40 border border-outline-variant/50 backdrop-blur-md rounded-xl p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-outline uppercase tracking-wider font-label-md">Total Potential Savings</span>
              <span className="text-2xl font-bold font-mono text-primary mt-1">
                ${currentSavingsPotential.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs font-normal text-outline">/mo</span>
              </span>
            </div>
            <span className="material-symbols-outlined text-primary text-3xl opacity-35" style={{ fontVariationSettings: "'FILL' 0" }}>
              savings
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#0f172a] border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-[#1e293b]/30">
                  <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider font-label-md">Resource ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider font-label-md">Service Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider font-label-md">Utilization</th>
                  <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider font-label-md">Monthly Waste</th>
                  <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-wider font-label-md text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-sm">
                {scannerResources.map((resource) => {
                  const isPendingAction = ["Terminated", "Released", "Deleted", "Resized"].includes(resource.status);
                  
                  return (
                    <tr
                      key={resource.id}
                      className={`transition-colors duration-150 ${
                        resource.status === "Critical"
                          ? "hover:bg-error/5"
                          : "hover:bg-surface-container-high/30"
                      } ${isPendingAction ? "opacity-60" : ""}`}
                    >
                      {/* Resource Details */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-on-surface font-semibold">{resource.name}</span>
                          <span
                            className={`text-xs flex items-center gap-1.5 mt-1.5 ${
                              resource.status === "Critical"
                                ? "text-error font-medium"
                                : resource.status === "Idle"
                                ? "text-yellow-500 font-medium"
                                : resource.status === "Orphaned"
                                ? "text-primary font-medium"
                                : "text-on-surface-variant"
                            }`}
                          >
                            {resource.status === "Critical" && (
                              <span className="material-symbols-outlined text-[14px]">warning</span>
                            )}
                            {resource.statusMessage || resource.status}
                          </span>
                        </div>
                      </td>

                      {/* Service Type */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-on-surface-variant font-medium">
                          <span className="material-symbols-outlined text-outline text-[18px]">
                            {resource.category === "EC2"
                              ? "dns"
                              : resource.category === "RDS"
                              ? "database"
                              : resource.category === "S3"
                              ? "storage"
                              : "settings_ethernet"}
                          </span>
                          <span>{resource.category} ({resource.type})</span>
                        </div>
                      </td>

                      {/* Utilization Bar */}
                      <td className="px-6 py-4">
                        {resource.utilizationVal !== undefined ? (
                          <div className="w-full max-w-[120px]">
                            <div className="flex justify-between mb-1.5">
                              <span className="text-xs font-mono text-outline">{resource.utilization}</span>
                            </div>
                            <div className="w-full bg-[#1e293b] h-1.5 rounded-full overflow-hidden">
                              <div
                                style={{ width: animateProgress ? `${resource.utilizationVal}%` : "0%" }}
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  resource.status === "Critical"
                                    ? "bg-error shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                                    : "bg-tertiary"
                                }`}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-outline font-mono uppercase bg-[#1e293b] px-2 py-0.5 rounded">
                            {resource.utilization}
                          </span>
                        )}
                      </td>

                      {/* Waste Cost */}
                      <td className="px-6 py-4 font-mono font-bold text-on-surface">
                        ${resource.cost.toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {isPendingAction ? (
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check</span> Resolved
                            </span>
                          ) : (
                            <>
                              {resource.status === "Critical" && resource.category === "EC2" && (
                                <button
                                  onClick={() => terminateResource(resource.id)}
                                  className="px-3 py-1.5 text-xs font-bold text-error hover:bg-error/10 border border-error/25 rounded-lg transition-all active:scale-95"
                                >
                                  Terminate
                                </button>
                              )}
                              {resource.status === "Orphaned" && resource.category === "Elastic IP" && (
                                <button
                                  onClick={() => releaseResource(resource.id)}
                                  className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 border border-primary/25 rounded-lg transition-all active:scale-95"
                                >
                                  Release
                                </button>
                              )}
                              {resource.status === "Idle" && resource.category === "RDS" && (
                                <button
                                  onClick={() => resizeResource(resource.id)}
                                  className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 border border-primary/25 rounded-lg transition-all active:scale-95"
                                >
                                  Resize
                                </button>
                              )}
                              {resource.status === "Critical" && resource.category === "EBS Volume" && (
                                <button
                                  onClick={() => deleteResource(resource.id)}
                                  className="px-3 py-1.5 text-xs font-bold text-error hover:bg-error/10 border border-error/25 rounded-lg transition-all active:scale-95"
                                >
                                  Delete
                                </button>
                              )}
                            </>
                          )}
                          <button className="p-1.5 text-outline hover:text-on-surface transition-colors">
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {scannerResources.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-on-surface-variant font-medium">
                      No flagged resources found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-outline-variant bg-[#1e293b]/10 flex justify-between items-center text-xs text-outline font-semibold">
            <span>Showing {scannerResources.length} of 128 flagged resources</span>
            <div className="flex gap-2">
              <button className="p-1.5 rounded-lg border border-outline-variant/60 text-outline hover:bg-surface-container disabled:opacity-20" disabled>
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="p-1.5 rounded-lg border border-outline-variant/60 text-outline hover:bg-surface-container">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Optimization Insights Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Quick Win Card */}
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/60 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-xs font-bold text-outline uppercase mb-4 tracking-wider font-label-md">Quick Win</h4>
              <p className="text-base font-bold text-on-surface mb-1 font-headline-sm">Unattached Elastic IPs</p>
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                You have unattached EIPs costing $43.20/mo. Releasing these takes 1 click.
              </p>
              
              {resources.find(r => r.category === "Elastic IP" && r.status === "Orphaned") ? (
                <button
                  onClick={handleReleaseAllEIP}
                  className="text-primary font-bold text-sm flex items-center gap-1.5 group-hover:gap-2.5 transition-all hover:underline"
                >
                  Release All <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              ) : (
                <span className="text-green-500 font-bold text-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span> Released
                </span>
              )}
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-[120px] text-primary opacity-5 group-hover:opacity-10 transition-opacity rotate-12 pointer-events-none">
              link_off
            </span>
          </div>

          {/* Policy Alert Card */}
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/60 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-xs font-bold text-outline uppercase mb-4 tracking-wider font-label-md">Policy Alert</h4>
              <p className="text-base font-bold text-on-surface mb-1 font-headline-sm">Idle EC2 Identification</p>
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                8 instances have had &lt; 1% CPU for 7 days. Move to Spot or Terminate.
              </p>
              <button className="text-primary font-bold text-sm flex items-center gap-1.5 group-hover:gap-2.5 transition-all hover:underline">
                View Instances <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-[120px] text-tertiary opacity-5 group-hover:opacity-10 transition-opacity -rotate-12 pointer-events-none">
              timer_off
            </span>
          </div>

          {/* Storage Audit Card */}
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/60 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-xs font-bold text-outline uppercase mb-4 tracking-wider font-label-md">Storage Audit</h4>
              <p className="text-base font-bold text-on-surface mb-1 font-headline-sm">Old Snapshots</p>
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                Snapshots older than 90 days are consuming 4.2TB ($210/mo) across regions.
              </p>
              <button className="text-primary font-bold text-sm flex items-center gap-1.5 group-hover:gap-2.5 transition-all hover:underline">
                Run Cleanup <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-[120px] text-secondary opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              auto_delete
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
