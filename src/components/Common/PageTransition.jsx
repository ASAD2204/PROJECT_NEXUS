import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * Page Transition Wrapper
 * Adds smooth fade-up animation to page content
 * Used globally to wrap all main page content
 */

const PageTransition = ({ children, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  );
};

PageTransition.propTypes = {
  children: PropTypes.node.isRequired,
  delay: PropTypes.number,
};

export default PageTransition;
