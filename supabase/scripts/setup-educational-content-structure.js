/**
 * Script to set up initial educational content structure in Supabase Storage
 * 
 * This script creates the folder hierarchy and initial markdown files
 * for Boston-area hazards in the hazard-educational-content bucket.
 * 
 * Run with: node supabase/scripts/setup-educational-content-structure.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service key for admin access

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initial content structure for Boston-area hazards
const contentStructure = {
  'plants/poisonous/poison_ivy': {
    'overview.md': `# Poison Ivy Overview

Poison ivy (*Toxicodendron radicans*) is a common plant found throughout Eastern North America, particularly prevalent in the Boston area and New England region.

## Quick Facts
- **Scientific Name**: Toxicodendron radicans
- **Prevalence**: Very common in Massachusetts
- **Season**: Active from spring through fall
- **Danger Level**: Moderate to High (causes severe allergic reactions)

## What Makes It Dangerous
The plant contains urushiol oil, which causes an allergic reaction in about 85% of people who come into contact with it.
`,
    'identification.md': `# How to Identify Poison Ivy

## The "Leaves of Three" Rule
Remember: **"Leaves of three, let it be!"**

Poison ivy always has three leaflets per leaf stem.

## Key Identification Features

### Leaf Characteristics
- **Compound leaves** with three leaflets
- **Middle leaflet** has a longer stem than the two side leaflets
- **Leaf edges** can be smooth, toothed, or lobed
- **Leaf surface** is usually shiny (glossy appearance)
- **Color variations**: Green in summer, red/orange in fall

### Growth Patterns
- Can grow as a **vine** (climbing trees)
- Can grow as a **shrub** (ground cover, up to 4 feet tall)
- **Aerial roots** (hairy, rootlet-like structures on vines)

### Seasonal Appearance
- **Spring**: Reddish or bronze new leaves
- **Summer**: Green, glossy leaves
- **Fall**: Brilliant red, orange, or yellow foliage
- **Winter**: Bare stems with visible aerial roots

## Look-Alikes to Avoid Confusion
- Virginia Creeper (has 5 leaflets, not 3)
- Boxelder seedlings (opposite leaf arrangement)
- Fragrant Sumac (fuzzy stems and leaves)
`,
    'symptoms.md': `# Poison Ivy Symptoms and Timeline

## Initial Contact
- **Timeframe**: 12-48 hours after exposure (sometimes up to 5 days)
- **First Signs**: Mild itching, redness

## Full Reaction Development

### Early Stage (1-2 days)
- Intense itching
- Redness and inflammation
- Swelling in affected areas

### Peak Stage (3-7 days)
- **Rash formation**: Red, raised bumps or streaks
- **Blisters**: Small to large, fluid-filled bumps
- **Oozing**: Clear fluid from broken blisters (not contagious)
- **Severe itching**: Often interferes with sleep

### Healing Stage (1-3 weeks)
- Blisters begin to crust over
- Itching gradually subsides
- Skin may peel or flake

## Severity Indicators

### Mild Reaction
- Small patches of rash
- Minimal swelling
- Manageable itching

### Moderate Reaction
- Large areas of rash
- Multiple blisters
- Significant swelling

### Severe Reaction (Seek Medical Attention)
- **Rash on face, eyes, mouth, or genitals**
- **Difficulty breathing or swallowing**
- **Rash covers large portion of body (>25%)**
- **Severe swelling**
- **Signs of infection**: Pus, increasing pain, fever

## Important Notes
- The rash itself is NOT contagious
- Fluid from blisters does NOT spread the rash
- Only urushiol oil can cause new rashes
- Delayed reactions in different body areas are due to varying skin sensitivity
`,
    'treatment.md': `# Poison Ivy Treatment Guide

## Immediate Actions (First Hour After Contact)

### If You Know You've Touched Poison Ivy
1. **DO NOT TOUCH** other parts of your body
2. **Remove contaminated clothing** (carefully, avoid contact)
3. **Wash exposed skin immediately**:
   - Use **cold water** (warm opens pores)
   - Use **dish soap or dedicated cleanser** (Tecnu, Zanfel)
   - Scrub gently for 15-20 minutes
   - Clean under fingernails thoroughly
4. **Wash all contaminated items**:
   - Clothing, shoes, tools, pet fur
   - Use hot water and detergent
   - Wash separately from other laundry

## Home Treatment (For Mild to Moderate Cases)

### Topical Treatments
- **Calamine lotion**: Relieves itching, dries oozing
- **Hydrocortisone cream** (1%): Reduces inflammation
- **Colloidal oatmeal baths**: Soothes skin
- **Baking soda paste**: Mix with water, apply to rash
- **Cold compresses**: Reduce swelling and itching

### Oral Medications
- **Antihistamines**: Diphenhydramine (Benadryl) for itching and sleep
- **Pain relievers**: Ibuprofen or acetaminophen for discomfort

### Do's and Don'ts
**DO:**
- Keep rash clean and dry
- Trim fingernails to prevent scratching damage
- Wear loose, soft clothing
- Use clean towels and bedding

**DON'T:**
- Scratch the rash (can cause infection)
- Use hot water (increases itching)
- Pop blisters intentionally
- Apply butter, gasoline, or other folk remedies

## When to See a Doctor

Seek medical attention if:
- Rash on face, eyes, mouth, or genitals
- Rash covers >25% of body
- Severe swelling
- Signs of infection (pus, increasing pain, fever)
- Difficulty breathing or swallowing
- No improvement after 7-10 days

## Medical Treatments

### Prescription Options
- **Oral corticosteroids** (Prednisone): For severe cases
- **Prescription-strength topical steroids**: For localized severe reactions
- **Antibiotics**: If bacterial infection develops

## Boston-Area Resources
- **Emergency Rooms**: Boston Medical Center, Massachusetts General Hospital
- **Urgent Care**: Many locations throughout Boston metro area
- **Dermatologists**: Consider for severe or recurring cases
`,
    'prevention.md': `# Poison Ivy Prevention Guide

## Before Outdoor Activities

### Learn to Identify
- Study poison ivy identification features
- Practice recognition in different seasons
- Download plant identification apps
- Take photos for reference

### Protective Clothing
- **Long sleeves and pants**: Even in warm weather
- **Closed-toe shoes or boots**: Never sandals
- **Gloves**: Especially when gardening or handling plants
- **Barrier creams**: Apply before exposure (IvyBlock, etc.)

### Plan Your Route
- Stay on maintained trails
- Avoid overgrown areas
- Check trail conditions before hiking
- Learn common poison ivy habitats

## During Outdoor Activities

### Stay Alert
- Watch where you walk
- Don't brush against vegetation
- Be extra careful in wooded areas
- Inspect rest areas before sitting

### If You Encounter Poison Ivy
- **Do NOT touch** to test if it's poison ivy
- **Go around** rather than through
- **Keep pets away** (oil can transfer from fur)
- **Mark location** if on your property

## After Outdoor Activities

### Immediate Actions (Within 1 Hour)
1. **Remove clothing** carefully (avoid contact)
2. **Wash exposed skin** with cold water and soap
3. **Clean under fingernails** thoroughly
4. **Wash contaminated items** separately
5. **Wipe down gear**: Boots, tools, backpacks

### Pet Care
- **Bathe pets** if they've been in poison ivy areas
- **Wear gloves** when bathing
- **Use pet-safe shampoo**

## Property Management (Boston Area)

### Yard Maintenance
- **Regular inspection**: Check for poison ivy monthly (April-October)
- **Professional removal**: Consider hiring experts
- **Never burn**: Smoke contains urushiol, can cause severe lung reactions

### DIY Removal (Use Caution)
**Safety First:**
- Wear full protective clothing
- Use disposable gloves
- Work in cool, calm conditions
- Have washing station ready

**Removal Methods:**
1. **Physical removal**: Pull up roots (careful disposal)
2. **Herbicides**: Glyphosate or triclopyr (follow label)
3. **Smothering**: Cover with thick cardboard/plastic for season

**Disposal:**
- **Never compost** poison ivy
- **Bag in heavy-duty plastic** bags
- **Check local regulations** for disposal
- **Never burn** (dangerous)

## Special Considerations

### For Gardeners
- Inspect new plants before planting
- Check tool handles after use
- Wash gardening gloves regularly
- Create poison ivy-free zones around gardens

### For Parents
- Teach children identification
- Supervise outdoor play areas
- Check playground equipment
- Keep first aid supplies ready

### For Pet Owners
- Regularly check walking routes
- Bathe pets after woodland adventures
- Keep pets on leash in unfamiliar areas
- Know your veterinarian's contact info

## Boston-Area Specific Tips
- **Peak season**: May through September
- **Common locations**: 
  - Arnold Arboretum
  - Middlesex Fells Reservation
  - Blue Hills Reservation
  - Charles River paths
- **City parks**: Often maintained, but edges can have growth
- **Suburban yards**: Very common in wooded lot perimeters
`
  },
  'insects/ticks/deer_tick': {
    'overview.md': `# Deer Tick (Black-legged Tick) Overview

The deer tick (*Ixodes scapularis*), also known as the black-legged tick, is the primary vector for Lyme disease in the Northeastern United States, including the Boston area.

## Quick Facts
- **Scientific Name**: Ixodes scapularis
- **Size**: Very small (poppy seed to sesame seed)
- **Prevalence**: Very high in Massachusetts
- **Season**: Active year-round, peaks in spring and fall
- **Danger Level**: High (transmits Lyme disease and other illnesses)

## Why It's a Serious Concern
Massachusetts has one of the highest rates of Lyme disease in the United States. The Boston area and surrounding suburbs are endemic zones for tick-borne illnesses.

## Diseases Transmitted
- **Lyme disease** (most common)
- **Anaplasmosis**
- **Babesiosis**
- **Powassan virus** (rare but serious)
- **Borrelia miyamotoi disease**
`,
    'identification.md': `# How to Identify Deer Ticks

## Size Comparison
Deer ticks are extremely small, making them hard to spot:

- **Larva**: Size of a period (.) at end of sentence
- **Nymph**: Size of a poppy seed (most dangerous stage)
- **Adult female**: Size of a sesame seed before feeding
- **Engorged**: Can swell to 10x original size after feeding

## Visual Identification

### Unfed Deer Tick
- **Color**: Dark brown to black legs, reddish-brown to black body
- **Shape**: Flat, oval body
- **Legs**: 8 legs (adults), 6 legs (larvae)
- **Size**: Pinhead to sesame seed

### Female vs Male
- **Female**: Larger, red-orange posterior (back end)
- **Male**: Smaller, entirely dark brown/black
- **Important**: Females are the ones that engorge and transmit disease most often

### Engorged (Fed) Tick
- **Color**: Gray-blue to olive
- **Size**: Pea-sized or larger
- **Shape**: Round, balloon-like
- **Attachment**: Firmly attached to skin

## Life Stages and Risk

### Nymph Stage (Greatest Risk)
- **Size**: Poppy seed (1-2mm)
- **Active**: Late spring through summer (May-July in Boston)
- **Why dangerous**: 
  - Hard to see and feel
  - Responsible for most Lyme disease cases
  - People don't notice them

### Adult Stage
- **Size**: Sesame seed (3-5mm)
- **Active**: Fall and spring (October-May)
- **Why concerning**: 
  - Easier to spot but still small
  - Still transmit disease
  - Active even on warm winter days (>40°F)

## Look-Alikes to Avoid Confusion

### Dog Tick (American Dog Tick)
- **Larger**: 5mm unfed, distinct white markings
- **Less dangerous**: Doesn't carry Lyme disease
- **Found**: More in grassy areas, less in woods

### Lone Star Tick
- **Identifier**: White spot on female's back
- **Range**: Expanding northward but less common in MA
- **Danger**: Causes alpha-gal allergy (red meat allergy)
`,
    'diseases.md': `# Tick-Borne Diseases in the Boston Area

## Lyme Disease (Most Common)

### What It Is
Caused by bacteria *Borrelia burgdorferi*, transmitted by infected deer ticks.

### Transmission Time
- **Needs 36-48 hours** of attachment for transmission
- **Nymphs**: May transmit faster due to small size (go unnoticed longer)

### Symptoms and Stages

#### Early Localized (3-30 days)
- **Bull's-eye rash** (erythema migrans): 70-80% of cases
  - Circular, expanding red rash
  - Clear center (but not always)
  - Not itchy or painful
  - Can appear anywhere on body
- Fever, chills
- Fatigue
- Headache
- Muscle and joint aches

#### Early Disseminated (Days to months)
- Multiple rashes on different body parts
- Facial palsy (Bell's palsy)
- Severe headaches and neck stiffness
- Heart palpitations (Lyme carditis)
- Dizziness, shortness of breath

#### Late Disseminated (Months to years)
- Severe joint pain and swelling (especially knees)
- Neurological problems:
  - Memory issues
  - Difficulty concentrating
  - Sleep disturbances
- Heart problems

### Treatment
- **Early stage**: 2-4 weeks of oral antibiotics (doxycycline)
- **Later stages**: May need IV antibiotics
- **Key**: Early detection and treatment prevent complications

## Anaplasmosis

### What It Is
Bacterial infection (*Anaplasma phagocytophilum*)

### Symptoms (1-2 weeks after bite)
- High fever
- Severe headache
- Muscle aches
- Chills
- Nausea, vomiting
- Confusion (severe cases)
- **No rash** (unlike Lyme)

### Treatment
- Doxycycline (antibiotic)
- Must start promptly

## Babesiosis

### What It Is
Parasitic infection affecting red blood cells

### Risk Factors
- People over 50
- Those without a spleen
- Weakened immune system
- Can be life-threatening for at-risk groups

### Symptoms
- High fever
- Chills
- Sweats
- Fatigue
- Headache
- Body aches
- Hemolytic anemia (severe cases)

### Treatment
- Combination of medications (atovaquone + azithromycin)
- May require hospitalization

## Powassan Virus (Rare but Serious)

### What It Is
Rare viral infection, fastest-transmitting tick disease

### Transmission
- Can transmit in as little as **15 minutes**
- Much faster than Lyme disease

### Symptoms
- Fever
- Headache
- Vomiting
- Weakness
- Seizures (severe cases)
- Neurological damage (can be permanent)

### Treatment
- **No specific treatment**
- Supportive care only
- **Prevention is critical**

## Borrelia miyamotoi Disease

### What It Is
Related to Lyme disease bacteria but different

### Symptoms
- Similar to Lyme but **no rash**
- Relapsing fever
- Chills
- Headache
- Fatigue
- Muscle/joint pain

### Treatment
- Doxycycline (antibiotic)

## When to See a Doctor

### Seek immediate medical attention if:
- Bull's-eye rash appears
- Fever develops after tick bite
- Flu-like symptoms after outdoor activity
- Severe headache or stiff neck
- Heart palpitations or chest pain
- Facial paralysis
- Severe joint pain or swelling

### Boston-Area Medical Resources
- **Primary care**: First point of contact
- **Infectious disease specialists**: For complex cases
- **Emergency rooms**: 
  - Massachusetts General Hospital
  - Beth Israel Deaconess Medical Center
  - Boston Medical Center
- **Testing**: Massachusetts Department of Public Health recommends specific labs

## Important Notes
- **Co-infections**: Can be infected with multiple diseases from one tick
- **Testing timing**: Wait 4-6 weeks for accurate Lyme disease testing
- **Prevention**: Best defense is avoiding tick bites
- **Documentation**: Save photos of rash, keep tick in bag for testing
`
  }
};

/**
 * Create a file in Supabase Storage
 */
async function createFile(bucketName, filePath, content) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, content, {
        contentType: 'text/markdown',
        upsert: true
      });

    if (error) {
      throw error;
    }

    console.log(`✅ Created: ${filePath}`);
    return data;
  } catch (error) {
    console.error(`❌ Error creating ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function setupContentStructure() {
  console.log('🚀 Starting educational content structure setup...\n');

  const bucketName = 'hazard-educational-content';
  let successCount = 0;
  let errorCount = 0;

  // Iterate through content structure and create files
  for (const [dirPath, files] of Object.entries(contentStructure)) {
    console.log(`\n📁 Setting up directory: ${dirPath}`);
    
    for (const [filename, content] of Object.entries(files)) {
      const fullPath = `${dirPath}/${filename}`;
      
      try {
        await createFile(bucketName, fullPath, content);
        successCount++;
      } catch (error) {
        console.error(`Failed to create ${fullPath}`);
        errorCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`✅ Successfully created: ${successCount} files`);
  console.log(`❌ Errors: ${errorCount} files`);
  console.log('='.repeat(60));

  if (errorCount === 0) {
    console.log('\n🎉 All educational content files created successfully!');
    console.log('\n📍 Next steps:');
    console.log('  1. Deploy Supawald CMS to manage this content');
    console.log('  2. Set up AI content generation for remaining hazards');
    console.log('  3. Begin content review workflow');
  }
}

// Run the setup
setupContentStructure()
  .then(() => {
    console.log('\n✨ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });
