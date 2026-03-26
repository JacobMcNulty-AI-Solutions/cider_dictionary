# Firestore Ratings Migration

**⚠️ ONE-TIME USE ONLY** - Run this before deploying the updated app

## What This Does

Migrates the rating system from ciders to experiences in Firestore:

1. **Ciders WITH experiences** → Creates a "legacy" experience with the cider's current rating
2. **Ciders WITHOUT experiences** → Removes rating data (sets to null)
3. **All ciders** → Adds cached rating fields (`_cachedRating`, `_ratingCount`, etc.)

---

## Setup Instructions

### Step 1: Get Firebase Service Account Key

**Why you need this**: Your `.env` file has client-side Firebase credentials (public keys with limited permissions). The migration needs **admin credentials** (private key with full database access) to bulk-modify all Firestore data.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`cider-dictionary`)
3. Click ⚙️ → **Project Settings** → **Service Accounts** tab
4. Click **"Generate New Private Key"**
5. Save the downloaded JSON file as `serviceAccountKey.json` in this `migration/` folder

**⚠️ IMPORTANT**: This is a PRIVATE KEY with full admin access - never commit it to git! It's already in `.gitignore`

**✅ BONUS**: The script will automatically read your project ID from the root `.env` file!

### Step 2: Install Dependencies

```bash
cd migration
npm install
```

---

## Running the Migration

### Option 1: Dry Run (RECOMMENDED FIRST) 🧪

Test the migration without making any changes:

```bash
npm run migrate:dry-run
```

This will:
- ✅ Show exactly what would be changed
- ✅ Display statistics
- ❌ NOT modify any Firestore data

**Review the output carefully!**

### Option 2: Live Migration ⚠️

Actually migrate the Firestore data:

```bash
npm run migrate:live
```

This will:
- ⚠️ Modify your Firestore database
- 🔒 Wait 5 seconds before starting (time to cancel with Ctrl+C)
- ✅ Create legacy experiences
- ✅ Update cider rating caches
- ✅ Display final statistics

---

## Expected Output

```
╔════════════════════════════════════════════════════════════╗
║     Firestore Ratings Migration Script                    ║
║     Migrating ratings from ciders to experiences          ║
╚════════════════════════════════════════════════════════════╝

🧪 DRY RUN MODE - No changes will be made

✓ Connected to Firestore

📊 Fetching all ciders and experiences...
Found 45 ciders
Found 123 experiences

🔄 Processing ciders...

  ✓ Creating legacy experience for: Aspall Draught Suffolk Cyder
  ✓ Creating legacy experience for: Thatchers Gold
  - Removing rating for: Old Mout (no experiences)
  ...

╔════════════════════════════════════════════════════════════╗
║                  Migration Complete!                       ║
╚════════════════════════════════════════════════════════════╝

📊 Statistics:
   Total ciders:                 45
   Total experiences:            123
   Ciders with experiences:      38
   Ciders without experiences:   7
   Legacy experiences created:   38
   Ratings removed (no exp):     7
   Rating caches updated:        45
   Errors:                       0

✅ Migration completed successfully!
```

---

## Troubleshooting

### ❌ Error: "Cannot find service account key"

**Solution**: Make sure `serviceAccountKey.json` is in the `migration/` folder

```bash
ls migration/serviceAccountKey.json  # Should show the file
```

### ❌ Error: "Permission denied"

**Solution**: Your service account needs Firestore admin permissions

1. Go to Firebase Console → IAM & Admin
2. Find your service account
3. Grant "Cloud Datastore Owner" role

### ❌ Error: "Module not found: firebase-admin"

**Solution**: Install dependencies

```bash
cd migration
npm install
```

### ❌ Error: "Cannot find module 'ts-node'"

**Solution**: Install globally or use locally

```bash
npm install -g ts-node
# or use locally
npx ts-node migrate-firestore-ratings.ts
```

---

## Safety Features

✅ **Dry run mode** - Test without making changes
✅ **5-second delay** - Time to cancel before live migration
✅ **Idempotent** - Safe to run multiple times
✅ **Batched operations** - Efficient Firestore usage
✅ **Error handling** - Logs errors and continues

---

## After Migration

### 1. Verify Success

Check the statistics output:
- `Errors: 0` ✅ Good!
- `Errors: >0` ❌ Review error messages

### 2. Deploy Updated App

The app code is already ready - just deploy:
- Users' local SQLite databases will migrate automatically
- New experiences will include ratings
- Cider ratings will show as averages

### 3. Test

- Create a new experience with a rating
- Check that the cider's average rating updates
- Verify legacy experiences show in experience list

---

## Rollback (if needed)

If something goes wrong:

1. **Delete legacy experiences**:
   ```
   - Query Firestore for experiences with IDs starting with "legacy_"
   - Delete them
   ```

2. **Remove cached fields**:
   ```
   - Update all ciders to remove: _cachedRating, _cachedDetailedRatings, _ratingCount
   ```

3. **Restore from backup** (if you created one beforehand)

**💡 TIP**: Create a Firestore backup before running the live migration!

---

## Files in This Folder

```
migration/
├── README.md                      # This file
├── package.json                   # Dependencies
├── migrate-firestore-ratings.ts   # Migration script
└── serviceAccountKey.json         # YOUR Firebase key (DO NOT COMMIT!)
```

---

## Questions?

**Q: Can I run this multiple times?**
A: Yes! It checks if legacy experiences already exist and skips them.

**Q: What if I'm offline?**
A: The script requires internet to connect to Firestore. Run it on a machine with stable internet.

**Q: Will this affect users currently using the app?**
A: No. The migration only changes Firestore structure. Users won't see changes until they update the app.

**Q: Do I need to run this for each user?**
A: No! Run it ONCE. It migrates ALL data in your Firestore database for all users.

---

**Need help?** Check the error messages carefully - they usually explain the issue!
