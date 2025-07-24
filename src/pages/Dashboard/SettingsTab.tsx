import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Upload, Mic, Palette, Shield, Moon, Sun, Volume2, Camera, CheckCircle, AlertCircle, Video, Edit } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import GlassCard from '../../components/UI/GlassCard';
import VoiceCloneRecorder from '../../components/UI/VoiceCloneRecorder';
import FaceVideoRecorder from '../../components/UI/FaceVideoRecorder';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { voiceManager, replicaManager, DEFAULT_VOICE_ID, DEFAULT_REPLICA_ID } from '../../lib/ai-services';
import { userProfile } from '../../lib/supabase';

const SettingsTab: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { user, refreshUser } = useAuth();
  const [settings, setSettings] = useState({
    defaultEmotion: 'auto',
    enableVoice: true,
    enableVideo: true,
    mirrorEnabled: true,
    soulcastEnabled: true,
  });
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showFaceVideoRecorder, setShowFaceVideoRecorder] = useState(false);
  const [showReplicaIdInput, setShowReplicaIdInput] = useState(false);
  const [customReplicaId, setCustomReplicaId] = useState('');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  
  // Optimistic UI state for profile photo
  const [optimisticPhotoUrl, setOptimisticPhotoUrl] = useState<string | null>(null);
  
  const [voiceUpdateStatus, setVoiceUpdateStatus] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });
  const [photoUploadStatus, setPhotoUploadStatus] = useState<{
    status: 'idle' | 'uploading' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });
  const [faceVideoUploadStatus, setFaceVideoUploadStatus] = useState<{
    status: 'idle' | 'uploading' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });
  const [replicaIdUpdateStatus, setReplicaIdUpdateStatus] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  // Refresh user data when component mounts
  useEffect(() => {
    const refreshUserData = async () => {
      if (user && refreshUser) {
        console.log('Settings tab mounted, refreshing user data...');
        await refreshUser();
      }
    };

    refreshUserData();
  }, [user, refreshUser]);

  // Reset optimistic photo URL when user data changes
  useEffect(() => {
    setOptimisticPhotoUrl(null);
  }, [user?.user_metadata?.avatar_url]);

  const currentVoiceId = voiceManager.getUserVoiceId(user);
  const isUsingCustomVoice = currentVoiceId !== DEFAULT_VOICE_ID;
  const currentReplicaId = replicaManager.getUserReplicaId(user);
  const hasCustomReplica = replicaManager.hasCustomReplica(user);
  const isUsingDefaultReplica = currentReplicaId === DEFAULT_REPLICA_ID;

  // Get the display photo URL (optimistic or actual)
  const displayPhotoUrl = optimisticPhotoUrl || user?.user_metadata?.avatar_url;

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleVoiceCloned = async (voiceId: string) => {
    try {
      console.log('Voice cloned in settings:', voiceId);
      
      // Update user metadata with new voice ID
      if (user) {
        const { error } = await userProfile.updateProfile(user.id, {
          voice_id: voiceId
        });

        if (error) {
          console.error('Failed to update voice ID in profile:', error);
          setVoiceUpdateStatus({
            status: 'error',
            message: 'Voice created but failed to save to profile. Please refresh and try again.'
          });
          return;
        }

        console.log('Voice ID updated in profile, refreshing user data...');
        
        // Refresh user data to get updated metadata
        if (refreshUser) {
          await refreshUser();
        }
      }

      setVoiceUpdateStatus({
        status: 'success',
        message: 'Voice updated successfully! Your new voice will be used for all AI responses in Self Mirror and SoulCast.'
      });
      setShowVoiceRecorder(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setVoiceUpdateStatus({ status: 'idle', message: '' });
      }, 3000);

    } catch (error) {
      console.error('Error updating voice ID:', error);
      setVoiceUpdateStatus({
        status: 'error',
        message: 'Voice created but failed to save to profile. Please refresh and try again.'
      });
    }
  };

  const handleVoiceError = (error: string) => {
    setVoiceUpdateStatus({
      status: 'error',
      message: error
    });
  };

  const handleFaceVideoRecorded = async (videoBlob: Blob) => {
    if (!user) return;

    setFaceVideoUploadStatus({ status: 'uploading', message: 'Uploading face video and creating replica...' });

    try {
      // Convert blob to file
      const videoFile = new File([videoBlob], `face-video-${Date.now()}.webm`, {
        type: 'video/webm'
      });
      
      // Upload face video and create replica in one step
      const result = await userProfile.uploadFaceVideoAndCreateReplica(
        videoFile, 
        user.id, 
        user.user_metadata?.full_name || 'User'
      );
      
      if (result.error) {
        // Check if it's a Tavus API error and show user-friendly message
        if (result.error.includes('Tavus') || result.error.includes('replica creation') || result.error.includes('400')) {
          setFaceVideoUploadStatus({
            status: 'error',
            message: 'Tavus API is facing high traffic. Please try using audio responses for now.'
          });
        } else {
          throw new Error(result.error);
        }
        return;
      }

      setFaceVideoUploadStatus({
        status: 'success',
        message: `Face video uploaded and replica created successfully! You can now generate AI avatar videos.`
      });

      setShowFaceVideoRecorder(false);

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setFaceVideoUploadStatus({ status: 'idle', message: '' });
      }, 3000);

    } catch (error) {
      console.error('Face video upload and replica creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload face video and create replica';
      
      // Check if it's a Tavus API error and show user-friendly message
      if (errorMessage.includes('Tavus') || errorMessage.includes('replica creation') || errorMessage.includes('400')) {
        setFaceVideoUploadStatus({
          status: 'error',
          message: 'Tavus API is facing high traffic. Please try using audio responses for now.'
        });
      } else {
        setFaceVideoUploadStatus({
          status: 'error',
          message: errorMessage
        });
      }
    }
  };

  const handleCustomReplicaIdSave = async () => {
    if (!customReplicaId.trim() || !user) return;

    try {
      const { error } = await userProfile.updateProfile(user.id, {
        replica_id: customReplicaId.trim()
      });

      if (error) {
        console.error('Failed to update replica ID:', error);
        setReplicaIdUpdateStatus({
          status: 'error',
          message: 'Failed to save replica ID. Please try again.'
        });
        return;
      }

      setReplicaIdUpdateStatus({
        status: 'success',
        message: 'Custom replica ID saved successfully! This will be used for AI avatar generation.'
      });
      setShowReplicaIdInput(false);
      setCustomReplicaId('');

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      // Clear success message
      setTimeout(() => {
        setReplicaIdUpdateStatus({ status: 'idle', message: '' });
      }, 3000);

    } catch (error) {
      console.error('Error updating replica ID:', error);
      setReplicaIdUpdateStatus({
        status: 'error',
        message: 'Failed to save replica ID. Please try again.'
      });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Immediately show optimistic UI
    const optimisticUrl = URL.createObjectURL(file);
    setOptimisticPhotoUrl(optimisticUrl);
    setPhotoUploadStatus({ status: 'uploading', message: 'Uploading photo...' });

    try {
      console.log('Starting photo upload for user:', user.id);
      
      // Upload photo to Supabase storage
      const result = await userProfile.uploadProfilePhoto(file, user.id);
      
      if (result.error) {
        // Revert optimistic update on error
        setOptimisticPhotoUrl(null);
        URL.revokeObjectURL(optimisticUrl);
        throw new Error(result.error);
      }

      console.log('Photo upload successful, URL:', result.url);

      // Update optimistic URL with actual URL
      setOptimisticPhotoUrl(result.url);
      
      setPhotoUploadStatus({
        status: 'success',
        message: 'Profile photo updated successfully!'
      });

      // Refresh user data in background (don't wait for it)
      if (refreshUser) {
        refreshUser().then(() => {
          // Clear optimistic URL once real data is loaded
          setOptimisticPhotoUrl(null);
          URL.revokeObjectURL(optimisticUrl);
        });
      }

      // Clear success message after 2 seconds
      setTimeout(() => {
        setPhotoUploadStatus({ status: 'idle', message: '' });
      }, 2000);

    } catch (error) {
      console.error('Photo upload failed:', error);
      // Revert optimistic update
      setOptimisticPhotoUrl(null);
      URL.revokeObjectURL(optimisticUrl);
      
      setPhotoUploadStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload photo'
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <GlassCard className="p-6 text-center">
        <Settings className="w-12 h-12 text-primary-medium mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
        <p className="text-white/70">
          Customize your Mirror Me experience
        </p>
      </GlassCard>

      {/* Status Messages */}
      {(voiceUpdateStatus.status !== 'idle' || photoUploadStatus.status !== 'idle' || faceVideoUploadStatus.status !== 'idle' || replicaIdUpdateStatus.status !== 'idle') && (
        <div className="space-y-4">
          {voiceUpdateStatus.status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className={`p-4 ${
                voiceUpdateStatus.status === 'success' 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-start space-x-3">
                  {voiceUpdateStatus.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm ${
                      voiceUpdateStatus.status === 'success' ? 'text-green-200' : 'text-red-200'
                    }`}>
                      {voiceUpdateStatus.message}
                    </p>
                    <button
                      onClick={() => setVoiceUpdateStatus({ status: 'idle', message: '' })}
                      className={`text-xs mt-1 underline ${
                        voiceUpdateStatus.status === 'success' ? 'text-green-300 hover:text-green-200' : 'text-red-300 hover:text-red-200'
                      }`}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {photoUploadStatus.status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className={`p-4 ${
                photoUploadStatus.status === 'success' 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : photoUploadStatus.status === 'error'
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-primary-medium/10 border-primary-medium/20'
              }`}>
                <div className="flex items-start space-x-3">
                  {photoUploadStatus.status === 'uploading' ? (
                    <LoadingSpinner size="sm" />
                  ) : photoUploadStatus.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm ${
                      photoUploadStatus.status === 'success' ? 'text-green-200' : 
                      photoUploadStatus.status === 'error' ? 'text-red-200' : 'text-primary-light'
                    }`}>
                      {photoUploadStatus.message}
                    </p>
                    {photoUploadStatus.status !== 'uploading' && (
                      <button
                        onClick={() => setPhotoUploadStatus({ status: 'idle', message: '' })}
                        className={`text-xs mt-1 underline ${
                          photoUploadStatus.status === 'success' ? 'text-green-300 hover:text-green-200' : 'text-red-300 hover:text-red-200'
                        }`}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {faceVideoUploadStatus.status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className={`p-4 ${
                faceVideoUploadStatus.status === 'success' 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : faceVideoUploadStatus.status === 'error'
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-primary-medium/10 border-primary-medium/20'
              }`}>
                <div className="flex items-start space-x-3">
                  {faceVideoUploadStatus.status === 'uploading' ? (
                    <LoadingSpinner size="sm" />
                  ) : faceVideoUploadStatus.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm ${
                      faceVideoUploadStatus.status === 'success' ? 'text-green-200' : 
                      faceVideoUploadStatus.status === 'error' ? 'text-red-200' : 'text-primary-light'
                    }`}>
                      {faceVideoUploadStatus.message}
                    </p>
                    {faceVideoUploadStatus.status !== 'uploading' && (
                      <button
                        onClick={() => setFaceVideoUploadStatus({ status: 'idle', message: '' })}
                        className={`text-xs mt-1 underline ${
                          faceVideoUploadStatus.status === 'success' ? 'text-green-300 hover:text-green-200' : 'text-red-300 hover:text-red-200'
                        }`}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {replicaIdUpdateStatus.status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className={`p-4 ${
                replicaIdUpdateStatus.status === 'success' 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-start space-x-3">
                  {replicaIdUpdateStatus.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm ${
                      replicaIdUpdateStatus.status === 'success' ? 'text-green-200' : 'text-red-200'
                    }`}>
                      {replicaIdUpdateStatus.message}
                    </p>
                    <button
                      onClick={() => setReplicaIdUpdateStatus({ status: 'idle', message: '' })}
                      className={`text-xs mt-1 underline ${
                        replicaIdUpdateStatus.status === 'success' ? 'text-green-300 hover:text-green-200' : 'text-red-300 hover:text-red-200'
                      }`}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      )}

      {/* Profile Settings */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <Upload className="w-5 h-5 text-accent" />
          <span>Profile Settings</span>
        </h3>

        <div className="space-y-6">
          {/* Profile Info Display */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="text-lg font-semibold text-white mb-3">Profile Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-white/60 text-sm">Name:</p>
                <p className="text-white font-medium">{user?.user_metadata?.full_name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Email:</p>
                <p className="text-white font-medium">{user?.email || 'Not set'}</p>
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="w-16 h-16 bg-gradient-to-r from-accent to-primary-medium rounded-full flex items-center justify-center overflow-hidden relative">
              {displayPhotoUrl ? (
                <motion.img
                  key={displayPhotoUrl} // Force re-render when URL changes
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  src={displayPhotoUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={() => {
                    // If optimistic URL fails, revert to original
                    if (optimisticPhotoUrl) {
                      setOptimisticPhotoUrl(null);
                    }
                  }}
                />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
              
              {/* Upload indicator overlay */}
              {photoUploadStatus.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-white">Profile Photo</h4>
              <p className="text-white/70 text-sm">
                {displayPhotoUrl 
                  ? 'Update your profile photo'
                  : 'Upload a profile photo'
                }
              </p>
              <p className="text-white/50 text-xs mt-1">
                Optional - for display purposes only
              </p>
            </div>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={photoUploadStatus.status === 'uploading'}
                className="hidden"
                id="photo-upload-settings"
              />
              <label htmlFor="photo-upload-settings">
                <motion.div
                  whileHover={{ scale: photoUploadStatus.status === 'uploading' ? 1 : 1.05 }}
                  whileTap={{ scale: photoUploadStatus.status === 'uploading' ? 1 : 0.95 }}
                  className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center space-x-2 ${
                    photoUploadStatus.status === 'uploading'
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-accent hover:bg-accent/80'
                  } text-white`}
                >
                  {photoUploadStatus.status === 'uploading' ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>{displayPhotoUrl ? 'Update Photo' : 'Upload Photo'}</span>
                    </>
                  )}
                </motion.div>
              </label>
            </div>
          </div>

          {/* AI Replica Setup - Two Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="w-16 h-16 bg-gradient-to-r from-primary-medium to-accent rounded-full flex items-center justify-center">
                {hasCustomReplica ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : isUsingDefaultReplica ? (
                  <Video className="w-8 h-8 text-yellow-400" />
                ) : (
                  <Video className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white">AI Replica</h4>
                <p className="text-white/70 text-sm">
                  {hasCustomReplica 
                    ? 'Personal replica created - AI avatars enabled' 
                    : isUsingDefaultReplica
                    ? 'Using default replica - create your own for personalized avatars'
                    : 'Custom replica ID set - AI avatars enabled'
                  }
                </p>
                <p className="text-white/50 text-xs">
                  Status: {hasCustomReplica ? 'Personal' : isUsingDefaultReplica ? 'Default' : 'Custom'}
                </p>
              </div>
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFaceVideoRecorder(!showFaceVideoRecorder)}
                  disabled={faceVideoUploadStatus.status === 'uploading'}
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 text-sm ${
                    faceVideoUploadStatus.status === 'uploading'
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-primary-medium hover:bg-primary-medium/80'
                  } text-white`}
                >
                  {faceVideoUploadStatus.status === 'uploading' ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      <span>Record Video</span>
                    </>
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowReplicaIdInput(!showReplicaIdInput)}
                  className="px-3 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
                >
                  <Edit className="w-4 h-4" />
                  <span>Enter ID</span>
                </motion.button>
              </div>
            </div>

            {/* Custom Replica ID Input */}
            {showReplicaIdInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <GlassCard className="p-4 bg-gradient-to-r from-accent/10 to-primary-medium/10">
                  <h4 className="text-lg font-bold text-white mb-4">Enter Custom Replica ID</h4>
                  <p className="text-white/70 text-sm mb-4">
                    If you already have a Tavus replica ID, enter it here to use for AI avatar generation.
                  </p>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={customReplicaId}
                      onChange={(e) => setCustomReplicaId(e.target.value)}
                      placeholder="Enter your Tavus replica ID (e.g., rca8a38779a8)"
                      className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-white placeholder-white/50"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCustomReplicaIdSave}
                      disabled={!customReplicaId.trim()}
                      className="px-4 py-3 bg-accent hover:bg-accent/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      Save
                    </motion.button>
                  </div>
                  <div className="mt-3 text-center">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowReplicaIdInput(false);
                        setCustomReplicaId('');
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Face Video Recorder */}
            {showFaceVideoRecorder && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <GlassCard className="p-6 bg-gradient-to-r from-primary-medium/10 to-accent/10">
                  <h4 className="text-lg font-bold text-white mb-4 text-center">
                    {hasCustomReplica ? 'Update Your AI Replica' : 'Create Your AI Replica'}
                  </h4>
                  <p className="text-white/70 text-sm text-center mb-6">
                    Record a short video of yourself talking to create your personal AI replica for avatar generation
                  </p>
                  <FaceVideoRecorder
                    onVideoRecorded={handleFaceVideoRecorded}
                    isRecording={isRecordingVideo}
                    setIsRecording={setIsRecordingVideo}
                  />
                  <div className="mt-4 text-center">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowFaceVideoRecorder(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </div>

          {/* Voice Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="w-16 h-16 bg-gradient-to-r from-accent to-primary-light rounded-full flex items-center justify-center">
                {isUsingCustomVoice ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white">Voice Clone</h4>
                <p className="text-white/70 text-sm">
                  {isUsingCustomVoice 
                    ? 'Using custom voice clone - will be used in Self Mirror' 
                    : 'Using default voice - create custom voice for Self Mirror'
                  }
                </p>
                <p className="text-white/50 text-xs">
                  Status: {isUsingCustomVoice ? 'Custom Voice' : 'Default Voice'}
                </p>
                {isUsingCustomVoice && (
                  <p className="text-green-400 text-xs mt-1">
                    ✓ This voice will be used in all Self Mirror responses
                  </p>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                className="px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors"
              >
                {isUsingCustomVoice ? 'Update Voice' : 'Create Voice'}
              </motion.button>
            </div>

            {/* Voice Recorder */}
            {showVoiceRecorder && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <GlassCard className="p-6 bg-gradient-to-r from-accent/10 to-primary-light/10">
                  <h4 className="text-lg font-bold text-white mb-4 text-center">
                    {isUsingCustomVoice ? 'Update Your Voice' : 'Create Your Voice Clone'}
                  </h4>
                  <p className="text-white/70 text-sm text-center mb-6">
                    This voice will be automatically used in Self Mirror for all AI responses
                  </p>
                  <VoiceCloneRecorder
                    userName={user?.user_metadata?.full_name || 'User'}
                    onVoiceCloned={handleVoiceCloned}
                    onError={handleVoiceError}
                  />
                  <div className="mt-4 text-center">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowVoiceRecorder(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* AI Preferences */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <Palette className="w-5 h-5 text-primary-medium" />
          <span>AI Preferences</span>
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-3">
              Default Emotion Tone
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['Auto', 'Supportive', 'Motivational', 'Calm'].map((tone) => (
                <motion.button
                  key={tone}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSettingChange('defaultEmotion', tone.toLowerCase())}
                  className={`
                    p-3 rounded-lg text-sm font-medium transition-all
                    ${settings.defaultEmotion === tone.toLowerCase()
                      ? 'bg-gradient-to-r from-accent to-primary-medium text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }
                  `}
                >
                  {tone}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <Volume2 className="w-5 h-5 text-green-400" />
                <div>
                  <h4 className="text-white font-medium">Voice Generation</h4>
                  <p className="text-white/60 text-sm">Enable AI voice responses</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSettingChange('enableVoice', !settings.enableVoice)}
                className={`
                  relative w-12 h-6 rounded-full transition-colors duration-300
                  ${settings.enableVoice ? 'bg-green-500' : 'bg-gray-600'}
                `}
              >
                <motion.div
                  animate={{ x: settings.enableVoice ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                />
              </motion.button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <Video className="w-5 h-5 text-primary-medium" />
                <div>
                  <h4 className="text-white font-medium">Video Generation</h4>
                  <p className="text-white/60 text-sm">Enable AI video responses (requires replica)</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSettingChange('enableVideo', !settings.enableVideo)}
                className={`
                  relative w-12 h-6 rounded-full transition-colors duration-300
                  ${settings.enableVideo ? 'bg-primary-medium' : 'bg-gray-600'}
                `}
              >
                <motion.div
                  animate={{ x: settings.enableVideo ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                />
              </motion.button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Theme Settings */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          {isDark ? <Moon className="w-5 h-5 text-nightBlue" /> : <Sun className="w-5 h-5 text-dayYellow" />}
          <span>Appearance</span>
        </h3>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div className="flex items-center space-x-3">
            {isDark ? <Moon className="w-5 h-5 text-nightBlue" /> : <Sun className="w-5 h-5 text-dayYellow" />}
            <div>
              <h4 className="text-white font-medium">Dark Mode</h4>
              <p className="text-white/60 text-sm">Toggle between light and dark themes</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className={`
              relative w-12 h-6 rounded-full transition-colors duration-300
              ${isDark ? 'bg-nightBlue' : 'bg-dayYellow'}
            `}
          >
            <motion.div
              animate={{ x: isDark ? 24 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center"
            >
              {isDark ? <Moon className="w-3 h-3 text-nightBlue" /> : <Sun className="w-3 h-3 text-dayYellow" />}
            </motion.div>
          </motion.button>
        </div>
      </GlassCard>

      {/* Privacy & Terms */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <Shield className="w-5 h-5 text-red-400" />
          <span>Privacy & Terms</span>
        </h3>

        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors border border-white/10"
          >
            <h4 className="text-white font-medium mb-1">Terms of Use</h4>
            <p className="text-white/60 text-sm">Review our terms and conditions</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors border border-white/10"
          >
            <h4 className="text-white font-medium mb-1">Privacy Policy</h4>
            <p className="text-white/60 text-sm">Understand how we protect your data</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-left transition-colors border border-red-500/20"
          >
            <h4 className="text-red-400 font-medium mb-1">Delete Account</h4>
            <p className="text-red-400/70 text-sm">Permanently remove your account and data</p>
          </motion.button>
        </div>
      </GlassCard>
    </div>
  );
};

export default SettingsTab;