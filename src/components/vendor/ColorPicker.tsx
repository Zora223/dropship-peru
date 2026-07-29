// src/components/vendor/ColorPicker.tsx
import { useState } from "react";

export interface ProductColor {
  name: string;
  hex: string;
}

interface ColorPickerProps {
  colors: ProductColor[];
  onChange: (colors: ProductColor[]) => void;
}

// Colores presets comunes
const PRESET_COLORS: ProductColor[] = [
  { name: "Negro", hex: "#000000" },
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Rojo", hex: "#DC2626" },
  { name: "Azul", hex: "#2563EB" },
  { name: "Verde", hex: "#16A34A" },
  { name: "Amarillo", hex: "#EAB308" },
  { name: "Rosa", hex: "#EC4899" },
  { name: "Morado", hex: "#9333EA" },
  { name: "Naranja", hex: "#F97316" },
  { name: "Café", hex: "#78350F" },
  { name: "Gris", hex: "#6B7280" },
  { name: "Beige", hex: "#D4A574" },
];

export default function ColorPicker({ colors, onChange }: ColorPickerProps) {
  const [customHex, setCustomHex] = useState("#000000");
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const addColor = (color: ProductColor) => {
    // Evita duplicados por nombre
    if (colors.some((c) => c.name.toLowerCase() === color.name.toLowerCase())) {
      return;
    }
    onChange([...colors, color]);
  };

  const removeColor = (index: number) => {
    onChange(colors.filter((_, i) => i !== index));
  };

  const handleAddCustom = () => {
    const name = customName.trim();
    if (!name) return;
    addColor({ name, hex: customHex });
    setCustomName("");
    setCustomHex("#000000");
    setShowCustom(false);
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700">
        🎨 Colores disponibles{" "}
        <span className="text-gray-400">(opcional)</span>
      </label>
      <p className="mt-1 text-xs text-gray-500">
        💡 Agrega los colores en que está disponible este producto. El cliente
        podrá elegir uno al comprar.
      </p>

      {/* Lista de colores agregados */}
      {colors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {colors.map((color, idx) => (
            <div
              key={`${color.name}-${idx}`}
              className="group flex items-center gap-2 rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 transition hover:border-gray-400"
            >
              <span
                className="h-5 w-5 rounded-full border border-gray-300 shadow-sm"
                style={{ backgroundColor: color.hex }}
              />
              <span className="text-sm font-semibold text-gray-800">
                {color.name}
              </span>
              <button
                type="button"
                onClick={() => removeColor(idx)}
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs text-gray-400 transition hover:bg-red-100 hover:text-red-600"
                title="Quitar color"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Presets de colores rápidos */}
      <div className="mt-4">
        <div className="text-xs font-semibold text-gray-500 mb-2">
          Colores rápidos:
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((preset) => {
            const alreadyAdded = colors.some(
              (c) => c.name.toLowerCase() === preset.name.toLowerCase()
            );
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => addColor(preset)}
                disabled={alreadyAdded}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  alreadyAdded
                    ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                }`}
                title={alreadyAdded ? "Ya agregado" : `Agregar ${preset.name}`}
              >
                <span
                  className="h-4 w-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: preset.hex }}
                />
                {preset.name}
                {alreadyAdded && <span className="text-emerald-500">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Botón para agregar personalizado */}
      <div className="mt-3">
        {!showCustom ? (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
          >
            + Agregar color personalizado
          </button>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300"
                title="Elegir color"
              />
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Nombre del color (ej: Turquesa)"
                maxLength={30}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!customName.trim()}
                className="rounded-lg bg-rose-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agregar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustom(false);
                  setCustomName("");
                  setCustomHex("#000000");
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}