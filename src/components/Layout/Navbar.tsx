import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, User, LogOut, Settings } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';

const Navbar: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      console.log('Starting sign out process...');
      
      // Close the profile menu first
      setShowProfileMenu(false);
      
      // Attempt to sign out
      const { error } = await signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        // Even if there's an error, we should still redirect to home
        // as the user intent is clear - they want to be logged out
      }
      
      console.log('Sign out completed, redirecting to home...');
      
      // Always redirect to home page after sign out attempt
      navigate('/');
      
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      // Still redirect to home even on unexpected errors
      navigate('/');
    }
  };

  const handleUpdateProfile = () => {
    // Navigate to dashboard with settings tab parameter
    navigate('/dashboard?tab=settings');
    setShowProfileMenu(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/10 dark:bg-black/10 border-b border-primary-medium/30 dark:border-primary-dark/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2"
            >
              <div className="text-3xl">🎭</div>
              <span className="text-2xl font-bold bg-gradient-to-r from-gold via-accent to-primary-medium bg-clip-text text-transparent">
                Mirror Me
              </span>
            </motion.div>
          </Link>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Bolt.new Badge Image */}
            <motion.a
              href="https://bolt.new/"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="hidden md:block"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-light/30 hover:border-primary-medium/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                <img
                  src="/black_circle_360x360.png"
                  alt="Built with Bolt"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.a>

            {/* Mobile Bolt Badge */}
            <motion.a
              href="https://bolt.new/"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="md:hidden"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary-light/30 hover:border-primary-medium/50 transition-all duration-300">
                <img
                  src="/black_circle_360x360.png"
                  alt="Built with Bolt"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.a>

            {/* Theme toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-primary-medium/30 hover:bg-white/20 transition-colors"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-dayYellow" />
              ) : (
                <Moon className="w-5 h-5 text-nightBlue" />
              )}
            </motion.button>

            {/* User menu */}
            {user ? (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2 p-2 rounded-full bg-gradient-to-r from-primary-medium/20 to-accent/20 backdrop-blur-sm border border-primary-light/30 hover:from-primary-medium/30 hover:to-accent/30 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-light to-primary-medium flex items-center justify-center">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="hidden md:block text-white text-sm font-medium">
                    {user.user_metadata?.full_name || 'User'}
                  </span>
                </motion.button>

                {/* Dropdown menu */}
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-lg rounded-xl border border-primary-medium/30 shadow-xl dark:bg-black/20"
                    >
                      <div className="p-2">
                        <button
                          onClick={handleUpdateProfile}
                          className="flex items-center space-x-2 w-full p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
                        >
                          <Settings className="w-4 h-4" />
                          <span className="text-sm">Update Profile</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-2 w-full p-2 rounded-lg hover:bg-red-500/20 transition-colors text-white"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm">Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 text-sm font-medium text-white hover:text-accent transition-colors"
                  >
                    Login
                  </motion.button>
                </Link>
                <Link to="/signup">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-primary-light to-primary-medium text-white rounded-lg hover:from-primary-light/80 hover:to-primary-medium/80 transition-all"
                  >
                    Sign Up
                  </motion.button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;