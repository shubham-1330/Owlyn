"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  mergeWishlistAction,
  toggleWishlistAction,
} from "@/app/(storefront)/account/wishlist/actions";
import type { WishlistEntry } from "@/lib/wishlist/service";

const STORAGE_KEY = "owlyn:wishlist";

type WishlistContextValue = {
  isSignedIn: boolean;
  entries: WishlistEntry[];
  count: number;
  has: (productId: string) => boolean;
  toggle: (entry: WishlistEntry) => Promise<boolean>;
  addLocal: (entry: WishlistEntry) => void;
  remove: (productId: string) => void;
  href: string;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

function readLocal(): WishlistEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e): e is WishlistEntry => Boolean(e) && typeof e.productId === "string")
      .map((e) => ({
        productId: e.productId,
        variantId: typeof e.variantId === "string" ? e.variantId : null,
      }))
      .slice(0, 100);
  } catch {
    return [];
  }
}

function writeLocal(entries: WishlistEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage is optional
  }
}

/**
 * Signed-in users keep their wishlist in the database; guests keep it in the
 * browser. The first render after sign-in merges any browser entries into
 * the account and clears them, so nothing is lost at login.
 */
export function WishlistProvider({
  isSignedIn,
  initialEntries,
  children,
}: {
  isSignedIn: boolean;
  initialEntries: WishlistEntry[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<WishlistEntry[]>(isSignedIn ? initialEntries : []);
  const merging = useRef(false);

  useEffect(() => {
    if (isSignedIn) setEntries(initialEntries);
  }, [isSignedIn, initialEntries]);

  useEffect(() => {
    if (isSignedIn) {
      const local = readLocal();
      if (local.length === 0 || merging.current) return;
      merging.current = true;
      mergeWishlistAction(local)
        .then((result) => {
          if (result.ok) {
            writeLocal([]);
            setEntries((current) => {
              const seen = new Set(current.map((e) => e.productId));
              return [...current, ...local.filter((e) => !seen.has(e.productId))];
            });
            router.refresh();
          }
        })
        .finally(() => {
          merging.current = false;
        });
    } else {
      setEntries(readLocal());
    }
  }, [isSignedIn, router]);

  const has = useCallback(
    (productId: string) => entries.some((e) => e.productId === productId),
    [entries],
  );

  const toggle = useCallback(
    async (entry: WishlistEntry) => {
      const saved = !entries.some((e) => e.productId === entry.productId);
      const next = saved
        ? [entry, ...entries.filter((e) => e.productId !== entry.productId)]
        : entries.filter((e) => e.productId !== entry.productId);
      setEntries(next);
      if (!isSignedIn) {
        writeLocal(next);
        return saved;
      }
      const result = await toggleWishlistAction(entry);
      if (!result.ok) {
        setEntries(entries);
        return !saved;
      }
      return result.saved;
    },
    [entries, isSignedIn],
  );

  const addLocal = useCallback((entry: WishlistEntry) => {
    setEntries((current) => {
      if (current.some((e) => e.productId === entry.productId)) return current;
      const next = [entry, ...current];
      writeLocal(next);
      return next;
    });
  }, []);

  const remove = useCallback(
    (productId: string) => {
      setEntries((current) => {
        const next = current.filter((e) => e.productId !== productId);
        if (!isSignedIn) writeLocal(next);
        return next;
      });
    },
    [isSignedIn],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      isSignedIn,
      entries,
      count: entries.length,
      has,
      toggle,
      addLocal,
      remove,
      href: isSignedIn ? "/account/wishlist" : "/wishlist",
    }),
    [isSignedIn, entries, has, toggle, addLocal, remove],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
