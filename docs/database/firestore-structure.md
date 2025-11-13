# Firestore Database Structure - Phase 3

## Overview
Firestore database structure for the Cider Dictionary offline-first architecture. All collections follow a flat structure for optimal querying and cost efficiency.

## Collections

### 1. `ciders` Collection
**Purpose**: Store master cider records (one per unique cider)

**Document ID**: Auto-generated UUID

**Fields**:
```typescript
{
  // Core identification
  id: string;
  name: string;
  brand: string;

  // Basic characteristics
  abv: number;
  style?: string;
  traditionalStyle?: string;

  // Rating
  overallRating: number; // 1-10

  // Optional details
  tasteTags?: string[];
  sweetness?: string;
  carbonation?: string;
  clarity?: string;
  color?: string;

  // Media
  photo?: string; // Firebase Storage URL

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';

  // User identification (for multi-user in future)
  userId?: string;
}
```

**Indexes**:
- `name` (ascending)
- `brand` (ascending)
- `overallRating` (descending)
- `createdAt` (descending)
- Composite: `brand` + `name` (for duplicate detection)

---

### 2. `experiences` Collection
**Purpose**: Store drinking experience logs (many per cider)

**Document ID**: Auto-generated UUID

**Fields**:
```typescript
{
  // Core identification
  id: string;
  ciderId: string; // Reference to ciders collection

  // Experience details
  date: Timestamp;
  rating: number; // 1-10
  notes?: string;

  // Location details
  venueName?: string;
  venueType?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  // Purchase details
  price?: number;
  containerSize?: number; // ml
  pricePerMl?: number; // calculated

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';

  // User identification
  userId?: string;
}
```

**Indexes**:
- `ciderId` (ascending)
- `date` (descending)
- `rating` (descending)
- Composite: `ciderId` + `date` (for experience history)
- Composite: `venueName` + `date` (for venue analytics)

---

### 3. `venues` Collection
**Purpose**: Aggregated venue analytics and information

**Document ID**: Normalized venue name (e.g., "tesco-stockport")

**Fields**:
```typescript
{
  // Core identification
  id: string;
  name: string;
  normalizedName: string;
  venueType: string; // 'pub', 'restaurant', 'retail', 'festival', 'other'

  // Location
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  // Analytics (aggregated from experiences)
  totalVisits: number;
  totalSpent: number;
  averagePrice: number;
  cidersTriedCount: number;
  lastVisit: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // User identification
  userId?: string;
}
```

**Indexes**:
- `normalizedName` (ascending)
- `totalVisits` (descending)
- `lastVisit` (descending)
- `venueType` (ascending)

---

### 4. `sync_queue` Collection (Optional - for advanced sync)
**Purpose**: Track pending sync operations

**Document ID**: Auto-generated UUID

**Fields**:
```typescript
{
  id: string;
  type: 'CREATE_CIDER' | 'UPDATE_CIDER' | 'DELETE_CIDER' |
        'CREATE_EXPERIENCE' | 'UPDATE_EXPERIENCE' | 'DELETE_EXPERIENCE' |
        'UPLOAD_IMAGE';
  data: any; // Operation data
  timestamp: Timestamp;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;

  // User identification
  userId?: string;
}
```

**Indexes**:
- `status` (ascending)
- `timestamp` (ascending)
- Composite: `status` + `timestamp` (for queue processing)

---

### 5. `_health_check` Collection
**Purpose**: Firebase connectivity health checks

**Document ID**: `test`

**Fields**:
```typescript
{
  timestamp: Timestamp;
  status: 'connected';
}
```

---

## Firestore Security Rules

### Phase 3 Rules (Development/Testing)
For initial development, use **test mode** rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents (DEVELOPMENT ONLY)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Phase 4 Rules (Production)
For production with authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Ciders collection
    match /ciders/{ciderId} {
      // Users can only read/write their own ciders
      allow read, write: if isSignedIn() && isOwner(resource.data.userId);
      allow create: if isSignedIn() && isOwner(request.resource.data.userId);
    }

    // Experiences collection
    match /experiences/{experienceId} {
      allow read, write: if isSignedIn() && isOwner(resource.data.userId);
      allow create: if isSignedIn() && isOwner(request.resource.data.userId);
    }

    // Venues collection
    match /venues/{venueId} {
      allow read, write: if isSignedIn() && isOwner(resource.data.userId);
      allow create: if isSignedIn() && isOwner(request.resource.data.userId);
    }

    // Health check - public read
    match /_health_check/{document} {
      allow read: if true;
      allow write: if isSignedIn();
    }
  }
}
```

---

## Firebase Storage Structure

### Images Directory Structure
```
/users/{userId}/ciders/{ciderId}/{imageId}.jpg
```

### Storage Rules (Development)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // DEVELOPMENT ONLY
    }
  }
}
```

### Storage Rules (Production)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/ciders/{ciderId}/{imageId} {
      // Allow authenticated users to read/write their own images
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null &&
                      request.auth.uid == userId &&
                      request.resource.size < 5 * 1024 * 1024 && // Max 5MB
                      request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## Query Patterns

### Most Common Queries

1. **Get all ciders (with pagination)**:
```javascript
firestore()
  .collection('ciders')
  .orderBy('name')
  .limit(50)
  .get()
```

2. **Search ciders by brand**:
```javascript
firestore()
  .collection('ciders')
  .where('brand', '>=', searchTerm)
  .where('brand', '<=', searchTerm + '\uf8ff')
  .get()
```

3. **Get experiences for a cider**:
```javascript
firestore()
  .collection('experiences')
  .where('ciderId', '==', ciderId)
  .orderBy('date', 'desc')
  .get()
```

4. **Get top rated ciders**:
```javascript
firestore()
  .collection('ciders')
  .orderBy('overallRating', 'desc')
  .limit(10)
  .get()
```

5. **Get recent experiences**:
```javascript
firestore()
  .collection('experiences')
  .orderBy('date', 'desc')
  .limit(20)
  .get()
```

---

## Cost Optimization Strategies

### Read Optimization
- Use offline persistence (enabled in config)
- Cache frequently accessed data locally
- Use pagination (limit queries)
- Listen to specific documents instead of entire collections

### Write Optimization
- Batch writes when possible (up to 500 operations)
- Queue writes and sync in batches
- Use transactions for related updates
- Avoid updating documents unnecessarily

### Storage Optimization
- Compress images before upload (80% quality)
- Limit image size to 1920px max dimension
- Use Firebase Storage for images only
- Clean up old/unused images periodically

---

## Firestore Quota Limits (Free Tier)

**Daily Limits**:
- Reads: 50,000 per day
- Writes: 20,000 per day
- Deletes: 20,000 per day

**Storage Limits**:
- Total storage: 1 GB
- Storage for images: Unlimited (separate quota)

**Network Limits**:
- Network egress: 10 GB per month

**With typical usage (100 ciders, 500 experiences)**:
- Estimated daily reads: ~500-1000
- Estimated daily writes: ~20-50
- Well within free tier limits

---

## Migration from SQLite to Firestore

When syncing from local SQLite to Firestore:

1. **Initial Sync**: Upload all local data to Firestore
2. **Bidirectional Sync**: Keep both in sync
3. **Conflict Resolution**: Use timestamps to resolve conflicts
4. **Offline-First**: SQLite is source of truth, Firestore is backup

See `docs/pseudocode/10-offline-sync-orchestration.pseudo` for detailed sync logic.
