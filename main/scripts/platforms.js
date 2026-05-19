/**
 * TOG3R - Platform Integrations
 * Handles YouTube API, platform scrapers, and embed logic
 */

// Current Platform State
let currentPlatform = 'youtube';
let youtubePlayer = null;
let youtubeAPIReady = false;

/**
 * Initialize Platform System
 */
function initPlatforms() {
  loadYouTubeAPI();
}

/**
 * Load YouTube Iframe Player API
 */
function loadYouTubeAPI() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  
  window.onYouTubeIframeAPIReady = () => {
    youtubeAPIReady = true;
    console.log('YouTube API Ready');
  };
}

/**
 * Load Content for Platform
 * @param {string} platform - Platform name
 */
function loadContent(platform) {
  currentPlatform = platform;
  
  switch (platform) {
    case 'youtube':
      loadYouTubeContent();
      break;
    case 'netflix':
      loadNetflixContent();
      break;
    case 'instagram':
      loadInstagramContent();
      break;
    case 'tiktok':
      loadTikTokContent();
      break;
    case 'custom':
      loadCustomContent();
      break;
    default:
      loadYouTubeContent();
  }
}

/**
 * Load YouTube Content
 */
function loadYouTubeContent() {
  // Fetch trending videos from YouTube Data API (mock for now)
  const mockVideos = [
    { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', channel: 'Rick Astley' },
    { id: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE', channel: 'officialpsy' },
    { id: 'kJQP7kiw5Fk', title: 'Despacito', channel: 'Luis Fonsi' },
    { id: 'JGwWNGJdvx8', title: 'Shape of You', channel: 'Ed Sheeran' },
    { id: 'RgKAFK5djSk', title: 'See You Again', channel: 'Wiz Khalifa' },
    { id: 'CevxZvSJLk8', title: 'Roar', channel: 'Katy Perry' },
    { id: 'OPf0YbXqDm0', title: 'Uptown Funk', channel: 'Mark Ronson' },
    { id: 'hLQl3WQQoQ0', title: 'Adele - Someone Like You', channel: 'Adele' }
  ];
  
  const youtubeGrid = document.getElementById('youtubeGrid');
  if (youtubeGrid) {
    youtubeGrid.innerHTML = mockVideos.map((video, index) => `
      <div class="media-card" onclick="TOG3RPlatforms.playVideo('${video.id}', '${video.title}')">
        <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" alt="${video.title}" class="media-card-thumbnail" loading="lazy" />
        <div class="media-card-overlay">
          <button class="media-card-play-btn">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
        </div>
        <div class="media-card-info">
          <h3 class="media-card-title">${video.title}</h3>
          <div class="media-card-meta">
            <span>${video.channel}</span>
          </div>
        </div>
      </div>
    `).join('');
  }
}

/**
 * Load Netflix Content (Mock)
 */
function loadNetflixContent() {
  console.log('Loading Netflix content...');
  // Netflix doesn't have a public API, so we'd use mock data or web scraping
  const mockNetflix = [
    { id: 'nf1', title: 'Stranger Things', type: 'series' },
    { id: 'nf2', title: 'The Crown', type: 'series' },
    { id: 'nf3', title: 'Wednesday', type: 'series' },
    { id: 'nf4', title: 'Squid Game', type: 'series' },
    { id: 'nf5', title: 'Bridgerton', type: 'series' },
    { id: 'nf6', title: 'The Witcher', type: 'series' }
  ];
  
  // Would display these in the grid with appropriate thumbnails
}

/**
 * Load Instagram Reels Content (Mock)
 */
function loadInstagramContent() {
  console.log('Loading Instagram Reels...');
  // Instagram Graph API would be used here
}

/**
 * Load TikTok Content (Mock)
 */
function loadTikTokContent() {
  console.log('Loading TikTok videos...');
  // TikTok Embed API would be used here
}

/**
 * Load Custom URL Content
 */
function loadCustomContent() {
  console.log('Loading custom content...');
}

/**
 * Play Video in Player
 * @param {string} videoId - Video ID
 * @param {string} title - Video title
 */
function playVideo(videoId, title) {
  const playerWrapper = document.getElementById('playerWrapper');
  if (!playerWrapper) return;
  
  if (currentPlatform === 'youtube' && youtubeAPIReady) {
    // Destroy existing player
    if (youtubePlayer) {
      youtubePlayer.destroy();
    }
    
    // Create new YouTube player
    youtubePlayer = new YT.Player(playerWrapper, {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        'autoplay': 0,
        'controls': 0,
        'rel': 0,
        'modestbranding': 1
      },
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    });
    
    // Update player info
    updatePlayerInfo(title, 'YouTube');
  } else {
    // Fallback embed
    playerWrapper.innerHTML = `
      <iframe 
        src="https://www.youtube.com/embed/${videoId}?enablejsapi=1" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    `;
    updatePlayerInfo(title, 'YouTube');
  }
}

/**
 * YouTube Player Ready Callback
 * @param {object} event - Player event
 */
function onPlayerReady(event) {
  console.log('Player ready');
  // Sync with room if in active room
  if (window.TOG3RSync) {
    window.TOG3RSync.setPlayer(youtubePlayer);
  }
}

/**
 * YouTube Player State Change Callback
 * @param {object} event - Player event
 */
function onPlayerStateChange(event) {
  console.log('Player state changed:', event.data);
  // Sync state changes with room
  if (window.TOG3RSync) {
    window.TOG3RSync.handlePlayerStateChange(event);
  }
}

/**
 * Update Player Info Bar
 * @param {string} title - Video title
 * @param {string} platform - Platform name
 */
function updatePlayerInfo(title, platform) {
  const playerTitle = document.getElementById('playerTitle');
  const playerPlatform = document.getElementById('playerPlatform');
  
  if (playerTitle) playerTitle.textContent = title;
  if (playerPlatform) playerPlatform.textContent = platform;
}

/**
 * Get Current Player
 * @returns {object|null}
 */
function getCurrentPlayer() {
  return youtubePlayer || null;
}

/**
 * Parse Video URL
 * @param {string} url - Video URL
 * @returns {object}
 */
function parseVideoURL(url) {
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (youtubeMatch) {
    return { platform: 'youtube', id: youtubeMatch[1], url };
  }
  
  // Default
  return { platform: 'custom', id: null, url };
}

// Export functions
window.TOG3RPlatforms = {
  init: initPlatforms,
  loadContent,
  playVideo,
  getCurrentPlayer,
  parseVideoURL,
  isYouTubeAPIReady: () => youtubeAPIReady
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlatforms);
} else {
  initPlatforms();
}
