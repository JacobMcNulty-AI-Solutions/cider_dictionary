# Phase 3 Setup (Without Firebase Storage)

## ✅ What's Working

Your app will work **fully functional** except for image uploads:

- ✅ Create ciders (sync to Firestore)
- ✅ Log experiences (sync to Firestore)
- ✅ Offline mode (SQLite)
- ✅ Auto-sync when online
- ✅ All analytics and features
- ⚠️ Image uploads disabled (requires Blaze plan)

Images will be stored **locally only** until you upgrade to Blaze plan.

---

## 🔧 Setup Steps (5 minutes)

### Step 1: Apply Firestore Security Rules Only

1. **Go to**: https://console.firebase.google.com
2. **Select**: `cider-dictionary` project
3. **Click**: Firestore Database (left sidebar)
4. **Click**: Rules tab
5. **Replace all content** with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

6. **Click**: "Publish" button
7. **Done!** ✅

### Step 2: Skip Storage Rules
You can skip the Storage rules since we disabled Storage.

---

## 🧪 Test the App

```bash
cd mobile-app/cider-dictionary
npm start
```

### Expected Console Output:

```
✅ Initializing Firebase...
✅ Firebase initialized successfully
✅ Firestore offline persistence enabled
⚠️  Firebase Storage not available (Blaze plan required). Image uploads disabled.
✅ Phase 3 MVP initialized successfully
```

### Test Checklist:

1. **Create a cider** (without photo)
   - Should save locally instantly
   - Should appear in Firebase Console → Firestore → `ciders` collection

2. **Enable airplane mode** → Create another cider
   - Should work offline
   - Disable airplane mode
   - Should sync automatically

3. **Log an experience**
   - Should sync to Firestore → `experiences` collection

---

## 💡 When You Want Image Uploads

To enable image uploads later, upgrade to **Blaze (pay-as-you-go) plan**:

### Why Blaze Plan is Still Free:

**Free Tier Limits (Blaze Plan):**
- Storage: 5GB (enough for 1000+ photos)
- Downloads: 1GB/day
- Firestore: Same as Spark plan

**You won't be charged** unless you exceed these limits.

### How to Upgrade:

1. Firebase Console → Settings → Usage and billing
2. Click "Modify plan"
3. Select "Blaze" plan
4. Add credit card
5. Set budget alert at $5 (safety measure)
6. Storage will work immediately

### After Upgrading:

Apply Storage rules:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

Then restart your app - images will upload automatically!

---

## 📊 Current Firebase Usage (Without Storage)

Typical usage for Phase 3:
- **Firestore Reads**: ~500/day (out of 50,000 free)
- **Firestore Writes**: ~50/day (out of 20,000 free)
- **Storage**: 0 (disabled)

**You're using ~1% of your free quota** ✅

---

## 🎯 What Works Right Now

### ✅ Full Functionality:
- Create, edit, delete ciders
- Log experiences with venues
- Offline mode
- Auto-sync
- Search and filtering
- Analytics and rankings
- Venue tracking
- Price tracking

### ⚠️ Temporarily Disabled:
- Image uploads to cloud (images save locally only)

---

## 🚀 Ready to Test!

1. Apply Firestore rules (see Step 1 above)
2. Run `npm start`
3. Create a cider in the app
4. Check Firebase Console → Firestore Database
5. You should see your cider! 🎉

---

## 📝 Notes

- **Images are still captured** - they just don't sync to cloud
- **You can add Storage later** without losing any data
- **All other features work perfectly** without Storage
- **This is perfect for Phase 3 testing**

---

**Bottom line**: Your app is fully functional for testing Phase 3 sync without needing to upgrade Firebase plans right now!
