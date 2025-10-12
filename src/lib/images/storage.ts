import { createSupabaseLoadClient } from '$lib/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProcessedImage, ImageUploadResult } from '$lib/types/images';
import { v4 as uuidv4 } from 'uuid';

export class ImageStorage {
  private bucket = 'hazard-images';
  private supabase: SupabaseClient;
  
  constructor(supabaseClient?: SupabaseClient) {
    // Accept a client or create a browser client
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      const client = createSupabaseLoadClient();
      if (!client) {
        throw new Error('Supabase not configured. Cannot initialize ImageStorage.');
      }
      this.supabase = client;
    }
  }
  
  async uploadProcessedImage(
    processedImage: ProcessedImage, 
    userId: string,
    hazardId?: string,
    authSession?: any,
    authUser?: any
  ): Promise<ImageUploadResult> {
    if (!this.supabase) throw new Error('Supabase not configured');
    
    // Debug: Check authentication status
    console.log('🔍 Checking authentication...');
    
    let session, user;
    
    // Use provided auth details if available
    if (authSession && authUser) {
      console.log('✅ Using provided session/user data');
      session = authSession;
      user = authUser;
    } else {
      // Client auth methods hang, so we can't check client session
      // This means images can only be uploaded when server session is available
      throw new Error('User must be authenticated to upload images. Please ensure you are logged in.');
    }
    
    if (!user || !session) {
      throw new Error(`User must be authenticated to upload images. No valid session available.`);
    }
    
    console.log('✅ User authenticated:', user.id);
    
    const imageId = uuidv4();
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Create file paths using the authenticated user's ID
    const originalPath = `${user.id}/${timestamp}/${imageId}-original.webp`;
    const thumbnailPath = `${user.id}/${timestamp}/${imageId}-thumb.webp`;
    
    try {
      // Upload original image
      const { data: originalData, error: originalError } = await this.supabase.storage
        .from(this.bucket)
        .upload(originalPath, processedImage.original, {
          cacheControl: '31536000', // 1 year
          upsert: false
        });
      
      if (originalError) throw originalError;
      
      // Upload thumbnail
      const { data: thumbnailData, error: thumbnailError } = await this.supabase.storage
        .from(this.bucket)
        .upload(thumbnailPath, processedImage.thumbnail, {
          cacheControl: '31536000', // 1 year
          upsert: false
        });
      
      if (thumbnailError) throw thumbnailError;
      
      // Get public URLs
      const originalUrl = await this.getPublicUrl(originalPath);
      const thumbnailUrl = await this.getPublicUrl(thumbnailPath);
      
      // Save metadata to database
      const { data: imageRecord, error: dbError } = await this.supabase
        .from('hazard_images')
        .insert({
          id: imageId,
          hazard_id: hazardId || null,
          user_id: user.id,
          original_url: originalUrl,
          thumbnail_url: thumbnailUrl,
          original_path: originalPath,
          thumbnail_path: thumbnailPath,
          metadata: processedImage.metadata
        })
        .select()
        .single();
      
      if (dbError) {
        console.error('Database save error:', dbError);
        // Clean up uploaded files since DB save failed
        await this.supabase.storage.from(this.bucket).remove([originalPath, thumbnailPath]);
        throw new Error(`Failed to save image metadata: ${dbError.message}`);
      }
      
      console.log('✅ Image metadata saved to database:', imageRecord);
      
      return {
        id: imageId,
        originalUrl,
        thumbnailUrl,
        metadata: processedImage.metadata
      };
      
    } catch (error) {
      // Cleanup any uploaded files on error
      await this.cleanupFailedUpload(originalPath, thumbnailPath);
      throw error;
    }
  }
  
  private async getPublicUrl(path: string): Promise<string> {
    if (!this.supabase) throw new Error('Supabase not configured');
    
    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }
  
  private async cleanupFailedUpload(originalPath: string, thumbnailPath: string): Promise<void> {
    if (!this.supabase) return;
    
    try {
      await this.supabase.storage
        .from(this.bucket)
        .remove([originalPath, thumbnailPath]);
    } catch (error) {
      console.warn('Failed to cleanup files after upload error:', error);
    }
  }
  
  async voteOnImage(imageId: string, userId: string, vote: 'up' | 'down'): Promise<void> {
    if (!this.supabase) throw new Error('Supabase not configured');
    
    // Use upsert to handle vote updates
    const { error } = await this.supabase
      .from('image_votes')
      .upsert({
        image_id: imageId,
        user_id: userId,
        vote_type: vote
      }, {
        onConflict: 'image_id,user_id'
      });
    
    if (error) {
      throw new Error(`Failed to vote on image: ${error.message}`);
    }
  }

  async deleteImage(imageId: string, userId: string): Promise<void> {
    if (!this.supabase) throw new Error('Supabase not configured');
    
    // Get image record to find file paths
    const { data: imageRecord, error: fetchError } = await this.supabase
      .from('hazard_images')
      .select('original_path, thumbnail_path, user_id')
      .eq('id', imageId)
      .single();
    
    if (fetchError) {
      throw new Error(`Image not found: ${fetchError.message}`);
    }
    
    // Check if user owns the image
    if (imageRecord.user_id !== userId) {
      throw new Error('You can only delete your own images');
    }
    
    // Delete files from storage
    const { error: storageError } = await this.supabase.storage
      .from(this.bucket)
      .remove([imageRecord.original_path, imageRecord.thumbnail_path]);
    
    if (storageError) {
      console.warn('Failed to delete files from storage:', storageError);
      // Continue with database deletion even if storage fails
    }
    
    // Delete database record (this will cascade delete votes due to foreign key)
    const { error: dbError } = await this.supabase
      .from('hazard_images')
      .delete()
      .eq('id', imageId)
      .eq('user_id', userId); // Double-check ownership
    
    if (dbError) {
      throw new Error(`Failed to delete image record: ${dbError.message}`);
    }
  }

  async getImagesForHazard(hazardId: string): Promise<any[]> {
    if (!this.supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await this.supabase
      .from('hazard_images')
      .select(`
        id,
        hazard_id,
        user_id,
        original_url,
        thumbnail_url,
        vote_score,
        uploaded_at,
        metadata
      `)
      .eq('hazard_id', hazardId)
      .order('vote_score', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch images: ${error.message}`);
    }
    
    return data || [];
  }

  async getUserImages(userId: string): Promise<any[]> {
    if (!this.supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await this.supabase
      .from('hazard_images')
      .select(`
        id,
        hazard_id,
        user_id,
        original_url,
        thumbnail_url,
        vote_score,
        uploaded_at,
        metadata
      `)
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch user images: ${error.message}`);
    }
    
    return data || [];
  }
}