import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, ShieldAlert } from "lucide-react";

export default function ProgressionNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const onHome = ["/", "/home"].includes(location.pathname);

  useEffect(() => {
    if (!onHome) return;
    try { localStorage.removeItem("dont_go_alone_active_challenge"); } catch {}
  }, [onHome]);

  if (!onHome) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 flex gap-2 rounded-2xl border border-white/10 bg-[#101018]/90 p-2 shadow-2xl backdrop-blur-xl">
      <button onClick={() => navigate("/legacy")} className="rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-cyan-300/10"><Sparkles className="w-4 h-4 text-cyan-300" /> Survivor Legacy</button>
      <button onClick={() => navigate("/challenge")} className="rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-fuchsia-300/10"><ShieldAlert className="w-4 h-4 text-fuchsia-300" /> Challenge Mode</button>
    </div>
  );
}
