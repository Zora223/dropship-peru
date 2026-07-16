import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

// ========== TIPOS ==========
export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  clear: () => void;
}

// ========== CONTEXT ==========
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ========== ESTILOS POR TIPO ==========
const TOAST_STYLES: Record<
  ToastType,
  {
    bg: string;
    border: string;
    icon: string;
    iconBg: string;
    progress: string;
  }
> = {
  success: {
    bg: "bg-white",
    border: "border-emerald-200",
    icon: "✅",
    iconBg: "bg-emerald-100 text-emerald-600",
    progress: "bg-emerald-500",
  },
  error: {
    bg: "bg-white",
    border: "border-red-200",
    icon: "❌",
    iconBg: "bg-red-100 text-red-600",
    progress: "bg-red-500",
  },
  warning: {
    bg: "bg-white",
    border: "border-yellow-200",
    icon: "⚠️",
    iconBg: "bg-yellow-100 text-yellow-600",
    progress: "bg-yellow-500",
  },
  info: {
    bg: "bg-white",
    border: "border-blue-200",
    icon: "💡",
    iconBg: "bg-blue-100 text-blue-600",
    progress: "bg-blue-500",
  },
};

// ========== COMPONENTE INDIVIDUAL DE TOAST ==========
function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const styles = TOAST_STYLES[toast.type];
  const duration = toast.duration ?? 4500;

  useEffect(() => {
    if (duration === Infinity) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 50);

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      className={`
        pointer-events-auto relative overflow-hidden
        w-full max-w-sm rounded-2xl border shadow-lg
        ${styles.bg} ${styles.border}
        transition-all duration-300 ease-out
        ${
          isExiting
            ? "opacity-0 translate-x-full scale-95"
            : "opacity-100 translate-x-0 scale-100"
        }
      `}
      role="alert"
      style={{
        animation: isExiting ? undefined : "toast-slide-in 0.3s ease-out",
      }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icono */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${styles.iconBg}`}
        >
          {styles.icon}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 leading-tight">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              {toast.message}
            </p>
          )}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                handleClose();
              }}
              className="mt-2 text-xs font-bold text-gray-900 underline hover:no-underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Botón cerrar */}
        <button
          onClick={handleClose}
          className="shrink-0 -mr-1 -mt-1 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          aria-label="Cerrar notificación"
        >
          ×
        </button>
      </div>

      {/* Barra de progreso */}
      {duration !== Infinity && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
          <div
            className={`h-full ${styles.progress} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ========== PROVIDER ==========
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">): string => {
    const id = `toast_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    // Máximo 5 toasts a la vez (elimina los más antiguos)
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
    return id;
  }, []);

  const success = useCallback(
    (title: string, message?: string, duration?: number) =>
      addToast({ type: "success", title, message, duration }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) =>
      addToast({ type: "error", title, message, duration: duration ?? 6000 }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) =>
      addToast({ type: "warning", title, message, duration: duration ?? 5000 }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) =>
      addToast({ type: "info", title, message, duration }),
    [addToast]
  );

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
        clear,
      }}
    >
      {children}

      {/* Container de toasts */}
      <div
       className="fixed top-4 right-4 left-4 sm:left-auto sm:right-6 sm:top-6 z-9999 flex flex-col gap-2 pointer-events-none"
        aria-label="Notificaciones"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>

      {/* Animaciones */}
      <style>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @media (max-width: 640px) {
          @keyframes toast-slide-in {
            from {
              opacity: 0;
              transform: translateY(-100%) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// ========== HOOK ==========
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return context;
}