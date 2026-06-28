"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PlusCircle, Award, Star, LogOut, RefreshCw, Layers } from "lucide-react";
import { api, Issue, UserProfile } from "src/lib/api";
import Map from "src/components/Map";
import IssueCard from "src/components/IssueCard";
import Leaderboard from "src/components/Leaderboard";
import ImpactModal from "src/components/ImpactModal";

export default function CitizenDashboard() {
  const router = useRouter();
  
  // States
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Simulator Modal States
  const [selectedIssueForSim, setSelectedIssueForSim] = useState<Issue | null>(null);
  const [isSimOpen, setIsSimOpen] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get credentials from localStorage
    const savedUserId = localStorage.getItem("civicmind_userId");
    const savedName = localStorage.getItem("civicmind_name");
    const savedRole = localStorage.getItem("civicmind_role");

    if (!savedUserId || savedRole !== "citizen") {
      router.push("/");
      return;
    }

    setUserId(savedUserId);
    fetchData(savedUserId);
  }, [router, categoryFilter, statusFilter]);

  const fetchData = async (uid: string) => {
    setLoading(true);
    try {
      // Fetch user profile from backend
      const profile = await api.getUserProfile(uid);
      setUserProfile(profile);

      // Fetch issues from backend
      const issuesList = await api.getIssues({
        category: categoryFilter || undefined,
        status: statusFilter || undefined
      });
      setIssues(issuesList);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="w-full glass-panel border-b border-white/5 px-6 py-5 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-cyan flex items-center justify-center font-black text-slate-950 text-base">
            C
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-100">CivicMind India</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Citizen Portal Terminal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {userProfile && (
            <div className="hidden sm:flex items-center gap-3 bg-slate-900 border border-white/5 rounded-xl px-4 py-2">
              <Award className="w-5 h-5 text-neon-cyan" />
              <div className="text-left">
                <div className="text-sm font-bold text-slate-200">{userProfile.name}</div>
                <div className="text-xs text-slate-500 font-semibold">Citizen Contributor</div>
              </div>
              <div className="border-l border-white/5 h-6 mx-1"></div>
              <div className="flex items-center gap-1.5 text-sm font-black text-neon-cyan">
                <Star className="w-4 h-4 fill-neon-cyan/20" />
                {userProfile.points} pts
              </div>
            </div>
          )}

          <button 
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Map & Issue Queue */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          
          {/* Action Row */}
          <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-900/40 p-5 border border-white/5 rounded-2xl">
            <div>
              <h2 className="text-lg font-bold text-slate-200">Active Issues Map</h2>
              <p className="text-sm text-slate-400">Pulsing coordinates represent verified civic hazards in your ward.</p>
            </div>
            
            <button 
              onClick={() => router.push("/citizen/report")}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-neon-cyan hover:bg-cyan-500 text-slate-950 font-bold text-sm cursor-pointer transition-all shadow-md shadow-neon-cyan/10 hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              Report Ward Issue
            </button>
          </div>

          {/* Interactive Leaflet Map Wrapper */}
          <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-white/5 bg-slate-900 relative shadow-inner">
            {/* Center Map around Bengaluru default coordinates [12.9716, 77.5946] */}
            <Map issues={issues} center={[12.9716, 77.5946]} />
          </div>

          {/* Issue List Header & Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-200">Community Issue Queue</h3>
                <p className="text-sm text-slate-400">Ward issues prioritized dynamically by AI engine.</p>
              </div>

              {/* Filtering Controls */}
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-900 border border-white/5 rounded-xl p-2.5 outline-none text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  <option value="">All Categories</option>
                  <option value="Pothole">Pothole</option>
                  <option value="Water Leakage">Water Leakage</option>
                  <option value="Garbage Dump">Garbage Dump</option>
                  <option value="Broken Streetlight">Broken Streetlight</option>
                  <option value="Road Damage">Road Damage</option>
                  <option value="Drainage Issue">Drainage Issue</option>
                </select>

                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-white/5 rounded-xl p-2.5 outline-none text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="reported">Reported</option>
                  <option value="under_review">Under Review</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>

                <button 
                  onClick={() => userId && fetchData(userId)}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-white/5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List scrollbox */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="w-full h-[180px] bg-slate-900/50 border border-white/5 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : issues.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-white/5 bg-slate-950/20 rounded-2xl text-slate-500 text-sm">
                No active issues match the selected filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {issues.map((issue) => (
                  <IssueCard 
                    key={issue.issueId} 
                    issue={issue} 
                    userRole="citizen"
                    userId={userId || undefined}
                    onValidationChange={() => userId && fetchData(userId)}
                    onSimulateClick={(iss) => {
                      setSelectedIssueForSim(iss);
                      setIsSimOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: User Rewards & Leaderboard */}
        <div className="space-y-6">
          {/* User Rewards widget */}
          {userProfile && (
            <div className="p-6 glass-panel rounded-2xl border border-white/5 relative overflow-hidden">
              {/* background design grid */}
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Layers className="w-20 h-20 text-neon-cyan" />
              </div>
              
              <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Award className="w-5 h-5 text-neon-cyan" />
                My Contribution Status
              </h3>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="p-3.5 bg-cyan-500/10 border border-neon-cyan/20 rounded-2xl text-neon-cyan flex flex-col items-center min-w-[70px]">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Balance</span>
                  <span className="text-xl font-black">{userProfile.points}</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate-400 font-semibold">Contributor Level:</div>
                  <div className="text-sm font-bold text-slate-200">
                    {userProfile.points >= 100 ? "Civic Guardian" : userProfile.points >= 50 ? "Active Witness" : "Local Resident"}
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-white/5 pt-4">
                <div className="text-xs font-semibold text-slate-500 mb-2.5 uppercase tracking-wide">Achievements Earned</div>
                <div className="flex flex-wrap gap-2">
                  {userProfile.badges.map((badge) => (
                    <span 
                      key={badge} 
                      className="text-xs bg-slate-950/60 border border-white/5 text-slate-300 font-semibold px-3 py-1.5 rounded"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top contributor standings */}
          <Leaderboard />
        </div>
      </div>

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
