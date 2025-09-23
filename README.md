# Cider Dictionary - Personal Cider Collection Tracker

A React Native mobile application for systematically tracking and analyzing personal cider consumption experiences.

## 🎯 Project Overview

**Purpose**: Help cider enthusiasts systematically track their collection, log drinking experiences, and work toward trying "all ciders" through comprehensive analytics and progress tracking.

**Key Goals**:
- Quick 30-second cider logging while out drinking
- Progressive disclosure for detailed cider characteristics (casual → enthusiast → expert)
- Collection completeness tracking based on personal collection diversity
- Venue and price analytics with mapping
- Firebase-first architecture staying within free tiers

## 📁 Project Structure

```
cider_dictionary/
├── docs/                           # All project documentation
│   ├── specifications/            # Core project requirements
│   │   ├── problem-analysis.md   # Project vision and user analysis
│   │   ├── technical-specification.md # Firebase-first architecture
│   │   └── sparc-comprehensive-specification.md # Detailed requirements
│   ├── design/                   # UI/UX and design documentation
│   │   └── ui-ux-specification.md # Interface design guidelines
│   ├── database/                 # Data model documentation
│   │   └── cider-data-model.md   # Database structure with progressive disclosure
│   └── research/                 # Background research on cider classification
│       └── research_results/     # Completed cider classification research
├── src/                          # React Native source code (to be created)
└── README.md                     # This file
```

## 🏗️ Architecture Overview

### **Firebase-First Design**
- **Primary Database**: Firebase Firestore (single source of truth)
- **Offline Support**: Built-in Firebase offline persistence
- **Images**: Firebase Storage with automatic retry
- **Local Storage**: MMKV for preferences only
- **Cost Target**: £0/month (within all free tiers)

### **Technology Stack**
- **Frontend**: React Native 0.72+ with TypeScript
- **Development**: Expo SDK 49+
- **Navigation**: React Navigation 6.x
- **State**: Zustand + React Query
- **Maps**: Google Maps SDK + Places API
- **Animations**: React Native Reanimated 3.x

## 📱 App Structure

### **Navigation (Bottom Tabs)**
```
┌──────────┬──────────┬──────────┬────┐
│Dictionary│Analytics │Progress  │ +  │
│   🗂️     │    📊    │    🎯    │    │
└──────────┴──────────┴──────────┴────┘
```

1. **Dictionary** - Main cider collection with search/filtering
2. **Analytics** - Rankings, statistics, venue analysis (3 sub-tabs)
3. **Progress** - Collection completeness and achievements
4. **Add** - Quick "Log New Cider" workflow

### **Core User Flows**
1. **Quick Entry**: Search → Found/Not Found → Log Experience/Add New Cider
2. **Progressive Disclosure**: Core info → Basic details → Expert classification
3. **Experience Logging**: Venue + Price + Notes (30-second target)
4. **Collection Analysis**: Completeness tracking + Gap analysis

## 🗄️ Data Model

### **Core Entities**
- **CiderMasterRecord**: One per unique cider (characteristics defined once)
- **ExperienceLog**: Each time you drink a cider (venue, price, notes)
- **VenueRecord**: Aggregated venue analytics
- **User**: Preferences and collection statistics

### **Progressive Disclosure Pattern**
- **Required**: Name, Brand, ABV, Overall Rating (30-second entry)
- **Optional Basic**: Taste tags, style, basic characteristics
- **Optional Expert**: Apple varieties, production methods, detailed ratings

### **Collection Completeness Algorithm**
```
Completeness = (Unique characteristics in your collection / Total characteristics found across your ciders) × 100
```
- Grows dynamically as you add more diverse ciders
- Personal journey based only on YOUR collection

## 🎨 Design Philosophy

### **UI/UX Principles**
- **Modern**: Card-based interface with glassmorphism effects
- **Photo-dominant**: Visual cider identification
- **Gesture-driven**: Swipe actions for quick operations
- **Progressive disclosure**: Show complexity only when needed
- **Offline-first**: All features work without internet

### **Key Design Elements**
- **Color Palette**: Cider amber (#D4A574) primary, semantic colors
- **Cards**: Staggered grid with hero photos and rating overlays
- **Search**: Floating glassmorphism search bar
- **Animations**: Smooth 60fps with haptic feedback

## 📊 Key Features

### **Smart Collection Management**
- Duplicate detection with fuzzy matching
- Venue name consolidation (e.g., "Tesco Extra" → "Tesco")
- Automatic price per ml calculations
- Image compression and upload queuing

### **Analytics & Insights**
- Best/worst ciders by rating and value
- Venue price analysis and heat maps
- Collection progress tracking
- Achievement badges for milestones

### **Offline Capabilities**
- Full functionality without internet
- Automatic background sync when connected
- Conflict resolution for concurrent edits
- Image upload queue with retry logic

## 🚀 Getting Started (For Next Assistant)

### **Understanding the Project**
1. **Start here**: `docs/specifications/problem-analysis.md` - Understand WHY
2. **Data structure**: `docs/database/cider-data-model.md` - Understand WHAT
3. **Architecture**: `docs/specifications/technical-specification.md` - Understand HOW
4. **Interface**: `docs/design/ui-ux-specification.md` - Understand USER EXPERIENCE

### **Development Approach**
1. **Read specifications thoroughly** - Everything is already designed
2. **Follow Firebase-first architecture** - No complex sync logic needed
3. **Implement progressive disclosure** - Start simple, add complexity optionally
4. **Stay within free tiers** - Monitor Firebase/Google Maps usage
5. **Prioritize offline-first** - Users drink ciders in pubs without WiFi

### **Critical Implementation Notes**
- **Progressive Disclosure**: Core form must work with just 4 fields
- **Venue Consolidation**: Essential for clean analytics
- **Image Optimization**: Compress before upload to save storage costs
- **Search Performance**: Must be under 200ms for 100-cider collections
- **Offline Sync**: Use Firebase's built-in persistence, don't build custom sync

## 🧠 Key Concepts to Understand

### **Collection Completeness**
- Not about trying ALL ciders in the world
- About maximizing diversity within YOUR personal collection
- Calculation grows as you add more diverse characteristics
- Drives exploration toward gaps in your collection

### **Progressive Disclosure**
- Casual users: Just name, brand, ABV, rating
- Enthusiasts: Add taste tags, style, basic characteristics
- Experts: Full Long Ashton classification, production methods
- Anyone can save at any level

### **Firebase-First Benefits**
- No complex sync logic to build
- Automatic offline persistence
- Real-time updates across devices
- Built-in conflict resolution
- Scales within free tier for personal use

### **Cost Optimization Strategy**
- Firebase Firestore: <50k reads, 20k writes monthly
- Firebase Storage: <5GB total (image compression essential)
- Google Maps: <28k loads monthly (personal usage only)
- All within free tiers for individual users

## 📋 Development Priorities

### **Phase 1: Core MVP**
1. Firebase setup and authentication
2. Basic cider entry (4 required fields)
3. Simple list view with search
4. Experience logging workflow

### **Phase 2: Enhanced Features**
1. Progressive disclosure forms
2. Analytics dashboard
3. Map integration
4. Offline sync testing

### **Phase 3: Polish**
1. Animations and micro-interactions
2. Achievement system
3. Image optimization
4. Performance optimization

## ⚠️ Important Constraints

### **Technical Constraints**
- Must stay within Firebase free tier
- Single user per app instance (no sharing between users)
- Optimize for ~100 ciders, 500+ experiences
- Offline-first mentality required

### **Design Constraints**
- 30-second quick entry target
- Progressive disclosure - never overwhelm casual users
- Photo-dominant interface for visual recognition
- Mobile-first (React Native only)

### **Business Constraints**
- Personal use only (not commercial)
- No paid infrastructure dependencies
- Single developer maintenance model
- Open source libraries only

## 🔍 Quick Reference

### **Most Important Files**
1. `docs/specifications/problem-analysis.md` - Project foundation
2. `docs/database/cider-data-model.md` - Data structure
3. `docs/specifications/technical-specification.md` - Implementation guide
4. `docs/design/ui-ux-specification.md` - Interface design

### **Key Algorithms**
- Collection completeness calculation
- Venue name consolidation
- Duplicate cider detection
- Price per ml calculations

### **Critical User Stories**
- "Log a cider in 30 seconds while at pub"
- "Find out if I've tried this cider before"
- "Track progress toward trying all cider types"
- "Analyze spending patterns and venue value"

---

**Remember**: This project is about systematic collection building, not crisis management. The user wants to methodically work toward trying every type of cider characteristic, with the app helping them track progress and discover gaps in their collection.

**Next Assistant**: Read the specifications thoroughly before starting any implementation. Everything has been carefully designed with progressive disclosure and Firebase-first architecture in mind.