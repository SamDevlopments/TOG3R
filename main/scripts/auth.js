/**
 * TOG3R - Firebase Authentication Handler
 * Manages user login, signup, profile persistence, and auth state
 */

// Firebase Configuration
// IMPORTANT: Replace these values with your actual Firebase project config
// Get these from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "AIzaSyDkH8aGvPXxLqfzC5F3VhJ9Y2bN1mR4tUw",
  authDomain: "samdevs.firebaseapp.com",
  projectId: "samdevs",
  storageBucket: "samdevs.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Current User State
let currentUser = null;
let userProfile = null;

/**
 * Initialize Authentication Listener
 * Sets up persistent auth state monitoring
 */
function initAuth() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadUserProfile(user.uid);
      updateUIForLoggedInUser(user, userProfile);
      
      // Redirect to dashboard if on login page
      if (window.location.pathname.includes('index.html') || window.location.pathname === '/main/') {
        window.location.href = 'dashboard.html';
      }
    } else {
      currentUser = null;
      userProfile = null;
      
      // Redirect to login if on dashboard
      if (window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html';
      }
    }
  });
}

/**
 * Load User Profile from Firestore
 * @param {string} uid - User ID
 */
async function loadUserProfile(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      userProfile = doc.data();
    } else {
      // Create default profile for new users
      userProfile = {
        name: currentUser.displayName || 'User',
        handle: currentUser.email?.split('@')[0] || 'user',
        avatar: currentUser.photoURL || null,
        theme: 'blossom',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('users').doc(uid).set(userProfile);
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    userProfile = {
      name: currentUser?.displayName || 'User',
      handle: currentUser?.email?.split('@')[0] || 'user',
      avatar: currentUser?.photoURL || null,
      theme: 'blossom'
    };
  }
}

/**
 * Update UI for Logged In User
 * @param {object} user - Firebase user object
 * @param {object} profile - User profile data
 */
function updateUIForLoggedInUser(user, profile) {
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');
  const avatarImage = document.getElementById('avatarImage');
  const dropdownAvatarPlaceholder = document.getElementById('dropdownAvatarPlaceholder');
  const dropdownAvatarImage = document.getElementById('dropdownAvatarImage');
  const dropdownName = document.getElementById('dropdownName');
  const dropdownHandle = document.getElementById('dropdownHandle');
  
  if (!avatarPlaceholder) return;
  
  // Set user info
  const displayName = profile?.name || user.displayName || 'User';
  const displayHandle = profile?.handle || user.email?.split('@')[0] || 'user';
  const displayAvatar = profile?.avatar || user.photoURL;
  
  // Update navbar avatar
  if (displayAvatar) {
    avatarImage.src = displayAvatar;
    avatarImage.style.display = 'block';
    avatarPlaceholder.style.display = 'none';
    
    if (dropdownAvatarImage) {
      dropdownAvatarImage.src = displayAvatar;
      dropdownAvatarImage.style.display = 'block';
      dropdownAvatarPlaceholder.style.display = 'none';
    }
  } else {
    avatarPlaceholder.textContent = displayName.charAt(0).toUpperCase();
    avatarImage.style.display = 'none';
    avatarPlaceholder.style.display = 'flex';
    
    if (dropdownAvatarPlaceholder) {
      dropdownAvatarPlaceholder.textContent = displayName.charAt(0).toUpperCase();
      dropdownAvatarImage.style.display = 'none';
      dropdownAvatarPlaceholder.style.display = 'flex';
    }
  }
  
  // Update dropdown info
  if (dropdownName) dropdownName.textContent = displayName;
  if (dropdownHandle) dropdownHandle.textContent = `@${displayHandle}`;
  
  // Apply saved theme
  if (profile?.theme) {
    applyTheme(profile.theme);
  }
}

/**
 * Sign Up with Email and Password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>}
 */
async function signUpWithEmail(email, password) {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Login with Email and Password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>}
 */
async function loginWithEmail(email, password) {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Sign in with Google
 * @returns {Promise<object>}
 */
async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Logout User
 * @returns {Promise<void>}
 */
async function logout() {
  try {
    await auth.signOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
  }
}

/**
 * Update User Profile
 * @param {object} updates - Profile fields to update
 */
async function updateUserProfile(updates) {
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  try {
    await db.collection('users').doc(currentUser.uid).update({
      ...updates,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update local profile
    userProfile = { ...userProfile, ...updates };
    
    // Update auth profile if needed
    if (updates.avatar && currentUser.updateProfile) {
      await currentUser.updateProfile({ photoURL: updates.avatar });
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Apply Theme to Body
 * @param {string} themeName - Theme name (blossom, dark, light)
 */
function applyTheme(themeName) {
  const body = document.body;
  body.classList.remove('theme-blossom', 'theme-dark', 'theme-light');
  
  switch (themeName) {
    case 'dark':
      body.classList.add('theme-dark');
      break;
    case 'light':
      body.classList.add('theme-light');
      break;
    case 'blossom':
    default:
      body.classList.add('theme-blossom');
      break;
  }
  
  // Save theme preference
  if (currentUser) {
    updateUserProfile({ theme: themeName });
  }
}

/**
 * Generate Unique Room Code
 * @returns {string}
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TOG3R-${code}`;
}

// Export functions for use in other modules
window.TOG3RAuth = {
  initAuth,
  signUpWithEmail,
  loginWithEmail,
  signInWithGoogle,
  logout,
  updateUserProfile,
  applyTheme,
  generateRoomCode,
  getCurrentUser: () => currentUser,
  getUserProfile: () => userProfile,
  getDB: () => db,
  getAuth: () => auth
};

// Initialize auth when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
