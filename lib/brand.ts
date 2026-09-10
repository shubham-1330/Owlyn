/**
 * Brand hex values for the places CSS variables cannot reach: email inline
 * styles, the invoice PDF and the Razorpay modal. The site itself reads the
 * same values from app/globals.css; change both together (CLAUDE.md §3).
 */
export const BRAND = {
  paper: "#F7F6F3",
  ink: "#17191C",
  slate: "#E8E6E1",
  talon: "#8A6A2F",
  dusk: "#3B3566",
  fog: "#6B7076",
  alert: "#A3341F",
  /** Light text on ink or brass. */
  moon: "#F3F4F2",
  /** Muted text that clears 4.5:1 on paper and on slate. */
  fogText: "#5A5F65",
  /** Dividers on paper. */
  hairline: "#C9C6BF",
  /** Ink at 80%, behind third-party modals. */
  backdrop: "rgba(23, 25, 28, 0.8)",
} as const;
