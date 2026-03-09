/**
 * Shared animation components built on framer-motion.
 * Reusable across all pages for consistent, professional animations.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Variant presets ---
export const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInDown = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0 },
};

export const fadeInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0 },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1 },
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

// --- Reusable wrapper components ---

/** Page-level transition wrapper */
export function PageTransition({ children, className, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/** Stagger container — wraps a list of children with stagger animation */
export function StaggerList({ children, className, style, delay = 0.1, stagger = 0.08 }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/** Single stagger child item */
export function StaggerItem({ children, className, style, variant = 'fadeUp' }) {
  const variants = {
    fadeUp: fadeInUp,
    fadeDown: fadeInDown,
    fadeLeft: fadeInLeft,
    fadeRight: fadeInRight,
    scale: scaleIn,
  };
  return (
    <motion.div
      variants={variants[variant] || fadeInUp}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/** Hover-scale card wrapper */
export function HoverCard({ children, className, style, scale = 1.02, lift = -4 }) {
  return (
    <motion.div
      whileHover={{ scale, y: lift, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/** Animated counter text (wraps react-countup) */
export { default as CountUp } from 'react-countup';

/** AnimatePresence re-export for convenience */
export { AnimatePresence, motion };
