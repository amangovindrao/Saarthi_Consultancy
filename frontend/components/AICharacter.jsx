"use client";

import { useEffect, useRef } from "react";

export default function AICharacter({ state = "idle" }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 200, H = 200;
    canvas.width = W;
    canvas.height = H;
    const cx = W / 2, cy = H / 2;
    let t = 0;

    const particles = Array.from({ length: 18 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 40 + Math.random() * 30,
      speed: 0.003 + Math.random() * 0.008,
      size: 1.5 + Math.random() * 2.5,
      opacity: 0.3 + Math.random() * 0.5,
    }));

    function getColors() {
      switch (state) {
        case "thinking":
          return { core: "#818cf8", glow: "rgba(129,140,248,0.25)", ring: "rgba(129,140,248,0.5)", particle: "rgba(165,180,252,0.7)" };
        case "speaking":
          return { core: "#34d399", glow: "rgba(52,211,153,0.25)", ring: "rgba(52,211,153,0.5)", particle: "rgba(110,231,183,0.7)" };
        case "listening":
          return { core: "#f472b6", glow: "rgba(244,114,182,0.25)", ring: "rgba(244,114,182,0.5)", particle: "rgba(249,168,212,0.7)" };
        case "locked":
          return { core: "#f87171", glow: "rgba(248,113,113,0.2)", ring: "rgba(248,113,113,0.4)", particle: "rgba(252,165,165,0.5)" };
        default:
          return { core: "#60a5fa", glow: "rgba(96,165,250,0.25)", ring: "rgba(96,165,250,0.5)", particle: "rgba(147,197,253,0.7)" };
      }
    }

    function draw() {
      t += 0.016;
      const colors = getColors();
      ctx.clearRect(0, 0, W, H);

      // Outer glow
      const glowR = state === "thinking" ? 70 + Math.sin(t * 4) * 8 : state === "speaking" ? 70 + Math.sin(t * 6) * 12 : state === "listening" ? 70 + Math.sin(t * 5) * 10 : 65 + Math.sin(t * 2) * 5;
      const grad1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      grad1.addColorStop(0, colors.glow);
      grad1.addColorStop(1, "transparent");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, W, H);

      // Rotating ring
      ctx.save();
      ctx.translate(cx, cy);
      const ringSpeed = state === "thinking" ? 3 : state === "speaking" ? 4 : state === "listening" ? 5 : 1;
      ctx.rotate(t * ringSpeed);
      const ringR = state === "speaking" ? 48 + Math.sin(t * 8) * 5 : 48;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 1.5);
      ctx.strokeStyle = colors.ring;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();

      // Second ring (counter-rotate)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-t * ringSpeed * 0.7);
      ctx.beginPath();
      ctx.arc(0, 0, ringR + 8, 0.3, Math.PI * 1.2);
      ctx.strokeStyle = colors.ring;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.restore();

      // Particles
      particles.forEach((p) => {
        p.angle += p.speed * (state === "thinking" ? 3 : state === "speaking" ? 2.5 : state === "listening" ? 4 : 1);
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = colors.particle;
        ctx.globalAlpha = p.opacity * (0.6 + Math.sin(t * 2 + p.angle) * 0.4);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Core orb
      const coreR = state === "speaking" ? 28 + Math.sin(t * 6) * 4 : state === "thinking" ? 26 + Math.sin(t * 3) * 3 : state === "listening" ? 27 + Math.sin(t * 8) * 5 : 26 + Math.sin(t * 1.5) * 2;
      const coreGrad = ctx.createRadialGradient(cx - 5, cy - 5, 0, cx, cy, coreR);
      coreGrad.addColorStop(0, "#fff");
      coreGrad.addColorStop(0.3, colors.core);
      coreGrad.addColorStop(1, colors.core + "88");
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = colors.core;
      ctx.shadowBlur = 25;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Sound wave bars (when speaking or listening)
      if (state === "speaking" || state === "listening") {
        const barCount = 5;
        const barWidth = 3;
        const barGap = 5;
        const totalWidth = barCount * barWidth + (barCount - 1) * barGap;
        const startX = cx - totalWidth / 2;
        for (let i = 0; i < barCount; i++) {
          const barH = 6 + Math.abs(Math.sin(t * (state === "listening" ? 10 : 7) + i * 0.8)) * 14;
          ctx.fillStyle = "#fff";
          ctx.globalAlpha = 0.9;
          ctx.fillRect(startX + i * (barWidth + barGap), cy - barH / 2, barWidth, barH);
        }
        ctx.globalAlpha = 1;
      }

      // Lock icon overlay
      if (state === "locked") {
        ctx.font = "28px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🔒", cx, cy);
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [state]);

  const stateLabels = {
    idle: "Ready",
    thinking: "Thinking...",
    speaking: "Speaking",
    listening: "Listening...",
    locked: "Locked",
  };

  const stateColors = {
    idle: "text-blue-400",
    thinking: "text-indigo-400",
    speaking: "text-emerald-400",
    listening: "text-pink-400",
    locked: "text-red-400",
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="drop-shadow-lg"
        style={{ imageRendering: "auto" }}
      />
      <div className="mt-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${state === "idle" ? "bg-blue-400" : state === "thinking" ? "bg-indigo-400 animate-pulse" : state === "speaking" ? "bg-emerald-400 animate-pulse" : state === "listening" ? "bg-pink-400 animate-pulse" : "bg-red-400"}`} />
        <p className={`text-xs font-semibold uppercase tracking-widest ${stateColors[state] || "text-slate-400"}`}>
          {stateLabels[state] || state}
        </p>
      </div>
    </div>
  );
}
