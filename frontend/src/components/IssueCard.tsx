"use client";

import { useState } from "react";
import { 
  AlertTriangle, MapPin, Eye, ThumbsUp, ShieldAlert, 
  Wrench, CheckCircle2, ChevronDown, Award, BrainCircuit, ExternalLink
} from "lucide-react";
import { Issue, api } from "src/lib/api";

export default function IssueCard({ 
  issue, 
  userRole = "citizen", 
  userId, 
  onStatusChange, 
  onValidationChange,
  onSimulateClick 
}: {
  issue: Issue;
  userRole?: "citizen" | "authority";
  userId?: string;
  onStatusChange?: () => void;
  onValidationChange?: () => void;
  onSimulateClick?: (issue: Issue) => void;
}) {
  const [voting, setVoting] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Status mapping colors
  const statusColors = {
    reported: "bg-cyan-500/10 text-neon-cyan border-neon-cyan/20",
    under_review: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    assigned: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    in_progress: "bg-amber-500/10 text-warning-amber border-warning-amber/20",
    resolved: "bg-emerald-500/10 text-success-emerald border-success-emerald/20",
  };

  const severityColors = {
    Low: "bg-slate-800 text-slate-300",
    Medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    High: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Critical: "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse",
  };

  const handleVote = async (voteType: "upvote" | "confirm" | "reject") => {
    if (!userId) return;
    setVoting(true);
    try {
      await api.submitValidation({
        issueId: issue.issueId,
        userId: userId,
        vote: voteType,
        comment: "Voted via dashboard."
      });
      onValidationChange && onValidationChange();
    } catch (e: any) {
      alert(e.message || "Failed to submit validation vote.");
    } finally {
      setVoting(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!userId || userRole !== "authority") return;
    setUpdatingStatus(true);
    setStatusMenuOpen(false);
    try {
      await api.updateIssueStatus(issue.issueId, newStatus, userId);
      onStatusChange && onStatusChange();
    } catch (e: any) {
      alert("Failed to update issue status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="w-full glass-card rounded-2xl p-6 border border-white/5 space-y-4">
      {/* Top row: Category, Severity, and Status */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-left">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-bold text-slate-100">{issue.category}</span>
          <span className={`text-xs font-bold px-2.5 py-1 border rounded-full ${severityColors[issue.severity]}`}>
            {issue.severity}
          </span>
          <span className="text-xs text-slate-500">AI Confidence: {(issue.confidenceScore * 100).toFixed(0)}%</span>
        </div>
        
        <span className={`text-xs font-bold uppercase px-2.5 py-1 border rounded-md ${statusColors[issue.status]}`}>
          {issue.status.replace("_", " ")}
        </span>
      </div>

      {/* Description */}
      <div className="space-y-2 text-left">
        <p className="text-sm text-slate-300 leading-relaxed">{issue.description}</p>
        {issue.aiDescription && (
          <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex gap-2.5 items-start mt-2">
            <BrainCircuit className="w-5 h-5 text-neon-cyan shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 italic leading-normal">
              <span className="font-bold text-neon-cyan not-italic">AI Refinement:</span> {issue.aiDescription}
            </p>
          </div>
        )}
      </div>

      {/* Media Image Thumbnail (simulated visual verification) */}
      {issue.mediaUrl && (
        <div className="relative w-full h-[160px] rounded-xl overflow-hidden border border-white/5 bg-slate-950/40 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={issue.mediaUrl} 
            alt={issue.category} 
            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* Location / Address row */}
      <div className="flex items-start gap-2 text-sm text-slate-400 text-left">
        <MapPin className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <span className="line-clamp-1">{issue.location?.address}</span>
      </div>

      {/* AI Engine Priority Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/5">
        <div className="p-2.5 bg-slate-950/30 border border-white/5 rounded-xl text-center">
          <div className="text-xs text-slate-500 font-bold uppercase">Priority Score</div>
          <div className="text-base font-black text-neon-cyan mt-0.5">{issue.priorityScore}/100</div>
        </div>
        <div className="p-2.5 bg-slate-950/30 border border-white/5 rounded-xl text-center">
          <div className="text-xs text-slate-500 font-bold uppercase">Risk Score</div>
          <div className="text-base font-black text-red-400 mt-0.5">{issue.riskScore}/100</div>
        </div>
        <div className="p-2.5 bg-slate-950/30 border border-white/5 rounded-xl text-center">
          <div className="text-xs text-slate-500 font-bold uppercase">Impact Score</div>
          <div className="text-base font-black text-amber-400 mt-0.5">{issue.locationImpactScore}/100</div>
        </div>
        <div className="p-2.5 bg-slate-950/30 border border-white/5 rounded-xl text-center">
          <div className="text-xs text-slate-500 font-bold uppercase">Confirmations</div>
          <div className="text-base font-black text-slate-200 mt-0.5">
            {issue.verificationCount} <span className="text-xs text-slate-500">({issue.duplicateCount} dups)</span>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-white/5">
        {/* Left Side Actions (Citizen confirmation) */}
        {userRole === "citizen" ? (
          <button 
            disabled={voting || !userId}
            onClick={() => handleVote("confirm")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50 text-xs font-semibold border border-white/5 transition-colors cursor-pointer"
          >
            <ThumbsUp className="w-4 h-4" />
            Verify Issue
          </button>
        ) : (
          /* Authority status modification dropdown */
          <div className="relative">
            <button 
              disabled={updatingStatus || !userId}
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50 text-xs font-semibold border border-white/5 transition-colors cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-neon-cyan" />
              Update Status
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            
            {statusMenuOpen && (
              <div className="absolute left-0 bottom-full mb-1.5 z-25 w-44 rounded-xl bg-slate-800 border border-white/10 p-1 shadow-2xl space-y-0.5 text-left">
                {["reported", "under_review", "assigned", "in_progress", "resolved"].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusUpdate(st)}
                    className="w-full text-xs px-3.5 py-2 rounded-lg text-slate-300 hover:text-slate-100 hover:bg-slate-700 capitalize text-left cursor-pointer"
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right Side Action (Neglect Simulator Trigger) */}
        <button 
          onClick={() => onSimulateClick && onSimulateClick(issue)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-warning-amber hover:bg-amber-500/20 text-xs font-bold border border-amber-500/20 transition-all cursor-pointer shadow-sm shadow-amber-500/5 hover:-translate-y-0.5"
        >
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          AI 30-Day Simulator
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
