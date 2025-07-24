import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Square, Play, Pause, RotateCcw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { faceVideoRecording } from '../../lib/ai-services';
import LoadingSpinner from './LoadingSpinner';

interface FaceVideoRecorderProps {
  onVideoRecorded: (videoBlob: Blob) => void;
  onError?: (error: string) => void;
  className?: string;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'completed' | 'processing';

const FaceVideoRecorder: React.FC<FaceVideoRecorderProps> = ({
  onVideoRecorded,
  onError,
  className = '',
  isRecording,
  setIsRecording
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize camera preview
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        const { stream } = await faceVideoRecording.startRecording();
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Failed to initialize camera:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
        setError(errorMessage);
        if (onError) onError(errorMessage);
      }
    };

    initializeCamera();

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [onError]);

  const startRecording = async () => {
    try {
      setError('');
      
      if (!streamRef.current) {
        const { stream } = await faceVideoRecording.startRecording();
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingState('recording');
      setRecordingDuration(0);
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      mediaRecorder.start();
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Video data available:', event.data.size);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
        stopRecording();
      };
      
    } catch (error) {
      console.error('Failed to start video recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      setIsRecording(false);
      setRecordingState('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      try {
        mediaRecorderRef.current.pause();
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
        mediaRecorderRef.current.resume();
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
    if (mediaRecorderRef.current && streamRef.current) {
      try {
        // Clear duration counter
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        
        setRecordingState('processing');
        
        const videoBlob = await faceVideoRecording.stopRecording(mediaRecorderRef.current, streamRef.current);
        setVideoBlob(videoBlob);
        setIsRecording(false);
        setRecordingState('completed');
        
        // Create preview URL
        const url = URL.createObjectURL(videoBlob);
        setPreviewUrl(url);
        
        // Validate video quality
        const validation = await faceVideoRecording.validateVideoForAvatar(videoBlob);
        if (!validation.isValid) {
          setError(`Video quality issues: ${validation.issues.join(', ')}. ${validation.recommendations.join(' ')}`);
        }

        onVideoRecorded(videoBlob);

      } catch (error) {
        console.error('Failed to stop recording:', error);
        setError('Failed to stop recording');
        setIsRecording(false);
        setRecordingState('idle');
      }
    }
  };

  const playRecording = () => {
    if (playbackVideoRef.current && previewUrl) {
      playbackVideoRef.current.play();
      setIsPlaying(true);
    }
  };

  const pausePlayback = () => {
    if (playbackVideoRef.current) {
      playbackVideoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resetRecording = () => {
    // Stop any ongoing recording
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      stopRecording();
    }
    
    // Stop any playback
    if (playbackVideoRef.current) {
      playbackVideoRef.current.pause();
      playbackVideoRef.current = null;
    }
    
    // Clear duration counter
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    
    // Reset state
    setVideoBlob(null);
    setIsPlaying(false);
    setIsRecording(false);
    setRecordingState('idle');
    setError('');
    setRecordingDuration(0);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMinimumDuration = () => 10; // 10 seconds minimum
  const getRecommendedDuration = () => 30; // 30 seconds recommended

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="text-blue-200 font-medium mb-2 flex items-center space-x-2">
          <Camera className="w-4 h-4" />
          <span>Face Video Recording Instructions</span>
        </h4>
        <ul className="text-blue-200/80 text-sm space-y-1">
          <li>• Record {getMinimumDuration()}-{getRecommendedDuration()} seconds of yourself talking</li>
          <li>• Look directly at the camera and speak naturally</li>
          <li>• Ensure good lighting on your face</li>
          <li>• Avoid background movement and distractions</li>
          <li>• This video will be used to create your AI avatar</li>
        </ul>
      </div>

      {/* Video Preview/Playback */}
      <div className="relative">
        <motion.div
          animate={{
            boxShadow: recordingState === 'recording' 
              ? ['0 0 20px rgba(239, 68, 68, 0.3)', '0 0 40px rgba(239, 68, 68, 0.6)', '0 0 20px rgba(239, 68, 68, 0.3)']
              : ['0 0 20px rgba(59, 130, 246, 0.3)', '0 0 30px rgba(59, 130, 246, 0.4)', '0 0 20px rgba(59, 130, 246, 0.3)']
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative rounded-2xl overflow-hidden mx-auto max-w-lg bg-black"
        >
          {recordingState === 'completed' && previewUrl ? (
            <video
              ref={playbackVideoRef}
              src={previewUrl}
              className="w-full aspect-video rounded-2xl"
              onEnded={() => setIsPlaying(false)}
              onError={() => setError('Failed to play video')}
              controls={false}
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video rounded-2xl mirror-video"
              style={{ transform: 'scaleX(-1)' }} // Mirror effect for preview
            />
          )}
          
          {/* Recording indicator */}
          {recordingState === 'recording' && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute top-4 left-4 flex items-center space-x-2 bg-red-500/80 backdrop-blur-sm rounded-full px-3 py-1"
            >
              <div className="w-3 h-3 bg-white rounded-full" />
              <span className="text-white text-sm font-medium">REC</span>
            </motion.div>
          )}

          {/* Duration display */}
          {(recordingState === 'recording' || recordingState === 'paused') && (
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
              <span className="text-white text-sm font-mono">
                {formatDuration(recordingDuration)}
              </span>
            </div>
          )}

          {/* Processing overlay */}
          {recordingState === 'processing' && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="text-white mt-2">Processing video...</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Main Controls */}
        <div className="flex items-center justify-center space-x-4">
          {/* Record/Stop Button */}
          {recordingState === 'idle' || recordingState === 'completed' ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              disabled={recordingState === 'processing'}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
            >
              <Camera className="w-6 h-6 text-white" />
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
        {videoBlob && recordingState === 'completed' && (
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
              <span className="text-white/80 text-sm">
                Video ready ({formatDuration(recordingDuration)})
              </span>
              {isPlaying && (
                <div className="w-full bg-white/20 rounded-full h-1 mt-2">
                  <div className="bg-green-500 h-1 rounded-full animate-pulse" style={{ width: '50%' }} />
                </div>
              )}
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
              <span>Tips for Best Avatar Results</span>
            </h5>
            <ul className="text-purple-200/80 text-sm space-y-1">
              <li>• Position your face in the center of the frame</li>
              <li>• Ensure even lighting on your face</li>
              <li>• Speak naturally and make varied facial expressions</li>
              <li>• Keep your head relatively still but natural</li>
              <li>• Record {getRecommendedDuration()}+ seconds for best quality</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceVideoRecorder;