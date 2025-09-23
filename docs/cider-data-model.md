# Cider Dictionary Data Model

## Overview
This document defines the complete data structure for the Cider Dictionary app, supporting both **Cider Master Records** (characteristics defined once) and **Experience Logs** (each time you drink it).

## Data Structure

### Cider Master Record
**Created once per unique cider, contains all identifying characteristics**

#### Basic Information
- **Cider Name**: Text (required)
- **Brand/Producer**: Text (required)
- **ABV Percentage**: Number (required)
- **Container Types**: Multi-select from predefined list
- **Photo**: Image file (required)
- **Unstructured Notes**: Free text area

#### Container Type Options
```
- Pint Glass (568ml)
- Half Pint Glass (284ml)
- 500ml Bottle
- 440ml Can
- 330ml Bottle/Can
- 275ml Bottle
- 750ml Bottle
- Keg/Draught
- 2L Bottle
- Bag-in-Box
- Custom Size (specify ml)
```

#### Taste Tags (Predetermined)
**Multi-select, unlimited selections allowed**
```
Primary Characteristics:
- Dry
- Sweet
- Tart
- Sharp
- Crisp
- Smooth
- Refreshing

Apple Character:
- Fresh Apple
- Cooked Apple
- Green Apple
- Red Apple
- Apple Pie
- Orchard Fresh

Flavor Notes:
- Fruity
- Citrus
- Tropical
- Berry
- Stone Fruit
- Floral
- Honey
- Vanilla
- Oak
- Spicy
- Herbal
- Earthy
- Funky
- Yeasty

Mouthfeel:
- Light-bodied
- Medium-bodied
- Full-bodied
- Fizzy
- Still
- Creamy
- Astringent
- Tannic
- Balanced
- Complex
```

#### Style Classifications

**Traditional Style** (Single select)
```
- West Country Traditional
- Eastern England Traditional
- French Normandy/Brittany
- Spanish Sidra
- German Apfelwein
- Modern/New World
- American Traditional
- Other Regional
```

**Apple Categories** (Multi-select - Long Ashton classification)
```
- Bittersweet (high tannin, low acid)
- Bittersharp (high tannin, high acid)
- Sweet (low tannin, low acid)
- Sharp (low tannin, high acid)
- Culinary/Dessert Apples
- Unknown/Blend
```

**Specific Apple Varieties** (Multi-select, free text + common options)
```
Heritage Varieties:
- Kingston Black
- Dabinett
- Yarlington Mill
- Harry Masters Jersey
- Tremlett's Bitter
- Court Royal
- Foxwhelp
- Somerset Redstreak

Modern Varieties:
- Bramley's Seedling
- Cox's Orange Pippin
- Braeburn
- Pink Lady
- Gala
- Discovery

Other: [Free text input]
```

#### Technical Characteristics

**Sweetness Level** (Single select)
```
- Bone Dry
- Dry
- Off-Dry
- Medium
- Sweet
```

**Carbonation** (Single select)
```
- Still
- Lightly Sparkling (Pétillant)
- Sparkling
- Highly Carbonated
```

**Clarity** (Single select)
```
- Crystal Clear
- Clear
- Hazy
- Cloudy
- Opaque
```

**Color** (Single select)
```
- Pale Straw
- Golden
- Amber
- Copper
- Ruby
- Pink/Rosé
- Dark Amber
```

#### Production Methods

**Fermentation Type** (Single select)
```
- Wild/Spontaneous
- Cultured Yeast
- Mixed Fermentation
- Unknown
```

**Special Processes** (Multi-select)
```
- Keeved
- Pét-nat (Méthode Ancestrale)
- Barrel-aged
- Ice Cider
- Pasteurized
- Sterile Filtered
- Bottle Conditioned
- Sour/Brett Fermented
- Fortified
- Solera Aged
```

#### Additives & Ingredients

**Fruit Additions** (Multi-select)
```
None (Apple only):
- Pure Apple Cider

Perry:
- Traditional Perry Pears
- Dessert Pears

Berries:
- Blackberry
- Raspberry
- Blueberry
- Elderberry
- Blackcurrant
- Strawberry

Stone Fruits:
- Cherry
- Peach
- Plum
- Apricot

Tropical:
- Pineapple
- Mango
- Passion Fruit
- Coconut

Other: [Free text]
```

**Hops** (Multi-select)
```
None:
- No Hops

Hop Varieties:
- Citra
- Mosaic
- Cascade
- Amarillo
- Simcoe
- Target
- Fuggle
- Goldings
- Other: [Free text]

Hop Character:
- Citrus
- Floral
- Pine/Resin
- Earthy/Spicy
```

**Spices & Botanicals** (Multi-select)
```
None:
- No Spices/Botanicals

Traditional Spices:
- Cinnamon
- Nutmeg
- Cloves
- Ginger
- Allspice

Modern Botanicals:
- Elderflower
- Chamomile
- Lavender
- Hibiscus
- Juniper
- Lemongrass
- Rosehips

Seasonal:
- Pumpkin Spice
- Mulling Spices
- Chai Spices

Other: [Free text]
```

**Wood Aging** (Multi-select)
```
None:
- No Wood Aging

Oak Types:
- American Oak
- French Oak
- English Oak

Barrel History:
- Virgin Oak
- Bourbon Barrel
- Wine Barrel
- Sherry Barrel
- Rum Barrel
- Gin Barrel

Alternative Woods:
- Cherry
- Apple
- Chestnut
- Acacia

Other: [Free text]
```

#### Quality & Regional Indicators

**Producer Size** (Single select)
```
- Farmhouse (< 70 hectoliters)
- Craft/Small (70-5000 hectoliters)
- Regional (5000-50000 hectoliters)
- Commercial (50000+ hectoliters)
- Industrial/Mass Market
```

**Quality Certification** (Multi-select)
```
- CAMRA Real Cider (90%+ fresh juice)
- Organic Certified
- PGI Protected (Gloucestershire/Herefordshire/Worcestershire)
- Traditional Welsh Cider
- Biodynamic
- Single Orchard
- Single Variety
```

#### 6-Category Scoring (1-10 scale, required)
- **Appearance**: Visual appeal, color, clarity
- **Aroma**: Smell intensity and character
- **Taste**: Flavor complexity and balance
- **Mouthfeel**: Texture, carbonation, body
- **Value**: Price-to-quality ratio (calculated after first purchase)
- **Overall**: Would you drink again rating

### Experience Log Record
**Created each time you drink a cider**

#### Basic Experience Data
- **Date & Time**: Auto-populated, manually adjustable
- **Venue Name**: Text (required)
- **GPS Location**: Auto-captured coordinates
- **Venue Type**: Single select from predefined list
- **Exact Price Paid**: Currency amount (required)
- **Container Size**: Number (ml) - used to calculate price per ml
- **Unstructured Notes**: Free text for this specific experience

#### Venue Type Options
```
- Pub
- Bar
- Restaurant
- Tesco
- Sainsbury's
- ASDA
- Morrisons
- ALDI
- Lidl
- Waitrose
- Iceland
- Co-op
- Marks & Spencer
- Off-License
- Bottle Shop
- Online Purchase
- Cidery/Brewery Taproom
- Farmers Market
- Farm Shop
- Festival
- Concert
- Specialist Retailer
- Other: [Free text]
```

### Calculated Fields
**Automatically computed by the system**

#### Cider-Level Calculations
- **Average Price**: Mean of all experience log prices
- **Price per ml**: Average price ÷ average container size
- **Times Tried**: Count of experience logs
- **Best Value Venue**: Venue with lowest price per ml
- **Most Expensive Venue**: Venue with highest price per ml
- **First Tried Date**: Earliest experience log date
- **Last Tried Date**: Most recent experience log date

#### Collection Progress Tracking
- **Style Coverage**: Which traditional styles have been tried
- **Apple Category Coverage**: Which Long Ashton categories experienced
- **Production Method Coverage**: Which special processes sampled
- **Additive Coverage**: Which additive categories tried
- **Regional Coverage**: Which UK regions/international styles sampled

#### Analytics & Rankings
- **Overall Rating Rank**: Position in personal rankings by overall score
- **Value Rating**: Overall score ÷ average price per ml
- **Category Leader**: Highest rated in each style/technical category
- **Venue Analysis**: Most/least expensive venues by category
- **Seasonal Patterns**: Drinking frequency by time/season

## Data Relationships

### Primary Entities
1. **Cider Master Record** (1) → **Experience Logs** (Many)
2. **Venue** (1) → **Experience Logs** (Many)
3. **Taste Tags** (Many) → **Cider Master Records** (Many)

### Collection Tracking
- **Style Matrix**: Track combinations of characteristics tried
- **Completeness Percentage**: Progress toward trying all major categories
- **Discovery Timeline**: Chronological record of new cider additions
- **Achievement Badges**: Milestones like "Four Corners" (all apple categories)

This data model supports both quick logging workflows and comprehensive collection analysis, enabling systematic progress toward trying every possible cider characteristic combination.