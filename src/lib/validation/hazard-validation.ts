import { z } from 'zod';

/**
 * Comprehensive validation schemas for hazard submissions
 */

// Base coordinate validation
const CoordinateSchema = z.object({
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .refine(val => val !== 0, 'Latitude cannot be exactly 0'),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .refine(val => val !== 0, 'Longitude cannot be exactly 0')
});

// Boston area bounds validation (MVP focus)
const BostonBoundsSchema = CoordinateSchema.refine(
  ({ latitude, longitude }) => {
    const inBoston = latitude >= 42.2 && latitude <= 42.5 && 
                   longitude >= -71.3 && longitude <= -70.8;
    return inBoston;
  },
  {
    message: 'Location must be within the Greater Boston area for MVP (42.2°-42.5°N, -71.3°--70.8°W)'
  }
);

// Image file validation
const ImageFileSchema = z.instanceof(File)
  .refine(file => file.size <= 5 * 1024 * 1024, 'Image must be under 5MB')
  .refine(file => file.type.startsWith('image/'), 'File must be an image')
  .refine(
    file => ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.type),
    'Image must be JPEG, PNG, WebP, or HEIC format'
  );

// Hazard category path validation
const CategoryPathSchema = z.string()
  .regex(
    /^[a-z_]+\/[a-z_]+\/[a-z_]+$/,
    'Category path must follow format: category/subcategory/specific (e.g., plants/poisonous/poison_ivy)'
  )
  .refine(
    path => {
      const validPaths = [
        'plants/poisonous/poison_ivy',
        'plants/poisonous/poison_oak',
        'plants/thorns/multiflora_rose',
        'plants/thorns/blackberry',
        'insects/stinging/yellow_jacket',
        'insects/stinging/hornet',
        'insects/biting/mosquito',
        'insects/biting/tick',
        'animals/dangerous/coyote',
        'animals/dangerous/snake',
        'terrain/unstable/loose_rock',
        'terrain/unstable/steep_drop',
        'terrain/slippery/wet_rock',
        'terrain/slippery/ice',
        'water/contaminated/algae_bloom',
        'water/dangerous/strong_current',
        'user_generated/other/custom'
      ];
      return validPaths.includes(path) || path.startsWith('user_generated/');
    },
    'Invalid category path. Use predefined categories or user_generated/other/custom for new types'
  );

// Text content validation with profanity and spam checks
const TextContentSchema = z.string()
  .min(5, 'Content must be at least 5 characters')
  .max(500, 'Content must be under 500 characters')
  .refine(
    text => {
      const profanityWords = ['fuck', 'shit', 'damn', 'bitch', 'asshole'];
      const lowerText = text.toLowerCase();
      return !profanityWords.some(word => lowerText.includes(word));
    },
    'Content contains inappropriate language'
  )
  .refine(
    text => {
      const spamIndicators = [
        'buy now', 'click here', 'free money', 'limited time offer',
        'call now', 'act fast', 'guaranteed', 'no risk'
      ];
      const lowerText = text.toLowerCase();
      return !spamIndicators.some(phrase => lowerText.includes(phrase));
    },
    'Content appears to be spam'
  )
  .refine(
    text => {
      // Check for excessive repetition
      const repeatedChars = /(.)\1{5,}/;
      const repeatedWords = /\b(\w+)\s+\1\s+\1\b/i;
      return !repeatedChars.test(text) && !repeatedWords.test(text);
    },
    'Content contains excessive repetition'
  );

// Severity level validation
const SeveritySchema = z.number()
  .int('Severity must be a whole number')
  .min(1, 'Severity must be between 1 and 5')
  .max(5, 'Severity must be between 1 and 5');

// Main hazard submission schema
export const HazardSubmissionSchema = z.object({
  title: TextContentSchema
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title must be under 100 characters'),
    
  description: TextContentSchema
    .min(20, 'Description must be at least 20 characters')
    .max(500, 'Description must be under 500 characters'),
    
  category_path: CategoryPathSchema,
  
  location: BostonBoundsSchema,
  
  severity_level: SeveritySchema,
  
  images: z.array(ImageFileSchema)
    .min(1, 'At least one image is required')
    .max(5, 'Maximum 5 images allowed'),
    
  additional_notes: z.string()
    .max(200, 'Additional notes must be under 200 characters')
    .optional(),
    
  is_seasonal: z.boolean().default(false),
  
  active_months: z.array(z.number().min(1).max(12))
    .max(12, 'Cannot specify more than 12 months')
    .optional(),
    
  // User agreement fields
  location_accurate: z.boolean()
    .refine(val => val === true, 'You must confirm the location is accurate'),
    
  content_appropriate: z.boolean()
    .refine(val => val === true, 'You must confirm the content is appropriate'),
    
  own_photo: z.boolean()
    .refine(val => val === true, 'You must confirm you own the rights to the photos')
});

// Image upload schema (standalone)
export const ImageUploadSchema = z.object({
  hazard_id: z.string().uuid('Invalid hazard ID'),
  images: z.array(ImageFileSchema)
    .min(1, 'At least one image is required')
    .max(3, 'Maximum 3 images allowed per upload'),
  description: z.string()
    .max(100, 'Image description must be under 100 characters')
    .optional()
});

// Template creation schema (for user-generated hazard types)
export const HazardTemplateSchema = z.object({
  name: z.string()
    .min(3, 'Template name must be at least 3 characters')
    .max(50, 'Template name must be under 50 characters')
    .regex(/^[a-zA-Z\s-]+$/, 'Template name can only contain letters, spaces, and hyphens'),
    
  scientific_name: z.string()
    .max(100, 'Scientific name must be under 100 characters')
    .regex(/^[a-zA-Z\s.-]*$/, 'Scientific name can only contain letters, spaces, periods, and hyphens')
    .optional(),
    
  category_suggestion: z.string()
    .min(5, 'Category suggestion must be at least 5 characters')
    .max(200, 'Category suggestion must be under 200 characters'),
    
  description: TextContentSchema
    .min(50, 'Description must be at least 50 characters')
    .max(500, 'Description must be under 500 characters'),
    
  identification_tips: z.string()
    .min(20, 'Identification tips must be at least 20 characters')
    .max(300, 'Identification tips must be under 300 characters'),
    
  safety_notes: z.string()
    .min(10, 'Safety notes must be at least 10 characters')
    .max(200, 'Safety notes must be under 200 characters'),
    
  reference_images: z.array(ImageFileSchema)
    .min(1, 'At least one reference image is required')
    .max(3, 'Maximum 3 reference images allowed'),
    
  regional_notes: z.string()
    .max(200, 'Regional notes must be under 200 characters')
    .optional(),
    
  seasonal_info: z.object({
    is_seasonal: z.boolean(),
    active_months: z.array(z.number().min(1).max(12)).optional(),
    peak_months: z.array(z.number().min(1).max(12)).optional(),
    notes: z.string().max(100).optional()
  }).optional()
});

// User rating/verification schema
export const HazardRatingSchema = z.object({
  hazard_id: z.string().uuid('Invalid hazard ID'),
  accuracy_rating: z.number()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  severity_rating: z.number()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  location_verified: z.boolean(),
  notes: z.string()
    .max(200, 'Notes must be under 200 characters')
    .optional()
});

// Validation result types
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  warnings?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validate hazard submission with detailed error reporting
 */
export function validateHazardSubmission(data: unknown): ValidationResult<z.infer<typeof HazardSubmissionSchema>> {
  try {
    const result = HazardSubmissionSchema.parse(data);
    
    // Additional business logic validations
    const warnings: string[] = [];
    
    // Check if location is in a high-traffic area (could be duplicate)
    if (result.location.latitude > 42.35 && result.location.latitude < 42.37 &&
        result.location.longitude > -71.06 && result.location.longitude < -71.04) {
      warnings.push('Location is in downtown Boston - verify this is not a duplicate submission');
    }
    
    // Check severity vs category alignment
    if (result.category_path.includes('poisonous') && result.severity_level < 3) {
      warnings.push('Poisonous plants typically have severity 3+. Consider reviewing severity rating');
    }
    
    if (result.category_path.includes('dangerous') && result.severity_level < 4) {
      warnings.push('Dangerous animals typically have severity 4+. Consider reviewing severity rating');
    }
    
    return {
      success: true,
      data: result,
      warnings
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      
      return {
        success: false,
        errors
      };
    }
    
    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: 'An unexpected validation error occurred',
        code: 'UNKNOWN_ERROR'
      }]
    };
  }
}

/**
 * Quick validation for real-time feedback
 */
export function validateField(fieldName: string, value: any): ValidationError | null {
  try {
    switch (fieldName) {
      case 'title':
        HazardSubmissionSchema.shape.title.parse(value);
        break;
      case 'description':
        HazardSubmissionSchema.shape.description.parse(value);
        break;
      case 'location':
        HazardSubmissionSchema.shape.location.parse(value);
        break;
      case 'category_path':
        HazardSubmissionSchema.shape.category_path.parse(value);
        break;
      case 'severity_level':
        HazardSubmissionSchema.shape.severity_level.parse(value);
        break;
      default:
        return null;
    }
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        field: fieldName,
        message: error.issues[0].message,
        code: error.issues[0].code
      };
    }
    return {
      field: fieldName,
      message: 'Validation error',
      code: 'VALIDATION_ERROR'
    };
  }
}

/**
 * Batch validate multiple submissions (for admin import)
 */
export function validateBatch(submissions: unknown[]): {
  valid: Array<{ index: number; data: z.infer<typeof HazardSubmissionSchema> }>;
  invalid: Array<{ index: number; errors: ValidationError[] }>;
} {
  const valid: Array<{ index: number; data: z.infer<typeof HazardSubmissionSchema> }> = [];
  const invalid: Array<{ index: number; errors: ValidationError[] }> = [];
  
  submissions.forEach((submission, index) => {
    const result = validateHazardSubmission(submission);
    if (result.success && result.data) {
      valid.push({ index, data: result.data });
    } else {
      invalid.push({ index, errors: result.errors || [] });
    }
  });
  
  return { valid, invalid };
}