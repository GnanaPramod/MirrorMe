import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Play, Pause, Square, RotateCcw } from 'lucide-react';
import { voiceRecording } from '../../lib/ai-services';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onTranscriptReady?: (transcript: string, error?: string) => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'completed' | 'processing';

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onTranscriptReady,
  isRecording,
  setIsRecording
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string>('');
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      setError('');
      setLiveTranscript('');
      
      // Start audio recording
      const mediaRecorder = await voiceRecording.startRecording();
      mediaRecorderRef.current = mediaRecorder;
      
      setIsRecording(true);
      setRecordingState('recording');
      setRecordingDuration(0);
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      mediaRecorder.start();
      
      // Start live speech recognition if available and callback provided
      if (onTranscriptReady) {
        try {
          const { recognition, transcript } = await voiceRecording.startLiveSpeechRecognition();
          speechRecognitionRef.current = recognition;
          
          // Update live transcript
          setLiveTranscript(transcript);
          
          // Set up continuous updates
          recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              
              if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
              } else {
                interimTranscript += transcript;
              }
            }
            
            const currentTranscript = (finalTranscript + interimTranscript).trim();
            setLiveTranscript(currentTranscript);
          };
          
        } catch (speechError) {
          console.warn('Live speech recognition failed:', speechError);
          // Continue with recording even if speech recognition fails
        }
      }
      
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
      setError(error instanceof Error ? error.message : 'Failed to start recording');
      setIsRecording(false);
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
        
        // Pause speech recognition
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
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
        
        // Resume speech recognition
        if (onTranscriptReady) {
          voiceRecording.startLiveSpeechRecognition().then(({ recognition }) => {
            speechRecognitionRef.current = recognition;
          }).catch(error => {
            console.warn('Failed to resume speech recognition:', error);
          });
        }
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
        
        // Stop speech recognition
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
          speechRecognitionRef.current = null;
        }
        
        const audioBlob = await voiceRecording.stopRecording(mediaRecorderRef.current);
        setAudioBlob(audioBlob);
        setIsRecording(false);
        setRecordingState('completed');
        onRecordingComplete(audioBlob);

        // Send live transcript if we have it
        if (onTranscriptReady && liveTranscript.trim()) {
          console.log('Sending live transcript:', liveTranscript);
          onTranscriptReady(liveTranscript.trim());
          setError('');
        } else if (onTranscriptReady && !liveTranscript.trim()) {
          // If no live transcript was captured, show a helpful message
          const errorMessage = 'No speech detected in the recording. Please try recording again with clearer speech.';
          setError(errorMessage);
          onTranscriptReady('', errorMessage);
        }

      } catch (error) {
        console.error('Failed to stop recording:', error);
        setError('Failed to stop recording');
        setIsRecording(false);
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
    
    // Stop speech recognition
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    
    // Clear duration counter
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    // Reset state
    setAudioBlob(null);
    setIsPlaying(false);
    setIsRecording(false);
    setRecordingState('idle');
    setError('');
    setRecordingDuration(0);
    setIsProcessingTranscript(false);
    setLiveTranscript('');
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Main Controls */}
      <div className="flex items-center space-x-4">
        {/* Record/Stop Button */}
        {recordingState === 'idle' || recordingState === 'completed' ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startRecording}
            disabled={isProcessingTranscript}
            className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
          >
            <Mic className="w-6 h-6 text-white" />
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopRecording}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-300 flex items-center justify-center animate-pulse"
          >
            <Square className="w-6 h-6 text-white" />
          </motion.button>
        )}

        {/* Pause/Resume Button (only show during recording) */}
        {(recordingState === 'recording' || recordingState === 'paused') && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
            className="p-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-all duration-300 flex items-center justify-center"
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

          {isProcessingTranscript && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2"
            >
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-spin" />
              <span className="text-white/80 text-sm">Converting to text...</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Live Transcript Display */}
      {liveTranscript && recordingState === 'recording' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg"
        >
          <p className="text-blue-200 text-sm">
            <strong>Live transcript:</strong> {liveTranscript}
          </p>
        </motion.div>
      )}

      {/* Playback Controls (only show when recording is completed) */}
      {audioBlob && recordingState === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isPlaying ? pausePlayback : playRecording}
            className="p-2 bg-green-500 hover:bg-green-600 rounded-full transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white" />
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetRecording}
            className="p-2 bg-gray-500 hover:bg-gray-600 rounded-full transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-white" />
          </motion.button>

          <div className="flex-1">
            <span className="text-white/80 text-sm">
              Recording ready ({formatDuration(recordingDuration)})
            </span>
            {isPlaying && (
              <div className="w-full bg-white/20 rounded-full h-1 mt-1">
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
          className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
        >
          <p className="text-red-200 text-sm flex items-start space-x-2">
            <MicOff className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        </motion.div>
      )}

      {/* Instructions */}
      {recordingState === 'idle' && (
        <div className="text-center">
          <p className="text-white/60 text-xs">
            Click the microphone to start recording. {onTranscriptReady && 'Your speech will be converted to text automatically.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;