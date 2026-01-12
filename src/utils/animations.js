// Reusable animation variants for framer-motion

// Page transition - for main page content
export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

// Stagger container - for lists and grids
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Fade in up - for child items in stagger containers
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
};

// Scale in - for modals and dialogs
export const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
  transition: { duration: 0.2 }
};

// Slide in from right - for sidebars and drawers
export const slideInRight = {
  initial: { x: 300, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 300, opacity: 0 },
  transition: { duration: 0.3 }
};

// Slide in from left
export const slideInLeft = {
  initial: { x: -300, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -300, opacity: 0 },
  transition: { duration: 0.3 }
};

// Fade in - simple fade animation
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

// Bounce in - for notifications and alerts
export const bounceIn = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  },
  exit: { scale: 0, opacity: 0 }
};

// Stagger faster - for quick animations
export const staggerContainerFast = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

// Stagger slower - for dramatic effect
export const staggerContainerSlow = {
  animate: {
    transition: {
      staggerChildren: 0.15
    }
  }
};

// Card hover animation
export const cardHover = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  }
};

// Button tap animation
export const buttonTap = {
  scale: 0.95
};
