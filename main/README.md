# TOG3R - Premium Co-Watching Platform

A billion-dollar looking OTT-style co-watching platform that brings people together to watch YouTube, Netflix, Instagram Reels, TikTok, and more - in perfect sync.

## 🌸 Features

### Core Experience
- **Premium Glassmorphic UI** - Stunning translucent design with the signature Blossom theme
- **Multi-Platform Support** - YouTube, Netflix, Instagram Reels, TikTok, and custom URLs
- **Real-Time Sync** - Frame-perfect video synchronization across all viewers
- **Live Chat** - Instagram-style messaging with reactions and particle effects
- **Room Management** - Create public/private rooms with unique access codes
- **Admin Controls** - Host controls playback, can transfer admin to any viewer

### Premium Features
- **Theme System** - Blossom (default), Deep Dark, and Clean Light themes
- **Picture-in-Picture Mode** - Browse while staying connected to your room
- **Reaction Bursts** - Animated emoji particles that float over the video
- **Adaptive Ambient Glow** - Dynamic background lighting based on content
- **Collaborative Controls** - Option to let guests control playback

## 📁 Project Structure

```
TOG3R/
├── index.html                  # Login/Auth entry point
├── dashboard.html              # Main OTT dashboard & co-watching hub
├── styles/
│   ├── core.css                # Design system tokens & variables
│   ├── glassmorphism.css       # Premium translucent effects
│   ├── dashboard.css           # Grid layouts & platform bars
│   └── rooms.css               # Theater layout & chat sidebar
├── scripts/
│   ├── auth.js                 # Firebase authentication
│   ├── dashboard.js            # Dashboard UI controller
│   ├── platforms.js            # Platform integrations (YouTube API)
│   ├── rooms.js                # Room creation & management
│   └── sync.js                 # Real-time Firestore sync engine
├── mascot/                     # Sam mascot components
└── assets/icons/               # SVG icon library
```

## 🚀 Setup Instructions

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication** (Email/Password + Google Sign-In)
4. Enable **Firestore Database**
5. Copy your Firebase config from Project Settings

6. Update `scripts/auth.js` with your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. Firestore Security Rules

Set up these security rules in Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - authenticated users can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Rooms collection - authenticated users can create and join
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

### 3. Run the Application

You can serve the files using any static file server:

**Option A: Using Python**
```bash
cd /workspace/main
python3 -m http.server 8000
```

**Option B: Using Node.js**
```bash
npm install -g serve
serve main
```

**Option C: Using PHP**
```bash
cd main
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## 🎨 Default Theme: Blossom

The default Blossom theme features:
- Soft pink gradients (#ff7eb3, #ffb8d2)
- Cream backgrounds (#fff8f3)
- Lavender accents (#c4b5fd)
- Premium glassmorphic panels
- Smooth animations and transitions

## 🔐 Authentication

The app supports:
- Email/Password sign-up and login
- Google Sign-In (one-click authentication)
- Persistent sessions (stay logged in)
- Profile customization (name, avatar, handle)

## 🎮 How to Use

### Creating a Room
1. Click the floating "+" button or any media card
2. Select your platform (YouTube, Netflix, etc.)
3. Paste the video/stream URL
4. Customize room settings (private, collaborative controls)
5. Click "Create Room & Start Watching"
6. Copy the room code and share with friends

### Joining a Room
1. Click "Join Room" in the navbar
2. Enter the room code (e.g., TOG3R-A7B2)
3. Click "Join Room"
4. You're in! Chat and watch together

### During a Watch Party
- **Host**: Controls play/pause/seek for everyone
- **Guests**: Watch in sync, chat, send reactions
- **Transfer Host**: Click "Make Host" on any viewer to give them control
- **Reactions**: Click emoji buttons to trigger particle bursts
- **PiP Mode**: Navigate away while keeping video in floating window

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript (no framework dependencies)
- **Styling**: CSS Variables, Flexbox, Grid, Glassmorphism
- **Backend**: Firebase (Authentication + Firestore)
- **Video**: YouTube Iframe Player API
- **Real-Time**: Firestore Snapshots for instant sync
- **Icons**: Inline SVG (no external libraries)

## 📱 Responsive Design

Fully responsive across:
- Desktop (1920px+)
- Laptop (1200px - 1920px)
- Tablet (768px - 1200px)
- Mobile (< 768px)

## 🎯 Future Enhancements

- YouTube Data API integration for real trending videos
- Netflix integration via browser extension
- Custom embed support for more platforms
- Voice chat integration
- Screen sharing capability
- Watch history and recommendations
- Premium subscription tiers

## 📄 License

This project is proprietary software. All rights reserved.

---

**Built with ❤️ using the Blossom Design System**

*TOG3R - Watch Together, Anywhere*
