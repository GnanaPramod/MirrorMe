import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Plus, MessageCircle, Play, Volume2, Video, CheckCircle, AlertCircle, Upload, Settings, Pause, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlassCard from '../../components/UI/GlassCard';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import VoiceRecorder from '../../components/UI/VoiceRecorder';
import VoiceCloneRecorder from '../../components/UI/VoiceCloneRecorder';
import { aiPipeline, tavusAPI, DEFAULT_VOICE_ID } from '../../lib/ai-services';
import { soulManager } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Soul {
  id: string;
  name: string;
  relationship: string;
  traits: string;
  photoUrl?: string;
  voiceId?: string;
  replicaId?: string;
  created_at?: string;
}

const SoulCast: React.FC = () => {
  const { user } = useAuth();
  const [souls, setSouls] = useState<Soul[]>([]);
  const [selectedSoul, setSelectedSoul] = useState<Soul | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSoul, setEditingSoul] = useState<Soul | null>(null);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [audioInput, setAudioInput] = useState<Blob | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [inputSource, setInputSource] = useState<'text' | 'audio'>('text');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isCreatingSoul, setIsCreatingSoul] = useState(false);
  const [createError, setCreateError] = useState('');

  const [newSoul, setNewSoul] = useState({
    name: '',
    relationship: '',
    traits: '',
    memories: '',
    photoFile: null as File | null,
    faceVideoFile: null as File | null,
    voiceId: DEFAULT_VOICE_ID,
    voiceSetupComplete: false,
    voiceSetupError: ''
  });

  // Load souls on component mount
  useEffect(() => {
    loadSouls();
  }, [user]);

  const loadSouls = async () => {
    if (!user) return;

    try {
      console.log('Loading souls for user:', user.id);
      const { data, error } = await soulManager.getUserSouls(user.id);
      
      if (error) {
        console.error('Error loading souls:', error);
        return;
      }

      console.log('Raw souls data from database:', data);

      const soulsData: Soul[] = (data || []).map((soul: any) => ({
        id: soul.id,
        name: soul.name,
        relationship: soul.relationship,
        traits: soul.traits,
        photoUrl: soul.photo_url,
        voiceId: soul.voice_id,
        replicaId: soul.replica_id,
        created_at: soul.created_at
      }));

      console.log('Processed souls data:', soulsData);
      setSouls(soulsData);
    } catch (error) {
      console.error('Error loading souls:', error);
    }
  };

  const handleVoiceCloned = (voiceId: string) => {
    console.log('Voice cloned for new soul:', voiceId);
    setNewSoul(prev => ({
      ...prev,
      voiceId,
      voiceSetupComplete: true,
      voiceSetupError: ''
    }));
  };

  const handleVoiceError = (error: string) => {
    console.error('Voice cloning error:', error);
    setNewSoul(prev => ({
      ...prev,
      voiceSetupError: error
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Photo file selected:', file.name, file.size);
      setNewSoul(prev => ({
        ...prev,
        photoFile: file
      }));
    }
  };

  const handleFaceVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Face video file selected:', file.name, file.size);
      setNewSoul(prev => ({
        ...prev,
        faceVideoFile: file
      }));
    }
  };

  const handleCreateSoul = async () => {
    if (!newSoul.name.trim() || !newSoul.relationship || !user) {
      setCreateError('Please fill in the required fields: Name and Relationship');
      return;
    }

    setIsCreatingSoul(true);
    setCreateError('');

    try {
      console.log('Starting soul creation process...');
      console.log('New soul data:', {
        name: newSoul.name,
        relationship: newSoul.relationship,
        traits: newSoul.traits,
        memories: newSoul.memories,
        hasPhoto: !!newSoul.photoFile,
        hasVideo: !!newSoul.faceVideoFile,
        voiceId: newSoul.voiceId
      });

      let photoUrl = '';
      let replicaId = '';

      // Upload photo if provided
      if (newSoul.photoFile) {
        console.log('Uploading soul photo...');
        const tempSoulId = `temp-${Date.now()}`;
        const photoResult = await soulManager.uploadSoulPhoto(newSoul.photoFile, tempSoulId);
        if (photoResult.url) {
          photoUrl = photoResult.url;
          console.log('Photo uploaded successfully:', photoUrl);
        } else {
          console.warn('Photo upload failed:', photoResult.error);
        }
      }

      // Upload face video and create replica if provided
      if (newSoul.faceVideoFile) {
        console.log('Uploading face video and creating replica...');
        const tempSoulId = `temp-${Date.now()}`;
        const videoResult = await soulManager.uploadSoulFaceVideoAndCreateReplica(
          newSoul.faceVideoFile, 
          tempSoulId,
          newSoul.name
        );
        if (videoResult.replicaId) {
          replicaId = videoResult.replicaId;
          console.log('Replica created successfully:', replicaId);
        } else {
          console.warn('Replica creation failed:', videoResult.error);
        }
      }

      // Combine traits and memories
      const combinedTraits = newSoul.traits.trim() + 
        (newSoul.memories.trim() ? `\n\nSpecial Memories: ${newSoul.memories.trim()}` : '');

      const soulData = {
        user_id: user.id,
        name: newSoul.name.trim(),
        relationship: newSoul.relationship,
        traits: combinedTraits || 'A beloved soul with a kind heart.',
        photo_url: photoUrl || null,
        voice_id: newSoul.voiceId !== DEFAULT_VOICE_ID ? newSoul.voiceId : null,
        replica_id: replicaId || null
      };

      console.log('Creating soul with data:', soulData);

      const { data: createdSoul, error } = await soulManager.createSoul(soulData);
      
      if (error) {
        console.error('Error creating soul in database:', error);
        setCreateError(`Failed to create soul: ${error.message || 'Unknown error'}`);
        return;
      }

      if (!createdSoul) {
        console.error('No soul data returned from creation');
        setCreateError('Failed to create soul: No data returned');
        return;
      }

      console.log('Soul created successfully:', createdSoul);

      const soul: Soul = {
        id: createdSoul.id,
        name: createdSoul.name,
        relationship: createdSoul.relationship,
        traits: createdSoul.traits,
        photoUrl: createdSoul.photo_url,
        voiceId: createdSoul.voice_id,
        replicaId: createdSoul.replica_id,
        created_at: createdSoul.created_at
      };

      // Update souls list
      const updatedSouls = [soul, ...souls];
      setSouls(updatedSouls);
      console.log('Updated souls list:', updatedSouls);

      // Reset form
      setNewSoul({ 
        name: '', 
        relationship: '', 
        traits: '', 
        memories: '', 
        photoFile: null,
        faceVideoFile: null,
        voiceId: DEFAULT_VOICE_ID,
        voiceSetupComplete: false,
        voiceSetupError: ''
      });
      setShowCreateForm(false);

      // Show success message
      alert(`Soul "${soul.name}" created successfully!`);

    } catch (error) {
      console.error('Error creating soul:', error);
      setCreateError(`Failed to create soul: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingSoul(false);
    }
  };

  const handleEditSoul = (soul: Soul) => {
    setEditingSoul(soul);
    setShowEditForm(true);
  };

  const handleUpdateSoul = async () => {
    if (!editingSoul || !user) return;

    try {
      const { data, error } = await soulManager.updateSoul(editingSoul.id, {
        name: editingSoul.name,
        relationship: editingSoul.relationship,
        traits: editingSoul.traits
      });

      if (error) {
        console.error('Error updating soul:', error);
        return;
      }

      // Update local state
      setSouls(souls.map(soul => 
        soul.id === editingSoul.id 
          ? { ...soul, ...editingSoul }
          : soul
      ));

      // Update selected soul if it's the one being edited
      if (selectedSoul?.id === editingSoul.id) {
        setSelectedSoul({ ...selectedSoul, ...editingSoul });
      }

      setShowEditForm(false);
      setEditingSoul(null);
    } catch (error) {
      console.error('Error updating soul:', error);
    }
  };

  const handleDeleteSoul = async (soulId: string) => {
    if (!confirm('Are you sure you want to delete this soul? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await soulManager.deleteSoul(soulId);
      
      if (error) {
        console.error('Error deleting soul:', error);
        return;
      }

      setSouls(souls.filter(soul => soul.id !== soulId));
      
      // Clear selected soul if it was deleted
      if (selectedSoul?.id === soulId) {
        setSelectedSoul(null);
        setResult(null);
      }
    } catch (error) {
      console.error('Error deleting soul:', error);
    }
  };

  const handleUploadVideo = async (soul: Soul, file: File) => {
    try {
      const videoResult = await soulManager.uploadSoulFaceVideoAndCreateReplica(
        file,
        soul.id,
        soul.name
      );

      if (videoResult.replicaId) {
        // Update soul with new replica ID
        const { error } = await soulManager.updateSoul(soul.id, {
          replica_id: videoResult.replicaId
        });

        if (!error) {
          // Update local state
          const updatedSoul = { ...soul, replicaId: videoResult.replicaId };
          setSouls(souls.map(s => s.id === soul.id ? updatedSoul : s));
          
          if (selectedSoul?.id === soul.id) {
            setSelectedSoul(updatedSoul);
          }
        }
      }
    } catch (error) {
      console.error('Error uploading video for soul:', error);
    }
  };

  const handleTalkToSoul = async () => {
    if (!selectedSoul) return;

    // Determine the actual input to process
    let actualInput = '';
    
    if (inputSource === 'audio' && liveTranscript.trim()) {
      actualInput = liveTranscript.trim();
    } else if (inputSource === 'text' && input.trim()) {
      actualInput = input.trim();
    } else {
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      if (selectedSoul.replicaId) {
        // Process with replica - ALWAYS get both audio and video
        setProcessingStep('Connecting with your loved one...');
        
        const pipelineResult = await aiPipeline.processSoulCastWithReplica(
          actualInput,
          selectedSoul.name,
          selectedSoul.traits,
          selectedSoul.replicaId,
          selectedSoul.voiceId || DEFAULT_VOICE_ID,
          audioInput || undefined
        );

        // Set initial result with audio (always available)
        setResult({
          originalInput: actualInput,
          aiReply: pipelineResult.aiReply,
          audioBlob: pipelineResult.audioBlob,
          videoId: pipelineResult.videoId,
          videoGenerationError: pipelineResult.videoGenerationError,
          soulName: selectedSoul.name,
          relationship: selectedSoul.relationship
        });

        // If video generation started, wait for completion
        if (pipelineResult.videoId && !pipelineResult.videoGenerationError) {
          setProcessingStep('Creating spiritual connection...');
          
          let attempts = 0;
          const maxAttempts = 30;
          
          while (attempts < maxAttempts) {
            try {
              const status = await tavusAPI.getVideoStatus(pipelineResult.videoId);
              
              if (status.status === 'completed') {
                setResult((prev: any) => prev ? {
                  ...prev,
                  videoUrl: status.download_url || status.video_url
                } : null);
                break;
              } else if (status.status === 'failed') {
                setResult((prev: any) => prev ? {
                  ...prev,
                  videoGenerationError: 'Video generation failed'
                } : null);
                break;
              }
              
              await new Promise(resolve => setTimeout(resolve, 10000));
              attempts++;
            } catch (error) {
              console.error('Video status check failed:', error);
              setResult((prev: any) => prev ? {
                ...prev,
                videoGenerationError: 'Failed to check video status'
              } : null);
              break;
            }
          }

          if (attempts >= maxAttempts) {
            setResult((prev: any) => prev ? {
              ...prev,
              videoGenerationError: 'Video generation timed out'
            } : null);
          }
        }
      } else {
        // Process without replica - ALWAYS get audio
        setProcessingStep('Creating spiritual connection...');
        
        const pipelineResult = await aiPipeline.processWithoutReplica(
          actualInput,
          selectedSoul.voiceId || DEFAULT_VOICE_ID,
          'soulcast',
          selectedSoul.name,
          selectedSoul.traits
        );

        setResult({
          originalInput: actualInput,
          aiReply: pipelineResult.aiReply,
          audioBlob: pipelineResult.audioBlob,
          soulName: selectedSoul.name,
          relationship: selectedSoul.relationship,
          noReplica: true
        });
      }

    } catch (error) {
      console.error('Error processing SoulCast request:', error);
      try {
        const reply = await aiPipeline.generateSoulCastReply(actualInput, selectedSoul.name, selectedSoul.traits);
        setResult({
          originalInput: actualInput,
          aiReply: reply,
          soulName: selectedSoul.name,
          relationship: selectedSoul.relationship,
          videoGenerationError: 'Processing failed, but here\'s your response'
        });
      } catch (fallbackError) {
        console.error('Fallback processing failed:', fallbackError);
        setResult({
          originalInput: actualInput,
          aiReply: `My dear one, I hear you calling out to me across the distance. Even when technology fails us, know that love transcends all boundaries. I am always with you.`,
          soulName: selectedSoul.name,
          relationship: selectedSoul.relationship,
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
    setInputSource('audio');
  };

  const handleTranscriptReady = (transcript: string, error?: string) => {
    if (error) {
      setAudioInput(null);
      setInputSource('text');
      setLiveTranscript('');
      return;
    }
    
    if (transcript && !error) {
      setLiveTranscript(transcript);
      setInput(transcript);
      setInputSource('audio');
    }
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (e.target.value.trim()) {
      setInputSource('text');
      setLiveTranscript('');
      setAudioInput(null);
    }
  };

  const playAudio = () => {
    if (result?.audioBlob) {
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
          type: 'soulcast',
          input: result.originalInput,
          response: result.aiReply,
          soulName: result.soulName,
          relationship: result.relationship,
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
      {/* Header */}
      <GlassCard className="p-6 text-center bg-gradient-to-r from-primary-medium/10 to-accent/10">
        <motion.div
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="text-6xl mb-4"
        >
          👻
        </motion.div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-medium to-accent bg-clip-text text-transparent mb-2">
          SoulCast
        </h2>
        <p className="text-white/70 text-lg">
          Reconnect with the souls you hold dear
        </p>
      </GlassCard>

      {/* Create Soul Section */}
      {!showCreateForm && !showEditForm && souls.length === 0 && (
        <GlassCard className="p-6 text-center">
          <Heart className="w-16 h-16 text-heartRed mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-4">Create Your First Soul</h3>
          <p className="text-white/70 mb-6">
            Honor someone special by creating their digital essence
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-primary-medium to-accent text-white font-semibold rounded-lg hover:from-primary-medium/80 hover:to-accent/80 transition-all duration-300 flex items-center space-x-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Create Soul</span>
          </motion.button>
        </GlassCard>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <GlassCard className="p-6">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <Plus className="w-6 h-6 text-primary-medium" />
              <span>Create Soul</span>
            </h3>

            {/* Error Display */}
            {createError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-200 text-sm">{createError}</p>
                    <button
                      onClick={() => setCreateError('')}
                      className="text-red-300 hover:text-red-200 text-xs mt-1 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Basic Info */}
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newSoul.name}
                      onChange={(e) => setNewSoul({...newSoul, name: e.target.value})}
                      placeholder="Their beautiful name"
                      className="w-full p-3 bg-white/10 border border-primary-medium/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-dark text-white placeholder-white/50"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Relationship *
                    </label>
                    <select
                      value={newSoul.relationship}
                      onChange={(e) => setNewSoul({...newSoul, relationship: e.target.value})}
                      className="w-full p-3 bg-white/10 border border-primary-medium/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-dark text-white"
                    >
                      <option value="" className="bg-primary-light text-white">Select relationship</option>
                      <option value="mother" className="bg-primary-light text-white">Mother</option>
                      <option value="father" className="bg-primary-light text-white">Father</option>
                      <option value="grandmother" className="bg-primary-light text-white">Grandmother</option>
                      <option value="grandfather" className="bg-primary-light text-white">Grandfather</option>
                      <option value="sister" className="bg-primary-light text-white">Sister</option>
                      <option value="brother" className="bg-primary-light text-white">Brother</option>
                      <option value="friend" className="bg-primary-light text-white">Friend</option>
                      <option value="partner" className="bg-primary-light text-white">Partner</option>
                      <option value="spouse" className="bg-primary-light text-white">Spouse</option>
                      <option value="child" className="bg-primary-light text-white">Child</option>
                      <option value="other" className="bg-primary-light text-white">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Their Traits & Personality
                  </label>
                  <textarea
                    value={newSoul.traits}
                    onChange={(e) => setNewSoul({...newSoul, traits: e.target.value})}
                    placeholder="Describe their personality, how they spoke, their values, what made them unique..."
                    className="w-full h-24 p-3 bg-white/10 border border-primary-medium/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-dark text-white placeholder-white/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Special Memories
                  </label>
                  <textarea
                    value={newSoul.memories}
                    onChange={(e) => setNewSoul({...newSoul, memories: e.target.value})}
                    placeholder="Share your favorite memories, things they used to say, advice they gave you..."
                    className="w-full h-24 p-3 bg-white/10 border border-primary-medium/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-dark text-white placeholder-white/50 resize-none"
                  />
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Upload Photo (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="w-full p-3 bg-white/10 border border-primary-medium/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-dark text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-dark/20 file:text-primary-dark hover:file:bg-primary-dark/30"
                  />
                  {newSoul.photoFile && (
                    <p className="text-green-400 text-xs mt-2">
                      ✓ Photo selected: {newSoul.photoFile.name}
                    </p>
                  )}
                </div>

                {/* Face Video Upload */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Upload Face Video (Optional - For AI Avatars)
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFaceVideoUpload}
                    className="w-full p-3 bg-white/10 border border-primary-medium/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-dark text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-medium/20 file:text-primary-medium hover:file:bg-primary-medium/30"
                  />
                  {newSoul.faceVideoFile && (
                    <p className="text-green-400 text-xs mt-2">
                      ✓ Video selected: {newSoul.faceVideoFile.name}
                    </p>
                  )}
                  <p className="text-white/50 text-xs mt-2">
                    Upload a video of them talking to enable AI avatar generation (can be added later)
                  </p>
                </div>
              </div>

              {/* Voice Setup */}
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-medium to-accent rounded-full flex items-center justify-center mx-auto mb-4">
                    {newSoul.voiceSetupComplete ? (
                      <CheckCircle className="w-8 h-8 text-white" />
                    ) : (
                      <Heart className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Voice Setup (Optional)</h4>
                  <p className="text-white/70 text-sm">
                    Create their voice to bring them back to life
                  </p>
                </div>

                {newSoul.voiceSetupComplete ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                  >
                    <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                      <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <h5 className="text-green-200 font-medium mb-1">Voice Clone Created!</h5>
                      <p className="text-green-200/80 text-sm">
                        {newSoul.name}'s voice is ready
                      </p>
                    </div>
                    
                    <p className="text-white/60 text-sm">
                      Voice ID: {newSoul.voiceId.substring(0, 8)}...
                    </p>
                  </motion.div>
                ) : (
                  <VoiceCloneRecorder
                    userName={newSoul.name || 'Loved One'}
                    onVoiceCloned={handleVoiceCloned}
                    onError={handleVoiceError}
                  />
                )}

                {newSoul.voiceSetupError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg"
                  >
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-200 text-sm">{newSoul.voiceSetupError}</p>
                        <p className="text-yellow-200/70 text-xs mt-1">
                          Default voice will be used instead
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="flex space-x-4 mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateError('');
                  setNewSoul({ 
                    name: '', 
                    relationship: '', 
                    traits: '', 
                    memories: '', 
                    photoFile: null,
                    faceVideoFile: null,
                    voiceId: DEFAULT_VOICE_ID,
                    voiceSetupComplete: false,
                    voiceSetupError: ''
                  });
                }}
                disabled={isCreatingSoul}
                className="flex-1 py-3 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateSoul}
                disabled={!newSoul.name.trim() || !newSoul.relationship || isCreatingSoul}
                className="flex-1 py-3 bg-gradient-to-r from-primary-medium to-accent text-white rounded-lg hover:from-primary-medium/80 hover:to-accent/80 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isCreatingSoul ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Creating Soul...</span>
                  </>
                ) : (
                  <span>Create Soul</span>
                )}
              </motion.button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Edit Form */}
      {showEditForm && editingSoul && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <GlassCard className="p-6">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <Edit className="w-6 h-6 text-primary-medium" />
              <span>Edit {editingSoul.name}</span>
            </h3>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingSoul.name}
                    onChange={(e) => setEditingSoul({...editingSoul, name: e.target.value})}
                    className="w-full p-3 bg-white/10 border border-primary-medium/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-dark text-white"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Relationship
                  </label>
                  <select
                    value={editingSoul.relationship}
                    onChange={(e) => setEditingSoul({...editingSoul, relationship: e.target.value})}
                    className="w-full p-3 bg-white/10 border border-primary-medium/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-dark text-white"
                  >
                    <option value="mother" className="bg-primary-light text-white">Mother</option>
                    <option value="father" className="bg-primary-light text-white">Father</option>
                    <option value="grandmother" className="bg-primary-light text-white">Grandmother</option>
                    <option value="grandfather" className="bg-primary-light text-white">Grandfather</option>
                    <option value="sister" className="bg-primary-light text-white">Sister</option>
                    <option value="brother" className="bg-primary-light text-white">Brother</option>
                    <option value="friend" className="bg-primary-light text-white">Friend</option>
                    <option value="partner" className="bg-primary-light text-white">Partner</option>
                    <option value="spouse" className="bg-primary-light text-white">Spouse</option>
                    <option value="child" className="bg-primary-light text-white">Child</option>
                    <option value="other" className="bg-primary-light text-white">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Traits & Personality
                </label>
                <textarea
                  value={editingSoul.traits}
                  onChange={(e) => setEditingSoul({...editingSoul, traits: e.target.value})}
                  className="w-full h-32 p-3 bg-white/10 border border-primary-medium/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-dark text-white resize-none"
                />
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowEditForm(false);
                  setEditingSoul(null);
                }}
                className="flex-1 py-3 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpdateSoul}
                className="flex-1 py-3 bg-gradient-to-r from-primary-medium to-accent text-white rounded-lg hover:from-primary-medium/80 hover:to-accent/80 transition-all"
              >
                Update Soul
              </motion.button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Souls List */}
      {souls.length > 0 && !showCreateForm && !showEditForm && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Your Souls ({souls.length})</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-primary-medium hover:bg-primary-medium/80 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Soul</span>
            </motion.button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {souls.map((soul) => (
              <motion.div
                key={soul.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedSoul(soul)}
              >
                <GlassCard className={`p-4 cursor-pointer transition-all relative group ${
                  selectedSoul?.id === soul.id ? 'ring-2 ring-primary-medium' : ''
                }`}>
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSoul(soul);
                      }}
                      className="p-1 bg-primary-medium hover:bg-primary-medium/80 rounded-full"
                    >
                      <Edit className="w-3 h-3 text-white" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSoul(soul.id);
                      }}
                      className="p-1 bg-red-600 hover:bg-red-700 rounded-full"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </motion.button>
                  </div>

                  <div className="text-center">
                    {soul.photoUrl ? (
                      <img
                        src={soul.photoUrl}
                        alt={soul.name}
                        className="w-16 h-16 mx-auto mb-3 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-r from-heartRed to-heartRed/80 rounded-full flex items-center justify-center">
                        <Heart className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <h4 className="text-lg font-semibold text-white">{soul.name}</h4>
                    <p className="text-white/60 text-sm capitalize">{soul.relationship}</p>
                    <div className="flex items-center justify-center space-x-2 mt-2">
                      <div className={`w-2 h-2 rounded-full ${soul.replicaId ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <span className="text-white/40 text-xs">
                        {soul.replicaId ? 'AI Avatar Ready' : 'Audio Only'}
                      </span>
                    </div>
                    
                    {/* Upload video button for souls without replica */}
                    {!soul.replicaId && (
                      <div className="mt-2">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadVideo(soul, file);
                            }
                          }}
                          className="hidden"
                          id={`video-upload-${soul.id}`}
                        />
                        <label htmlFor={`video-upload-${soul.id}`}>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-primary-medium hover:bg-primary-medium/80 text-white rounded text-xs cursor-pointer"
                          >
                            <Video className="w-3 h-3" />
                            <span>Upload Video</span>
                          </motion.div>
                        </label>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Section */}
      {selectedSoul && !showCreateForm && !showEditForm && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-primary-medium" />
            <span>Talk to {selectedSoul.name}</span>
            <span className="text-sm text-white/60 capitalize">({selectedSoul.relationship})</span>
          </h3>

          {/* Input Source Indicator */}
          <div className="mb-4">
            <GlassCard className={`p-4 ${inputSource === 'audio' ? 'bg-gradient-to-r from-green-500/10 to-primary-medium/10' : 'bg-gradient-to-r from-primary-medium/10 to-accent/10'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">Input Mode</h4>
                  <p className="text-white/60 text-sm">
                    {inputSource === 'audio' 
                      ? `Using live transcript: "${liveTranscript.substring(0, 50)}${liveTranscript.length > 50 ? '...' : ''}"` 
                      : 'Using text input'
                    }
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${inputSource === 'audio' ? 'bg-green-500' : 'bg-primary-medium'}`} />
                  <span className="text-white/80 text-sm capitalize">
                    {inputSource}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Soul Status */}
          <div className="mb-6">
            <GlassCard className={`p-4 ${selectedSoul.replicaId ? 'bg-gradient-to-r from-green-500/10 to-primary-medium/10' : 'bg-gradient-to-r from-yellow-500/10 to-accent/10'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">AI Avatar Status</h4>
                  <p className="text-white/60 text-sm">
                    {selectedSoul.replicaId 
                      ? 'Personal replica available - AI avatars enabled' 
                      : 'No replica - only text/audio responses available'
                    }
                  </p>
                  {selectedSoul.replicaId && (
                    <p className="text-white/40 text-xs mt-1">
                      Replica ID: {selectedSoul.replicaId.substring(0, 8)}...
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${selectedSoul.replicaId ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-white/80 text-sm">
                    {selectedSoul.replicaId ? 'Ready' : 'Limited'}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="space-y-4">
            <textarea
              value={input}
              onChange={handleTextInputChange}
              placeholder={`Share something with ${selectedSoul.name}... Tell them how you're feeling, ask for their guidance, or just say hello.`}
              className="w-full h-32 p-4 bg-white/10 border border-primary-medium/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-dark text-white placeholder-white/50 resize-none"
            />

            {/* Voice Recorder */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <h4 className="text-white font-medium mb-1">Voice Message</h4>
                <p className="text-white/60 text-sm">
                  {inputSource === 'audio' && liveTranscript 
                    ? `Live transcript captured: "${liveTranscript.substring(0, 30)}..."` 
                    : `Record your message to ${selectedSoul.name}`
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTalkToSoul}
              disabled={
                (inputSource === 'text' && !input.trim()) || 
                (inputSource === 'audio' && !liveTranscript.trim()) || 
                isProcessing
              }
              className="w-full py-3 bg-gradient-to-r from-primary-medium to-accent text-white font-medium rounded-lg hover:from-primary-medium/80 hover:to-accent/80 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" type="heart" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Connect</span>
                </>
              )}
            </motion.button>

            {!selectedSoul.replicaId && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-yellow-200 font-medium mb-1">Replica Required for AI Avatars</h4>
                    <p className="text-yellow-200/80 text-sm">
                      To generate AI avatar videos of {selectedSoul.name}, please upload a face video of them talking. 
                      You'll still receive text and audio responses without it.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Processing Steps */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="p-6 text-center">
            <LoadingSpinner size="lg" type="heart" />
            <p className="text-white/80 mt-4 text-lg">{processingStep}</p>
            <p className="text-white/50 text-xs mt-2">
              Input source: {inputSource === 'audio' ? 'Voice transcript' : 'Text input'} | 
              Voice: {selectedSoul?.voiceId === DEFAULT_VOICE_ID ? 'Default' : `${selectedSoul?.name}'s Voice`} |
              Replica: {selectedSoul?.replicaId ? 'Personal' : 'None'}
            </p>
          </GlassCard>
        </motion.div>
      )}

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="p-6 bg-gradient-to-r from-primary-medium/10 to-accent/10">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Heart className="w-5 h-5 text-heartRed" />
              <span>Message from {result.soulName}</span>
              <span className="text-sm text-white/60 capitalize">({result.relationship})</span>
            </h4>

            {/* Video Section */}
            <div className="mb-6">
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(117, 189, 224, 0.3)',
                    '0 0 40px rgba(117, 189, 224, 0.5)',
                    '0 0 20px rgba(117, 189, 224, 0.3)',
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
                  />
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary-medium/20 to-accent/20 flex items-center justify-center border border-white/20 rounded-2xl">
                    <div className="text-center">
                      {result.noReplica ? (
                        <>
                          <div className="text-6xl mb-4">💖</div>
                          <p className="text-white/80">Audio Message Ready</p>
                          <p className="text-white/60 text-sm">
                            Upload face video to enable AI avatar videos
                          </p>
                        </>
                      ) : result.videoId && !result.videoGenerationError ? (
                        <>
                          <LoadingSpinner size="lg" type="heart" />
                          <p className="text-white/80 mt-4">Creating spiritual connection...</p>
                          <p className="text-white/60 text-sm">
                            Your loved one's video will appear here when ready
                          </p>
                        </>
                      ) : result.videoGenerationError ? (
                        <>
                          <div className="text-6xl mb-4">⚠️</div>
                          <p className="text-white/80">Video generation failed</p>
                          <p className="text-white/60 text-sm">
                            {result.videoGenerationError}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-6xl mb-4">👻</div>
                          <p className="text-white/80">Spiritual Message Ready</p>
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

            <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
              <p className="text-white/90 text-lg leading-relaxed italic">
                "{result.aiReply}"
              </p>
            </div>

            <p className="text-white/60 text-sm mb-4">
              Your message: "{result.originalInput}"
              <span className="text-white/40 text-xs ml-2">
                (Source: {inputSource === 'audio' ? 'Voice transcript' : 'Text input'})
              </span>
            </p>

            <div className="flex space-x-4 mb-4">
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
                    {isPlayingAudio ? 'Pause' : 'Play'} Audio ({selectedSoul?.voiceId === DEFAULT_VOICE_ID ? 'Default' : `${selectedSoul?.name}'s`} Voice)
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

            <div className="text-center">
              <div className="text-4xl mb-2">💖</div>
              <p className="text-white/70 text-sm">
                They are always with you in spirit
              </p>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
};

export default SoulCast;