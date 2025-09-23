# Cider Dictionary Technical Specification

## Overview
Personal cider journaling mobile application built with React Native and TypeScript, featuring offline-first architecture with Firebase cloud sync. Designed for systematic collection tracking with comprehensive analytics and mapping capabilities.

## Technology Stack

### Frontend Framework
- **React Native** 0.72+ with **TypeScript** 5.0+
- **Expo SDK** 49+ for development tooling and native module access
- **React Navigation** 6.x for stack and tab navigation
- **React Native Reanimated** 3.x for smooth animations
- **React Native Gesture Handler** for swipe interactions

### Backend & Database
- **Firebase Firestore** for cloud database (real-time sync)
- **Firebase Authentication** for user management and multi-device sync
- **Firebase Storage** for image storage with custom upload queue
- **SQLite** (react-native-sqlite-storage) for offline-first local database

### Maps & Location
- **Google Maps SDK** for React Native (@react-native-google-maps/maps)
- **Google Places API** for venue search and autocomplete
- **React Native Geolocation** for GPS coordinates
- **React Native Permissions** for location access management

### State Management
- **Zustand** for global state management (lightweight alternative to Redux)
- **React Query/TanStack Query** for server state and caching
- **MMKV** for fast local key-value storage (user preferences)

### UI/UX Libraries
- **React Native Elements** or **NativeBase** for base components
- **React Native Vector Icons** for iconography
- **React Native Linear Gradient** for glassmorphism effects
- **React Native Blur** for backdrop blur effects
- **Lottie React Native** for complex animations

## Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────┐
│                Frontend                     │
│  React Native + TypeScript                  │
│  ┌─────────────┬─────────────┬─────────────┐│
│  │   Screens   │ Components  │   Services  ││
│  └─────────────┴─────────────┴─────────────┘│
└─────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│              Local Storage                  │
│  ┌─────────────┬─────────────┬─────────────┐│
│  │   SQLite    │    MMKV     │   Images    ││
│  │  Database   │ Preferences │   Local     ││
│  └─────────────┴─────────────┴─────────────┘│
└─────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│               Cloud Services                │
│  ┌─────────────┬─────────────┬─────────────┐│
│  │  Firebase   │  Firebase   │   Google    ││
│  │  Firestore  │   Storage   │    Maps     ││
│  └─────────────┴─────────────┴─────────────┘│
└─────────────────────────────────────────────┘
```

### Offline-First Architecture
- **Primary**: Local SQLite database for all operations
- **Sync**: Firebase Firestore for cloud backup and multi-device sync
- **Queue**: Custom upload manager for handling offline image uploads
- **Conflict Resolution**: Timestamp-based with user preference options

## Database Schema

### Firebase Firestore Structure
```typescript
// Collection: users
interface User {
  id: string;
  email: string;
  displayName?: string;
  preferences: {
    defaultContainerSize: number;
    ratingScale: '1-5' | '1-10';
    autoLocationCapture: boolean;
    units: 'metric' | 'imperial';
  };
  createdAt: FirebaseTimestamp;
  lastActiveAt: FirebaseTimestamp;
}

// Collection: ciders
interface CiderMasterRecord {
  id: string;
  userId: string;

  // Basic Information
  name: string;
  brand: string;
  abv: number;
  containerTypes: ContainerType[];
  imageUrl?: string;  // Optional - can be added retrospectively
  imageUploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
  notes: string;

  // Taste Tags
  tasteTags: string[];

  // Style Classifications
  traditionalStyle: TraditionalStyle;
  appleCategories: AppleCategory[];
  appleVarieties: string[];

  // Technical Characteristics
  sweetnessLevel: SweetnessLevel;
  carbonation: CarbonationLevel;
  clarity: ClarityLevel;
  color: ColorLevel;

  // Production Methods
  fermentationType: FermentationType;
  specialProcesses: SpecialProcess[];

  // Additives & Ingredients
  fruitAdditions: FruitAddition[];
  hops: HopAddition[];
  spicesBotanicals: SpiceBotanical[];
  woodAging: WoodAging[];

  // Quality Indicators
  producerSize: ProducerSize;
  qualityCertifications: QualityCertification[];

  // 6-Category Scoring (1-10)
  ratings: {
    appearance: number;
    aroma: number;
    taste: number;
    mouthfeel: number;
    value: number;  // Calculated as average price per ml across all experiences
    overall: number;
  };

  // Rating Update Logic
  ratingHistory: {
    appearance: number[];  // Array of all ratings to calculate average
    aroma: number[];
    taste: number[];
    mouthfeel: number[];
    overall: number[];
  };

  // Calculated Fields
  averagePrice?: number;
  pricePerMl?: number;
  timesTried: number;
  firstTriedDate?: FirebaseTimestamp;
  lastTriedDate?: FirebaseTimestamp;

  // Metadata
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

// Collection: experiences
interface ExperienceLog {
  id: string;
  userId: string;
  ciderId: string;

  // Experience Data
  date: FirebaseTimestamp;
  venue: {
    name: string;
    type: VenueType;
    location: FirebaseGeoPoint;
    address?: string;
  };
  price: number;
  containerSize: number; // in ml
  pricePerMl: number; // calculated
  notes: string;

  // Metadata
  createdAt: FirebaseTimestamp;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

// Collection: venues (aggregated)
interface VenueRecord {
  id: string;
  userId: string;
  name: string;
  type: VenueType;
  location: FirebaseGeoPoint;
  address?: string;

  // Analytics
  visitCount: number;
  uniqueCidersCount: number;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };

  // Metadata
  firstVisit: FirebaseTimestamp;
  lastVisit: FirebaseTimestamp;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}
```

### Local SQLite Schema
```sql
-- Mirror of Firebase structure for offline operations
CREATE TABLE ciders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  abv REAL NOT NULL,
  container_types TEXT, -- JSON array
  image_url TEXT,
  local_image_uri TEXT,
  image_upload_status TEXT DEFAULT 'pending',
  notes TEXT,
  taste_tags TEXT, -- JSON array
  traditional_style TEXT,
  apple_categories TEXT, -- JSON array
  -- ... all other fields from Firestore
  sync_status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE experiences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  cider_id TEXT NOT NULL,
  date INTEGER NOT NULL,
  venue_name TEXT NOT NULL,
  venue_type TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  price REAL NOT NULL,
  container_size INTEGER NOT NULL,
  price_per_ml REAL NOT NULL,
  notes TEXT,
  sync_status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (cider_id) REFERENCES ciders (id)
);

CREATE TABLE upload_queue (
  id TEXT PRIMARY KEY,
  local_uri TEXT NOT NULL,
  firebase_path TEXT NOT NULL,
  cider_id TEXT,
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_ciders_user_id ON ciders(user_id);
CREATE INDEX idx_ciders_name ON ciders(name);
CREATE INDEX idx_experiences_cider_id ON experiences(cider_id);
CREATE INDEX idx_experiences_date ON experiences(date);
CREATE INDEX idx_upload_queue_status ON upload_queue(status);
```

## Key Services Implementation

### Image Upload Queue Manager
```typescript
class ImageUploadManager {
  private static instance: ImageUploadManager;
  private isProcessing = false;

  static getInstance(): ImageUploadManager {
    if (!ImageUploadManager.instance) {
      ImageUploadManager.instance = new ImageUploadManager();
    }
    return ImageUploadManager.instance;
  }

  async queueUpload(
    localUri: string,
    firebasePath: string,
    ciderId?: string
  ): Promise<string> {
    const queueItem: UploadQueueItem = {
      id: uuid(),
      localUri,
      firebasePath,
      ciderId,
      retryCount: 0,
      status: 'pending',
      createdAt: Date.now()
    };

    await this.addToQueue(queueItem);
    this.processQueue(); // Fire and forget

    return queueItem.id;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingUploads = await this.getPendingUploads();

      for (const upload of pendingUploads) {
        if (await this.isOnline()) {
          await this.processUpload(upload);
        }
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processUpload(upload: UploadQueueItem): Promise<void> {
    try {
      await this.updateStatus(upload.id, 'uploading');

      const downloadUrl = await this.uploadToFirebase(
        upload.localUri,
        upload.firebasePath
      );

      if (upload.ciderId) {
        await this.updateCiderImageUrl(upload.ciderId, downloadUrl);
      }

      await this.updateStatus(upload.id, 'completed');
      await this.removeFromQueue(upload.id);

    } catch (error) {
      console.error('Upload failed:', error);
      await this.handleUploadError(upload, error);
    }
  }
}
```

## Business Logic & Validation

### Data Validation Rules
```typescript
interface ValidationRules {
  // Cider validation
  validateCiderName: (name: string, existingCiders: CiderMasterRecord[]) => {
    isValid: boolean;
    isDuplicate: boolean;
    isSimilar: boolean;
    warnings: string[];
  };

  // Price validation
  validatePrice: (price: number) => {
    isValid: boolean;
    errors: string[];
  };

  // ABV validation
  validateABV: (abv: number) => {
    isValid: boolean;
    errors: string[];
  };

  // Venue consolidation
  normalizeVenueName: (venueName: string) => string;
}

// Implementation examples
const validatePrice = (price: number) => {
  const errors: string[] = [];

  if (price < 0) errors.push("Price cannot be negative");
  if (price > 1000) errors.push("Price seems unusually high");

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateABV = (abv: number) => {
  const errors: string[] = [];

  if (abv < 0) errors.push("ABV cannot be negative");
  if (abv > 20) errors.push("ABV over 20% is unusual for cider");

  return {
    isValid: errors.length === 0,
    errors
  };
};

const normalizeVenueName = (venueName: string) => {
  // Consolidate venue variations
  const normalizations = {
    'tesco': ['tesco extra', 'tesco superstore', 'tesco express', 'tesco metro'],
    'sainsbury\'s': ['sainsburys', 'sainsbury\'s local', 'sainsbury\'s superstore'],
    'asda': ['asda superstore', 'asda supermarket'],
    // ... more venue consolidations
  };

  const lower = venueName.toLowerCase().trim();

  for (const [normalized, variations] of Object.entries(normalizations)) {
    if (variations.some(variation => lower.includes(variation))) {
      return normalized;
    }
  }

  return venueName.trim();
};
```

### Collection Completeness Calculator
```typescript
class CompletenessCalculator {
  static calculateCompleteness(userCiders: CiderMasterRecord[]): {
    percentage: number;
    totalCharacteristics: number;
    uniqueCharacteristics: number;
    breakdown: CharacteristicBreakdown;
  } {
    const allCharacteristics = new Set<string>();

    userCiders.forEach(cider => {
      // Add all characteristics from this cider
      allCharacteristics.add(cider.traditionalStyle);
      cider.appleCategories.forEach(cat => allCharacteristics.add(cat));
      cider.tasteTags.forEach(tag => allCharacteristics.add(tag));
      cider.specialProcesses.forEach(process => allCharacteristics.add(process));
      // ... add all other characteristic fields
    });

    // Calculate unique characteristics found across all user's ciders
    const uniqueCount = allCharacteristics.size;

    // For percentage calculation, we use the total characteristics
    // found in the user's collection as the denominator
    const totalPossible = this.getTotalPossibleCharacteristics(userCiders);

    return {
      percentage: (uniqueCount / totalPossible) * 100,
      totalCharacteristics: totalPossible,
      uniqueCharacteristics: uniqueCount,
      breakdown: this.getCharacteristicBreakdown(userCiders)
    };
  }

  private static getTotalPossibleCharacteristics(userCiders: CiderMasterRecord[]): number {
    // This is the total unique characteristics that exist across
    // all the user's ciders - not all possible characteristics in the world
    const allPossible = new Set<string>();

    userCiders.forEach(cider => {
      // Add all possible characteristics from user's collection
      // This grows as the user adds more diverse ciders
    });

    return allPossible.size;
  }
}
```

### Offline-First Conflict Resolution
```typescript
class ConflictResolver {
  static resolveConflict(
    localRecord: CiderMasterRecord,
    cloudRecord: CiderMasterRecord
  ): CiderMasterRecord {
    // Offline-first: Local changes take precedence
    return {
      ...cloudRecord,
      ...localRecord,
      // Merge rating histories
      ratingHistory: {
        appearance: [...cloudRecord.ratingHistory.appearance, ...localRecord.ratingHistory.appearance],
        aroma: [...cloudRecord.ratingHistory.aroma, ...localRecord.ratingHistory.aroma],
        taste: [...cloudRecord.ratingHistory.taste, ...localRecord.ratingHistory.taste],
        mouthfeel: [...cloudRecord.ratingHistory.mouthfeel, ...localRecord.ratingHistory.mouthfeel],
        overall: [...cloudRecord.ratingHistory.overall, ...localRecord.ratingHistory.overall],
      },
      // Take latest timestamp
      updatedAt: Math.max(localRecord.updatedAt, cloudRecord.updatedAt),
      syncStatus: 'synced'
    };
  }
}
```

### Offline Sync Manager
```typescript
class SyncManager {
  private static instance: SyncManager;

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  async syncToFirebase(): Promise<void> {
    if (!(await this.isOnline())) return;

    try {
      // Sync ciders
      const pendingCiders = await this.getPendingCiders();
      for (const cider of pendingCiders) {
        await this.syncCider(cider);
      }

      // Sync experiences
      const pendingExperiences = await this.getPendingExperiences();
      for (const experience of pendingExperiences) {
        await this.syncExperience(experience);
      }

      // Download updates from Firebase
      await this.downloadUpdates();

    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  private async syncCider(cider: CiderMasterRecord): Promise<void> {
    try {
      const firestoreRef = firestore()
        .collection('ciders')
        .doc(cider.id);

      await firestoreRef.set(cider, { merge: true });

      // Update local sync status
      await this.updateLocalSyncStatus(cider.id, 'synced');

    } catch (error) {
      console.error('Cider sync failed:', error);
      await this.updateLocalSyncStatus(cider.id, 'conflict');
    }
  }
}
```

## Project Structure
```
cider-dictionary/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── cards/
│   │   │   ├── CiderCard.tsx
│   │   │   └── VenueCard.tsx
│   │   ├── forms/
│   │   │   ├── CiderForm.tsx
│   │   │   ├── ExperienceForm.tsx
│   │   │   └── common/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── Rating.tsx
│   │   └── animations/
│   │       ├── FadeIn.tsx
│   │       └── SlideUp.tsx
│   ├── screens/                 # Main app screens
│   │   ├── Dictionary/
│   │   │   ├── DictionaryScreen.tsx
│   │   │   └── CiderDetailScreen.tsx
│   │   ├── Analytics/
│   │   │   ├── AnalyticsScreen.tsx
│   │   │   ├── CidersTab.tsx
│   │   │   ├── VenuesTab.tsx
│   │   │   └── MapTab.tsx
│   │   ├── Progress/
│   │   │   └── ProgressScreen.tsx
│   │   ├── Logging/
│   │   │   ├── QuickLogScreen.tsx
│   │   │   └── NewCiderScreen.tsx
│   │   └── Settings/
│   │       └── SettingsScreen.tsx
│   ├── services/                # Business logic services
│   │   ├── firebase/
│   │   │   ├── auth.ts
│   │   │   ├── firestore.ts
│   │   │   └── storage.ts
│   │   ├── database/
│   │   │   ├── sqlite.ts
│   │   │   ├── ciders.ts
│   │   │   └── experiences.ts
│   │   ├── sync/
│   │   │   ├── SyncManager.ts
│   │   │   └── ConflictResolver.ts
│   │   ├── images/
│   │   │   ├── ImageUploadManager.ts
│   │   │   └── ImageCache.ts
│   │   ├── maps/
│   │   │   ├── GoogleMapsService.ts
│   │   │   └── LocationService.ts
│   │   └── analytics/
│   │       ├── ProgressTracker.ts
│   │       └── StatisticsCalculator.ts
│   ├── types/                   # TypeScript definitions
│   │   ├── cider.ts
│   │   ├── experience.ts
│   │   ├── venue.ts
│   │   ├── user.ts
│   │   └── navigation.ts
│   ├── utils/                   # Helper functions
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   ├── constants.ts
│   │   └── permissions.ts
│   ├── hooks/                   # Custom React hooks
│   │   ├── useCiders.ts
│   │   ├── useExperiences.ts
│   │   ├── useLocation.ts
│   │   └── useSync.ts
│   ├── stores/                  # Zustand stores
│   │   ├── ciderStore.ts
│   │   ├── experienceStore.ts
│   │   ├── userStore.ts
│   │   └── syncStore.ts
│   └── navigation/              # Navigation configuration
│       ├── AppNavigator.tsx
│       ├── TabNavigator.tsx
│       └── StackNavigator.tsx
├── assets/                      # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
├── __tests__/                   # Test files
├── android/                     # Android-specific code
├── ios/                         # iOS-specific code
├── package.json
├── tsconfig.json
├── metro.config.js
├── babel.config.js
└── app.json
```

## Development Setup & Configuration

### Environment Configuration
```typescript
// config/environment.ts
export const CONFIG = {
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  },
  app: {
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  }
};
```

### Performance Optimizations
- **Lazy loading** for screens and heavy components
- **Image caching** with react-native-fast-image
- **Virtual lists** for large cider collections
- **Memoization** for expensive calculations
- **Bundle splitting** with Metro bundler configuration

### Security Considerations
- **Firebase Security Rules** for data access control
- **Input validation** on all user inputs
- **Secure storage** for sensitive data using Keychain/Keystore
- **Network security** with certificate pinning for production

### Testing Strategy
- **Unit tests** with Jest for business logic
- **Component tests** with React Native Testing Library
- **Integration tests** for Firebase operations
- **E2E tests** with Detox for critical user flows

### Deployment Pipeline
- **Development**: Expo development client
- **Staging**: Expo Updates for OTA updates
- **Production**: Native builds for app stores
- **CI/CD**: GitHub Actions for automated testing and deployment

## Cost Analysis

### Firebase Pricing (Estimated Monthly)
- **Firestore**: ~£5-10 for personal use (25k reads, 5k writes)
- **Storage**: ~£1-3 for image storage (1-5GB)
- **Authentication**: Free (up to 10k users)
- **Hosting**: Free tier sufficient for personal use

### Google Maps API
- **Maps SDK**: £2 per 1000 map loads (free tier: 28k loads/month)
- **Places API**: £3 per 1000 requests (free tier: small allocation)

### Total Estimated Cost: £0-15/month depending on usage

This architecture provides a robust, scalable foundation for your cider dictionary app while maintaining cost efficiency and offline-first functionality.