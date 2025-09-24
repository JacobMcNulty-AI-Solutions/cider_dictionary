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
│   ├── specifications/            # Core project requirements (SPARC Phase 1)
│   │   ├── README.md             # Specifications phase documentation guide
│   │   ├── problem-analysis.md   # Project vision and user analysis
│   │   ├── technical-specification.md # Firebase-first architecture
│   │   └── sparc-comprehensive-specification.md # Complete requirements
│   ├── pseudocode/               # Algorithm definitions (SPARC Phase 2)
│   │   ├── README.md             # Pseudocode phase documentation guide
│   │   ├── pseudocode-development-plan.md # Planning document
│   │   ├── 01-data-structures.pseudo # Core data models and types
│   │   ├── 02-database-operations.pseudo # SQLite operations
│   │   ├── 03-state-management.pseudo # Application state patterns
│   │   ├── 04-quick-entry-system.pseudo # 30-second workflow
│   │   ├── 05-search-and-discovery.pseudo # Search functionality
│   │   ├── 06-experience-logging.pseudo # Tasting note creation
│   │   ├── 07-collection-analytics.pseudo # Personal collection insights
│   │   ├── 08-venue-analytics.pseudo # Venue discovery and data
│   │   ├── 09-rankings-system.pseudo # Rating and ranking algorithms
│   │   ├── 10-offline-sync-orchestration.pseudo # Sync logic
│   │   ├── 11-firebase-optimization.pseudo # Firebase integration
│   │   ├── 12-performance-optimization.pseudo # Performance monitoring
│   │   ├── 13-ui-interactions.pseudo # User interface behavior
│   │   └── 14-error-handling-system.pseudo # Error management
│   ├── architecture/             # System design (SPARC Phase 3)
│   │   ├── README.md             # Architecture documentation hub
│   │   ├── architecture-documentation-plan.md # Strategic planning
│   │   ├── architecture-dependencies-matrix.md # Dependency mapping
│   │   ├── documentation-integration-strategy.md # Integration approach
│   │   ├── 01-system-overview.md # High-level architecture
│   │   ├── 02-data-flow-architecture.md # State management patterns
│   │   ├── 03-firebase-integration-architecture.md # Firebase patterns
│   │   ├── 04-component-architecture.md # React Native components
│   │   ├── 05-offline-first-patterns.md # Offline sync patterns
│   │   ├── 06-performance-patterns.md # Performance optimization
│   │   ├── 07-analytics-architecture.md # Analytics patterns
│   │   ├── 08-security-patterns.md # Security implementation
│   │   ├── 09-testing-strategies.md # Testing architecture
│   │   └── 10-build-deployment-patterns.md # Build & deployment
│   ├── implementation/           # 4-phase development plan (SPARC Phase 4)
│   │   ├── README.md             # Implementation plan overview
│   │   ├── implementation-plan-phase-1.md # Prototype (basic functionality)
│   │   ├── implementation-plan-phase-2.md # Basic features
│   │   ├── implementation-plan-phase-3.md # MVP with production features
│   │   └── implementation-plan-phase-4.md # Complete feature set
│   ├── design/                   # UI/UX and design documentation
│   │   └── ui-ux-specification.md # Interface design guidelines
│   ├── database/                 # Data model documentation
│   │   └── cider-data-model.md   # Database structure with progressive disclosure
│   ├── research/                 # Background research on cider classification
│   │   ├── research_questions/   # Original research specifications (6 files)
│   │   └── research_results/     # Completed research findings (6 files)
│   └── README.md                 # Documentation hub and SPARC progress
├── mobile-app/                   # React Native application (to be created)
│   ├── package.json             # Dependencies and scripts
│   └── src/                     # Source code (to be implemented)
└── README.md                     # This file - project overview and getting started
```

## 🏗️ Architecture Overview

### **Firebase-First Design**
- **Primary Database**: Firebase Firestore (single source of truth)
- **Offline Support**: Built-in Firebase offline persistence
- **Images**: Firebase Storage with automatic retry
- **Local Storage**: MMKV for preferences only
- **Cost Target**: £0/month (within all free tiers)

### **Technology Stack**
- **Frontend**: React Native 0.75.4 with TypeScript
- **Development**: Expo SDK 54
- **Database**: SQLite (primary) + Firebase (sync)
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

## 🚀 Getting Started

### **SPARC Development Methodology**
This project follows the complete SPARC methodology:
1. ✅ **Specification** - Complete requirements and problem analysis
2. ✅ **Pseudocode** - 14 algorithm definitions covering all core functionality
3. ✅ **Architecture** - 10 comprehensive architecture documents
4. ✅ **Refinement** - 4-phase implementation plan with simplified Phase 1
5. 🔄 **Code** - Ready for implementation following the structured plan

### **Understanding the Project**
1. **Start here**: `docs/specifications/sparc-comprehensive-specification.md` - Complete requirements
2. **Implementation**: `docs/implementation/` - 4-phase development plan
3. **Architecture**: `docs/architecture/01-system-overview.md` - System design
4. **Algorithms**: `docs/pseudocode/` - Detailed logic for all features

### **Development Approach**
1. **Follow the 4-phase plan** - Prototype → Basic → MVP → Full features
2. **Offline-first architecture** - SQLite primary, Firebase sync
3. **Progressive disclosure** - Start simple, add expert features optionally
4. **Performance targets** - 30-second quick entry, sub-200ms search

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

## 📋 4-Phase Implementation Plan

### **Phase 1: Prototype**
- Basic working app with simplified 5-field data model
- SQLite storage and basic Firebase setup
- Essential UI components (Add, List, Simple Analytics)
- Target: Functional prototype for validation

### **Phase 2: Basic Features**
- Comprehensive 50+ field cider data model
- Local encryption and venue database
- Enhanced UI components with progressive disclosure
- Target: Core functionality with proper data structure

### **Phase 3: MVP**
- Production-level error handling and monitoring
- Performance optimization and analytics
- Complete offline sync and conflict resolution
- Target: Production-ready application

### **Phase 4: Full Features**
- Advanced venue consolidation algorithms
- Collection completeness and social features
- Expert mode with full Long Ashton classification
- Target: Complete feature set with advanced capabilities

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
1. `docs/specifications/sparc-comprehensive-specification.md` - Complete requirements
2. `docs/implementation/` - 4-phase implementation plans
3. `docs/architecture/01-system-overview.md` - System architecture
4. `docs/pseudocode/01-data-structures.pseudo` - Core data models

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