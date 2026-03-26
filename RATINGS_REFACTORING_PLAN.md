# Comprehensive Implementation Plan: Rating System Refactoring

## Executive Summary

This plan details the migration of the rating system from `CiderMasterRecord` (one rating per cider) to `ExperienceLog` (one rating per experience), with calculated averages displayed on cider records. This is a significant architectural change that touches database schema, TypeScript types, forms, analytics, and sync logic.

---

## Phase 1: Database Schema Updates & Migration

**Goal:** Update database schema to support ratings on experiences while maintaining backward compatibility.

### 1.1 Update TypeScript Type Definitions

**Files:**
- `src/types/experience.ts`
- `src/types/cider.ts`

**Changes:**

**experience.ts:**
```typescript
export interface ExperienceLog {
  // ... existing fields ...

  // NEW: Detailed ratings for this specific experience
  detailedRatings?: {
    appearance?: Rating;
    aroma?: Rating;
    taste?: Rating;
    mouthfeel?: Rating;
  };

  // MODIFY: Make rating field required instead of optional
  rating: Rating; // Overall rating for THIS experience (no longer optional)
}
```

**cider.ts:**
```typescript
export interface CiderMasterRecord {
  // ... existing fields ...

  // MARK AS DEPRECATED (will be calculated)
  /** @deprecated Use calculateAverageRating() instead. This is now computed from experiences. */
  overallRating: Rating;

  // MARK AS DEPRECATED (will be calculated)
  /** @deprecated Ratings are now stored per experience. This is computed as an average. */
  detailedRatings?: {
    appearance?: Rating;
    aroma?: Rating;
    taste?: Rating;
    mouthfeel?: Rating;
  };
}
```

### 1.2 Database Schema Migration (SQLite)

**File:** `src/services/database/sqlite.ts`

**Add new migration method:**
```typescript
private async migrateRatingsToExperiences(database: SQLite.SQLiteDatabase): Promise<void> {
  const currentVersion = await this.getMigrationVersion(database, 'ratings_to_experiences');

  if (currentVersion >= 1) {
    console.log('Ratings migration already applied');
    return;
  }

  try {
    await database.execAsync('BEGIN TRANSACTION');

    // 1. Add rating columns to experiences table (if not exists)
    await database.execAsync(`
      ALTER TABLE experiences ADD COLUMN appearance INTEGER;
      ALTER TABLE experiences ADD COLUMN aroma INTEGER;
      ALTER TABLE experiences ADD COLUMN taste INTEGER;
      ALTER TABLE experiences ADD COLUMN mouthfeel INTEGER;
    `);

    // 2. For ciders WITHOUT experiences: Create a "legacy" experience with the cider's rating
    // This preserves existing ratings for ciders that have never been logged as experiences
    const cidersWithoutExperiences = await database.getAllAsync(`
      SELECT c.* FROM ciders c
      LEFT JOIN experiences e ON c.id = e.ciderId
      WHERE e.id IS NULL
    `);

    for (const cider: any of cidersWithoutExperiences) {
      const detailedRatings = cider.detailedRatings ? JSON.parse(cider.detailedRatings) : {};

      // Create a "legacy" experience dated at cider creation
      await database.runAsync(`
        INSERT INTO experiences (
          id, userId, ciderId, date, venue, price, containerSize, containerType, pricePerPint,
          rating, appearance, aroma, taste, mouthfeel,
          notes, createdAt, updatedAt, syncStatus, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `legacy_${cider.id}`,
        cider.userId,
        cider.id,
        cider.createdAt,
        JSON.stringify({ name: 'Legacy Entry', type: 'other', id: 'legacy' }),
        0, // price
        568, // containerSize (pint)
        'bottle', // containerType
        0, // pricePerPint
        cider.overallRating,
        detailedRatings.appearance || null,
        detailedRatings.aroma || null,
        detailedRatings.taste || null,
        detailedRatings.mouthfeel || null,
        'Migrated from legacy rating system',
        cider.createdAt,
        new Date().toISOString(),
        'pending',
        1
      ]);
    }

    await this.setMigrationVersion(database, 'ratings_to_experiences', 1);
    await database.execAsync('COMMIT');

    console.log('Ratings migration completed successfully');
  } catch (error) {
    console.error('Ratings migration failed:', error);
    await database.execAsync('ROLLBACK');
  }
}
```

**Update `createTablesInDatabase` method:**
```typescript
// Add to createTablesInDatabase after other migrations
await this.migrateRatingsToExperiences(database);
```

### 1.3 Firebase Schema Updates

**Files:**
- `src/services/sync/firebaseSyncService.ts` (if exists)
- Firestore security rules

**Firestore Structure Changes:**
```
/ciders/{ciderId}
  - Remove: overallRating (will be calculated client-side)
  - Remove: detailedRatings (will be calculated client-side)
  - Add: _calculatedRating (number, optional) - for search/filter optimization
  - Add: _ratingCount (number) - number of experiences contributing to rating

/experiences/{experienceId}
  - Add: rating (number, required)
  - Add: appearance (number, optional)
  - Add: aroma (number, optional)
  - Add: taste (number, optional)
  - Add: mouthfeel (number, optional)
```

**Migration Script (run once):**
```typescript
// Create migration script to run once
async function migrateFirebaseRatings() {
  const firestore = getFirestore();

  // Get all ciders
  const cidersSnapshot = await getDocs(collection(firestore, 'ciders'));

  for (const ciderDoc of cidersSnapshot.docs) {
    const cider = ciderDoc.data();

    // Check if cider has any experiences
    const experiencesSnapshot = await getDocs(
      query(collection(firestore, 'experiences'), where('ciderId', '==', ciderDoc.id))
    );

    if (experiencesSnapshot.empty) {
      // No experiences exist - create legacy experience
      await addDoc(collection(firestore, 'experiences'), {
        id: `legacy_${ciderDoc.id}`,
        userId: cider.userId,
        ciderId: ciderDoc.id,
        date: cider.createdAt,
        venue: { name: 'Legacy Entry', type: 'other', id: 'legacy' },
        price: 0,
        containerSize: 568,
        containerType: 'bottle',
        pricePerPint: 0,
        rating: cider.overallRating,
        appearance: cider.detailedRatings?.appearance || null,
        aroma: cider.detailedRatings?.aroma || null,
        taste: cider.detailedRatings?.taste || null,
        mouthfeel: cider.detailedRatings?.mouthfeel || null,
        notes: 'Migrated from legacy rating system',
        createdAt: cider.createdAt,
        updatedAt: new Date(),
        syncStatus: 'synced',
        version: 1
      });
    }

    // Mark cider as migrated
    await updateDoc(doc(firestore, 'ciders', ciderDoc.id), {
      _migrated: true,
      _migratedAt: new Date()
    });
  }
}
```

---

## Phase 2: Data Access Layer Updates

**Goal:** Create helper functions to calculate ratings and update database service methods.

### 2.1 Create Rating Calculation Utilities

**New File:** `src/utils/ratingCalculations.ts`

```typescript
import { Rating } from '../types/cider';
import { ExperienceLog } from '../types/experience';

/**
 * Calculate average rating from experiences
 */
export function calculateAverageRating(experiences: ExperienceLog[]): Rating {
  if (experiences.length === 0) return 5; // Default fallback

  const sum = experiences.reduce((acc, exp) => acc + (exp.rating || 0), 0);
  const avg = Math.round(sum / experiences.length);

  // Clamp to valid Rating range (1-10)
  return Math.max(1, Math.min(10, avg)) as Rating;
}

/**
 * Calculate average detailed ratings from experiences
 */
export function calculateDetailedRatings(experiences: ExperienceLog[]): {
  appearance?: Rating;
  aroma?: Rating;
  taste?: Rating;
  mouthfeel?: Rating;
} {
  const validExperiences = experiences.filter(exp => exp.detailedRatings);

  if (validExperiences.length === 0) return {};

  const sums = {
    appearance: 0,
    aroma: 0,
    taste: 0,
    mouthfeel: 0
  };

  const counts = {
    appearance: 0,
    aroma: 0,
    taste: 0,
    mouthfeel: 0
  };

  validExperiences.forEach(exp => {
    if (exp.detailedRatings) {
      Object.keys(sums).forEach(key => {
        const value = exp.detailedRatings![key as keyof typeof sums];
        if (value) {
          sums[key as keyof typeof sums] += value;
          counts[key as keyof typeof counts]++;
        }
      });
    }
  });

  const result: any = {};
  Object.keys(sums).forEach(key => {
    const count = counts[key as keyof typeof counts];
    if (count > 0) {
      const avg = Math.round(sums[key as keyof typeof sums] / count);
      result[key] = Math.max(1, Math.min(10, avg)) as Rating;
    }
  });

  return result;
}

/**
 * Get weighted average (more recent experiences weighted higher)
 */
export function calculateWeightedRating(experiences: ExperienceLog[]): Rating {
  if (experiences.length === 0) return 5;

  // Sort by date (most recent first)
  const sorted = [...experiences].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Apply exponential decay: recent experiences weight = 1.0, older decay to 0.5
  let weightedSum = 0;
  let totalWeight = 0;

  sorted.forEach((exp, index) => {
    const weight = Math.max(0.5, 1.0 - (index * 0.1)); // Decay by 10% per experience
    weightedSum += (exp.rating || 0) * weight;
    totalWeight += weight;
  });

  const avg = Math.round(weightedSum / totalWeight);
  return Math.max(1, Math.min(10, avg)) as Rating;
}
```

### 2.2 Update Database Service Methods

**File:** `src/services/database/sqlite.ts`

**Add methods:**
```typescript
/**
 * Update experiences table with rating columns
 */
async updateExperience(id: string, updates: Partial<ExperienceLog>): Promise<void> {
  try {
    const db = await this.connectionManager.getDatabase();

    const processedUpdates: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'detailedRatings') {
        // Store detailed ratings as separate columns
        if (value && typeof value === 'object') {
          processedUpdates['appearance'] = value.appearance || null;
          processedUpdates['aroma'] = value.aroma || null;
          processedUpdates['taste'] = value.taste || null;
          processedUpdates['mouthfeel'] = value.mouthfeel || null;
        }
      } else if (key === 'venue') {
        processedUpdates[key] = JSON.stringify(value);
      } else if (key === 'date' || key === 'updatedAt') {
        processedUpdates[key] = value instanceof Date ? value.toISOString() : value;
      } else {
        processedUpdates[key] = value;
      }
    }

    if (!processedUpdates.updatedAt) {
      processedUpdates.updatedAt = new Date().toISOString();
    }

    const setClause = Object.keys(processedUpdates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(processedUpdates);

    await db.runAsync(
      `UPDATE experiences SET ${setClause} WHERE id = ?`,
      [...values, id]
    );

    console.log('Experience updated successfully:', id);
  } catch (error) {
    throw new DatabaseError(
      `Failed to update experience: ${id}`,
      'Unable to update experience. Please try again.',
      true,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get cider with calculated ratings from experiences
 */
async getCiderByIdWithRatings(id: string): Promise<CiderMasterRecord | null> {
  const cider = await this.getCiderById(id);
  if (!cider) return null;

  // Get all experiences for this cider
  const experiences = await this.getExperiencesByCiderId(id);

  // Calculate average ratings
  const calculatedRating = calculateAverageRating(experiences);
  const calculatedDetailedRatings = calculateDetailedRatings(experiences);

  return {
    ...cider,
    overallRating: calculatedRating,
    detailedRatings: Object.keys(calculatedDetailedRatings).length > 0
      ? calculatedDetailedRatings
      : undefined
  };
}

/**
 * Get all ciders with calculated ratings
 */
async getAllCidersWithRatings(): Promise<CiderMasterRecord[]> {
  const ciders = await this.getAllCiders();

  // Batch fetch all experiences
  const experiences = await this.getAllExperiences();

  // Group experiences by ciderId
  const experiencesByCider = new Map<string, ExperienceLog[]>();
  experiences.forEach(exp => {
    if (!experiencesByCider.has(exp.ciderId)) {
      experiencesByCider.set(exp.ciderId, []);
    }
    experiencesByCider.get(exp.ciderId)!.push(exp);
  });

  // Calculate ratings for each cider
  return ciders.map(cider => {
    const ciderExperiences = experiencesByCider.get(cider.id) || [];
    const calculatedRating = calculateAverageRating(ciderExperiences);
    const calculatedDetailedRatings = calculateDetailedRatings(ciderExperiences);

    return {
      ...cider,
      overallRating: calculatedRating,
      detailedRatings: Object.keys(calculatedDetailedRatings).length > 0
        ? calculatedDetailedRatings
        : undefined
    };
  });
}
```

---

## Phase 3: Form Updates

**Goal:** Remove ratings from cider forms and add to experience forms.

### 3.1 Remove Ratings from Cider Creation Form

**File:** `src/screens/QuickEntry/QuickEntryScreen.tsx`

**Changes:**
1. Remove `overallRating` from initial state
2. Remove `RatingInput` component from render
3. Update validation to not require rating
4. After creating cider, navigate to experience creation with pre-filled cider

```typescript
const handleSubmit = useCallback(async () => {
  // ... validation ...

  try {
    // Create cider WITHOUT rating
    const newCider = await sqliteService.createCider({
      name: sanitizedData.name,
      brand: sanitizedData.brand,
      abv: sanitizedData.abv,
      overallRating: 5, // Temporary placeholder until first experience
    });

    // Navigate to experience logging screen
    navigation.navigate('ExperienceLog', {
      ciderId: newCider.id,
      isFirstExperience: true // Flag to indicate this is the first experience
    });
  } catch (error) {
    // ... error handling ...
  }
}, [formData, navigation]);
```

### 3.2 Remove Ratings from Cider Edit Form

**File:** `src/components/forms/CiderForm.tsx`

**Changes:**
1. Remove `overallRating` field from core section
2. Remove `detailedRatings` from all sections
3. Add info message explaining ratings are now per-experience

```typescript
{
  id: 'core',
  title: 'Essential Details',
  description: 'Required information',
  fields: [
    { key: 'name', label: 'Cider Name', type: 'text', required: true },
    { key: 'brand', label: 'Brand', type: 'text', required: true },
    { key: 'abv', label: 'ABV (%)', type: 'number', required: true },
    // REMOVED: overallRating field
  ],
},
```

Add info banner:
```typescript
<View style={styles.ratingInfoBanner}>
  <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
  <Text style={styles.ratingInfoText}>
    Ratings are now logged per experience. The overall rating shown is calculated
    from all your experiences with this cider.
  </Text>
</View>
```

### 3.3 Add Ratings to Experience Forms

**File:** `src/screens/ExperienceLog/ExperienceLogScreen.tsx`

**Add after "Price & Container" section:**

```typescript
{/* Rating Section - NEW */}
<FormSection title="Rating">
  <RatingInput
    label="Overall Rating"
    rating={formState.rating || 5}
    onRatingChange={(rating) => {
      setFormState(prev => ({ ...prev, rating: rating as Rating }));
    }}
    maxRating={10}
    required
  />

  <TouchableOpacity
    style={styles.detailedRatingsToggle}
    onPress={() => setShowDetailedRatings(!showDetailedRatings)}
  >
    <Text style={styles.detailedRatingsToggleText}>
      {showDetailedRatings ? 'Hide' : 'Show'} Detailed Ratings
    </Text>
    <Ionicons
      name={showDetailedRatings ? 'chevron-up' : 'chevron-down'}
      size={20}
      color="#007AFF"
    />
  </TouchableOpacity>

  {showDetailedRatings && (
    <View style={styles.detailedRatingsContainer}>
      <RatingInput
        label="Appearance"
        rating={formState.detailedRatings?.appearance || 5}
        onRatingChange={(rating) => {
          setFormState(prev => ({
            ...prev,
            detailedRatings: {
              ...prev.detailedRatings,
              appearance: rating as Rating
            }
          }));
        }}
        maxRating={10}
      />

      <RatingInput
        label="Aroma"
        rating={formState.detailedRatings?.aroma || 5}
        onRatingChange={(rating) => {
          setFormState(prev => ({
            ...prev,
            detailedRatings: {
              ...prev.detailedRatings,
              aroma: rating as Rating
            }
          }));
        }}
        maxRating={10}
      />

      <RatingInput
        label="Taste"
        rating={formState.detailedRatings?.taste || 5}
        onRatingChange={(rating) => {
          setFormState(prev => ({
            ...prev,
            detailedRatings: {
              ...prev.detailedRatings,
              taste: rating as Rating
            }
          }));
        }}
        maxRating={10}
      />

      <RatingInput
        label="Mouthfeel"
        rating={formState.detailedRatings?.mouthfeel || 5}
        onRatingChange={(rating) => {
          setFormState(prev => ({
            ...prev,
            detailedRatings: {
              ...prev.detailedRatings,
              mouthfeel: rating as Rating
            }
          }));
        }}
        maxRating={10}
      />
    </View>
  )}
</FormSection>
```

**Update validation:**
```typescript
const isFormValid = useMemo(() => {
  return (
    formState.venue.id &&
    formState.venue.name.trim().length >= 2 &&
    formState.venue.location &&
    formState.price > 0 &&
    formState.containerSize > 0 &&
    formState.rating !== undefined && // NEW: Require rating
    pricePerPint > 0
  );
}, [formState, pricePerPint]);
```

**File:** `src/screens/ExperienceEdit/ExperienceEditScreen.tsx`

Apply same changes as above to experience edit screen.

---

## Phase 4: Analytics Updates

**Goal:** Update analytics to use experience ratings instead of cider ratings.

### 4.1 Update Analytics Service

**File:** `src/services/analytics/` (create if needed)

**Changes needed:**

1. **Average Rating Calculation** - Now based on experiences:
```typescript
async calculateAverageRating(): Promise<number> {
  const experiences = await sqliteService.getAllExperiences();
  if (experiences.length === 0) return 0;

  const sum = experiences.reduce((acc, exp) => acc + exp.rating, 0);
  return sum / experiences.length;
}
```

2. **Rating Distribution** - Now from experiences:
```typescript
async getRatingDistribution(): Promise<Record<Rating, number>> {
  const experiences = await sqliteService.getAllExperiences();

  const distribution: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) {
    distribution[i] = 0;
  }

  experiences.forEach(exp => {
    distribution[exp.rating]++;
  });

  return distribution;
}
```

3. **Trending Ratings** - Track over time:
```typescript
async getRatingTrendOverTime(timeRange: TimeRange): Promise<TrendAnalysis> {
  const experiences = await sqliteService.getAllExperiences();

  // Group by month
  const grouped = new Map<string, ExperienceLog[]>();
  experiences.forEach(exp => {
    const month = formatDate(exp.date, 'YYYY-MM');
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month)!.push(exp);
  });

  // Calculate average rating per month
  const dataPoints: TrendDataPoint[] = Array.from(grouped.entries()).map(([period, exps]) => ({
    period,
    value: calculateAverageRating(exps),
    count: exps.length
  }));

  // ... calculate trend line, confidence, predictions ...

  return trendAnalysis;
}
```

### 4.2 Update UI Components

**Files:** All components displaying ratings need to show calculated values.

**Example - Collection Screen:**
```typescript
// Before:
<Text>Rating: {cider.overallRating}/10</Text>

// After:
<Text>
  Rating: {cider.overallRating}/10
  {cider._experienceCount && (
    <Text style={styles.ratingCount}> ({cider._experienceCount} experiences)</Text>
  )}
</Text>
```

---

## Phase 5: Sync Logic Updates

**Goal:** Update Firebase sync to handle new rating structure.

### 5.1 Update Sync Manager

**File:** `src/services/sync/SyncManager.ts`

**Changes:**

1. **Experience Sync** - Include ratings:
```typescript
async syncExperience(experience: ExperienceLog): Promise<void> {
  const firestore = getFirestore();

  await setDoc(doc(firestore, 'experiences', experience.id), {
    ...experience,
    rating: experience.rating, // Required
    appearance: experience.detailedRatings?.appearance || null,
    aroma: experience.detailedRatings?.aroma || null,
    taste: experience.detailedRatings?.taste || null,
    mouthfeel: experience.detailedRatings?.mouthfeel || null,
    updatedAt: serverTimestamp()
  });

  // After syncing experience, trigger cider rating recalculation
  await this.recalculateCiderRating(experience.ciderId);
}
```

2. **Cider Rating Recalculation** - Cloud function or client-side:
```typescript
async recalculateCiderRating(ciderId: string): Promise<void> {
  const firestore = getFirestore();

  // Get all experiences for this cider
  const experiencesSnapshot = await getDocs(
    query(
      collection(firestore, 'experiences'),
      where('ciderId', '==', ciderId)
    )
  );

  const experiences = experiencesSnapshot.docs.map(doc => doc.data() as ExperienceLog);

  const calculatedRating = calculateAverageRating(experiences);
  const calculatedDetailedRatings = calculateDetailedRatings(experiences);

  // Update cider with calculated values
  await updateDoc(doc(firestore, 'ciders', ciderId), {
    _calculatedRating: calculatedRating,
    _calculatedDetailedRatings: calculatedDetailedRatings,
    _ratingCount: experiences.length,
    _lastRatingUpdate: serverTimestamp()
  });
}
```

3. **Conflict Resolution** - Handle rating conflicts:
```typescript
// When syncing, if cider has overallRating but no experiences,
// create a legacy experience
if (cider.overallRating && !hasExperiences) {
  await this.createLegacyExperience(cider);
}
```

---

## Phase 6: Edge Case Handling

**Goal:** Handle all edge cases gracefully.

### 6.1 Ciders with No Experiences

**Scenarios:**
1. User creates cider but never logs an experience
2. All experiences are deleted
3. Migration edge cases

**Solutions:**

**Display Logic:**
```typescript
function getCiderRating(cider: CiderMasterRecord, experiences: ExperienceLog[]): {
  rating: Rating;
  source: 'calculated' | 'placeholder' | 'legacy';
} {
  if (experiences.length === 0) {
    // No experiences - show placeholder
    return {
      rating: cider.overallRating || 5,
      source: cider.overallRating ? 'legacy' : 'placeholder'
    };
  }

  return {
    rating: calculateAverageRating(experiences),
    source: 'calculated'
  };
}
```

**UI Indicator:**
```typescript
<View style={styles.ratingContainer}>
  <Text>Rating: {rating.rating}/10</Text>
  {rating.source === 'placeholder' && (
    <Text style={styles.ratingWarning}>
      Log an experience to set a rating
    </Text>
  )}
  {rating.source === 'calculated' && (
    <Text style={styles.ratingSource}>
      Based on {experienceCount} experience{experienceCount !== 1 ? 's' : ''}
    </Text>
  )}
</View>
```

### 6.2 Rating Changes Over Time

**Show rating history:**
```typescript
function getCiderRatingHistory(experiences: ExperienceLog[]): {
  date: Date;
  rating: Rating;
}[] {
  return experiences
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(exp => ({
      date: exp.date,
      rating: exp.rating
    }));
}
```

### 6.3 Partial Detailed Ratings

**Handle cases where only some detailed ratings are provided:**
```typescript
function getDetailedRatingsWithFallback(
  experiences: ExperienceLog[]
): {
  appearance: Rating;
  aroma: Rating;
  taste: Rating;
  mouthfeel: Rating;
  hasPartialData: boolean;
} {
  const calculated = calculateDetailedRatings(experiences);
  const overallAvg = calculateAverageRating(experiences);

  return {
    appearance: calculated.appearance || overallAvg,
    aroma: calculated.aroma || overallAvg,
    taste: calculated.taste || overallAvg,
    mouthfeel: calculated.mouthfeel || overallAvg,
    hasPartialData: Object.keys(calculated).length < 4
  };
}
```

---

## Phase 7: Testing Strategy

**Goal:** Comprehensive testing before rollout.

### 7.1 Unit Tests

**Create test files:**

**File:** `src/utils/__tests__/ratingCalculations.test.ts`
```typescript
describe('calculateAverageRating', () => {
  it('should return 5 for empty experiences', () => {
    expect(calculateAverageRating([])).toBe(5);
  });

  it('should calculate correct average', () => {
    const experiences = [
      { rating: 8 } as ExperienceLog,
      { rating: 6 } as ExperienceLog,
      { rating: 7 } as ExperienceLog,
    ];
    expect(calculateAverageRating(experiences)).toBe(7);
  });

  it('should round to nearest integer', () => {
    const experiences = [
      { rating: 8 } as ExperienceLog,
      { rating: 7 } as ExperienceLog,
    ];
    expect(calculateAverageRating(experiences)).toBe(8);
  });

  it('should clamp to valid range', () => {
    // Test edge cases
  });
});
```

### 7.2 Integration Tests

**Database migration tests:**
```typescript
describe('Rating Migration', () => {
  it('should migrate ciders without experiences to legacy experiences', async () => {
    // Create test cider with rating
    // Run migration
    // Verify legacy experience created
    // Verify rating preserved
  });

  it('should not create legacy experiences for ciders with existing experiences', async () => {
    // Create cider with experiences
    // Run migration
    // Verify no legacy experience created
  });
});
```

### 7.3 End-to-End Tests

**User flows to test:**
1. Create new cider → Navigate to experience logging → Rate first experience
2. View cider details → See calculated rating
3. Add second experience with different rating → See updated average
4. Edit experience rating → See recalculated average
5. Delete all experiences → See placeholder rating
6. Migrate existing data → Verify legacy experiences created

### 7.4 Manual Testing Checklist

- [ ] Create new cider without rating
- [ ] Log first experience with rating
- [ ] View cider and confirm rating displays
- [ ] Log multiple experiences with different ratings
- [ ] Confirm average calculation is correct
- [ ] Edit experience rating
- [ ] Confirm cider rating updates
- [ ] Delete experience
- [ ] Confirm rating recalculates
- [ ] Test with no internet (offline mode)
- [ ] Sync experiences to Firebase
- [ ] Verify ratings sync correctly
- [ ] Test analytics screens
- [ ] Verify rating trends display correctly
- [ ] Test migration on existing data
- [ ] Verify legacy experiences created
- [ ] Test all edge cases documented above

---

## Phase 8: Rollout Plan

**Goal:** Safe, gradual rollout with rollback capability.

### 8.1 Pre-Rollout Checklist

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual testing complete
- [ ] Database backup created
- [ ] Migration tested on copy of production data
- [ ] Rollback plan documented and tested
- [ ] Analytics validation queries prepared
- [ ] User communication prepared

### 8.2 Rollout Stages

**Stage 1: Beta Testing (1 week)**
- Deploy to 10% of users (feature flag)
- Monitor error rates
- Collect user feedback
- Verify data integrity

**Stage 2: Gradual Rollout (2 weeks)**
- Deploy to 25% of users
- Monitor performance metrics
- Continue monitoring error rates
- Deploy to 50% of users
- Deploy to 100% of users

**Stage 3: Cleanup (after 2 weeks stable)**
- Remove deprecated fields from TypeScript types
- Archive migration code
- Update documentation

### 8.3 Monitoring & Metrics

**Track:**
- Average rating calculation time
- Number of legacy experiences created
- Sync success rate for experiences with ratings
- Analytics query performance
- User engagement with rating features
- Error rates by operation type

---

## Phase 9: Rollback Plan

**Goal:** Ability to revert if critical issues arise.

### 9.1 Rollback Triggers

- Critical bug affecting data integrity
- Sync failures > 10%
- Performance degradation > 2x baseline
- User reports of missing ratings

### 9.2 Rollback Steps

1. **Disable new rating flow** via feature flag
2. **Revert to cider-based ratings:**
   - Re-enable rating fields on cider forms
   - Hide rating fields on experience forms
   - Use `overallRating` field from ciders table
3. **Preserve experience ratings** (don't delete - keep for future attempt)
4. **Communicate to users** about temporary revert
5. **Investigate root cause**
6. **Fix issues and retry rollout**

### 9.3 Data Preservation

- Never delete rating data during rollback
- Keep experience ratings intact
- Keep legacy experiences for audit trail
- Log all rollback operations for analysis

---

## Summary & Timeline

### Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Database Schema | 3-5 days | None |
| Phase 2: Data Access Layer | 2-3 days | Phase 1 |
| Phase 3: Form Updates | 3-4 days | Phase 2 |
| Phase 4: Analytics Updates | 2-3 days | Phase 2 |
| Phase 5: Sync Logic | 3-4 days | Phase 1, 2 |
| Phase 6: Edge Cases | 2-3 days | Phase 2, 3 |
| Phase 7: Testing | 5-7 days | Phase 1-6 |
| Phase 8: Rollout | 14-21 days | Phase 7 |

**Total: 6-8 weeks**

### Key Success Metrics

- Zero data loss during migration
- < 5% increase in average page load time
- 100% of existing ratings preserved (via legacy experiences)
- < 1% error rate during rollout
- User satisfaction maintained or improved

### Risk Mitigation

1. **Data Loss Risk** - Mitigated by comprehensive backups and testing
2. **Performance Risk** - Mitigated by caching and incremental calculation
3. **User Confusion Risk** - Mitigated by clear UI messaging and help text
4. **Sync Complexity Risk** - Mitigated by thorough testing and gradual rollout
5. **Rollback Risk** - Mitigated by feature flags and preserved data

---

## Implementation Priority

**Phase 1 (Critical)** - Must be done first:
- TypeScript type updates
- Database migrations
- Rating calculation utilities

**Phase 2 (High Priority)** - Enable basic functionality:
- Form updates (remove from cider, add to experience)
- Database service methods

**Phase 3 (Medium Priority)** - Polish & completeness:
- Analytics updates
- Edge case handling
- UI improvements

**Phase 4 (Lower Priority)** - Optimization:
- Sync logic refinements
- Performance optimizations
- Advanced features (weighted ratings, etc.)

This plan provides a clear, comprehensive path forward for refactoring the rating system with minimal risk and maximum data integrity.
