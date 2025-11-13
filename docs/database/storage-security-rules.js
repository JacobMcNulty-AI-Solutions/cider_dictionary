// Firebase Storage Security Rules for Phase 3 (Development/Testing)
// These rules allow all read/write access for testing purposes
// Update to production rules in Phase 4 when authentication is added

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // DEVELOPMENT MODE - Allow all read/write access
    // This is acceptable for Phase 3 testing but should be updated for production
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}

/*
IMPORTANT: To apply these rules:
1. Go to Firebase Console → Storage
2. Click on "Rules" tab
3. Copy the rules above
4. Click "Publish"

These rules are for DEVELOPMENT ONLY. For production, see:
docs/database/firestore-structure.md (Storage Rules Production section)
*/
