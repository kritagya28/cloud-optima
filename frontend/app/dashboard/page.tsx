"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useFinOps } from "../context/FinOpsContext";
import { auth } from "../lib/firebase";

export default function OverviewDashboard() {
  const {
    resources,
    activeRegion,
    terminateResource,
    resizeResource,
    releaseResource,
    deleteResource,
    searchTerm,
    dashboardSummary,
    userUid
  } = useFinOps();
  const router = useRouter();

  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // Local states for live data hydration
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [credentialsMissing, setCredentialsMissing] = useState(false);

  React.useEffect(() => {
    const user = auth.currentUser;
    const uidToUse = user?.uid || userUid;

    if (!uidToUse) {
      setCredentialsMissing(true);
      setDashboardData(null);
      return;
    }

    const accessKeyId = localStorage.getItem(`aws_access_${uidToUse}`);
    const secretAccessKey = localStorage.getItem(`aws_secret_${uidToUse}`);
    const region = localStorage.getItem(`aws_region_${uidToUse}`) || "us-east-1";

    if (!accessKeyId || !secretAccessKey) {
      setCredentialsMissing(true);
      setDashboardData(null); // clear old dashboard data when switching users
      return;
    }

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const response = await fetch("http://localhost:5000/api/get-dashboard-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            accessKeyId,
            secretAccessKey,
            region
          })
        });
        const data = await response.json();
        if (data.success) {
          setDashboardData(data);
          setCredentialsMissing(false);
        } else {
          console.error("Failed to fetch dashboard data:", data.message);
          setCredentialsMissing(true);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setCredentialsMissing(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userUid]);

  // Handle loading and missing credential screens
  if (credentialsMissing) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0f172a] text-on-surface p-8">
        <div className="max-w-md w-full text-center space-y-6 bg-[#1e293b]/40 border border-outline-variant p-8 rounded-2xl shadow-xl">
          <div className="w-16 h-16 bg-primary-container/20 rounded-full flex items-center justify-center mx-auto text-primary">
            <span className="material-symbols-outlined text-4xl">cloud_off</span>
          </div>
          <h3 className="text-xl font-bold font-display-md text-on-surface">AWS Account Not Connected</h3>
          <p className="text-sm text-secondary leading-relaxed font-body-md">
            Please connect your AWS account in Settings to start monitoring and optimizing your cloud infrastructure costs.
          </p>
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="w-full py-3 bg-primary text-on-primary font-semibold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0f172a] text-on-surface p-8">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-secondary animate-pulse font-body-md">
            Fetching live AWS infrastructure...
          </p>
        </div>
      </div>
    );
  }

  // Dynamic calculations based on state actions and backend summary
  const forecastedCost = dashboardSummary ? dashboardSummary.totalEstimatedMonthlyCost : 2651.80;
  const potentialSavings = dashboardSummary ? dashboardSummary.totalPotentialSavings : 248.19;

  const currentActiveResources = dashboardData 
    ? dashboardData.activeResourcesCount 
    : (resources.length > 0 
        ? resources.filter(r => ["Running", "Idle", "Critical"].includes(r.status)).length 
        : 142);

  const formattedPotential = potentialSavings.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });

  const formattedForecasted = forecastedCost.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });

  // Filter resources shown in the table
  const filteredResources = resources.filter((r) => {
    // Search filter
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase());

    // Region filter
    const matchesRegion =
      activeRegion === "global" ? true : r.region === activeRegion;

    return matchesSearch && matchesRegion;
  });

  // Handle recommendation actions directly from overview page
  const handleQuickAction = (id: string, action: "terminate" | "resize" | "release" | "delete") => {
    if (action === "terminate") terminateResource(id);
    else if (action === "resize") resizeResource(id);
    else if (action === "release") releaseResource(id);
    else if (action === "delete") deleteResource(id);
  };

  // Dynamically calculate service costs and percentages from context resources (or fallback if empty)
  const hasResources = resources.length > 0;
  
  const ec2Cost = hasResources ? resources.filter(r => r.category === "EC2").reduce((sum, r) => sum + r.cost, 0) : 1245.50;
  const rdsCost = hasResources ? resources.filter(r => r.category === "RDS").reduce((sum, r) => sum + r.cost, 0) : 650.00;
  const s3Cost = hasResources ? resources.filter(r => r.category === "S3").reduce((sum, r) => sum + r.cost, 0) : 480.20;
  const ebsCost = hasResources ? resources.filter(r => r.category === "EBS Volume" || r.category === "EBS").reduce((sum, r) => sum + r.cost, 0) : 180.30;
  const otherCost = hasResources ? resources.filter(r => !["EC2", "RDS", "S3", "EBS", "EBS Volume"].includes(r.category)).reduce((sum, r) => sum + r.cost, 0) : 95.80;

  const totalCost = ec2Cost + rdsCost + s3Cost + ebsCost + otherCost;

  const ec2Percent = totalCost > 0 ? Math.round((ec2Cost / totalCost) * 100) : 0;
  const rdsPercent = totalCost > 0 ? Math.round((rdsCost / totalCost) * 100) : 0;
  const s3Percent = totalCost > 0 ? Math.round((s3Cost / totalCost) * 100) : 0;
  const ebsPercent = totalCost > 0 ? Math.round((ebsCost / totalCost) * 100) : 0;
  const otherPercent = totalCost > 0 ? Math.round((otherCost / totalCost) * 100) : 0;

  // Format correctly as an array of objects containing standard name and value keys
  const chartData = dashboardData && dashboardData.serviceCosts
    ? dashboardData.serviceCosts.map((item: any) => ({
        name: item.service,
        value: item.percentage,
        cost: item.cost
      }))
    : [
        { name: "EC2", value: ec2Percent, cost: ec2Cost },
        { name: "RDS", value: rdsPercent, cost: rdsCost },
        { name: "S3", value: s3Percent, cost: s3Cost },
        { name: "EBS", value: ebsPercent, cost: ebsCost },
        { name: "Others", value: otherPercent, cost: otherCost }
      ];

  const colors = [
    "rgba(59, 130, 246, 1)",
    "rgba(59, 130, 246, 0.8)",
    "rgba(59, 130, 246, 0.6)",
    "rgba(59, 130, 246, 0.4)",
    "rgba(148, 163, 184, 0.6)"
  ];

  const serviceCosts = chartData.map((item: any, idx: number) => ({
    name: item.name,
    cost: item.cost,
    percentage: item.value,
    styleHeight: `${item.value}%`,
    color: colors[idx % colors.length]
  }));

  const resourcesToRender = dashboardData && dashboardData.ec2Instances
    ? dashboardData.ec2Instances.map((inst: any) => ({
        id: inst.id,
        name: inst.id,
        type: inst.type,
        region: inst.region,
        cost: inst.cost,
        status: inst.state === "running" ? "Running" : "Idle"
      }))
    : filteredResources;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 bg-[#0f172a] text-on-surface">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Hero Stats Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Forecasted Cost */}
          <div className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between rounded-xl hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-0.5">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label-md">
                Forecasted Cost
              </span>
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>
                trending_up
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-4xl font-bold text-on-surface font-display-lg">{formattedForecasted}</h3>
              <p className="text-xs text-secondary mt-1 font-label-md">Next 30 days projection</p>
            </div>
          </div>

          {/* Optimization Potential */}
          <div className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between rounded-xl hover:border-tertiary/50 transition-all duration-300 transform hover:-translate-y-0.5">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label-md">
                Optimization Potential
              </span>
              <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 0" }}>
                savings
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-4xl font-bold text-tertiary font-display-lg">{formattedPotential}</h3>
              <p className="text-xs text-secondary mt-1 font-label-md">Estimated monthly savings</p>
            </div>
          </div>

          {/* Active Resources */}
          <div className="bg-surface-container border border-outline-variant p-6 flex flex-col justify-between rounded-xl hover:border-outline/50 transition-all duration-300 transform hover:-translate-y-0.5">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label-md">
                Active Resources
              </span>
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 0" }}>
                hub
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-4xl font-bold text-on-surface font-display-lg">{currentActiveResources}</h3>
              <p className="text-xs text-secondary mt-1 font-label-md">Instances & compute units</p>
            </div>
          </div>
        </div>

        {/* Central Chart & Recommendations Section */}
        <div className="grid grid-cols-12 gap-6">
          {/* Cost by Service Chart (Col-span 8) */}
          <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant p-6 rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-on-surface font-headline-sm">Cost by Service</h3>
              <div className="flex gap-2">
                <button className="text-xs font-semibold px-4 py-1.5 bg-[#334155] text-on-surface rounded-lg">
                  Daily
                </button>
                <button className="text-xs font-semibold px-4 py-1.5 hover:bg-[#334155] text-on-surface-variant hover:text-on-surface rounded-lg transition-colors">
                  Weekly
                </button>
              </div>
            </div>
            
            {/* Chart Visual */}
            <div className="h-64 flex items-end gap-10 px-4 pt-6 border-b border-outline-variant/30 pb-4">
              {serviceCosts.map((service: any) => (
                <div key={service.name} className="flex-1 h-full flex flex-col justify-end items-center gap-3">
                  <div
                    onMouseEnter={() => setHoveredBar(service.name)}
                    onMouseLeave={() => setHoveredBar(null)}
                    style={{ height: service.styleHeight, backgroundColor: service.color }}
                    className="w-full rounded-t-lg relative group transition-all duration-300 hover:brightness-110 cursor-pointer shadow-md"
                  >
                    {/* Tooltip */}
                    <div
                      className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1e293b] border border-outline-variant text-on-surface px-2.5 py-1 rounded-lg transition-all duration-200 font-mono text-xs shadow-lg ${
                        hoveredBar === service.name ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                      }`}
                    >
                      ${service.cost.toLocaleString()}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-on-surface-variant font-label-md">{service.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Recommendations (Col-span 4) */}
          <div className="col-span-12 lg:col-span-4 bg-surface-container border border-outline-variant p-6 rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-on-surface font-headline-sm mb-5">Saving Recommendations</h3>
              <div className="space-y-4">
                {/* Dynamic recommendations from backend context */}
                {resources.filter(r => ["Critical", "Orphaned", "Idle"].includes(r.status)).slice(0, 3).map((r) => {
                  let actionLabel = "Optimize Resource";
                  let actionType: "terminate" | "resize" | "release" | "delete" = "resize";
                  let borderColor = "border-outline-variant";
                  let hoverColor = "group-hover:text-primary";

                  if (r.category === "EC2") {
                    actionLabel = "Terminate Unused EC2";
                    actionType = "terminate";
                    borderColor = "border-tertiary";
                    hoverColor = "group-hover:text-tertiary";
                  } else if (r.category === "RDS") {
                    actionLabel = "Resize Read Replica";
                    actionType = "resize";
                    borderColor = "border-primary";
                    hoverColor = "group-hover:text-primary";
                  } else if (r.category === "Elastic IP") {
                    actionLabel = "Release Unattached EIP";
                    actionType = "release";
                    borderColor = "border-primary";
                    hoverColor = "group-hover:text-primary";
                  } else if (r.category === "EBS Volume" || r.category === "EBS") {
                    actionLabel = "Delete Unused Volume";
                    actionType = "delete";
                    borderColor = "border-error";
                    hoverColor = "group-hover:text-error";
                  }

                  return (
                    <div
                      key={r.id}
                      onClick={() => handleQuickAction(r.id, actionType)}
                      className={`p-4 border-l-4 ${borderColor} bg-[#262f40]/20 rounded-r-xl group hover:bg-[#262f40]/40 transition-all duration-200 cursor-pointer flex justify-between items-start`}
                    >
                      <div>
                        <p className={`text-sm font-semibold text-on-surface ${hoverColor} transition-colors`}>{actionLabel}</p>
                        <p className="text-xs text-on-surface-variant mt-1 font-mono">{r.name} ({r.region})</p>
                      </div>
                      <span className="text-sm font-bold text-tertiary font-mono">-${r.cost}</span>
                    </div>
                  );
                })}

                {/* Static Placeholder showing optimized feedback if everything resolved */}
                {resources.filter(r => ["Critical", "Orphaned", "Idle"].includes(r.status)).length === 0 && (
                  <div className="p-8 border border-dashed border-outline-variant/60 rounded-xl text-center text-sm text-on-surface-variant flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
                    <p className="font-semibold text-on-surface">Congratulations!</p>
                    <p className="text-xs">All immediate cost anomalies resolved.</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => router.push("/dashboard/scanner")}
              className="w-full mt-6 text-primary font-semibold text-xs flex items-center justify-center gap-1 hover:underline transition-all hover:gap-2"
            >
              View all recommendations
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Detailed Table Grid */}
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant/80 flex justify-between items-center bg-[#1e293b]/40">
            <h3 className="text-lg font-bold text-on-surface font-headline-sm">Recent Resource Activity</h3>
            <span className="text-xs text-on-surface-variant bg-[#111827] px-3 py-1 rounded-full font-mono border border-outline-variant/40">
              Region Filter: {activeRegion.toUpperCase()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1e293b]/60 border-b border-outline-variant/60">
                  <th className="px-6 py-3.5 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-md">Resource ID</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-md">Type</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-md">Region</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-md text-right">Mtd Cost</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-md">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-sm">
                {resourcesToRender.slice(0, 4).map((resource: any) => (
                  <tr key={resource.id} className="hover:bg-[#1e293b]/20 transition-all duration-150">
                    <td className="px-6 py-4 font-mono text-on-surface font-medium">{resource.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-[#334155] text-on-surface-variant rounded-lg text-xs font-medium font-mono">
                        {resource.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant font-mono">{resource.region}</td>
                    <td className="px-6 py-4 text-right font-mono text-on-surface font-medium">
                      ${resource.cost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            resource.status === "Running"
                              ? "bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                              : resource.status === "Idle"
                              ? "bg-yellow-500"
                              : resource.status === "Critical"
                              ? "bg-error animate-pulse"
                              : "bg-[#475569]"
                          }`}
                        />
                        <span className="capitalize">{resource.status.toLowerCase()}</span>
                      </span>
                    </td>
                  </tr>
                ))}
                
                {resourcesToRender.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-on-surface-variant font-medium">
                      No resources found matching the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-3.5 bg-[#1e293b]/40 flex justify-center border-t border-outline-variant/80">
            <button
              onClick={() => router.push("/dashboard/scanner")}
              className="text-primary hover:underline text-xs font-semibold"
            >
              View All Resources
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
