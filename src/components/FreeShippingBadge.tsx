// src/components/FreeShippingBadge.tsx
// 🆕 v19 - Badge "ENVÍO GRATIS" para productos

interface Props {
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline";
}

export default function FreeShippingBadge({ size = "sm", variant = "solid" }: Props) {
  const sizes = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  const variants = {
    solid: "bg-emerald-500 text-white",
    outline: "border-2 border-emerald-500 text-emerald-700 bg-white",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${sizes[size]} ${variants[variant]}`}
    >
      🚚 ENVÍO GRATIS
    </span>
  );
}