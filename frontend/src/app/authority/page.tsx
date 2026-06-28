"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, RefreshCw, BarChart3, Wrench, 
  Map as MapIcon, Hourglass, CheckCircle2, LayoutDashboard, LogOut, ArrowUpRight
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";
import { api, Issue, AnalyticsResponse } from "src/lib/api";
import Map from "src/components/Map";
import IssueCard from "src/components/IssueCard";
import ImpactModal from "src/components/ImpactModal";

export default function AuthorityDashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  
  // Data States
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected Details State (Drawer/Panel)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedIssueDetails, setSelectedIssueDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Simulator Modal States
  const [selectedIssueForSim, setSelectedIssueForSim] = useState<Issue | null>(null);
  const [isSimOpen, setIsSimOpen] = useState(false);

  useEffect(() => {
    const savedUserId = localStorage.getItem("civicmind_userId");
    const savedRole = localStorage.getItem("civicmind_role");

    if (!savedUserId || savedRole !== "authority") {
      router.push("/");
      return;
    }

    setUserId(savedUserId);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch dashboard analytics (DBSCAN + Trends)
      const data = await api.getDashboardAnalytics();
      setAnalytics(data);

      // 2. Fetch all unique issues
      const issuesList = await api.getIssues();
      setIssues(issuesList);
      
      // Auto select first issue if available to populate side-panel details
      if (issuesList.length > 0 && !selectedIssue) {
        handleSelectIssue(issuesList[0]);
      }
    } catch (err) {
      console.error("Error loading authority details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIssue = async (issue: Issue) => {
    setSelectedIssue(issue);
    setLoadingDetails(true);
    try {
      const details = await api.getIssueDetails(issue.issueId);
      setSelectedIssueDetails(details);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  // Process Category Recharts data format
  const getCategoryChartData = () => {
    if (!analytics?.categoryBreakdown) return [];
    return Object.entries(analytics.categoryBreakdown).map(([name, count]) => ({
      name,
      count
    }));
  };

  const categoryColors = ["#06b6d4", "#a78bfa", "#f59e0b", "#f87171", "#34d399", "#60a5fa"];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      
      {/* Top Navbar */}
      <header className="w-full glass-panel border-b border-white/5 px-6 py-5 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500 flex items-center justify-center font-black text-slate-100 text-base">
            A
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-100">CivicMind India</h1>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">Municipal Authority Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-white/5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400 font-semibold">Decrypting GIS & ML Intelligence...</span>
        </div>
      ) : (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
          
          {/* Key Metric Cards */}
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-900 border border-white/5 rounded-2xl">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Filed</div>
                <div className="text-3xl font-black mt-1 text-slate-100">{analytics.totalIssues}</div>
              </div>
              <div className="p-5 bg-slate-900 border border-white/5 rounded-2xl">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Open Backlog</div>
                <div className="text-3xl font-black mt-1 text-red-400">{analytics.openIssues}</div>
              </div>
              <div className="p-5 bg-slate-900 border border-white/5 rounded-2xl">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Resolved</div>
                <div className="text-3xl font-black mt-1 text-success-emerald">{analytics.resolvedIssues}</div>
              </div>
              <div className="p-5 bg-slate-900 border border-white/5 rounded-2xl">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Average Priority</div>
                <div className="text-3xl font-black mt-1 text-neon-cyan">{analytics.averagePriorityScore}</div>
              </div>
            </div>
          )}

          {/* GIS & Risk Hotspot Map Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* GIS Map container (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between bg-slate-900/40 p-5 border border-white/5 rounded-2xl">
                <div>
                  <h3 className="text-base font-bold text-slate-200 flex items-center gap-1.5">
                    <MapIcon className="w-5 h-5 text-neon-cyan" />
                    Ward Risk Map & DBSCAN Clusters
                  </h3>
                  <p className="text-xs text-slate-400">Glowing red circles display spatial hotspots computed by DBSCAN model.</p>
                </div>
              </div>

              <div className="h-[400px] rounded-2xl overflow-hidden border border-white/5 bg-slate-900 relative shadow-inner">
                {analytics && (
                  <Map 
                    issues={issues} 
                    hotspots={analytics.riskHotspots} 
                    center={[12.9716, 77.5946]}
                    onMarkerClick={handleSelectIssue}
                  />
                )}
              </div>
            </div>

            {/* Hotspots Centroid List (1/3 width) */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-200 mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <ShieldAlert className="w-5 h-5 text-danger-rose" />
                  DBSCAN Risk Hotspots
                </h3>
                <p className="text-xs text-slate-400 mb-4 leading-normal">
                  Identified clusters of unresolved ward issues requiring unified task dispatch.
                </p>

                {analytics && analytics.riskHotspots.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No active spatial hotspots detected in current ward dataset.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                    {analytics?.riskHotspots.map((hotspot) => (
                      <div 
                        key={hotspot.clusterId} 
                        className="p-4 bg-slate-950/40 border border-red-500/10 hover:border-red-500/30 rounded-xl space-y-2 transition-all cursor-pointer text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                            Hotspot centroid
                          </span>
                          <span className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">
                            {hotspot.issueCount} Cases
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 grid grid-cols-2 gap-1 leading-normal">
                          <div>Avg Risk: <strong className="text-slate-200">{hotspot.averageRisk}%</strong></div>
                          <div>Avg Priority: <strong className="text-slate-200">{hotspot.averagePriority}</strong></div>
                        </div>
                        <div className="text-xs text-slate-500 truncate leading-none">
                          Categories: {hotspot.categories.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Forecast stat banner */}
              {analytics && (
                <div className="p-4 border border-violet-500/20 bg-violet-500/5 rounded-xl text-xs space-y-1.5 text-left">
                  <h4 className="font-bold text-violet-300 flex items-center gap-1.5 text-xs">
                    <Hourglass className="w-4 h-4" />
                    Linear Trend Forecast
                  </h4>
                  <p className="text-slate-400 leading-normal">
                    AI projects <strong className="text-slate-200">+{analytics.nextWeekForecastCount}</strong> new issues in the next 7 days based on weekly fit curves.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recharts Analytics Charts Section */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Chart 1: Time Series Area Chart */}
              <div className="p-6 bg-slate-900 border border-white/5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-neon-cyan" />
                  Weekly Complaint Trend & Projection
                </h3>
                
                <div className="h-[200px] w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.weeklyTrendData}>
                      <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="week" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#1e293b", borderColor: "rgba(255,255,255,0.08)", fontSize: "12px" }}
                        formatter={(val: any) => [val, "Complaints"]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#a78bfa" 
                        strokeWidth={2} 
                        fill="url(#trendGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Category Breakdown Bar Chart */}
              <div className="p-6 bg-slate-900 border border-white/5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-neon-cyan" />
                  Issue Category Distribution
                </h3>
                
                <div className="h-[200px] w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getCategoryChartData()}>
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#1e293b", borderColor: "rgba(255,255,255,0.08)", fontSize: "12px" }}
                        formatter={(val: any) => [val, "Count"]}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {getCategoryChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Split: Issue Queue vs Plan Details Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Issue queue list (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-base font-bold text-slate-200 flex items-center justify-between border-b border-white/5 pb-2">
                <span>AI Priority Dispatch Queue</span>
                <span className="text-sm text-slate-400 font-normal">Issues sorted by Priority Score</span>
              </h3>

              <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-1">
                {issues.map((issue) => (
                  <div 
                    key={issue.issueId}
                    onClick={() => handleSelectIssue(issue)}
                    className={`p-1 rounded-2xl transition-all cursor-pointer ${
                      selectedIssue?.issueId === issue.issueId 
                        ? "ring-2 ring-violet-500 shadow-xl" 
                        : ""
                    }`}
                  >
                    <IssueCard 
                      issue={issue} 
                      userRole="authority"
                      userId={userId || undefined}
                      onStatusChange={() => {
                        fetchData();
                        if (selectedIssue) handleSelectIssue(selectedIssue);
                      }}
                      onSimulateClick={(iss) => {
                        setSelectedIssueForSim(iss);
                        setIsSimOpen(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* AI Resolution Planning drawer panel (1/3 width) */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 h-fit space-y-4">
              <h3 className="text-base font-bold text-slate-200 border-b border-white/5 pb-3 flex items-center gap-1.5">
                <Wrench className="w-4.5 h-4.5 text-neon-cyan" />
                AI Resolution Plan
              </h3>

              {loadingDetails ? (
                <div className="py-24 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-400">Loading plan specifications...</span>
                </div>
              ) : selectedIssueDetails?.resolution ? (
                <div className="space-y-5 text-sm">
                  {/* Department & timeline */}
                  <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl space-y-2 text-left">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wide">Responsible Department</div>
                    <div className="font-bold text-slate-200 text-sm">{selectedIssueDetails.resolution.department}</div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Timeline</div>
                        <div className="font-semibold text-slate-300 mt-0.5">{selectedIssueDetails.resolution.timeline}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Est Cost</div>
                        {/* Swapped USD $ to INR ₹ here */}
                        <div className="font-semibold text-slate-300 mt-0.5">₹{selectedIssueDetails.resolution.costEstimate.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* Required resources */}
                  <div className="space-y-2 text-left">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Required Resources</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedIssueDetails.resolution.resources.map((res: string) => (
                        <span 
                          key={res} 
                          className="text-xs bg-slate-950/60 border border-white/5 text-slate-300 px-3 py-1 rounded"
                        >
                          {res}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recommended actions list */}
                  <div className="space-y-2 text-left">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Recommended Actions</div>
                    <ol className="list-decimal list-inside space-y-2 text-slate-400 leading-normal pl-1 text-xs">
                      {selectedIssueDetails.resolution.recommendedActions.map((action: string, i: number) => (
                        <li key={i} className="pl-1 leading-relaxed">
                          <span className="text-slate-300">{action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-xs text-slate-500">
                  Select an active issue from the queue to view its AI Generated Resolution Plan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Simulator Modal */}
      {selectedIssueForSim && (
        <ImpactModal 
          isOpen={isSimOpen}
          onClose={() => {
            setIsSimOpen(false);
            setSelectedIssueForSim(null);
          }}
          issueId={selectedIssueForSim.issueId}
          category={selectedIssueForSim.category}
          priority={selectedIssueForSim.priorityScore}
        />
      )}
    </div>
  );
}
