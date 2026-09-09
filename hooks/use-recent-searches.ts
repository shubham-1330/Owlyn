"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "owlyn:recent-searches";
const MAX_ITEMS = 6;

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string").slice(0, MAX_ITEMS)
      : [];
  } catch {
    return [];
  }
}

function write(items: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage may be unavailable (private mode, quota). Recents are a convenience only.
  }
}

/** Recent search terms, kept in the browser only. Never sent to the server. */
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(read());
  }, []);

  const add = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecent((current) => {
      const next = [clean, ...current.filter((c) => c.toLowerCase() !== clean.toLowerCase())].slice(
        0,
        MAX_ITEMS,
      );
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    write([]);
  }, []);

  return { recent, add, clear };
}
