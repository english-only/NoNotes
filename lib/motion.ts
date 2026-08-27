import type { Variants, Transition } from "framer-motion";

// ── Timing ──────────────────────────────────────────────────────────────
// Coherent NoNotes motion language: fast microinteractions, deliberate
// UI transitions, respectful of prefers-reduced-motion.

/** Instant feedback — button press, hover. */
export const INSTANT: Transition = { duration: 0.1, ease: "easeOut" };
/** Short microinteraction — tooltip, icon toggle. */
export const MICRO: Transition = { duration: 0.15, ease: "easeOut" };
/** Standard UI transition — dialog, sheet, card entrance. */
export const SHORT: Transition = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] };
/** Medium transition — page, section reveal. */
export const MEDIUM: Transition = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] };
/** Slower reveal — landing-page hero, feature sections. */
export const SLOW: Transition = { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] };
/** Exit transition — faster than enter for responsiveness. */
export const EXIT: Transition = { duration: 0.15, ease: [0.55, 0, 1, 0.45] };

// ── Variants ─────────────────────────────────────────────────────────────

/** Fade + subtle slide-up. Pages, section reveals. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/** Fade only. Overlays, backdrops. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Scale + fade. Dialogs, modals, popovers. */
export const scaleFade: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
};

/** Slide from right. Side sheets, drawers. */
export const slideRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 40 },
};

/** Slide from bottom. Mobile sheets, toasts. */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 40 },
};

/** Page transition — fade + slight scale. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, scale: 0.99 },
  visible: { opacity: 1, scale: 1, transition: MEDIUM },
  exit: { opacity: 0, scale: 0.99, transition: EXIT },
};

/** Staggered list children. Each child fades + slides up. */
export const staggerList = (delay = 0.05): Variants => ({
  hidden: { opacity: 0, y: 8 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * delay, ...SHORT },
  }),
  exit: { opacity: 0, y: -4, transition: EXIT },
});

/** Stagger container. Use on parent; children use staggerList. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
  exit: {},
};

/** Card hover — subtle lift. */
export const cardHover = {
  scale: 1.01,
  y: -2,
  transition: MICRO,
};

/** Button press — subtle press-down. */
export const buttonTap = {
  scale: 0.97,
  transition: INSTANT,
};

// ── Study Session ────────────────────────────────────────────────────────

/** Card flip — 3D Y-axis rotation for study reveal. Uses preserve-3d. */
export const cardFlip = {
  front: {
    rotateY: 0,
    transition: SHORT,
  },
  back: {
    rotateY: 180,
    transition: SHORT,
  },
};

/** Study rating feedback — subtle scale pulse on rating selection. */
export const ratingPulse: Variants = {
  idle: { scale: 1 },
  selected: {
    scale: [1, 1.08, 1],
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

/** Progress bar fill animation. */
export const progressFill = {
  initial: { scaleX: 0 },
  animate: {
    scaleX: 1,
    transition: MEDIUM,
  },
};

// ── Reduced Motion ───────────────────────────────────────────────────────
// Check this at runtime for components that need reduced-motion behavior.

let _reducedMotion: boolean | null = null;

/**
 * Returns true if the user prefers reduced motion.
 * Caches the result after first check.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (_reducedMotion === null) {
    _reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }
  return _reducedMotion;
}

/**
 * Returns appropriate transition based on user preference.
 * Use this instead of hardcoded transitions in components.
 */
export function motionForPreference(
  preferred: Transition,
  fallback: Transition = { duration: 0 }
): Transition {
  return prefersReducedMotion() ? fallback : preferred;
}
