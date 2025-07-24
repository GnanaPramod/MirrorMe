import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Archive, Calendar, Heart, Carrot as Mirror, Filter, Play, Volume2, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import GlassCard from '../../components/UI/GlassCard';

interface Session {
  id: string;
  type: 'mirror' | 'soulcast';
  input: string;
  response: string;
  emotion?: string;
  soulName?: string;
  relationship?: string;
  date: Date;
  thumbnail?: string;
  audioBlob?: Blob;
}

const Vault: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<'all' | 'mirror' | 'soulcast'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'emotion'>('date');

  // Load sessions from localStorage on component mount
  useEffect(() => {
    loadSessions();
  }, [user]);

  const loadSessions = () => {
    if (!user) return;

    try {
      const savedSessions = localStorage.getItem(`vault_sessions_${user.id}`);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          date: new Date(session.date)
        }));
        setSessions(parsedSessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const saveSessions = (newSessions: Session[]) => {
    if (!user) return;

    try {
      localStorage.setItem(`vault_sessions_${user.id}`, JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  };

  // Function to add a new session (called from other components)
  const addSession = (sessionData: Omit<Session, 'id' | 'date'>) => {
    const newSession: Session = {
      ...sessionData,
      id: Date.now().toString(),
      date: new Date()
    };

    const updatedSessions = [newSession, ...sessions];
    saveSessions(updatedSessions);
  };

  // Make addSession available globally for other components
  useEffect(() => {
    if (user) {
      (window as any).addVaultSession = addSession;
    }
  }, [user, sessions]);

  const deleteSession = (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    const updatedSessions = sessions.filter(session => session.id !== sessionId);
    saveSessions(updatedSessions);
  };

  const filteredSessions = sessions
    .filter(session => filter === 'all' || session.type === filter)
    .sort((a, b) => {
      if (sortBy === 'date') {
        return b.date.getTime() - a.date.getTime();
      }
      return 0;
    });

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      happy: 'from-yellow-400 to-orange-400',
      sad: 'from-blue-400 to-indigo-400',
      stressed: 'from-red-400 to-pink-400',
      excited: 'from-green-400 to-teal-400',
      hopeful: 'from-purple-400 to-pink-400',
      angry: 'from-red-500 to-orange-500',
      fearful: 'from-gray-400 to-blue-400',
      calm: 'from-blue-300 to-green-300',
      neutral: 'from-gray-400 to-slate-400',
    };
    return colors[emotion] || colors.neutral;
  };

  const getRelationshipColor = (relationship: string) => {
    const colors: Record<string, string> = {
      mother: 'from-pink-400 to-rose-400',
      father: 'from-blue-400 to-indigo-400',
      grandmother: 'from-purple-400 to-pink-400',
      grandfather: 'from-indigo-400 to-blue-400',
      sister: 'from-rose-400 to-pink-400',
      brother: 'from-blue-400 to-cyan-400',
      friend: 'from-green-400 to-teal-400',
      partner: 'from-red-400 to-pink-400',
      spouse: 'from-red-500 to-rose-500',
      child: 'from-yellow-400 to-orange-400',
      other: 'from-gray-400 to-slate-400'
    };
    return colors[relationship] || colors.other;
  };

  const playSessionAudio = (session: Session) => {
    if (session.audioBlob) {
      const audio = new Audio(URL.createObjectURL(session.audioBlob));
      audio.play().catch(error => {
        console.error('Audio playback failed:', error);
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <GlassCard className="p-6 text-center">
        <Archive className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Your Emotional Vault</h2>
        <p className="text-white/70">
          A sacred space to revisit your journey of healing and self-discovery
        </p>
      </GlassCard>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex space-x-2">
            {(['all', 'mirror', 'soulcast'] as const).map((filterType) => (
              <motion.button
                key={filterType}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(filterType)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2
                  ${filter === filterType 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                    : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20'
                  }
                `}
              >
                {filterType === 'mirror' && <Mirror className="w-4 h-4" />}
                {filterType === 'soulcast' && <Heart className="w-4 h-4" />}
                {filterType === 'all' && <Filter className="w-4 h-4" />}
                <span className="capitalize">{filterType}</span>
              </motion.button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-white/60" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'emotion')}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="date">Sort by Date</option>
              <option value="emotion">Sort by Emotion</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-white mb-2">No Sessions Yet</h3>
          <p className="text-white/70">
            Your emotional journey will be preserved here as you create sessions
          </p>
          <p className="text-white/50 text-sm mt-4">
            Use the "Save Session" button after conversations to store them here
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-6">
          {filteredSessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-6 hover:scale-[1.01] transition-transform duration-300 relative group">
                {/* Delete button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => deleteSession(session.id)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-600 hover:bg-red-700 rounded-full"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </motion.button>

                <div className="flex items-start space-x-4">
                  {/* Thumbnail/Icon */}
                  <div className="flex-shrink-0">
                    <div className={`
                      w-16 h-16 rounded-xl bg-gradient-to-r ${
                        session.type === 'mirror' 
                          ? session.emotion 
                            ? getEmotionColor(session.emotion)
                            : 'from-purple-400 to-blue-400'
                          : session.relationship
                            ? getRelationshipColor(session.relationship)
                            : 'from-rose-400 to-pink-400'
                      } flex items-center justify-center
                    `}>
                      {session.type === 'mirror' ? (
                        <Mirror className="w-8 h-8 text-white" />
                      ) : (
                        <Heart className="w-8 h-8 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-white">
                          {session.type === 'mirror' ? 'Self Mirror' : `SoulCast with ${session.soulName}`}
                        </h3>
                        {session.emotion && session.type === 'mirror' && (
                          <span className={`
                            px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r ${getEmotionColor(session.emotion)} text-white
                          `}>
                            {session.emotion}
                          </span>
                        )}
                        {session.relationship && session.type === 'soulcast' && (
                          <span className={`
                            px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r ${getRelationshipColor(session.relationship)} text-white capitalize
                          `}>
                            {session.relationship}
                          </span>
                        )}
                      </div>
                      <span className="text-white/60 text-sm">
                        {session.date.toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-white/5 rounded-lg p-3 border-l-4 border-blue-400">
                        <p className="text-white/70 text-sm mb-1">Your message:</p>
                        <p className="text-white/90 italic">"{session.input}"</p>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3 border-l-4 border-purple-400">
                        <p className="text-white/70 text-sm mb-1">Response:</p>
                        <p className="text-white/90 italic">"{session.response}"</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-2 text-white/60 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{session.date.toLocaleTimeString()}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {session.audioBlob && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => playSessionAudio(session)}
                            className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white/80 hover:text-white rounded-lg transition-all"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span className="text-sm">Play Audio</span>
                          </motion.button>
                        )}

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center space-x-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-all"
                        >
                          <Play className="w-4 h-4" />
                          <span className="text-sm">Replay</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{sessions.length}</div>
          <div className="text-white/70 text-sm">Total Sessions</div>
        </GlassCard>
        
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{sessions.filter(s => s.type === 'mirror').length}</div>
          <div className="text-white/70 text-sm">Mirror Sessions</div>
        </GlassCard>
        
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold text-rose-400">{sessions.filter(s => s.type === 'soulcast').length}</div>
          <div className="text-white/70 text-sm">SoulCast Sessions</div>
        </GlassCard>
        
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {sessions.length > 0 ? Math.ceil((Date.now() - Math.min(...sessions.map(s => s.date.getTime()))) / (1000 * 60 * 60 * 24)) : 0}
          </div>
          <div className="text-white/70 text-sm">Days Active</div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Vault;