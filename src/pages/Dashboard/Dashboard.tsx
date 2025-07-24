import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Carrot as Mirror, Heart, Archive, Settings, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import GlassCard from '../../components/UI/GlassCard';
import SelfMirror from './SelfMirror';
import SoulCast from './SoulCast';
import Vault from './Vault';
import SettingsTab from './SettingsTab';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('mirror');
  const { user } = useAuth();
  const location = useLocation();

  // Check for tab parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam && ['mirror', 'soulcast', 'vault', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const tabs = [
    { id: 'mirror', name: 'Self Mirror', icon: Mirror, gradient: 'from-silver/60 to-silver/80' },
    { id: 'soulcast', name: 'SoulCast', icon: Heart, gradient: 'from-heartRed/60 to-heartRed/80' },
    { id: 'vault', name: 'Vault', icon: Archive, gradient: 'from-primary-medium/60 to-primary-dark/60' },
    { id: 'settings', name: 'Settings', icon: Settings, gradient: 'from-gray-500/60 to-slate-500/60' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'mirror':
        return <SelfMirror />;
      case 'soulcast':
        return <SoulCast />;
      case 'vault':
        return <Vault />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <SelfMirror />;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <GlassCard className="p-6 text-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="text-4xl mb-4"
            >
              ✨
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Hey {user?.user_metadata?.full_name || 'Beautiful Soul'}, 
            </h1>
            <p className="text-lg text-white">
              How are you feeling today?
            </p>
          </GlassCard>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <GlassCard className="p-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative p-4 rounded-xl transition-all duration-300 flex flex-col items-center space-y-2
                      ${activeTab === tab.id 
                        ? 'bg-gradient-to-r ' + tab.gradient + ' text-white shadow-lg' 
                        : 'text-white hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{tab.name}</span>
                    
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-xl border-2 border-white/30"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;