/**
 * TOG3R - Room Management System
 * Handles room creation, joining, and UI transitions
 */

// Current Room State
let currentRoom = null;
let isRoomAdmin = false;

/**
 * Initialize Rooms System
 */
function initRooms() {
  console.log('Rooms system initialized');
}

/**
 * Create New Room
 * @param {object} options - Room options
 */
async function createRoom(options) {
  const auth = window.TOG3RAuth;
  if (!auth) {
    alert('Please sign in to create a room');
    return;
  }
  
  const user = auth.getCurrentUser();
  if (!user) {
    alert('Please sign in to create a room');
    return;
  }
  
  try {
    const db = auth.getDB();
    const roomCode = auth.generateRoomCode();
    
    // Parse video URL
    const videoInfo = parseVideoURL(options.url);
    
    // Create room document
    const roomData = {
      code: roomCode,
      name: options.name || 'My Watch Party',
      platform: options.platform || 'youtube',
      videoId: videoInfo.id,
      videoUrl: options.url,
      videoTitle: '',
      adminUID: user.uid,
      adminName: user.displayName || 'User',
      playbackState: 'paused',
      currentTime: 0,
      isPrivate: options.isPrivate || false,
      isCollaborative: options.isCollab || false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      viewers: [
        {
          uid: user.uid,
          name: user.displayName || 'User',
          avatar: user.photoURL || null,
          joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        }
      ],
      settings: {
        chatEnabled: true,
        reactionsEnabled: true
      }
    };
    
    await db.collection('rooms').doc(roomCode).set(roomData);
    
    // Join the room locally
    await joinRoom(roomCode, true);
    
    console.log('Room created:', roomCode);
  } catch (error) {
    console.error('Error creating room:', error);
    alert('Failed to create room. Please try again.');
  }
}

/**
 * Join Existing Room
 * @param {string} roomCode - Room code
 * @param {boolean} isCreator - Whether user is creating the room
 */
async function joinRoom(roomCode, isCreator = false) {
  const auth = window.TOG3RAuth;
  if (!auth) {
    alert('Please sign in to join a room');
    return;
  }
  
  const user = auth.getCurrentUser();
  if (!user) {
    alert('Please sign in to join a room');
    return;
  }
  
  try {
    const db = auth.getDB();
    const roomRef = db.collection('rooms').doc(roomCode);
    const roomDoc = await roomRef.get();
    
    if (!roomDoc.exists) {
      alert('Room not found. Please check the code.');
      return;
    }
    
    currentRoom = roomDoc.data();
    isRoomAdmin = currentRoom.adminUID === user.uid;
    
    // Add viewer to room if not already added
    if (!isCreator) {
      const viewers = currentRoom.viewers || [];
      const alreadyJoined = viewers.some(v => v.uid === user.uid);
      
      if (!alreadyJoined) {
        await roomRef.update({
          viewers: firebase.firestore.FieldValue.arrayUnion({
            uid: user.uid,
            name: user.displayName || 'User',
            avatar: user.photoURL || null,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
          })
        });
      }
    }
    
    // Transition to theater layout
    showTheaterLayout(currentRoom);
    
    // Initialize sync
    if (window.TOG3RSync) {
      await window.TOG3RSync.connectToRoom(roomCode);
    }
    
    console.log('Joined room:', roomCode);
  } catch (error) {
    console.error('Error joining room:', error);
    alert('Failed to join room. Please try again.');
  }
}

/**
 * Leave Current Room
 */
async function leaveRoom() {
  const auth = window.TOG3RAuth;
  if (!auth || !currentRoom) return;
  
  const user = auth.getCurrentUser();
  if (!user) return;
  
  try {
    const db = auth.getDB();
    const roomRef = db.collection('rooms').doc(currentRoom.code);
    
    // Remove viewer from room
    await roomRef.update({
      viewers: firebase.firestore.FieldValue.arrayRemove({
        uid: user.uid,
        name: user.displayName || 'User',
        avatar: user.photoURL || null
      })
    });
    
    // If admin is leaving, transfer admin or delete room
    if (isRoomAdmin) {
      // Could implement admin transfer logic here
      // For now, just delete the room
      await roomRef.delete();
    }
    
    // Disconnect from sync
    if (window.TOG3RSync) {
      window.TOG3RSync.disconnectFromRoom();
    }
    
    // Hide theater layout
    hideTheaterLayout();
    
    currentRoom = null;
    isRoomAdmin = false;
    
    console.log('Left room');
  } catch (error) {
    console.error('Error leaving room:', error);
  }
}

/**
 * Show Theater Layout
 * @param {object} room - Room data
 */
function showTheaterLayout(room) {
  const theater = document.getElementById('roomTheater');
  const dashboard = document.getElementById('dashboardContent');
  
  if (theater) {
    theater.classList.add('active');
  }
  
  // Update room info
  updateRoomInfo(room);
  
  // Load video
  if (room.videoId && window.TOG3RPlatforms) {
    window.TOG3RPlatforms.playVideo(room.videoId, room.videoTitle || 'Video');
  } else if (room.videoUrl) {
    // Handle custom URLs
    loadCustomVideo(room.videoUrl);
  }
}

/**
 * Hide Theater Layout
 */
function hideTheaterLayout() {
  const theater = document.getElementById('roomTheater');
  if (theater) {
    theater.classList.remove('active');
  }
}

/**
 * Update Room Info Display
 * @param {object} room - Room data
 */
function updateRoomInfo(room) {
  const roomCodeValue = document.getElementById('roomCodeValue');
  const pipRoomCode = document.getElementById('pipRoomCode');
  const viewerCount = document.getElementById('viewerCount');
  const playerViewers = document.getElementById('playerViewers');
  
  if (roomCodeValue) roomCodeValue.textContent = room.code;
  if (pipRoomCode) pipRoomCode.textContent = room.code;
  
  const count = room.viewers?.length || 1;
  if (viewerCount) viewerCount.textContent = count;
  if (playerViewers) playerViewers.textContent = `${count} watching`;
  
  // Update viewers list
  updateViewersList(room.viewers);
}

/**
 * Update Viewers List in Sidebar
 * @param {array} viewers - Array of viewer objects
 */
function updateViewersList(viewers) {
  const viewersList = document.getElementById('viewersList');
  if (!viewersList || !viewers) return;
  
  const html = `
    <div class="viewers-list-title">In This Room (${viewers.length})</div>
    ${viewers.map(viewer => `
      <div class="viewer-item" data-uid="${viewer.uid}">
        <div class="viewer-avatar">
          ${viewer.avatar 
            ? `<img src="${viewer.avatar}" alt="${viewer.name}" />`
            : viewer.name.charAt(0).toUpperCase()
          }
        </div>
        <span class="viewer-name">${viewer.name}</span>
        ${viewer.uid === currentRoom?.adminUID 
          ? '<span class="viewer-role">HOST</span>' 
          : ''
        }
        ${isRoomAdmin && viewer.uid !== currentRoom?.adminUID
          ? `<button class="transfer-admin-btn" onclick="TOG3RRooms.transferAdmin('${viewer.uid}')">Make Host</button>`
          : ''
        }
      </div>
    `).join('')}
  `;
  
  viewersList.innerHTML = html;
}

/**
 * Transfer Admin Rights
 * @param {string} newAdminUID - New admin's user ID
 */
async function transferAdmin(newAdminUID) {
  const auth = window.TOG3RAuth;
  if (!auth || !currentRoom) return;
  
  try {
    const db = auth.getDB();
    await db.collection('rooms').doc(currentRoom.code).update({
      adminUID: newAdminUID
    });
    
    isRoomAdmin = false;
    currentRoom.adminUID = newAdminUID;
    
    // Update UI
    updateViewersList(currentRoom.viewers);
    
    console.log('Admin transferred to:', newAdminUID);
  } catch (error) {
    console.error('Error transferring admin:', error);
  }
}

/**
 * Copy Room Code to Clipboard
 */
function copyRoomCode() {
  if (!currentRoom) return;
  
  const code = currentRoom.code;
  navigator.clipboard.writeText(code).then(() => {
    const copyBtn = document.getElementById('copyRoomCodeBtn');
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    }
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

/**
 * Share Room Link
 */
function shareRoom() {
  if (!currentRoom) return;
  
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoom.code}`;
  
  if (navigator.share) {
    navigator.share({
      title: `Join my TOG3R room: ${currentRoom.name}`,
      text: `Watch together with me! Use room code: ${currentRoom.code}`,
      url: shareUrl
    });
  } else {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
  }
}

/**
 * Load Custom Video URL
 * @param {string} url - Video URL
 */
function loadCustomVideo(url) {
  const playerWrapper = document.getElementById('playerWrapper');
  if (!playerWrapper) return;
  
  // Try to detect platform and embed appropriately
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoInfo = parseVideoURL(url);
    if (videoInfo.id && window.TOG3RPlatforms) {
      window.TOG3RPlatforms.playVideo(videoInfo.id, 'Custom Video');
    }
  } else {
    // Generic iframe embed
    playerWrapper.innerHTML = `<iframe src="${url}" frameborder="0" allowfullscreen></iframe>`;
  }
}

/**
 * Parse Video URL
 * @param {string} url - Video URL
 * @returns {object}
 */
function parseVideoURL(url) {
  if (window.TOG3RPlatforms) {
    return window.TOG3RPlatforms.parseVideoURL(url);
  }
  
  // Fallback parsing
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (youtubeMatch) {
    return { platform: 'youtube', id: youtubeMatch[1], url };
  }
  
  return { platform: 'custom', id: null, url };
}

// Setup event listeners
function setupRoomEventListeners() {
  // Copy room code button
  const copyBtn = document.getElementById('copyRoomCodeBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyRoomCode);
  }
  
  // Share room button
  const shareBtn = document.getElementById('shareRoomBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', shareRoom);
  }
  
  // Leave room button
  const leaveBtn = document.getElementById('leaveRoomBtn');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', leaveRoom);
  }
  
  // Close chat button
  const closeChatBtn = document.getElementById('closeChatBtn');
  if (closeChatBtn) {
    closeChatBtn.addEventListener('click', () => {
      // Could minimize chat or show/hide
      console.log('Close chat clicked');
    });
  }
}

// Export functions
window.TOG3RRooms = {
  init: initRooms,
  createRoom,
  joinRoom,
  leaveRoom,
  transferAdmin,
  copyRoomCode,
  shareRoom,
  getCurrentRoom: () => currentRoom,
  isUserAdmin: () => isRoomAdmin
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initRooms();
    setupRoomEventListeners();
  });
} else {
  initRooms();
  setupRoomEventListeners();
}
