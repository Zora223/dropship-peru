interface DataPoint {
  label: string;
  value: number;
}

interface MiniChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export default function MiniChart({
  data,
  color = "#e11d48",
  height = 120,
  formatValue = (v) => v.toString(),
}: MiniChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full">
      {/* Barras */}
      <div
        className="flex items-end justify-between gap-1"
        style={{ height: `${height}px` }}
      >
        {data.map((point, i) => {
          const heightPct = max > 0 ? (point.value / max) * 100 : 0;
          const barHeight = Math.max(2, heightPct); // min 2% para que se vea

          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center justify-end"
            >
              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute -top-8 z-10 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                {formatValue(point.value)}
              </div>

              {/* Barra */}
              <div
                className="w-full rounded-t-md transition-all duration-500 group-hover:opacity-80"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: color,
                  minHeight: point.value > 0 ? "4px" : "2px",
                  opacity: point.value > 0 ? 1 : 0.15,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="mt-2 flex justify-between gap-1">
        {data.map((point, i) => (
          <div
            key={i}
            className="flex-1 truncate text-center text-[9px] font-medium text-gray-500"
          >
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
}