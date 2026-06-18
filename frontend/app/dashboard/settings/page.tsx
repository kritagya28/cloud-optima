"use client";

import React, { useState } from "react";
import { useFinOps } from "../../context/FinOpsContext";
import { auth } from "../../lib/firebase";

export default function Settings() {
  const {
    credentials,
    validateCredentials,
    selectedRegions,
    updateScanningScope,
    userUid
  } = useFinOps();

  // Local Form states
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [authError, setAuthError] = useState(false);

  // Custom region states
  const [showCustomRegionInput, setShowCustomRegionInput] = useState(false);
  const [customRegionName, setCustomRegionName] = useState("");
  const [regionError, setRegionError] = useState("");

  React.useEffect(() => {
    const user = auth.currentUser;
    const uidToUse = user?.uid || userUid;
    if (uidToUse) {
      const savedAccessKey = localStorage.getItem(`aws_access_${uidToUse}`);
      const savedSecretKey = localStorage.getItem(`aws_secret_${uidToUse}`);
      if (savedAccessKey) {
        setAccessKey(savedAccessKey);
      } else if (credentials.accessKeyId && credentials.accessKeyId !== "AKIA****************") {
        setAccessKey(credentials.accessKeyId);
      } else {
        setAccessKey(""); // reset fields when switching user accounts
      }
      if (savedSecretKey) {
        setSecretKey(savedSecretKey);
      } else if (credentials.secretAccessKey && credentials.secretAccessKey !== "••••••••••••••••••••••••••••••••") {
        setSecretKey(credentials.secretAccessKey);
      } else {
        setSecretKey("");
      }
    } else {
      setAccessKey("");
      setSecretKey("");
    }
  }, [credentials, userUid]);

  const handleValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);
    
    if (!accessKey.startsWith("AKIA")) {
      setAuthError(true);
      triggerToast("Failed to validate credentials. Key ID must start with AKIA.");
      return;
    }
    
    const success = await validateCredentials(accessKey, secretKey);
    if (success) {
      const user = auth.currentUser;
      const uidToUse = user?.uid || userUid;
      if (!uidToUse) {
        setAuthError(true);
        triggerToast("Failed to save credentials: User not authenticated.");
        throw new Error("User UID is not available");
      }
      
      // Securely store credentials and region in localStorage scoped by user Firebase UID
      localStorage.setItem(`aws_access_${uidToUse}`, accessKey);
      localStorage.setItem(`aws_secret_${uidToUse}`, secretKey);
      localStorage.setItem(`aws_region_${uidToUse}`, selectedRegions[0] || "us-east-1");
      
      setAuthError(false);
      triggerToast("Credentials validated successfully!");
    } else {
      setAuthError(true);
      triggerToast("Authentication Failed: Invalid Keys");
    }
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg("");
    }, 3000);
  };

  // Region Toggle handler
  const handleRegionToggle = (region: string) => {
    if (selectedRegions.includes(region)) {
      updateScanningScope(selectedRegions.filter((r) => r !== region));
    } else {
      updateScanningScope([...selectedRegions, region]);
    }
  };

  const iamPolicyText = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics",
        "ec2:DescribeInstances",
        "s3:GetBucketTagging",
        "ebs:DescribeVolumes"
      ],
      "Resource": "*"
    }
  ]
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(iamPolicyText);
    setCopied(true);
    triggerToast("IAM Policy copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const regionsList = [
    { id: "us-east-1", name: "US-East-1", desc: "US East (N. Virginia)" },
    { id: "eu-west-1", name: "EU-West-1", desc: "Europe (Ireland)" },
    { id: "ap-southeast-1", name: "AP-Southeast-1", desc: "Asia Pacific (Singapore)" },
    { id: "us-west-2", name: "US-West-2", desc: "US West (Oregon)" },
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 bg-[#0f172a] text-on-surface relative">
      
      {/* Settings Toast */}
      {toastMsg && (
        <div className="absolute bottom-6 right-6 z-50 bg-[#1e293b] border border-primary text-on-surface px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300">
          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="space-y-1.5">
          <h2 className="text-3xl font-bold text-on-surface font-display-lg">AWS Settings</h2>
          <p className="text-sm text-secondary font-body-md">Configure your cloud credentials and scanning parameters to optimize infrastructure costs.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Credentials & Scope (Col-span 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Credentials Card */}
            <section className="bg-[#1e293b]/40 border border-outline-variant/60 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">key</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface font-headline-sm">AWS Account Credentials</h3>
                </div>
                
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  credentials.isValidated
                    ? "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    credentials.isValidated ? "bg-green-500" : "bg-red-500 animate-pulse"
                  }`} />
                  {credentials.isValidated ? "Validated" : "Not Validated"}
                </div>
              </div>

              <form onSubmit={handleValidation} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-md">AWS Access Key ID</label>
                  <input
                    type="text"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    className="w-full bg-[#111827] border border-outline-variant/60 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    placeholder="AKIAXXXXXXXXXXXXXXXX"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-md">Secret Access Key</label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      className="w-full bg-[#111827] border border-outline-variant/60 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                      placeholder="Enter secret key"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showSecret ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {authError && (
                  <p className="text-error text-xs font-semibold mt-2 animate-pulse">
                    Authentication Failed: Invalid Keys
                  </p>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={credentials.isPending}
                    className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {credentials.isPending ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px] mr-1">sync</span>
                        <span>Validating...</span>
                      </>
                    ) : (
                      <span>Validate Credentials</span>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Region checklist */}
            <section className="bg-[#1e293b]/40 border border-outline-variant/60 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-secondary-container/60 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">public</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface font-headline-sm">Scanning Scope</h3>
                  <p className="text-xs text-secondary mt-0.5">Select the regions CloudOptix will monitor for optimization.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {regionsList.map((region) => {
                  const isChecked = selectedRegions.includes(region.id);
                  return (
                    <label
                      key={region.id}
                      className={`group relative border rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between ${
                        isChecked
                          ? "border-primary bg-primary/5"
                          : "border-outline-variant/60 bg-[#111827]/40 hover:bg-[#1e293b]/30"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">{region.name}</span>
                        <span className="text-xs text-secondary mt-0.5">{region.desc}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleRegionToggle(region.id)}
                        className="w-5 h-5 rounded border-outline-variant/60 text-primary bg-[#111827] focus:ring-primary/20 cursor-pointer transition-all"
                      />
                    </label>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowCustomRegionInput(true)}
                className="mt-6 w-full py-3 border border-outline text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add More Regions
              </button>

              {showCustomRegionInput && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setRegionError("");
                    // Simple AWS region format validation: e.g. us-east-1, ap-southeast-2
                    const regionRegex = /^[a-z]{2,3}-[a-z]+-[0-9]$/;
                    if (!regionRegex.test(customRegionName)) {
                      setRegionError("Invalid AWS region format. Must be like 'us-east-1'.");
                      return;
                    }
                    // If valid, add it
                    updateScanningScope([...selectedRegions, customRegionName]);
                    setCustomRegionName("");
                    setShowCustomRegionInput(false);
                  }}
                  className="mt-4 p-4 border border-outline-variant bg-[#111827]/60 rounded-xl space-y-3"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-md block">Custom AWS Region</label>
                    <input
                      type="text"
                      placeholder="e.g. ap-southeast-2"
                      value={customRegionName}
                      onChange={(e) => setCustomRegionName(e.target.value)}
                      className="w-full bg-[#111827] border border-outline-variant/60 rounded-xl px-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                  </div>
                  {regionError && (
                    <p className="text-error text-xs font-semibold animate-pulse block" id="region-validation-error">
                      {regionError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Add Region
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomRegionInput(false);
                        setCustomRegionName("");
                        setRegionError("");
                      }}
                      className="flex-1 py-2 bg-[#334155] text-on-surface text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>

          {/* Right Column: IAM Policy (Col-span 5) */}
          <div className="lg:col-span-5 h-full">
            <section className="bg-[#1e293b]/40 border border-outline-variant/60 rounded-xl flex flex-col h-full shadow-sm">
              <div className="p-6 border-b border-outline-variant/60">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-tertiary-container/30 flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined text-[20px]">policy</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface font-headline-sm">IAM Policy Verification</h3>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Attach this least-privilege policy to your IAM user for read-only metadata access.
                </p>
              </div>

              <div className="p-6 flex-1 space-y-6">
                {/* Code Block Container */}
                <div className="bg-[#0b0f19] rounded-xl border border-outline-variant/60 relative overflow-hidden group">
                  <div className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={copyToClipboard}
                      className="p-2 bg-[#1e293b] border border-outline-variant rounded-lg hover:bg-primary hover:text-on-primary transition-all shadow-md active:scale-95"
                      title="Copy Policy"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {copied ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                  <pre className="p-4 font-mono text-[11px] leading-relaxed text-blue-300 overflow-x-auto custom-scrollbar whitespace-pre">
                    {iamPolicyText}
                  </pre>
                </div>

                {/* Permission Status */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-outline">Permission Status</h4>
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-on-surface">
                        <span className="material-symbols-outlined text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check_circle
                        </span>
                        Cost Explorer Access
                      </span>
                      <span className="text-green-500 font-semibold">Active</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-on-surface">
                        <span className="material-symbols-outlined text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check_circle
                        </span>
                        EC2 Metadata Read
                      </span>
                      <span className="text-green-500 font-semibold">Active</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-on-surface">
                        <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                          cancel
                        </span>
                        CloudWatch Metrics
                      </span>
                      <span className="text-error font-semibold">Access Denied</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-[#111827]/30 border-t border-outline-variant/60 rounded-b-xl">
                <button
                  onClick={copyToClipboard}
                  className="w-full py-3 bg-[#334155] text-on-surface hover:bg-primary hover:text-on-primary rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[20px]">content_copy</span>
                  Copy Policy JSON
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* Footer info banner */}
        <div className="pt-8 border-t border-outline-variant/40 text-center text-xs text-outline leading-relaxed max-w-xl mx-auto">
          <p>
            CloudOptix uses AWS STS for secure, ephemeral session tokens when scanning.
            No sensitive long-term configuration data is stored.
          </p>
        </div>

      </div>
    </div>
  );
}
