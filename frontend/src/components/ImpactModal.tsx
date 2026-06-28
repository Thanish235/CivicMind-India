"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, TrendingUp, ShieldAlert, HeartPulse, Hourglass } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { api, SimulationResponse } from "src/lib/api";

export default function ImpactModal({ 
  isOpen, 
  onClose, 
  issueId,
  category,
  priority
}: {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  category: string;
  priority: number;
}) {
  const [loading, setLoading] = useState(true);
  const [simData, setSimData] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !issueId) return;

    setLoading(true);
    setError("");
    api.getNeglectSimulation(issueId)
      .then((data) => {
        setSimData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Simulation error:", err);
        setError("Unable to run neglect simulation at this time.");
        setLoading(false);
      });
  }, [isOpen, issueId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 border border-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6 text-left">
            <div className="p-3 rounded-xl bg-amber-500/10 text-warning-amber border border-amber-500/20">
              <Hourglass className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-100">AI Civic Impact Simulator</h2>
              <p className="text-sm text-slate-400">
                Simulating 30 days of municipal neglect on: <span className="text-neon-cyan font-semibold">{category}</span>
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-3 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-slate-400">Running predictive degradation algorithms...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-400 border border-red-500/10 bg-red-500/5 rounded-xl">
              {error}
            </div>
          ) : simData ? (
            <div className="space-y-6">
              {/* Alert narrative banner */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex gap-3 text-left">
                <AlertTriangle className="w-5 h-5 text-warning-amber shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200 font-medium leading-relaxed">
                  <span className="font-bold text-slate-100">Neglect Warning:</span> {simData.narrativeSummary}
                </div>
              </div>

              {/* Chart & Cost Progression */}
              <div className="p-5 bg-slate-950/40 border border-white/5 rounded-xl">
                <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center justify-between">
                  <span>Financial Repair Cost Escalation</span>
                  <span className="text-sm text-red-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +{((simData.costEscalation[3].cost / simData.costEscalation[0].cost) * 100).toFixed(0)}% Increase
                  </span>
                </h3>
                
                <div className="h-[180px] w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simData.costEscalation}>
                      <defs>
                        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="day" 
                        tickFormatter={(v) => `Day ${v}`} 
                        stroke="#64748b" 
                      />
                      <YAxis 
                        tickFormatter={(v) => `₹${v.toLocaleString()}`} 
                        stroke="#64748b" 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#1e293b", borderColor: "rgba(255,255,255,0.08)", fontSize: "12px" }}
                        labelFormatter={(v) => `Timeline: Day ${v}`}
                        formatter={(val: any) => [`₹${val.toLocaleString()}`, "Est. Repair Cost"]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cost" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#costGrad)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Cost badges */}
                <div className="grid grid-cols-4 gap-3 mt-4 text-center">
                  {simData.costEscalation.map((step) => (
                    <div key={step.day} className="p-3 bg-slate-900 border border-white/5 rounded-lg">
                      <div className="text-xs text-slate-400 font-semibold">Day {step.day}</div>
                      <div className="text-sm font-bold text-slate-200 mt-0.5">₹{step.cost.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Degradation Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {/* Infra */}
                <div className="p-5 bg-slate-950/20 border border-white/5 rounded-xl space-y-1">
                  <h4 className="text-sm font-bold text-neon-cyan flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    Infrastructure Degradation
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {simData.infrastructureDeterioration}
                  </p>
                </div>

                {/* Safety */}
                <div className="p-5 bg-slate-950/20 border border-white/5 rounded-xl space-y-1">
                  <h4 className="text-sm font-bold text-danger-rose flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Safety & Collision Risks
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {simData.safetyRisks}
                  </p>
                </div>

                {/* Health */}
                <div className="p-5 bg-slate-950/20 border border-white/5 rounded-xl space-y-1">
                  <h4 className="text-sm font-bold text-success-emerald flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4" />
                    Public Health & Vector Impact
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {simData.publicHealthImpacts}
                  </p>
                </div>

                {/* Traffic */}
                <div className="p-5 bg-slate-950/20 border border-white/5 rounded-xl space-y-1">
                  <h4 className="text-sm font-bold text-warning-amber flex items-center gap-1.5">
                    <Hourglass className="w-4 h-4" />
                    Traffic & Transit Disruption
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {simData.trafficDisruption}
                  </p>
                </div>
              </div>

              {/* Complaints & Validation */}
              <div className="flex items-center justify-between p-5 bg-slate-950/60 border border-white/5 rounded-xl text-sm">
                <span className="text-slate-400 font-medium">Projected Additional Citizen Complaints (30 Days):</span>
                <span className="font-bold text-warning-amber text-base px-3 py-1 rounded bg-warning-amber/10 border border-warning-amber/20">
                  +{simData.additionalComplaints} complaints
                </span>
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
