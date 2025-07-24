import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Play, Pause, Square, RotateCcw, Upload, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { voiceRecording, voiceManager } from '../../lib/ai-services';
import { userProfile } from '../../lib/supabase';
import LoadingSpinner from './LoadingSpinner';

interface VoiceCloneRecorderProps {
  onVoiceCloned: (voiceId: string) => void;
  onError?: (error: string) => void;
  userName: string;
  className?: string;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'completed' | 'processing' | 'cloning';

const VoiceCloneRecorder: React.FC<VoiceCloneRecorderProps> = ({
  onVoiceCloned,
  onError,
  userName,
  className = ''
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cloneProgress, setCloneProgress] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      setError('');
      const mediaRecorder = await voiceRecording.startRecording();
      mediaRecorderRef.current = mediaRecorder;
      
      setRecordingState('recording');
      setRecordingDuration(0);
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      mediaRecorder.start();
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
        stopRecording();
      };
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      setRecordingState('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      try {
        voiceRecording.pauseRecording(mediaRecorderRef.current);
        setRecordingState('paused');
        
        // Pause duration counter
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }
      } catch (error) {
        console.error('Failed to pause recording:', error);
        setError('Failed to pause recording');
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      try {
        voiceRecording.resumeRecording(mediaRecorderRef.current);
        setRecordingState('recording');
        
        // Resume duration counter
        durationIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      } catch (error) {
        console.error('Failed to resume recording:', error);
        setError('Failed to resume recording');
      }
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current) {
      try {
        // Clear duration counter
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        
        const audioBlob = await voiceRecording.stopRecording(mediaRecorderRef.current);
        setAudioBlob(audioBlob);
        setRecordingState('completed');

        // Validate audio quality
        const validation = await voiceRecording.validateAudioForCloning(audioBlob);
        if (!validation.isValid) {
          setError(`Audio quality issues: ${validation.issues.join(', ')}. ${validation.recommendations.join(' ')}`);
        }

      } catch (error) {
        console.error('Failed to stop recording:', error);
        setError('Failed to stop recording');
        setRecordingState('idle');
      }
    }
  };

  const playRecording = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioRef.current = audio;
      
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setError('Failed to play recording');
        setIsPlaying(false);
      };
      
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(error => {
        console.error('Audio playback failed:', error);
        setError('Failed to play recording');
      });
    }
  };

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resetRecording = () => {
    // Stop any ongoing recording
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      stopRecording();
    }
    
    // Stop any playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    // Clear duration counter
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    // Reset state
    setAudioBlob(null);
    setIsPlaying(false);
    setRecordingState('idle');
    setError('');
    setRecordingDuration(0);
    setCloneProgress('');
  };

  const parseErrorMessage = (error: any): string => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for voice limit reached error
    if (errorMessage.includes('voice_limit_reached') || errorMessage.includes('maximum amount of custom voices')) {
      return 'You have reached your ElevenLabs voice limit (30/30). Please delete an existing voice from your ElevenLabs account or upgrade your subscription to create new voice clones.';
    }
    
    // Check for other specific ElevenLabs errors
    if (errorMessage.includes('insufficient_credits')) {
      return 'Insufficient ElevenLabs credits. Please add credits to your account or upgrade your subscription.';
    }
    
    if (errorMessage.includes('invalid_api_key')) {
      return 'ElevenLabs API key is invalid. Please check your API configuration.';
    }
    
    if (errorMessage.includes('rate_limit')) {
      return 'ElevenLabs rate limit exceeded. Please wait a moment and try again.';
    }
    
    // Return original error message if no specific pattern is found
    return errorMessage;
  };

  const createVoiceClone = async () => {
    if (!audioBlob) return;

    setRecordingState('cloning');
    setCloneProgress('Preparing audio for voice cloning...');
    setError('');

    try {
      // Validate audio first
      const validation = await voiceRecording.validateAudioForCloning(audioBlob);
      if (!validation.isValid) {
        throw new Error(`Audio quality issues: ${validation.issues.join(', ')}`);
      }

      setCloneProgress('Uploading to ElevenLabs...');
      
      const result = await voiceManager.setupUserVoice(audioBlob, userName);
      
      if (result.success && result.voiceId) {
        setCloneProgress('Voice clone created successfully! Saving to profile...');
        
        // The voice ID will be saved to user profile by the parent component
        // through the onVoiceCloned callback
        onVoiceCloned(result.voiceId);
        
        // Reset after success
        setTimeout(() => {
          resetRecording();
        }, 2000);
      } else {
        throw new Error(result.error || 'Voice cloning failed');
      }

    } catch (error) {
      console.error('Voice cloning failed:', error);
      const errorMessage = parseErrorMessage(error);
      setError(errorMessage);
      if (onError) onError(errorMessage);
      setRecordingState('completed');
      setCloneProgress('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      setRecordingState('processing');
      
      // Convert file to blob
      const audioBlob = await voiceRecording.convertAudioToBlob ? 
        await voiceRecording.convertAudioToBlob(file) : 
        new Blob([await file.arrayBuffer()], { type: file.type });
      
      setAudioBlob(audioBlob);
      setRecordingState('completed');
      setRecordingDuration(0); // We don't know the duration from file
      
      // Validate audio quality
      const validation = await voiceRecording.validateAudioForCloning(audioBlob);
      if (!validation.isValid) {
        setError(`Audio quality issues: ${validation.issues.join(', ')}. ${validation.recommendations.join(' ')}`);
      }

    } catch (error) {
      console.error('File upload failed:', error);
      setError('Failed to process audio file');
      setRecordingState('idle');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMinimumDuration = () => 30; // 30 seconds minimum
  const getRecommendedDuration = () => 60; // 60 seconds recommended

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="text-blue-200 font-medium mb-2 flex items-center space-x-2">
          <Mic className="w-4 h-4" />
          <span>Voice Cloning Instructions</span>
        </h4>
        <ul className="text-blue-200/80 text-sm space-y-1">
          <li>• Record at least {getMinimumDuration()} seconds of clear speech</li>
          <li>• Speak naturally in a quiet environment</li>
          <li>• Read a paragraph or speak about yourself</li>
          <li>• Avoid background noise and interruptions</li>
          <li>• This voice will be used in Self Mirror responses</li>
        </ul>
      </div>

      {/* Recording Controls */}
      <div className="space-y-4">
        {/* Main Controls */}
        <div className="flex items-center space-x-4">
          {/* Record/Stop Button */}
          {recordingState === 'idle' || recordingState === 'completed' ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              disabled={recordingState === 'processing' || recordingState === 'cloning'}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
            >
              <Mic className="w-6 h-6 text-white" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stopRecording}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all duration-300 flex items-center justify-center animate-pulse"
            >
              <Square className="w-6 h-6 text-white" />
            </motion.button>
          )}

          {/* Pause/Resume Button */}
          {(recordingState === 'recording' || recordingState === 'paused') && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
              className="p-4 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-all duration-300 flex items-center justify-center"
            >
              {recordingState === 'recording' ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </motion.button>
          )}

          {/* File Upload */}
          {recordingState === 'idle' && (
            <div>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                id="voice-file-upload"
              />
              <label htmlFor="voice-file-upload">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-4 rounded-full bg-purple-500 hover:bg-purple-600 transition-all duration-300 flex items-center justify-center cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-white" />
                </motion.div>
              </label>
            </div>
          )}

          {/* Recording Status */}
          <div className="flex items-center space-x-2">
            {recordingState === 'recording' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2"
              >
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white/80 text-sm font-medium">
                  Recording {formatDuration(recordingDuration)}
                </span>
                {recordingDuration >= getMinimumDuration() && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
              </motion.div>
            )}

            {recordingState === 'paused' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2"
              >
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-white/80 text-sm font-medium">
                  Paused {formatDuration(recordingDuration)}
                </span>
              </motion.div>
            )}

            {recordingState === 'processing' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2"
              >
                <LoadingSpinner size="sm" />
                <span className="text-white/80 text-sm">Processing...</span>
              </motion.div>
            )}

            {recordingState === 'cloning' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2"
              >
                <LoadingSpinner size="sm" type="orb" />
                <span className="text-white/80 text-sm">Creating voice clone...</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Duration Progress */}
        {(recordingState === 'recording' || recordingState === 'paused') && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/60">
              <span>Minimum: {getMinimumDuration()}s</span>
              <span>Recommended: {getRecommendedDuration()}s</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ 
                  width: `${Math.min((recordingDuration / getRecommendedDuration()) * 100, 100)}%` 
                }}
                className={`h-2 rounded-full transition-colors ${
                  recordingDuration < getMinimumDuration() 
                    ? 'bg-red-500' 
                    : recordingDuration < getRecommendedDuration()
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
              />
            </div>
          </div>
        )}

        {/* Playback Controls */}
        {audioBlob && recordingState === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3 p-4 bg-white/5 rounded-lg border border-white/10"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isPlaying ? pausePlayback : playRecording}
              className="p-3 bg-green-500 hover:bg-green-600 rounded-full transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetRecording}
              className="p-3 bg-gray-500 hover:bg-gray-600 rounded-full transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </motion.button>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-white/80 text-sm">
                  Recording ready {recordingDuration > 0 && `(${formatDuration(recordingDuration)})`}
                </span>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={createVoiceClone}
                  disabled={recordingDuration < getMinimumDuration() && recordingDuration > 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Create Voice Clone
                </motion.button>
              </div>
              {isPlaying && (
                <div className="w-full bg-white/20 rounded-full h-1 mt-2">
                  <div className="bg-green-500 h-1 rounded-full animate-pulse" style={{ width: '50%' }} />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Clone Progress */}
        {cloneProgress && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="sm" type="orb" />
              <span className="text-blue-200 text-sm">{cloneProgress}</span>
            </div>
          </motion.div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-200 text-sm">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="text-red-300 hover:text-red-200 text-xs mt-1 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quality Tips */}
        {recordingState === 'idle' && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
            <h5 className="text-purple-200 font-medium mb-2 flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Tips for Best Results</span>
            </h5>
            <ul className="text-purple-200/80 text-sm space-y-1">
              <li>• Find a quiet room without echo</li>
              <li>• Speak at your normal pace and volume</li>
              <li>• Include varied sentences and emotions</li>
              <li>• Avoid coughing, pauses, or background noise</li>
              <li>• Record {getRecommendedDuration()}+ seconds for best quality</li>
              <li>• Your voice will automatically be used in Self Mirror</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCloneRecorder;