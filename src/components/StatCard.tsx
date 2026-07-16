import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  subtitle?: string;
  trend?: {
    value: number; // porcentaje
    label?: string; // "vs semana pasada"
  };
  color?: "default" | "success" | "warning" | "danger" | "info" | "primary" | "dark";
  children?: ReactNode;
}

const COLOR_CLASSES = {
  default: "bg-white text-gray-900",
  success: "bg-white text-emerald-600",
  warning: "bg-white text-amber-600",
  danger: "bg-white text-red-600",
  info: "bg-white text-blue-600",
  primary: "bg-white text-rose-600",
  dark: "bg-linear-to-br from-gray-900 to-gray-800 text-white",
};

export default function StatCard({
  label,
  value,
  icon,
  subtitle,
  trend,
  color = "default",
  children,
}: StatCardProps) {
  const isDark = color === "dark";
  const colorClass = COLOR_CLASSES[color];

  return (
    <div className={`rounded-2xl p-5 shadow-sm ${colorClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? "text-white/70" : "text-gray-500"
          }`}
        >
          {label}
        </div>
        {icon && <div className="text-lg">{icon}</div>}
      </div>

      <div className="mt-2 text-2xl font-bold sm:text-3xl">
        {value}
      </div>

      {trend && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              trend.value >= 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
          {trend.label && (
            <span
              className={`text-[10px] ${
                isDark ? "text-white/60" : "text-gray-400"
              }`}
            >
              {trend.label}
            </span>
          )}
        </div>
      )}

      {subtitle && (
        <div
          className={`mt-1 text-xs ${
            isDark ? "text-white/60" : "text-gray-400"
          }`}
        >
          {subtitle}
        </div>
      )}

      {children}
    </div>
  );
}