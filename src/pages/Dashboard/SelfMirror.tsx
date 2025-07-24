import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Mic, Play, Save, Volume2, Video, AlertCircle, Settings, Pause, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlassCard from '../../components/UI/GlassCard';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import VoiceRecorder from '../../components/UI/VoiceRecorder';
import { aiPipeline, tavusAPI, voiceManager, replicaManager, DEFAULT_VOICE_ID, DEFAULT_REPLICA_ID } from '../../lib/ai-services';
import { useAuth } from '../../hooks/useAuth';

const SelfMirror: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [audioInput, setAudioInput] = useState<Blob | null>(null);
  const [liveTranscript, setLiveTranscript] = useState(''); // Store live transcript
  const [inputSource, setInputSource] = useState<'text' | 'audio'>('text'); // Track input source
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [result, setResult] = useState<{
    originalInput: string;
    detectedTone?: string;
    aiReply: string;
    videoUrl?: string;
    videoId?: string;
    audioBlob?: Blob;
    noReplica?: boolean;
    videoGenerationError?: string;
  } | null>(null);

  // Force refresh user data when component mounts
  useEffect(() => {
    const refreshUserData = async () => {
      if (user && refreshUser) {
        console.log('SelfMirror mounted, refreshing user data...');
        await refreshUser();
      }
    };

    refreshUserData();
  }, [user, refreshUser]);

  // Get user data with fallbacks - force re-evaluation when user changes
  const userVoiceId = voiceManager.getUserVoiceId(user);
  const userReplicaId = replicaManager.getUserReplicaId(user);
  const hasCustomReplica = replicaManager.hasCustomReplica(user);
  const isUsingDefaultReplica = userReplicaId === DEFAULT_REPLICA_ID;

  const handleReflect = async () => {
    // Determine the actual input to process
    let actualInput = '';
    
    if (inputSource === 'audio' && liveTranscript.trim()) {
      // Use live transcript from audio input
      actualInput = liveTranscript.trim();
      console.log('Using live transcript as input:', actualInput);
    } else if (inputSource === 'text' && input.trim()) {
      // Use typed text input
      actualInput = input.trim();
      console.log('Using text input:', actualInput);
    } else {
      // No valid input
      console.log('No valid input found');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      // ALWAYS use replica (either custom or default)
      setProcessingStep('Analyzing your emotions and creating personalized response...');
      
      const pipelineResult = await aiPipeline.processSelfMirrorWithReplica(
        actualInput, // Use the determined input (transcript or text)
        userReplicaId, // Use either custom or default replica
        userVoiceId, // Use user's custom voice for audio output
        audioInput || undefined
      );

      // Set initial result with audio (always available)
      setResult({
        originalInput: actualInput,
        detectedTone: pipelineResult.detectedTone,
        aiReply: pipelineResult.aiReply,
        audioBlob: pipelineResult.audioBlob, // Audio is ALWAYS available
        videoId: pipelineResult.videoId,
        videoGenerationError: pipelineResult.videoGenerationError
      });

      // If video generation started, wait for completion
      if (pipelineResult.videoId && !pipelineResult.videoGenerationError) {
        setProcessingStep('Creating your AI avatar video...');
        
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes max
        
        while (attempts < maxAttempts) {
          try {
            const status = await tavusAPI.getVideoStatus(pipelineResult.videoId);
            
            if (status.status === 'completed') {
              // Update result with video URL
              setResult(prev => prev ? {
                ...prev,
                videoUrl: status.download_url || status.video_url
              } : null);
              break;
            } else if (status.status === 'failed') {
              // Update result with error
              setResult(prev => prev ? {
                ...prev,
                videoGenerationError: 'Video generation failed'
              } : null);
              break;
            }
            
            // Wait 10 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 10000));
            attempts++;
          } catch (error) {
            console.error('Video status check failed:', error);
            setResult(prev => prev ? {
              ...prev,
              videoGenerationError: 'Failed to check video status'
            } : null);
            break;
          }
        }

        if (attempts >= maxAttempts) {
          setResult(prev => prev ? {
            ...prev,
            videoGenerationError: 'Video generation timed out'
          } : null);
        }
      }

    } catch (error) {
      console.error('Error processing mirror request:', error);
      // Even on error, try to provide basic response with audio
      try {
        const tone = await aiPipeline.detectTone(actualInput);
        const reply = await aiPipeline.generateMirrorReply(actualInput, tone);
        
        setResult({
          originalInput: actualInput,
          detectedTone: tone,
          aiReply: reply,
          videoGenerationError: 'Processing failed, but here\'s your response'
        });
      } catch (fallbackError) {
        console.error('Fallback processing failed:', fallbackError);
        setResult({
          originalInput: actualInput,
          detectedTone: 'neutral',
          aiReply: 'I hear you, and I\'m here with you. Sometimes technology has hiccups, but your feelings are always valid.',
          videoGenerationError: 'Unable to process request fully'
        });
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleRecordingComplete = (audioBlob: Blob) => {
    setAudioInput(audioBlob);
    setInputSource('audio'); // Mark that input came from audio
    console.log('Audio recording completed, switching to audio input mode');
  };

  const handleTranscriptReady = (transcript: string, error?: string) => {
    if (error && (error.includes('No speech detected') || error.includes('Could not understand'))) {
      // Clear the audio input if transcription failed due to no speech
      setAudioInput(null);
      setInputSource('text');
      setLiveTranscript('');
      console.log('Transcription failed, switching back to text input mode');
      return;
    }
    
    // Only set the transcript if there was no error
    if (transcript && !error) {
      setLiveTranscript(transcript);
      setInput(transcript); // Also update the text input for display
      setInputSource('audio'); // Confirm we're using audio input
      console.log('Live transcript ready:', transcript);
    }
  };

  // Handle text input changes
  const handleTextInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (e.target.value.trim()) {
      setInputSource('text'); // Switch to text input mode
      setLiveTranscript(''); // Clear live transcript
      setAudioInput(null); // Clear audio input
      console.log('Switched to text input mode');
    }
  };

  const playAudio = () => {
    if (result?.audioBlob) {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(URL.createObjectURL(result.audioBlob));
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        setIsPlayingAudio(false);
        audioRef.current = null;
      };
      
      audio.play().then(() => {
        setIsPlayingAudio(true);
      }).catch(error => {
        console.error('Audio playback failed:', error);
        setIsPlayingAudio(false);
        audioRef.current = null;
      });
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
  };

  const saveSession = async () => {
    if (!result || !user) return;

    try {
      // Use the global vault session function
      if ((window as any).addVaultSession) {
        (window as any).addVaultSession({
          type: 'mirror',
          input: result.originalInput,
          response: result.aiReply,
          emotion: result.detectedTone,
          audioBlob: result.audioBlob
        });
        
        alert('Session saved to your vault!');
      } else {
        console.error('Vault session function not available');
        alert('Failed to save session - vault not available');
      }
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save session');
    }
  };

  return (
    <div className="space-y-8">
      {/* Voice Status */}
      <GlassCard className={`p-4 ${userVoiceId === DEFAULT_VOICE_ID ? 'bg-gradient-to-r from-yellow-500/10 to-accent/10' : 'bg-gradient-to-r from-green-500/10 to-primary-medium/10'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Voice Status</h4>
            <p className="text-white/60 text-sm">
              {userVoiceId === DEFAULT_VOICE_ID 
                ? 'Using default voice - create custom voice for personalized responses' 
                : 'Using custom voice - personalized responses enabled'
              }
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${userVoiceId === DEFAULT_VOICE_ID ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <span className="text-white/80 text-sm">
              {userVoiceId === DEFAULT_VOICE_ID ? 'Default' : 'Custom'}
            </span>
            {userVoiceId === DEFAULT_VOICE_ID && (
              <Link to="/dashboard?tab=settings">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors text-sm flex items-center space-x-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>Setup</span>
                </motion.button>
              </Link>
            )}
          </div>
        </div>
      </GlassCard>

      {/* AI Avatar Status */}
      <GlassCard className={`p-4 ${hasCustomReplica ? 'bg-gradient-to-r from-green-500/10 to-primary-medium/10' : 'bg-gradient-to-r from-yellow-500/10 to-accent/10'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">AI Avatar Status</h4>
            <p className="text-white/60 text-sm">
              {hasCustomReplica 
                ? 'Personal replica created - AI avatars enabled' 
                : isUsingDefaultReplica
                ? 'Using default replica - create personal replica for better avatars'
                : 'Custom replica ID set - AI avatars enabled'
              }
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${hasCustomReplica ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-white/80 text-sm">
              {hasCustomReplica ? 'Personal' : isUsingDefaultReplica ? 'Default' : 'Custom'}
            </span>
            {!hasCustomReplica && (
              <Link to="/dashboard?tab=settings">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1 bg-primary-medium hover:bg-primary-medium/80 text-white rounded-lg transition-colors text-sm flex items-center space-x-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>Setup</span>
                </motion.button>
              </Link>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Input Section */}
      <GlassCard className="p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
          <MessageCircle className="w-6 h-6 text-accent" />
          <span>Talk to Your Mirror</span>
        </h2>

        <div className="space-y-4">
          <textarea
            value={input}
            onChange={handleTextInputChange}
            placeholder="Share what's on your mind... How are you feeling? What's bothering you? What brings you joy?"
            className="w-full h-32 p-4 bg-white/10 border border-primary-dark/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-white placeholder-white/50 resize-none"
          />

          {/* Voice Recorder */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <h4 className="text-white font-medium mb-1">Voice Input</h4>
              <p className="text-white/60 text-sm">
                {inputSource === 'audio' && liveTranscript 
                  ? `Voice captured: "${liveTranscript.substring(0, 30)}..."` 
                  : 'Record your message or type above'
                }
              </p>
            </div>
            <VoiceRecorder
              onRecordingComplete={handleRecordingComplete}
              onTranscriptReady={handleTranscriptReady}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReflect}
            disabled={
              (inputSource === 'text' && !input.trim()) || 
              (inputSource === 'audio' && !liveTranscript.trim()) || 
              isProcessing
            }
            className="w-full py-3 px-6 bg-gradient-to-r from-accent to-primary-medium text-white font-medium rounded-lg hover:from-accent/80 hover:to-primary-medium/80 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Reflect</span>
              </>
            )}
          </motion.button>

          {!hasCustomReplica && isUsingDefaultReplica && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <Video className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-blue-200 font-medium mb-1">Using Default AI Avatar</h4>
                  <p className="text-blue-200/80 text-sm mb-3">
                    You're currently using our default replica for AI avatar videos. 
                    Create your personal replica in settings for a more personalized experience.
                  </p>
                  <Link to="/dashboard?tab=settings">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 bg-primary-medium hover:bg-primary-medium/80 text-white rounded-lg transition-colors text-sm flex items-center space-x-2"
                    >
                      <Video className="w-4 h-4" />
                      <span>Create Personal Replica</span>
                    </motion.button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Processing Steps */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="p-6 text-center">
            <LoadingSpinner size="lg" type="orb" />
            <p className="text-white/80 mt-4 text-lg">{processingStep}</p>
            <div className="mt-4 space-y-2">
              <div className="w-full bg-white/10 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ 
                    width: processingStep.includes('emotions') ? '25%' : 
                           processingStep.includes('response') ? '50%' : 
                           processingStep.includes('voice') ? '75%' : 
                           processingStep.includes('video') ? '90%' : '100%'
                  }}
                  transition={{ duration: 0.5 }}
                  className="bg-gradient-to-r from-accent to-primary-medium h-2 rounded-full"
                />
              </div>
              <p className="text-white/60 text-sm">
                {processingStep.includes('emotions') && 'Step 1/4: Emotion Analysis'}
                {processingStep.includes('response') && 'Step 2/4: AI Response Generation'}
                {processingStep.includes('voice') && 'Step 3/4: Voice Synthesis'}
                {processingStep.includes('video') && 'Step 4/4: Video Creation'}
                {processingStep.includes('personalized') && 'Creating your personalized AI avatar...'}
              </p>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Mirror Video */}
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 text-center flex items-center justify-center space-x-2">
              <Video className="w-6 h-6 text-accent" />
              <span>Your AI Response</span>
            </h3>
            <div className="relative">
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(219, 176, 107, 0.3)',
                    '0 0 40px rgba(219, 176, 107, 0.5)',
                    '0 0 20px rgba(219, 176, 107, 0.3)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="relative rounded-2xl overflow-hidden mx-auto max-w-lg"
              >
                {result.videoUrl ? (
                  <video
                    src={result.videoUrl}
                    controls
                    autoPlay
                    className="w-full aspect-video rounded-2xl"
                    onError={() => console.error('Video playback error')}
                  />
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-accent/20 to-primary-medium/20 flex items-center justify-center border border-white/20 rounded-2xl">
                    <div className="text-center">
                      {result.noReplica ? (
                        <>
                          <div className="text-6xl mb-4">🎵</div>
                          <p className="text-white/80">Audio Response Ready</p>
                          <p className="text-white/60 text-sm">
                            Upload face video to enable AI avatar videos
                          </p>
                        </>
                      ) : result.videoId && !result.videoGenerationError ? (
                        <>
                          <LoadingSpinner size="lg" type="orb" />
                          <p className="text-white/80 mt-4">Creating your AI avatar...</p>
                          <p className="text-white/60 text-sm">
                            Your video will appear here when ready
                          </p>
                        </>
                      ) : result.videoGenerationError ? (
                        <>
                          <div className="text-6xl mb-4">🎵</div>
                          <p className="text-white/80 mb-2">Unfortunately, our AI avatar system is currently experiencing high demand. We're unable to generate your video at the moment, but here's your audio response.</p>
                          <p className="text-white/60 text-sm">
                            Tavus servers are currently busy or temporarily unavailable.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-6xl mb-4">🤖</div>
                          <p className="text-white/80">AI Response Ready</p>
                          <p className="text-white/60 text-sm">
                            Audio response available below
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </GlassCard>

          {/* Response Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-primary-medium" />
                <span>Your Input</span>
              </h4>
              <p className="text-white/80 italic">"{result.originalInput}"</p>
              <p className="text-white/50 text-xs mt-2">
                Source: {inputSource === 'audio' ? 'Voice transcript' : 'Text input'}
              </p>
            </GlassCard>

            <GlassCard className="p-6">
              <h4 className="text-lg font-semibold text-white mb-3">
                {result.detectedTone && (
                  <>
                    Detected Emotion: <span className="text-accent capitalize">{result.detectedTone}</span>
                  </>
                )}
              </h4>
              <div className="w-full bg-white/10 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="bg-gradient-to-r from-accent to-primary-medium h-2 rounded-full"
                />
              </div>
              <p className="text-white/60 text-xs mt-2">
                Voice: {userVoiceId === DEFAULT_VOICE_ID ? 'Default' : 'Custom'} | 
                Avatar: {hasCustomReplica ? 'Personal' : isUsingDefaultReplica ? 'Default' : 'Custom'}
              </p>
            </GlassCard>
          </div>

          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <Volume2 className="w-5 h-5 text-primary-medium" />
              <span>Mirror Response</span>
            </h4>
            <p className="text-white/90 text-lg leading-relaxed mb-4">"{result.aiReply}"</p>
            
            <div className="flex space-x-4">
              {result.audioBlob && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={isPlayingAudio ? pauseAudio : playAudio}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-medium hover:bg-primary-medium/80 text-white rounded-lg transition-colors"
                >
                  {isPlayingAudio ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span>
                    {isPlayingAudio ? 'Pause' : 'Play'} Audio ({userVoiceId === DEFAULT_VOICE_ID ? 'Default' : 'Your'} Voice)
                  </span>
                </motion.button>
              )}
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={saveSession}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Save Session</span>
              </motion.button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
};

export default SelfMirror;