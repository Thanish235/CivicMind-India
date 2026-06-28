"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, UserCheck, Star, Sparkles, AlertTriangle, ArrowRight, X } from "lucide-react";
import { api } from "src/lib/api";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"citizen" | "authority">("citizen");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handlePortalEnter = (role: "citizen" | "authority") => {
    setSelectedRole(role);
    setShowLoginModal(true);
  };

  const handleRegisterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setLoading(true);

    try {
      // Mock unique ID based on email string
      const userId = email.replace(/[^a-zA-Z0-9]/g, "_");
      
      // Register user on FastAPI backend
      const profile = await api.registerUser(userId, name, email, selectedRole);
      
      // Store credentials in localStorage
      localStorage.setItem("civicmind_userId", profile.userId);
      localStorage.setItem("civicmind_name", profile.name);
      localStorage.setItem("civicmind_role", profile.role);
      
      // Redirect to correct dashboard
      if (profile.role === "citizen") {
        router.push("/citizen");
      } else {
        router.push("/authority");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend server. Make sure FastAPI backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 relative overflow-hidden bg-slate-950">
      {/* Visual background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Hero Section */}
      <div className="w-full max-w-5xl text-center space-y-8 z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-cyan-500/10 border border-neon-cyan/20 text-sm font-bold text-neon-cyan mb-4 uppercase tracking-wider"
        >
          <Sparkles className="w-4 h-4" />
          Indian Municipal Corporation Smart AI Platform
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-black tracking-tight text-slate-100"
        >
          Civic<span className="text-gradient-brand">Mind</span> India
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed"
        >
          Autonomous Municipal Issue Resolution Support System. Empowering ward officers and local residents to report potholes, water pipeline breaks, streetlights, and prioritize actions using ML risk models and Gemini planning agents for Indian Municipalities.
        </motion.p>

        {/* Action portals */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mt-12"
        >
          {/* Citizen Portal */}
          <div 
            onClick={() => handlePortalEnter("citizen")}
            className="group p-8 glass-panel rounded-2xl border border-white/5 hover:border-neon-cyan/40 transition-all duration-300 text-left flex flex-col justify-between min-h-[220px] cursor-pointer shadow-lg hover:shadow-neon-cyan/5 hover:-translate-y-1"
          >
            <div className="space-y-3">
              <div className="p-3 w-12 h-12 rounded-xl bg-cyan-500/10 text-neon-cyan border border-neon-cyan/20 flex items-center justify-center">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-neon-cyan transition-colors">Citizen Portal</h3>
              <p className="text-sm text-slate-400 leading-normal">Report municipal concerns, upvote/verify ward issues, track repair timelines, and earn reward points.</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-neon-cyan font-bold pt-4">
              Access Citizen Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Authority Portal */}
          <div 
            onClick={() => handlePortalEnter("authority")}
            className="group p-8 glass-panel rounded-2xl border border-white/5 hover:border-violet-500/40 transition-all duration-300 text-left flex flex-col justify-between min-h-[220px] cursor-pointer shadow-lg hover:shadow-violet-500/5 hover:-translate-y-1"
          >
            <div className="space-y-3">
              <div className="p-3 w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-violet-400 transition-colors">Municipal Authority Portal</h3>
              <p className="text-sm text-slate-400 leading-normal">Examine ward-level GIS maps, inspect DBSCAN risk hotspots, edit AI engineering plans, and dispatch local contractors.</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-violet-400 font-bold pt-4">
              Access BBMP/Municipal Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Feature stats */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 z-10 border-t border-white/5 pt-10 text-center text-sm"
      >
        <div>
          <div className="text-xl font-black text-neon-cyan">Gemini 2.5</div>
          <div className="text-slate-400 font-semibold mt-1">Vision & Plan Agents</div>
        </div>
        <div>
          <div className="text-xl font-black text-violet-400">XGBoost & RF</div>
          <div className="text-slate-400 font-semibold mt-1">ML Risk Inference</div>
        </div>
        <div>
          <div className="text-xl font-black text-warning-amber">DBSCAN</div>
          <div className="text-slate-400 font-semibold mt-1">Ward GIS Hotspots</div>
        </div>
        <div>
          <div className="text-xl font-black text-success-emerald">Gamified</div>
          <div className="text-slate-400 font-semibold mt-1">Milestones & Badges</div>
        </div>
      </motion.div>

      {/* Register/Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg p-8 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl relative space-y-6"
          >
            {/* Close button */}
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 border border-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <UserCheck className="w-6 h-6 text-neon-cyan" />
              <h3 className="text-lg font-bold text-slate-100">
                Sign in to {selectedRole === "citizen" ? "Citizen Portal" : "Municipal Authority Portal"}
              </h3>
            </div>

            {/* Quick Demo Credentials Autofills */}
            <div className="space-y-2 p-4 bg-slate-950/50 border border-white/5 rounded-xl text-left">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Instant Demo Logins</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setName("Aarav Sharma");
                    setEmail("aarav.sharma@civicmind.in");
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-neon-cyan font-bold text-xs border border-neon-cyan/20 transition-colors cursor-pointer"
                >
                  Fill Citizen (Aarav)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName("Commissioner Rajesh Kumar");
                    setEmail("rajesh.kumar@bbmp.gov.in");
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 font-bold text-xs border border-violet-500/20 transition-colors cursor-pointer"
                >
                  Fill Authority (Rajesh)
                </button>
              </div>
            </div>

            <form onSubmit={handleRegisterLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase text-left">Full Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm p-3.5 rounded-xl bg-slate-950 border border-white/5 focus:border-neon-cyan/40 outline-none text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase text-left">Email Address</label>
                <input 
                  type="email"
                  required
                  placeholder="e.g. aarav.sharma@civicmind.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm p-3.5 rounded-xl bg-slate-950 border border-white/5 focus:border-neon-cyan/40 outline-none text-slate-200"
                />
              </div>

              {selectedRole === "authority" && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-2.5 text-left">
                  <AlertTriangle className="w-5 h-5 text-warning-amber shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200 leading-normal">
                    <strong>Demo Note:</strong> Entering as Municipal Authority authorizes access to administrative spatial dashboards, action plan editing, and status management.
                  </p>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-xl bg-neon-cyan hover:bg-cyan-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {loading ? "Registering & Authenticating..." : "Authorize Secure Access"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </main>
  );
}
