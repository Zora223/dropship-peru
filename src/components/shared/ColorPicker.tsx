// src/components/shared/ColorPicker.tsx
// 🎨 v22.13 - Selector de colores reutilizable

import { useState } from "react";

interface ColorPickerProps {
  selected: string[];
  onChange: (colors: string[]) => void;
  disabled?: boolean;
}

const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: "Negro", hex: "#000000" },
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Gris", hex: "#9CA3AF" },
  { name: "Rojo", hex: "#EF4444" },
  { name: "Azul", hex: "#3B82F6" },
  { name: "Celeste", hex: "#7DD3FC" },
  { name: "Verde", hex: "#22C55E" },
  { name: "Amarillo", hex: "#EAB308" },
  { name: "Naranja", hex: "#F97316" },
  { name: "Morado", hex: "#A855F7" },
  { name: "Rosa", hex: "#EC4899" },
  { name: "Marrón", hex: "#78350F" },
  { name: "Beige", hex: "#F5E6D3" },
  { name: "Dorado", hex: "#D4AF37" },
  { name: "Plateado", hex: "#C0C0C0" },
];

export default function ColorPicker({
  selected,
  onChange,
  disabled = false,
}: ColorPickerProps) {
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const toggleColor = (colorName: string) => {
    if (disabled) return;
    if (selected.includes(colorName)) {
      onChange(selected.filter((c) => c !== colorName));
    } else {
      onChange([...selected, colorName]);
    }
  };

  const addCustomColor = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (selected.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setCustomInput("");
      setShowCustomInput(false);
      return;
    }
    onChange([...selected, trimmed]);
    setCustomInput("");
    setShowCustomInput(false);
  };

  const removeColor = (colorName: string) => {
    if (disabled) return;
    onChange(selected.filter((c) => c !== colorName));
  };

  const getColorHex = (name: string): string => {
    const preset = PRESET_COLORS.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    return preset?.hex ?? "#6B7280";
  };

  return (
    <div className="space-y-3">
      {/* Grid de presets */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {PRESET_COLORS.map((color) => {
          const isSelected = selected.some(
            (s) => s.toLowerCase() === color.name.toLowerCase()
          );
          return (
            <button
              key={color.name}
              type="button"
              onClick={() => toggleColor(color.name)}
              disabled={disabled}
              className={`flex items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-xs font-semibold transition ${
                isSelected
                  ? "border-amber-500 bg-amber-50 text-amber-900 shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-gray-300 shadow-sm"
                style={{ backgroundColor: color.hex }}
              />
              <span className="truncate">{color.name}</span>
              {isSelected && <span className="ml-auto text-xs">✓</span>}
            </button>
          );
        })}
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
                addCustomColor();
              }
            }}
            placeholder="Ej: Vino, Turquesa..."
            maxLength={20}
            autoFocus
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:bg-white"
          />
          <button
            type="button"
            onClick={addCustomColor}
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
          + Agregar color personalizado
        </button>
      )}

      {/* Colores seleccionados */}
      {selected.length > 0 && (
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Seleccionados ({selected.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((color) => (
              <span
                key={color}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-sm"
              >
                <span
                  className="h-3 w-3 rounded-full border border-gray-300"
                  style={{ backgroundColor: getColorHex(color) }}
                />
                {color}
                <button
                  type="button"
                  onClick={() => removeColor(color)}
                  disabled={disabled}
                  className="ml-1 text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}