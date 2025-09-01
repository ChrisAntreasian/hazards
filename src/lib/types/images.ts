export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ProcessedImage {
  original: Blob;
  thumbnail: Blob;
  metadata: {
    timestamp: string;
    hasLocationData: boolean;
    fileSize: number;
    dimensions: { width: number; height: number };
  };
  validation: {
    isValid: boolean;
    locationVerified: boolean;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ImageUploadResult {
  id: string;
  originalUrl: string;
  thumbnailUrl: string;
  metadata: ProcessedImage['metadata'];
}

export interface HazardImage {
  id: string;
  hazard_id: string;
  user_id: string;
  original_url: string;
  thumbnail_url: string;
  vote_score: number;
  user_vote?: 'up' | 'down' | null;
  uploaded_at: string;
  metadata: {
    timestamp: string;
    fileSize: number;
    dimensions: { width: number; height: number };
  };
}
