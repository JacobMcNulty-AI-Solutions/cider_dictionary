// Firestore Security Rules for Phase 3 (Development/Testing)
// These rules allow all read/write access for testing purposes
// Update to production rules in Phase 4 when authentication is added

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DEVELOPMENT MODE - Allow all read/write access
    // This is acceptable for Phase 3 testing but should be updated for production
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

/*
IMPORTANT: To apply these rules:
1. Go to Firebase Console → Firestore Database
2. Click on "Rules" tab
3. Copy the rules above
4. Click "Publish"

These rules are for DEVELOPMENT ONLY. For production, see:
docs/database/firestore-structure.md (Phase 4 Production Rules section)
*/
