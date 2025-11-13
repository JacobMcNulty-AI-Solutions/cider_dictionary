# Phase 3 Setup Guide - Firebase Integration

## Overview
This guide walks through setting up Firebase integration for Phase 3 of the Cider Dictionary app.

## Prerequisites
- ✅ Firebase project created
- ✅ Environment variables configured in `.env`
- ✅ Firebase packages installed
- ✅ Code updated to use real Firebase

---

## Critical Steps Remaining

### 1. Add Firebase Configuration Files

React Native Firebase requires native configuration files for both iOS and Android:

#### **For Android:**
1. Go to Firebase Console → Project Settings → Your apps
2. Select your Android app (or add one if you haven't)
3. Download `google-services.json`
4. Place it in: `mobile-app/cider-dictionary/android/app/google-services.json`

#### **For iOS:**
1. Go to Firebase Console → Project Settings → Your apps
2. Select your iOS app (or add one if you haven't)
3. Download `GoogleService-Info.plist`
4. Place it in: `mobile-app/cider-dictionary/ios/GoogleService-Info.plist`

**Note**: These files contain sensitive Firebase credentials. They are gitignored and should NEVER be committed to version control.

---

### 2. Apply Security Rules in Firebase Console

#### **Firestore Security Rules**
1. Go to: Firebase Console → Firestore Database → Rules tab
2. Copy the rules from: `docs/database/firestore-security-rules.js`
3. Paste them in the editor
4. Click **"Publish"**

Current rules allow all read/write access (for development only).

#### **Storage Security Rules**
1. Go to: Firebase Console → Storage → Rules tab
2. Copy the rules from: `docs/database/storage-security-rules.js`
3. Paste them in the editor
4. Click **"Publish"**

Current rules allow all read/write access (for development only).

---

### 3. Create Firestore Indexes (Optional for Phase 3)

For better query performance, create these composite indexes:

1. Go to: Firebase Console → Firestore Database → Indexes tab
2. Create composite indexes:
   - Collection: `ciders`, Fields: `brand` (Ascending), `name` (Ascending)
   - Collection: `experiences`, Fields: `ciderId` (Ascending), `date` (Descending)
   - Collection: `experiences`, Fields: `venueName` (Ascending), `date` (Descending)

**Note**: Firestore will auto-suggest indexes when you run queries that need them.

---

## Testing the Integration

### Step 1: Verify Configuration
```bash
cd mobile-app/cider-dictionary
cat .env
```
Ensure all Firebase variables are set correctly.

### Step 2: Start the App
```bash
npm start
```

### Step 3: Watch for Firebase Initialization
Check the console output for:
```
Starting app initialization...
Initializing Firebase...
Firebase initialized successfully
Firestore offline persistence enabled
Phase 3 MVP initialized successfully
```

### Step 4: Test Basic Operations

#### Test 1: Create a Cider
1. Open the app
2. Click "Add" button
3. Fill in cider details
4. Save

Expected behavior:
- Saves to local SQLite immediately
- Queues for Firebase sync
- Syncs to Firestore when online
- Console shows: "Queued sync operation: CREATE_CIDER"

#### Test 2: Check Firestore Data
1. Go to Firebase Console → Firestore Database
2. Look for `ciders` collection
3. You should see your cider document
4. Verify all fields are present

#### Test 3: Offline Mode
1. Enable airplane mode on your device/emulator
2. Create another cider
3. Should save locally without errors
4. Disable airplane mode
5. Console should show: "Device came back online, processing sync queue..."
6. Check Firestore - new cider should appear

#### Test 4: Experience Logging
1. Create a cider
2. Log an experience for it
3. Check Firestore `experiences` collection
4. Verify ciderId references the cider

---

## Troubleshooting

### Error: "Invalid Firebase configuration"
- Check `.env` file has all required fields
- Restart Metro bundler: `npm start --reset-cache`
- Verify environment variables are prefixed with `EXPO_PUBLIC_`

### Error: "Firebase not initialized"
- Check App.tsx initialization order
- Firebase should initialize before SyncManager
- Look for errors in Firebase Console

### Error: "Permission denied"
- Check Firestore security rules are published
- Rules should allow all access for Phase 3
- Go to Firestore → Rules tab and verify

### Sync Queue Not Processing
- Check network connection
- Look for console logs: "Network state changed"
- Force sync: `syncManager.forceSyncNow()`
- Check `sync_queue` in SQLite for pending operations

### Images Not Uploading
- Check Storage security rules
- Verify Storage bucket name in `.env`
- Check image file size (should be < 5MB)
- Look for errors in console

---

## Phase 3 Success Criteria

### ✅ Functional Requirements
- [ ] Firebase initializes without errors
- [ ] Ciders sync to Firestore when created
- [ ] Experiences sync to Firestore when logged
- [ ] Offline mode works (data saves locally)
- [ ] Auto-sync triggers when device comes online
- [ ] Images upload to Firebase Storage
- [ ] Sync queue processes pending operations

### ✅ Performance Requirements
- [ ] App startup < 3 seconds
- [ ] Sync operations < 500ms per item
- [ ] Offline operations instant (< 100ms)
- [ ] No memory leaks during sync

### ✅ Data Integrity
- [ ] No data loss during offline/online transitions
- [ ] Timestamps preserved correctly
- [ ] All required fields present in Firestore
- [ ] References (ciderId) maintained correctly

---

## Next Steps After Phase 3

Once Phase 3 is working:

1. **Test thoroughly** with various scenarios
2. **Monitor Firebase usage** in Firebase Console
3. **Optimize queries** based on usage patterns
4. **Add error tracking** (Crashlytics in Phase 4)
5. **Implement conflict resolution** (advanced sync)
6. **Add authentication** (Phase 4)
7. **Update security rules** for production

---

## Important Files Reference

- **Firebase Config**: `src/services/firebase/config.ts`
- **Sync Manager**: `src/services/sync/SyncManager.ts`
- **App Initialization**: `App.tsx`
- **Database Structure**: `docs/database/firestore-structure.md`
- **Security Rules**: `docs/database/firestore-security-rules.js`
- **Pseudocode**: `docs/pseudocode/10-offline-sync-orchestration.pseudo`

---

## Support

If you encounter issues:
1. Check Firebase Console for errors
2. Review console logs carefully
3. Verify all configuration files are in place
4. Test network connectivity
5. Check Firestore and Storage rules

**Firebase Free Tier Limits**:
- 50,000 reads/day
- 20,000 writes/day
- 1 GB Firestore storage
- 5 GB Cloud Storage

With typical usage (100 ciders, 500 experiences), you'll stay well within limits.

---

**Last Updated**: 2025-11-12
**Phase**: 3 (MVP with Firebase Sync)
**Status**: Ready for Testing
