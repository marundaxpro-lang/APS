/**
 * useSubscriptionGuard — intentionally a no-op.
 *
 * Auto-redirecting to /paywall from a hook caused competing navigation with
 * the single AuthGuard in _layout.tsx, stacking screens on top of each other.
 * The paywall should only open when the user explicitly taps a button.
 */
export function useSubscriptionGuard() {
  // No-op: paywall navigation is user-initiated only.
}
