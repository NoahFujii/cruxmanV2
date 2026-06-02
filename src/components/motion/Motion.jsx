import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';

const spring = { type: 'spring', stiffness: 300, damping: 22 };
const springButton = { type: 'spring', stiffness: 400, damping: 25 };

function staggerContainerVariants(delay) {
  return {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: delay } },
  };
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
};

export function MotionCard({ children, onHoverChange, style, ...props }) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  const enter = () => { setHovered(true); onHoverChange?.(true); };
  const leave = () => { setHovered(false); onHoverChange?.(false); };

  if (reduced) {
    return (
      <div
        style={style}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={spring}
      onHoverStart={enter}
      onHoverEnd={leave}
      style={{
        ...style,
        borderColor: hovered ? 'var(--accent)' : 'var(--border)',
        transition: 'border-color 0.15s ease',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function MotionButton({ children, ghost = false, style, ...props }) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  const resolvedStyle = ghost
    ? {
        background: 'transparent',
        color: hovered ? 'var(--accent-hover)' : 'var(--accent)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        transition: 'color 0.15s ease',
        ...style,
      }
    : {
        backgroundColor: hovered ? 'var(--accent-hover)' : 'var(--accent)',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        ...style,
      };

  if (reduced) {
    return <button style={resolvedStyle} {...props}>{children}</button>;
  }

  if (ghost) {
    return (
      <motion.button
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        style={resolvedStyle}
        {...props}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.05 }}
      whileTap={{ y: 0, scale: 0.97 }}
      transition={spring}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={resolvedStyle}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function Stagger({ children, delay = 0, style, ...props }) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div style={style} {...props}>{children}</div>;
  }

  return (
    <motion.div
      variants={staggerContainerVariants(delay)}
      initial="hidden"
      animate="show"
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, style, ...props }) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div style={style} {...props}>{children}</div>;
  }

  return (
    <motion.div variants={itemVariants} style={style} {...props}>
      {children}
    </motion.div>
  );
}
