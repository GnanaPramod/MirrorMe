import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  type?: 'orb' | 'heart' | 'pulse';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  type = 'orb' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-20 h-20'
  };

  if (type === 'heart') {
    return (
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`${sizeClasses[size]} flex items-center justify-center`}
      >
        <div className="text-red-400 text-2xl">❤️</div>
      </motion.div>
    );
  }

  if (type === 'pulse') {
    return (
      <motion.div
        animate={{
          opacity: [0.5, 1, 0.5],
          scale: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400`}
      />
    );
  }

  // Default orb type
  return (
    <motion.div
      animate={{
        rotate: 360,
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
      className={`${sizeClasses[size]} rounded-full border-2 border-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-border`}
      style={{
        background: `conic-gradient(from 0deg, transparent, rgba(168, 85, 247, 0.4), transparent)`,
      }}
    />
  );
};

export default LoadingSpinner;