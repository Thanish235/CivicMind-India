"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Sparkles, Image as ImageIcon, Volume2, MapPin } from "lucide-react";
import { api } from "src/lib/api";
import AgentFlow from "src/components/AgentFlow";

// Predefined Indian presets to guarantee 100% successful vision agent testing on Bengaluru
const IMAGE_PRESETS = [
  {
    name: "M.G. Road Pothole",
    url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop",
    desc: "Deep structural pothole opening up near the MG Road Metro Station exit. Vehicles are forced to take sudden turns, creating high collision risks.",
    category: "Pothole",
    lat: 12.9756,
    lng: 77.6068,
    address: "M.G. Road Metro Station, Bengaluru, Karnataka",
  },
  {
    name: "Jayanagar Water Leakage",
    url: "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?q=80&w=600&auto=format&fit=crop",
    desc: "Main clean water supply line burst under the sidewalk, spraying water 3 feet high and flooding the entrance of Sagar Hospitals.",
    category: "Water Leakage",
    lat: 12.9279,
    lng: 77.5912,
    address: "30th Cross Road, Jayanagar, Bengaluru, Karnataka",
  },
  {
    name: "Commercial Street Waste Pile",
    url: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=600&auto=format&fit=crop",
    desc: "Massive pile of solid municipal waste and commercial packaging dumped illegally on the pavement, attracting stray dogs and cattle.",
    category: "Garbage Dump",
    lat: 12.9822,
    lng: 77.6083,
    address: "Commercial Street, Tasker Town, Bengaluru, Karnataka",
  }
];

export default function ReportIssue() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  // Form Fields
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState(IMAGE_PRESETS[0].url);
  const [mediaType, setMediaType] = useState<"image" | "video" | "voice">("image");
  
  // Location
  const [lat, setLat] = useState(IMAGE_PRESETS[0].lat);
  const [lng, setLng] = useState(IMAGE_PRESETS[0].lng);
  const [address, setAddress] = useState(IMAGE_PRESETS[0].address);
  const [city, setCity] = useState("Bengaluru");

  // Voice Note simulation
  const [isRecording, setIsRecording] = useState(false);

  // Agent flow visualizer overlay states
  const [pipelineActive, setPipelineActive] = useState(false);
  const [pipelineFinished, setPipelineFinished] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  useEffect(() => {
    const savedUserId = localStorage.getItem("civicmind_userId");
    const savedRole = localStorage.getItem("civicmind_role");

    if (!savedUserId || savedRole !== "citizen") {
      router.push("/");
      return;
    }
    setUserId(savedUserId);
  }, [router]);

  const selectPreset = (index: number) => {
    const preset = IMAGE_PRESETS[index];
    setMediaUrl(preset.url);
    setDescription(preset.desc);
    setLat(preset.lat);
    setLng(preset.lng);
    setAddress(preset.address);
  };

  const handleSimulateVoice = () => {
    setIsRecording(true);
    setDescription("Transcribing audio input...");
    
    // Simulate speech-to-text typing transcription
    setTimeout(() => {
      setDescription("Alert: We have a major water pipeline leak spraying onto the sidewalk here near Sagar Hospital, Jayanagar, making it completely impassable.");
      setMediaType("voice");
      setIsRecording(false);
      // Auto switch media preset to match water leak
      selectPreset(1);
    }, 2200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !mediaUrl || !userId) return;
    
    // Activate multi-agent visualizer overlay
    setPipelineActive(true);
    setPipelineFinished(false);

    try {
      const payload = {
        reporterId: userId,
        description,
        location: { lat, lng, address, city },
        mediaUrl,
        mediaType
      };

      // Call backend API (FastAPI orchestrator)
      const res = await api.reportIssue(payload);
      setSubmissionResult(res);
    } catch (err) {
      console.error(err);
      alert("Submission error. Make sure FastAPI backend is active.");
      setPipelineActive(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="w-full glass-panel border-b border-white/5 px-6 py-5 flex items-center justify-between z-30">
        <button 
          onClick={() => router.push("/citizen")}
          className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>

        <h1 className="text-base font-black tracking-tight text-slate-100 uppercase">
          New Ward Report
        </h1>

        <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-neon-cyan" />
        </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 max-w-2xl w-full mx-auto p-6 space-y-6">
        
        {/* Presets Selection */}
        <div className="p-5 bg-slate-900 border border-white/5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-neon-cyan" />
            Select Bengaluru Presets (For Demo & Verification)
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {IMAGE_PRESETS.map((preset, idx) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => selectPreset(idx)}
                className={`py-3 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  mediaUrl === preset.url 
                    ? "bg-neon-cyan/15 border-neon-cyan/30 text-neon-cyan" 
                    : "bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Report Form */}
        <form onSubmit={handleSubmit} className="glass-panel p-8 border border-white/5 rounded-2xl space-y-6">
          
          {/* Description input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-400 uppercase">Issue Description</label>
            <textarea
              required
              rows={4}
              placeholder="e.g. Large pavement pothole near crossing..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm p-3.5 rounded-xl bg-slate-950 border border-white/5 focus:border-neon-cyan/40 outline-none text-slate-200"
            />
            
            {/* Audio transcription mock */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleSimulateVoice}
                disabled={isRecording}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-50"
              >
                <Volume2 className="w-4 h-4 text-neon-cyan animate-pulse" />
                {isRecording ? "Listening..." : "Record Voice Note"}
              </button>
            </div>
          </div>

          {/* Media URL selector */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-400 uppercase">Media Attachment Link</label>
            <div className="flex gap-3">
              <input
                type="text"
                required
                placeholder="Image/Video URL..."
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="flex-1 text-sm p-3.5 rounded-xl bg-slate-950 border border-white/5 focus:border-neon-cyan/40 outline-none text-slate-200"
              />
              <div className="p-3.5 bg-slate-950 border border-white/5 rounded-xl text-slate-500 flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Coordinates inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-400 uppercase">Latitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                className="w-full text-sm p-3.5 rounded-xl bg-slate-950 border border-white/5 focus:border-neon-cyan/40 outline-none text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-400 uppercase">Longitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value))}
                className="w-full text-sm p-3.5 rounded-xl bg-slate-950 border border-white/5 focus:border-neon-cyan/40 outline-none text-slate-200"
              />
            </div>
          </div>

          {/* Address input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-400 uppercase">Location Address</label>
            <div className="flex gap-3">
              <input
                type="text"
                required
                placeholder="Address Details..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1 text-sm p-3.5 rounded-xl bg-slate-950 border border-white/5 focus:border-neon-cyan/40 outline-none text-slate-200"
              />
              <div className="p-3.5 bg-slate-950 border border-white/5 rounded-xl text-slate-500 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-neon-cyan hover:bg-cyan-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-neon-cyan/15"
          >
            <Send className="w-4 h-4" />
            Dispatch AI Multi-Agent Pipeline
          </button>
        </form>
      </div>

      {/* Agent Workflow Execution Overlay */}
      {pipelineActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-lg space-y-6 text-center">
            
            {/* Render step flow visualizer */}
            <AgentFlow 
              active={pipelineActive} 
              onComplete={() => setPipelineFinished(true)}
              visionResult={submissionResult} 
            />

            {pipelineFinished && submissionResult && (
              <div className="glass-panel p-6 border border-white/10 rounded-2xl space-y-4 animate-fade-in text-left">
                <div className="text-base font-bold text-slate-100 flex items-center justify-center gap-2">
                  {submissionResult.status === "merged" ? (
                    <span className="text-warning-amber">⚠️ Duplicate Request Detected</span>
                  ) : (
                    <span className="text-success-emerald">✓ Unique Report Successfully Registered</span>
                  )}
                </div>
                <p className="text-sm text-slate-400 leading-normal max-w-sm mx-auto text-center">
                  {submissionResult.message}
                </p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => router.push("/citizen")}
                    className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 text-sm font-bold cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
