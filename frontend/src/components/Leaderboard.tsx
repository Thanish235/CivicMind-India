"use client";

import { useEffect, useState } from "react";
import { Award, Trophy, Star, ShieldCheck } from "lucide-react";
import { api, LeaderboardEntry } from "src/lib/api";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLeaderboard()
      .then((data) => {
        setLeaderboard(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Leaderboard loading error:", err);
        setLoading(false);
      });
  }, []);

  const getBadgeColor = (badge: string) => {
    const colors: Record<string, string> = {
      "Welcome Citizen": "bg-slate-800 text-slate-300 border-white/5",
      "Pioneer Reporter": "bg-cyan-500/10 text-neon-cyan border-neon-cyan/20",
      "Active Reporter": "bg-violet-500/10 text-violet-400 border-violet-500/20",
      "Civic Champion": "bg-amber-500/10 text-warning-amber border-amber-500/20",
      "Community Witness": "bg-emerald-500/10 text-success-emerald border-success-emerald/20",
      "Community Guard": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };
    return colors[badge] || "bg-slate-800 text-slate-300 border-white/5";
  };

  return (
    <div className="w-full glass-panel rounded-2xl border border-white/5 p-6">
      <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
        <div className="p-2.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl">
          <Trophy className="w-6 h-6" />
        </div>
        <div className="text-left">
          <h3 className="text-lg font-bold text-slate-100">Civic standings</h3>
          <p className="text-sm text-slate-400">Earn badges and points for reporting and verifying ward issues.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400">Loading civic standings...</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No civic contributors registered yet.
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry, index) => {
            const isTop3 = index < 3;
            const trophyColors = ["text-amber-400", "text-slate-300", "text-amber-700"];

            return (
              <div 
                key={entry.userId}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  index === 0 
                    ? "bg-amber-500/5 border-amber-500/20 shadow-lg shadow-amber-500/5" 
                    : "bg-slate-950/20 border-white/5 hover:border-white/10"
                }`}
              >
                {/* User standing and avatar */}
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 flex items-center justify-center font-bold text-sm rounded-lg bg-slate-900 border border-white/5">
                    {isTop3 ? (
                      <Trophy className={`w-5 h-5 ${trophyColors[index]}`} />
                    ) : (
                      <span className="text-slate-400">#{index + 1}</span>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      {entry.name}
                      {index === 0 && <span className="text-[10px] bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded font-bold">Top Guardian</span>}
                    </div>
                    {/* Badges row */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {entry.badges.slice(0, 3).map((badge) => (
                        <span 
                          key={badge} 
                          className={`text-xs font-semibold px-2 py-0.5 border rounded-full ${getBadgeColor(badge)}`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-sm font-black text-neon-cyan flex items-center justify-end gap-1">
                    <Star className="w-4 h-4 fill-neon-cyan/20" />
                    {entry.points}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">points</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reward Points Explanation */}
      <div className="mt-5 p-4 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-400 space-y-2 text-left">
        <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
          <Award className="w-4.5 h-4.5 text-neon-cyan" />
          Point Reward Guide
        </h4>
        <div className="grid grid-cols-2 gap-2 leading-relaxed">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-neon-cyan" />
            <span>Unique Report: <strong className="text-slate-200">+15 pts</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-neon-cyan" />
            <span>Confirm Case: <strong className="text-slate-200">+5 pts</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-neon-cyan" />
            <span>Duplicate Link: <strong className="text-slate-200">+5 pts</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-neon-cyan" />
            <span>Milestones at 50/100 pts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
