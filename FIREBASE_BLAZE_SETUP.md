# Firebase Blaze Plan Setup - Quick Guide

## ✅ Why Blaze Plan is Safe

**You won't be charged** if you stay within free tier limits:

### Free Tier Limits (Same as Spark):
- **Firestore**: 1GB storage, 50K reads/day, 20K writes/day
- **Storage**: 5GB storage, 1GB/day downloads
- **Hosting**: 10GB/month bandwidth

### Estimated Usage (Cider Dictionary):
- Firestore: ~500 reads/day, ~50 writes/day ✅ (1% of limit)
- Storage: ~100MB photos ✅ (2% of limit)
- Downloads: ~50MB/day ✅ (5% of limit)

**You'll stay well within limits!** 🎯

---

## 🚀 Step-by-Step: Upgrade to Blaze

### Step 1: Go to Firebase Console
1. Open: https://console.firebase.google.com
2. Select your project: **cider-dictionary**

### Step 2: Upgrade Plan
1. Click ⚙️ **Settings** (bottom left)
2. Click **Usage and billing** tab
3. Click **Modify plan** button
4. Select **Blaze (pay as you go)** plan

### Step 3: Add Payment Method
1. Click **Continue**
2. Add credit/debit card
3. Billing address
4. Click **Purchase**

### Step 4: Set Budget Alert (Recommended)
1. Still in Usage and billing
2. Click **Set budget alerts**
3. Set monthly budget: **$5**
4. Alert thresholds: 50%, 75%, 100%
5. Add your email
6. Click **Save**

**Now you'll get email alerts if you approach $5/month!**

---

## 📸 Step 5: Enable Storage

### Option 1: Automatic (When You Use It)
Storage will auto-enable when you upload your first image.

### Option 2: Manual Enable
1. In Firebase Console → **Storage** (left sidebar)
2. Click **Get started**
3. Choose **Start in test mode**
4. Select location: **us-central** (or closest to you)
5. Click **Done**

---

## 🔒 Step 6: Apply Security Rules

### Firestore Rules:
1. Firebase Console → **Firestore Database** → **Rules**
2. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DEVELOPMENT MODE - Allow all access
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **Publish**

### Storage Rules:
1. Firebase Console → **Storage** → **Rules**
2. Replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // DEVELOPMENT MODE - Allow all access
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **Publish**

---

## ✅ Verification

After upgrading, verify:

1. **Billing**: Settings → Usage and billing shows "Blaze"
2. **Storage**: Storage tab is accessible (not grayed out)
3. **Budget Alert**: You received confirmation email

---

## 💰 Expected Costs

### Month 1-3 (Testing Phase):
- **Expected**: $0.00/month
- **Maximum**: $0.10-0.50/month (if heavy testing)

### Production (100 users, 1000 ciders):
- **Expected**: $0.50-2.00/month
- **Maximum**: $5/month (your budget limit)

### If You Hit Budget Limit:
- You get email alert
- Service continues (won't stop)
- You can optimize queries
- Unlikely to happen with normal usage

---

## 🔐 Security Tips

### Protect Your Billing:
1. ✅ Set $5 budget alert (done in Step 4)
2. ✅ Use test mode rules (done in Step 6)
3. ✅ Monitor usage weekly in console
4. ✅ Don't share Firebase config publicly

### Update Rules in Phase 4:
Current rules allow **anyone** to read/write. This is OK for:
- ✅ Development
- ✅ Single-user testing
- ❌ Production with multiple users

In Phase 4, we'll add authentication and proper security rules.

---

## 🧪 Test After Setup

Once upgraded:

```bash
cd mobile-app/cider-dictionary
npm start
```

Expected console output:
```
✅ Firebase initialized successfully
✅ Firestore offline persistence enabled
✅ Firebase Storage initialized
✅ Phase 3 MVP initialized successfully
```

Then:
1. Create a cider with photo
2. Check Firebase Console → Storage
3. Image should appear in bucket! 🎉

---

## ❓ FAQ

**Q: Will I be charged immediately?**
A: No. You're only charged for usage beyond free tier.

**Q: What if I forget and exceed limits?**
A: Budget alerts will warn you. Service continues.

**Q: Can I downgrade later?**
A: Yes, but you'll lose Storage access.

**Q: Is my card info safe?**
A: Yes, Firebase uses Google's secure billing.

**Q: What if I don't use it?**
A: $0.00 charge. Pay only for what you use.

---

## 🎯 Next Steps

After upgrading to Blaze:

1. ✅ Storage is now available
2. ✅ Re-enable Storage in code (I'll do this)
3. ✅ Apply security rules
4. ✅ Test image uploads
5. ✅ Continue Phase 3 development!

---

**Ready?** Go upgrade to Blaze plan (5 minutes), then I'll re-enable Storage in the code! 🚀
