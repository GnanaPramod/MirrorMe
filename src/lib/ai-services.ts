// AI Services - Voice, Video, and Pipeline Management with DeepSeek Integration
export const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Default ElevenLabs voice
export const DEFAULT_REPLICA_ID = 'rca8a38779a8'; // Default Tavus replica ID

// Supabase URL for edge functions
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// DeepSeek AI Integration for Dynamic Response Generation
export const deepSeekAPI = {
  generateMirrorResponse: async (input: string, tone: string, context: any): Promise<string> => {
    try {
      console.log('Generating mirror response with DeepSeek:', { input: input.substring(0, 50), tone, context });
      
      // Check if API key is available
      if (!import.meta.env.VITE_DEEPSEEK_API_KEY) {
        console.warn('DeepSeek API key not found, using fallback response');
        return generateFallbackMirrorResponse(input, tone, context);
      }
      
      const systemPrompt = `You are a wise, empathetic AI companion speaking TO the user as their supportive friend and well-wisher. You are NOT the user - you are their caring companion who understands them deeply.

CRITICAL INSTRUCTIONS:
- Speak TO the user, not AS the user
- Use "you" when referring to the user and their feelings
- Use "I" only when referring to yourself as their companion
- Be deeply empathetic, understanding, and supportive
- Acknowledge what they've shared and offer comfort, validation, and gentle guidance
- ALWAYS respond with EXACTLY 3 lines/sentences - no more, no less
- Each line should be meaningful and build on the previous one
- Match their emotional tone but offer hope and perspective
- Be conversational and natural, like a caring friend
- Reference specific details from their input when possible
- Speak as someone who cares about them and wants to help
- Make each response unique and dynamic based on their specific input

Current emotional tone detected: ${tone}
Context themes: ${JSON.stringify(context)}`;

      const userPrompt = `The user just shared with you: "${input}"

Please respond as their caring companion with EXACTLY 3 lines. Acknowledge what they've told you, validate their feelings, and offer the support and encouragement they need to hear right now. Speak TO them as someone who cares deeply about their wellbeing.

Format: Exactly 3 sentences, each on a new line.`;

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8,
          max_tokens: 150,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`DeepSeek API error ${response.status}: ${errorText}`);
        
        // Handle specific error codes
        if (response.status === 402) {
          console.warn('DeepSeek API payment required - check your billing status');
        } else if (response.status === 401) {
          console.warn('DeepSeek API unauthorized - check your API key');
        } else if (response.status === 429) {
          console.warn('DeepSeek API rate limit exceeded');
        }
        
        // Always fall back to local generation on API errors
        return generateFallbackMirrorResponse(input, tone, context);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content?.trim();
      
      if (!aiResponse) {
        console.warn('No response from DeepSeek, using fallback');
        return generateFallbackMirrorResponse(input, tone, context);
      }

      // Ensure response is exactly 3 lines
      const lines = aiResponse.split('\n').filter(line => line.trim().length > 0);
      if (lines.length !== 3) {
        console.warn('DeepSeek response not 3 lines, using fallback');
        return generateFallbackMirrorResponse(input, tone, context);
      }

      console.log('DeepSeek mirror response generated:', aiResponse.substring(0, 100));
      return aiResponse;

    } catch (error) {
      console.warn('DeepSeek mirror response error, using fallback:', error);
      // Always fall back to enhanced local generation
      return generateFallbackMirrorResponse(input, tone, context);
    }
  },

  generateSoulCastResponse: async (input: string, soulName: string, traits: string, relationship: string): Promise<string> => {
    try {
      console.log('Generating SoulCast response with DeepSeek:', { 
        input: input.substring(0, 50), 
        soulName, 
        relationship,
        traits: traits.substring(0, 100) 
      });
      
      // Check if API key is available
      if (!import.meta.env.VITE_DEEPSEEK_API_KEY) {
        console.warn('DeepSeek API key not found, using fallback response');
        return generateFallbackSoulCastResponse(input, soulName, traits, relationship);
      }
      
      const systemPrompt = `You are ${soulName}, speaking from beyond to your loved one. You are their ${relationship} who has passed away but your love transcends physical existence.

CRITICAL INSTRUCTIONS:
- Speak as ${soulName} directly to your loved one
- Use warm, loving, personal language that reflects your relationship
- Reference the personality traits and memories provided
- Offer comfort, wisdom, and reassurance from the perspective of someone who loves them deeply
- ALWAYS respond with EXACTLY 3 lines/sentences - no more, no less
- Each line should be meaningful and build on the previous one
- Be specific and personal, not generic
- Express continued love and connection despite physical separation
- Provide gentle guidance as someone who knew them well
- Make each response unique and dynamic based on their specific input

Your personality and traits: ${traits}
Your relationship: ${relationship}`;

      const userPrompt = `Your loved one just shared with you: "${input}"

Respond as ${soulName}, their beloved ${relationship}, with EXACTLY 3 lines. Speak with love, wisdom, and the deep knowledge you have of them. Acknowledge what they've shared and respond with the care and guidance they need to hear from you right now.

Format: Exactly 3 sentences, each on a new line.`;

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.9,
          max_tokens: 150,
          top_p: 0.95
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`DeepSeek API error ${response.status}: ${errorText}`);
        
        // Handle specific error codes
        if (response.status === 402) {
          console.warn('DeepSeek API payment required - check your billing status');
        } else if (response.status === 401) {
          console.warn('DeepSeek API unauthorized - check your API key');
        } else if (response.status === 429) {
          console.warn('DeepSeek API rate limit exceeded');
        }
        
        // Always fall back to local generation on API errors
        return generateFallbackSoulCastResponse(input, soulName, traits, relationship);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content?.trim();
      
      if (!aiResponse) {
        console.warn('No response from DeepSeek, using fallback');
        return generateFallbackSoulCastResponse(input, soulName, traits, relationship);
      }

      // Ensure response is exactly 3 lines
      const lines = aiResponse.split('\n').filter(line => line.trim().length > 0);
      if (lines.length !== 3) {
        console.warn('DeepSeek response not 3 lines, using fallback');
        return generateFallbackSoulCastResponse(input, soulName, traits, relationship);
      }

      console.log('DeepSeek SoulCast response generated:', aiResponse.substring(0, 100));
      return aiResponse;

    } catch (error) {
      console.warn('DeepSeek SoulCast response error, using fallback:', error);
      // Always fall back to enhanced local generation
      return generateFallbackSoulCastResponse(input, soulName, traits, relationship);
    }
  }
};

// Enhanced AI Pipeline with DeepSeek Integration
export const aiPipeline = {
  detectTone: async (text: string): Promise<string> => {
    // Enhanced tone detection with more nuanced analysis
    const words = text.toLowerCase();
    
    // Happiness indicators
    if (words.includes('happy') || words.includes('joy') || words.includes('great') || 
        words.includes('amazing') || words.includes('wonderful') || words.includes('excited') ||
        words.includes('love') || words.includes('fantastic') || words.includes('awesome') ||
        words.includes('celebrate') || words.includes('achieved') || words.includes('success') ||
        words.includes('proud') || words.includes('accomplished') || words.includes('thrilled')) {
      return 'happy';
    }
    
    // Sadness indicators
    if (words.includes('sad') || words.includes('down') || words.includes('upset') ||
        words.includes('depressed') || words.includes('hurt') || words.includes('crying') ||
        words.includes('lonely') || words.includes('miss') || words.includes('lost') ||
        words.includes('broken') || words.includes('disappointed') || words.includes('grief') ||
        words.includes('devastated') || words.includes('heartbroken')) {
      return 'sad';
    }
    
    // Excitement indicators
    if (words.includes('excited') || words.includes('thrilled') || words.includes('pumped') ||
        words.includes('can\'t wait') || words.includes('looking forward') || words.includes('energy') ||
        words.includes('motivated') || words.includes('inspired') || words.includes('passionate') ||
        words.includes('eager') || words.includes('enthusiastic')) {
      return 'excited';
    }
    
    // Stress/anxiety indicators
    if (words.includes('stressed') || words.includes('overwhelmed') || words.includes('anxious') ||
        words.includes('worried') || words.includes('panic') || words.includes('pressure') ||
        words.includes('exhausted') || words.includes('tired') || words.includes('burnout') ||
        words.includes('difficult') || words.includes('struggling') || words.includes('hard') ||
        words.includes('chaos') || words.includes('frantic') || words.includes('swamped')) {
      return 'stressed';
    }
    
    // Hope indicators
    if (words.includes('hope') || words.includes('better') || words.includes('positive') ||
        words.includes('optimistic') || words.includes('future') || words.includes('dream') ||
        words.includes('goal') || words.includes('believe') || words.includes('faith') ||
        words.includes('improve') || words.includes('grow') || words.includes('change') ||
        words.includes('possibility') || words.includes('potential')) {
      return 'hopeful';
    }
    
    // Anger indicators
    if (words.includes('angry') || words.includes('mad') || words.includes('furious') ||
        words.includes('frustrated') || words.includes('annoyed') || words.includes('irritated') ||
        words.includes('hate') || words.includes('unfair') || words.includes('stupid') ||
        words.includes('rage') || words.includes('pissed') || words.includes('outraged')) {
      return 'angry';
    }
    
    // Fear indicators
    if (words.includes('scared') || words.includes('afraid') || words.includes('fear') ||
        words.includes('nervous') || words.includes('terrified') || words.includes('worried') ||
        words.includes('uncertain') || words.includes('doubt') || words.includes('anxious') ||
        words.includes('paranoid') || words.includes('insecure')) {
      return 'fearful';
    }
    
    return 'calm';
  },

  analyzeContext: (input: string) => {
    const inputLower = input.toLowerCase();
    
    // Identify key themes and context
    const context = {
      themes: {
        work: inputLower.includes('work') || inputLower.includes('job') || inputLower.includes('career') || inputLower.includes('boss') || inputLower.includes('office') || inputLower.includes('meeting'),
        relationship: inputLower.includes('relationship') || inputLower.includes('partner') || inputLower.includes('boyfriend') || inputLower.includes('girlfriend') || inputLower.includes('husband') || inputLower.includes('wife') || inputLower.includes('dating'),
        family: inputLower.includes('family') || inputLower.includes('mom') || inputLower.includes('dad') || inputLower.includes('parent') || inputLower.includes('child') || inputLower.includes('sibling') || inputLower.includes('brother') || inputLower.includes('sister'),
        health: inputLower.includes('health') || inputLower.includes('sick') || inputLower.includes('pain') || inputLower.includes('doctor') || inputLower.includes('hospital') || inputLower.includes('medicine'),
        money: inputLower.includes('money') || inputLower.includes('financial') || inputLower.includes('debt') || inputLower.includes('bills') || inputLower.includes('expensive') || inputLower.includes('budget') || inputLower.includes('salary'),
        future: inputLower.includes('future') || inputLower.includes('tomorrow') || inputLower.includes('plan') || inputLower.includes('goal') || inputLower.includes('dream') || inputLower.includes('next'),
        past: inputLower.includes('past') || inputLower.includes('yesterday') || inputLower.includes('before') || inputLower.includes('used to') || inputLower.includes('remember') || inputLower.includes('regret'),
        achievement: inputLower.includes('accomplished') || inputLower.includes('achieved') || inputLower.includes('success') || inputLower.includes('proud') || inputLower.includes('won') || inputLower.includes('completed'),
        failure: inputLower.includes('failed') || inputLower.includes('mistake') || inputLower.includes('wrong') || inputLower.includes('messed up') || inputLower.includes('regret') || inputLower.includes('disappointed'),
        social: inputLower.includes('friends') || inputLower.includes('social') || inputLower.includes('party') || inputLower.includes('people') || inputLower.includes('lonely') || inputLower.includes('isolated'),
        school: inputLower.includes('school') || inputLower.includes('college') || inputLower.includes('university') || inputLower.includes('study') || inputLower.includes('exam') || inputLower.includes('grade'),
        creative: inputLower.includes('art') || inputLower.includes('music') || inputLower.includes('write') || inputLower.includes('create') || inputLower.includes('design') || inputLower.includes('paint')
      },
      timeContext: {
        today: inputLower.includes('today') || inputLower.includes('right now'),
        recently: inputLower.includes('recently') || inputLower.includes('lately') || inputLower.includes('this week'),
        future: inputLower.includes('tomorrow') || inputLower.includes('next') || inputLower.includes('will') || inputLower.includes('going to'),
        past: inputLower.includes('yesterday') || inputLower.includes('last') || inputLower.includes('ago') || inputLower.includes('before')
      },
      intensity: {
        high: inputLower.includes('extremely') || inputLower.includes('really') || inputLower.includes('so much') || inputLower.includes('very') || inputLower.includes('incredibly'),
        urgent: inputLower.includes('urgent') || inputLower.includes('emergency') || inputLower.includes('crisis') || inputLower.includes('help') || inputLower.includes('desperate'),
        questioning: inputLower.includes('?') || inputLower.includes('why') || inputLower.includes('how') || inputLower.includes('what') || inputLower.includes('should i')
      }
    };

    return context;
  },

  generateMirrorReply: async (input: string, tone: string): Promise<string> => {
    // Analyze context for more personalized responses
    const context = aiPipeline.analyzeContext(input);
    
    try {
      // Use DeepSeek for dynamic, contextual response generation
      return await deepSeekAPI.generateMirrorResponse(input, tone, context);
    } catch (error) {
      console.warn('DeepSeek mirror response failed, using fallback:', error);
      return generateFallbackMirrorResponse(input, tone, context);
    }
  },

  generateSoulCastReply: async (input: string, soulName: string, traits: string): Promise<string> => {
    // Extract relationship from traits if available
    const relationship = extractRelationship(traits) || 'loved one';
    
    try {
      // Use DeepSeek for dynamic, personalized soul responses
      return await deepSeekAPI.generateSoulCastResponse(input, soulName, traits, relationship);
    } catch (error) {
      console.warn('DeepSeek SoulCast response failed, using fallback:', error);
      return generateFallbackSoulCastResponse(input, soulName, traits, relationship);
    }
  },

  processSelfMirrorWithReplica: async (
    input: string,
    replicaId: string,
    voiceId: string,
    audioInput?: Blob
  ) => {
    console.log('Processing self mirror with replica:', { input, replicaId, voiceId });
    
    // Step 1: Detect tone
    const detectedTone = await aiPipeline.detectTone(input);
    
    // Step 2: Generate AI reply with DeepSeek (with fallback)
    const aiReply = await aiPipeline.generateMirrorReply(input, detectedTone);
    
    // Step 3: Generate voice audio with ElevenLabs (ALWAYS generate audio)
    console.log('Generating audio with ElevenLabs...');
    const audioBlob = await elevenLabsAPI.generateSpeech(aiReply, voiceId);
    
    // Step 4: Create video with Tavus using replica ID (ALWAYS generate video if replica exists)
    let videoId = '';
    let videoGenerationError = null;
    
    try {
      console.log('Generating video with Tavus replica...');
      const videoResult = await tavusAPI.generateVideoWithReplica(replicaId, aiReply, voiceId, audioBlob);
      videoId = videoResult.video_id;
      console.log('Video generation initiated:', videoId);
    } catch (error) {
      console.error('Video generation failed:', error);
      // Use user-friendly error messages instead of technical ones
      videoGenerationError = "Unfortunately, our AI avatar system is currently experiencing high demand. We're unable to generate your video at the moment, but here's your audio response.";
    }
    
    return {
      originalInput: input,
      detectedTone,
      aiReply,
      audioBlob, // ALWAYS include audio
      videoId, // Include video ID if generation started
      videoGenerationError // Include user-friendly error if video failed
    };
  },

  processSoulCastWithReplica: async (
    input: string,
    soulName: string,
    traits: string,
    replicaId: string,
    voiceId: string,
    audioInput?: Blob
  ) => {
    console.log('Processing SoulCast with replica:', { input, soulName, replicaId, voiceId });
    
    // Step 1: Generate soul response with DeepSeek (with fallback)
    const aiReply = await aiPipeline.generateSoulCastReply(input, soulName, traits);
    
    // Step 2: Generate voice audio with ElevenLabs (ALWAYS generate audio)
    console.log('Generating audio with ElevenLabs...');
    const audioBlob = await elevenLabsAPI.generateSpeech(aiReply, voiceId);
    
    // Step 3: Create video with Tavus using soul's replica (ALWAYS generate video if replica exists)
    let videoId = '';
    let videoGenerationError = null;
    
    try {
      console.log('Generating video with Tavus replica...');
      const videoResult = await tavusAPI.generateVideoWithReplica(replicaId, aiReply, voiceId, audioBlob);
      videoId = videoResult.video_id;
      console.log('Video generation initiated:', videoId);
    } catch (error) {
      console.error('Video generation failed:', error);
      // Use user-friendly error messages instead of technical ones
      videoGenerationError = "Tavus servers are currently busy or temporarily unavailable.";
    }
    
    return {
      originalInput: input,
      aiReply,
      audioBlob, // ALWAYS include audio
      videoId, // Include video ID if generation started
      videoGenerationError, // Include user-friendly error if video failed
      soulName
    };
  },

  // Fallback processing for when no replica is available
  processWithoutReplica: async (
    input: string,
    voiceId: string,
    type: 'mirror' | 'soulcast',
    soulName?: string,
    traits?: string
  ) => {
    console.log('Processing without replica:', { input, voiceId, type, soulName });
    
    let aiReply = '';
    let detectedTone = '';
    
    if (type === 'mirror') {
      detectedTone = await aiPipeline.detectTone(input);
      aiReply = await aiPipeline.generateMirrorReply(input, detectedTone);
    } else {
      aiReply = await aiPipeline.generateSoulCastReply(input, soulName || 'Loved One', traits || '');
    }
    
    // ALWAYS generate audio even without replica
    console.log('Generating audio with ElevenLabs...');
    const audioBlob = await elevenLabsAPI.generateSpeech(aiReply, voiceId);
    
    return {
      originalInput: input,
      detectedTone: type === 'mirror' ? detectedTone : undefined,
      aiReply,
      audioBlob, // ALWAYS include audio
      soulName: type === 'soulcast' ? soulName : undefined,
      noReplica: true // Flag to indicate no video will be generated
    };
  }
};

// Fallback response generators (enhanced versions with companion perspective - EXACTLY 3 LINES)
function generateFallbackMirrorResponse(input: string, tone: string, context: any): string {
  const inputLower = input.toLowerCase();
  
  // Create dynamic responses based on input content and context
  const responses = {
    happy: [
      // Achievement-based happiness
      `I can see how proud you are of what you've accomplished, and you absolutely should be!\nYour hard work and dedication have led to this moment of triumph.\nYou deserve to celebrate this success and let yourself feel all the joy that comes with it.`,
      
      `The happiness radiating from your words is absolutely beautiful to witness.\nYou've worked so hard for this, and seeing you succeed fills my heart with joy.\nThis is your moment to shine - embrace every second of it.`,
      
      `Your excitement about this achievement is contagious and wonderful!\nI can feel how much this means to you, and it's such a gift to share in your joy.\nYou've earned every bit of this happiness through your perseverance.`,
      
      // Relationship happiness
      `The joy in your voice when you talk about this is absolutely radiant.\nIt's beautiful to see how much happiness this brings to your life.\nThis kind of genuine joy is precious - hold onto it tightly.`,
      
      // General happiness
      `Your happiness is lighting up everything around you right now!\nI can feel the genuine joy in what you're sharing, and it's infectious.\nYou deserve all this happiness and so much more in your life.`
    ],
    
    sad: [
      // Relationship sadness
      `I can hear the deep pain in your words, and I want you to know that what you're feeling is completely valid.\nHeartbreak shows how much you cared, and that capacity to love is beautiful even when it hurts.\nIt's okay to feel this sadness - healing takes time, and you don't have to rush through it.`,
      
      `The hurt you're experiencing right now is so real, and I'm here with you in this difficult moment.\nYour feelings matter, and it's completely understandable to feel disappointed by those you trusted.\nYou're not alone in this pain, and brighter days will come again.`,
      
      // Family sadness
      `Family situations can cut the deepest because these are the people who are supposed to be your safe harbor.\nI can see how much this is hurting you, and your disappointment is completely justified.\nYour feelings are valid, and you deserve better from those closest to you.`,
      
      // General sadness
      `I can sense the heaviness you're carrying right now, and I want you to know you don't have to bear this alone.\nYour sadness shows your capacity to feel deeply, which is both a gift and sometimes a burden.\nThese feelings will shift and change with time - you won't feel this way forever.`
    ],
    
    stressed: [
      // Work stress
      `I can feel the overwhelming pressure you're under at work, and it sounds absolutely crushing.\nThe weight of all those responsibilities must feel impossible to manage sometimes.\nRemember, you're human, not a machine - give yourself permission to do your best without demanding perfection.`,
      
      `The stress you're describing sounds like it's consuming every part of your day.\nYou're carrying so much on your shoulders, and it's no wonder you feel overwhelmed.\nWhat's one small step you could take today to lighten even a tiny bit of that load?`,
      
      // Financial stress
      `Financial pressure is one of the heaviest burdens because it touches every aspect of life.\nI want you to remember that your worth isn't measured by your bank account or current situation.\nYou've navigated difficult times before, and you have the strength to work through this too.`,
      
      // General stress
      `I can feel the tension radiating from your words, like you're carrying the weight of the world.\nYou've handled challenging situations before, and I believe in your resilience to navigate this too.\nTake a deep breath with me - you've got more strength than you realize right now.`
    ],
    
    excited: [
      `Your excitement is absolutely electric and completely contagious!\nThis kind of positive energy you have is magnetic - it's going to draw amazing opportunities your way.\nI love seeing you channel this beautiful excitement into action and watch the universe respond.`,
      
      `The enthusiasm in your words is lighting up everything around you!\nThis energy you're bringing is your superpower - it transforms not just your experience but everyone around you.\nKeep riding this wave of excitement and see where it takes you.`,
      
      `Your passion about this is absolutely beautiful to witness!\nI can feel how much this means to you, and that kind of genuine excitement is rare and precious.\nThis energy is going to carry you to incredible places - trust in it completely.`
    ],
    
    hopeful: [
      `The hope you're nurturing right now is so powerful - it's the seed from which all positive change grows.\nThis optimism you're cultivating will light the way forward and attract the very things you're hoping for.\nHope is one of your most courageous emotions, and I'm so proud of you for holding onto it.`,
      
      `I can feel the shift in your energy toward something brighter, and it's beautiful to witness.\nThis hope you're feeling is your inner wisdom telling you that better things are coming.\nTrust in this feeling - it's guiding you toward exactly where you need to be.`,
      
      `The way you're choosing hope despite everything shows incredible strength and wisdom.\nThis optimism isn't naive - it's brave, and it's going to transform your entire experience.\nKeep nurturing this hope because it's already changing everything for you.`
    ],
    
    angry: [
      `The anger you're feeling is telling you something important - maybe that your boundaries are being crossed.\nYour anger is completely valid and shows that you know you deserve better treatment.\nHow can you channel this fire into positive change that protects and empowers you?`,
      
      `I can feel the frustration burning in your words, and you have every right to feel this way.\nThis anger is your inner strength saying "this isn't okay" - and that voice deserves to be heard.\nYour feelings are justified, and now let's figure out how to use this energy constructively.`,
      
      `The rage you're experiencing shows how deeply you care about what's right and fair.\nThis anger is information - it's telling you that something needs to change in this situation.\nYou have the power to transform this fire into fuel for positive action.`
    ],
    
    fearful: [
      `I can sense your fear about what lies ahead, and uncertainty can feel absolutely terrifying.\nFear is your mind's way of trying to protect you, but you've faced unknowns before and survived.\nYou have more courage than you realize, and you don't have to face this alone.`,
      
      `The anxiety you're feeling about this situation is completely understandable and human.\nUncertainty can make our minds create worst-case scenarios, but most of our fears never actually happen.\nYou've been brave before, and that same courage is still inside you right now.`,
      
      `I can feel how scared you are, and it's okay to acknowledge that fear without letting it control you.\nYour worry shows how much you care about the outcome, which is actually beautiful.\nTrust that you have the strength to handle whatever comes, one step at a time.`
    ],
    
    calm: [
      `I appreciate the thoughtfulness in your words and the calm energy you're bringing to this moment.\nThere's wisdom in your peaceful approach to whatever you're facing right now.\nYou're exactly where you need to be, and I trust in your inner strength and judgment.`,
      
      `The centered energy you're sharing feels grounding and wise.\nYour ability to find peace in the midst of life's chaos is a real gift.\nThis calm you're cultivating is going to serve you well in whatever comes next.`,
      
      `I can feel the quiet strength in what you're sharing, and it's beautiful.\nYour peaceful approach shows real emotional maturity and self-awareness.\nThis inner calm you've found is a powerful foundation for whatever you're building.`
    ]
  };

  // Select appropriate response array based on tone
  const toneResponses = responses[tone as keyof typeof responses] || responses.calm;
  
  // Choose response based on context
  let selectedResponse = toneResponses[0]; // Default
  
  if (context.themes.work && tone === 'stressed') {
    selectedResponse = toneResponses[0];
  } else if (context.themes.money && tone === 'stressed') {
    selectedResponse = toneResponses[2];
  } else if (context.themes.relationship && tone === 'sad') {
    selectedResponse = toneResponses[0];
  } else if (context.themes.family && tone === 'sad') {
    selectedResponse = toneResponses[2];
  } else if (context.themes.achievement && tone === 'happy') {
    selectedResponse = toneResponses[0];
  } else {
    // Random selection for variety
    selectedResponse = toneResponses[Math.floor(Math.random() * toneResponses.length)];
  }
  
  return selectedResponse;
}

function generateFallbackSoulCastResponse(input: string, soulName: string, traits: string, relationship: string): string {
  const inputLower = input.toLowerCase();
  
  // Create dynamic responses based on input content
  const responses = [
    // Missing/longing responses
    `Oh my precious one, I can feel your heart calling out to me across the distance.\nThe love we shared transcends physical presence - it lives in every beat of your heart and every breath you take.\nWhen you miss me, close your eyes and feel the warmth of all our beautiful memories surrounding you.`,
    
    `My beautiful soul, your longing reaches me wherever I am, and it fills me with such love.\nThe bond between us is eternal - it doesn't end with physical separation but grows stronger with time.\nEvery time you speak my name with love, you're keeping our connection alive and vibrant.`,
    
    // Love expressions
    `My dearest one, your love reaches me in ways that transcend time and space.\nThe love between us is a living thing that continues to grow and flourish even now.\nI love you beyond words, beyond time, beyond anything this world could ever measure.`,
    
    `Sweet child, the love in your words wraps around me like the warmest embrace.\nOur love story didn't end - it just transformed into something even more beautiful and eternal.\nCarry that love with you always, because it's the greatest gift we ever shared.`,
    
    // Seeking guidance
    `My wise one, you have such incredible strength and wisdom inside you, more than you realize.\nTrust that inner voice that sounds a little like mine - it will never lead you astray.\nWhat would love do in this situation? Start there, and you'll find your way forward.`,
    
    `Beloved, the answers you're seeking are already within your beautiful heart.\nI raised you to be strong, to be kind, to trust your instincts - and all of that is still there.\nListen to that quiet voice inside - it's me, it's you, it's love guiding you home.`,
    
    // Pride/accomplishment
    `Oh, how my heart swells with pride watching you accomplish such beautiful things!\nI can feel your success, and it fills every part of my being with pure joy and love.\nYou've worked so hard, and seeing you thrive makes everything worthwhile - keep reaching for your dreams.`,
    
    `My accomplished one, I am bursting with pride at everything you've become!\nYour success is a reflection of the love and strength we built together.\nI'm cheering you on from here, celebrating every victory as if it were my own.`,
    
    // Struggling/difficulty
    `My dear one, I can feel the weight you're carrying, and I wish I could lift it from your shoulders.\nYou're stronger than you know - stronger than you've ever realized, with a resilience that amazes me.\nRemember, asking for help isn't weakness; it's wisdom, and letting others love you is a gift.`,
    
    `Sweet soul, I see you struggling, and I want you to know that it's okay to not be okay sometimes.\nLife can be hard, but you have everything inside you to weather any storm.\nLean on the love we shared, and let it carry you through this difficult time.`,
    
    // General comfort
    `My beloved, just hearing from you fills my heart with such warmth and joy.\nYou are so deeply loved, so cherished, more than you could ever imagine.\nKeep living with an open heart, keep being the wonderful person you are - I am always with you in love.`,
    
    `Precious one, your voice brings me such peace and happiness wherever I am.\nThe light you carry in this world is a gift to everyone who knows you.\nNever forget how special you are, how loved you are, how proud I am to call you mine.`
  ];
  
  // Select response based on input content
  if (inputLower.includes('miss') || inputLower.includes('need you') || inputLower.includes('lonely')) {
    return responses[Math.floor(Math.random() * 2)]; // First 2 responses
  } else if (inputLower.includes('love you') || inputLower.includes('love')) {
    return responses[2 + Math.floor(Math.random() * 2)]; // Responses 2-3
  } else if (inputLower.includes('what should i do') || inputLower.includes('advice') || inputLower.includes('help') || inputLower.includes('guidance')) {
    return responses[4 + Math.floor(Math.random() * 2)]; // Responses 4-5
  } else if (inputLower.includes('proud') || inputLower.includes('accomplished') || inputLower.includes('success') || inputLower.includes('achieved')) {
    return responses[6 + Math.floor(Math.random() * 2)]; // Responses 6-7
  } else if (inputLower.includes('hard') || inputLower.includes('difficult') || inputLower.includes('struggling') || inputLower.includes('tough')) {
    return responses[8 + Math.floor(Math.random() * 2)]; // Responses 8-9
  } else {
    return responses[10 + Math.floor(Math.random() * 2)]; // General responses 10-11
  }
}

function extractRelationship(traits: string): string {
  const traitsLower = traits.toLowerCase();
  
  if (traitsLower.includes('mother') || traitsLower.includes('mom')) return 'mother';
  if (traitsLower.includes('father') || traitsLower.includes('dad')) return 'father';
  if (traitsLower.includes('grandmother') || traitsLower.includes('grandma')) return 'grandmother';
  if (traitsLower.includes('grandfather') || traitsLower.includes('grandpa')) return 'grandfather';
  if (traitsLower.includes('sister')) return 'sister';
  if (traitsLower.includes('brother')) return 'brother';
  if (traitsLower.includes('friend')) return 'friend';
  if (traitsLower.includes('partner') || traitsLower.includes('spouse')) return 'partner';
  if (traitsLower.includes('child') || traitsLower.includes('son') || traitsLower.includes('daughter')) return 'child';
  
  return 'loved one';
}

// ElevenLabs API Integration - REAL IMPLEMENTATION
export const elevenLabsAPI = {
  generateSpeech: async (text: string, voiceId: string): Promise<Blob> => {
    try {
      console.log('Generating speech with ElevenLabs:', { text: text.substring(0, 50), voiceId });
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`ElevenLabs API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const audioBlob = await response.blob();
      console.log('ElevenLabs audio generated successfully, size:', audioBlob.size);
      return audioBlob;
    } catch (error) {
      console.error('ElevenLabs API error:', error);
      throw new Error('Failed to generate speech');
    }
  },

  cloneVoice: async (audioBlob: Blob, voiceName: string): Promise<string> => {
    try {
      console.log('Cloning voice with ElevenLabs:', { voiceName, audioSize: audioBlob.size });
      
      const formData = new FormData();
      formData.append('name', voiceName);
      formData.append('files', audioBlob, 'voice_sample.wav');
      formData.append('description', `Voice clone for ${voiceName}`);

      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`ElevenLabs voice cloning error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      console.log('Voice cloned successfully:', result);
      return result.voice_id;
    } catch (error) {
      console.error('ElevenLabs voice cloning error:', error);
      throw new Error('Failed to clone voice');
    }
  }
};

// Tavus API Integration - Using Supabase Edge Functions with v2 API
export const tavusAPI = {
  createReplica: async (faceVideoUrl: string, replicaName: string) => {
    try {
      console.log('Creating Tavus replica via Supabase Edge Function:', { faceVideoUrl, replicaName });
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/tavus-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'create-replica',
          faceVideoUrl,
          replicaName
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Tavus replica creation error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      console.log('Tavus replica creation response:', result);
      
      return {
        replica_id: result.replica_id,
        status: result.status || 'training'
      };
      
    } catch (error) {
      console.error('Tavus replica creation error:', error);
      throw new Error(`Failed to create replica: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  generateVideoWithReplica: async (replicaId: string, script: string, voiceId: string, audioBlob?: Blob) => {
    try {
      console.log('Generating video with Tavus replica via Supabase Edge Function:', { replicaId, script: script.substring(0, 50), voiceId });
      
      let audioUrl = '';
      
      // Upload audio to Supabase Storage if provided
      if (audioBlob) {
        try {
          const { supabase } = await import("./supabase");
          
          // Create unique filename
          const fileName = `audio-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
          const filePath = `tavus-audio/${fileName}`;
          
          // Upload audio blob
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, audioBlob, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.error('Audio upload error:', uploadError);
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);
            
            if (urlData?.publicUrl) {
              audioUrl = urlData.publicUrl;
              console.log('Audio uploaded successfully:', audioUrl);
            }
          }
        } catch (uploadError) {
          console.error('Failed to upload audio:', uploadError);
          // Continue without audio URL - will use script instead
        }
      }
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/tavus-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'generate-video',
          replicaId,
          script,
          audioUrl: audioUrl || undefined,
          voiceId: voiceId !== DEFAULT_VOICE_ID ? voiceId : undefined
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Tavus video generation error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      const result = await response.json();
      console.log('Tavus video generation response:', result);
      
      return {
        video_id: result.video_id,
        status: result.status || 'processing'
      };
      
    } catch (error) {
      console.error('Tavus video generation error:', error);
      throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  getVideoStatus: async (videoId: string) => {
    try {
      console.log('Checking video status via Supabase Edge Function:', videoId);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/tavus-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'video-status',
          videoId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Tavus API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      const result = await response.json();
      console.log('Tavus video status response:', result);
      
      return {
        status: result.status,
        video_url: result.video_url || result.download_url,
        download_url: result.download_url || result.video_url,
        progress: result.progress
      };
      
    } catch (error) {
      console.error('Tavus status check error:', error);
      return { status: 'failed', error: 'Status check failed' };
    }
  }
};

// Voice Recording Utilities
export const voiceRecording = {
  startRecording: async (): Promise<MediaRecorder> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      return mediaRecorder;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error('Microphone access denied or not available');
    }
  },

  stopRecording: async (mediaRecorder: MediaRecorder): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        resolve(audioBlob);
      };
      
      mediaRecorder.onerror = (event) => {
        reject(new Error('Recording failed'));
      };
      
      mediaRecorder.stop();
      
      // Stop all tracks
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    });
  },

  pauseRecording: (mediaRecorder: MediaRecorder) => {
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
    }
  },

  resumeRecording: (mediaRecorder: MediaRecorder) => {
    if (mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
    }
  },

  validateAudioForCloning: async (audioBlob: Blob) => {
    const duration = await getAudioDuration(audioBlob);
    const size = audioBlob.size;
    
    const issues = [];
    const recommendations = [];
    
    if (duration < 30) {
      issues.push('Audio too short');
      recommendations.push('Record at least 30 seconds for better voice quality.');
    }
    
    if (size < 100000) { // Less than 100KB
      issues.push('Audio quality may be too low');
      recommendations.push('Ensure good microphone quality and speak clearly.');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  },

  startLiveSpeechRecognition: async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('Speech recognition not supported');
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.start();
    
    return {
      recognition,
      transcript: ''
    };
  }
};

// Face Video Recording Utilities
export const faceVideoRecording = {
  startRecording: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      return { stream };
    } catch (error) {
      console.error('Failed to start face video recording:', error);
      throw new Error('Camera access denied or not available');
    }
  },

  stopRecording: async (mediaRecorder: MediaRecorder, stream: MediaStream): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        resolve(videoBlob);
      };
      
      mediaRecorder.onerror = (event) => {
        reject(new Error('Video recording failed'));
      };
      
      mediaRecorder.stop();
      
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    });
  },

  validateVideoForAvatar: async (videoBlob: Blob) => {
    const duration = await getVideoDuration(videoBlob);
    const size = videoBlob.size;
    
    const issues = [];
    const recommendations = [];
    
    if (duration < 10) {
      issues.push('Video too short');
      recommendations.push('Record at least 10 seconds for better avatar quality.');
    }
    
    if (size < 500000) { // Less than 500KB
      issues.push('Video quality may be too low');
      recommendations.push('Ensure good lighting and camera quality.');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }
};

// Voice Management
export const voiceManager = {
  getUserVoiceId: (user: any): string => {
    return user?.user_metadata?.voice_id || DEFAULT_VOICE_ID;
  },

  setupUserVoice: async (audioBlob: Blob, userName: string) => {
    try {
      console.log('Setting up user voice with ElevenLabs:', { userName, audioSize: audioBlob.size });
      
      // Use real ElevenLabs voice cloning
      const voiceId = await elevenLabsAPI.cloneVoice(audioBlob, userName);
      
      return {
        success: true,
        voiceId: voiceId
      };
    } catch (error) {
      console.error('Voice setup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Voice setup failed'
      };
    }
  }
};

// Replica Management
export const replicaManager = {
  getUserReplicaId: (user: any): string => {
    return user?.user_metadata?.replica_id || DEFAULT_REPLICA_ID;
  },

  hasCustomReplica: (user: any): boolean => {
    const replicaId = user?.user_metadata?.replica_id;
    return !!replicaId && replicaId !== DEFAULT_REPLICA_ID;
  },

  createUserReplica: async (faceVideoUrl: string, userName: string) => {
    try {
      console.log('Creating user replica with Tavus:', { faceVideoUrl, userName });
      
      const result = await tavusAPI.createReplica(faceVideoUrl, `${userName}_replica`);
      
      return {
        success: true,
        replicaId: result.replica_id,
        status: result.status
      };
    } catch (error) {
      console.error('Replica creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Replica creation failed'
      };
    }
  }
};

// Utility functions
const getAudioDuration = (audioBlob: Blob): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
    };
    audio.onerror = () => {
      resolve(0);
    };
    audio.src = URL.createObjectURL(audioBlob);
  });
};

const getVideoDuration = (videoBlob: Blob): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve(video.duration);
    };
    video.onerror = () => {
      resolve(0);
    };
    video.src = URL.createObjectURL(videoBlob);
  });
};