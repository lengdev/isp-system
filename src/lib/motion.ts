// Motion tokens according to Master Spec Section 11
export const DURATION_FAST = 0.12; // 120ms
export const DURATION_NORMAL = 0.20; // 200ms
export const DURATION_SLOW = 0.32; // 320ms

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// Springs
export const SPRING_SOFT = {
  type: 'spring',
  stiffness: 380,
  damping: 34,
} as const;

export const SPRING_SNAPPY = {
  type: 'spring',
  stiffness: 520,
  damping: 38,
} as const;

// Transition presets for Framer Motion
export const transitions = {
  fast: { duration: DURATION_FAST, ease: EASE_OUT },
  normal: { duration: DURATION_NORMAL, ease: EASE_OUT },
  slow: { duration: DURATION_SLOW, ease: EASE_OUT },
  springSoft: SPRING_SOFT,
  springSnappy: SPRING_SNAPPY,
};

// Modal animation variants
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.springSoft,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: DURATION_FAST, ease: EASE_OUT },
  },
};

// Drawer animation variants
export const drawerVariants = {
  hidden: { x: '100%', opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: transitions.springSoft,
  },
  exit: {
    x: '100%',
    opacity: 0.8,
    transition: { duration: DURATION_NORMAL, ease: EASE_OUT },
  },
};

// Popover / Combobox scale from origin
export const popoverVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION_FAST, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: DURATION_FAST, ease: EASE_OUT },
  },
};

// Page transition variants (fade + 8px slide)
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION_NORMAL, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION_FAST, ease: EASE_OUT } },
};

// Tab content crossfade + 4px slide
export const tabContentVariants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION_FAST, ease: EASE_OUT } },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION_FAST, ease: EASE_OUT } },
};

// Row stagger animation
export const rowStaggerVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: Math.min(i * 0.02, 0.2),
      duration: DURATION_FAST,
      ease: EASE_OUT,
    },
  }),
};
