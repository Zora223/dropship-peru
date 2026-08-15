// src/components/shared/SizePicker.tsx
// 👕 v22.20 - Selector de tallas reutilizable

import { useState } from "react";
import {
  CLOTHING_SIZES,
  SHOE_SIZES,
  isShoeCategory,
  normalizeSizes,
} from "../../lib/size-utils";

interface SizePickerProps {
  selected: string[];
  onChange: (sizes: string[]) => void;
  category?: string | null;
  disabled?: boolean;
}

export default function SizePicker({
  selected,
  onChange,
  category,
  disabled = false,
}: SizePickerProps) {
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Detectar automáticamente qué tallas sugerir
  const isShoes = isShoeCategory(category);
  const suggestedSizes = isShoes ? SHOE_SIZES : CLOTHING_SIZES;

  const cleanSelected = normalizeSizes(selected);

  const toggleSize = (size: string) => {
    if (disabled) return;
    const upper = size.toUpperCase();
    if (cleanSelected.includes(upper)) {
      onChange(cleanSelected.filter((s) => s !== upper));
    } else {
      onChange([...cleanSelected, upper]);
    }
  };

  const addCustomSize = () => {
    const trimmed = customInput.trim().toUpperCase();
    if (!trimmed) return;
    if (cleanSelected.includes(trimmed)) {
      setCustomInput("");
      setShowCustomInput(false);
      return;
    }
    onChange([...cleanSelected, trimmed]);
    setCustomInput("");
    setShowCustomInput(false);
  };

  return (
    <div className="space-y-3">
      {/* Info del tipo detectado */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs">
        <span className="font-bold text-blue-900">
          {isShoes ? "👞 Detectado: Calzado" : "👕 Detectado: Ropa"}
        </span>
        <span className="ml-1 text-blue-700">
          — Tallas sugeridas: {isShoes ? "35-46" : "XS-XXL"}
        </span>
      </div>

      {/* Grid de tallas sugeridas */}
      <div>
        <div className="mb-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
          {isShoes ? "Tallas numéricas" : "Tallas de letra"}
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestedSizes.map((size) => {
            const isSelected = cleanSelected.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                disabled={disabled}
                className={`flex h-10 min-w-12 items-center justify-center... justify-center rounded-lg border-2 px-3 text-sm font-bold transition ${
                  isSelected
                    ? "border-amber-500 bg-amber-500 text-white shadow-md"
                    : "border-gray-200 bg-white text-gray-700 hover:border-amber-400"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Input personalizado */}
      {showCustomInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomSize();
              }
            }}
            placeholder="Ej: 4XL, Único..."
            maxLength={10}
            autoFocus
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:bg-white uppercase"
          />
          <button
            type="button"
            onClick={addCustomSize}
            className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"
          >
            Agregar
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              setCustomInput("");
            }}
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustomInput(true)}
          disabled={disabled}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 py-2 text-xs font-semibold text-gray-600 hover:border-amber-400 hover:bg-amber-50/30 disabled:opacity-50"
        >
          + Agregar talla personalizada
        </button>
      )}

      {/* Tallas seleccionadas */}
      {cleanSelected.length > 0 && (
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Seleccionadas ({cleanSelected.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cleanSelected.map((size) => (
              <span
                key={size}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-3 py-1 text-sm font-bold text-gray-800 shadow-sm"
              >
                {size}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}