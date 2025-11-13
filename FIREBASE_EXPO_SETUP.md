# Firebase Setup for Expo (Updated)

## ✅ What's Already Done

You're using the **Firebase JS SDK** which works perfectly with Expo managed workflow. This means:

- ❌ **NO** `google-services.json` needed
- ❌ **NO** `GoogleService-Info.plist` needed
- ✅ Configuration is in `.env` file (already done!)

---

## 🔧 Required Steps

### Step 1: Apply Firestore Security Rules

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**: `cider-dictionary`
3. **Navigate to**: Firestore Database (left sidebar)
4. **Click**: "Rules" tab at the top
5. **Replace all content** with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DEVELOPMENT MODE - Allow all access for testing
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

6. **Click**: "Publish" button
7. **Wait**: For confirmation "Rules have been published"

---

### Step 2: Apply Storage Security Rules

1. **Still in Firebase Console**
2. **Navigate to**: Storage (left sidebar)
3. **Click**: "Rules" tab at the top
4. **Replace all content** with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // DEVELOPMENT MODE - Allow all access for testing
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

5. **Click**: "Publish" button
6. **Wait**: For confirmation "Rules have been published"

---

### Step 3: Verify Firestore Database is Created

1. **In Firebase Console** → Firestore Database
2. **If you see "Create database"** button:
   - Click it
   - Choose **"Start in test mode"**
   - Select location: **us-central** (or closest to you)
   - Click "Enable"
3. **If you already see a database**: You're good! ✅

---

### Step 4: Verify Storage is Enabled

1. **In Firebase Console** → Storage
2. **If you see "Get started"** button:
   - Click it
   - Choose **"Start in test mode"**
   - Use same location as Firestore
   - Click "Done"
3. **If you already see storage bucket**: You're good! ✅

---

## 🧪 Testing

Once the rules are published, test your app:

```bash
cd mobile-app/cider-dictionary
npm start
```

### Expected Console Output:

```
✅ Initializing Firebase...
✅ Firebase initialized successfully
✅ Firestore offline persistence enabled
✅ Phase 3 MVP initialized successfully
```

### If You See Errors:

#### Error: "Firebase: Error (auth/api-key-not-valid)"
- Check your `.env` file
- Make sure `EXPO_PUBLIC_FIREBASE_API_KEY` is correct
- Restart Metro bundler: `npm start --reset-cache`

#### Error: "Missing or insufficient permissions"
- Firestore rules not published correctly
- Go back to Firestore → Rules and publish again
- Make sure you clicked "Publish" button

#### Error: "Failed to get document"
- Storage rules not published
- Go back to Storage → Rules and publish again

---

## 🎯 Quick Verification Checklist

After applying rules, verify in Firebase Console:

**Firestore Database:**
- [ ] Database created
- [ ] Rules show `allow read, write: if true;`
- [ ] Rules status shows "Published"

**Storage:**
- [ ] Storage bucket created
- [ ] Rules show `allow read, write: if true;`
- [ ] Rules status shows "Published"

**Environment Variables:**
- [ ] `.env` file exists in `mobile-app/cider-dictionary/`
- [ ] All 6 Firebase variables are set
- [ ] No spaces or quotes around values

---

## 🔐 Security Note

**IMPORTANT**: These rules allow **anyone** to read/write your database!

This is acceptable for:
- ✅ Development and testing
- ✅ Phase 3 (single user, personal use)

You MUST update these rules for production in Phase 4 when you add authentication.

---

## 🚀 Next Steps After Rules Applied

1. Start the app: `npm start`
2. Create a cider in the app
3. Check Firebase Console → Firestore Database
4. You should see a new document in the `ciders` collection
5. Success! 🎉

---

## 📞 Still Having Issues?

Common fixes:
- Restart Metro bundler: `npm start --reset-cache`
- Check Firebase Console for quota limits
- Verify internet connection
- Check if Firebase services are down: https://status.firebase.google.com

---

**You do NOT need any native configuration files with the Expo + Firebase JS SDK setup!**
