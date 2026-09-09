"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  addToCartAction,
  applyCouponAction,
  moveToWishlistAction,
  refreshCartAction,
  removeCartItemAction,
  removeCouponAction,
  updateCartItemAction,
} from "@/app/(storefront)/cart/actions";
import { useWishlist } from "@/components/storefront/wishlist/wishlist-provider";
import { EMPTY_CART, type CartData } from "@/lib/cart/types";

type OptimisticAction =
  { type: "qty"; itemId: string; qty: number } | { type: "remove"; itemId: string };

export type CartMessage = { tone: "error" | "info"; text: string; id: number };

type CartContextValue = {
  /** Server truth. */
  cart: CartData;
  /** What to render: server truth with in-flight changes applied. */
  view: CartData;
  pending: boolean;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  add: (input: { variantId: string; qty?: number }) => Promise<boolean>;
  updateQty: (itemId: string, qty: number) => void;
  remove: (itemId: string) => void;
  moveToWishlist: (itemId: string) => void;
  applyCoupon: (code: string) => Promise<string | null>;
  removeCoupon: () => void;
  refresh: () => void;
  message: CartMessage | null;
  dismissMessage: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/** Optimistic maths is deliberately simple; the server's answer replaces it within the same transition. */
function optimisticReducer(state: CartData, action: OptimisticAction): CartData {
  const lines = state.lines
    .map((line) => {
      if (line.id !== action.itemId) return line;
      if (action.type === "remove") return null;
      const qty = Math.max(0, Math.min(action.qty, line.maxQty || action.qty));
      const lineTotal = line.unitPrice * qty;
      return { ...line, qty, lineTotal, net: lineTotal - Math.min(line.discount, lineTotal) };
    })
    .filter((line): line is CartData["lines"][number] => line !== null && line.qty > 0);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const discountTotal = lines.reduce((s, l) => s + l.discount, 0);
  const discounted = subtotal - discountTotal;
  const threshold = state.freeShippingThreshold;
  const freeShipping =
    state.coupon?.freeShipping ||
    (threshold !== null && discounted >= threshold && lines.length > 0);
  const shippingTotal = lines.length === 0 || freeShipping ? 0 : state.shippingTotal || 0;
  return {
    ...state,
    lines,
    itemCount: lines.reduce((s, l) => s + l.qty, 0),
    subtotal,
    discountTotal,
    shippingTotal,
    freeShipping,
    freeShippingRemaining: threshold === null ? 0 : Math.max(0, threshold - discounted),
    grandTotal: discounted + shippingTotal,
  };
}

export function CartProvider({
  initialCart,
  children,
}: {
  initialCart: CartData | null;
  children: React.ReactNode;
}) {
  const wishlist = useWishlist();
  const pathname = usePathname();
  const [cart, setCart] = useState<CartData>(initialCart ?? EMPTY_CART);
  const [view, applyOptimistic] = useOptimistic(cart, optimisticReducer);
  const [pending, startTransition] = useTransition();
  const [isOpen, setOpen] = useState(false);
  const [message, setMessage] = useState<CartMessage | null>(null);
  const messageId = useRef(0);

  useEffect(() => {
    setCart(initialCart ?? EMPTY_CART);
  }, [initialCart]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const notify = useCallback((tone: CartMessage["tone"], text: string) => {
    messageId.current += 1;
    setMessage({ tone, text, id: messageId.current });
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), message.tone === "error" ? 8000 : 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const fresh = await refreshCartAction();
      setCart(fresh ?? EMPTY_CART);
    });
  }, []);

  // Another tab may have changed the bag; reconcile when this one comes back.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const add = useCallback(
    (input: { variantId: string; qty?: number }) =>
      new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const result = await addToCartAction(input);
          if (result.ok) {
            setCart(result.cart);
            setOpen(true);
            if (result.notice) notify("info", result.notice);
            resolve(true);
          } else {
            if (result.cart) setCart(result.cart);
            notify("error", result.error);
            resolve(false);
          }
        });
      }),
    [notify],
  );

  const updateQty = useCallback(
    (itemId: string, qty: number) => {
      startTransition(async () => {
        applyOptimistic({ type: "qty", itemId, qty });
        const result = await updateCartItemAction({ itemId, qty });
        if (result.ok) {
          setCart(result.cart);
          if (result.notice) notify("info", result.notice);
        } else {
          if (result.cart) setCart(result.cart);
          notify("error", result.error);
        }
      });
    },
    [applyOptimistic, notify],
  );

  const remove = useCallback(
    (itemId: string) => {
      startTransition(async () => {
        applyOptimistic({ type: "remove", itemId });
        const result = await removeCartItemAction({ itemId });
        if (result.ok) setCart(result.cart);
        else {
          if (result.cart) setCart(result.cart);
          notify("error", result.error);
        }
      });
    },
    [applyOptimistic, notify],
  );

  const moveToWishlist = useCallback(
    (itemId: string) => {
      startTransition(async () => {
        applyOptimistic({ type: "remove", itemId });
        const result = await moveToWishlistAction({ itemId });
        if (result.ok) {
          setCart(result.cart);
          if (!wishlist.isSignedIn && result.entry) wishlist.addLocal(result.entry);
          notify("info", "Moved to your wishlist.");
        } else {
          if (result.cart) setCart(result.cart);
          notify("error", result.error);
        }
      });
    },
    [applyOptimistic, notify, wishlist],
  );

  const applyCoupon = useCallback(
    (code: string) =>
      new Promise<string | null>((resolve) => {
        startTransition(async () => {
          const result = await applyCouponAction({ code });
          if (result.ok) {
            setCart(result.cart);
            resolve(null);
          } else {
            if (result.cart) setCart(result.cart);
            resolve(result.error);
          }
        });
      }),
    [],
  );

  const removeCoupon = useCallback(() => {
    startTransition(async () => {
      const result = await removeCouponAction();
      if (result.ok) setCart(result.cart);
      else notify("error", result.error);
    });
  }, [notify]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      view,
      pending,
      isOpen,
      setOpen,
      add,
      updateQty,
      remove,
      moveToWishlist,
      applyCoupon,
      removeCoupon,
      refresh,
      message,
      dismissMessage: () => setMessage(null),
    }),
    [
      cart,
      view,
      pending,
      isOpen,
      add,
      updateQty,
      remove,
      moveToWishlist,
      applyCoupon,
      removeCoupon,
      refresh,
      message,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
