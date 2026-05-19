/**
 * TOG3R - Dashboard UI Controller
 * Handles home view rendering, profile menu, theme switcher
 */

// DOM Elements
const profileAvatar = document.getElementById('profileAvatar');
const profileDropdown = document.getElementById('profileDropdown');
const themeSelectorBtn = document.getElementById('themeSelectorBtn');
const accountSettingsBtn = document.getElementById('accountSettingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const hostSessionFab = document.getElementById('hostSessionFab');
const searchInput = document.getElementById('searchInput');

// Platform Cards
const platformCards = document.querySelectorAll('.platform-card');

// Initialize Dashboard
function initDashboard() {
  setupProfileMenu();
  setupPlatformSelector();
  setupModals();
  loadMediaGrids();
  setupSearch();
}

/**
 * Setup Profile Dropdown Menu
 */
function setupProfileMenu() {
  if (!profileAvatar || !profileDropdown) return;
  
  // Toggle dropdown on avatar click
  profileAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle('show');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!profileDropdown.contains(e.target) && !profileAvatar.contains(e.target)) {
      profileDropdown.classList.remove('show');
    }
  });
  
  // Theme selector
  if (themeSelectorBtn) {
    themeSelectorBtn.addEventListener('click', () => {
      showThemeSelector();
      profileDropdown.classList.remove('show');
    });
  }
  
  // Account settings
  if (accountSettingsBtn) {
    accountSettingsBtn.addEventListener('click', () => {
      alert('Account Settings - Coming soon!');
      profileDropdown.classList.remove('show');
    });
  }
  
  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (window.TOG3RAuth) {
        await window.TOG3RAuth.logout();
      }
    });
  }
}

/**
 * Show Theme Selection Modal
 */
function showThemeSelector() {
  const themes = [
    { id: 'blossom', name: 'Blossom', icon: '🌸' },
    { id: 'dark', name: 'Deep Dark', icon: '🌙' },
    { id: 'light', name: 'Clean Light', icon: '☀️' }
  ];
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-content">
      <div style="padding: 24px 28px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--ink);">Choose Theme</h2>
          <button class="chat-close-btn" onclick="this.closest('.modal-overlay').remove()">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          ${themes.map(theme => `
            <button class="theme-option-btn" data-theme="${theme.id}" style="
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 12px;
              padding: 24px;
              background: var(--card-bg);
              border: 2px solid var(--card-border);
              border-radius: var(--radius-lg);
              cursor: pointer;
              transition: all 0.3s ease;
            " onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--pink-deep)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--card-border)'">
              <span style="font-size: 3rem;">${theme.icon}</span>
              <span style="font-size: 0.95rem; font-weight: 700; color: var(--ink);">${theme.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add theme selection handlers
  modal.querySelectorAll('.theme-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      if (window.TOG3RAuth) {
        window.TOG3RAuth.applyTheme(theme);
      }
      modal.remove();
    });
  });
}

/**
 * Setup Platform Selector
 */
function setupPlatformSelector() {
  platformCards.forEach(card => {
    card.addEventListener('click', () => {
      // Remove active from all
      platformCards.forEach(c => c.classList.remove('active'));
      // Add active to clicked
      card.classList.add('active');
      
      // Load content for selected platform
      const platform = card.dataset.platform;
      loadPlatformContent(platform);
    });
  });
}

/**
 * Load Content for Selected Platform
 * @param {string} platform - Platform name
 */
function loadPlatformContent(platform) {
  console.log('Loading content for:', platform);
  // This will be implemented in platforms.js
  if (window.TOG3RPlatforms) {
    window.TOG3RPlatforms.loadContent(platform);
  }
}

/**
 * Setup Modal Interactions
 */
function setupModals() {
  // Join Room Modal
  if (joinRoomBtn) {
    const joinRoomModal = document.getElementById('joinRoomModal');
    const closeJoinRoomModal = document.getElementById('closeJoinRoomModal');
    const joinRoomForm = document.getElementById('joinRoomForm');
    
    joinRoomBtn.addEventListener('click', () => {
      joinRoomModal?.classList.add('show');
    });
    
    closeJoinRoomModal?.addEventListener('click', () => {
      joinRoomModal?.classList.remove('show');
    });
    
    joinRoomModal?.addEventListener('click', (e) => {
      if (e.target === joinRoomModal) {
        joinRoomModal.classList.remove('show');
      }
    });
    
    if (joinRoomForm) {
      joinRoomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('joinRoomCode').value.trim().toUpperCase();
        if (code && window.TOG3RRooms) {
          await window.TOG3RRooms.joinRoom(code);
          joinRoomModal.classList.remove('show');
        }
      });
    }
  }
  
  // Create Room Modal (FAB)
  if (hostSessionFab) {
    const createRoomModal = document.getElementById('createRoomModal');
    const closeCreateRoomModal = document.getElementById('closeCreateRoomModal');
    const createRoomForm = document.getElementById('createRoomForm');
    
    hostSessionFab.addEventListener('click', () => {
      createRoomModal?.classList.add('show');
    });
    
    closeCreateRoomModal?.addEventListener('click', () => {
      createRoomModal?.classList.remove('show');
    });
    
    createRoomModal?.addEventListener('click', (e) => {
      if (e.target === createRoomModal) {
        createRoomModal.classList.remove('show');
      }
    });
    
    if (createRoomForm) {
      createRoomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const platform = document.getElementById('roomPlatform').value;
        const url = document.getElementById('roomUrl').value;
        const name = document.getElementById('roomName').value;
        const isPrivate = document.getElementById('roomPrivacy').checked;
        const isCollab = document.getElementById('roomCollab').checked;
        
        if (window.TOG3RRooms) {
          await window.TOG3RRooms.createRoom({
            platform,
            url,
            name,
            isPrivate,
            isCollab
          });
          createRoomModal.classList.remove('show');
        }
      });
    }
  }
}

/**
 * Load Media Grids with Sample Content
 */
function loadMediaGrids() {
  // Trending Rooms Grid
  const trendingGrid = document.getElementById('trendingRoomsGrid');
  if (trendingGrid) {
    trendingGrid.innerHTML = generateSampleMediaCards(6, 'live');
  }
  
  // YouTube Grid
  const youtubeGrid = document.getElementById('youtubeGrid');
  if (youtubeGrid) {
    youtubeGrid.innerHTML = generateSampleMediaCards(8, 'youtube');
  }
  
  // Saved Channels Grid
  const savedGrid = document.getElementById('savedChannelsGrid');
  if (savedGrid) {
    savedGrid.innerHTML = generateSampleMediaCards(4, 'saved');
  }
}

/**
 * Generate Sample Media Cards
 * @param {number} count - Number of cards
 * @param {string} type - Card type
 * @returns {string} HTML string
 */
function generateSampleMediaCards(count, type) {
  const thumbnails = [
    'https://picsum.photos/seed/1/400/225',
    'https://picsum.photos/seed/2/400/225',
    'https://picsum.photos/seed/3/400/225',
    'https://picsum.photos/seed/4/400/225',
    'https://picsum.photos/seed/5/400/225',
    'https://picsum.photos/seed/6/400/225',
    'https://picsum.photos/seed/7/400/225',
    'https://picsum.photos/seed/8/400/225'
  ];
  
  const titles = [
    'Amazing Co-Watch Experience',
    'Live Gaming Session',
    'Movie Night Together',
    'Music Video Party',
    'Educational Stream',
    'Comedy Special Watch',
    'Sports Event Live',
    'Tech Conference Stream'
  ];
  
  let html = '';
  for (let i = 0; i < count; i++) {
    const isLive = type === 'live' && i < 3;
    html += `
      <div class="media-card" data-index="${i}" onclick="handleMediaCardClick(${i}, '${type}')">
        <img src="${thumbnails[i % thumbnails.length]}" alt="Thumbnail" class="media-card-thumbnail" loading="lazy" />
        <div class="media-card-overlay">
          <button class="media-card-play-btn">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
        </div>
        <div class="media-card-info">
          <h3 class="media-card-title">${titles[i]}</h3>
          <div class="media-card-meta">
            ${isLive ? '<span class="media-card-live">LIVE</span>' : ''}
            <span>${Math.floor(Math.random() * 100) + 1} watching</span>
          </div>
        </div>
      </div>
    `;
  }
  return html;
}

/**
 * Handle Media Card Click
 * @param {number} index - Card index
 * @param {string} type - Card type
 */
function handleMediaCardClick(index, type) {
  console.log('Clicked media card:', index, type);
  // Open create room modal with pre-filled data
  const createRoomModal = document.getElementById('createRoomModal');
  if (createRoomModal) {
    createRoomModal.classList.add('show');
  }
}

/**
 * Setup Search Functionality
 */
function setupSearch() {
  if (!searchInput) return;
  
  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = e.target.value.trim();
      if (query.length > 2) {
        performSearch(query);
      }
    }, 300);
  });
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        performSearch(query);
      }
    }
  });
}

/**
 * Perform Search
 * @param {string} query - Search query
 */
function performSearch(query) {
  console.log('Searching for:', query);
  // Check if it's a URL
  if (query.startsWith('http')) {
    // Extract video ID if YouTube URL
    const youtubeId = extractYouTubeId(query);
    if (youtubeId && window.TOG3RRooms) {
      // Open create room modal with pre-filled URL
      const createRoomModal = document.getElementById('createRoomModal');
      const roomUrlInput = document.getElementById('roomUrl');
      if (createRoomModal && roomUrlInput) {
        roomUrlInput.value = query;
        createRoomModal.classList.add('show');
      }
    }
  } else {
    // Regular search - would integrate with YouTube API or other platform APIs
    console.log('Search query:', query);
  }
}

/**
 * Extract YouTube Video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null}
 */
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^&\s]+)/,
    /youtube\.com\/v\/([^&\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
