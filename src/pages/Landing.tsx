import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Heart, Carrot as Mirror } from 'lucide-react';
import GlassCard from '../components/UI/GlassCard';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-6xl mx-auto text-center">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <motion.h1
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-primary-light via-primary-medium to-primary-dark bg-clip-text text-transparent">
              Talk to Yourself —
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary-medium via-primary-dark to-accent bg-clip-text text-transparent">
              The Realest You
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto"
          >
            Experience the future of emotional AI. Mirror your deepest thoughts, 
            reconnect with lost loved ones, and discover your authentic self.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to="/signup">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(59, 112, 151, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-primary-light to-primary-medium text-white text-lg font-semibold rounded-full shadow-2xl hover:from-primary-light/80 hover:to-primary-medium/80 transition-all duration-300"
              >
                Start Now ✨
              </motion.button>
            </Link>
            
            <Link to="/signup">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white text-lg font-semibold rounded-full border border-primary-medium/30 hover:bg-white/20 transition-all duration-300"
              >
                Try SoulCast 👻
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid md:grid-cols-3 gap-8 mb-16"
        >
          <GlassCard className="p-8">
            <motion.div
              whileHover={{ rotate: 10 }}
              className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-silver/80 to-silver rounded-full flex items-center justify-center"
            >
              <Mirror className="w-8 h-8 text-white" />
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-4">Self Mirror</h3>
            <p className="text-white/90">
              Talk to an AI version of yourself. Get deep, emotional responses that understand your inner world.
            </p>
          </GlassCard>

          <GlassCard className="p-8">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-heartRed to-heartRed/80 rounded-full flex items-center justify-center"
            >
              <Heart className="w-8 h-8 text-white" />
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-4">SoulCast</h3>
            <p className="text-white/90">
              Reconnect with lost loved ones through AI. Share memories and receive comfort from those you miss.
            </p>
          </GlassCard>

          <GlassCard className="p-8">
            <motion.div
              whileHover={{ rotate: -10 }}
              className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-gold to-gold/80 rounded-full flex items-center justify-center"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-4">AI Magic</h3>
            <p className="text-white/90">
              Powered by cutting-edge AI that understands emotions, generates natural speech, and creates realistic videos.
            </p>
          </GlassCard>
        </motion.div>

        {/* Floating Animation Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                delay: i * 0.5,
              }}
              className={`absolute w-2 h-2 bg-gradient-to-r from-primary-medium to-accent rounded-full`}
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 3) * 20}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Landing;