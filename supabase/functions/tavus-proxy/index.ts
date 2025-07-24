/*
  # Tavus API Proxy Edge Function - v2 API Integration

  1. Purpose
    - Step 1: Create replica from face video (returns replica_id)
    - Step 2: Generate video using replica_id + script/audioUrl (returns video)
    - Handle video status checking using Tavus v2 API

  2. Endpoints
    - POST with action: 'create-replica' - Create replica from face video
    - POST with action: 'generate-video' - Generate video using replica + script/audioUrl
    - POST with action: 'video-status' - Check video generation status

  3. Tavus v2 API URLs
    - Create Replica: https://tavusapi.com/v2/replicas
    - Generate Video: https://tavusapi.com/v2/videos
    - Check Status: https://tavusapi.com/v2/videos/{videoId}
*/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface CreateReplicaRequest {
  action: 'create-replica';
  faceVideoUrl: string;
  replicaName: string;
}

interface GenerateVideoRequest {
  action: 'generate-video';
  replicaId: string;
  script?: string;
  audioUrl?: string;
  voiceId?: string;
}

interface VideoStatusRequest {
  action: 'video-status';
  videoId: string;
}

type TavusRequest = CreateReplicaRequest | GenerateVideoRequest | VideoStatusRequest;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const requestBody: TavusRequest = await req.json();
    console.log('Tavus proxy request received:', { 
      action: requestBody.action,
      ...('faceVideoUrl' in requestBody ? { faceVideoUrl: requestBody.faceVideoUrl?.substring(0, 50) } : {}),
      ...('script' in requestBody ? { script: requestBody.script?.substring(0, 50) } : {}),
      ...('audioUrl' in requestBody ? { audioUrl: requestBody.audioUrl?.substring(0, 50) } : {}),
      ...('replicaId' in requestBody ? { replicaId: requestBody.replicaId?.substring(0, 8) } : {}),
      ...('videoId' in requestBody ? { videoId: requestBody.videoId?.substring(0, 8) } : {})
    });

    // STEP 1: CREATE REPLICA FROM FACE VIDEO
    if (requestBody.action === 'create-replica') {
      const { faceVideoUrl, replicaName } = requestBody;

      if (!faceVideoUrl || !replicaName) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: faceVideoUrl and replicaName' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Creating replica from face video:', { faceVideoUrl, replicaName });

      try {
        // Fetch the face video from URL
        const videoResponse = await fetch(faceVideoUrl);
        if (!videoResponse.ok) {
          console.error('Failed to fetch face video:', videoResponse.status);
          return new Response(
            JSON.stringify({ error: `Failed to fetch face video: ${videoResponse.status}` }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Convert to blob for form data
        const faceVideoBlob = await videoResponse.blob();
        console.log('Face video fetched:', { size: faceVideoBlob.size, type: faceVideoBlob.type });
        
        // Create FormData for Tavus replica creation
        const formData = new FormData();
        
        // Determine filename based on MIME type
        const mimeType = faceVideoBlob.type || 'video/webm';
        let filename = 'face_video.webm';
        
        if (mimeType.includes('mp4')) {
          filename = 'face_video.mp4';
        } else if (mimeType.includes('webm')) {
          filename = 'face_video.webm';
        } else if (mimeType.includes('mov')) {
          filename = 'face_video.mov';
        }
        
        const faceVideoFile = new File([faceVideoBlob], filename, { type: mimeType });
        
        formData.append('train_video', faceVideoFile);
        formData.append('replica_name', replicaName);

        console.log('Calling Tavus v2 replica creation API...');

        // Call Tavus v2 replica creation API
        const tavusResponse = await fetch('https://tavusapi.com/v2/replicas', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('TAVUS_API_KEY')}`,
          },
          body: formData
        });

        console.log('Tavus response status:', tavusResponse.status);

        if (!tavusResponse.ok) {
          const errorData = await tavusResponse.json().catch(() => ({}));
          console.error('Tavus replica creation error:', errorData);
          return new Response(
            JSON.stringify({ 
              error: `Tavus replica creation error: ${tavusResponse.status}`,
              details: errorData 
            }),
            { 
              status: tavusResponse.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const result = await tavusResponse.json();
        console.log('Tavus replica creation success:', result);
        
        return new Response(
          JSON.stringify({
            replica_id: result.replica_id,
            status: result.status || 'training'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('Replica creation error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create replica',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // STEP 2: GENERATE VIDEO USING REPLICA + SCRIPT/AUDIO
    if (requestBody.action === 'generate-video') {
      const { replicaId, script, audioUrl, voiceId } = requestBody;

      if (!replicaId || (!script && !audioUrl)) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: replicaId and either script or audioUrl' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Generating video with replica:', { 
        replicaId, 
        script: script?.substring(0, 50), 
        audioUrl: audioUrl?.substring(0, 50),
        voiceId 
      });

      try {
        // Prepare request body for video generation
        const requestBody: any = {
          replica_id: replicaId
        };

        // Prioritize audioUrl over script as per Tavus API requirements
        if (audioUrl) {
          requestBody.audio_url = audioUrl;
          console.log('Using audio URL for video generation');
        } else if (script) {
          requestBody.script = script;
          console.log('Using script for video generation');
        }

        // Add voice settings if using custom voice
        if (voiceId) {
          requestBody.voice_id = voiceId;
        }

        console.log('Calling Tavus v2 video generation API with body:', {
          replica_id: requestBody.replica_id,
          has_audio_url: !!requestBody.audio_url,
          has_script: !!requestBody.script,
          voice_id: requestBody.voice_id
        });

        // Call Tavus v2 video generation API
        const tavusResponse = await fetch('https://tavusapi.com/v2/videos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('TAVUS_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        console.log('Tavus video generation response status:', tavusResponse.status);

        if (!tavusResponse.ok) {
          const errorData = await tavusResponse.json().catch(() => ({}));
          console.error('Tavus video generation error:', errorData);
          return new Response(
            JSON.stringify({ 
              error: `Tavus video generation error: ${tavusResponse.status}`,
              details: errorData 
            }),
            { 
              status: tavusResponse.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const result = await tavusResponse.json();
        console.log('Tavus video generation success:', result);
        
        return new Response(
          JSON.stringify({
            video_id: result.video_id || result.id,
            status: result.status || 'processing'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('Video generation error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to generate video',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // STEP 3: CHECK VIDEO STATUS
    if (requestBody.action === 'video-status') {
      const { videoId } = requestBody;

      if (!videoId) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: videoId' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Checking video status:', videoId);

      try {
        // Call Tavus v2 API to check video status
        const tavusResponse = await fetch(`https://tavusapi.com/v2/videos/${videoId}`, {
          headers: {
            'Authorization': `Bearer ${Deno.env.get('TAVUS_API_KEY')}`,
          }
        });

        console.log('Tavus video status response:', tavusResponse.status);

        if (!tavusResponse.ok) {
          const errorData = await tavusResponse.json().catch(() => ({}));
          console.error('Tavus video status error:', errorData);
          return new Response(
            JSON.stringify({ 
              error: `Tavus API error: ${tavusResponse.status}`,
              details: errorData 
            }),
            { 
              status: tavusResponse.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const result = await tavusResponse.json();
        console.log('Video status result:', result);
        
        return new Response(
          JSON.stringify({
            status: result.status,
            video_url: result.video_url || result.download_url,
            download_url: result.download_url || result.video_url,
            progress: result.progress
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('Video status check error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to check video status',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Invalid action
    return new Response(
      JSON.stringify({ 
        error: 'Invalid action. Use: create-replica, generate-video, or video-status',
        received: requestBody.action
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Tavus proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});