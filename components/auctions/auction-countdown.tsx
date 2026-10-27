"use client";

import { useEffect, useState } from "react";

interface Props {
  closesAt: string | Date;
  onFinish?: () => void;
}

export function AuctionCountdown({ closesAt, onFinish }: Props) {
  // Estado inicial null o genérico para evitar hydration mismatch con SSR
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isFinished: boolean;
  } | null>(null);

  useEffect(() => {
    function calculate() {
      const target = new Date(closesAt).getTime();
      const diff = target - Date.now();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true });
        if (onFinish) onFinish();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isFinished: false });
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [closesAt, onFinish]);

  // Placeholder idéntico en SSR y primer pase de render para hidratación limpia
  if (!timeLeft) {
    return (
      <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
        <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Calculando tiempo...</span>
      </div>
    );
  }

  if (timeLeft.isFinished) {
    return (
      <div style={{ color: "var(--accent-rose)", fontWeight: 600, fontSize: "0.9rem" }}>
        Finalizada
      </div>
    );
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes < 5;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontVariantNumeric: "tabular-nums",
        color: isUrgent ? "#fb7185" : "#38bdf8",
        fontWeight: 700,
        fontSize: "0.95rem",
      }}
    >
      <span style={{ fontSize: "1.1rem" }}>⏱</span>
      {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
      <span>{String(timeLeft.hours).padStart(2, "0")}h</span>:
      <span>{String(timeLeft.minutes).padStart(2, "0")}m</span>:
      <span>{String(timeLeft.seconds).padStart(2, "0")}s</span>
      {isUrgent && (
        <span style={{ fontSize: "0.75rem", background: "rgba(244,63,94,0.2)", padding: "2px 6px", borderRadius: "4px" }}>
          ¡Anti-sniping!
        </span>
      )}
    </div>
  );
}
