import { useEffect, useState, useCallback } from "react";
import { fetchMyStore } from "../lib/vendor-store";
import type { DbStore } from "../types/database";

export function useMyStore() {
  const [store, setStore] = useState<DbStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyStore();
      setStore(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cargar tienda");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { store, loading, error, reload, setStore };
}