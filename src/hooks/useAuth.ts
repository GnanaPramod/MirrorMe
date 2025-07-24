import { useState, useEffect } from 'react';
import { supabase, User } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Get initial session with increased timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 15000) // Increased to 15s for better reliability
        );

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (error) {
          console.error('Session error:', error);
        }

        if (mounted) {
          console.log('Initial session loaded:', session?.user?.id);
          setUser(session?.user as User || null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Initialize auth immediately
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);
        
        try {
          if (session?.user) {
            setUser(session.user as User || null);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          setUser(session?.user as User || null);
        }
        
        setLoading(false);
      }
    );

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
      } else {
        console.log('Sign in successful');
      }
      
      return { data, error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('Attempting sign up for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) {
        console.error('Sign up error:', error);
      } else {
        console.log('Sign up successful');
      }
      
      return { data, error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Attempting sign out');
      
      // Clear user state immediately for better UX
      setUser(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        
        // Check if the error is related to missing session
        const errorMessage = String(error).toLowerCase();
        if (errorMessage.includes('session_not_found') || 
            errorMessage.includes('auth session missing') ||
            errorMessage.includes('session from session_id claim in jwt does not exist')) {
          console.log('Session already invalid, treating as successful logout');
          return { error: null }; // Treat as successful since user is effectively logged out
        }
        
        // For other errors, still return the error but user state is already cleared
        return { error };
      } else {
        console.log('Sign out successful');
        return { error: null };
      }
      
    } catch (error) {
      console.error('Sign out error:', error);
      
      // Clear user state even on unexpected errors
      setUser(null);
      
      // Check if the error is related to missing session
      const errorMessage = String(error).toLowerCase();
      if (errorMessage.includes('session_not_found') || 
          errorMessage.includes('auth session missing') ||
          errorMessage.includes('session from session_id claim in jwt does not exist')) {
        console.log('Session already invalid, treating as successful logout');
        return { error: null }; // Treat as successful since user is effectively logged out
      }
      
      return { error };
    }
  };

  const refreshUser = async () => {
    try {
      console.log('Refreshing user data...');
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      
      if (refreshedUser) {
        console.log('User data refreshed successfully');
        setUser(refreshedUser as User || null);
        
        // Force a small delay to ensure state updates propagate
        await new Promise(resolve => setTimeout(resolve, 200));
        
        return refreshedUser;
      }
      
      return null;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return null;
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };
};