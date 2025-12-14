/**
 * @fileoverview Admin API to seed educational content for templates.
 * This is a one-time setup endpoint that creates markdown files in storage.
 * 
 * POST /api/admin/seed-content
 * Requires moderator or admin role
 * 
 * Content is based on widely-known, commonly-taught outdoor safety facts.
 * This is general educational information - always consult medical professionals
 * for specific health concerns.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BUCKET_NAME = 'hazard-educational-content';

// Educational content for Poison Ivy
const POISON_IVY_CONTENT = {
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

// Educational content for Yellow Jacket (Stinging Insects)
const YELLOW_JACKET_CONTENT: Record<string, string> = {
  identification: `# Identification

Yellow jackets are aggressive stinging insects commonly encountered during outdoor activities. Proper identification helps you avoid disturbing nests and respond appropriately to encounters.

## What Are Yellow Jackets?

Yellow jackets (*Vespula* and *Dolichovespula* species) are a type of social wasp native to North America. They are often mistaken for bees but have distinct differences.

## Physical Characteristics

### Body Features
- **Size:** 3/8 to 5/8 inch long (10-16mm)
- **Color:** Bright yellow and black banding pattern
- **Body shape:** Slender waist, smooth and shiny body (unlike fuzzy bees)
- **Wings:** Two pairs, folded lengthwise when at rest
- **Antennae:** Black, medium length

### Key Visual Identifiers
| Feature | Yellow Jacket | Honey Bee | Bumble Bee |
|---------|--------------|-----------|------------|
| Body | Smooth, shiny | Fuzzy | Very fuzzy |
| Shape | Narrow waist | Rounder | Large, round |
| Color | Bright yellow/black | Brown/amber | Yellow/black |
| Aggression | High | Low | Low |
| Sting | Can sting multiple times | Dies after stinging | Can sting multiple times |

## Yellow Jacket vs. Other Insects

### Not Bees
- Yellow jackets are **wasps**, not bees
- Bees have fuzzy bodies; yellow jackets are smooth
- Bees are pollinators that rarely sting unprovoked
- Yellow jackets are predators and scavengers

### Not Paper Wasps
- Paper wasps are longer and thinner
- Paper wasps have longer legs that dangle in flight
- Paper wasps build open-celled umbrella nests (yellow jackets build enclosed nests)

### Not Hornets
- Hornets are larger (up to 1.5 inches)
- Bald-faced hornets have white markings, not yellow

## Nest Identification

### Ground Nests (Most Common)
- Located in **abandoned rodent burrows**
- Small entrance hole in ground (often golf-ball sized)
- Multiple yellow jackets entering/exiting
- Usually in sunny areas with dry soil
- **Contains thousands of individuals by late summer**

### Aerial Nests
- Paper-like enclosed structure
- Gray or tan colored
- Found in trees, shrubs, or building eaves
- Football-sized or larger by late summer

### Structural Nests
- Inside wall voids, attics, or sheds
- May hear buzzing from inside walls
- Insects entering through cracks or gaps

## Behavior Patterns

### Normal Behavior
- Patrol for food (proteins, sugars)
- Follow flight paths to and from nest
- Attracted to human food at picnics, barbecues

### Warning Signs of Aggression
- **Bumping** - flying into you without stinging
- **Hovering** near face
- **Increased activity** around nest entrance
- **Guarding behavior** - wasps standing at nest entrance

⚠️ **Important:** Yellow jackets release pheromones when disturbed that attract and agitate other colony members. A single encounter can quickly escalate.`,

  symptoms: `# Signs & Symptoms

Yellow jacket stings cause immediate pain and can trigger reactions ranging from mild local swelling to life-threatening anaphylaxis. Knowing the symptoms helps you respond appropriately.

## Types of Reactions

### Normal Local Reaction (Most People)
Occurs in approximately 90% of stings.

**Immediate symptoms:**
- **Sharp, burning pain** at sting site
- **Redness** around the sting
- Small **raised welt** (wheal)

**Over 24-48 hours:**
- **Swelling** may increase
- **Itching** develops
- Area may become warm to touch

**Duration:** Resolves within 1-7 days

### Large Local Reaction (10% of People)
A more extensive reaction, but not allergic in nature.

**Symptoms:**
- Swelling extends **more than 4 inches** from sting site
- May affect an entire limb
- Swelling peaks at 48-72 hours
- Can last 5-10 days
- **Not dangerous** but uncomfortable

### Allergic Reaction (Anaphylaxis) ⚠️ EMERGENCY

Affects approximately 3% of adults who are stung.

**Early warning signs (within minutes):**
- Hives or rash spreading beyond sting site
- Itching on palms, soles, scalp
- Flushing or warm sensation
- Metallic taste in mouth

**Progressive symptoms:**
- Swelling of face, lips, tongue, or throat
- Difficulty breathing or wheezing
- Hoarse voice
- Tight feeling in chest
- Rapid heartbeat
- Dizziness or lightheadedness
- Nausea, vomiting, or diarrhea
- Feeling of impending doom

**Severe anaphylaxis:**
- Severe drop in blood pressure
- Loss of consciousness
- Cardiac arrest

## Symptom Timeline

| Time | Normal Reaction | Allergic Reaction |
|------|-----------------|-------------------|
| Immediate | Pain, small welt | Pain, plus rapid spread |
| 5-30 min | Local swelling | Hives, breathing issues |
| 1-2 hours | Swelling peaks locally | Without treatment: life-threatening |
| 24-48 hours | Itching, swelling | Recovery (if treated) |
| 3-7 days | Resolution | Full recovery |

## Multiple Stings

Yellow jackets can sting repeatedly, and disturbing a nest can result in dozens of stings.

### Toxic Reaction from Multiple Stings
- **10+ stings** can cause systemic symptoms even without allergy
- **50+ stings** is a medical emergency
- Symptoms: nausea, vomiting, diarrhea, headache, fever, muscle cramps
- Rare but possible: kidney failure, rhabdomyolysis

### High-Risk Groups
- **Children** (smaller body mass, more vulnerable to venom)
- **Elderly** (may have heart conditions)
- **Those with known allergies**
- **People on beta-blockers** (epinephrine less effective)

## Infection Signs (Later Complication)

If the sting becomes infected (usually from scratching):

- Increasing redness after 48 hours
- Warmth and tenderness increasing
- Pus or drainage
- Red streaks extending from sting
- Fever

## When Symptoms Indicate Emergency

**Call 911 immediately if:**
- Difficulty breathing or swallowing
- Swelling of tongue or throat
- Widespread hives
- Dizziness or fainting
- Rapid heartbeat
- Nausea and vomiting (if not just from pain)
- Previous severe allergic reaction to stings
- More than 10 stings (even without allergy)`,

  treatment: `# Treatment

Proper treatment of yellow jacket stings ranges from simple home care to emergency medical intervention, depending on the severity of the reaction.

## Immediate First Aid (All Stings)

### Step 1: Get to Safety
- Move away from the area calmly but quickly
- Yellow jackets will pursue, so keep moving
- Get indoors or into a vehicle if possible

### Step 2: Remove the Stinger (If Present)
- Unlike bees, **yellow jackets usually don't leave stingers** behind
- If one is present, scrape it out sideways with a credit card
- Don't squeeze or use tweezers (pushes in more venom)

### Step 3: Clean the Wound
- Wash with soap and water
- Apply antiseptic if available

### Step 4: Reduce Pain and Swelling
- Apply **cold compress** or ice wrapped in cloth
- 10-15 minutes on, 10 minutes off
- Elevate the affected limb if possible

## Home Treatment for Normal Reactions

### Pain Relief
- **Over-the-counter pain relievers:** Ibuprofen (Advil), acetaminophen (Tylenol)
- **Cold compresses:** Multiple times throughout the day

### Itch Relief
- **Antihistamines:** Diphenhydramine (Benadryl), cetirizine (Zyrtec), or loratadine (Claritin)
- **Topical treatments:**
  - Hydrocortisone cream (1%)
  - Calamine lotion
  - Baking soda paste (3:1 ratio with water)

### What NOT to Do
- ❌ Don't scratch (increases infection risk)
- ❌ Don't apply mud or tobacco (infection risk, not effective)
- ❌ Don't take aspirin (can increase bleeding/swelling)
- ❌ Don't apply tourniquets

## Treatment for Large Local Reactions

If swelling spreads beyond 4 inches or affects an entire limb:

- **Oral antihistamines** (Benadryl works fastest)
- **Ice/cold compresses** frequently
- **Elevation** of the affected area
- Consider **oral corticosteroids** if available (prescription)
- **Contact doctor** if affecting face or airway

## Emergency Treatment: Anaphylaxis

### If Person Has an Epinephrine Auto-Injector (EpiPen)

**Use it immediately at first sign of anaphylaxis!**

1. Remove safety cap
2. Inject into outer thigh (through clothing is OK)
3. Hold for 10 seconds
4. **Call 911** - epinephrine buys time but isn't a cure
5. Be prepared to use second dose in 5-15 minutes if symptoms persist

### If No Epinephrine Available

1. **Call 911 immediately**
2. Have person lie down with legs elevated (unless having breathing difficulty)
3. Loosen tight clothing
4. If they stop breathing, begin CPR
5. Do not give anything by mouth

### After Using Epinephrine
- **Always go to emergency room** - symptoms can return (biphasic reaction)
- Observation period: typically 4-6 hours
- May need additional treatment

## Treatment Summary Table

| Reaction Type | Treatment | Medical Care Needed? |
|--------------|-----------|---------------------|
| Normal local | Ice, antihistamines, OTC pain relief | No |
| Large local | Above + elevation, possible oral steroids | Doctor if face/airway |
| Mild allergic (hives only) | Antihistamines, observe closely | Urgent care same day |
| Anaphylaxis | **Epinephrine + 911** | Emergency! |
| Multiple stings (10+) | First aid + medical evaluation | Yes - same day |

## Follow-Up Care

### After Any Sting
- Watch for infection signs for 48-72 hours
- Keep wound clean and dry

### After Allergic Reaction
- See an allergist for testing
- Get prescribed epinephrine auto-injector
- Consider venom immunotherapy (allergy shots)
- Wear medical ID bracelet`,

  prevention: `# Prevention

Avoiding yellow jacket stings requires awareness of their behavior, careful habits in their environment, and knowing what attracts them.

## Understanding Yellow Jacket Behavior

### Peak Season
- Most aggressive: **August through October**
- Colony size peaks in late summer (can reach 5,000+ workers)
- Food sources diminish, making them more desperate
- Colonies die off with first hard frost

### What Attracts Them
- **Sweet foods:** Soda, fruit, juices, candy
- **Protein foods:** Meat, fish, pet food
- **Garbage and compost**
- **Perfumes and fragrances**
- **Bright colors** (especially yellow and floral patterns)
- **Sweat**

## Before Going Outdoors

### Clothing Choices
| Do | Don't |
|----|-------|
| Wear light colors (white, tan, gray) | Wear bright colors or floral patterns |
| Wear closed-toe shoes | Walk barefoot in grass |
| Wear long sleeves when in high-risk areas | Wear loose clothing (they can get trapped) |
| Consider a hat | Wear perfume, cologne, or scented products |

### Preparation
- Check area for ground nests before setting up camp or picnic
- Bring sealed containers for all food and drinks
- Pack garbage bags that seal
- If known allergy: **carry epinephrine and inform companions**

## While Outdoors

### Food and Drink Safety
- **Keep food covered** until ready to eat
- **Use cups with lids and straws** (yellow jackets can enter open cans/bottles)
- **Clean up spills immediately**
- **Dispose of garbage in sealed containers** away from activity areas
- **Don't leave pet food outside**
- **Avoid eating sweet or protein-rich foods** in high-risk areas

### Activity Guidelines
- **Look before you sit** - check for ground nests
- **Watch where you step** - especially in tall grass
- **Stay on trails** when hiking
- **Avoid areas with visible activity** (multiple wasps coming and going)
- **Don't swat** - quick movements provoke attacks
- **Stay calm** - if one lands on you, wait for it to leave

### If You Encounter a Nest
- **Back away slowly** - don't run (running triggers chase response)
- **Protect your face** with hands or clothing
- **Don't swat or flail** - this releases alarm pheromones
- **Get indoors or in vehicle** if possible
- If stung while near nest, **leave the area immediately** before more arrive

## At Home and Campsite

### Yard Management
- **Seal garbage bins** tightly
- **Pick up fallen fruit** from trees
- **Don't leave food or drinks outside**
- Check for nests in spring when they're small and easier to address

### Early Detection
- Watch for wasps flying in consistent patterns (indicates nearby nest)
- Check common nest locations monthly: ground holes, eaves, sheds
- **Don't disturb nests** - call professionals for removal

### Nest Removal
- **Best done at night** (colony less active)
- **Hire professionals** for large or hard-to-reach nests
- If DIY: wear protective clothing covering all skin
- Commercial sprays work best at dusk or dawn
- Wait several days after treatment before removing nest

## High-Risk Activities and Precautions

| Activity | Risk Level | Key Precautions |
|----------|------------|-----------------|
| Picnics | High | Sealed containers, immediate cleanup |
| Barbecues | High | Cover food, clean grill, manage garbage |
| Gardening | Medium-High | Check area first, wear shoes, avoid fragrances |
| Hiking | Medium | Stay on trails, watch step, carry water |
| Mowing | High | Check for ground nests, long pants, shoes |
| Fruit picking | High | Check for activity, wear gloves and long sleeves |

## For Those With Allergies

### Essential Precautions
- **Always carry epinephrine** (check expiration date regularly)
- **Wear medical alert identification**
- **Inform companions** how to use your auto-injector
- **Consider venom immunotherapy** - 97% effective at preventing severe reactions
- **Avoid outdoor activities alone** during peak season

### Emergency Plan
1. Know locations of nearest emergency rooms
2. Have cell phone charged
3. Travel with someone who can administer epinephrine
4. Keep auto-injector accessible (not in locked car)`,

  first_aid: `# Field First Aid

When stung by a yellow jacket in the field, proper first aid can minimize discomfort and help identify allergic reactions early.

## Immediate Response Protocol

### Step 1: Safety First (0-30 seconds)
**Get away from the area immediately**
- Yellow jackets release alarm pheromones that attract others
- Walk quickly but calmly away (don't run if possible)
- Move at least 50-100 feet from the nest area
- Get into shelter (car, building, tent) if available

### Step 2: Assessment (1-2 minutes)
**Check for signs of allergic reaction:**
- Difficulty breathing?
- Swelling of face, lips, tongue?
- Hives spreading beyond sting site?
- Dizziness or feeling faint?

**If YES to any → This is anaphylaxis. See Emergency Procedures below.**

**If NO → Continue with normal first aid**

### Step 3: First Aid for Normal Reaction

**A. Check for stinger**
- Yellow jackets usually don't leave stingers, but check
- If present, scrape sideways with credit card or fingernail
- Don't squeeze or use tweezers

**B. Clean the area**
- Wash with soap and water if available
- Use hand sanitizer if no water
- Antiseptic wipe if in first aid kit

**C. Cold application**
- Ice, cold pack, or cold water
- Wrap in cloth (don't apply ice directly to skin)
- 10-15 minutes on, 10 minutes off
- In the field: cold stream water, cooler contents

**D. Pain management**
- Over-the-counter pain reliever if available
- Elevation if sting is on limb
- Distraction and calm reassurance

## Field Emergency: Anaphylaxis Protocol

### Signs That Require Emergency Response
- Difficulty breathing or wheezing
- Swelling of tongue, lips, or throat
- Widespread hives (beyond sting area)
- Rapid heartbeat
- Dizziness, confusion, or loss of consciousness
- Nausea and vomiting
- Sense of impending doom

### Emergency Steps

**1. Use epinephrine immediately if available**
- Don't wait to see if symptoms improve
- Inject into outer thigh (through clothing OK)
- Hold for 10 seconds

**2. Call for help**
- 911 if cell service available
- Send someone for help if in group
- Activate emergency beacon if in backcountry

**3. Position the person**
- Lie down with legs elevated if no breathing difficulty
- Sit up if having trouble breathing
- Recovery position if unconscious and breathing

**4. Be prepared for additional care**
- Second epinephrine dose in 5-15 minutes if no improvement
- CPR if they stop breathing
- Keep them calm and still

**5. Monitor continuously**
- Stay with the person
- Track symptoms and timing
- Be ready to report to emergency responders

## Field First Aid Kit Additions for Sting Risk

### Essential Items
| Item | Purpose |
|------|---------|
| Epinephrine auto-injector* | Anaphylaxis emergency |
| Antihistamines (Benadryl) | Reduce allergic response |
| Cold pack | Reduce swelling and pain |
| Antiseptic wipes | Clean wound |
| Credit card | Stinger removal |
| Ibuprofen/acetaminophen | Pain relief |

*Prescription required - only carry if prescribed to you or someone in your group

### Nice to Have
- Hydrocortisone cream (1%)
- Oral corticosteroids (prescription, for known large reactors)
- Sting relief wipes/swabs
- Medical information card

## Multiple Stings Field Protocol

If someone receives 10+ stings:

1. **Remove from area immediately**
2. **Monitor for systemic symptoms:**
   - Nausea, vomiting
   - Headache
   - Fever or chills
   - Muscle cramps
   - Confusion
3. **Seek medical attention** - even without allergy, large venom doses can cause toxic reaction
4. **Keep person hydrated**
5. **Don't let them exert themselves** - rest and monitor

## Communication in Emergency

### What to Tell 911/Rescuers
- Location (GPS coordinates if possible)
- Number of people stung
- Symptoms observed and timeline
- Any known allergies
- Epinephrine given (time and dose)
- Person's age and medical conditions

### Backcountry Considerations
- Know your route to nearest road/trailhead
- Consider evacuation options before trip
- Carry satellite communicator in remote areas
- Travel with others during peak season`,

  seasonal_info: `# Seasonal Information

Yellow jacket behavior, population, and threat level change dramatically throughout the year. Understanding these patterns helps you avoid encounters.

## Spring (March - May)

### Colony Status
- **Queen emerges** from winter hibernation
- Searches for nest site (old rodent burrows, protected spaces)
- **Queen builds initial nest alone**
- First generation of workers born (late spring)
- Colony size: **Queen + 20-50 workers**

### Threat Level: 🟢 **LOW**
- Small colony = fewer defenders
- Workers focused on nest building and foraging for protein
- Queens avoid confrontation to protect new colony

### Tips for Spring
- Good time to locate and remove nests (small and manageable)
- Watch for solitary yellow jackets investigating holes and crevices
- Note locations for monitoring throughout summer

## Summer (June - August)

### Colony Status
- **Rapid colony growth**
- Multiple generations of workers produced
- Colony size: **500-3,000+ workers** by late summer
- Focus shifts from protein (feeding larvae) to sugars (feeding adults)

### Threat Level: 🟡 **MODERATE to HIGH**
- Larger colony = more defenders
- More foraging activity increases encounter likelihood
- Nests become harder to remove

### Tips for Summer
- Be vigilant at outdoor meals
- Ground nests reach maximum activity
- Professional removal recommended for established nests
- Most encounters happen at food sources, not nests

## Late Summer / Fall (August - October)

### Colony Status
- **Peak population:** 2,000-5,000+ workers
- **New queens and males produced** (reproductive focus)
- Natural food sources decline
- Workers become **desperate and aggressive**
- Colony begins gradual decline after new queens leave

### Threat Level: 🔴 **HIGHEST**
- Peak aggression due to colony defense and food desperation
- Most stings occur during this period
- Yellow jackets actively seek human food
- Defensive perimeter around nest expands

### Tips for Fall
- **Exercise maximum caution** at outdoor events
- Avoid fallen fruit and open garbage
- Check all food and drinks before consuming
- Keep car windows up at drive-throughs
- This is not the time for DIY nest removal

## Winter (November - February)

### Colony Status
- **Workers and males die** with first hard frost
- Old queen dies
- **New queens hibernate** underground, in wood piles, or structures
- Nest is abandoned (will not be reused)

### Threat Level: 🟢 **MINIMAL**
- No active colonies
- Hibernating queens won't sting unless directly handled

### Tips for Winter
- Safe time to remove old nests
- Seal entry points to prevent spring colonization
- Be aware when disturbing wood piles (hibernating queens)

## Seasonal Risk Calendar

| Month | Risk Level | Primary Concern | Key Precautions |
|-------|------------|-----------------|-----------------|
| March | Low | Queens searching for nest sites | Monitor yard |
| April | Low | Nest building | Locate small nests |
| May | Low-Medium | Colony growing | Consider early removal |
| June | Medium | Active foraging | Food safety begins |
| July | Medium-High | Large colonies | Increased vigilance |
| August | High | Peak population | Maximum caution |
| September | **Highest** | Desperate foragers | Avoid outdoor eating |
| October | High | Declining but desperate | Continue precautions |
| November | Low | Colony dying | Safe removal of old nests |
| Dec-Feb | Minimal | Hibernation | Seal entry points |

## Geographic Variations

### Regional Differences
| Region | Peak Season | Notable Species |
|--------|-------------|-----------------|
| Northeast | Aug-Oct | Eastern yellowjacket (V. maculifrons) |
| Southeast | Aug-Nov | Southern yellowjacket (V. squamosa) |
| Midwest | Aug-Oct | German yellowjacket (V. germanica) |
| Pacific Northwest | Aug-Oct | Western yellowjacket (V. pensylvanica) |
| Southwest | Year-round (warm areas) | Various species |

### Climate Considerations
- Mild winters → earlier colony establishment
- Warm, dry summers → increased survival and activity
- Climate change expanding ranges northward
- Urban heat islands support larger populations

## Activity Patterns (Daily)

| Time | Activity Level | Notes |
|------|---------------|-------|
| Early morning | Low | Colony warming up |
| Mid-morning | Increasing | Foraging begins |
| Noon - 3 PM | **Peak** | Maximum activity |
| Late afternoon | High | Still actively foraging |
| Evening | Decreasing | Returning to nest |
| Night | None | All workers in nest |

**Best times for outdoor activities during peak season:**
- Early morning before full activity
- After dusk when activity stops
- Overcast or cooler days (reduced activity)

## Weather Effects

| Condition | Effect on Yellow Jackets |
|-----------|-------------------------|
| Hot & sunny | Maximum activity |
| Overcast | Reduced but still active |
| Rainy | Mostly in nest |
| Windy | Reduced flying |
| Cold (<50°F) | Minimal activity |
| Before storm | Increased aggression |`
};

// Educational content for Loose Rock/Scree (Terrain Hazards)
const LOOSE_ROCK_SCREE_CONTENT: Record<string, string> = {
  identification: `# Identification

Loose rock and scree are among the most common terrain hazards in mountainous and hilly areas. Recognizing these conditions helps you navigate safely and choose appropriate routes.

## What is Scree?

**Scree** (also called talus) refers to accumulations of loose, broken rock fragments that collect on slopes, typically at the base of cliffs or steep mountainsides.

### Formation
- Created by **freeze-thaw weathering** (water expands in cracks when frozen)
- **Physical weathering** from temperature changes
- **Gravity** constantly pulling loosened rock downward
- Ongoing process - scree slopes are always changing

## Types of Loose Rock Terrain

### Scree (Talus)

**Characteristics:**
- Small to medium rock fragments (fist-sized to basketball-sized)
- Angular, rough surfaces
- Typically at angles of 30-40 degrees
- Often uniform in size within a section
- Makes distinctive sliding/rattling sound when disturbed

| Scree Type | Size | Stability | Travel Difficulty |
|------------|------|-----------|-------------------|
| Fine scree | Gravel to fist-sized | Very unstable | High (sliding) |
| Medium scree | Fist to head-sized | Unstable | Moderate |
| Coarse scree/talus | Head-sized and larger | More stable | Easier but rockfall risk |

### Boulder Fields

**Characteristics:**
- Large, often car-sized rocks
- Irregular surfaces with gaps between
- May have hidden voids underneath
- Often more stable than scree
- Risk: ankle injuries, falls between rocks

### Rockfall Zones

**Characteristics:**
- Active areas where rock is falling from above
- Fresh, light-colored rock fragments
- Debris fans below cliff faces
- May see/hear rocks falling
- **Most dangerous** - exposure time should be minimized

### Breakdown (Cliff Debris)

**Characteristics:**
- Mixed rock sizes at base of cliffs
- Very loose and unstable
- Often wet from seepage
- Includes large unstable blocks

## Visual Identification Cues

### Signs of Instability

| Indicator | What It Means |
|-----------|---------------|
| Light-colored rock | Recently exposed - fresh rockfall |
| Dark/weathered rock | Older, possibly more stable |
| Lichen-covered rocks | Long-term stable placement |
| Clean rock surfaces | Recent movement or active area |
| Rock dust in air | Very recent movement |
| Stacked or perched rocks | Extremely unstable |

### Slope Assessment

**Angle indicators:**
- <30° - Generally walkable with care
- 30-40° - Typical scree slope angle; sliding likely
- 40-45° - Maximum stable angle for loose rock
- >45° - Too steep for most loose material (cliffs/faces)

**Color patterns:**
- Stripes of different colors = different rock layers = different stability
- Uniform color = uniform material = more predictable behavior

## Seasonal Factors

### Spring
- **Most dangerous season**
- Freeze-thaw cycles actively breaking rock
- Snow/ice hiding loose rock
- Wet conditions reduce friction
- Snowmelt lubricating slopes

### Summer
- Generally most stable
- Dry conditions improve friction
- Best visibility of hazards
- Afternoon heat can trigger rockfall

### Fall
- Freeze-thaw begins again
- Rain increases hazard
- Generally still reasonable

### Winter
- Snow conceals hazards
- Frozen scree may be more stable
- Ice creates additional hazards
- Avalanche terrain assessment needed

## Sounds of Instability

Learning to listen helps identify hazards:

| Sound | Meaning |
|-------|---------|
| Hollow clunking | Loose rocks shifting |
| Scraping/sliding | Unstable surface |
| Clicking/ticking | Small rocks falling above |
| Rumbling | Larger rockfall - seek shelter immediately |
| Silence after disturbance | Rocks settling - wait before moving |

## Quick Assessment Protocol

Before entering loose rock terrain, evaluate:

1. **What's above you?** (Cliffs releasing rock? Other climbers?)
2. **What's below you?** (Cliff edge? Other people?)
3. **Escape routes?** (Where can you go if rockfall starts?)
4. **Rock size and angle?** (Determines technique needed)
5. **Surface condition?** (Wet? Icy? Dusty?)
6. **Time of day?** (Morning usually safest)`,

  symptoms: `# Signs & Symptoms

Injuries from loose rock terrain range from minor scrapes to life-threatening trauma. Understanding the types of injuries helps with prevention and emergency response.

## Common Injuries

### Minor Injuries

**Abrasions (Scrapes)**
- Most common injury
- From sliding on rough rock
- Usually hands, knees, elbows
- **Signs:** Raw skin, minor bleeding, embedded dirt/rock particles

**Contusions (Bruises)**
- From impact with rocks
- Common on shins, hips, shoulders
- **Signs:** Pain, swelling, discoloration over hours

**Minor Lacerations (Cuts)**
- From sharp rock edges
- Usually superficial
- **Signs:** Bleeding, pain at wound site

### Moderate Injuries

**Ankle Sprains and Strains**
- **Most common moderate injury** on scree and boulder fields
- Caused by twisting on unstable surfaces
- **Signs:** Pain, swelling, difficulty bearing weight
- **Severity grades:**
  - Grade I: Mild stretching, minimal swelling
  - Grade II: Partial tear, moderate swelling, bruising
  - Grade III: Complete tear, severe swelling, instability

**Knee Injuries**
- Twisting on unstable footing
- Impact from falls
- **Signs:** Pain, swelling, instability, difficulty bending

**Wrist and Hand Injuries**
- From catching falls
- **Signs:** Pain, swelling, reduced grip strength, bruising

### Serious Injuries

**Fractures (Broken Bones)**
- Ankle and lower leg most common
- Wrist fractures from falls
- **Signs:** 
  - Severe pain
  - Obvious deformity
  - Inability to bear weight
  - Rapid swelling
  - Grinding sensation (crepitus)

**Head Injuries**
- From falls or rockfall
- Range from concussion to severe trauma
- **Signs:**
  - Confusion, disorientation
  - Headache, nausea, vomiting
  - Vision problems
  - Loss of consciousness
  - Unequal pupils
  - Clear fluid from ears/nose (skull fracture)

**Spinal Injuries** ⚠️
- From significant falls or rockfall impact
- **Signs:**
  - Neck or back pain
  - Tingling or numbness in extremities
  - Weakness or inability to move limbs
  - Loss of bladder/bowel control

## Rockfall Injuries

Injuries from falling rock are often severe due to the mass and velocity involved.

### Impact Zones and Injury Patterns

| Body Part | Typical Injury | Severity |
|-----------|---------------|----------|
| Head | Concussion to skull fracture | Critical |
| Shoulders | Fractures, dislocations | Moderate-Severe |
| Hands/Arms | Fractures, lacerations | Moderate |
| Back | Spinal injury, organ damage | Critical |
| Legs | Fractures, crush injuries | Moderate-Severe |

### Warning Signs of Rockfall
- Shouts of "ROCK!" from above
- Clicking or clattering sounds
- Movement seen in peripheral vision
- Dust cloud above

**Response:** Seek shelter immediately or press against cliff face. Protect head with arms/pack.

## Environmental Injuries

### Heat-Related
Long approaches and high exertion on scree can cause:
- **Heat exhaustion:** Fatigue, heavy sweating, headache, nausea
- **Heat stroke:** Hot dry skin, confusion, loss of consciousness

### Cold-Related
Exposed ridges and high altitude:
- **Hypothermia:** Shivering, confusion, slurred speech
- **Frostbite:** Numbness, white/gray skin, hard texture

### Altitude-Related
Often encountered in mountain terrain:
- **Acute Mountain Sickness:** Headache, nausea, fatigue
- **HACE/HAPE:** Severe symptoms requiring immediate descent

## When to Seek Help

### Treat in Field, Continue with Caution
- Minor abrasions (clean and bandage)
- Small cuts (control bleeding, bandage)
- Minor bruises
- Grade I ankle sprain (if can bear weight with support)

### End Trip, Seek Medical Care
- Suspected fracture
- Grade II-III sprains
- Deep lacerations
- Significant impact to head (even if feeling OK)
- Persistent pain affecting movement

### Emergency Evacuation Required ⚠️
- Unable to walk out
- Head injury with any neurological symptoms
- Suspected spinal injury (**do not move patient**)
- Severe bleeding not controlled
- Crush injuries
- Signs of internal injury
- Loss of consciousness

## Self-Assessment After Incident

After any fall or rockfall impact, perform systematic check:

1. **Can you move all limbs normally?**
2. **Any numbness or tingling?**
3. **Any severe pain or obvious deformity?**
4. **Headache, dizziness, or vision changes?**
5. **Can you bear weight?**
6. **Any difficulty breathing?**

If YES to any concerning symptoms, stop and assess before continuing.`,

  treatment: `# Treatment

Proper treatment of injuries from loose rock terrain depends on the injury type and your location. This guide covers field treatment and when to seek professional care.

## General Principles

### RICE Protocol for Soft Tissue Injuries
For sprains, strains, and bruises:

- **R**est - Stop activity, protect the injury
- **I**ce - Apply cold (15-20 min on, 20 min off)
- **C**ompression - Elastic bandage, not too tight
- **E**levation - Raise above heart level when possible

### Wound Care Basics
For cuts and abrasions:

1. **Control bleeding** - Direct pressure with clean cloth
2. **Clean the wound** - Rinse with clean water, remove debris
3. **Apply antiseptic** if available
4. **Cover with sterile dressing**
5. **Monitor for infection** (increasing redness, warmth, pus)

## Treating Specific Injuries

### Abrasions (Scrapes)

**Field Treatment:**
1. Rinse thoroughly with clean water
2. Remove embedded debris with tweezers (if sterile)
3. Apply antibiotic ointment
4. Cover with non-stick bandage
5. Change dressing daily

**Seek medical care if:**
- Deep abrasion with visible fat/muscle
- Heavy contamination that won't rinse clean
- Signs of infection after 24-48 hours

### Lacerations (Cuts)

**Field Treatment:**
1. Apply direct pressure for 10+ minutes
2. Elevate if on limb
3. Clean wound edges when bleeding controlled
4. Close small wounds with butterfly bandages or tape
5. Apply sterile dressing

**Seek medical care if:**
- Bleeding won't stop after 15 min pressure
- Wound edges won't stay together
- Laceration over joint
- Deep wound (fat or muscle visible)
- On face (scarring concern)

### Ankle Sprains

**Immediate Field Treatment:**
1. Stop activity immediately
2. Remove boot to assess (if you can get it back on)
3. Apply cold compress if available
4. Apply compression bandage (figure-8 pattern)
5. Elevate when resting
6. Anti-inflammatory if available (ibuprofen)

**Continuing to Walk:**
- Grade I: May continue with trekking poles and caution
- Grade II: Proceed only if necessary; shorten trip
- Grade III: Do not walk on it; arrange evacuation

**Post-Trip Care:**
- Continue RICE for 48-72 hours
- X-ray recommended to rule out fracture
- Physical therapy for Grade II-III

### Suspected Fractures

**Field Treatment:**
1. **Do not move** the limb unnecessarily
2. **Immobilize** in position found
3. **Splint** above and below suspected break
   - Use trekking poles, sticks, sleeping pad
   - Pad well to prevent pressure sores
4. Apply cold to reduce swelling (not directly on skin)
5. **Elevate** if possible
6. **Monitor circulation** - check pulses, sensation, color below injury
7. **Arrange evacuation** - person should not walk on suspected leg fracture

**Signs requiring immediate evacuation:**
- Bone protruding through skin (open fracture)
- No pulse below injury
- Severe deformity
- Numbness/tingling below injury

### Head Injuries

**For suspected concussion:**
1. Stop activity
2. Assess level of consciousness
3. Ask orientation questions (name, date, location)
4. Check pupils (equal size, react to light)
5. Monitor for worsening symptoms

**If conscious and stable:**
- Rest in comfortable position
- Observe for at least 30 minutes
- Do not leave person alone
- Evacuate if any symptoms worsen

**If unconscious:** ⚠️
1. Protect airway (recovery position if breathing)
2. Do not move neck if spinal injury possible
3. Call for emergency evacuation
4. Monitor breathing constantly
5. Be prepared for CPR

### Spinal Injuries ⚠️ CRITICAL

**If spinal injury suspected:**
1. **DO NOT MOVE THE PATIENT**
2. Keep head, neck, and spine aligned
3. Stabilize head manually
4. Call for emergency evacuation
5. Keep patient warm
6. Monitor airway and breathing
7. Only move if immediate life threat (rockfall, fire)

## Field Treatment Summary Table

| Injury | Immediate Action | Continue Trip? | Medical Care Timing |
|--------|-----------------|----------------|---------------------|
| Minor scrape | Clean, bandage | Yes | No |
| Deep abrasion | Clean, dress, monitor | With caution | If infected |
| Small cut | Pressure, close, dress | Yes | No |
| Deep laceration | Pressure, dress | End trip | Same day |
| Grade I sprain | RICE, wrap | With caution | If not improving |
| Grade II-III sprain | RICE, immobilize | End trip | Same day |
| Suspected fracture | Splint, evacuate | No | Emergency |
| Head injury | Observe | No | Same day minimum |
| Spinal injury | Don't move, evacuate | No | Emergency |

## Post-Trip Medical Care

### Should See Doctor For:
- Any injury not improving after 48 hours
- Wound showing signs of infection
- Persistent joint instability
- Head injury (even if feeling fine)
- Numbness or tingling
- Inability to bear full weight

### Emergency Room Needed For:
- Open fractures
- Severe bleeding
- Head injury with neurological symptoms
- Suspected internal injuries
- Spinal pain with neurological symptoms`,

  prevention: `# Prevention

Most injuries from loose rock terrain are preventable with proper planning, equipment, technique, and judgment. Prevention is far easier than treatment in the backcountry.

## Planning and Preparation

### Route Selection
- **Research terrain** before your trip
- Look for established trails that avoid the worst scree
- Study maps and photos for alternative routes
- Check recent trip reports for current conditions
- Know the **escape routes** if conditions are worse than expected

### Timing Considerations
| Factor | Best Practice |
|--------|---------------|
| Season | Late summer typically most stable |
| Time of day | Early morning (before sun loosens rock) |
| Weather | Dry conditions preferred |
| Recent weather | Avoid after rain, freeze-thaw, or heavy snow |

### Group Considerations
- **Don't travel alone** in serious terrain
- Maintain **spacing** on scree (don't walk directly below others)
- Establish **communication signals** for rockfall
- Brief everyone on techniques before entering terrain

## Essential Equipment

### Footwear
**Critical for loose rock terrain:**
- **Ankle-high boots** with stiff soles
- Good **tread pattern** for grip
- Proper fit (no heel lift)
- Gaiters for fine scree (keeps rocks out)

**NOT recommended:**
- Trail runners (insufficient ankle support)
- Boots with worn treads
- New boots (not broken in)

### Protective Gear
| Item | Purpose |
|------|---------|
| Helmet | Protection from rockfall |
| Gloves | Hand protection on scrambles |
| Long pants | Leg protection from scrapes |
| Gaiters | Keep scree out of boots |
| Trekking poles | Stability and balance |

### Safety Equipment
- **First aid kit** (with ankle wrap, wound care supplies)
- **Communication device** (phone, satellite messenger)
- **Headlamp** (in case of delays)
- **Emergency shelter** for longer routes

## Movement Techniques

### General Principles
1. **Test every foothold** before weighting
2. **Maintain three points of contact** on steeper terrain
3. **Look ahead** - plan your route several steps in advance
4. **Keep weight centered** over feet
5. **Take small steps** - resist overstriding

### Ascending Scree
- **Zigzag** rather than straight up
- **Kick steps** into fine scree
- Look for larger, more stable rocks
- Use hands for balance on steeper sections
- Lean slightly into the slope

### Descending Scree
**Fine scree (controlled glissade):**
- Can "ski" down on heels
- Keep weight back
- Arms out for balance
- Shorter, quicker steps
- Be ready to arrest if sliding too fast

**Coarse scree/boulders:**
- Face forward, not the slope
- Downweight quickly between steps
- Test each rock before committing
- Use trekking poles

### Traversing Scree
- Kick **horizontal platforms** for footing
- Move steadily - don't stop on loose surfaces
- Look for larger rocks or bare ground
- Maintain spacing from others

### Boulder Field Navigation
- Plan route before stepping
- Test rocks by stepping on edge first
- Don't jump (hard to control landing)
- Watch for gaps between rocks (ankle traps)
- Step on **center** of large flat rocks

## Rockfall Prevention and Response

### Preventing Rockfall
- **Step on rocks, not between them** (dislodges less)
- **Warn those below** before entering loose terrain
- **Avoid straight-up routes** where others are below
- **Don't kick or throw rocks** (even "accidentally")

### If You Dislodge a Rock
- **Immediately yell "ROCK!"** - loudly, repeatedly
- Continue shouting until rock stops
- This is **mandatory etiquette** in mountain terrain

### If Rockfall is Coming at You
1. **Look up** to track the rock
2. **Seek shelter** (overhang, large boulder)
3. If no shelter: **press against cliff face**
4. **Protect your head** with arms or pack
5. **Stay put** until rocks stop moving

### Group Management
- **Never directly above or below each other**
- Spread out horizontally when ascending/descending
- Wait at safe spots while others pass exposed sections
- Travel one at a time through high-risk zones

## Decision-Making

### When to Turn Back
- Conditions significantly worse than expected
- Weather deteriorating (rain makes scree dangerous)
- Group member uncomfortable or struggling
- Late in day (rushing leads to accidents)
- Fatigue affecting concentration

### Risk Assessment Questions
Before committing to difficult terrain:
1. What happens if someone falls here?
2. Can we self-rescue if there's an injury?
3. Is there a safer alternative?
4. Are we moving at a sustainable pace?
5. Does everyone feel comfortable?

### Red Flags to Watch For
- Active rockfall visible or audible
- Wet or icy scree
- Extreme steepness
- No escape route
- Fatigue in group members
- Time pressure

## Summary: The "STABLE" Framework

**S** - Study the terrain before entering
**T** - Test every foothold before weighting
**A** - Avoid positions below others
**B** - Be prepared to respond to rockfall
**L** - Leave margin for error (conservative pace)
**E** - Exit early if conditions exceed ability`,

  first_aid: `# Field First Aid

When injuries occur in loose rock terrain, proper field first aid can prevent minor injuries from becoming serious and stabilize severe injuries until help arrives.

## First Aid Kit for Rocky Terrain

### Essential Items
| Item | Use |
|------|-----|
| Elastic bandage (3-4") | Ankle wraps, compression |
| Triangular bandage | Sling, immobilization |
| Gauze pads (various sizes) | Wound dressing |
| Non-stick dressings | Abrasion coverage |
| Medical tape | Securing dressings |
| Antiseptic wipes | Wound cleaning |
| Antibiotic ointment | Infection prevention |
| Butterfly closures | Small wound closure |
| SAM splint | Fracture immobilization |
| Ibuprofen | Pain, inflammation |
| Tweezers | Debris removal |
| Irrigation syringe | Wound cleaning |
| Nitrile gloves | Hygiene |

### Optional but Valuable
- Second elastic bandage
- Hemostatic gauze (for severe bleeding)
- Emergency blanket
- Pain medications (prescription if appropriate)

## Field Treatment Protocols

### Protocol: Abrasion Care

**Materials needed:** Water, antiseptic, gauze, non-stick dressing, tape

**Steps:**
1. **Put on gloves** if treating another person
2. **Irrigate wound** with clean water (use syringe for pressure)
3. **Remove visible debris** with tweezers
4. **Pat dry** with clean gauze
5. **Apply thin layer** of antibiotic ointment
6. **Cover with non-stick dressing**
7. **Secure with tape** (allow some airflow)

**Field tip:** In backcountry, irrigation is more important than antiseptic. Use the cleanest water available.

### Protocol: Laceration Care

**Materials needed:** Gauze, water, antiseptic, butterfly closures or tape, dressing

**Steps:**
1. **Control bleeding** - Direct pressure for 10+ minutes
2. **Don't peek** - Removing pressure restarts clotting
3. **Elevate** limb if possible
4. Once bleeding controlled, **clean wound edges**
5. **Dry the skin** around wound (tape won't stick to wet skin)
6. **Close wound** with butterfly closures:
   - Place perpendicular to wound
   - Apply one side, pull wound edges together, apply other side
   - Use multiple closures, leaving gaps for drainage
7. **Cover with sterile dressing**

**Do NOT close if:**
- Wound is heavily contaminated
- More than 8 hours old
- Deep puncture wound
- Signs of infection

### Protocol: Ankle Wrap (Compression)

**Materials needed:** Elastic bandage (3-4" width)

**Figure-8 wrap technique:**
1. Start with **two anchoring wraps** around mid-foot
2. Wrap **diagonally up** across the top of foot to ankle
3. Go **around the back** of the ankle
4. Wrap **diagonally down** across the front to the other side of foot
5. Go **under the arch** and repeat figure-8
6. Continue **3-4 figure-8s**, overlapping each layer by half
7. Finish with **two wraps around lower calf**
8. Secure with clips or tape

**Check circulation:** Can you wiggle toes? Is foot warm? Any numbness?

### Protocol: Improvised Splinting

**For suspected fracture:**

**Principles:**
- Immobilize the joint ABOVE and BELOW the suspected break
- Pad well to prevent pressure sores
- Don't straighten obvious deformities
- Check circulation before and after splinting

**Improvised splint materials:**
| Item | Use |
|------|-----|
| Trekking poles | Leg or arm splints |
| Sleeping pad (rolled) | Leg splints |
| Foam pad | Padding |
| Clothing | Padding and securing |
| Pack frame stay | Rigid splint |
| Tree branches | Emergency splint |

**Lower leg splint:**
1. Cut/fold sleeping pad to wrap around leg
2. Position from mid-thigh to below foot
3. Pad all bony prominences
4. Secure with tape, bandages, or strips of clothing
5. Immobilize knee and ankle
6. Check circulation at toes

### Protocol: Head Injury Assessment

**Immediate actions:**
1. Ensure scene safety (no ongoing rockfall)
2. Stabilize head and neck if mechanism suggests spinal injury
3. Check responsiveness: "Can you hear me?"

**If responsive:**
1. Ask orientation questions:
   - What's your name?
   - Where are we?
   - What day is it?
   - What happened?
2. Check pupils (equal size, react to light)
3. Check for clear fluid from ears/nose (skull fracture sign)
4. Note any worsening symptoms

**Concussion monitoring checklist** (check every 15 minutes):
- [ ] Alert and oriented
- [ ] Headache (same/better/worse)
- [ ] Nausea or vomiting
- [ ] Vision normal
- [ ] Balance normal
- [ ] Memory intact

**Evacuate if:**
- Loss of consciousness (even brief)
- Confusion not improving
- Worsening headache
- Repeated vomiting
- Unequal pupils
- Clear fluid from ears/nose
- Seizure
- Unable to walk normally

### Protocol: Shock Management

**Signs of shock:**
- Pale, cool, clammy skin
- Rapid, weak pulse
- Rapid, shallow breathing
- Confusion or anxiety
- Thirst
- Weakness

**Treatment:**
1. **Treat the cause** (control bleeding, splint fractures)
2. **Lay patient down** with legs elevated 8-12"
3. **Keep warm** (prevent heat loss to ground)
4. **Do not give food or water** (unless evacuation >24 hours)
5. **Monitor vital signs**
6. **Calm and reassure**
7. **Evacuate** - shock requires medical care

## Emergency Communication

### Information to Relay
When calling for help, provide:
- **Location** (GPS coordinates if possible)
- **Number of patients** and injuries
- **Patient condition** (conscious? breathing? bleeding?)
- **Mechanism of injury** (fall? rockfall?)
- **Treatment given**
- **Resources available** (people, gear)
- **Terrain** and access challenges
- **Weather conditions**

### Universal Distress Signals
- **Three of anything:** 3 whistle blasts, 3 fires, 3 light flashes
- **SOS:** ··· --- ··· (whistle or light)
- **Ground-to-air:** Large X made of rocks or gear

## When You Can't Evacuate

If you must spend the night with an injured person:
1. Find/create shelter from elements
2. Insulate from ground (biggest heat loss)
3. Share body heat if hypothermia risk
4. Keep patient hydrated if able to swallow
5. Monitor vitals through the night
6. Be ready to move at first light or when help arrives`,

  seasonal_info: `# Seasonal Information

Loose rock terrain hazards vary significantly by season. Temperature, precipitation, and freeze-thaw cycles all affect rock stability and travel conditions.

## Spring (March - June)

### Conditions
- **Freeze-thaw cycles** at peak activity
- Water expands in rock cracks when frozen, then releases
- **Most active rockfall period** in many areas
- Snow and ice may hide loose rock
- Wet conditions reduce friction
- Snowmelt saturates slopes

### Hazard Level: 🔴 **HIGH**

### Specific Risks
| Risk | Details |
|------|---------|
| Rockfall | Maximum due to freeze-thaw |
| Hidden hazards | Snow covers loose rock |
| Wet rock | Extremely slippery |
| Avalanche | Wet slides can trigger rock |
| Postholing | Breaking through snow onto rocks |

### Tips for Spring
- **Wait for conditions to stabilize** when possible
- Travel in **early morning** when frozen
- Avoid being below cliff faces in afternoon sun
- **Wear crampons/microspikes** on icy approaches
- Be prepared for rapidly changing conditions
- Check avalanche forecasts even on rocky terrain

### Best Spring Windows
- Before daily warming (pre-dawn to mid-morning)
- Multi-day cold snaps (everything stays frozen)
- Late spring after snowmelt, before summer storms

## Summer (June - September)

### Conditions
- Generally **most stable** rock conditions
- Dry conditions improve friction
- Best visibility of hazards
- High sun angle causes afternoon thermal expansion
- Thunderstorm season brings wet rock

### Hazard Level: 🟡 **MODERATE**

### Specific Risks
| Risk | Details |
|------|---------|
| Afternoon rockfall | Sun warms cliffs, loosening rock |
| Storm-wet rock | Slippery conditions develop quickly |
| Heat | Dehydration, exhaustion on approaches |
| Lightning | Exposed ridges and peaks |
| Crowds | More traffic = more rockfall potential |

### Tips for Summer
- **Alpine start** - Begin early to finish technical terrain by afternoon
- Watch weather - Be off exposed terrain before storms
- Carry extra water on scree approaches
- Maintain spacing from other parties
- Travel light for better agility

### Ideal Summer Conditions
- Clear, dry weather
- Cool morning temperatures
- No recent precipitation
- Established trails through worst sections

## Fall (September - November)

### Conditions
- **Freeze-thaw cycles resume** at higher elevations
- Days shorten - less time for technical terrain
- Rock still generally dry in early fall
- First storms bring wet and icy conditions
- Temperatures fluctuate significantly

### Hazard Level: 🟡 **MODERATE** (early) → 🔴 **HIGH** (late)

### Specific Risks
| Risk | Details |
|------|---------|
| Short days | Less margin for delays |
| Early snow | Hidden hazards return |
| Ice | Verglas on rock, black ice |
| Changing conditions | Weather less predictable |
| Freeze-thaw | Increases late in season |

### Tips for Fall
- **Conservative objectives** - Choose shorter routes
- Start even earlier (daylight is limited)
- Carry extra layers and headlamp
- **Be willing to turn back** - conditions change fast
- Monitor forecasts closely

### Best Fall Windows
- September often excellent (stable, dry)
- Indian summer periods
- Avoid after first significant storms

## Winter (December - March)

### Conditions
- Snow and ice **conceal all rock hazards**
- Frozen conditions may stabilize some loose rock
- Avalanche hazard often dominates concerns
- Limited daylight
- Extreme cold adds complications

### Hazard Level: Variable
- 🟢 **LOW** for rockfall (frozen in place)
- 🔴 **HIGH** for hidden hazards, ice, avalanche

### Specific Risks
| Risk | Details |
|------|---------|
| Hidden rock | Snow covers everything |
| Ice | Rock covered with verglas |
| Avalanche | Often travels over rocky terrain |
| Cold injuries | Frostbite, hypothermia |
| Short days | Very limited operational window |

### Tips for Winter
- **Treat as mountaineering terrain** (crampons, ice axe)
- Avalanche safety training essential
- Travel on established routes when possible
- Allow extra time for everything
- Know how to self-arrest on icy rock

## Seasonal Comparison Chart

| Factor | Spring | Summer | Fall | Winter |
|--------|--------|--------|------|--------|
| Rockfall risk | High | Moderate | Moderate | Low |
| Hidden hazards | High | Low | Low-Moderate | High |
| Friction/Grip | Poor | Good | Good→Poor | Ice-dependent |
| Best time of day | Early AM | Early AM | Early AM | Midday |
| Daylight | Increasing | Long | Decreasing | Short |
| Predictability | Low | High | Moderate | Low |

## Time of Day Considerations

### Early Morning (Dawn - 9 AM)
- **Safest for rockfall** - rock is cold and contracted
- Frozen surfaces may require traction
- Best window for serious terrain

### Midday (9 AM - 3 PM)
- Sun warms south-facing slopes
- Rock expansion begins loosening material
- **Peak rockfall danger** in afternoon
- Thunderstorm development (summer)

### Evening (3 PM - Dusk)
- Temperatures dropping
- Some stabilization occurring
- Limited time before dark
- **Not ideal** for entering serious terrain

### Night
- Rock generally stable (cold)
- **Visibility zero** for hazard avoidance
- Only for emergency or planned bivouac

## Geographic Variations

### By Elevation
| Zone | Seasonal Considerations |
|------|------------------------|
| Below treeline | Most forgiving; longer seasons |
| Treeline zone | Transition area; variable |
| Alpine zone | Shortest safe season; most technical |
| High alpine | Winter conditions much of year |

### By Aspect
| Aspect | Characteristics |
|--------|----------------|
| North-facing | Holds snow longer; colder; more ice |
| South-facing | Earliest to clear; warmest; most freeze-thaw |
| East-facing | Morning sun; afternoon shade |
| West-facing | Afternoon sun; catches storms |

## Weather Impact Summary

| Weather | Effect on Loose Rock |
|---------|---------------------|
| Rain | Lubricates slopes; avoid |
| Snow | Hides hazards; transforms terrain |
| Cold snap | Freezes rock in place; watch for ice |
| Heat wave | Thermal expansion; afternoon danger |
| Wind | Dries slopes; can knock loose rock |
| Frost | Morning ice on rock; slippery |`
};

export const POST: RequestHandler = async ({ locals }) => {
  const supabase = locals.supabase;

  // Check authentication and permissions
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw error(401, 'Authentication required');
  }

  // Check for moderator/admin role
  const { data: userRecord } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userRecord || !['moderator', 'admin'].includes(userRecord.role)) {
    throw error(403, 'Admin or moderator role required');
  }

  const results: { templateSlug: string; filesCreated: string[]; errors: string[] }[] = [];

  // Define all templates to seed
  const templates = [
    {
      slug: 'poison_ivy',
      storagePath: 'plants/poisonous_things/poison_ivy',
      content: POISON_IVY_CONTENT
    },
    {
      slug: 'yellow_jacket',
      storagePath: 'insects/stinging/yellow_jacket',
      content: YELLOW_JACKET_CONTENT
    },
    {
      slug: 'loose_rock_scree',
      storagePath: 'terrain/unstable/loose_rock_scree',
      content: LOOSE_ROCK_SCREE_CONTENT
    }
  ];

  // Seed each template
  for (const template of templates) {
    const result = await seedTemplateContent(
      supabase,
      template.slug,
      template.storagePath,
      template.content
    );
    results.push(result);

    // Update the template to mark it has educational content
    if (result.filesCreated.length > 0) {
      const { error: updateError } = await supabase
        .from('hazard_templates')
        .update({
          storage_path: template.storagePath,
          has_educational_content: true,
          updated_at: new Date().toISOString()
        })
        .eq('slug', template.slug);

      if (updateError) {
        result.errors.push(`Failed to update template: ${updateError.message}`);
      }
    }
  }

  return json({
    success: results.every(r => r.errors.length === 0),
    results
  });
};

async function seedTemplateContent(
  supabase: App.Locals['supabase'],
  templateSlug: string,
  storagePath: string,
  content: Record<string, string>
): Promise<{ templateSlug: string; filesCreated: string[]; errors: string[] }> {
  const filesCreated: string[] = [];
  const errors: string[] = [];

  for (const [sectionId, markdown] of Object.entries(content)) {
    const filePath = `${storagePath}/${sectionId}.md`;
    
    // Upload the content
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, new Blob([markdown], { type: 'text/markdown' }), {
        contentType: 'text/markdown',
        upsert: true // Overwrite if exists
      });

    if (uploadError) {
      errors.push(`Failed to upload ${filePath}: ${uploadError.message}`);
    } else {
      filesCreated.push(filePath);
    }
  }

  return { templateSlug, filesCreated, errors };
}
