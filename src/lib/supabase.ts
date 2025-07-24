import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with optimized settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-client-info': 'mirror-me-app'
    }
  }
});

export type User = {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    voice_id?: string;
    face_video_url?: string;
    replica_id?: string;
  };
};

// User profile management
export const userProfile = {
  updateProfile: async (userId: string, updates: {
    full_name?: string;
    avatar_url?: string;
    voice_id?: string;
    face_video_url?: string;
    replica_id?: string;
  }) => {
    console.log('Updating user profile with:', updates);
    
    try {
      // Update user metadata using auth.updateUser
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      });
      
      console.log('Profile update result:', { success: !error, error });
      return { data, error };
    } catch (error) {
      console.error('Profile update error:', error);
      return { data: null, error };
    }
  },

  getProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return { data, error };
    } catch (error) {
      console.error('Get profile error:', error);
      return { data: null, error };
    }
  },

  uploadProfilePhoto: async (file: File, userId: string): Promise<{ url?: string; error?: string }> => {
    try {
      console.log('Uploading profile photo for user:', userId);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { error: 'Failed to upload photo' };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        return { error: 'Failed to get photo URL' };
      }

      console.log('Photo uploaded, updating user metadata with URL:', urlData.publicUrl);

      // Update user metadata with new avatar URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: urlData.publicUrl }
      });

      if (updateError) {
        console.error('Profile update error:', updateError);
        return { error: 'Failed to update profile' };
      }

      console.log('Profile photo successfully updated in user metadata');
      return { url: urlData.publicUrl };
    } catch (error) {
      console.error('Profile photo upload error:', error);
      return { error: 'Failed to upload photo' };
    }
  },

  uploadFaceVideo: async (file: File, userId: string): Promise<{ url?: string; error?: string }> => {
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-face-video-${Date.now()}.${fileExt}`;
      const filePath = `face-videos/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Face video upload error:', uploadError);
        return { error: 'Failed to upload face video' };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        return { error: 'Failed to get face video URL' };
      }

      // Update user metadata with new face video URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: { face_video_url: urlData.publicUrl }
      });

      if (updateError) {
        console.error('Face video update error:', updateError);
        return { error: 'Failed to update profile' };
      }

      return { url: urlData.publicUrl };
    } catch (error) {
      console.error('Face video upload error:', error);
      return { error: 'Failed to upload face video' };
    }
  },

  uploadFaceVideoAndCreateReplica: async (file: File, userId: string, userName: string): Promise<{ url?: string; replicaId?: string; error?: string }> => {
    try {
      // First upload the face video
      const uploadResult = await userProfile.uploadFaceVideo(file, userId);
      
      if (uploadResult.error || !uploadResult.url) {
        return { error: uploadResult.error || 'Failed to upload face video' };
      }

      // Import replica manager
      const { replicaManager } = await import('./ai-services');
      
      // Create replica with Tavus
      const replicaResult = await replicaManager.createUserReplica(uploadResult.url, userName);
      
      if (!replicaResult.success || !replicaResult.replicaId) {
        return { 
          url: uploadResult.url, 
          error: replicaResult.error || 'Failed to create replica' 
        };
      }

      // Update user metadata with replica ID
      const { error: updateError } = await supabase.auth.updateUser({
        data: { replica_id: replicaResult.replicaId }
      });

      if (updateError) {
        console.error('Replica ID update error:', updateError);
        return { 
          url: uploadResult.url, 
          replicaId: replicaResult.replicaId,
          error: 'Failed to save replica ID' 
        };
      }

      return { 
        url: uploadResult.url, 
        replicaId: replicaResult.replicaId 
      };
    } catch (error) {
      console.error('Face video upload and replica creation error:', error);
      return { error: 'Failed to upload face video and create replica' };
    }
  }
};

// Soul management
export const soulManager = {
  createSoul: async (soul: {
    user_id: string;
    name: string;
    relationship: string;
    traits: string;
    photo_url?: string;
    voice_id?: string;
    face_video_url?: string;
    replica_id?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('souls')
        .insert([soul])
        .select()
        .single();
      return { data, error };
    } catch (error) {
      console.error('Create soul error:', error);
      return { data: null, error };
    }
  },

  getUserSouls: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('souls')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return { data, error };
    } catch (error) {
      console.error('Get user souls error:', error);
      return { data: null, error };
    }
  },

  updateSoul: async (soulId: string, updates: {
    name?: string;
    relationship?: string;
    traits?: string;
    photo_url?: string;
    voice_id?: string;
    face_video_url?: string;
    replica_id?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('souls')
        .update(updates)
        .eq('id', soulId)
        .select()
        .single();
      return { data, error };
    } catch (error) {
      console.error('Update soul error:', error);
      return { data: null, error };
    }
  },

  deleteSoul: async (soulId: string) => {
    try {
      const { data, error } = await supabase
        .from('souls')
        .delete()
        .eq('id', soulId);
      return { data, error };
    } catch (error) {
      console.error('Delete soul error:', error);
      return { data: null, error };
    }
  },

  uploadSoulPhoto: async (file: File, soulId: string): Promise<{ url?: string; error?: string }> => {
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${soulId}-${Date.now()}.${fileExt}`;
      const filePath = `soul-photos/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { error: 'Failed to upload photo' };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        return { error: 'Failed to get photo URL' };
      }

      return { url: urlData.publicUrl };
    } catch (error) {
      console.error('Soul photo upload error:', error);
      return { error: 'Failed to upload photo' };
    }
  },

  uploadSoulFaceVideo: async (file: File, soulId: string): Promise<{ url?: string; error?: string }> => {
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${soulId}-face-video-${Date.now()}.${fileExt}`;
      const filePath = `soul-face-videos/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Soul face video upload error:', uploadError);
        return { error: 'Failed to upload face video' };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        return { error: 'Failed to get face video URL' };
      }

      return { url: urlData.publicUrl };
    } catch (error) {
      console.error('Soul face video upload error:', error);
      return { error: 'Failed to upload face video' };
    }
  },

  uploadSoulFaceVideoAndCreateReplica: async (file: File, soulId: string, soulName: string): Promise<{ url?: string; replicaId?: string; error?: string }> => {
    try {
      // First upload the face video
      const uploadResult = await soulManager.uploadSoulFaceVideo(file, soulId);
      
      if (uploadResult.error || !uploadResult.url) {
        return { error: uploadResult.error || 'Failed to upload face video' };
      }

      // Import replica manager
      const { replicaManager } = await import('./ai-services');
      
      // Create replica with Tavus
      const replicaResult = await replicaManager.createUserReplica(uploadResult.url, soulName);
      
      if (!replicaResult.success || !replicaResult.replicaId) {
        return { 
          url: uploadResult.url, 
          error: replicaResult.error || 'Failed to create replica' 
        };
      }

      return { 
        url: uploadResult.url, 
        replicaId: replicaResult.replicaId 
      };
    } catch (error) {
      console.error('Soul face video upload and replica creation error:', error);
      return { error: 'Failed to upload face video and create replica' };
    }
  }
};