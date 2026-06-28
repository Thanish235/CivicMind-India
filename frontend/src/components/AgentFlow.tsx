"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, MapPin, CheckCircle, ShieldAlert, Cpu, Sparkles } from "lucide-react";

interface AgentStep {
  id: number;
  name: string;
  role: string;
  icon: any;
  status: "idle" | "running" | "completed";
  output: string;
}

export default function AgentFlow({ 
  active = false, 
  onComplete,
  visionResult,
  geoResult,
  valResult,
  riskResult,
  resResult
}: {
  active?: boolean;
  onComplete?: () => void;
  visionResult?: any;
  geoResult?: any;
  valResult?: any;
  riskResult?: any;
  resResult?: any;
}) {
  const [steps, setSteps] = useState<AgentStep[]>([
    { id: 1, name: "Vision Agent", role: "Gemini Vision Detection", icon: Eye, status: "idle", output: "" },
    { id: 2, name: "Geo Intelligence", role: "Places & Critical Proximity", icon: MapPin, status: "idle", output: "" },
    { id: 3, name: "Community Validation", role: "Embeddings Duplicate Match", icon: CheckCircle, status: "idle", output: "" },
    { id: 4, name: "Risk Prediction", role: "XGBoost Severity Classifier", icon: ShieldAlert, status: "idle", output: "" },
    { id: 5, name: "Resolution Planning", role: "Gemini 2.5 Pro Architect", icon: Cpu, status: "idle", output: "" },
  ]);

  useEffect(() => {
    if (!active) {
      // Reset steps if not active
      setSteps(prev => prev.map(s => ({ ...s, status: "idle", output: "" })));
      return;
    }

    // Sequence of mock executing phases matching the values
    const runSequence = async () => {
      // Step 1: Vision Agent
      setSteps(prev => prev.map(s => s.id === 1 ? { ...s, status: "running" } : s));
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSteps(prev => prev.map(s => s.id === 1 ? { 
        ...s, 
        status: "completed", 
        output: visionResult 
          ? `Detected: ${visionResult.category} (${visionResult.severity} Severity)`
          : "Detected: Pothole (High Severity)"
      } : s));

      // Step 2: Geo Intelligence
      setSteps(prev => prev.map(s => s.id === 2 ? { ...s, status: "running" } : s));
      await new Promise(resolve => setTimeout(resolve, 1200));
      setSteps(prev => prev.map(s => s.id === 2 ? { 
        ...s, 
        status: "completed", 
        output: geoResult
          ? `Impact Score: ${geoResult.locationImpactScore}/100 (${geoResult.nearbyCriticalZones.join(", ") || "Residential Zone"})`
          : "Impact Score: 75/100 (Near Educational Institution)"
      } : s));

      // Step 3: Validation Agent
      setSteps(prev => prev.map(s => s.id === 3 ? { ...s, status: "running" } : s));
      await new Promise(resolve => setTimeout(resolve, 1500));
      const valOutput = valResult
        ? (valResult.isDuplicate ? "Duplicate Identified: Merging with Primary ID" : `Unique Report (Trust Score: ${valResult.trustScore})`)
        : "Unique Report Verified (Trust Score: 50.0)";
      setSteps(prev => prev.map(s => s.id === 3 ? { ...s, status: "completed", output: valOutput } : s));

      // If duplicate, we can cut off risk and resolution planning sequence
      if (valResult?.isDuplicate) {
        onComplete && onComplete();
        return;
      }

      // Step 4: Risk Predictor (XGBoost)
      setSteps(prev => prev.map(s => s.id === 4 ? { ...s, status: "running" } : s));
      await new Promise(resolve => setTimeout(resolve, 1200));
      setSteps(prev => prev.map(s => s.id === 4 ? { 
        ...s, 
        status: "completed", 
        output: riskResult
          ? `Accident Prob: ${(riskResult.accidentProbability * 100).toFixed(0)}%, Escalation Score: ${riskResult.riskScore}/100`
          : "Accident Prob: 75%, Escalation Risk Score: 59.2/100"
      } : s));

      // Step 5: Resolution Agent
      setSteps(prev => prev.map(s => s.id === 5 ? { ...s, status: "running" } : s));
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSteps(prev => prev.map(s => s.id === 5 ? { 
        ...s, 
        status: "completed", 
        output: resResult
          ? `Assigned: ${resResult.department} (${resResult.timeline})`
          : "Assigned: Road Maintenance Division (Est: 3 Days)"
      } : s));

      onComplete && onComplete();
    };

    runSequence();
  }, [active, visionResult, geoResult, valResult, riskResult, resResult]);

  return (
    <div className="w-full space-y-4 p-5 glass-panel rounded-2xl border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-20">
        <Sparkles className="w-12 h-12 text-neon-cyan animate-pulse" />
      </div>
      
      <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 ${active ? "" : "hidden"}`}></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-cyan"></span>
        </span>
        Agentic Execution Pipeline
      </h3>
      <p className="text-xs text-slate-400">
        Google AI & ML models analyzing civic context in parallel.
      </p>

      <div className="mt-4 relative pl-8 space-y-6 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
        <AnimatePresence>
          {steps.map((step) => {
            const Icon = step.icon;
            const isIdle = step.status === "idle";
            const isRunning = step.status === "running";
            const isCompleted = step.status === "completed";

            return (
              <motion.div 
                key={step.id} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative flex flex-col gap-1"
              >
                {/* Connecting Circle Node */}
                <div 
                  className={`absolute -left-8 top-0.5 w-7.5 h-7.5 rounded-full flex items-center justify-center border transition-all duration-300 ${
                    isRunning 
                      ? "bg-slate-900 border-neon-cyan text-neon-cyan pulsing-dot shadow-lg shadow-neon-cyan/20" 
                      : isCompleted 
                        ? "bg-neon-cyan border-neon-cyan text-slate-900" 
                        : "bg-slate-800 border-white/10 text-slate-500"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Step Context */}
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold transition-colors ${isRunning ? "text-neon-cyan" : isCompleted ? "text-slate-200" : "text-slate-500"}`}>
                    {step.name}
                  </span>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                    isRunning 
                      ? "bg-neon-cyan/10 text-neon-cyan animate-pulse border border-neon-cyan/20" 
                      : isCompleted 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-slate-800 text-slate-500"
                  }`}>
                    {step.status}
                  </span>
                </div>
                
                <span className="text-xs text-slate-400 font-medium">
                  {step.role}
                </span>

                {isCompleted && step.output && (
                  <motion.div 
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 p-2 bg-slate-950/40 border border-white/5 rounded-lg text-xs font-mono text-neon-cyan"
                  >
                    {step.output}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
