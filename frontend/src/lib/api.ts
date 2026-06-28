const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface Location {
  lat: number;
  lng: number;
  address: string;
  city: string;
}

export interface IssueReportPayload {
  reporterId: string;
  description: string;
  location: Location;
  mediaUrl: string;
  mediaType: "image" | "video" | "voice";
}

export interface ValidationPayload {
  issueId: string;
  userId: string;
  vote: "upvote" | "confirm" | "reject";
  comment?: string;
}

// User Profile interface
export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: "citizen" | "authority";
  points: number;
  badges: string[];
}

// Issue data interface
export interface Issue {
  issueId: string;
  reporterId: string;
  category: string;
  description: string;
  aiDescription?: string;
  status: "reported" | "under_review" | "assigned" | "in_progress" | "resolved";
  severity: "Low" | "Medium" | "High" | "Critical";
  confidenceScore: number;
  location: Location;
  mediaUrl: string;
  mediaType: "image" | "video" | "voice";
  priorityScore: number;
  riskScore: number;
  futureSeverity: string;
  accidentProbability: number;
  escalationProbability: number;
  verificationCount: number;
  duplicateCount: number;
  trustScore: number;
  locationImpactScore: number;
  nearbyCriticalZones: string[];
  isDuplicate: boolean;
  mergedInto: string | null;
  resolutionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolutionPlan {
  resolutionId: string;
  issueId: string;
  department: string;
  timeline: string;
  resources: string[];
  recommendedActions: string[];
  costEstimate: number;
  assignedTo: string | null;
  status: "pending" | "assigned" | "completed";
}

export interface IssueDetailsResponse {
  issue: Issue;
  resolution: ResolutionPlan | null;
  duplicates: Array<{
    issueId: string;
    reporterId: string;
    mediaUrl: string;
    createdAt: string;
  }>;
}

export interface Hotspot {
  clusterId: string;
  latitude: number;
  longitude: number;
  issueCount: number;
  averagePriority: number;
  averageRisk: number;
  categories: string[];
  issueIds: string[];
}

export interface AnalyticsResponse {
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  categoryBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  riskHotspots: Hotspot[];
  averagePriorityScore: number;
  nextWeekForecastCount: number;
  weeklyTrendData: Array<{ week: string; count: number }>;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  badges: string[];
}

export interface SimulationResponse {
  infrastructureDeterioration: string;
  safetyRisks: string;
  publicHealthImpacts: string;
  trafficDisruption: string;
  additionalComplaints: number;
  costEscalation: Array<{ day: number; cost: number }>;
  narrativeSummary: string;
}

export const api = {
  // Auth API
  registerUser: async (userId: string, name: string, email: string, role = "citizen"): Promise<UserProfile> => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name, email, role }),
    });
    if (!res.ok) throw new Error("Failed to register user");
    return res.json();
  },

  getUserProfile: async (userId: string): Promise<UserProfile> => {
    const res = await fetch(`${API_BASE_URL}/auth/profile/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch user profile");
    return res.json();
  },

  // Issues API
  reportIssue: async (payload: IssueReportPayload) => {
    const res = await fetch(`${API_BASE_URL}/issues/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to report issue");
    return res.json();
  },

  getIssues: async (filters?: { status?: string; category?: string; reporterId?: string }): Promise<Issue[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.reporterId) params.append("reporterId", filters.reporterId);
    
    const res = await fetch(`${API_BASE_URL}/issues/?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch issues");
    return res.json();
  },

  getIssueDetails: async (issueId: string): Promise<IssueDetailsResponse> => {
    const res = await fetch(`${API_BASE_URL}/issues/${issueId}`);
    if (!res.ok) throw new Error("Failed to fetch issue details");
    return res.json();
  },

  updateIssueStatus: async (issueId: string, status: string, authorityUserId: string) => {
    const res = await fetch(`${API_BASE_URL}/issues/${issueId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, authorityUserId }),
    });
    if (!res.ok) throw new Error("Failed to update status");
    return res.json();
  },

  // Validations API
  submitValidation: async (payload: ValidationPayload) => {
    const res = await fetch(`${API_BASE_URL}/validations/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to submit validation");
    return res.json();
  },

  // Analytics API
  getDashboardAnalytics: async (): Promise<AnalyticsResponse> => {
    const res = await fetch(`${API_BASE_URL}/analytics/dashboard`);
    if (!res.ok) throw new Error("Failed to fetch dashboard analytics");
    return res.json();
  },

  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const res = await fetch(`${API_BASE_URL}/analytics/leaderboard`);
    if (!res.ok) throw new Error("Failed to fetch leaderboard");
    return res.json();
  },

  // Impact Simulator API
  getNeglectSimulation: async (issueId: string): Promise<SimulationResponse> => {
    const res = await fetch(`${API_BASE_URL}/issues/${issueId}/simulate-impact`);
    if (!res.ok) throw new Error("Failed to run neglect simulation");
    return res.json();
  }
};
