document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL YOUTUBE API & PAGINATION STATE ---
    const API_KEY = 'AIzaSyBs5OdDETuf-8YtTO8Fwiwjqnr9HvfTjrA';
    let countryCode = 'US';
    let nextPageToken = '';
    let isLoading = false;
    let currentCategory = 'home';
    let isWatching = false;
    let currentVideoId = '';
    let currentVideoFeed = [];

    // --- INITIALIZATION ---
    initApp();

    async function initApp() {
        try {
            countryCode = await fetchUserLocation();
        } catch (err) {
            console.error('[App Init] Geolocation failed, using US fallback:', err);
            countryCode = 'US';
        }

        try {
            await loadYouTubeVideos(false);
        } catch (err) {
            console.error('[App Init] YouTube fetch failed, rendering fallback feed:', err);
            const fallback = getFallbackYouTubeVideos(countryCode);
            currentVideoFeed = fallback;
            renderVideoCards(fallback, false);
        }

        initInfiniteScroll();

        try {
            initNavigation();
            initWatchViewEvents();
            initWatchResizer();
            initSidebarEvents();
            initNotificationEvents();
            initHeroSlider();
            initSearch();
            initMascot();
        } catch (err) {
            console.error('[App Init] UI Initialization error:', err);
        }
    }

    // --- GEOLOCATION API ---
    async function fetchUserLocation() {
        try {
            // Primary API: ipwho.is
            const response = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(3500) });
            if (!response.ok) throw new Error(`IP API HTTP error ${response.status}`);
            const data = await response.json();
            if (data && data.success && data.country_code) {
                console.log('[Geolocation] Detected region:', data.country_code, `(${data.country})`);
                return data.country_code;
            }
        } catch (e) {
            console.warn('[Geolocation] Primary API failed, trying fallback:', e.message);
            try {
                // Fallback API: geojs
                const fallbackResponse = await fetch('https://get.geojs.io/v1/ip/country.json', { signal: AbortSignal.timeout(3500) });
                if (!fallbackResponse.ok) throw new Error(`Fallback API HTTP error ${fallbackResponse.status}`);
                const fallbackData = await fallbackResponse.json();
                if (fallbackData && fallbackData.country) {
                    console.log('[Geolocation] Detected region via fallback:', fallbackData.country, `(${fallbackData.name})`);
                    return fallbackData.country;
                }
            } catch (fallbackError) {
                console.error('[Geolocation Error] Both APIs failed. Defaulting to US:', fallbackError.message);
            }
        }
        return 'US';
    }

    // --- YOUTUBE DATA API V3 & SAFE FETCHING ---
    async function loadYouTubeVideos(isAppend = false) {
        if (isLoading) return;
        isLoading = true;

        showLoader(true);

        let videoList = [];
        try {
            const tokenQuery = nextPageToken ? `&pageToken=${nextPageToken}` : '';
            const categoryQuery = getCategoryIdParam(currentCategory);
            const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${countryCode}&maxResults=16${categoryQuery}${tokenQuery}&key=${API_KEY}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                nextPageToken = data.nextPageToken || '';

                if (data.items && data.items.length > 0) {
                    videoList = data.items.map(item => ({
                        id: item.id,
                        title: item.snippet.title,
                        channel: item.snippet.channelTitle,
                        views: formatViewCount(item.statistics?.viewCount || '0'),
                        img: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                        tag: getCategoryTag(currentCategory),
                        description: item.snippet.description || 'Enjoy watching this high-definition stream on TOG3R.'
                    }));
                }
            } else {
                console.error('[YouTube API Error] HTTP status:', res.status);
            }
        } catch (err) {
            console.error('[YouTube API Error] Fetch failed:', err);
        }

        if (videoList.length === 0 && !isAppend) {
            console.warn('[YouTube Feed] Using fallback video library.');
            videoList = getFallbackYouTubeVideos(countryCode);
        }

        if (isAppend) {
            currentVideoFeed = [...currentVideoFeed, ...videoList];
        } else {
            currentVideoFeed = videoList;
        }

        renderVideoCards(videoList, isAppend);
        showLoader(false);
        isLoading = false;
    }

    function getCategoryIdParam(category) {
        switch (category) {
            case 'live': return '&videoCategoryId=20'; // Gaming / LiveStreams
            case 'cinema': return '&videoCategoryId=24'; // Entertainment / Movies
            case 'trending': return '&videoCategoryId=10'; // Music / Trending
            default: return '';
        }
    }

    function getCategoryTag(category) {
        switch (category) {
            case 'live': return 'LIVE';
            case 'cinema': return '4K';
            case 'trending': return 'POPULAR';
            default: return 'HD';
        }
    }

    function formatViewCount(views) {
        const num = parseInt(views, 10);
        if (isNaN(num)) return views;
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M views';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K views';
        return num.toLocaleString() + ' views';
    }

    // --- INFINITE SCROLL LISTENER (home feed only; comments are now static) ---
    function initInfiniteScroll() {
        const contentWrapper = document.querySelector('.content-wrapper');
        if (!contentWrapper) return;

        contentWrapper.addEventListener('scroll', () => {
            if (isWatching) return; // no-op in watch view — comments are fixed-height

            const { scrollTop, clientHeight, scrollHeight } = contentWrapper;
            if (scrollTop + clientHeight >= scrollHeight - 300) {
                if (!isLoading && nextPageToken) {
                    console.log('[Infinite Scroll] Loading next page...');
                    loadYouTubeVideos(true);
                }
            }
        });
    }

    function showLoader(show) {
        const loader = document.getElementById('infiniteScrollLoader');
        if (!loader) return;
        if (show) {
            loader.hidden = false;
            loader.removeAttribute('hidden');
        } else {
            loader.hidden = true;
            loader.setAttribute('hidden', '');
        }
    }

    function renderVideoCards(videoList, isAppend = false) {
        let gridContainer;
        if (currentCategory === 'home') {
            gridContainer = document.querySelector('.content-row .card-grid');
        } else {
            gridContainer = document.querySelector(`#${currentCategory}-section .card-grid`);
        }

        if (!gridContainer) {
            console.error('[Render Error] Could not find grid container for category:', currentCategory);
            return;
        }

        if (!isAppend) {
            gridContainer.innerHTML = '';
        }

        if (!videoList || videoList.length === 0) {
            videoList = getFallbackYouTubeVideos(countryCode);
        }

        videoList.forEach(video => {
            const card = createMovieCard(video);
            gridContainer.appendChild(card);
        });
    }

    function createMovieCard(data) {
        const div = document.createElement('div');
        div.className = 'movie-card';
        div.innerHTML = `
            <div class="card-img">
                <span class="card-tag" style="${data.tag === 'LIVE' ? 'background: var(--accent-color);' : ''}">${data.tag || 'HD'}</span>
                <img src="${data.img}" alt="${escapeHtml(data.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=400&q=80'">
                <div class="card-overlay">
                    <button class="play-mini"><i class="fas fa-play"></i></button>
                </div>
            </div>
            <div class="card-info">
                <h3>${escapeHtml(data.title)}</h3>
                <div class="meta">
                    <span class="rating"><i class="fas fa-eye"></i> ${data.views || 'Popular'}</span>
                    <span>• ${escapeHtml(data.channel || 'YouTube')}</span>
                </div>
            </div>
        `;

        div.addEventListener('click', () => {
            openWatchView(data.id, data.title, data.channel, data.views, data.img, data.description);
        });

        return div;
    }

    // --- 2-COLUMN WATCH VIEW ROUTING & EMBED FIX (Hard-Fix Error 153 Resolution) ---
    let playerResizeObserver = null;

    function syncChatHeight() {
        const videoContainer = document.getElementById('videoPlayerContainer');
        const chatPanel = document.querySelector('.live-chat-panel') || document.getElementById('watchChatContainer');
        if (videoContainer && chatPanel) {
            const playerHeight = videoContainer.clientHeight;
            if (playerHeight > 0) {
                chatPanel.style.height = `${playerHeight}px`;
            }
        }
    }

    function initChatHeightSync() {
        const videoContainer = document.getElementById('videoPlayerContainer');
        if (!videoContainer) return;

        syncChatHeight();

        if (window.ResizeObserver) {
            if (playerResizeObserver) playerResizeObserver.disconnect();
            playerResizeObserver = new ResizeObserver(() => {
                syncChatHeight();
            });
            playerResizeObserver.observe(videoContainer);
        }

        window.removeEventListener('resize', syncChatHeight);
        window.addEventListener('resize', syncChatHeight);
    }

    function openWatchView(videoId, title, channel, views, img, description) {
        isWatching = true;
        currentVideoId = videoId || 'L_LUpnjgPso';

        // 1. Hide Hero Section and Grid Sections
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) heroSection.style.display = 'none';

        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(sec => sec.classList.remove('active'));

        // 2. Hide Companion Mascot Element in Watch View
        document.body.classList.add('watch-active');
        const mascot = document.getElementById('mascot');
        if (mascot) mascot.style.display = 'none';

        // 3. Show #watch-view
        const watchView = document.getElementById('watch-view');
        if (watchView) watchView.classList.add('active');

        // 4. Update Video Metadata DIRECTLY UNDER Video Frame
        const titleEl = document.getElementById('watchVideoTitle');
        const channelEl = document.getElementById('watchChannelName');
        const viewsEl = document.getElementById('watchViewsCount');
        const avatarEl = document.getElementById('channelAvatar');
        const descTextEl = document.getElementById('watchDescriptionText');

        if (titleEl) titleEl.textContent = title || 'TOG3R Stream';
        if (channelEl) channelEl.textContent = channel || 'YouTube Creator';
        if (viewsEl) viewsEl.textContent = `${views || '1.2M views'}`;
        if (avatarEl) avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel || 'C')}&background=7928ca&color=fff`;
        if (descTextEl) descTextEl.textContent = description || 'Experience seamless high-definition streaming on TOG3R.';

        // 5. Update iframe src using youtube-nocookie.com with explicit origin parameter (Hard-Fix Error 153)
        const iframe = document.getElementById('youtube-player') || document.getElementById('youtubeIframe');
        if (iframe) {
            const originUrl = encodeURIComponent(window.location.origin || (window.location.protocol + '//' + window.location.host));
            iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(currentVideoId)}?autoplay=1&enablejsapi=1&origin=${originUrl}`;
        }

        // 6. Reset Chat Container
        const chatLog = document.getElementById('chatLog');
        if (chatLog) chatLog.innerHTML = '';

        // 7. Dynamic Topic Tags, Shorts Shelf & Suggested Videos
        const currentVideoObj = {
            id: currentVideoId,
            title: title || 'TOG3R Stream',
            channel: channel || 'YouTube Creator',
            views: views || '1.2M views',
            img: img || '',
            description: description || ''
        };
        renderTopicTags(currentVideoObj);
        renderShortsShelf(title || '');
        renderBlurredComments();

        // 8. Height Sync (Video Player & Live Chat)
        initChatHeightSync();
        requestAnimationFrame(() => {
            syncChatHeight();
        });

        // 9. Scroll to top of content wrapper
        const contentWrapper = document.querySelector('.content-wrapper');
        if (contentWrapper) contentWrapper.scrollTop = 0;
    }

    // --- YOUTUBE SHORTS SHELF (Live API) ---

    /** Static stub set used when the API quota is exhausted or network fails */
    const SHORTS_FALLBACK = [
        {
            id: 'dQw4w9WgXcQ',
            title: 'Mind-Blowing VFX Secrets Revealed! 🚀',
            channel: 'VFX World',
            views: '4.8M views',
            img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=360&h=640&q=80'
        },
        {
            id: 'qEVUtrk8_B4',
            title: 'Night City Uncut Gameplay Tech Demo 🌆',
            channel: 'GameZone',
            views: '12.5M views',
            img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=360&h=640&q=80'
        },
        {
            id: '1G4isv_Fylg',
            title: 'Epic Cinematic Sci-Fi Teaser 🎬',
            channel: 'CinemaHub',
            views: '8.1M views',
            img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=360&h=640&q=80'
        },
        {
            id: 'jfKfPfyJRdk',
            title: 'Late Night Chill Vibes & Lofi Beats 🎧',
            channel: 'LoFi Beats',
            views: '2.9M views',
            img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=360&h=640&q=80'
        }
    ];

    /**
     * Parses ISO 8601 duration strings (e.g. "PT45S", "PT1M30S") into total seconds.
     * Used to secondary-filter Shorts longer than 60 seconds.
     */
    function parseISODuration(iso) {
        const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return Infinity;
        const h = parseInt(match[1] || '0', 10);
        const m = parseInt(match[2] || '0', 10);
        const s = parseInt(match[3] || '0', 10);
        return h * 3600 + m * 60 + s;
    }

    /** Renders a single Short card into the shorts row */
    function createShortCard(short) {
        const card = document.createElement('div');
        card.className = 'shorts-card';

        const thumbSrc = short.img || 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=360&h=640&q=80';

        card.innerHTML = `
            <img class="shorts-thumb" src="${thumbSrc}" alt="${escapeHtml(short.title)}"
                 loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=360&h=640&q=80'">
            <div class="shorts-overlay">
                <span class="shorts-channel">${escapeHtml(short.channel || '')}</span>
                <span class="shorts-title">${escapeHtml(short.title)}</span>
                <span class="shorts-views"><i class="fas fa-eye" style="font-size: 9px; margin-right: 3px;"></i> ${short.views}</span>
            </div>
        `;

        card.addEventListener('click', () => {
            window.open(`https://www.youtube.com/shorts/${short.id}`, '_blank');
        });

        return card;
    }

    /** Shows skeleton placeholder cards while the API fetch is in-flight */
    function renderShortSkeletons(shortsRow, count = 4) {
        shortsRow.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const sk = document.createElement('div');
            sk.className = 'shorts-card shorts-skeleton';
            sk.innerHTML = `<div class="shorts-skeleton-inner"></div>`;
            shortsRow.appendChild(sk);
        }
    }

    /** Populates the shorts row with a given list of short objects */
    function populateShortsRow(shortsRow, shorts) {
        shortsRow.innerHTML = '';
        if (!shorts || shorts.length === 0) {
            const empty = document.createElement('span');
            empty.className = 'shorts-empty-msg';
            empty.textContent = 'No Shorts available right now.';
            shortsRow.appendChild(empty);
            return;
        }
        shorts.forEach(short => {
            shortsRow.appendChild(createShortCard(short));
        });
    }

    /**
     * Main entry point called by openWatchView.
     * 1. Shows skeletons immediately.
     * 2. Queries /search for #shorts related to the current video topic.
     * 3. Secondary-validates duration via /videos?part=contentDetails,statistics.
     * 4. Filters to ≤60 s and renders real cards; falls back to stubs on any error.
     */
    async function renderShortsShelf(topicHint = '') {
        const shortsRow = document.getElementById('shortsRow');
        if (!shortsRow) return;

        // Step 1 — immediate skeleton placeholders
        renderShortSkeletons(shortsRow, 4);

        if (!API_KEY) {
            console.warn('[Shorts] No API key — using fallback stubs.');
            populateShortsRow(shortsRow, SHORTS_FALLBACK);
            return;
        }

        try {
            // Build contextual query: topic keywords + #shorts
            const rawTopic = topicHint
                ? topicHint.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(' ').slice(0, 3).join(' ')
                : '';
            const searchQuery = encodeURIComponent((rawTopic ? rawTopic + ' ' : '') + '#shorts');

            // Step 2 — Search endpoint (videoDuration=short → < 4 min)
            const searchUrl = [
                'https://www.googleapis.com/youtube/v3/search',
                `?part=snippet`,
                `&type=video`,
                `&videoDuration=short`,
                `&q=${searchQuery}`,
                `&maxResults=10`,
                `&key=${API_KEY}`
            ].join('');

            const searchRes = await fetch(searchUrl);
            if (!searchRes.ok) {
                throw new Error(`Search API HTTP ${searchRes.status}`);
            }
            const searchData = await searchRes.json();

            if (!searchData.items || searchData.items.length === 0) {
                throw new Error('Search returned no items');
            }

            // Collect video IDs for secondary validation
            const videoIds = searchData.items
                .map(item => item.id?.videoId)
                .filter(Boolean)
                .join(',');

            // Step 3 — Fetch contentDetails + statistics for duration & view count
            const detailsUrl = [
                'https://www.googleapis.com/youtube/v3/videos',
                `?part=contentDetails,statistics`,
                `&id=${videoIds}`,
                `&key=${API_KEY}`
            ].join('');

            const detailsRes = await fetch(detailsUrl);
            if (!detailsRes.ok) {
                throw new Error(`Details API HTTP ${detailsRes.status}`);
            }
            const detailsData = await detailsRes.json();

            // Build lookup maps from secondary fetch
            const detailsMap = {};
            if (detailsData.items) {
                detailsData.items.forEach(item => {
                    detailsMap[item.id] = {
                        duration: item.contentDetails?.duration || 'PT0S',
                        viewCount: item.statistics?.viewCount || '0'
                    };
                });
            }

            // Step 4 — Merge search snippets with details, then filter ≤60 s
            const shorts = [];
            for (const item of searchData.items) {
                const videoId = item.id?.videoId;
                if (!videoId) continue;

                const detail = detailsMap[videoId];
                if (detail) {
                    const durationSec = parseISODuration(detail.duration);
                    if (durationSec > 60) continue; // strict Shorts cutoff
                }

                const snippet = item.snippet;
                const viewCount = detail ? parseInt(detail.viewCount, 10) : 0;

                shorts.push({
                    id: videoId,
                    title: snippet.title || 'YouTube Short',
                    channel: snippet.channelTitle || '',
                    views: formatViewCount(String(viewCount)),
                    // Prefer high-res thumbnail; fall back progressively
                    img: snippet.thumbnails?.high?.url
                        || snippet.thumbnails?.medium?.url
                        || snippet.thumbnails?.default?.url
                        || ''
                });

                if (shorts.length >= 6) break; // cap at 6 cards
            }

            if (shorts.length === 0) {
                throw new Error('No Shorts passed the 60-second filter');
            }

            // Step 5 — Render real cards
            populateShortsRow(shortsRow, shorts);
            console.log(`[Shorts] Rendered ${shorts.length} live Shorts from YouTube API.`);

        } catch (err) {
            console.warn('[Shorts] API fetch failed — falling back to stubs:', err.message);
            populateShortsRow(shortsRow, SHORTS_FALLBACK);
        }
    }

    // --- INTERACTIVE BLURRED COMMENTS SECTION ---
    const basePlaceholderComments = [
        {
            name: '@alex_vance',
            time: '2 hours ago',
            text: 'This scene gave me absolute goosebumps. The direction is on another level — cinematography is just flawless here.',
            avatar: 'https://ui-avatars.com/api/?name=Alex+Vance&background=ff7eb3&color=fff',
            likes: '128'
        },
        {
            name: '@sarah_connor',
            time: '5 hours ago',
            text: 'The sound design alone deserves every award this year! I had to watch it twice just to soak it all in. Must see in IMAX 🎬',
            avatar: 'https://ui-avatars.com/api/?name=Sarah+C&background=7928ca&color=fff',
            likes: '64'
        },
        {
            name: '@cyber_dev99',
            time: '1 day ago',
            text: 'Can we talk about that plot twist around 12:40? Genuinely did not see that coming. Mind completely blown 🤯',
            avatar: 'https://ui-avatars.com/api/?name=Cyber+Dev&background=10b981&color=fff',
            likes: '256'
        },
        {
            name: '@nightowl_films',
            time: '3 days ago',
            text: 'I\'ve been studying film for 8 years and rarely do I get moved like this. The score perfectly complements every frame.',
            avatar: 'https://ui-avatars.com/api/?name=Night+Owl&background=f97316&color=fff',
            likes: '42'
        },
        {
            name: '@priya_streams',
            time: '1 week ago',
            text: 'Rewatched this 3 times now. Every single time I notice something new. That\'s real filmmaking. Instant classic 🏆',
            avatar: 'https://ui-avatars.com/api/?name=Priya+S&background=3b82f6&color=fff',
            likes: '512'
        },
        {
            name: '@film_junkie',
            time: '2 weeks ago',
            text: 'Honestly, this is Nolan\'s finest work. The pacing is relentless and the themes are so deep. Outstanding!',
            avatar: 'https://ui-avatars.com/api/?name=Film+J&background=ec4899&color=fff',
            likes: '89'
        }
    ];

    function attachBlurredElementEvents(el) {
        const tooltip = document.getElementById('comment-tooltip');
        if (!tooltip) return;

        el.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.clientX + 12) + 'px';
            tooltip.style.top = (e.clientY + 12) + 'px';
        });

        el.addEventListener('mouseenter', () => {
            tooltip.textContent = 'Click to open on YouTube';
            tooltip.style.display = 'block';
        });

        el.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            tooltip.style.display = 'none';
            const targetId = currentVideoId || 'L_LUpnjgPso';
            window.open(`https://www.youtube.com/watch?v=${encodeURIComponent(targetId)}`, '_blank');
        });
    }

    function createCommentDomElement(item) {
        const div = document.createElement('div');
        div.className = 'blurred-comment-item';
        div.innerHTML = `
            <img class="blurred-comment-avatar" src="${item.avatar}" alt="${escapeHtml(item.name)}">
            <div class="blurred-comment-body">
                <div class="blurred-comment-header-row">
                    <span class="blurred-username">${escapeHtml(item.name)}</span>
                    <span class="comment-timestamp">${item.time}</span>
                </div>
                <div class="blurred-comment-text">${escapeHtml(item.text)}</div>
                <div class="comment-actions">
                    <button class="comment-action-btn" title="Like"><i class="far fa-thumbs-up"></i> <span>${item.likes || ''}</span></button>
                    <button class="comment-action-btn" title="Dislike"><i class="far fa-thumbs-down"></i></button>
                    <button class="comment-action-btn reply-btn">Reply</button>
                </div>
            </div>
        `;

        const blurredUsername = div.querySelector('.blurred-username');
        const blurredText = div.querySelector('.blurred-comment-text');

        [blurredUsername, blurredText].forEach(el => {
            if (el) {
                attachBlurredElementEvents(el);
            }
        });

        return div;
    }

    function renderBlurredComments() {
        const container = document.getElementById('blurredCommentsContent');
        if (!container) return;

        container.innerHTML = '';

        const countEl = document.getElementById('commentsCount');
        if (countEl) {
            countEl.textContent = '126';
            attachBlurredElementEvents(countEl);
        }

        // Render exactly 6 static comment items — no dynamic cloning
        basePlaceholderComments.forEach(item => {
            const div = createCommentDomElement(item);
            container.appendChild(div);
        });

        // Static end-of-section footer
        const footer = document.createElement('div');
        footer.className = 'comments-section-footer';
        footer.textContent = 'End of comments • Click any blurred comment to view more on YouTube';
        container.appendChild(footer);
    }

    function initBlurredCommentsEvents() {
        const countEl = document.getElementById('commentsCount');
        if (countEl) {
            attachBlurredElementEvents(countEl);
        }
    }

    // --- DYNAMIC TOPIC TAGS FILTER BAR ---
    let currentActiveTag = 'All';

    function renderTopicTags(currentVideo) {
        const container = document.getElementById('suggestionTagsContainer');
        if (!container) return;

        container.innerHTML = '';

        const channelName = currentVideo.channel || 'Channel';
        const tagSet = ['All', `From ${channelName}`, 'Related'];

        const feed = (currentVideoFeed && currentVideoFeed.length > 0) ? currentVideoFeed : getFallbackYouTubeVideos(countryCode);
        feed.forEach(v => {
            if (v.tag && !tagSet.includes(v.tag) && tagSet.length < 8) {
                tagSet.push(v.tag);
            }
        });

        if (!tagSet.includes('Gaming')) tagSet.push('Gaming');

        currentActiveTag = 'All';

        tagSet.forEach(tagText => {
            const btn = document.createElement('button');
            btn.className = `tag-pill ${tagText === 'All' ? 'active' : ''}`;
            btn.textContent = tagText;
            btn.type = 'button';

            btn.addEventListener('click', () => {
                const pills = container.querySelectorAll('.tag-pill');
                pills.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');

                currentActiveTag = tagText;
                renderSuggestedVideos(currentVideo, tagText);
            });

            container.appendChild(btn);
        });

        renderSuggestedVideos(currentVideo, 'All');
    }

    // --- RELATED SUGGESTED VIDEOS LIST ---
    function renderSuggestedVideos(currentVideo, activeTag = 'All') {
        const listContainer = document.getElementById('upNextList');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        const feed = (currentVideoFeed && currentVideoFeed.length > 0) ? currentVideoFeed : getFallbackYouTubeVideos(countryCode);
        let candidates = feed.filter(v => v.id !== currentVideo.id);

        if (candidates.length === 0) {
            candidates = getFallbackYouTubeVideos(countryCode).filter(v => v.id !== currentVideo.id);
        }

        let filtered = candidates;
        if (activeTag === 'All' || activeTag === 'Related') {
            filtered = candidates;
        } else if (activeTag.startsWith('From ')) {
            const chanFilter = activeTag.replace('From ', '').trim().toLowerCase();
            filtered = candidates.filter(v => (v.channel || '').toLowerCase().includes(chanFilter));
            if (filtered.length === 0) filtered = candidates;
        } else {
            const tagLower = activeTag.toLowerCase();
            filtered = candidates.filter(v => 
                (v.tag || '').toLowerCase().includes(tagLower) ||
                (v.title || '').toLowerCase().includes(tagLower) ||
                (v.description || '').toLowerCase().includes(tagLower)
            );
            if (filtered.length === 0) filtered = candidates;
        }

        filtered.forEach(video => {
            const card = document.createElement('div');
            card.className = 'up-next-card';

            const duration = video.duration || getRandomDuration(video.id || video.title);
            const uploadTime = video.uploadTime || getRandomUploadTime(video.id || video.title);

            card.innerHTML = `
                <div class="up-next-thumb-wrapper">
                    <img class="up-next-thumb" src="${video.img}" alt="${escapeHtml(video.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=400&q=80'">
                    <span class="up-next-duration">${duration}</span>
                </div>
                <div class="up-next-info">
                    <h4 class="up-next-title">${escapeHtml(video.title)}</h4>
                    <span class="up-next-channel">${escapeHtml(video.channel || 'YouTube Creator')}</span>
                    <div class="up-next-meta">
                        <span>${video.views || '1.2M views'}</span>
                        <span>•</span>
                        <span>${uploadTime}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                openWatchView(video.id, video.title, video.channel, video.views, video.img, video.description);
            });

            listContainer.appendChild(card);
        });
    }

    function getRandomDuration(seedStr = '') {
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) hash += seedStr.charCodeAt(i);
        const mins = (hash % 15) + 2;
        const secs = (hash % 50) + 10;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function getRandomUploadTime(seedStr = '') {
        const times = ['2 days ago', '1 week ago', '3 weeks ago', '1 month ago', '4 days ago', 'Yesterday'];
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) hash += seedStr.charCodeAt(i);
        return times[hash % times.length];
    }

    function exitWatchView() {
        isWatching = false;

        // Restore Companion Mascot Element
        document.body.classList.remove('watch-active');
        const mascot = document.getElementById('mascot');
        if (mascot) mascot.style.display = 'block';

        // Stop video by clearing iframe src
        const iframe = document.getElementById('youtube-player') || document.getElementById('youtubeIframe');
        if (iframe) iframe.src = '';

        // Show Hero Section if returning home
        const heroSection = document.querySelector('.hero-section');
        if (heroSection && currentCategory === 'home') {
            heroSection.style.display = 'block';
        }

        // Hide watch section
        const watchView = document.getElementById('watch-view');
        if (watchView) watchView.classList.remove('active');
    }

    // --- INTERACTIVE VERTICAL RESIZER DIVIDER BAR LOGIC ---
    function initWatchResizer() {
        const resizer = document.getElementById('watchResizer');
        const watchLeftCol = document.getElementById('watchLeftCol');
        const watchRightCol = document.getElementById('watchRightCol');
        const watchLayout = document.querySelector('.watch-layout');

        if (!resizer || !watchLeftCol || !watchRightCol || !watchLayout) return;

        let isResizing = false;
        const stackedLayoutQuery = window.matchMedia('(max-width: 1100px)');

        resizer.addEventListener('mousedown', startDragging);
        resizer.addEventListener('touchstart', startDragging, { passive: true });
        syncResizerAvailability();
        stackedLayoutQuery.addEventListener('change', syncResizerAvailability);

        function startDragging(e) {
            if (stackedLayoutQuery.matches || watchLayout.offsetWidth === 0) return;
            isResizing = true;
            resizer.classList.add('is-resizing');
            document.body.classList.add('is-resizing-watch');

            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('touchmove', handleDrag, { passive: false });
            document.addEventListener('mouseup', stopDragging);
            document.addEventListener('touchend', stopDragging);
        }

        function handleDrag(e) {
            if (!isResizing) return;
            if (e.cancelable) e.preventDefault();

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const layoutRect = watchLayout.getBoundingClientRect();
            
            // Calculate distance from left edge of layout
            let newLeftWidth = clientX - layoutRect.left;

            // Enforce Strict Boundary Limits:
            // Video Minimum Width: 450px
            // Chat Minimum Width: 260px (Max Left Width = total width - 260 - resizer width)
            const minVideoWidth = 450;
            const minChatWidth = 260;
            const resizerWidth = resizer.offsetWidth || 12;
            const maxLeftWidth = layoutRect.width - minChatWidth - resizerWidth;

            if (maxLeftWidth <= minVideoWidth) return;

            if (newLeftWidth < minVideoWidth) newLeftWidth = minVideoWidth;
            if (newLeftWidth > maxLeftWidth) newLeftWidth = maxLeftWidth;

            // Calculate percentage width for smooth responsiveness
            const leftPercentage = (newLeftWidth / layoutRect.width) * 100;
            watchLeftCol.style.flex = `0 0 ${leftPercentage}%`;

            syncChatHeight();
        }

        function syncResizerAvailability() {
            const isStacked = stackedLayoutQuery.matches;

            if (isStacked) {
                if (isResizing) stopDragging();
                watchLeftCol.style.flex = '';
                watchRightCol.style.flex = '';
                resizer.setAttribute('aria-hidden', 'true');
                return;
            }

            resizer.removeAttribute('aria-hidden');
        }

        function stopDragging() {
            if (!isResizing) return;
            isResizing = false;
            resizer.classList.remove('is-resizing');
            document.body.classList.remove('is-resizing-watch');

            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('touchmove', handleDrag);
            document.removeEventListener('mouseup', stopDragging);
            document.removeEventListener('touchend', stopDragging);

            syncChatHeight();
        }
    }

    // --- REAL USER CHAT SUBMISSION ---
    function appendChatMessage(name, text, time = "Just now", avatar = "", isUser = true) {
        const chatLog = document.getElementById('chatLog');
        if (!chatLog) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg-item ${isUser ? 'user-sent' : ''}`;
        const avatarUrl = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7928ca&color=fff`;

        msgDiv.innerHTML = `
            <img class="chat-avatar" src="${avatarUrl}" alt="${escapeHtml(name)}">
            <div class="chat-msg-content">
                <div class="chat-msg-header">
                    <span class="chat-username">${escapeHtml(name)}</span>
                    <span class="chat-time">${time}</span>
                </div>
                <div class="chat-text">${escapeHtml(text)}</div>
            </div>
        `;

        chatLog.appendChild(msgDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function escapeHtml(str) {
        if (!str) return '';
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }

    function initWatchViewEvents() {
        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');
        const btnToggleDesc = document.getElementById('btnToggleDesc');
        const descBox = document.getElementById('watchDescriptionBox');

        initBlurredCommentsEvents();

        // Description expand/collapse toggle
        if (btnToggleDesc && descBox) {
            btnToggleDesc.addEventListener('click', () => {
                descBox.classList.toggle('expanded');
                btnToggleDesc.textContent = descBox.classList.contains('expanded') ? 'Show Less' : 'Show More';
            });
        }

        // Real Chat Submission
        if (chatForm && chatInput) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = chatInput.value.trim();
                if (!text) return;

                appendChatMessage("You (Pro)", text, "Just now", "https://ui-avatars.com/api/?name=You&background=7928ca&color=fff", true);
                chatInput.value = '';
            });
        }

        // Hero "START WATCHING" button
        const heroPlayBtn = document.querySelector('.play-btn');
        if (heroPlayBtn) {
            heroPlayBtn.addEventListener('click', () => {
                openWatchView("L_LUpnjgPso", "Interstellar: Beyond Time", "Warner Bros. Pictures", "48.2M views");
            });
        }
    }

    // --- MAIN NAVIGATION & SIDEBAR ---
    function initNavigation() {
        const navLinks = document.querySelectorAll('.nav-menu a');
        const sections = document.querySelectorAll('.dashboard-section');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionName = link.getAttribute('data-section');
                const targetSectionId = sectionName + '-section';

                if (isWatching) {
                    exitWatchView();
                }

                navLinks.forEach(l => l.parentElement.classList.remove('active'));
                link.parentElement.classList.add('active');

                sections.forEach(section => {
                    if (section.id === targetSectionId) {
                        section.classList.add('active');
                    } else {
                        section.classList.remove('active');
                    }
                });

                currentCategory = sectionName;
                nextPageToken = '';

                if (['home', 'trending', 'live', 'cinema'].includes(sectionName)) {
                    loadYouTubeVideos(false);
                } else if (sectionName === 'history') {
                    populateHistory();
                } else if (sectionName === 'favorites') {
                    populateFavorites();
                }
            });
        });

        const toggleSwitches = document.querySelectorAll('.toggle-switch');
        toggleSwitches.forEach(sw => {
            sw.addEventListener('click', () => {
                sw.classList.toggle('active');
            });
        });
    }

    function initSidebarEvents() {
        const toggleSidebarBtn = document.getElementById('toggleSidebar');
        const appContainer = document.querySelector('.app-container');
        const sidebar = document.getElementById('sidebar');
        const resizer = document.getElementById('sidebarResizer');

        if (toggleSidebarBtn && appContainer) {
            const toggleIcon = toggleSidebarBtn.querySelector('i');
            toggleSidebarBtn.addEventListener('click', () => {
                appContainer.classList.toggle('sidebar-hidden');

                if (toggleIcon) {
                    if (appContainer.classList.contains('sidebar-hidden')) {
                        toggleIcon.classList.replace('fa-bars', 'fa-indent');
                    } else {
                        toggleIcon.classList.replace('fa-indent', 'fa-bars');
                    }
                }
            });
        }

        if (sidebar && resizer) {
            let isResizing = false;

            resizer.addEventListener('mousedown', (e) => {
                isResizing = true;
                sidebar.classList.add('resizing');
                document.body.style.cursor = 'col-resize';
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', stopResizing);
            });

            function handleMouseMove(e) {
                if (!isResizing) return;
                let newWidth = e.clientX;
                if (newWidth < 200) newWidth = 200;
                if (newWidth > 450) newWidth = 450;
                sidebar.style.setProperty('--sidebar-width', newWidth + 'px');
            }

            function stopResizing() {
                isResizing = false;
                sidebar.classList.remove('resizing');
                document.body.style.cursor = 'default';
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', stopResizing);
            }
        }
    }

    function populateHistory() {
        const section = document.querySelector('#history-section');
        if (!section || section.querySelector('.card-grid')) return;

        const container = document.createElement('div');
        container.className = 'card-grid';

        const historyItems = [
            { id: "qEVUtrk8_B4", title: "Cyberpunk 2077 Night City", channel: "CD PROJEKT RED", views: "19.4M views", img: "https://i.ytimg.com/vi/qEVUtrk8_B4/maxresdefault.jpg", tag: "WATCHED" },
            { id: "1G4isv_Fylg", title: "Dune: Part Two Trailer", channel: "Warner Bros", views: "29.8M views", img: "https://i.ytimg.com/vi/1G4isv_Fylg/maxresdefault.jpg", tag: "WATCHED" }
        ];

        historyItems.forEach(item => container.appendChild(createMovieCard(item)));
        section.appendChild(container);
    }

    function populateFavorites() {
        const section = document.querySelector('#favorites-section');
        if (!section || section.querySelector('.card-grid')) return;

        const container = document.createElement('div');
        container.className = 'card-grid';

        const favs = [
            { id: "L_LUpnjgPso", title: "Interstellar Official Trailer", channel: "Warner Bros", views: "48.2M views", img: "https://i.ytimg.com/vi/L_LUpnjgPso/maxresdefault.jpg", tag: "FAV" }
        ];

        favs.forEach(fav => container.appendChild(createMovieCard(fav)));
        section.appendChild(container);
    }

    // --- NOTIFICATIONS ---
    function initNotificationEvents() {
        const notifBtn = document.getElementById('notifBtn');
        const notifDropdown = document.getElementById('notifDropdown');
        const badge = document.querySelector('.badge');
        const markReadBtn = document.querySelector('.mark-read');

        if (notifBtn && notifDropdown) {
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notifDropdown.classList.toggle('active');
                if (notifDropdown.classList.contains('active') && badge) {
                    badge.style.display = 'none';
                }
            });

            document.addEventListener('click', (e) => {
                if (!notifDropdown.contains(e.target) && e.target !== notifBtn) {
                    notifDropdown.classList.remove('active');
                }
            });
        }

        if (markReadBtn && notifDropdown) {
            markReadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const items = document.querySelectorAll('.notif-item');
                if (items.length === 0) {
                    notifDropdown.classList.remove('active');
                    return;
                }
                items.forEach((item, index) => {
                    setTimeout(() => {
                        item.classList.add('swipe-out');
                        setTimeout(() => {
                            item.remove();
                            if (document.querySelectorAll('.notif-item').length === 0) {
                                const notifList = document.querySelector('.notif-list');
                                if (notifList) {
                                    notifList.innerHTML = `
                                        <div class="empty-state" style="padding: 40px 20px;">
                                            <i class="fas fa-bell-slash" style="font-size: 32px; margin-bottom: 12px; opacity: 0.2;"></i>
                                            <p style="font-size: 13px; opacity: 0.5;">No new notifications</p>
                                        </div>
                                    `;
                                }
                                if (badge) badge.style.display = 'none';
                                markReadBtn.textContent = 'Close';
                            }
                        }, 400);
                    }, index * 100);
                });
            });
        }
    }

    // --- HERO SLIDER ---
    function initHeroSlider() {
        const heroData = [
            {
                title: "Interstellar: <br>Beyond Time",
                desc: "A masterpiece by Christopher Nolan. A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
                img: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=90"
            },
            {
                title: "Neon Nights <br>2049",
                desc: "In a world where technology and humanity blur, one detective must uncover the truth behind a city-wide conspiracy.",
                img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1400&q=90"
            },
            {
                title: "Urban <br>Explorer: Tokyo",
                desc: "Join Alex Rivers as he explores the hidden gems and neon-lit streets of Tokyo in this exclusive documentary series.",
                img: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1400&q=90"
            }
        ];

        let currentHeroIndex = 0;
        const heroImgElements = document.querySelectorAll('.hero-img');
        const heroTitle = document.getElementById('heroTitle');
        const heroDesc = document.getElementById('heroDesc');
        const heroNext = document.getElementById('heroNext');
        const indicators = document.querySelectorAll('.indicator');

        function updateHero(index) {
            if (!heroImgElements.length || !heroTitle || !heroDesc) return;
            heroImgElements.forEach(img => img.classList.remove('active'));
            heroImgElements[index].classList.add('active');

            indicators.forEach(ind => ind.classList.remove('active'));
            if (indicators[index]) indicators[index].classList.add('active');

            heroTitle.style.opacity = '0';
            heroDesc.style.opacity = '0';

            setTimeout(() => {
                heroTitle.innerHTML = heroData[index].title;
                heroDesc.textContent = heroData[index].desc;
                heroTitle.style.opacity = '1';
                heroDesc.style.opacity = '1';
            }, 400);

            currentHeroIndex = index;
        }

        if (heroNext) {
            heroNext.addEventListener('click', () => {
                let nextIndex = (currentHeroIndex + 1) % heroData.length;
                updateHero(nextIndex);
            });
        }

        let heroAutoInterval = setInterval(() => {
            if (heroNext) heroNext.click();
        }, 8000);

        const heroCard = document.getElementById('heroCard');
        if (heroCard) {
            heroCard.addEventListener('mouseenter', () => clearInterval(heroAutoInterval));
            heroCard.addEventListener('mouseleave', () => {
                heroAutoInterval = setInterval(() => {
                    if (heroNext) heroNext.click();
                }, 8000);
            });
        }
    }

    // --- SEARCH BAR ---
    function initSearch() {
        const searchInput = document.querySelector('.search-bar input');
        if (!searchInput) return;

        searchInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && searchInput.value.trim() !== '') {
                const query = searchInput.value.trim();
                searchInput.style.borderColor = 'var(--accent-color)';

                try {
                    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=12&key=${API_KEY}`;
                    const res = await fetch(searchUrl);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.items && data.items.length > 0) {
                            const firstVideo = data.items[0];
                            openWatchView(
                                firstVideo.id.videoId,
                                firstVideo.snippet.title,
                                firstVideo.snippet.channelTitle,
                                "YouTube Search Result",
                                firstVideo.snippet.thumbnails?.high?.url || '',
                                firstVideo.snippet.description || ''
                            );
                            return;
                        }
                    }
                } catch (err) {
                    console.error('[Search API Error]', err);
                }

                const bar = document.querySelector('.search-bar');
                if (bar) {
                    bar.style.animation = 'shake 0.5s';
                    setTimeout(() => bar.style.animation = '', 500);
                }
            }
        });

        const style = document.createElement('style');
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(style);
    }

    // --- FALLBACK YOUTUBE DATA ---
    function getFallbackYouTubeVideos(region) {
        return [
            { id: "L_LUpnjgPso", title: "Interstellar - Official Trailer 3", channel: "Warner Bros. Pictures", views: "48.2M views", img: "https://i.ytimg.com/vi/L_LUpnjgPso/maxresdefault.jpg", tag: "TRAILER", description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival." },
            { id: "YoHD9XEInc0", title: "Inception - Official Trailer [HD]", channel: "Warner Bros. Pictures", views: "34.5M views", img: "https://i.ytimg.com/vi/YoHD9XEInc0/maxresdefault.jpg", tag: "4K", description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task." },
            { id: "EXeTwQWrcwY", title: "The Dark Knight - Official Trailer", channel: "Warner Bros. Pictures", views: "62.1M views", img: "https://i.ytimg.com/vi/EXeTwQWrcwY/maxresdefault.jpg", tag: "POPULAR", description: "When the menace known as the Joker wreaks havoc and chaos on Gotham, Batman must accept his greatest test." },
            { id: "1G4isv_Fylg", title: "Dune: Part Two - Official Trailer 2", channel: "Warner Bros. Pictures", views: "29.8M views", img: "https://i.ytimg.com/vi/1G4isv_Fylg/maxresdefault.jpg", tag: "TRENDING", description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family." },
            { id: "qEVUtrk8_B4", title: "Cyberpunk 2077 - Official Night City Trailer", channel: "Cyberpunk 2077", views: "19.4M views", img: "https://i.ytimg.com/vi/qEVUtrk8_B4/maxresdefault.jpg", tag: "GAMING", description: "Explore the vast futuristic metropolis of Night City in Cyberpunk 2077." },
            { id: "jfKfPfyJRdk", title: "Lofi Hip Hop Radio - Beats to Relax/Study to", channel: "Lofi Girl", views: "85.6M views", img: "https://i.ytimg.com/vi/jfKfPfyJRdk/maxresdefault.jpg", tag: "LIVE", description: "Peaceful lofi hip hop beats to help you study, work, or relax." },
            { id: "5qap5aO4i9A", title: "Lofi Hip Hop Radio - Beats to Sleep/Chill to", channel: "Lofi Girl", views: "41.2M views", img: "https://i.ytimg.com/vi/5qap5aO4i9A/maxresdefault.jpg", tag: "LIVE", description: "Soothing lofi beats crafted for sleep and deep relaxation." },
            { id: "dQw4w9WgXcQ", title: "Rick Astley - Never Gonna Give You Up", channel: "Rick Astley", views: "1.4B views", img: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg", tag: "MUSIC", description: "The official video for Never Gonna Give You Up by Rick Astley." }
        ];
    }

    // --- MASCOT ---
    function initMascot() {
        if (window.Sam) {
            window.Sam.init({
                face: document.getElementById('face'),
                bubble: document.getElementById('mascotBubble'),
                text: document.getElementById('mascotText'),
                container: document.getElementById('mascot'),
                eyeL: document.getElementById('eyeL'),
                eyeR: document.getElementById('eyeR')
            });

            setTimeout(() => {
                window.Sam.speak(`Clean 2-column watch view loaded! Region: ${countryCode}. Enjoy watching! 🍿`, "happy");
            }, 1800);
        }
    }
});
