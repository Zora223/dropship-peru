// src/components/vendor/FieldFillButton.tsx
// 🎯 Mini-botón para rellenar UN campo con IA - Ilimitado

import { useState } from "react";
import { autoFillProduct, type AutoFillField, type AutoFillData } from "../../lib/auto-fill-ai";

interface FieldFillButtonProps {
  imageUrl: string | null;
  field: Exclude<AutoFillField, "all">;
  creditsRemaining: number;
  plan: string;
  onFillComplete: (data: AutoFillData) => void;
  onCreditsUpdate: (newCredits: number) => void;
}

export default function FieldFillButton({
  imageUrl,
  field,
  onFillComplete,
  onCreditsUpdate,
}: FieldFillButtonProps) {
  const [loading, setLoading] = useState(false);
  const noImage = !imageUrl;

  const handleClick = async () => {
    if (!imageUrl) return;

    setLoading(true);
    try {
      const response = await autoFillProduct(imageUrl, field);
      onFillComplete(response.data);
      onCreditsUpdate(response.credits_remaining);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      alert(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  if (noImage) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
        loading
          ? "bg-purple-100 text-purple-700"
          : "bg-linear-to-r from-purple-500 to-pink-500 text-white hover:shadow-md"
      }`}
      title="Rellenar este campo con IA (Gratis)"
    >
      {loading ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>...</span>
        </>
      ) : (
        <>
          <span>🪄</span>
          <span>Auto-Fill IA</span>
        </>
      )}
    </button>
  );
}