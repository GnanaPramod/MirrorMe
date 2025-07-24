import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '',
  hover = true
}) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -5 } : {}}
      transition={{ duration: 0.3 }}
      className={`
        backdrop-blur-lg bg-white/10 dark:bg-white/5 
        border border-primary-medium/30 dark:border-primary-dark/20 
        rounded-2xl shadow-xl 
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;