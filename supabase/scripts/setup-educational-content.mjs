#!/usr/bin/env node

/**
 * Setup Script for Educational Content Structure
 * 
 * This script creates the initial folder structure and template files
 * in the hazard-educational-content Supabase Storage bucket.
 * 
 * Run: node supabase/scripts/setup-educational-content.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = join(__dirname, '../../.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('❌ Could not read .env.local file:', error.message);
    return {};
  }
}

const env = loadEnvFile();

// Initialize Supabase client from environment variables
// Use service role key for admin operations
const supabaseUrl = env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env.local file.');
  console.error('This script requires SUPABASE_SERVICE_ROLE_KEY for admin access.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'hazard-educational-content';

// Template content for markdown files
const TEMPLATES = {
  overview: `# [Hazard Name]

## Quick Facts
- **Scientific Name:** [Latin name if applicable]
- **Danger Level:** [1-5 scale]
- **Active Season:** [Months or year-round]
- **Common Locations:** [Where typically found]
- **Affected Regions:** [Geographic areas]

## Description
[General description of the hazard, 2-3 paragraphs]

## Why It's Dangerous
[Explanation of the risks and potential harm]

## Related Resources
- [Link to identification guide](#identification)
- [Link to treatment information](#treatment)
- [External resources]
`,

  identification: `# How to Identify [Hazard Name]

## Visual Identification

### Key Features
1. **[Feature 1]:** [Description]
2. **[Feature 2]:** [Description]
3. **[Feature 3]:** [Description]

### Common Look-alikes
- **[Similar hazard/object]:** How to tell them apart
- **[Similar hazard/object]:** Key differences

## Photos & Diagrams
[Images should be added to the /images folder]

## Seasonal Variations
[How appearance changes throughout the year]

## Regional Differences
[How it varies by location]
`,

  symptoms: `# Symptoms of [Hazard Name] Exposure

## Immediate Symptoms
- **[Symptom 1]:** [Description and timeline]
- **[Symptom 2]:** [Description and timeline]
- **[Symptom 3]:** [Description and timeline]

## Delayed Symptoms
[Symptoms that may appear hours or days later]

## Severity Indicators
### Mild Exposure
[Description of mild symptoms]

### Moderate Exposure
[Description of moderate symptoms]

### Severe Exposure
[Description of severe symptoms requiring immediate medical attention]

## When to Seek Medical Help
[Clear guidelines on when professional medical care is needed]
`,

  treatment: `# Treatment for [Hazard Name] Exposure

## Immediate Response
### Do This First
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Do NOT Do This
- [Action to avoid]
- [Action to avoid]

## First Aid Treatment
[Detailed first aid instructions]

## Medical Treatment
[When and how to seek professional medical care]

## Long-term Care
[Follow-up care and monitoring]

## Home Remedies
[Safe, evidence-based home treatments if applicable]

⚠️ **Disclaimer:** This information is for educational purposes only and is not a substitute for professional medical advice.
`,

  prevention: `# Preventing [Hazard Name] Exposure

## Avoidance Strategies
- **[Strategy 1]:** [Description]
- **[Strategy 2]:** [Description]
- **[Strategy 3]:** [Description]

## Protective Equipment
[Recommended gear and clothing]

## Environmental Awareness
[How to identify areas where this hazard is likely to be found]

## Seasonal Precautions
[Time-specific prevention advice]

## For Children and Pets
[Special considerations for vulnerable populations]

## Emergency Preparedness
[What to have on hand in case of exposure]
`,

  regional_notes: `# Regional Differences for [Hazard Name]

## US Northeast
- **Active Season:** [Months]
- **Peak Danger:** [Months]
- **Common Locations:** [Specific habitats]
- **Notes:** [Regional-specific information]

## US Southeast
- **Active Season:** [Months]
- **Peak Danger:** [Months]
- **Common Locations:** [Specific habitats]
- **Notes:** [Regional-specific information]

## US Midwest
- **Active Season:** [Months]
- **Peak Danger:** [Months]
- **Common Locations:** [Specific habitats]
- **Notes:** [Regional-specific information]

## US Southwest
- **Active Season:** [Months]
- **Peak Danger:** [Months]
- **Common Locations:** [Specific habitats]
- **Notes:** [Regional-specific information]

## US West
- **Active Season:** [Months]
- **Peak Danger:** [Months]
- **Common Locations:** [Specific habitats]
- **Notes:** [Regional-specific information]
`
};

// Initial folder structure with template hazards
const STRUCTURE = [
  {
    category: 'plants',
    subcategories: [
      {
        name: 'poisonous',
        hazards: ['poison_ivy', 'poison_oak', 'poison_sumac']
      },
      {
        name: 'thorns',
        hazards: ['multiflora_rose', 'blackberry', 'wild_rose']
      }
    ]
  },
  {
    category: 'insects',
    subcategories: [
      {
        name: 'ticks',
        hazards: ['deer_tick', 'dog_tick', 'lone_star_tick']
      },
      {
        name: 'stinging',
        hazards: ['yellow_jacket', 'bald_faced_hornet', 'paper_wasp']
      },
      {
        name: 'biting',
        hazards: ['mosquitos']
      }
    ]
  },
  {
    category: 'terrain',
    subcategories: [
      {
        name: 'unstable_ground',
        hazards: ['loose_rock', 'mudslide', 'steep_slope']
      },
      {
        name: 'water',
        hazards: ['swift_current', 'deep_water', 'hidden_drop_off']
      }
    ]
  },
  {
    category: 'animals',
    subcategories: [
      {
        name: 'bears',
        hazards: ['black_bear']
      },
      {
        name: 'snakes',
        hazards: ['copperhead', 'timber_rattlesnake']
      }
    ]
  }
];

/**
 * Upload a file to Supabase Storage
 */
async function uploadFile(path, content) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, content, {
      contentType: 'text/markdown',
      upsert: true
    });

  if (error) {
    console.error(`  ❌ Failed to upload ${path}:`, error.message);
    return false;
  }

  console.log(`  ✅ Created: ${path}`);
  return true;
}

/**
 * Create folder structure by uploading a placeholder file
 */
async function createFolder(path) {
  // Create a .gitkeep file to ensure the folder exists
  await uploadFile(`${path}/.gitkeep`, '');
}

/**
 * Main setup function
 */
async function setupContentStructure() {
  console.log('\n🚀 Setting up Educational Content Structure\n');
  console.log(`📦 Bucket: ${BUCKET_NAME}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const category of STRUCTURE) {
    console.log(`\n📁 Category: ${category.category}`);

    for (const subcategory of category.subcategories) {
      console.log(`\n  📂 Subcategory: ${subcategory.name}`);

      for (const hazard of subcategory.hazards) {
        const basePath = `${category.category}/${subcategory.name}/${hazard}`;
        console.log(`\n    📄 Hazard: ${hazard}`);

        // Create template markdown files
        for (const [filename, content] of Object.entries(TEMPLATES)) {
          const filePath = `${basePath}/${filename}.md`;
          const success = await uploadFile(filePath, content);
          if (success) successCount++;
          else errorCount++;
        }

        // Create images folder
        await createFolder(`${basePath}/images`);
        successCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n✨ Setup Complete!\n`);
  console.log(`  ✅ Successful uploads: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log('\n📋 Next Steps:');
  console.log('  1. Deploy Supawald CMS to manage content');
  console.log('  2. Review and customize template files');
  console.log('  3. Add images to the /images folders');
  console.log('  4. Update hazard_templates table with storage_path references');
  console.log('\n' + '='.repeat(60) + '\n');
}

// Run the setup
setupContentStructure().catch((error) => {
  console.error('\n❌ Setup failed:', error);
  process.exit(1);
});
