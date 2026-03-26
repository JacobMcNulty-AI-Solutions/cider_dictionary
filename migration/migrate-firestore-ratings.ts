#!/usr/bin/env ts-node
/**
 * Firestore Ratings Migration Script
 *
 * This script migrates the rating system from ciders to experiences in Firestore.
 *
 * What it does:
 * 1. For ciders WITH experiences: Creates a legacy experience with the cider's rating
 * 2. For ciders WITHOUT experiences: Removes rating data (sets to null)
 * 3. Adds cached rating fields to all ciders
 *
 * IMPORTANT: Run this ONCE before deploying the updated app
 *
 * Requirements:
 * - Firebase Admin SDK service account key
 * - Node.js 18+
 *
 * Usage:
 *   cd migration
 *   npm install
 *   npm run migrate:dry-run    # Test first (recommended)
 *   npm run migrate:live       # Actual migration
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
const DRY_RUN = process.env.DRY_RUN === 'true'; // Set to 'true' to test without making changes
const BATCH_SIZE = 500; // Firestore batch limit

// Get project ID from .env (fallback to service account)
const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || null;

interface FirestoreCider {
  id: string;
  userId: string;
  name: string;
  brand: string;
  abv: number;
  overallRating: number;
  detailedRatings?: {
    appearance?: number;
    aroma?: number;
    taste?: number;
    mouthfeel?: number;
  };
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

interface FirestoreExperience {
  id: string;
  userId: string;
  ciderId: string;
  rating?: number;
  [key: string]: any;
}

// Statistics tracking
const stats = {
  totalCiders: 0,
  totalExperiences: 0,
  cidersWithExperiences: 0,
  cidersWithoutExperiences: 0,
  legacyExperiencesCreated: 0,
  ratingsRemoved: 0,
  cacheUpdated: 0,
  errors: 0
};

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase(): admin.app.App {
  try {
    const serviceAccount = JSON.parse(
      fs.readFileSync(path.resolve(SERVICE_ACCOUNT_PATH), 'utf8')
    );

    // Use project ID from .env if available (avoids hardcoding)
    if (PROJECT_ID && !serviceAccount.project_id) {
      serviceAccount.project_id = PROJECT_ID;
    }

    console.log(`Connecting to Firebase project: ${serviceAccount.project_id || PROJECT_ID}`);

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    console.error('\nMake sure you have:');
    console.error('1. Downloaded your Firebase service account key from:');
    console.error('   Firebase Console → Project Settings → Service Accounts → Generate New Private Key');
    console.error('2. Saved it as serviceAccountKey.json in the migration/ folder');
    console.error('3. Your .env file exists in the project root with EXPO_PUBLIC_FIREBASE_PROJECT_ID');
    console.error('4. Or set FIREBASE_SERVICE_ACCOUNT_PATH environment variable');
    process.exit(1);
  }
}

/**
 * Calculate average rating from experiences
 */
function calculateAverageRating(experiences: FirestoreExperience[]): number | null {
  const rated = experiences.filter(exp => exp.rating !== undefined && exp.rating !== null);

  if (rated.length === 0) {
    return null;
  }

  const sum = rated.reduce((acc, exp) => acc + exp.rating!, 0);
  const avg = Math.round(sum / rated.length);

  return Math.max(1, Math.min(10, avg));
}

/**
 * Calculate average detailed ratings from experiences
 */
function calculateDetailedRatings(experiences: any[]): any {
  const validExperiences = experiences.filter(exp =>
    exp.appearance || exp.aroma || exp.taste || exp.mouthfeel
  );

  if (validExperiences.length === 0) {
    return {};
  }

  const sums = { appearance: 0, aroma: 0, taste: 0, mouthfeel: 0 };
  const counts = { appearance: 0, aroma: 0, taste: 0, mouthfeel: 0 };

  validExperiences.forEach(exp => {
    ['appearance', 'aroma', 'taste', 'mouthfeel'].forEach(key => {
      if (exp[key] !== undefined && exp[key] !== null) {
        sums[key as keyof typeof sums] += exp[key];
        counts[key as keyof typeof counts]++;
      }
    });
  });

  const result: any = {};
  Object.keys(sums).forEach(key => {
    const typedKey = key as keyof typeof counts;
    const count = counts[typedKey];
    if (count > 0) {
      const avg = Math.round(sums[typedKey] / count);
      result[key] = Math.max(1, Math.min(10, avg));
    }
  });

  return result;
}

/**
 * Migrate all ciders and experiences
 */
async function migrateCidersAndExperiences(db: admin.firestore.Firestore): Promise<void> {
  console.log('\n📊 Fetching all ciders and experiences...');

  // Fetch all ciders
  const cidersSnapshot = await db.collection('ciders').get();
  stats.totalCiders = cidersSnapshot.size;
  console.log(`Found ${stats.totalCiders} ciders`);

  // Fetch all experiences
  const experiencesSnapshot = await db.collection('experiences').get();
  stats.totalExperiences = experiencesSnapshot.size;
  console.log(`Found ${stats.totalExperiences} experiences`);

  // Group experiences by ciderId
  const experiencesByCider = new Map<string, FirestoreExperience[]>();
  experiencesSnapshot.forEach(doc => {
    const exp = { id: doc.id, ...doc.data() } as FirestoreExperience;
    if (!experiencesByCider.has(exp.ciderId)) {
      experiencesByCider.set(exp.ciderId, []);
    }
    experiencesByCider.get(exp.ciderId)!.push(exp);
  });

  console.log('\n🔄 Processing ciders...\n');

  // Process each cider
  let batch = db.batch();
  let batchCount = 0;

  for (const ciderDoc of cidersSnapshot.docs) {
    const cider = { id: ciderDoc.id, ...ciderDoc.data() } as FirestoreCider;
    const experiences = experiencesByCider.get(cider.id) || [];
    const hasExperiences = experiences.length > 0;

    try {
      if (hasExperiences) {
        // Cider HAS experiences: Create legacy experience
        stats.cidersWithExperiences++;

        const legacyId = `legacy_${cider.id}`;

        // Check if legacy experience already exists
        const legacyExists = experiences.some(exp => exp.id === legacyId);

        if (!legacyExists) {
          console.log(`  ✓ Creating legacy experience for: ${cider.name}`);

          const legacyExperience = {
            id: legacyId,
            userId: cider.userId,
            ciderId: cider.id,
            date: cider.createdAt,
            venue: JSON.stringify({ id: 'legacy', name: 'Initial Rating', type: 'other' }),
            price: 0,
            containerSize: 568, // pint
            containerType: 'bottle',
            pricePerPint: 0,
            rating: cider.overallRating,
            appearance: cider.detailedRatings?.appearance || null,
            aroma: cider.detailedRatings?.aroma || null,
            taste: cider.detailedRatings?.taste || null,
            mouthfeel: cider.detailedRatings?.mouthfeel || null,
            notes: 'Rating from before migration - this reflects your initial impression of this cider',
            createdAt: cider.createdAt,
            updatedAt: new Date().toISOString(),
            syncStatus: 'synced',
            version: 1
          };

          if (!DRY_RUN) {
            batch.set(db.collection('experiences').doc(legacyId), legacyExperience);
            batchCount++;
          }

          stats.legacyExperiencesCreated++;

          // Add legacy experience to the list for rating calculation
          experiences.push(legacyExperience as any);
        }

        // Calculate and cache ratings from ALL experiences (including legacy)
        const avgRating = calculateAverageRating(experiences);
        const detailedRatings = calculateDetailedRatings(experiences);

        if (!DRY_RUN) {
          batch.update(db.collection('ciders').doc(cider.id), {
            _cachedRating: avgRating,
            _cachedDetailedRatings: Object.keys(detailedRatings).length > 0 ? detailedRatings : null,
            _ratingCount: experiences.filter(e => e.rating).length,
            _ratingLastCalculated: new Date().toISOString()
          });
          batchCount++;
        }

        stats.cacheUpdated++;

      } else {
        // Cider has NO experiences: Remove rating data
        stats.cidersWithoutExperiences++;

        console.log(`  - Removing rating for: ${cider.name} (no experiences)`);

        if (!DRY_RUN) {
          batch.update(db.collection('ciders').doc(cider.id), {
            _cachedRating: null,
            _cachedDetailedRatings: null,
            _ratingCount: 0,
            _ratingLastCalculated: new Date().toISOString()
          });
          batchCount++;
        }

        stats.ratingsRemoved++;
      }

      // Commit batch when it reaches the limit
      if (batchCount >= BATCH_SIZE) {
        if (!DRY_RUN) {
          await batch.commit();
          console.log(`\n  📝 Committed batch of ${batchCount} operations`);
        }
        batch = db.batch();
        batchCount = 0;
      }

    } catch (error) {
      console.error(`  ❌ Error processing cider ${cider.name}:`, error);
      stats.errors++;
    }
  }

  // Commit remaining operations
  if (batchCount > 0 && !DRY_RUN) {
    await batch.commit();
    console.log(`\n  📝 Committed final batch of ${batchCount} operations`);
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Firestore Ratings Migration Script                    ║');
  console.log('║     Migrating ratings from ciders to experiences          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🧪 DRY RUN MODE - No changes will be made');
    console.log('   Set DRY_RUN=false to perform actual migration\n');
  } else {
    console.log('⚠️  LIVE MODE - Changes will be made to Firestore');
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Initialize Firebase
  const app = initializeFirebase();
  const db = admin.firestore(app);

  console.log('✓ Connected to Firestore\n');

  try {
    // Run migration
    await migrateCidersAndExperiences(db);

    // Print statistics
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  Migration Complete!                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Statistics:');
    console.log(`   Total ciders:                 ${stats.totalCiders}`);
    console.log(`   Total experiences:            ${stats.totalExperiences}`);
    console.log(`   Ciders with experiences:      ${stats.cidersWithExperiences}`);
    console.log(`   Ciders without experiences:   ${stats.cidersWithoutExperiences}`);
    console.log(`   Legacy experiences created:   ${stats.legacyExperiencesCreated}`);
    console.log(`   Ratings removed (no exp):     ${stats.ratingsRemoved}`);
    console.log(`   Rating caches updated:        ${stats.cacheUpdated}`);
    console.log(`   Errors:                       ${stats.errors}\n`);

    if (DRY_RUN) {
      console.log('🧪 This was a DRY RUN - no changes were made');
      console.log('   Run with npm run migrate:live to perform the actual migration\n');
    } else {
      console.log('✅ Migration completed successfully!\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await app.delete();
  }
}

// Run the migration
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
