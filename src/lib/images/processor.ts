import ExifReader from 'exifreader';
import type { GeoPoint, ProcessedImage, ValidationResult } from '$lib/types/images';

export interface ImageConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  thumbnailSize: number;
  minResolution: number; // Minimum width/height for legibility
  maxFileSize: number; // 2MB limit
  allowedTypes: string[];
}

export interface SafeExifData {
  timestamp: string;
  latitude?: number;
  longitude?: number;
  // Stripped: device info, software, user comments, etc.
}

export class ImageProcessor {
  private config: ImageConfig = {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.75,
    thumbnailSize: 200,
    minResolution: 640,
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  };

  async processUpload(file: File, reportedLocation?: GeoPoint): Promise<ProcessedImage> {
    // Validate image first
    const validation = await this.validateImage(file);
    if (!validation.isValid) {
      throw new Error(`Invalid image: ${validation.errors.join(', ')}`);
    }

    // Extract and validate EXIF data
    const exifData = await this.extractSafeExifData(file);
    
    // Validate location if provided
    if (reportedLocation && exifData.latitude && exifData.longitude) {
      await this.validateLocation(
        { lat: exifData.latitude, lng: exifData.longitude },
        reportedLocation
      );
    }

    // Process images for web optimization
    const processedImages = await this.optimizeForWeb(file);

    return {
      original: processedImages.original,
      thumbnail: processedImages.thumbnail,
      metadata: {
        timestamp: exifData.timestamp,
        hasLocationData: !!(exifData.latitude && exifData.longitude),
        fileSize: file.size,
        dimensions: processedImages.dimensions
      },
      validation: {
        isValid: true,
        locationVerified: !!reportedLocation
      }
    };
  }

  private async validateImage(file: File): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Check file size
    if (file.size > this.config.maxFileSize) {
      const maxSizeMB = this.config.maxFileSize / 1024 / 1024;
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      errors.push(`File size ${fileSizeMB}MB exceeds limit of ${maxSizeMB}MB`);
    }
    
    if (file.size < 1024) { // 1KB minimum
      errors.push('File appears to be corrupted or too small');
    }
    
    // Check file type
    if (!this.config.allowedTypes.includes(file.type)) {
      errors.push(`File type '${file.type}' not supported. Allowed: ${this.config.allowedTypes.join(', ')}`);
    }
    
    // Check dimensions
    try {
      const dimensions = await this.getImageDimensions(file);
      if (Math.min(dimensions.width, dimensions.height) < this.config.minResolution) {
        errors.push(`Image resolution ${dimensions.width}×${dimensions.height} too low. Minimum ${this.config.minResolution}px on shortest side for clear hazard documentation.`);
      }
      
      if (Math.max(dimensions.width, dimensions.height) > 8000) {
        errors.push(`Image resolution ${dimensions.width}×${dimensions.height} too high. Maximum 8000px on longest side.`);
      }
    } catch (error) {
      errors.push('Could not read image - file may be corrupted');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async extractSafeExifData(file: File): Promise<SafeExifData> {
    try {
      const buffer = await file.arrayBuffer();
      const exifData = ExifReader.load(buffer);
      
      // Extract only safe data, strip everything else
      const safeData: SafeExifData = {
        timestamp: this.extractTimestamp(exifData),
      };

      // Extract GPS data if available
      if (exifData.GPSLatitude && exifData.GPSLongitude) {
        safeData.latitude = this.convertGPSToDecimal(exifData.GPSLatitude, exifData.GPSLatitudeRef);
        safeData.longitude = this.convertGPSToDecimal(exifData.GPSLongitude, exifData.GPSLongitudeRef);
      }

      return safeData;
    } catch (error) {
      console.warn('Could not extract EXIF data:', error);
      return {
        timestamp: new Date().toISOString()
      };
    }
  }

  private extractTimestamp(exifData: any): string {
    // Try multiple timestamp fields
    const timestampFields = ['DateTime', 'DateTimeOriginal', 'DateTimeDigitized'];
    
    for (const field of timestampFields) {
      if (exifData[field]?.description) {
        try {
          // Convert EXIF datetime format to ISO string
          const exifDateTime = exifData[field].description;
          const [date, time] = exifDateTime.split(' ');
          const [year, month, day] = date.split(':');
          const isoString = `${year}-${month}-${day}T${time}`;
          return new Date(isoString).toISOString();
        } catch (error) {
          continue;
        }
      }
    }
    
    // Fallback to current time
    return new Date().toISOString();
  }

  private convertGPSToDecimal(gpsValue: any, gpsRef: any): number {
    if (!gpsValue?.description || !gpsRef?.description) return 0;
    
    try {
      const [degrees, minutes, seconds] = gpsValue.description.split(',').map(Number);
      let decimal = degrees + minutes / 60 + seconds / 3600;
      
      // Apply hemisphere
      if (gpsRef.description === 'S' || gpsRef.description === 'W') {
        decimal = -decimal;
      }
      
      return decimal;
    } catch (error) {
      return 0;
    }
  }

  private async validateLocation(exifLocation: GeoPoint, reportedLocation: GeoPoint): Promise<void> {
    const distance = this.calculateDistance(exifLocation, reportedLocation);
    const toleranceKm = 1; // 1km tolerance
    
    if (distance > toleranceKm) {
      console.warn(`Photo location (${exifLocation.lat}, ${exifLocation.lng}) doesn't match reported location (${reportedLocation.lat}, ${reportedLocation.lng}). Distance: ${distance.toFixed(2)}km`);
    }
  }

  private calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async optimizeForWeb(file: File): Promise<{
    original: Blob;
    thumbnail: Blob;
    dimensions: { width: number; height: number };
  }> {
    // Create canvas for image processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Load image
    const img = await this.loadImage(file);
    const dimensions = { width: img.width, height: img.height };

    // Calculate optimized dimensions
    const originalDimensions = this.calculateOptimizedDimensions(
      img.width, 
      img.height, 
      this.config.maxWidth, 
      this.config.maxHeight
    );

    // Create optimized original
    canvas.width = originalDimensions.width;
    canvas.height = originalDimensions.height;
    ctx.drawImage(img, 0, 0, originalDimensions.width, originalDimensions.height);
    const originalBlob = await this.canvasToBlob(canvas, this.config.quality);

    // Create thumbnail
    const thumbnailSize = this.config.thumbnailSize;
    canvas.width = thumbnailSize;
    canvas.height = thumbnailSize;
    
    // Calculate crop for square thumbnail
    const crop = this.calculateSquareCrop(img.width, img.height);
    ctx.drawImage(
      img,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, thumbnailSize, thumbnailSize
    );
    const thumbnailBlob = await this.canvasToBlob(canvas, 0.8);

    return {
      original: originalBlob,
      thumbnail: thumbnailBlob,
      dimensions
    };
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private calculateOptimizedDimensions(
    width: number, 
    height: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    
    if (ratio >= 1) {
      return { width, height }; // No need to resize
    }
    
    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio)
    };
  }

  private calculateSquareCrop(width: number, height: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const size = Math.min(width, height);
    return {
      x: (width - size) / 2,
      y: (height - size) / 2,
      width: size,
      height: size
    };
  }

  private canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Could not create blob from canvas'));
        },
        'image/webp',
        quality
      );
    });
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    const img = await this.loadImage(file);
    return { width: img.width, height: img.height };
  }
}
