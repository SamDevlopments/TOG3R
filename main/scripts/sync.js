/**
 * TOG3R - Real-Time Sync Engine
 * Firebase Firestore sync for video playback state and chat
 */

// Sync State
let roomSubscription = null;
let chatSubscription = null;
let currentPlayer = null;
let currentRoomCode = null;
let lastSyncTime = 0;
const SYNC_THROTTLE_MS = 500; // Throttle sync updates

/**
 * Initialize Sync System
 */
function initSync() {
  console.log('Sync system initialized');
}

/**
 * Connect to Room and Start Listening
 * @param {string} roomCode - Room code
 */
async function connectToRoom(roomCode) {
  const auth = window.TOG3RAuth;
  if (!auth) return;
  
  const db = auth.getDB();
  currentRoomCode = roomCode;
  
  try {
    const roomRef = db.collection('rooms').doc(roomCode);
    
    // Listen to room changes
    roomSubscription = roomRef.onSnapshot((doc) => {
      if (doc.exists) {
        const roomData = doc.data();
        handleRoomUpdate(roomData);
      }
    }, (error) => {
      console.error('Error listening to room:', error);
    });
    
    // Listen to chat messages
    const chatRef = roomRef.collection('chat').orderBy('timestamp', 'asc').limit(50);
    chatSubscription = chatRef.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const message = change.doc.data();
          displayChatMessage(message);
        }
      });
    });
    
    console.log('Connected to room:', roomCode);
  } catch (error) {
    console.error('Error connecting to room:', error);
  }
}

/**
 * Disconnect from Current Room
 */
function disconnectFromRoom() {
  if (roomSubscription) {
    roomSubscription();
    roomSubscription = null;
  }
  
  if (chatSubscription) {
    chatSubscription();
    chatSubscription = null;
  }
  
  currentRoomCode = null;
  console.log('Disconnected from room');
}

/**
 * Handle Room Data Update
 * @param {object} roomData - Updated room data
 */
function handleRoomUpdate(roomData) {
  const auth = window.TOG3RAuth;
  const user = auth?.getCurrentUser();
  if (!user) return;
  
  // Check if we're the admin
  const isAdmin = roomData.adminUID === user.uid;
  
  // If we're not admin, sync to remote state
  if (!isAdmin && currentPlayer) {
    syncToRemoteState(roomData);
  }
  
  // Update viewers list
  if (window.TOG3RRooms) {
    window.TOG3RRooms.updateViewersList(roomData.viewers);
  }
  
  // Update viewer count
  updateViewerCount(roomData.viewers?.length || 1);
}

/**
 * Sync Local Player to Remote State
 * @param {object} roomData - Room data from Firestore
 */
function syncToRemoteState(roomData) {
  if (!currentPlayer || typeof currentPlayer.getPlayerState !== 'function') return;
  
  const currentState = currentPlayer.getPlayerState();
  const remoteState = roomData.playbackState;
  const remoteTime = roomData.currentTime;
  
  // Seek to remote time if difference is significant (> 2 seconds)
  const currentTime = currentPlayer.getCurrentTime?.() || 0;
  if (Math.abs(currentTime - remoteTime) > 2) {
    currentPlayer.seekTo(remoteTime, true);
  }
  
  // Sync play/pause state
  if (remoteState === 'playing' && currentState !== 1) {
    currentPlayer.playVideo?.();
  } else if (remoteState === 'paused' && currentState !== 2) {
    currentPlayer.pauseVideo?.();
  }
}

/**
 * Set Current Player Instance
 * @param {object} player - YouTube player instance
 */
function setPlayer(player) {
  currentPlayer = player;
  console.log('Player set');
}

/**
 * Handle Player State Change (from platforms.js)
 * @param {object} event - Player state change event
 */
async function handlePlayerStateChange(event) {
  if (!currentRoomCode || !currentPlayer) return;
  
  const auth = window.TOG3RAuth;
  const user = auth?.getCurrentUser();
  const room = window.TOG3RRooms?.getCurrentRoom();
  
  if (!user || !room) return;
  
  // Only admin or collaborative rooms can sync
  const isAdmin = room.adminUID === user.uid;
  const isCollab = room.isCollaborative;
  
  if (!isAdmin && !isCollab) return;
  
  // Throttle updates
  const now = Date.now();
  if (now - lastSyncTime < SYNC_THROTTLE_MS) return;
  lastSyncTime = now;
  
  try {
    const db = auth.getDB();
    const roomRef = db.collection('rooms').doc(currentRoomCode);
    
    const state = event.data;
    let playbackState = 'paused';
    
    // YouTube player states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    if (state === 1) {
      playbackState = 'playing';
    } else if (state === 2 || state === 0) {
      playbackState = 'paused';
    }
    
    const currentTime = currentPlayer.getCurrentTime?.() || 0;
    
    await roomRef.update({
      playbackState,
      currentTime,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error syncing state:', error);
  }
}

/**
 * Send Chat Message
 * @param {string} text - Message text
 */
async function sendChatMessage(text) {
  if (!currentRoomCode || !text.trim()) return;
  
  const auth = window.TOG3RAuth;
  const user = auth?.getCurrentUser();
  
  if (!user) return;
  
  try {
    const db = auth.getDB();
    const roomRef = db.collection('rooms').doc(currentRoomCode);
    
    const message = {
      uid: user.uid,
      name: user.displayName || 'User',
      avatar: user.photoURL || null,
      text: text.trim(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      type: 'message'
    };
    
    await roomRef.collection('chat').add(message);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

/**
 * Send Reaction
 * @param {string} reaction - Reaction emoji
 */
async function sendReaction(reaction) {
  if (!currentRoomCode || !reaction) return;
  
  const auth = window.TOG3RAuth;
  const user = auth?.getCurrentUser();
  
  if (!user) return;
  
  try {
    const db = auth.getDB();
    const roomRef = db.collection('rooms').doc(currentRoomCode);
    
    const reactionData = {
      uid: user.uid,
      name: user.displayName || 'User',
      reaction,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      type: 'reaction'
    };
    
    await roomRef.collection('chat').add(reactionData);
    
    // Trigger particle burst animation
    triggerReactionBurst(reaction);
  } catch (error) {
    console.error('Error sending reaction:', error);
  }
}

/**
 * Display Chat Message in UI
 * @param {object} message - Message object
 */
function displayChatMessage(message) {
  const container = document.getElementById('chatMessagesContainer');
  if (!container) return;
  
  const isReaction = message.type === 'reaction';
  
  const html = `
    <div class="chat-message ${isReaction ? 'reaction-message' : ''}" data-uid="${message.uid}">
      <div class="chat-message-avatar">
        ${message.avatar 
          ? `<img src="${message.avatar}" alt="${message.name}" />`
          : message.name.charAt(0).toUpperCase()
        }
      </div>
      <div class="chat-message-body">
        <div class="chat-message-header">
          <span class="chat-message-author">${message.name}</span>
          ${message.uid === window.TOG3RRooms?.getCurrentRoom()?.adminUID
            ? '<span class="chat-message-admin-badge">HOST</span>'
            : ''
          }
          <span class="chat-message-time">${formatTimestamp(message.timestamp)}</span>
        </div>
        ${isReaction 
          ? `<span class="chat-message-reaction">${message.reaction}</span>`
          : `<p class="chat-message-text">${escapeHtml(message.text)}</p>`
        }
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
}

/**
 * Trigger Reaction Particle Burst Animation
 * @param {string} reaction - Reaction emoji
 */
function triggerReactionBurst(reaction) {
  const playerContainer = document.getElementById('playerContainer');
  if (!playerContainer) return;
  
  const particleContainer = document.createElement('div');
  particleContainer.className = 'particle-container';
  
  // Create multiple particles
  const particleCount = 8;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'reaction-particle';
    particle.textContent = reaction;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${70 + Math.random() * 20}%`;
    particle.style.animationDelay = `${Math.random() * 0.3}s`;
    particleContainer.appendChild(particle);
  }
  
  playerContainer.appendChild(particleContainer);
  
  // Remove after animation
  setTimeout(() => {
    particleContainer.remove();
  }, 2500);
}

/**
 * Update Viewer Count Display
 * @param {number} count - Number of viewers
 */
function updateViewerCount(count) {
  const viewerCountEl = document.getElementById('viewerCount');
  const playerViewersEl = document.getElementById('playerViewers');
  
  if (viewerCountEl) viewerCountEl.textContent = count;
  if (playerViewersEl) playerViewersEl.textContent = `${count} watching`;
}

/**
 * Format Timestamp
 * @param {object} timestamp - Firestore timestamp
 * @returns {string}
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate?.() || new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Setup Chat Input Event Listeners
 */
function setupChatListeners() {
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const reactionBar = document.getElementById('reactionBar');
  
  if (chatInput && chatSendBtn) {
    chatSendBtn.addEventListener('click', () => {
      const text = chatInput.value.trim();
      if (text) {
        sendChatMessage(text);
        chatInput.value = '';
      }
    });
    
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const text = chatInput.value.trim();
        if (text) {
          sendChatMessage(text);
          chatInput.value = '';
        }
      }
    });
  }
  
  if (reactionBar) {
    reactionBar.addEventListener('click', (e) => {
      const reactionBtn = e.target.closest('.reaction-item');
      if (reactionBtn) {
        const reaction = reactionBtn.dataset.reaction;
        sendReaction(reaction);
      }
    });
  }
}

// Export functions
window.TOG3RSync = {
  init: initSync,
  connectToRoom,
  disconnectFromRoom,
  setPlayer,
  handlePlayerStateChange,
  sendChatMessage,
  sendReaction,
  getCurrentRoomCode: () => currentRoomCode
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initSync();
    setupChatListeners();
  });
} else {
  initSync();
  setupChatListeners();
}
