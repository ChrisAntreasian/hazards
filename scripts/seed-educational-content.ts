// Run with: npx tsx scripts/seed-educational-content.ts

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.log('Set these environment variables:');
  console.log('  VITE_SUPABASE_URL or PUBLIC_SUPABASE_URL');
  console.log('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BUCKET_NAME = 'hazard-educational-content';

// Educational content for Poison Ivy
const POISON_IVY_CONTENT: Record<string, string> = {
  identification: `# Identification

Poison ivy (*Toxicodendron radicans*) is one of the most common causes of allergic contact dermatitis in North America. Learning to identify it is essential for outdoor safety.

## The "Leaves of Three" Rule

The most reliable way to identify poison ivy is by its distinctive **three leaflets** per leaf. Remember the classic saying:

> "Leaves of three, let it be!"

## Key Identification Features

### Leaf Characteristics
- **Three leaflets** arranged alternately on the stem
- The middle leaflet has a **longer stem** than the two side leaflets
- Leaflets are 2-6 inches long
- Edges may be **smooth, toothed, or slightly lobed**
- Leaves are **shiny or dull green** in spring/summer
- Turn **brilliant red, orange, or yellow** in fall

### Growth Forms
Poison ivy can grow as:
- **Ground cover** (low-growing vines)
- **Climbing vine** (can grow up trees, using "hairy" aerial roots)
- **Shrub** (free-standing bush, 3-4 feet tall)

### Vine Characteristics
- Mature vines have a distinctive **"hairy" appearance** from aerial roots
- The saying: "Hairy vine, no friend of mine"

### Berries
- Small, **white to grayish-white berries** in clusters
- Present in late summer through winter
- Birds eat them (they're immune to urushiol)

## What It's NOT

Poison ivy is sometimes confused with:
- **Virginia Creeper** - has 5 leaflets, not 3
- **Box Elder seedlings** - opposite leaf arrangement, not alternate
- **Wild raspberry/blackberry** - thorny stems, poison ivy is never thorny

## Seasonal Appearance

| Season | Appearance |
|--------|------------|
| Spring | Reddish, shiny new growth |
| Summer | Green leaves, may appear shiny or dull |
| Fall | Brilliant red, orange, or yellow |
| Winter | Bare vines with white berries (if present) |

⚠️ **Important:** The plant is hazardous year-round, even without leaves. The urushiol oil persists in stems, roots, and vines.`,

  symptoms: `# Signs & Symptoms

Contact with poison ivy causes allergic contact dermatitis in approximately 85% of people. Symptoms appear when the immune system reacts to urushiol oil.

## Timeline of Symptoms

| Time After Contact | What Happens |
|-------------------|--------------|
| 0-24 hours | Usually no visible symptoms |
| 12-48 hours | Redness and itching begin |
| 24-72 hours | Rash appears, blisters may form |
| 1-2 weeks | Rash typically peaks |
| 2-3 weeks | Rash resolves (without treatment) |

## Symptom Progression

### Early Stage (12-48 hours)
- **Intense itching** at contact site
- **Redness** and swelling
- **Warm feeling** in affected area

### Active Stage (2-7 days)
- **Rash** appears in lines or streaks (following contact pattern)
- **Blisters** form (may be small or large)
- **Weeping** - blisters may break and ooze clear fluid
- **Severe itching** continues

### Healing Stage (1-3 weeks)
- Blisters dry and crust over
- Itching gradually subsides
- Skin peels and heals

## Severity Levels

### Mild Reaction
- Small area affected
- Light redness
- Minor itching
- Can be treated at home

### Moderate Reaction
- Larger area affected
- Significant blistering
- Intense itching affecting sleep/daily activities
- May need medical attention

### Severe Reaction ⚠️ **Seek Medical Care**
- Covers large areas of body (>25%)
- Face, eyes, or genitals affected
- Extreme swelling
- Difficulty breathing (if inhaled smoke from burning plants)
- Signs of infection (pus, increasing redness, fever)

## Common Myths Debunked

❌ **Myth:** Blister fluid spreads the rash
✅ **Truth:** The fluid contains no urushiol - the rash only spreads where oil touched skin

❌ **Myth:** Some people are immune
✅ **Truth:** Sensitivity can develop at any time; "immune" people often become allergic with repeated exposure

❌ **Myth:** Dead plants are safe
✅ **Truth:** Urushiol remains active for years on dead plants and contaminated objects`,

  treatment: `# Treatment

Most poison ivy rashes can be treated at home, but severe cases require medical attention.

## Immediate Actions (First 10-30 Minutes)

The most critical period is immediately after exposure:

1. **Wash the affected area** thoroughly with:
   - Lukewarm water and soap
   - Or specialized products like Tecnu or Zanfel
   - Rinse for at least 30 seconds

2. **Clean under fingernails** - urushiol can hide there

3. **Wash clothing and gear** that may have contacted the plant
   - Use hot water and detergent
   - Clean shoes, tools, pets that may carry oil

> ⏱️ **Timing matters:** Washing within 10-15 minutes may prevent or reduce reaction. After 1 hour, most oil has bonded to skin.

## Home Treatment

### Relieve Itching
- **Cool compresses** or cool showers
- **Calamine lotion** on affected areas
- **Oatmeal baths** (colloidal oatmeal products)
- **Over-the-counter hydrocortisone cream** (1%)
- **Antihistamines** (diphenhydramine/Benadryl) for sleep

### What NOT to Do
- ❌ Don't scratch - increases infection risk
- ❌ Don't use hot water - intensifies itching
- ❌ Don't use alcohol-based products on blisters
- ❌ Don't break blisters intentionally

### Soothing Remedies
| Remedy | How to Use |
|--------|------------|
| Cold compress | 15-20 min, several times daily |
| Baking soda paste | 3:1 ratio with water, apply to rash |
| Apple cider vinegar | Diluted, on cotton ball |
| Aloe vera | Pure gel on affected areas |

## When to See a Doctor

Seek medical attention if:
- Rash covers more than 25% of body
- Face, eyes, genitals, or mouth are affected
- Severe swelling occurs
- Blisters are large or numerous
- Signs of infection (increasing redness, warmth, pus, fever)
- Difficulty breathing or swallowing
- Rash doesn't improve after 2-3 weeks

## Medical Treatments

A doctor may prescribe:
- **Oral corticosteroids** (prednisone) - for severe cases
- **Prescription-strength topical steroids**
- **Antibiotics** if infection develops

## Recovery Time

| Severity | Typical Duration |
|----------|------------------|
| Mild | 1-2 weeks |
| Moderate | 2-3 weeks |
| Severe (with treatment) | 2-4 weeks |`,

  prevention: `# Prevention

The best treatment for poison ivy is avoiding it entirely. Here's how to protect yourself.

## Before Going Outdoors

### Know What You're Looking For
- Review poison ivy identification before your trip
- Remember: "Leaves of three, let it be"
- Check trail reports for known poison ivy areas

### Protective Clothing
- **Long pants** tucked into socks
- **Long-sleeved shirts**
- **Closed-toe shoes** or boots
- **Gloves** when working in areas where plants may be present
- Consider wearing **gaiters** on heavily vegetated trails

### Barrier Products
Apply **Ivy Block** or similar bentoquatam-based products to exposed skin:
- Creates a barrier that binds urushiol
- Apply 15 minutes before exposure
- Reapply every 4 hours

## While Outdoors

### Trail Awareness
- **Stay on marked trails** - avoid bushwhacking
- **Watch where you step** - especially in underbrush
- **Don't touch unfamiliar plants**
- **Keep pets on leash** - they can carry urushiol on fur

### If You Spot Poison Ivy
- Give it a **wide berth** (at least 3-4 feet)
- Remember it can climb trees - look up!
- Alert others in your group

## After Potential Exposure

### Decontamination Protocol
1. **Wash exposed skin** within 10-30 minutes with soap and lukewarm water
2. **Scrub under fingernails**
3. Use **specialized cleansers** (Tecnu, Zanfel) if available
4. **Rinse thoroughly** - at least 30 seconds per area

### Clean Your Gear
Urushiol persists on surfaces for up to 5 years:

| Item | How to Clean |
|------|--------------|
| Clothing | Hot water, heavy-duty detergent |
| Shoes | Wipe with rubbing alcohol, wash laces |
| Tools | Rubbing alcohol or degreaser |
| Pets | Bathe with pet shampoo (wear gloves!) |

## For Landowners

### Removing Poison Ivy Safely
- **Never burn it** - urushiol in smoke can cause lung damage
- Wear protective clothing head to toe
- Use herbicides or dig up roots carefully
- Bag and dispose of plants (don't compost)
- Consider hiring professionals for large areas

## Key Points to Remember

✅ Learn to identify it in all seasons
✅ Wear protective clothing on trails
✅ Stay on marked trails when possible
✅ Wash within 30 minutes of exposure
✅ Clean all gear that may be contaminated
❌ Never burn poison ivy
❌ Don't touch unidentified three-leaved plants`,

  look_alikes: `# Look-Alikes

Several common plants are often confused with poison ivy. Learning to distinguish them can save you unnecessary worry—and prevent you from touching the real thing!

## Plants Commonly Mistaken for Poison Ivy

### Virginia Creeper
**The most common look-alike**

| Feature | Virginia Creeper | Poison Ivy |
|---------|-----------------|------------|
| Leaflets | **5 per leaf** | 3 per leaf |
| Leaf edges | Serrated (toothed) | Smooth or varied |
| Berries | Blue-black | White |
| Climbing | Tendrils with adhesive pads | "Hairy" aerial roots |

💡 **Memory trick:** "Leaves of five, let it thrive!"

Virginia creeper can cause mild skin irritation in some people, but it's not poisonous like poison ivy.

### Box Elder (Young Plants)
Box elder seedlings can look similar to poison ivy.

| Feature | Box Elder | Poison Ivy |
|---------|-----------|------------|
| Leaf arrangement | **Opposite** | Alternate |
| Stems | Green to reddish | Varies |
| Bark | Smooth when young | - |
| Growth | Tree seedling | Vine or shrub |

💡 **Memory trick:** Box elder leaves are directly across from each other on the stem; poison ivy leaves alternate.

### Wild Raspberry/Blackberry (Young Growth)
New growth can have three leaflets.

| Feature | Wild Berries | Poison Ivy |
|---------|--------------|------------|
| Thorns | **Yes, on stems** | No thorns ever |
| Leaflets | Toothed edges | Varied edges |
| Growth | Brambles | Vine or shrub |

💡 **Memory trick:** "Thorns are your friend"—if it has thorns, it's not poison ivy!

### Jack-in-the-Pulpit
Occasionally confused due to leaf shape.

| Feature | Jack-in-the-Pulpit | Poison Ivy |
|---------|-------------------|------------|
| Leaflets | 3, but very different shape | 3 |
| Flower | Distinctive hooded flower | Small, inconspicuous |
| Berries | Bright red cluster | White |
| Growth | Single stalk from ground | Vine or shrub |

### Fragrant Sumac
A close relative that's NOT harmful.

| Feature | Fragrant Sumac | Poison Ivy |
|---------|----------------|------------|
| Leaflets | 3 | 3 |
| Middle leaflet | **No stem** (attached directly) | Has distinct stem |
| Smell | Fragrant when crushed | No distinctive smell |
| Berries | Red, fuzzy | White |

💡 **Memory trick:** "Middle stem = meanness" (poison ivy has a longer middle stem)

## Actual Poisonous Look-Alikes

### Poison Oak
A close relative with similar effects.

- Found primarily in **western US** and southeastern coastal areas
- Leaves **more lobed** like oak leaves
- Same urushiol oil - causes identical reaction
- **Treat it the same as poison ivy**

### Poison Sumac
The most toxic of the three.

- Found in **wet, swampy areas** in eastern US
- **7-13 leaflets** per leaf (not 3)
- Smooth-edged leaves
- White berries in drooping clusters
- Red stems
- Causes more severe reactions than poison ivy

## Quick Reference Chart

| Plant | Leaflets | Safe? | Key Identifier |
|-------|----------|-------|----------------|
| Poison Ivy | 3 | ❌ NO | Middle leaf has long stem |
| Virginia Creeper | 5 | ✅ Yes | Blue berries, 5 leaves |
| Box Elder | 3 | ✅ Yes | Opposite leaves |
| Wild Berries | 3 | ✅ Yes | Has thorns |
| Fragrant Sumac | 3 | ✅ Yes | No middle stem |
| Poison Oak | 3 | ❌ NO | Lobed like oak |

## When in Doubt

If you can't positively identify a plant:
- **Don't touch it**
- Take a photo from a safe distance for later identification
- Assume three-leaved plants are poison ivy until proven otherwise`,

  seasonal_info: `# Seasonal Information

Poison ivy changes appearance dramatically throughout the year, but remains hazardous in all seasons.

## Spring (March - May)

### Appearance
- **New growth is reddish or bronze** colored
- Leaves are **shiny** and may appear "oily"
- Small yellowish-green flowers appear (April-June)
- Leaves gradually turn green as they mature

### Hazard Level: ⚠️ **HIGH**
- Urushiol production is highest in spring
- New growth is easy to miss among emerging vegetation
- Plants are actively growing and spreading

### Tips
- Be extra vigilant as plants are emerging
- Young shoots may be hard to identify
- The shiny appearance can actually help identification

## Summer (June - August)

### Appearance
- Leaves are **full-sized and green**
- May appear **shiny or dull** depending on conditions
- Berries begin forming (green, then white)
- Vines are at their longest

### Hazard Level: ⚠️ **HIGH**
- Full foliage means more plant material to contact
- Plants can be hidden in thick summer vegetation
- Vine growth can extend into trails

### Tips
- Watch for vines climbing trees and fences
- Stay on clear trails
- Poison ivy thrives at trail edges where sunlight penetrates

## Fall (September - November)

### Appearance
- Leaves turn **brilliant red, orange, or yellow**
- Often one of the **first plants to change color**
- White berries are clearly visible
- Leaves begin to drop (October-November)

### Hazard Level: ⚠️ **MODERATE to HIGH**
- Beautiful colors may attract attention
- Urushiol remains potent in falling leaves
- Berries contain urushiol

### Tips
- Fall colors make identification easier
- Don't touch even beautiful-looking leaves
- Be careful handling fallen leaves

## Winter (December - February)

### Appearance
- **Leafless** - only stems and vines visible
- "Hairy" vines on trees are distinctive
- White berries may persist
- Roots and stems remain

### Hazard Level: ⚠️ **MODERATE**
- Often overlooked because it's bare
- Urushiol persists in stems, roots, and vines
- Oil can remain on surfaces for 1-5 years

### Tips
- Learn to identify bare vines
- "Hairy vine, no friend of mine"
- Don't use dead vines for firewood
- Never burn any part of the plant

## Year-Round Hazard Summary

| Season | Identification Difficulty | Urushiol Potency | Key Risks |
|--------|--------------------------|------------------|-----------|
| Spring | Hard (small, mixed in) | Highest | Easy to miss |
| Summer | Moderate (hidden) | High | Dense growth |
| Fall | Easy (colors!) | High | Beautiful but dangerous |
| Winter | Hard (no leaves) | Moderate | Easily overlooked |

## Geographic & Climate Considerations

### Where Poison Ivy Thrives
- **Edges** - trails, roads, fences, forest margins
- **Disturbed areas** - construction sites, cleared land
- **Along water** - streams, lakes, rivers
- **Partial shade** to full sun

### Regional Variations
| Region | Growth Form | Active Season |
|--------|-------------|---------------|
| Northeast | All forms | April - October |
| Southeast | Often evergreen | Year-round |
| Midwest | Ground cover, shrubs | April - October |
| Western US | Poison oak more common | Varies |

### Climate Impact
- Warmer temperatures → longer growing seasons
- More CO2 → larger plants with more potent urushiol
- Climate change is making poison ivy more prevalent and more toxic

## Planning Your Outdoor Activities

| Activity | Best Season | Precautions |
|----------|-------------|-------------|
| Hiking | Fall (easiest ID) | Stay on trails |
| Camping | Any | Check campsite thoroughly |
| Gardening | Spring (visible) | Full protective gear |
| Yard work | Fall (visible) | Know your property |

Remember: **There is no safe season to touch poison ivy.** Year-round vigilance is essential!`
};

async function seedContent() {
  console.log('🌱 Seeding educational content...\n');

  const storagePath = 'plants/poisonous_things/poison_ivy';
  let successCount = 0;
  let errorCount = 0;

  for (const [sectionId, content] of Object.entries(POISON_IVY_CONTENT)) {
    const filePath = `${storagePath}/${sectionId}.md`;
    
    console.log(`📝 Uploading ${filePath}...`);
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, content, {
        contentType: 'text/markdown',
        upsert: true
      });

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errorCount++;
    } else {
      console.log(`   ✅ Success`);
      successCount++;
    }
  }

  // Update the template
  console.log('\n📊 Updating template record...');
  
  const { error: updateError } = await supabase
    .from('hazard_templates')
    .update({
      storage_path: storagePath,
      has_educational_content: true,
      updated_at: new Date().toISOString()
    })
    .eq('slug', 'poison_ivy');

  if (updateError) {
    console.error(`❌ Failed to update template: ${updateError.message}`);
    errorCount++;
  } else {
    console.log('✅ Template updated');
  }

  console.log(`\n📈 Results: ${successCount} files uploaded, ${errorCount} errors`);
}

seedContent().catch(console.error);
