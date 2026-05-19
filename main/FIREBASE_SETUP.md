# Firebase Setup Guide for TOG3R

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing "samdevs" project
3. Follow the setup wizard

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password**:
   - Click on "Email/Password"
   - Toggle "Enable"
   - Click "Save"

3. Enable **Google Sign-In**:
   - Click on "Google"
   - Toggle "Enable"
   - Set project support email
   - Click "Save"

## Step 3: Enable Firestore Database

1. Go to **Firestore Database** in left sidebar
2. Click "Create database"
3. Choose **Start in test mode** (for development)
4. Select a location closest to your users
5. Click "Enable"

## Step 4: Get Your Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the web app icon (`</>`)
4. Register your app with nickname "TOG3R Dashboard"
5. Copy the `firebaseConfig` object

## Step 5: Update auth.js

Replace the config in `/workspace/main/scripts/auth.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Step 6: Set Firestore Security Rules

Go to **Firestore Database** > **Rules** and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Rooms collection
    match /rooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.adminUID == request.auth.uid || 
         resource.data.viewers.exists(v, v.uid == request.auth.uid));
      
      // Chat subcollection
      match /chat/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
      }
    }
  }
}
```

Click "Publish" to save the rules.

## Step 7: Test the Application

1. Start a local server:
   ```bash
   cd /workspace/main
   python3 -m http.server 8000
   ```

2. Open `http://localhost:8000/dashboard.html`

3. Create an account or sign in with Google

4. Create a room and test the sync!

## Troubleshooting

### "Firebase not defined" error
- Make sure Firebase SDK scripts are loaded before your scripts
- Check browser console for network errors

### Permission denied errors
- Verify Firestore rules are published
- Make sure user is authenticated

### Sync not working
- Check Firebase Console > Firestore for room documents
- Verify room code format (TOG3R-XXXX)

## Production Checklist

Before going live:

1. [ ] Update Firestore rules from test mode to production rules
2. [ ] Enable Firebase App Check for security
3. [ ] Set up Firebase Hosting for deployment
4. [ ] Add custom domain in Firebase Console
5. [ ] Enable Cloud Functions for advanced features (optional)
6. [ ] Set up monitoring and analytics

---

**Need help?** Check the [Firebase Documentation](https://firebase.google.com/docs)
