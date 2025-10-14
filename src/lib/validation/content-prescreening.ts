// External library imports
import type { z } from 'zod';

// Internal utility imports
import { validateHazardSubmission, HazardSubmissionSchema } from '$lib/validation/hazard-validation';

/**
 * Automated content pre-screening service
 * Analyzes submissions before they reach human moderators
 */

export interface PreScreeningConfig {
  enabled: boolean;
  confidence_threshold: number; // 0-1, higher = more strict
  auto_approve_threshold: number; // Trust score required for auto-approval
  auto_reject_threshold: number; // Confidence required for auto-rejection
  flagging_enabled: boolean;
  duplicate_detection: boolean;
}

export const DEFAULT_PRESCREENING_CONFIG: PreScreeningConfig = {
  enabled: true,
  confidence_threshold: 0.7,
  auto_approve_threshold: 500, // High trust users
  auto_reject_threshold: 0.9, // Very confident rejections
  flagging_enabled: true,
  duplicate_detection: true
};

export interface ScreeningResult {
  action: 'approve' | 'reject' | 'flag' | 'review';
  confidence: number;
  reasons: string[];
  risk_level: 'low' | 'medium' | 'high';
  requires_human_review: boolean;
  estimated_review_time: number; // minutes
}

export class ContentPreScreening {
  constructor(
    private config: PreScreeningConfig = DEFAULT_PRESCREENING_CONFIG
  ) {}

  /**
   * Comprehensive pre-screening analysis for hazard submissions before human moderation.
   * Performs schema validation, content analysis, spam detection, and location verification
   * to automatically approve safe content or flag problematic submissions for review.
   * 
   * @param submission - Raw submission data to analyze (will be validated against schema)
   * @param userTrustScore - User's trust score from 0-100, affects approval thresholds
   * @returns Promise resolving to ScreeningResult with automated decision and confidence
   * 
   * @example
   * ```typescript
   * const screening = new ContentPreScreening(config);
   * const result = await screening.screenHazardSubmission({
   *   title: 'Poison ivy near playground',
   *   description: 'Large patch growing by swings',
   *   location: { latitude: 42.3601, longitude: -71.0589 },
   *   category_path: 'plants/poisonous/poison_ivy',
   *   severity_level: 3
   * }, 75);
   * 
   * if (result.decision === 'approve') {
   *   // Auto-publish trusted content
   * } else if (result.decision === 'reject') {
   *   // Auto-reject spam/inappropriate content
   * } else {
   *   // Queue for human moderation
   * }
   * ```
   */
  async screenHazardSubmission(
    submission: unknown,
    userTrustScore: number = 0
  ): Promise<ScreeningResult> {
    
    if (!this.config.enabled) {
      return this.createReviewResult('Pre-screening disabled');
    }

    try {
      // 1. Schema validation
      const validationResult = validateHazardSubmission(submission);
      if (!validationResult.success) {
        return this.createRejectResult(
          'Failed schema validation',
          validationResult.errors?.map(e => e.message) || ['Invalid submission format'],
          0.95
        );
      }

      const data = validationResult.data!;
      const reasons: string[] = [];
      let riskScore = 0;
      let confidence = 0;

      // 2. Content analysis
      const textAnalysis = await this.analyzeText(data.title + ' ' + data.description);
      riskScore += textAnalysis.risk_score;
      confidence = Math.max(confidence, textAnalysis.confidence);
      reasons.push(...textAnalysis.flags);

      // 3. Location analysis
      const locationAnalysis = await this.analyzeLocation(data.location);
      riskScore += locationAnalysis.risk_score;
      confidence = Math.max(confidence, locationAnalysis.confidence);
      reasons.push(...locationAnalysis.flags);

      // 4. Image analysis (basic checks)
      const imageAnalysis = await this.analyzeImages(data.images);
      riskScore += imageAnalysis.risk_score;
      confidence = Math.max(confidence, imageAnalysis.confidence);
      reasons.push(...imageAnalysis.flags);

      // 5. Duplicate detection
      if (this.config.duplicate_detection) {
        const duplicateAnalysis = await this.checkDuplicates(data);
        riskScore += duplicateAnalysis.risk_score;
        confidence = Math.max(confidence, duplicateAnalysis.confidence);
        reasons.push(...duplicateAnalysis.flags);
      }

      // 6. User trust score consideration
      const trustAdjustment = this.calculateTrustAdjustment(userTrustScore);
      riskScore *= trustAdjustment.multiplier;
      reasons.push(...trustAdjustment.notes);

      // 7. Determine final action
      return this.determineAction(riskScore, confidence, reasons, userTrustScore);

    } catch (error) {
      console.error('Pre-screening error:', error);
      return this.createReviewResult('Error during automated screening');
    }
  }

  /**
   * Analyze text content for spam, inappropriate language, and quality
   */
  private async analyzeText(text: string): Promise<{
    risk_score: number;
    confidence: number;
    flags: string[];
  }> {
    const flags: string[] = [];
    let riskScore = 0;
    let confidence = 0.6; // Base confidence for text analysis

    const lowerText = text.toLowerCase();

    // Spam detection
    const spamPatterns = [
      /buy\s+now/i,
      /click\s+here/i,
      /free\s+money/i,
      /limited\s+time/i,
      /call\s+now/i,
      /guaranteed/i,
      /\$\d+/g, // Money amounts
      /https?:\/\/\S+/g, // URLs
      /\b\w+\.(com|org|net)\b/g // Domains
    ];

    const spamMatches = spamPatterns.filter(pattern => pattern.test(text)).length;
    if (spamMatches > 0) {
      riskScore += spamMatches * 0.3;
      confidence = 0.8;
      flags.push(`Contains ${spamMatches} spam indicator(s)`);
    }

    // Profanity check
    const profanityWords = [
      'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard',
      'crap', 'piss', 'cock', 'dick', 'pussy', 'whore'
    ];
    const profanityCount = profanityWords.filter(word => 
      lowerText.includes(word)
    ).length;

    if (profanityCount > 0) {
      riskScore += profanityCount * 0.4;
      confidence = 0.9;
      flags.push(`Contains ${profanityCount} inappropriate word(s)`);
    }

    // Length analysis
    if (text.length < 20) {
      riskScore += 0.3;
      flags.push('Content unusually short');
    } else if (text.length > 1000) {
      riskScore += 0.2;
      flags.push('Content unusually long');
    }

    // Repetition detection
    if (/(.{3,})\1{2,}/.test(text)) {
      riskScore += 0.5;
      confidence = 0.8;
      flags.push('Contains excessive repetition');
    }

    // All caps check
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 10) {
      riskScore += 0.3;
      flags.push('Excessive use of capital letters');
    }

    // Technical term validation (context-appropriate for hazards)
    const hazardTerms = [
      'poison', 'toxic', 'dangerous', 'hazard', 'warning', 'caution',
      'bite', 'sting', 'rash', 'irritation', 'allergic', 'reaction',
      'plant', 'animal', 'insect', 'terrain', 'water', 'weather'
    ];
    
    const hasRelevantTerms = hazardTerms.some(term => 
      lowerText.includes(term)
    );
    
    if (!hasRelevantTerms) {
      riskScore += 0.2;
      flags.push('Content may not be hazard-related');
    }

    return {
      risk_score: Math.min(riskScore, 1.0),
      confidence,
      flags
    };
  }

  /**
   * Analyze location data for validity and potential issues
   */
  private async analyzeLocation(location: { latitude: number; longitude: number }): Promise<{
    risk_score: number;
    confidence: number;
    flags: string[];
  }> {
    const flags: string[] = [];
    let riskScore = 0;
    let confidence = 0.7;

    // Check if coordinates are obviously invalid
    if (location.latitude === 0 && location.longitude === 0) {
      riskScore = 1.0;
      confidence = 1.0;
      flags.push('Invalid coordinates (0,0)');
      return { risk_score: riskScore, confidence, flags };
    }

    // Boston bounds check (our MVP area)
    const inBoston = location.latitude >= 42.2 && location.latitude <= 42.5 && 
                    location.longitude >= -71.3 && location.longitude <= -70.8;
    
    if (!inBoston) {
      riskScore += 0.8; // High risk - outside our supported area
      confidence = 0.95;
      flags.push('Location outside Greater Boston area');
    }

    // Check for common fake coordinates
    const fakeCoords = [
      { lat: 42.3601, lng: -71.0589 }, // Boston Common (too common)
      { lat: 42.3584, lng: -71.0636 }, // Exact center of Boston
    ];

    const isFake = fakeCoords.some(coord => 
      Math.abs(coord.lat - location.latitude) < 0.0001 &&
      Math.abs(coord.lng - location.longitude) < 0.0001
    );

    if (isFake) {
      riskScore += 0.6;
      confidence = 0.8;
      flags.push('Coordinates match common fake/test locations');
    }

    // Check precision (overly precise coordinates are suspicious)
    const latPrecision = location.latitude.toString().split('.')[1]?.length || 0;
    const lngPrecision = location.longitude.toString().split('.')[1]?.length || 0;

    if (latPrecision > 6 || lngPrecision > 6) {
      riskScore += 0.3;
      flags.push('Suspiciously precise coordinates');
    }

    return {
      risk_score: Math.min(riskScore, 1.0),
      confidence,
      flags
    };
  }

  /**
   * Analyze uploaded images for basic quality and appropriateness
   */
  private async analyzeImages(images: File[]): Promise<{
    risk_score: number;
    confidence: number;
    flags: string[];
  }> {
    const flags: string[] = [];
    let riskScore = 0;
    let confidence = 0.5; // Lower confidence without actual image analysis

    // Check number of images
    if (images.length === 0) {
      riskScore += 0.8;
      confidence = 0.9;
      flags.push('No images provided');
      return { risk_score: riskScore, confidence, flags };
    }

    if (images.length > 5) {
      riskScore += 0.3;
      flags.push('Too many images uploaded');
    }

    // Analyze each image
    for (const image of images) {
      // File size check
      if (image.size > 10 * 1024 * 1024) { // 10MB
        riskScore += 0.5;
        flags.push('Image file size too large');
      }

      if (image.size < 1024) { // 1KB
        riskScore += 0.7;
        flags.push('Image file size suspiciously small');
      }

      // File type check
      if (!image.type.startsWith('image/')) {
        riskScore += 0.9;
        confidence = 0.95;
        flags.push('Non-image file uploaded');
      }

      // Filename analysis
      const filename = image.name.toLowerCase();
      
      // Suspicious filenames
      if (filename.includes('test') || filename.includes('sample') || 
          filename.includes('fake') || filename.includes('spam')) {
        riskScore += 0.6;
        flags.push('Suspicious filename detected');
      }

      // Generic filenames (could indicate stock photos)
      if (/^(img_|image_|photo_|dsc_)\d+\.(jpg|jpeg|png)$/.test(filename)) {
        riskScore += 0.2;
        flags.push('Generic filename suggests possible stock photo');
      }
    }

    return {
      risk_score: Math.min(riskScore, 1.0),
      confidence,
      flags
    };
  }

  /**
   * Check for potential duplicate submissions
   */
  private async checkDuplicates(data: z.infer<typeof HazardSubmissionSchema>): Promise<{
    risk_score: number;
    confidence: number;
    flags: string[];
  }> {
    const flags: string[] = [];
    let riskScore = 0;
    let confidence = 0.6;

    try {
      // In a real implementation, this would query the database
      // For now, we'll do basic checks

      // Check for suspiciously similar titles
      const commonTitles = [
        'poison ivy warning',
        'dangerous plant',
        'hazardous area',
        'warning dangerous',
        'be careful here'
      ];

      const titleSimilar = commonTitles.some(common => 
        data.title.toLowerCase().includes(common.toLowerCase()) ||
        common.toLowerCase().includes(data.title.toLowerCase())
      );

      if (titleSimilar) {
        riskScore += 0.4;
        flags.push('Title similar to common submissions');
      }

      // NOTE: Advanced duplicate detection would require database queries
      // Future enhancement would check for:
      // - Same location within 50 meters (using PostGIS)
      // - Similar content within 24 hours (using text similarity algorithms)
      // - Same user submitting multiple times (rate limiting)
      // Basic location duplicate detection is implemented in moderation.ts

    } catch (error) {
      console.error('Duplicate check error:', error);
      flags.push('Unable to check for duplicates');
    }

    return {
      risk_score: Math.min(riskScore, 1.0),
      confidence,
      flags
    };
  }

  /**
   * Calculate trust score adjustment
   */
  private calculateTrustAdjustment(userTrustScore: number): {
    multiplier: number;
    notes: string[];
  } {
    const notes: string[] = [];
    let multiplier = 1.0;

    if (userTrustScore >= 500) {
      multiplier = 0.3; // Highly trusted users get big risk reduction
      notes.push('High trust user (500+)');
    } else if (userTrustScore >= 200) {
      multiplier = 0.5; // Trusted users get moderate reduction
      notes.push('Trusted user (200+)');
    } else if (userTrustScore >= 50) {
      multiplier = 0.8; // Contributors get small reduction
      notes.push('Contributing user (50+)');
    } else if (userTrustScore === 0) {
      multiplier = 1.3; // New users get increased scrutiny
      notes.push('New user (0 trust score)');
    }

    return { multiplier, notes };
  }

  /**
   * Determine final action based on all analysis
   */
  private determineAction(
    riskScore: number,
    confidence: number,
    reasons: string[],
    userTrustScore: number
  ): ScreeningResult {
    
    // Auto-approve for high-trust users with low-risk content
    if (userTrustScore >= this.config.auto_approve_threshold && riskScore < 0.2) {
      return {
        action: 'approve',
        confidence: Math.min(confidence + 0.2, 1.0),
        reasons: ['Auto-approved: High trust user with low-risk content'],
        risk_level: 'low',
        requires_human_review: false,
        estimated_review_time: 0
      };
    }

    // Auto-reject for high-confidence, high-risk content
    if (confidence >= this.config.auto_reject_threshold && riskScore >= 0.8) {
      return {
        action: 'reject',
        confidence,
        reasons: ['Auto-rejected: High confidence rejection', ...reasons],
        risk_level: 'high',
        requires_human_review: false,
        estimated_review_time: 0
      };
    }

    // Flag for review based on risk level
    const riskLevel = riskScore >= 0.6 ? 'high' : 
                     riskScore >= 0.3 ? 'medium' : 'low';

    if (riskLevel === 'high' && this.config.flagging_enabled) {
      return {
        action: 'flag',
        confidence,
        reasons: ['Flagged for review: High risk content', ...reasons],
        risk_level: riskLevel,
        requires_human_review: true,
        estimated_review_time: 15 // minutes
      };
    }

    // Default to human review
    const estimatedTime = riskLevel === 'high' ? 15 :
                         riskLevel === 'medium' ? 8 : 5;

    return {
      action: 'review',
      confidence,
      reasons: reasons.length > 0 ? reasons : ['Standard review required'],
      risk_level: riskLevel,
      requires_human_review: true,
      estimated_review_time: estimatedTime
    };
  }

  /**
   * Helper methods for creating standard results
   */
  private createRejectResult(reason: string, details: string[], confidence: number): ScreeningResult {
    return {
      action: 'reject',
      confidence,
      reasons: [reason, ...details],
      risk_level: 'high',
      requires_human_review: false,
      estimated_review_time: 0
    };
  }

  private createReviewResult(reason: string): ScreeningResult {
    return {
      action: 'review',
      confidence: 0.5,
      reasons: [reason],
      risk_level: 'medium',
      requires_human_review: true,
      estimated_review_time: 10
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PreScreeningConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): PreScreeningConfig {
    return { ...this.config };
  }
}