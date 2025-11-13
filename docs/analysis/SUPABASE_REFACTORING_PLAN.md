# Supabase Refactoring Plan - Detailed

## 🎯 Overview

Switching from Firebase to Supabase for the Cider Dictionary app.

**Total Effort**: 8-10 hours
**Benefit**: Free storage for photos, better analytics, better long-term

---

## 📦 Step 1: Install Supabase (5 minutes)

### Remove Firebase
```bash
npm uninstall firebase
```

### Install Supabase
```bash
npm install @supabase/supabase-js
```

**Files Changed**: `package.json`

---

## 🗄️ Step 2: Create Database Schema (30 minutes)

### Supabase Dashboard Setup

1. Go to https://supabase.com
2. Create free account
3. Create new project: "cider-dictionary"
4. Wait 2 minutes for project setup
5. Go to SQL Editor

### Run This SQL Schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ciders table
CREATE TABLE ciders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,

  -- Basic characteristics
  abv DECIMAL(4,2),
  style TEXT,
  traditional_style TEXT,

  -- Rating
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 10),

  -- Optional details
  taste_tags TEXT[],
  sweetness TEXT,
  carbonation TEXT,
  clarity TEXT,
  color TEXT,

  -- Media
  photo TEXT, -- URL from Supabase Storage

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced',

  -- User (for Phase 4)
  user_id UUID REFERENCES auth.users(id)
);

-- Experiences table
CREATE TABLE experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cider_id UUID NOT NULL REFERENCES ciders(id) ON DELETE CASCADE,

  -- Experience details
  date TIMESTAMPTZ NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  notes TEXT,

  -- Location
  venue_name TEXT,
  venue_type TEXT,
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  location_address TEXT,

  -- Purchase details
  price DECIMAL(10, 2),
  container_size INTEGER, -- ml
  price_per_ml DECIMAL(10, 4),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced',

  -- User (for Phase 4)
  user_id UUID REFERENCES auth.users(id)
);

-- Venues table (aggregated analytics)
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  normalized_name TEXT UNIQUE NOT NULL,
  venue_type TEXT,

  -- Location
  address TEXT,
  coordinates_latitude DECIMAL(10, 8),
  coordinates_longitude DECIMAL(11, 8),

  -- Analytics (computed from experiences)
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  average_price DECIMAL(10, 2),
  ciders_tried_count INTEGER DEFAULT 0,
  last_visit TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- User (for Phase 4)
  user_id UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX idx_ciders_name ON ciders(name);
CREATE INDEX idx_ciders_brand ON ciders(brand);
CREATE INDEX idx_ciders_rating ON ciders(overall_rating DESC);
CREATE INDEX idx_experiences_cider_id ON experiences(cider_id);
CREATE INDEX idx_experiences_date ON experiences(date DESC);
CREATE INDEX idx_experiences_venue ON experiences(venue_name);
CREATE INDEX idx_venues_normalized ON venues(normalized_name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_ciders_updated_at
  BEFORE UPDATE ON ciders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiences_updated_at
  BEFORE UPDATE ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Enable Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE ciders ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Development policy (allow all - like Firebase test mode)
CREATE POLICY "Allow all access for development" ON ciders
  FOR ALL USING (true);

CREATE POLICY "Allow all access for development" ON experiences
  FOR ALL USING (true);

CREATE POLICY "Allow all access for development" ON venues
  FOR ALL USING (true);
```

### Create Storage Bucket

In Supabase Dashboard:
1. Go to Storage
2. Create new bucket: "cider-photos"
3. Make it public
4. Done!

---

## 🔧 Step 3: Update Configuration (15 minutes)

### Create `src/services/supabase/config.ts`

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Load from environment
export const supabaseConfig: SupabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
};

// Validate config
function validateSupabaseConfig(config: SupabaseConfig): boolean {
  if (!config.url || !config.anonKey) {
    console.error('Missing Supabase configuration');
    return false;
  }
  return true;
}

export class SupabaseService {
  private initialized = false;
  private client: SupabaseClient | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Supabase already initialized');
      return;
    }

    try {
      if (!validateSupabaseConfig(supabaseConfig)) {
        throw new Error('Invalid Supabase configuration. Check your .env file.');
      }

      console.log('Initializing Supabase...');

      this.client = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });

      // Test connection
      const { error } = await this.client.from('ciders').select('count').limit(1);
      if (error) throw error;

      console.log('Supabase initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Supabase initialization failed:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getClient(): SupabaseClient {
    if (!this.initialized || !this.client) {
      throw new Error('Supabase not initialized. Call initialize() first.');
    }
    return this.client;
  }
}

export const supabaseService = new SupabaseService();
```

### Update `.env` file

Replace Firebase variables with:
```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Development Settings
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_DEBUG_MODE=true
```

Get these values from Supabase Dashboard → Settings → API

---

## 🔄 Step 4: Refactor SyncManager (3-4 hours)

### Update `src/services/sync/SyncManager.ts`

Key changes:

#### Before (Firebase):
```typescript
import firestore from '@react-native-firebase/firestore';

private async syncCreateCider(cider: CiderMasterRecord): Promise<void> {
  const db = firebaseService.getFirestore();
  const ciderRef = doc(db, 'ciders', cider.id);

  await setDoc(ciderRef, {
    ...cider,
    createdAt: Timestamp.fromDate(cider.createdAt),
    updatedAt: Timestamp.fromDate(cider.updatedAt)
  });
}
```

#### After (Supabase):
```typescript
import { supabaseService } from '../supabase/config';

private async syncCreateCider(cider: CiderMasterRecord): Promise<void> {
  const supabase = supabaseService.getClient();

  const { error } = await supabase
    .from('ciders')
    .insert({
      id: cider.id,
      name: cider.name,
      brand: cider.brand,
      abv: cider.abv,
      style: cider.style,
      traditional_style: cider.traditionalStyle,
      overall_rating: cider.overallRating,
      taste_tags: cider.tasteTags,
      sweetness: cider.sweetness,
      carbonation: cider.carbonation,
      clarity: cider.clarity,
      color: cider.color,
      photo: cider.photo,
      created_at: cider.createdAt.toISOString(),
      updated_at: cider.updatedAt.toISOString(),
    });

  if (error) throw error;

  // Update local sync status
  await sqliteService.updateCider(cider.id, {
    syncStatus: 'synced',
    updatedAt: new Date()
  });
}
```

**Similar changes** for:
- `syncUpdateCider`
- `syncDeleteCider`
- `syncCreateExperience`
- `syncUpdateExperience`
- `syncDeleteExperience`

---

## 📸 Step 5: Implement Image Upload (1 hour)

### Update `syncUploadImage` in SyncManager

```typescript
private async syncUploadImage(imageData: {
  localPath: string;
  remotePath: string;
  ciderId: string;
}): Promise<void> {
  try {
    const supabase = supabaseService.getClient();

    // Fetch image as blob
    const response = await fetch(imageData.localPath);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('cider-photos')
      .upload(imageData.remotePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('cider-photos')
      .getPublicUrl(imageData.remotePath);

    // Update cider with image URL
    await this.queueOperation('UPDATE_CIDER', {
      id: imageData.ciderId,
      photo: publicUrl,
      updatedAt: new Date()
    });

    console.log('Image uploaded successfully:', publicUrl);
  } catch (error) {
    console.error('Failed to upload image:', error);
    throw error;
  }
}
```

---

## 🧪 Step 6: Testing Checklist (2 hours)

### Test 1: Basic CRUD
- [ ] Create cider → Check Supabase Dashboard
- [ ] Update cider → Verify in dashboard
- [ ] Delete cider → Confirm deletion
- [ ] Create experience → Check dashboard
- [ ] Link experience to cider → Verify relationship

### Test 2: Offline Mode
- [ ] Enable airplane mode
- [ ] Create cider (saves to SQLite)
- [ ] Disable airplane mode
- [ ] Verify auto-sync to Supabase

### Test 3: Image Upload
- [ ] Create cider with photo
- [ ] Check Supabase Storage bucket
- [ ] Verify public URL works
- [ ] Download and display image

### Test 4: Analytics
- [ ] Run SQL query for average ratings
- [ ] Verify experiences grouped by venue
- [ ] Test complex joins

---

## 📊 Step 7: SQL Mapping Reference

### Firestore → Supabase Quick Reference

| Firestore | Supabase |
|-----------|----------|
| `collection('ciders')` | `from('ciders')` |
| `.doc(id).set(data)` | `.insert(data)` |
| `.doc(id).update(data)` | `.update(data).eq('id', id)` |
| `.doc(id).delete()` | `.delete().eq('id', id)` |
| `.where('brand', '==', val)` | `.eq('brand', val)` |
| `.orderBy('name')` | `.order('name')` |
| `.limit(10)` | `.limit(10)` |
| `.get()` | `.select()` |

---

## ⚡ Step 8: Performance Optimizations

### Enable Supabase Real-time (Optional)

```typescript
// Listen for new ciders in real-time
const subscription = supabase
  .from('ciders')
  .on('INSERT', payload => {
    console.log('New cider created:', payload.new);
    // Update local SQLite
  })
  .subscribe();
```

### Database Indexes (Already included in schema)
- All common queries are indexed
- Automatic performance optimization

---

## 🎯 Files to Modify

### Core Files (Must Change):
1. ✅ `package.json` - Dependencies
2. ✅ `.env` - Configuration
3. ✅ `src/services/supabase/config.ts` - New file
4. ✅ `src/services/sync/SyncManager.ts` - Refactor all methods
5. ✅ `App.tsx` - Update initialization

### Optional Updates:
6. Update tests to use Supabase
7. Update type definitions
8. Add real-time subscriptions

---

## ✅ Success Criteria

Phase 3 complete when:
- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] Storage bucket configured
- [ ] App initializes Supabase successfully
- [ ] Ciders sync to Supabase
- [ ] Experiences sync to Supabase
- [ ] Images upload to Storage (working!)
- [ ] Offline mode works
- [ ] All tests pass

---

## 💰 Cost Comparison (Estimated Monthly)

### Firebase (with Blaze):
- Database: $0 (within free tier)
- Storage: $0.026/GB ($0.13/month for 5GB)
- Downloads: $0.12/GB
- **Credit card required**
- **Est. cost**: $1-5/month

### Supabase (Free Tier):
- Database: 500MB (free)
- Storage: 1GB (free)
- Bandwidth: 2GB (free)
- **No credit card required**
- **Est. cost**: $0/month

**Savings**: $1-5/month + no credit card needed!

---

## 🚀 Ready to Refactor?

If you approve, I can:
1. Create Supabase configuration
2. Refactor SyncManager
3. Implement image uploads
4. Update App initialization
5. Test everything

**Estimated time**: 8-10 hours of coding
**Your time**: 10 minutes (create Supabase account, get API keys)

**Want me to start?** 🎯
