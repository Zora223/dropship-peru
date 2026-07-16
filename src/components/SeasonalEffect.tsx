import { useEffect, useState } from "react";
import { usePlatformSettings } from "../hooks/usePlatformSettings";

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

const EFFECT_CONFIG = {
  snow: { emoji: "❄️", count: 30 },
  confetti: { emoji: "🎊", count: 25 },
  hearts: { emoji: "💗", count: 20 },
  stars: { emoji: "⭐", count: 25 },
};

export default function SeasonalEffect() {
  const { settings } = usePlatformSettings();
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (settings.seasonal_effect === "none") {
      setParticles([]);
      return;
    }

    const config = EFFECT_CONFIG[settings.seasonal_effect as keyof typeof EFFECT_CONFIG];
    if (!config) return;

    const list: Particle[] = Array.from({ length: config.count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 10,
      size: 12 + Math.random() * 12,
    }));

    setParticles(list);
  }, [settings.seasonal_effect]);

  if (settings.seasonal_effect === "none" || particles.length === 0) {
    return null;
  }

  const config = EFFECT_CONFIG[settings.seasonal_effect as keyof typeof EFFECT_CONFIG];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute -top-10 animate-[fall_linear_infinite]"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {config.emoji}
        </span>
      ))}
    </div>
  );
}