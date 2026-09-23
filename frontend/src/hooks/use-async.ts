"use client";

import { useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (value: T) => void;
}

/**
 * Small data hook. The fetcher lives in a ref and the effect re-runs on `key`,
 * so dependency arrays stay literal and no state is set synchronously inside
 * an effect (React 19's lint rules reject both).
 */
export function useAsync<T>(fn: () => Promise<T>, key: string = ""): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const fetcher = useRef(fn);
  useEffect(() => {
    fetcher.current = fn;
  });

  useEffect(() => {
    let cancelled = false;
    fetcher
      .current()
      .then((value) => {
        if (cancelled) return;
        setData(value);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const reload = () => {
    setLoading(true);
    setNonce((value) => value + 1);
  };

  return { data, error, loading, reload, setData };
}
