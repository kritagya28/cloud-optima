"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export interface LoginHistoryItem {
  email: string;
  timestamp: string;
  userAgent: string;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  category: "EC2" | "RDS" | "EBS" | "S3" | "Elastic IP" | "EBS Volume";
  region: string;
  cost: number;
  status: "Running" | "Idle" | "Orphaned" | "Critical" | "Terminated" | "Resized" | "Released" | "Deleted";
  utilization: string;
  utilizationVal?: number; // percentage
  statusMessage?: string;
}

export interface Export {
  id: string;
  name: string;
  type: string;
  date: string;
  size: string;
  format: "pdf" | "csv" | "json";
}

export interface Job {
  id: string;
  name: string;
  schedule: string;
  status: "Active" | "Paused";
}

interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  isValidated: boolean;
  isPending: boolean;
}

interface FinOpsContextType {
  user: {
    name: string;
    avatar: string;
    role: string;
  };
  isAuthenticated: boolean;
  activeRegion: string;
  resources: Resource[];
  exports: Export[];
  jobs: Job[];
  credentials: Credentials;
  searchTerm: string;
  isScanning: boolean;
  setSearchTerm: (term: string) => void;
  setActiveRegion: (region: string) => void;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithFacebook: () => Promise<boolean>;
  logout: () => void;
  terminateResource: (id: string) => void;
  resizeResource: (id: string) => void;
  releaseResource: (id: string) => void;
  deleteResource: (id: string) => void;
  rescanInventory: () => Promise<void>;
  addJob: (name: string, schedule: string) => void;
  toggleJobStatus: (id: string) => void;
  deleteJob: (id: string) => void;
  generateReport: (type: string, range: string, format: "pdf" | "csv" | "json") => Promise<void>;
  validateCredentials: (keyId: string, secretKey: string) => Promise<boolean>;
  updateScanningScope: (regions: string[]) => void;
  selectedRegions: string[];
  dashboardSummary: {
    totalEstimatedMonthlyCost: number;
    totalPotentialSavings: number;
    serviceCosts: Array<{ service: string; cost: number; percentage: number }>;
    recommendationsCount: number;
  } | null;
  loginHistory: LoginHistoryItem[];
  fetchLoginHistory: () => Promise<void>;
  userEmail: string;
  userUid: string;
}

const FinOpsContext = createContext<FinOpsContextType | undefined>(undefined);

export const useFinOps = () => {
  const context = useContext(FinOpsContext);
  if (!context) {
    throw new Error("useFinOps must be used within a FinOpsProvider");
  }
  return context;
};

const initialResources: Resource[] = [
  {
    id: "res-1",
    name: "i-0a92384fec1",
    type: "m5.xlarge",
    category: "EC2",
    region: "us-east-1",
    cost: 452.12,
    status: "Running",
    utilization: "10% CPU",
    utilizationVal: 10,
  },
  {
    id: "res-2",
    name: "db-prod-main",
    type: "db.r5.large",
    category: "RDS",
    region: "eu-west-1",
    cost: 812.45,
    status: "Running",
    utilization: "35% CPU",
    utilizationVal: 35,
  },
  {
    id: "res-3",
    name: "s3-archive-logs",
    type: "Standard",
    category: "S3",
    region: "us-west-2",
    cost: 124.9,
    status: "Idle",
    utilization: "0% CPU",
    utilizationVal: 0,
  },
  {
    id: "res-4",
    name: "i-0a823f99e281",
    type: "t3.large",
    category: "EC2",
    region: "us-east-1",
    cost: 148.0,
    status: "Critical",
    statusMessage: "Critical: 0% CPU",
    utilization: "0.2% CPU",
    utilizationVal: 0.2,
  },
  {
    id: "res-5",
    name: "eipalloc-042ff3",
    type: "Elastic IP",
    category: "Elastic IP",
    region: "us-east-1",
    cost: 3.6,
    status: "Orphaned",
    statusMessage: "Orphaned Static IP",
    utilization: "Unattached",
  },
  {
    id: "res-6",
    name: "prod-read-replica-01",
    type: "db.m5.xlarge",
    category: "RDS",
    region: "us-east-1",
    cost: 512.4,
    status: "Idle",
    statusMessage: "Low IOPS detected",
    utilization: "14.5% IOPS",
    utilizationVal: 14.5,
  },
  {
    id: "res-7",
    name: "vol-084e3199c0",
    type: "gp3",
    category: "EBS Volume",
    region: "us-east-1",
    cost: 24.0,
    status: "Critical",
    statusMessage: "Detached for 30+ days",
    utilization: "No Attachment",
  },
];

const initialExports: Export[] = [
  {
    id: "exp-0",
    name: "Monthly_Comparison_Report.pdf",
    type: "Monthly Comparison",
    date: "Jun 15, 2026 · 10:00",
    size: "1.8 MB",
    format: "pdf",
  },
  {
    id: "exp-1",
    name: "May_Budget_Review_Final.pdf",
    type: "Budget Variance",
    date: "Jun 01, 2026 · 09:12",
    size: "2.4 MB",
    format: "pdf",
  },
  {
    id: "exp-2",
    name: "Raw_Instance_Utilization_Q1.csv",
    type: "Resource Waste",
    date: "May 28, 2026 · 14:45",
    size: "14.8 MB",
    format: "csv",
  },
  {
    id: "exp-3",
    name: "Infrastructure_Graph_Export.json",
    type: "Resource Scanner",
    date: "May 25, 2026 · 11:30",
    size: "842 KB",
    format: "json",
  },
  {
    id: "exp-4",
    name: "Zombie_Resources_Audit_Apr.pdf",
    type: "Resource Waste",
    date: "May 20, 2026 · 08:00",
    size: "1.2 MB",
    format: "pdf",
  },
];

const initialJobs: Job[] = [
  {
    id: "job-1",
    name: "Exec Weekly Rollup",
    schedule: "Every Mon at 08:00 UTC",
    status: "Active",
  },
  {
    id: "job-2",
    name: "Waste Audit",
    schedule: "1st of every month",
    status: "Active",
  },
  {
    id: "job-3",
    name: "Compliance Log",
    schedule: "Paused",
    status: "Paused",
  },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const mapBackendResourceToFrontend = (rec: any): Resource => {
  let category: Resource["category"] = "EC2";
  let type = "Standard";
  let status: Resource["status"] = "Running";
  let utilization = "";
  let utilizationVal: number | undefined = undefined;

  switch (rec.resourceType) {
    case "EC2":
      category = "EC2";
      type = rec.type || "t3.large";
      utilization = rec.metrics?.cpuUtilizationAvg !== undefined ? `${rec.metrics.cpuUtilizationAvg}% CPU` : "10% CPU";
      utilizationVal = rec.metrics?.cpuUtilizationAvg !== undefined ? rec.metrics.cpuUtilizationAvg : 10;
      break;
    case "EBS":
      category = "EBS Volume";
      type = "gp3";
      utilization = rec.metrics?.sizeGB ? `${rec.metrics.sizeGB} GB` : "No Attachment";
      break;
    case "S3":
      category = "S3";
      type = "Standard";
      utilization = rec.metrics?.sizeGB ? `${rec.metrics.sizeGB} GB` : "0% CPU";
      break;
    case "EIP":
      category = "Elastic IP";
      type = "Elastic IP";
      utilization = "Unattached";
      break;
  }

  if (rec.status === "optimized" || rec.potentialSavings === 0) {
    if (rec.resourceType === "EC2") status = "Terminated";
    else if (rec.resourceType === "EIP") status = "Released";
    else status = "Deleted";
  } else {
    if (rec.optimizationStatus === "idle") status = "Idle";
    else if (rec.optimizationStatus === "orphaned") status = "Orphaned";
    else if (rec.optimizationStatus === "underutilized") status = "Idle";
    else if (rec.status === "running") status = "Running";
    else status = "Critical";
  }

  return {
    id: rec.resourceId,
    name: rec.resourceName || rec.resourceId,
    type,
    category,
    region: rec.region,
    cost: rec.costEstimation,
    status,
    utilization,
    utilizationVal,
    statusMessage: rec.recommendation
  };
};

export const FinOpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeRegion, setActiveRegion] = useState("us-east-1");
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [exports, setExports] = useState<Export[]>(initialExports);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [searchTerm, setSearchTerm] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(["us-east-1", "eu-west-1"]);
  const [userEmail, setUserEmail] = useState<string>("admin@cloudoptix.com");
  const [userUid, setUserUid] = useState<string>("");
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [userProfile, setUserProfile] = useState({
    name: "Alex Chen",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCq9VARfkurITnSC-9KLZ9x0Wl1JDsBEQ7eU7H8ffzKV590rEKMzchPYE6QWrgr8onWEePlduRAx5Xf9npH8UKjrZiKu5OiBMOKd6rV8Pp8dESbZ4umWlTrOx5xM8GQcV1-6MsJ7TaAV1Ul3paFZg8byYCIDiUtjAk1o4UVv76fZeczASfkHyC_IO1wvGKpnu06L6DzrIGA8REL5-X3K2z0pGFY-VGCpibpeNrvL-lDsaO3tjdErF64buUrUt00DkXDdedTMVZX-qQ",
    role: "Cloud Architect",
  });

  const [dashboardSummary, setDashboardSummary] = useState<{
    totalEstimatedMonthlyCost: number;
    totalPotentialSavings: number;
    serviceCosts: Array<{ service: string; cost: number; percentage: number }>;
    recommendationsCount: number;
  } | null>(null);

  const [credentials, setCredentials] = useState<Credentials>({
    accessKeyId: "AKIA****************",
    secretAccessKey: "••••••••••••••••••••••••••••••••",
    isValidated: false,
    isPending: false,
  });

  const fetchResources = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/resources/scanner?region=${activeRegion}`, {
        headers: {
          "x-user-id": userEmail
        }
      });
      const data = await res.json();
      if (data && data.recommendations) {
        const mapped = data.recommendations.map(mapBackendResourceToFrontend);
        setResources(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch resources:", err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/summary?region=${activeRegion}`, {
        headers: {
          "x-user-id": userEmail
        }
      });
      const data = await res.json();
      if (data) {
        setDashboardSummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  };

  const fetchLoginHistory = async () => {
    try {
      const historyRef = collection(db, "loginHistory");
      const q = query(historyRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        let formattedTime = "Just now";
        if (data.timestamp) {
          const t = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          formattedTime = t.toLocaleString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });
        } else if (data.loginTimeStr) {
          formattedTime = new Date(data.loginTimeStr).toLocaleString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });
        }
        return {
          email: data.email || "unknown",
          timestamp: formattedTime,
          userAgent: data.userAgent || "unknown"
        };
      });
      setLoginHistory(items);
    } catch (err) {
      console.warn("Failed to fetch login history from Firebase:", err);
    }
  };

  // Restore session and track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUserEmail(firebaseUser.email || "unknown@cloudoptix.com");
        setUserUid(firebaseUser.uid);
        setUserProfile({
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
          avatar: firebaseUser.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuCq9VARfkurITnSC-9KLZ9x0Wl1JDsBEQ7eU7H8ffzKV590rEKMzchPYE6QWrgr8onWEePlduRAx5Xf9npH8UKjrZiKu5OiBMOKd6rV8Pp8dESbZ4umWlTrOx5xM8GQcV1-6MsJ7TaAV1Ul3paFZg8byYCIDiUtjAk1o4UVv76fZeczASfkHyC_IO1wvGKpnu06L6DzrIGA8REL5-X3K2z0pGFY-VGCpibpeNrvL-lDsaO3tjdErF64buUrUt00DkXDdedTMVZX-qQ",
          role: "Cloud Architect",
        });
        setIsAuthenticated(true);
        if (firebaseUser.email === "example@gmail.com") {
          setCredentials({
            accessKeyId: "AKIAEXAMPLE0000000000",
            secretAccessKey: "secretExampleKey12345",
            isValidated: true,
            isPending: false,
          });
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("cloudoptix_authenticated", "true");
          localStorage.setItem("cloudoptix_user_email", firebaseUser.email || "");
          localStorage.setItem("cloudoptix_user_uid", firebaseUser.uid);
          
          if (firebaseUser.email === "example@gmail.com") {
            localStorage.setItem(`aws_access_${firebaseUser.uid}`, "AKIAEXAMPLE0000000000");
            localStorage.setItem(`aws_secret_${firebaseUser.uid}`, "secretExampleKey12345");
            localStorage.setItem(`aws_region_${firebaseUser.uid}`, "us-east-1");
          }
        }
      } else {
        const isMockAuth = typeof window !== "undefined" &&
                           localStorage.getItem("cloudoptix_authenticated") === "true" &&
                           localStorage.getItem("cloudoptix_user_email") === "example@gmail.com";
        
        if (isMockAuth) {
          const mockUid = "mock-uid-12345";
          setUserEmail("example@gmail.com");
          setUserUid(mockUid);
          setUserProfile({
            name: "example",
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCq9VARfkurITnSC-9KLZ9x0Wl1JDsBEQ7eU7H8ffzKV590rEKMzchPYE6QWrgr8onWEePlduRAx5Xf9npH8UKjrZiKu5OiBMOKd6rV8Pp8dESbZ4umWlTrOx5xM8GQcV1-6MsJ7TaAV1Ul3paFZg8byYCIDiUtjAk1o4UVv76fZeczASfkHyC_IO1wvGKpnu06L6DzrIGA8REL5-X3K2z0pGFY-VGCpibpeNrvL-lDsaO3tjdErF64buUrUt00DkXDdedTMVZX-qQ",
            role: "Cloud Architect",
          });
          setIsAuthenticated(true);
          setCredentials({
            accessKeyId: "AKIAEXAMPLE0000000000",
            secretAccessKey: "secretExampleKey12345",
            isValidated: true,
            isPending: false,
          });
          if (typeof window !== "undefined") {
            localStorage.setItem(`aws_access_${mockUid}`, "AKIAEXAMPLE0000000000");
            localStorage.setItem(`aws_secret_${mockUid}`, "secretExampleKey12345");
            localStorage.setItem(`aws_region_${mockUid}`, "us-east-1");
          }
        } else {
          setIsAuthenticated(false);
          setUserEmail("");
          setUserUid("");
          setUserProfile({
            name: "Guest",
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCq9VARfkurITnSC-9KLZ9x0Wl1JDsBEQ7eU7H8ffzKV590rEKMzchPYE6QWrgr8onWEePlduRAx5Xf9npH8UKjrZiKu5OiBMOKd6rV8Pp8dESbZ4umWlTrOx5xM8GQcV1-6MsJ7TaAV1Ul3paFZg8byYCIDiUtjAk1o4UVv76fZeczASfkHyC_IO1wvGKpnu06L6DzrIGA8REL5-X3K2z0pGFY-VGCpibpeNrvL-lDsaO3tjdErF64buUrUt00DkXDdedTMVZX-qQ",
            role: "Guest",
          });
          if (typeof window !== "undefined") {
            localStorage.removeItem("cloudoptix_authenticated");
            localStorage.removeItem("cloudoptix_user_email");
            localStorage.removeItem("cloudoptix_user_uid");
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Run fetch when logged in or activeRegion changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchResources();
      fetchSummary();
      fetchLoginHistory();
    }
  }, [isAuthenticated, userEmail, activeRegion]);

  const logAuthHistory = async (email: string) => {
    try {
      const historyRef = collection(db, "loginHistory");
      await addDoc(historyRef, {
        email,
        timestamp: serverTimestamp(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        loginTimeStr: new Date().toISOString()
      });
      fetchLoginHistory();
    } catch (fbErr) {
      console.warn("Firebase login history logging failed:", fbErr);
    }
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    if (email === "example@gmail.com" && pass === "password123") {
      setIsAuthenticated(true);
      setUserEmail(email);
      setUserUid("mock-uid-12345");
      setUserProfile({
        name: "example",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCq9VARfkurITnSC-9KLZ9x0Wl1JDsBEQ7eU7H8ffzKV590rEKMzchPYE6QWrgr8onWEePlduRAx5Xf9npH8UKjrZiKu5OiBMOKd6rV8Pp8dESbZ4umWlTrOx5xM8GQcV1-6MsJ7TaAV1Ul3paFZg8byYCIDiUtjAk1o4UVv76fZeczASfkHyC_IO1wvGKpnu06L6DzrIGA8REL5-X3K2z0pGFY-VGCpibpeNrvL-lDsaO3tjdErF64buUrUt00DkXDdedTMVZX-qQ",
        role: "Cloud Architect",
      });
      setCredentials({
        accessKeyId: "AKIAEXAMPLE0000000000",
        secretAccessKey: "secretExampleKey12345",
        isValidated: true,
        isPending: false,
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("cloudoptix_authenticated", "true");
        localStorage.setItem("cloudoptix_user_email", email);
        localStorage.setItem("cloudoptix_user_uid", "mock-uid-12345");
        localStorage.setItem("aws_access_mock-uid-12345", "AKIAEXAMPLE0000000000");
        localStorage.setItem("aws_secret_mock-uid-12345", "secretExampleKey12345");
        localStorage.setItem("aws_region_mock-uid-12345", "us-east-1");
      }
      await logAuthHistory(email);
      return true;
    }
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    if (userCredential.user) {
      await logAuthHistory(userCredential.user.email || email);
      return true;
    }
    return false;
  };

  const signup = async (email: string, pass: string): Promise<boolean> => {
    if (email === "example@gmail.com" && pass === "password123") {
      setIsAuthenticated(true);
      setUserEmail(email);
      setUserUid("mock-uid-12345");
      setUserProfile({
        name: "example",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCq9VARfkurITnSC-9KLZ9x0Wl1JDsBEQ7eU7H8ffzKV590rEKMzchPYE6QWrgr8onWEePlduRAx5Xf9npH8UKjrZiKu5OiBMOKd6rV8Pp8dESbZ4umWlTrOx5xM8GQcV1-6MsJ7TaAV1Ul3paFZg8byYCIDiUtjAk1o4UVv76fZeczASfkHyC_IO1wvGKpnu06L6DzrIGA8REL5-X3K2z0pGFY-VGCpibpeNrvL-lDsaO3tjdErF64buUrUt00DkXDdedTMVZX-qQ",
        role: "Cloud Architect",
      });
      setCredentials({
        accessKeyId: "AKIAEXAMPLE0000000000",
        secretAccessKey: "secretExampleKey12345",
        isValidated: true,
        isPending: false,
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("cloudoptix_authenticated", "true");
        localStorage.setItem("cloudoptix_user_email", email);
        localStorage.setItem("cloudoptix_user_uid", "mock-uid-12345");
        localStorage.setItem("aws_access_mock-uid-12345", "AKIAEXAMPLE0000000000");
        localStorage.setItem("aws_secret_mock-uid-12345", "secretExampleKey12345");
        localStorage.setItem("aws_region_mock-uid-12345", "us-east-1");
      }
      await logAuthHistory(email);
      return true;
    }
    const { createUserWithEmailAndPassword } = await import("firebase/auth");
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential.user) {
      await logAuthHistory(userCredential.user.email || email);
      return true;
    }
    return false;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    if (userCredential.user) {
      await logAuthHistory(userCredential.user.email || "google-user");
      return true;
    }
    return false;
  };

  const loginWithFacebook = async (): Promise<boolean> => {
    const { signInWithPopup, FacebookAuthProvider } = await import("firebase/auth");
    const provider = new FacebookAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    if (userCredential.user) {
      await logAuthHistory(userCredential.user.email || "facebook-user");
      return true;
    }
    return false;
  };

  const logout = async () => {
    const { signOut } = await import("firebase/auth");
    
    // Clear all credentials and session residue from localStorage on logout for security
    if (typeof window !== "undefined") {
      localStorage.clear();
    }

    await signOut(auth);
    setIsAuthenticated(false);
  };

  // Resource optimization actions calling backend optimize endpoint
  const optimizeResource = async (id: string, actionType: "terminate" | "resize" | "release" | "delete") => {
    try {
      const res = await fetch(`${API_BASE_URL}/resources/optimize/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userEmail
        },
        body: JSON.stringify({ action: "apply" })
      });
      const data = await res.json();
      if (data.success) {
        setResources((prev) =>
          prev.map((r) => {
            if (r.id === id) {
              if (actionType === "resize") {
                const cut = Math.round(r.cost * 0.4 * 100) / 100; // 40% reduction
                return {
                  ...r,
                  status: "Resized" as const,
                  cost: r.cost - cut,
                  type: `t3.medium (resized from ${r.type})`,
                  statusMessage: "Optimized",
                };
              } else if (actionType === "terminate") {
                return { ...r, status: "Terminated" as const, cost: 0, utilization: "0% CPU", utilizationVal: 0 };
              } else if (actionType === "release") {
                return { ...r, status: "Released" as const, cost: 0, utilization: "Released" };
              } else if (actionType === "delete") {
                return { ...r, status: "Deleted" as const, cost: 0, utilization: "Deleted" };
              }
            }
            return r;
          })
        );
        fetchSummary(); // Refresh summary metrics
      }
    } catch (err) {
      console.error(`Failed to apply optimization ${actionType} on resource ${id}:`, err);
    }
  };

  const terminateResource = (id: string) => optimizeResource(id, "terminate");
  const resizeResource = (id: string) => optimizeResource(id, "resize");
  const releaseResource = (id: string) => optimizeResource(id, "release");
  const deleteResource = (id: string) => optimizeResource(id, "delete");

  // Scan action
  const rescanInventory = async (): Promise<void> => {
    setIsScanning(true);
    try {
      await fetchResources();
      await fetchSummary();
    } catch (err) {
      console.error("Rescan failed:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Scheduled Jobs management
  const addJob = (name: string, schedule: string) => {
    const newJob: Job = {
      id: `job-${Date.now()}`,
      name,
      schedule,
      status: "Active",
    };
    setJobs((prev) => [...prev, newJob]);
  };

  const toggleJobStatus = (id: string) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === id) {
          const nextStatus = j.status === "Active" ? "Paused" : "Active";
          return {
            ...j,
            status: nextStatus,
            schedule: nextStatus === "Paused" ? "Paused" : j.schedule === "Paused" ? "Every Mon at 08:00 UTC" : j.schedule,
          };
        }
        return j;
      })
    );
  };

  const deleteJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  // Generate Report simulation
  const generateReport = async (type: string, range: string, format: "pdf" | "csv" | "json"): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const dateNow = new Date();
        const formattedDate = dateNow.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }) + " · " + dateNow.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        const newExport: Export = {
          id: `exp-${Date.now()}`,
          name: `${type.replace(/\s+/g, "_")}_Export_${range.replace(/\s+/g, "_")}.${format}`,
          type,
          date: formattedDate,
          size: `${(Math.random() * 5 + 0.5).toFixed(1)} MB`,
          format,
        };

        setExports((prev) => [newExport, ...prev]);
        resolve();
      }, 1500);
    });
  };

  // Save/validate credentials on Express backend
  const validateCredentials = async (keyId: string, secretKey: string): Promise<boolean> => {
    setCredentials((prev) => ({ ...prev, isPending: true }));
    try {
      // 1. Validate credentials via STS GetCallerIdentityCommand
      const validateRes = await fetch(`${API_BASE_URL}/validate-aws`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userEmail
        },
        body: JSON.stringify({
          accessKeyId: keyId,
          secretAccessKey: secretKey,
          region: "us-east-1"
        })
      });
      const validateData = await validateRes.json();
      
      if (!validateData.success) {
        setCredentials((prev) => ({ ...prev, isValidated: false, isPending: false }));
        return false;
      }

      // 2. Persist encrypted credentials to database
      const saveRes = await fetch(`${API_BASE_URL}/settings/aws`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userEmail
        },
        body: JSON.stringify({
          accessKeyId: keyId,
          secretAccessKey: secretKey,
          region: activeRegion || "us-east-1"
        })
      });
      const saveData = await saveRes.json();

      if (saveData.success) {
        setCredentials({
          accessKeyId: keyId,
          secretAccessKey: secretKey,
          isValidated: true,
          isPending: false,
        });
        fetchResources();
        fetchSummary();
        return true;
      }

      setCredentials((prev) => ({ ...prev, isValidated: false, isPending: false }));
      return false;
    } catch (err) {
      console.error("Credentials validation failed:", err);
      setCredentials((prev) => ({ ...prev, isValidated: false, isPending: false }));
      return false;
    }
  };

  const updateScanningScope = (regions: string[]) => {
    setSelectedRegions(regions);
  };

  return (
    <FinOpsContext.Provider
      value={{
        user: userProfile,
        isAuthenticated,
        activeRegion,
        resources,
        exports,
        jobs,
        credentials,
        searchTerm,
        isScanning,
        setSearchTerm,
        setActiveRegion,
        login,
        signup,
        loginWithGoogle,
        loginWithFacebook,
        logout,
        terminateResource,
        resizeResource,
        releaseResource,
        deleteResource,
        rescanInventory,
        addJob,
        toggleJobStatus,
        deleteJob,
        generateReport,
        validateCredentials,
        updateScanningScope,
        selectedRegions,
        dashboardSummary,
        loginHistory,
        fetchLoginHistory,
        userEmail,
        userUid,
      }}
    >
      {children}
    </FinOpsContext.Provider>
  );
};
