import React from "react";

// Tiny reusable HUD bracket frame
export function HudFrame({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`hud-corners ${className}`}>
      <span className="hud-tl" /><span className="hud-tr" /><span className="hud-bl" /><span className="hud-br" />
      {children}
    </div>
  );
}
