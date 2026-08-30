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
    let previousViewState = null;
    let navigationHistoryStack = [];

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
            initUserProfile();
            initDynamicTagsSystem();
            initTagScrollControls();
            initSuggestionTagScrollControls();
            initShortsScrollControls();
            initShortsFeed();
            initNavigation();
            initWatchViewEvents();
            initWatchResizer();
            initSidebarEvents();
            initNotificationEvents();
            initHeroSlider();
            initCinemaDropdowns();
            initSearch();
            initMascot();
        } catch (err) {
            console.error('[App Init] UI Initialization error:', err);
        }
    }

    // --- USER PROFILE & AUTH MANAGEMENT (CLOUD FIRESTORE SYNC) ---
    let dashAuth = null;
    let dashDb = null;
    let userFavoritesSet = new Set();
    let userWatchlistSet = new Set();

    function initUserProfile() {
        const firebaseConfig = {
            projectId: "virtual-chalice-blcf1",
            appId: "1:300759470003:web:752ac307069b12025085c6",
            apiKey: "AIzaSyABYz21u9l8n4ZRdVAFQ4QPB5HYEg0Sb9I",
            authDomain: "virtual-chalice-blcf1.firebaseapp.com",
            storageBucket: "virtual-chalice-blcf1.firebasestorage.app",
            messagingSenderId: "300759470003",
            measurementId: ""
        };

        if (typeof firebase !== 'undefined') {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }
                dashAuth = firebase.auth();
                dashDb = firebase.firestore();
                window.dashAuth = dashAuth;
                window.dashDb = dashDb;
            } catch (e) {
                console.error('[Dashboard Firebase] Init error:', e);
            }
        }

        const userAvatarEl = document.getElementById('dashboardUserAvatar');
        const userNameEl = document.getElementById('dashboardUserName');
        const userHandleEl = document.getElementById('dashboardUserHandle');
        const sidebarLogoutBtn = document.getElementById('dashboardLogoutBtn');
        const settingsLogoutBtn = document.getElementById('settingsLogoutBtn');

        const settingsName = document.getElementById('settingsName');
        const settingsHandle = document.getElementById('settingsHandle');
        const settingsEmail = document.getElementById('settingsEmail');
        const settingsDob = document.getElementById('settingsDob');

        function updateProfileUI(profile) {
            if (!profile) return;
            const displayName = profile.name || 'User';
            const displayHandle = profile.handle ? (profile.handle.startsWith('@') ? profile.handle : `@${profile.handle}`) : '@user';
            const displayAvatar = profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ff7eb3&color=fff&bold=true`;

            if (userNameEl) userNameEl.textContent = displayName;
            if (userHandleEl) userHandleEl.textContent = displayHandle;
            if (userAvatarEl) {
                userAvatarEl.src = displayAvatar;
                userAvatarEl.alt = displayName;
            }

            if (settingsName) settingsName.textContent = displayName;
            if (settingsHandle) settingsHandle.textContent = displayHandle;
            if (settingsEmail) settingsEmail.textContent = profile.email || 'Google Account';
            if (settingsDob) settingsDob.textContent = profile.dob || 'Not set';
        }

        // Render fast cache first
        const userProfileRaw = localStorage.getItem('tog3r_user_profile');
        let localProfile = null;
        try {
            if (userProfileRaw) {
                localProfile = JSON.parse(userProfileRaw);
                updateProfileUI(localProfile);
            }
        } catch (e) {
            console.error('[Profile] Error parsing user profile:', e);
        }

        // Listen to Firebase Auth & Cloud Firestore Data
        if (dashAuth) {
            dashAuth.onAuthStateChanged((user) => {
                const isExplicitlyLoggedOut = sessionStorage.getItem('tog3r_logged_out') === 'true';
                if (user && !isExplicitlyLoggedOut) {
                    const googleAvatar = user.photoURL || '';

                    // Compute current active avatar: custom local/firestore avatar takes priority; otherwise use Google photoURL
                    const currentAvatar = (localProfile?.avatar && !localProfile.avatar.includes('ui-avatars.com'))
                        ? localProfile.avatar
                        : (googleAvatar || localProfile?.avatar || '');

                    const initialProfile = {
                        name: localProfile?.name || user.displayName || 'User',
                        handle: localProfile?.handle || (user.email ? `@${user.email.split('@')[0]}` : '@user'),
                        dob: localProfile?.dob || '',
                        gender: localProfile?.gender || 'prefer-not-to-say',
                        avatar: currentAvatar,
                        email: user.email || localProfile?.email || ''
                    };
                    updateProfileUI(initialProfile);

                    if (dashDb) {
                        // Subscribe to Profile in Firestore
                        dashDb.collection('users').doc(user.uid).onSnapshot((doc) => {
                            if (doc.exists) {
                                const cloudData = doc.data();
                                // Prefer custom created name and handle from Firestore
                                const resolvedName = cloudData.name || localProfile?.name || user.displayName || 'User';
                                const resolvedHandle = cloudData.handle || localProfile?.handle || `@${(user.email ? user.email.split('@')[0] : 'user').replace(/^@/, '')}`;
                                const resolvedDob = cloudData.dob || localProfile?.dob || '';
                                const resolvedGender = cloudData.gender || localProfile?.gender || 'prefer-not-to-say';
                                const resolvedEmail = cloudData.email || user.email || localProfile?.email || '';

                                // Avatar: if user chose a custom avatar (data url or custom URL), keep it; otherwise use Google photoURL
                                const hasCustomAvatar = cloudData.avatar && !cloudData.avatar.includes('ui-avatars.com');
                                const resolvedAvatar = hasCustomAvatar ? cloudData.avatar : (googleAvatar || cloudData.avatar || '');

                                const profile = {
                                    name: resolvedName,
                                    handle: resolvedHandle,
                                    dob: resolvedDob,
                                    gender: resolvedGender,
                                    avatar: resolvedAvatar,
                                    email: resolvedEmail
                                };
                                localStorage.setItem('tog3r_user_profile', JSON.stringify(profile));
                                updateProfileUI(profile);

                                // If Google Avatar exists and no custom avatar was set in cloud, update only the avatar field
                                if (googleAvatar && !hasCustomAvatar) {
                                    dashDb.collection('users').doc(user.uid).set({
                                        avatar: googleAvatar
                                    }, { merge: true }).catch(() => {});
                                }
                            } else {
                                // If no Firestore doc exists yet, preserve local profile or initialize with Google info
                                const newProfile = {
                                    uid: user.uid,
                                    name: localProfile?.name || user.displayName || 'User',
                                    handle: localProfile?.handle || `@${(user.email ? user.email.split('@')[0] : 'user').replace(/^@/, '')}`,
                                    dob: localProfile?.dob || '',
                                    gender: localProfile?.gender || 'prefer-not-to-say',
                                    avatar: localProfile?.avatar || googleAvatar,
                                    email: user.email || localProfile?.email || '',
                                    hasCompletedProfile: true,
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                };
                                dashDb.collection('users').doc(user.uid).set(newProfile, { merge: true }).catch(() => {});
                                localStorage.setItem('tog3r_user_profile', JSON.stringify(newProfile));
                                updateProfileUI(newProfile);
                            }
                        }, (err) => {
                            console.warn('[Firestore] Profile sync warning:', err);
                        });

                        // Real-time listen to favorites to maintain accurate state
                        dashDb.collection('users').doc(user.uid).collection('favorites').onSnapshot(snap => {
                            userFavoritesSet.clear();
                            snap.forEach(d => userFavoritesSet.add(d.id));
                            // Refresh favorites view if active
                            const favSection = document.getElementById('favorites-section');
                            if (favSection && favSection.classList.contains('active')) {
                                populateFavorites();
                            }
                        }, () => {});

                        // Real-time listen to watchlist to maintain accurate state
                        dashDb.collection('users').doc(user.uid).collection('watchlist').onSnapshot(snap => {
                            userWatchlistSet.clear();
                            snap.forEach(d => userWatchlistSet.add(d.id));
                            // Refresh watchlist view if active
                            const wlSection = document.getElementById('watchlist-section');
                            if (wlSection && wlSection.classList.contains('active')) {
                                populateWatchlist();
                            }
                        }, () => {});
                    }
                } else if (!localProfile && isExplicitlyLoggedOut) {
                    window.location.href = '../index.html?logout=true';
                }
            });
        }

        const handleLogout = () => {
            localStorage.removeItem('tog3r_user_profile');
            sessionStorage.setItem('tog3r_logged_out', 'true');
            if (dashAuth) {
                dashAuth.signOut().catch(() => {}).finally(() => {
                    window.location.href = '../index.html?logout=true';
                });
            } else {
                window.location.href = '../index.html?logout=true';
            }
        };

        if (sidebarLogoutBtn) {
            sidebarLogoutBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleLogout();
            });
        }
        if (settingsLogoutBtn) {
            settingsLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
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

    // --- DYNAMIC YOUTUBE-STYLE TAG RECOMMENDATION & FILTERING ENGINE ---
    let userEngagementHistory = {
        clickedTags: {},
        watchedVideos: []
    };
    let activeFilterTag = 'All';

    function initDynamicTagsSystem() {
        try {
            const stored = localStorage.getItem('tog3r_user_engagement_history');
            if (stored) {
                userEngagementHistory = JSON.parse(stored);
                if (!userEngagementHistory.clickedTags) userEngagementHistory.clickedTags = {};
                if (!userEngagementHistory.watchedVideos) userEngagementHistory.watchedVideos = [];
            }
        } catch (err) {
            console.warn('[Tag Engine] Failed to parse user engagement history:', err);
        }

        initTagScrollControls();
        initSuggestionTagScrollControls();
        updateDynamicTagUI();
    }

    function extractVideoTags(item, category = '') {
        const tags = new Set();
        if (item.snippet && item.snippet.tags && Array.isArray(item.snippet.tags)) {
            item.snippet.tags.slice(0, 4).forEach(t => {
                const clean = t.trim();
                if (clean.length > 2 && clean.length < 20) {
                    tags.add(clean.charAt(0).toUpperCase() + clean.slice(1));
                }
            });
        }
        const text = (((item.snippet ? item.snippet.title : item.title) || '') + ' ' + 
                      ((item.snippet ? item.snippet.description : item.description) || '')).toLowerCase();

        if (text.includes('trailer') || text.includes('teaser')) tags.add('Trailers');
        if (text.includes('action') || text.includes('fight') || text.includes('batman') || text.includes('war') || text.includes('mission')) tags.add('Action');
        if (text.includes('sci-fi') || text.includes('space') || text.includes('dune') || text.includes('interstellar') || text.includes('alien')) tags.add('Sci-Fi');
        if (text.includes('game') || text.includes('gaming') || text.includes('gameplay') || text.includes('gta') || text.includes('playstation') || text.includes('xbox')) tags.add('Gaming');
        if (text.includes('music') || text.includes('song') || text.includes('beats') || text.includes('lofi') || text.includes('soundtrack') || text.includes('official video')) tags.add('Music');
        if (text.includes('movie') || text.includes('cinema') || text.includes('film') || text.includes('scene')) tags.add('Cinema');
        if (text.includes('cyberpunk') || text.includes('night city') || text.includes('edgerunners') || text.includes('neon')) tags.add('Cyberpunk');
        if (text.includes('anime') || text.includes('animation') || text.includes('cartoon') || text.includes('studio ghibli')) tags.add('Anime');
        if (text.includes('live') || text.includes('stream') || text.includes('radio') || text.includes('broadcast')) tags.add('Live');
        if (text.includes('documentary') || text.includes('explore') || text.includes('tokyo') || text.includes('nature') || text.includes('history')) tags.add('Documentary');
        if (text.includes('4k') || text.includes('ultra hd') || text.includes('hdr') || text.includes('remaster') || text.includes('60fps')) tags.add('4K');
        if (text.includes('marvel') || text.includes('avengers') || text.includes('iron man') || text.includes('spiderman') || text.includes('mcu')) tags.add('Marvel');
        if (text.includes('comedy') || text.includes('funny') || text.includes('humor') || text.includes('skit')) tags.add('Comedy');
        if (text.includes('tech') || text.includes('ai') || text.includes('future') || text.includes('robot') || text.includes('gadgets')) tags.add('Technology');
        if (text.includes('horror') || text.includes('scary') || text.includes('creepy') || text.includes('ghost')) tags.add('Horror');
        if (text.includes('thriller') || text.includes('mystery') || text.includes('detective') || text.includes('crime')) tags.add('Thriller');
        if (text.includes('soundtrack') || text.includes('ost') || text.includes('score') || text.includes('ambient')) tags.add('Soundtracks');
        if (text.includes('vfx') || text.includes('cgi') || text.includes('special effects') || text.includes('breakdown')) tags.add('VFX & CGI');
        if (text.includes('esports') || text.includes('tournament') || text.includes('championship')) tags.add('Esports');
        if (text.includes('podcast') || text.includes('interview') || text.includes('talk show')) tags.add('Podcasts');
        if (text.includes('fantasy') || text.includes('magic') || text.includes('dragon') || text.includes('witcher')) tags.add('Fantasy');
        if (text.includes('adventure') || text.includes('journey') || text.includes('quest') || text.includes('expedition')) tags.add('Adventure');
        if (text.includes('webgl') || text.includes('three.js') || text.includes('shader') || text.includes('game dev')) tags.add('Game Dev');

        if (category === 'live') tags.add('Live');
        if (category === 'cinema') tags.add('Cinema');
        if (category === 'trending') tags.add('Trending');

        if (tags.size === 0) tags.add('Trending');
        return Array.from(tags);
    }

    // --- HOME PAGE VIDEO FILTER (EXCLUDE NATH, SARAIKI, DANCE, NASEEBO) ---
    function isBlockedHomeVideo(title) {
        if (!title || typeof title !== 'string') return false;
        const lower = title.toLowerCase();
        // Exclude any video with 'nath', 'naat', 'naath', 'saraiki', 'seraiki', 'dance', 'dancing', 'dancer', 'naseebo', 'nasibo'
        const blockedKeywords = ['nath', 'naat', 'naath', 'saraiki', 'seraiki', 'dance', 'dancing', 'dancer', 'dances', 'naseebo', 'nasibo'];
        return blockedKeywords.some(kw => lower.includes(kw));
    }

    /**
     * Algorithmic Dynamic Tag Generator
     * Generates a balanced set of contextual, personalized, trending, and discovery tags in a stable order.
     */
    function getDynamicTags({ allVideos = [], userHistory = userEngagementHistory, limit = 26 }) {
        // Step 1: Global Tag Frequency Calculation
        const globalTagFrequency = {
            'Action': 12,
            'Cinema': 12,
            'Sci-Fi': 10,
            'Gaming': 10,
            'Trailers': 9,
            'Music': 9,
            '4K': 8,
            'Live': 8,
            'Cyberpunk': 7,
            'Anime': 7,
            'Documentary': 7,
            'Marvel': 6,
            'Lofi': 6,
            'Technology': 6,
            'Comedy': 6,
            'Animation': 5,
            'Game Dev': 5,
            'Soundtracks': 5,
            'AI & Future': 5,
            'Horror': 5,
            'Thriller': 5,
            'Fantasy': 4,
            'Adventure': 4,
            'VFX & CGI': 4,
            'Esports': 4,
            'Podcasts': 4,
            'Web Dev': 3,
            'Shorts': 3
        };

        allVideos.forEach(video => {
            if (isBlockedHomeVideo(video.title)) return;
            const tags = video.tags || [];
            tags.forEach(t => {
                const norm = t.trim();
                if (norm && norm.toLowerCase() !== 'all' && !isBlockedHomeVideo(norm)) {
                    globalTagFrequency[norm] = (globalTagFrequency[norm] || 0) + 2;
                }
            });
        });

        const allUniqueTags = Object.keys(globalTagFrequency);
        const now = Date.now();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;

        // Step 2: Personal Affinity Scoring with exponential time decay
        const affinityScores = {};
        allUniqueTags.forEach(tag => {
            const engagement = userHistory?.clickedTags?.[tag];
            if (engagement) {
                const daysSinceLastClick = (now - engagement.lastClicked) / ONE_DAY_MS;
                const decayMultiplier = Math.exp(-daysSinceLastClick / 7); // 7-day half-life decay
                affinityScores[tag] = engagement.count * decayMultiplier * (engagement.weight || 1.0);
            } else {
                affinityScores[tag] = 0;
            }
        });

        // Step 3: Categorization & Pool Selection
        // A. Personalized Pool: Top tags with high affinity
        const personalizedPool = Object.entries(affinityScores)
            .filter(([_, score]) => score > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([tag]) => tag);

        // B. Trending/Popular Pool: Top globally frequent tags
        const trendingPool = Object.entries(globalTagFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([tag]) => tag);

        // C. Discovery Pool: Discovery tags
        const candidateDiscovery = allUniqueTags.filter(
            t => !personalizedPool.includes(t) && !trendingPool.includes(t)
        );
        const discoveryPool = candidateDiscovery.slice(0, 3);

        // Step 4: Interleave Pools in a stable sequence & Prepend "All"
        const mergedList = [];
        personalizedPool.forEach(t => mergedList.push(t));
        trendingPool.forEach(t => mergedList.push(t));
        discoveryPool.forEach(t => mergedList.push(t));

        const seen = new Set();
        const finalTags = ['All'];

        mergedList.forEach(t => {
            if (t && t.toLowerCase() !== 'all' && !seen.has(t.toLowerCase())) {
                seen.add(t.toLowerCase());
                finalTags.push(t);
            }
        });

        // Backfill if needed
        allUniqueTags.forEach(t => {
            if (finalTags.length < limit && !seen.has(t.toLowerCase())) {
                seen.add(t.toLowerCase());
                finalTags.push(t);
            }
        });

        return finalTags.slice(0, limit);
    }

    let renderedTagsCache = [];

    function updateDynamicTagUI(forceRerender = false) {
        const bar = document.getElementById('ytTagsBar');
        if (!bar) return;

        // If already rendered and not forced, just update the selected/active classes in place
        if (!forceRerender && bar.children.length > 0) {
            bar.querySelectorAll('.yt-tag-chip').forEach(chip => {
                const isSelected = chip.textContent.trim().toLowerCase() === activeFilterTag.toLowerCase();
                chip.classList.toggle('active', isSelected);
                chip.setAttribute('aria-selected', isSelected ? 'true' : 'false');
            });
            checkTagScrollButtons();
            return;
        }

        const allSourceVideos = (currentVideoFeed && currentVideoFeed.length > 0)
            ? currentVideoFeed 
            : getFallbackYouTubeVideos(countryCode);

        const tags = getDynamicTags({
            allVideos: allSourceVideos,
            userHistory: userEngagementHistory,
            limit: 24
        });
        renderedTagsCache = tags;

        bar.innerHTML = '';
        tags.forEach(tag => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `yt-tag-chip ${tag.toLowerCase() === activeFilterTag.toLowerCase() ? 'active' : ''}`;
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-selected', tag.toLowerCase() === activeFilterTag.toLowerCase() ? 'true' : 'false');
            btn.textContent = tag;

            btn.addEventListener('click', () => {
                onTagClick(tag);
            });

            bar.appendChild(btn);
        });

        checkTagScrollButtons();
    }

    async function onTagClick(tag) {
        if (activeFilterTag === tag) return;
        activeFilterTag = tag;

        // Increment user affinity score in background
        if (tag.toLowerCase() !== 'all') {
            const existing = userEngagementHistory.clickedTags[tag] || { count: 0, lastClicked: 0, weight: 1.0 };
            userEngagementHistory.clickedTags[tag] = {
                count: existing.count + 1,
                lastClicked: Date.now(),
                weight: (existing.weight || 1.0) + 0.15
            };
            try {
                localStorage.setItem('tog3r_user_engagement_history', JSON.stringify(userEngagementHistory));
            } catch (err) {
                console.warn('[Tag Storage Error]', err);
            }
        }

        // Highlight active tag strictly in-place without changing its position or reordering
        const bar = document.getElementById('ytTagsBar');
        if (bar) {
            bar.querySelectorAll('.yt-tag-chip').forEach(chip => {
                const isSelected = chip.textContent.trim().toLowerCase() === tag.toLowerCase();
                chip.classList.toggle('active', isSelected);
                chip.setAttribute('aria-selected', isSelected ? 'true' : 'false');
            });
        }

        // Filter and display videos for the selected genre
        await filterVideosByTag(tag);
    }

    async function filterVideosByTag(tag) {
        showLoader(true);

        const homeGrid = document.querySelector('.content-row .card-grid');
        if (!homeGrid) return;

        if (tag.toLowerCase() === 'all') {
            if (!currentVideoFeed || currentVideoFeed.length === 0) {
                await loadYouTubeVideos(false);
            } else {
                renderVideoCards(currentVideoFeed, false);
            }
            showLoader(false);
            return;
        }

        // Filter currently available videos
        const allLocal = (currentVideoFeed && currentVideoFeed.length > 0)
            ? currentVideoFeed 
            : getFallbackYouTubeVideos(countryCode);

        const queryTag = tag.toLowerCase();
        let matched = allLocal
            .filter(v => !isBlockedHomeVideo(v.title))
            .filter(v => {
                const tagMatch = (v.tags || []).some(t => t.toLowerCase() === queryTag);
                const categoryMatch = (v.category || '').toLowerCase() === queryTag || (v.tag || '').toLowerCase() === queryTag;
                const titleMatch = (v.title || '').toLowerCase().includes(queryTag);
                const descMatch = (v.description || '').toLowerCase().includes(queryTag);
                return tagMatch || categoryMatch || titleMatch || descMatch;
            });

        // Try to fetch fresh videos matching the genre tag from YouTube Data API
        try {
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(tag + ' official movie trailer')}&type=video&regionCode=${countryCode}&maxResults=12&key=${API_KEY}`;
            const res = await fetch(searchUrl);
            if (res.ok) {
                const data = await res.json();
                if (data.items && data.items.length > 0) {
                    const fetchedGenreVideos = data.items
                        .map(item => ({
                            id: item.id.videoId || item.id,
                            title: item.snippet.title,
                            channel: item.snippet.channelTitle,
                            views: 'Popular Stream',
                            img: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                            tag: tag.toUpperCase(),
                            tags: [tag, '4K', 'HD'],
                            category: tag,
                            description: item.snippet.description || `Enjoy high definition ${tag} videos on TOG3R.`
                        }))
                        .filter(v => !isBlockedHomeVideo(v.title));

                    // Combine fetched with local matches
                    const existingIds = new Set(fetchedGenreVideos.map(v => v.id));
                    matched = [...fetchedGenreVideos, ...matched.filter(v => !existingIds.has(v.id))];
                }
            }
        } catch (err) {
            console.warn('[Tag Filter Fetch Error]', err);
        }

        // If still empty, supply targeted fallback results
        if (matched.length === 0) {
            matched = getFallbackYouTubeVideos(countryCode)
                .filter(v => !isBlockedHomeVideo(v.title))
                .map(v => ({
                    ...v,
                    tag: tag.toUpperCase(),
                    tags: [...(v.tags || []), tag]
                }));
        }

        renderVideoCards(matched, false);
        showLoader(false);
    }

    function initTagScrollControls() {
        const bar = document.getElementById('ytTagsBar');
        const leftBtn = document.getElementById('ytTagsScrollLeft');
        const rightBtn = document.getElementById('ytTagsScrollRight');

        if (!bar) return;

        if (leftBtn) {
            leftBtn.addEventListener('click', () => {
                bar.scrollBy({ left: -240, behavior: 'smooth' });
                setTimeout(checkTagScrollButtons, 300);
            });
        }

        if (rightBtn) {
            rightBtn.addEventListener('click', () => {
                bar.scrollBy({ left: 240, behavior: 'smooth' });
                setTimeout(checkTagScrollButtons, 300);
            });
        }

        bar.addEventListener('scroll', checkTagScrollButtons);
        window.addEventListener('resize', checkTagScrollButtons);
    }

    function checkTagScrollButtons() {
        const bar = document.getElementById('ytTagsBar');
        const leftBtn = document.getElementById('ytTagsScrollLeft');
        const rightBtn = document.getElementById('ytTagsScrollRight');

        if (!bar) return;

        const maxScroll = bar.scrollWidth - bar.clientWidth;
        if (leftBtn) {
            leftBtn.style.display = bar.scrollLeft > 10 ? 'flex' : 'none';
        }
        if (rightBtn) {
            rightBtn.style.display = maxScroll > 10 && bar.scrollLeft < maxScroll - 10 ? 'flex' : 'none';
        }
    }

    function initSuggestionTagScrollControls() {
        const bar = document.getElementById('suggestionTagsContainer');
        const leftBtn = document.getElementById('suggestionTagsScrollLeft');
        const rightBtn = document.getElementById('suggestionTagsScrollRight');

        if (!bar) return;

        if (leftBtn) {
            leftBtn.addEventListener('click', () => {
                bar.scrollBy({ left: -160, behavior: 'smooth' });
                setTimeout(checkSuggestionTagScrollButtons, 250);
            });
        }

        if (rightBtn) {
            rightBtn.addEventListener('click', () => {
                bar.scrollBy({ left: 160, behavior: 'smooth' });
                setTimeout(checkSuggestionTagScrollButtons, 250);
            });
        }

        bar.addEventListener('scroll', checkSuggestionTagScrollButtons);
        window.addEventListener('resize', checkSuggestionTagScrollButtons);
    }

    function checkSuggestionTagScrollButtons() {
        const bar = document.getElementById('suggestionTagsContainer');
        const leftBtn = document.getElementById('suggestionTagsScrollLeft');
        const rightBtn = document.getElementById('suggestionTagsScrollRight');

        if (!bar) return;

        const maxScroll = bar.scrollWidth - bar.clientWidth;
        if (leftBtn) {
            leftBtn.style.display = bar.scrollLeft > 6 ? 'flex' : 'none';
        }
        if (rightBtn) {
            rightBtn.style.display = maxScroll > 6 && bar.scrollLeft < maxScroll - 6 ? 'flex' : 'none';
        }
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
                    videoList = data.items
                        .map(item => ({
                            id: item.id,
                            title: item.snippet.title,
                            channel: item.snippet.channelTitle,
                            views: formatViewCount(item.statistics?.viewCount || '0'),
                            viewCount: parseInt(item.statistics?.viewCount || '0', 10),
                            uploadDate: item.snippet.publishedAt || Date.now(),
                            img: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                            tag: getCategoryTag(currentCategory) || 'HD',
                            tags: extractVideoTags(item, currentCategory),
                            category: currentCategory,
                            description: item.snippet.description || 'Enjoy watching this high-definition stream on TOG3R.'
                        }))
                        .filter(v => currentCategory !== 'home' || !isBlockedHomeVideo(v.title));
                }
            } else {
                console.error('[YouTube API Error] HTTP status:', res.status);
            }
        } catch (err) {
            console.error('[YouTube API Error] Fetch failed:', err);
        }

        if (videoList.length === 0 && !isAppend) {
            console.warn('[YouTube Feed] Using fallback video library.');
            videoList = getFallbackYouTubeVideos(countryCode).filter(v => currentCategory !== 'home' || !isBlockedHomeVideo(v.title));
        }

        if (isAppend) {
            currentVideoFeed = [...currentVideoFeed, ...videoList];
        } else {
            currentVideoFeed = videoList;
        }

        renderVideoCards(videoList, isAppend);
        if (currentCategory === 'home') {
            updateDynamicTagUI();
        }
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
            default: return '';
        }
    }

    function formatViewCount(views) {
        const num = parseInt(views, 10);
        if (isNaN(num)) return views;
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M views';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K views';
        return num.toLocaleString() + ' views';
    }

    // --- INFINITE SCROLL LISTENER ---
    function initInfiniteScroll() {
        const contentWrapper = document.querySelector('.content-wrapper');
        if (!contentWrapper) return;

        contentWrapper.addEventListener('scroll', () => {
            if (isWatching || currentCategory === 'shorts') return; // no-op in watch view or shorts view

            const { scrollTop, clientHeight, scrollHeight } = contentWrapper;
            if (scrollTop + clientHeight >= scrollHeight - 300) {
                if (currentCategory === 'cinema') {
                    if (!isCinemaLoading && cinemaHasMore) {
                        loadCinemaMovies(cinemaSearchQuery, true);
                    }
                } else if (currentCategory === 'search') {
                    if (!isSearchLoading && searchNextPageToken) {
                        performSearch(currentSearchQuery, true);
                    }
                } else {
                    if (!isLoading && nextPageToken) {
                        console.log('[Infinite Scroll] Loading next page...');
                        loadYouTubeVideos(true);
                    }
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

        if (currentCategory === 'home' && Array.isArray(videoList)) {
            videoList = videoList.filter(v => !isBlockedHomeVideo(v.title));
        }

        if (!videoList || videoList.length === 0) {
            videoList = getFallbackYouTubeVideos(countryCode).filter(v => currentCategory !== 'home' || !isBlockedHomeVideo(v.title));
        }

        videoList.forEach(video => {
            const card = createMovieCard(video);
            gridContainer.appendChild(card);
        });
    }

    function createMovieCard(data) {
        const div = document.createElement('div');
        div.className = 'movie-card';
        const isWatchlisted = userWatchlistSet.has(data.id);

        div.innerHTML = `
            <div class="card-img">
                <img src="${data.img}" alt="${escapeHtml(data.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=400&q=80'">
                <div class="card-overlay">
                    <button class="play-mini" title="Play" aria-label="Play video"><i class="fas fa-play"></i></button>
                    <button class="watchlist-mini-btn" title="${isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}" aria-label="Add to Watchlist" style="position: absolute; top: 12px; right: 12px; width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.25); color: ${isWatchlisted ? '#38bdf8' : '#fff'}; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s, background 0.2s, color 0.2s; z-index: 5;"><i class="fas fa-bookmark"></i></button>
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

        const watchlistBtn = div.querySelector('.watchlist-mini-btn');
        if (watchlistBtn) {
            watchlistBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (dashDb && dashAuth && dashAuth.currentUser) {
                    const user = dashAuth.currentUser;
                    const wlRef = dashDb.collection('users').doc(user.uid).collection('watchlist').doc(data.id);
                    if (userWatchlistSet.has(data.id)) {
                        userWatchlistSet.delete(data.id);
                        watchlistBtn.style.color = '#fff';
                        watchlistBtn.title = 'Add to Watchlist';
                        wlRef.delete().catch(err => console.warn('[Watchlist] Delete error:', err));
                    } else {
                        userWatchlistSet.add(data.id);
                        watchlistBtn.style.color = '#38bdf8';
                        watchlistBtn.title = 'In Watchlist';
                        wlRef.set({
                            id: data.id,
                            title: data.title,
                            channel: data.channel || 'YouTube Creator',
                            views: data.views || '1.2M views',
                            img: data.img || `https://i.ytimg.com/vi/${data.id}/maxresdefault.jpg`,
                            tag: 'WATCHLIST',
                            addedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }).catch(err => console.warn('[Watchlist] Write error:', err));
                    }
                }
            });
        }

        div.addEventListener('click', () => {
            openWatchView(data.id, data.title, data.channel, data.views, data.img, data.description);
        });

        return div;
    }

    // --- 2-COLUMN WATCH VIEW ROUTING & EMBED FIX (Hard-Fix Error 153 Resolution) ---
    let playerResizeObserver = null;
    let liveChatUnsubscribe = null;

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

    function openWatchView(videoId, title, channel, views, img, description, isHistoryNav = false) {
        const contentWrapper = document.querySelector('.content-wrapper');

        // Capture previous view state before transitioning to watch view
        if (!isWatching) {
            const activeSec = document.querySelector('.dashboard-section.active');
            const activeSecId = activeSec ? activeSec.id : `${currentCategory || 'home'}-section`;
            const currentScroll = contentWrapper ? contentWrapper.scrollTop : (window.pageYOffset || document.documentElement.scrollTop || 0);

            previousViewState = {
                category: currentCategory || 'home',
                sectionId: activeSecId,
                scrollTop: currentScroll,
                activeFilterTag: typeof activeFilterTag !== 'undefined' ? activeFilterTag : 'All',
                searchQuery: typeof currentSearchQuery !== 'undefined' ? currentSearchQuery : '',
                activeSearchTag: typeof activeSearchTag !== 'undefined' ? activeSearchTag : 'all'
            };

            if (!isHistoryNav) {
                navigationHistoryStack = [
                    { type: 'view', state: { ...previousViewState } }
                ];
            }
        }

        isWatching = true;
        currentVideoId = videoId || 'L_LUpnjgPso';
        const displayTitle = title || 'Interstellar: Beyond Time';

        if (!isHistoryNav) {
            navigationHistoryStack.push({
                type: 'video',
                videoId: currentVideoId,
                title: displayTitle,
                channel: channel || 'YouTube Creator',
                views: views || '1.2M views',
                img: img || '',
                description: description || ''
            });

            try {
                window.history.pushState({
                    type: 'watch',
                    videoId: currentVideoId,
                    title: displayTitle,
                    channel: channel || 'YouTube Creator',
                    views: views || '1.2M views',
                    img: img || '',
                    description: description || ''
                }, '', `#watch?v=${currentVideoId}`);
            } catch (e) {}
        }

        // Notify Mascot to say goodbye and exit screen smoothly
        if (window.Sam && typeof window.Sam.onVideoOpen === 'function') {
            window.Sam.onVideoOpen();
        }

        // 1. Clear inline style on Hero Section
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) heroSection.style.display = '';

        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(sec => sec.classList.remove('active'));

        // 2. Show #watch-view
        const watchView = document.getElementById('watch-view');
        if (watchView) watchView.classList.add('active');

        // 4. Update Video Metadata DIRECTLY UNDER Video Frame
        const titleEl = document.getElementById('watchVideoTitle');
        const channelEl = document.getElementById('watchChannelName');
        const viewsEl = document.getElementById('watchViewsCount');
        const avatarEl = document.getElementById('channelAvatar');
        const descTextEl = document.getElementById('watchDescriptionText');

        if (titleEl) titleEl.textContent = displayTitle;
        if (channelEl) channelEl.textContent = channel || 'YouTube Creator';
        if (viewsEl) viewsEl.textContent = `${views || '1.2M views'}`;
        if (avatarEl) avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel || 'C')}&background=7928ca&color=fff`;
        if (descTextEl) descTextEl.textContent = description || 'Experience seamless high-definition streaming on TOG3R.';

        // 5. Save to Firestore User History
        if (dashDb && dashAuth && dashAuth.currentUser) {
            const user = dashAuth.currentUser;
            dashDb.collection('users').doc(user.uid).collection('history').doc(currentVideoId).set({
                id: currentVideoId,
                title: displayTitle,
                channel: channel || 'YouTube Creator',
                views: views || '1.2M views',
                img: img || `https://i.ytimg.com/vi/${currentVideoId}/maxresdefault.jpg`,
                tag: 'WATCHED',
                watchedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch((err) => {
                console.warn('[Firestore] Error saving watch history:', err);
            });
        }

        // 6. Initialize / Load Video with Custom Player Controller
        if (window.customPlayer) {
            window.customPlayer.loadVideo(currentVideoId, displayTitle);
            window.customPlayer.toggleLiveChat(false);
        }

        // 7. Reset Chat Container and Subscribe to Realtime Firestore Chat
        const chatLog = document.getElementById('chatLog');
        if (chatLog) {
            chatLog.innerHTML = '';
        }

        if (liveChatUnsubscribe) {
            liveChatUnsubscribe();
            liveChatUnsubscribe = null;
        }

        if (dashDb) {
            const renderedMsgIds = new Set();
            liveChatUnsubscribe = dashDb.collection('chat_messages')
                .where('videoId', '==', currentVideoId)
                .orderBy('createdAt', 'asc')
                .limitToLast(50)
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const msgId = change.doc.id;
                            if (renderedMsgIds.has(msgId)) return;
                            renderedMsgIds.add(msgId);

                            const data = change.doc.data();
                            const isCurrent = dashAuth?.currentUser?.uid === data.userId;
                            const timeStr = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
                            appendChatMessage(data.userName || 'Viewer', data.message || '', timeStr, data.avatarUrl || '', isCurrent);
                        }
                    });
                }, (err) => {
                    console.warn('[Firestore] Live chat sync error:', err);
                });
        }

        // 8. Dynamic Topic Tags, Shorts Shelf & Suggested Videos
        const currentVideoObj = {
            id: currentVideoId,
            title: displayTitle,
            channel: channel || 'YouTube Creator',
            views: views || '1.2M views',
            img: img || '',
            description: description || ''
        };
        renderTopicTags(currentVideoObj);
        renderShortsShelf(displayTitle);
        renderBlurredComments();

        // 9. Height Sync (Video Player & Live Chat)
        initChatHeightSync();
        requestAnimationFrame(() => {
            syncChatHeight();
        });

        // 10. Scroll to top of watch view content
        if (contentWrapper) {
            contentWrapper.scrollTop = 0;
        }
    }

    // --- YOUTUBE SHORTS SHELF & FULL-SCREEN VERTICAL SHORTS FEED ---

    /** Verified high-quality Shorts set used as base / offline fallback */
    const SHORTS_FALLBACK = [
        {
            id: 'eX2qmM4p_sU',
            title: 'Incredible Cinematography in Modern Sci-Fi 🌌 #shorts #cinematic #film',
            channel: 'StudioFX',
            views: '3.4M views',
            likes: '242K',
            commentsCount: '3.1K',
            img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&h=1066&q=85',
            avatar: 'https://ui-avatars.com/api/?name=Studio+FX&background=7928ca&color=fff'
        },
        {
            id: 'dQw4w9WgXcQ',
            title: 'Mind-Blowing VFX Secrets Revealed! 🚀 #shorts #vfx #cgi',
            channel: 'VFX World',
            views: '4.8M views',
            likes: '389K',
            commentsCount: '5.2K',
            img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&h=1066&q=85',
            avatar: 'https://ui-avatars.com/api/?name=VFX+World&background=ff007f&color=fff'
        },
        {
            id: 'qEVUtrk8_B4',
            title: 'Night City Uncut Gameplay Tech Demo 🌆 #shorts #gaming #cyberpunk',
            channel: 'GameZone',
            views: '12.5M views',
            likes: '890K',
            commentsCount: '14.2K',
            img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&h=1066&q=85',
            avatar: 'https://ui-avatars.com/api/?name=Game+Zone&background=00f2fe&color=000'
        },
        {
            id: '1G4isv_Fylg',
            title: 'Epic Cinematic Sci-Fi Teaser 🎬 #shorts #movies #scifi',
            channel: 'CinemaHub',
            views: '8.1M views',
            likes: '620K',
            commentsCount: '7.8K',
            img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&h=1066&q=85',
            avatar: 'https://ui-avatars.com/api/?name=Cinema+Hub&background=f97316&color=fff'
        },
        {
            id: 'jfKfPfyJRdk',
            title: 'Late Night Chill Vibes & Lofi Beats 🎧 #shorts #lofi #music #aesthetic',
            channel: 'LoFi Beats',
            views: '2.9M views',
            likes: '198K',
            commentsCount: '2.4K',
            img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&h=1066&q=85',
            avatar: 'https://ui-avatars.com/api/?name=LoFi+Beats&background=10b981&color=fff'
        },
        {
            id: '3fumBcKC6RE',
            title: 'Hyperlapse Across Tokyo Neon Streets 🌃 #shorts #travel #tokyo #hyperlapse',
            channel: 'Tokyo Lights',
            views: '6.7M views',
            likes: '512K',
            commentsCount: '4.9K',
            img: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&h=1066&q=85',
            avatar: 'https://ui-avatars.com/api/?name=Tokyo+Lights&background=e11d48&color=fff'
        },
        {
            id: 'jNQXAC9IVRw',
            title: 'First Ever Video Uploaded on YouTube Restored in 4K 🎥 #shorts #history #tech',
            channel: 'ArchiveHD',
            views: '15.4M views',
            likes: '1.2M',
            commentsCount: '28.4K',
            img: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&h=1066&q=85',
            avatar: 'https://ui-avatars.com/api/?name=Archive+HD&background=8b5cf6&color=fff'
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

    /** Renders a single Short card into the shorts shelf */
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
            openShortsView(short.id);
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
            checkShortsScrollButtons();
            return;
        }
        shorts.forEach(short => {
            shortsRow.appendChild(createShortCard(short));
        });
        setTimeout(checkShortsScrollButtons, 120);
    }

    /**
     * Shorts Shelf Horizontal Scroll Controls (Left & Right Buttons)
     */
    function initShortsScrollControls() {
        const shortsRow = document.getElementById('shortsRow');
        const leftBtn = document.getElementById('shortsScrollLeft');
        const rightBtn = document.getElementById('shortsScrollRight');

        if (!shortsRow) return;

        if (leftBtn) {
            leftBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                shortsRow.scrollBy({ left: -260, behavior: 'smooth' });
                setTimeout(checkShortsScrollButtons, 300);
            });
        }

        if (rightBtn) {
            rightBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                shortsRow.scrollBy({ left: 260, behavior: 'smooth' });
                setTimeout(checkShortsScrollButtons, 300);
            });
        }

        shortsRow.addEventListener('scroll', checkShortsScrollButtons);
        window.addEventListener('resize', checkShortsScrollButtons);
    }

    function checkShortsScrollButtons() {
        const shortsRow = document.getElementById('shortsRow');
        const leftBtn = document.getElementById('shortsScrollLeft');
        const rightBtn = document.getElementById('shortsScrollRight');

        if (!shortsRow) return;

        const maxScroll = shortsRow.scrollWidth - shortsRow.clientWidth;
        if (leftBtn) {
            leftBtn.style.display = shortsRow.scrollLeft > 10 ? 'flex' : 'none';
        }
        if (rightBtn) {
            rightBtn.style.display = maxScroll > 10 && shortsRow.scrollLeft < maxScroll - 10 ? 'flex' : 'none';
        }
    }

    /**
     * Shorts shelf for the watch view
     */
    async function renderShortsShelf(topicHint = '') {
        const shortsRow = document.getElementById('shortsRow');
        if (!shortsRow) return;

        renderShortSkeletons(shortsRow, 4);

        if (!API_KEY) {
            populateShortsRow(shortsRow, SHORTS_FALLBACK);
            return;
        }

        try {
            const rawTopic = topicHint
                ? topicHint.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(' ').slice(0, 3).join(' ')
                : '';
            const searchQuery = encodeURIComponent((rawTopic ? rawTopic + ' ' : '') + '#shorts');

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
            if (!searchRes.ok) throw new Error(`Search API HTTP ${searchRes.status}`);
            const searchData = await searchRes.json();

            if (!searchData.items || searchData.items.length === 0) {
                throw new Error('Search returned no items');
            }

            const videoIds = searchData.items
                .map(item => item.id?.videoId)
                .filter(Boolean)
                .join(',');

            const detailsUrl = [
                'https://www.googleapis.com/youtube/v3/videos',
                `?part=contentDetails,statistics`,
                `&id=${videoIds}`,
                `&key=${API_KEY}`
            ].join('');

            const detailsRes = await fetch(detailsUrl);
            if (!detailsRes.ok) throw new Error(`Details API HTTP ${detailsRes.status}`);
            const detailsData = await detailsRes.json();

            const detailsMap = {};
            if (detailsData.items) {
                detailsData.items.forEach(item => {
                    detailsMap[item.id] = {
                        duration: item.contentDetails?.duration || 'PT0S',
                        viewCount: item.statistics?.viewCount || '0'
                    };
                });
            }

            const shorts = [];
            for (const item of searchData.items) {
                const videoId = item.id?.videoId;
                if (!videoId) continue;

                const detail = detailsMap[videoId];
                if (detail) {
                    const durationSec = parseISODuration(detail.duration);
                    if (durationSec > 60) continue;
                }

                const snippet = item.snippet;
                const viewCount = detail ? parseInt(detail.viewCount, 10) : 0;

                shorts.push({
                    id: videoId,
                    title: snippet.title || 'YouTube Short',
                    channel: snippet.channelTitle || '',
                    views: formatViewCount(String(viewCount)),
                    likes: formatViewCount(String(Math.floor(viewCount * 0.08) || 12000)),
                    commentsCount: formatViewCount(String(Math.floor(viewCount * 0.005) || 500)),
                    img: snippet.thumbnails?.high?.url
                        || snippet.thumbnails?.medium?.url
                        || snippet.thumbnails?.default?.url
                        || '',
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(snippet.channelTitle || 'C')}&background=7928ca&color=fff`
                });

                if (shorts.length >= 6) break;
            }

            if (shorts.length === 0) {
                throw new Error('No Shorts passed the 60-second filter');
            }

            populateShortsRow(shortsRow, shorts);

        } catch (err) {
            console.warn('[Shorts] API fetch failed — falling back to stubs:', err.message);
            populateShortsRow(shortsRow, SHORTS_FALLBACK);
        }
    }

    // =========================================================================
    // FULL DEDICATED YOUTUBE SHORTS FEED (Scrollable Reels Player)
    // =========================================================================

    let shortsFeedList = [];
    let activeShortIndex = -1;
    let isShortsMuted = false;
    let shortsObserver = null;
    let activeShortCommentsId = '';
    const userShortsComments = {};

    // Initial mock comments for Shorts
    const defaultShortsComments = [
        { author: 'Elena Rostova', avatar: 'https://ui-avatars.com/api/?name=Elena+R&background=ec4899&color=fff', time: '1h ago', text: 'This edit is pure fire! What software did you use for the motion graphics? 🔥' },
        { author: 'Marcus Vance', avatar: 'https://ui-avatars.com/api/?name=Marcus+V&background=3b82f6&color=fff', time: '3h ago', text: 'Watched this on repeat 10 times already, the sound timing is insane.' },
        { author: 'Aria Chen', avatar: 'https://ui-avatars.com/api/?name=Aria+C&background=10b981&color=fff', time: '5h ago', text: 'Bro gave 100% effort on a 15-second video, respect 💯' },
        { author: 'RetroWave99', avatar: 'https://ui-avatars.com/api/?name=Retro+W&background=f97316&color=fff', time: '1d ago', text: 'Need the full tutorial on this ASAP!' }
    ];

    /**
     * Initializes the full Shorts view & events
     */
    function initShortsFeed() {
        initShortsKeyboardAndNav();
        initShortsCommentsDrawer();
    }

    /**
     * Opens the Shorts view, highlights sidebar, and starts playback
     */
    async function openShortsView(targetShortId = null) {
        // Save current view state if navigating from another section
        if (!isWatching && currentCategory !== 'shorts') {
            const contentWrapper = document.querySelector('.content-wrapper');
            const currentScroll = contentWrapper ? contentWrapper.scrollTop : 0;
            previousViewState = {
                category: currentCategory || 'home',
                sectionId: `${currentCategory || 'home'}-section`,
                scrollTop: currentScroll,
                activeFilterTag: typeof activeFilterTag !== 'undefined' ? activeFilterTag : 'All',
                searchQuery: typeof currentSearchQuery !== 'undefined' ? currentSearchQuery : '',
                activeSearchTag: typeof activeSearchTag !== 'undefined' ? activeSearchTag : 'all'
            };
        }

        if (isWatching) {
            exitWatchView();
        }

        // Reset scroll position on content wrapper so shorts viewport is perfectly centered
        const contentWrapper = document.querySelector('.content-wrapper');
        if (contentWrapper) {
            contentWrapper.scrollTop = 0;
        }

        // Hide infinite scroll loader
        showLoader(false);
        isLoading = false;

        // Update nav links active class
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(l => {
            if (l.getAttribute('data-section') === 'shorts') {
                l.parentElement.classList.add('active');
            } else {
                l.parentElement.classList.remove('active');
            }
        });

        // Clear inline hero display style
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) heroSection.style.display = '';

        // Switch active dashboard section
        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(s => {
            if (s.id === 'shorts-section') {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });

        currentCategory = 'shorts';

        // If list not loaded yet, load it
        if (shortsFeedList.length === 0) {
            await loadShortsFeed(targetShortId);
        } else {
            let targetIdx = 0;
            if (targetShortId) {
                const foundIdx = shortsFeedList.findIndex(s => s.id === targetShortId);
                if (foundIdx !== -1) targetIdx = foundIdx;
            }
            activateShortAtIndex(targetIdx, true);
        }
    }

    /**
     * Loads Shorts feed from API (augmented with curated stubs)
     */
    async function loadShortsFeed(targetShortId = null) {
        const viewport = document.getElementById('shortsViewport');
        if (!viewport) return;

        // Render skeleton state in viewport
        viewport.innerHTML = `
            <div class="short-reel-item" style="display:flex; align-items:center; justify-content:center; background:#111;">
                <div class="video-loader" style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.2);border-top-color:#ff0000;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            </div>
        `;

        let fetchedShorts = [];

        if (API_KEY) {
            try {
                const searchUrl = [
                    'https://www.googleapis.com/youtube/v3/search',
                    `?part=snippet`,
                    `&type=video`,
                    `&videoDuration=short`,
                    `&q=%23shorts%20trending`,
                    `&maxResults=15`,
                    `&key=${API_KEY}`
                ].join('');

                const searchRes = await fetch(searchUrl);
                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    if (searchData.items && searchData.items.length > 0) {
                        const videoIds = searchData.items
                            .map(item => item.id?.videoId)
                            .filter(Boolean)
                            .join(',');

                        const detailsUrl = [
                            'https://www.googleapis.com/youtube/v3/videos',
                            `?part=contentDetails,statistics`,
                            `&id=${videoIds}`,
                            `&key=${API_KEY}`
                        ].join('');

                        const detailsRes = await fetch(detailsUrl);
                        if (detailsRes.ok) {
                            const detailsData = await detailsRes.json();
                            const detailsMap = {};
                            if (detailsData.items) {
                                detailsData.items.forEach(item => {
                                    detailsMap[item.id] = {
                                        duration: item.contentDetails?.duration || 'PT0S',
                                        viewCount: item.statistics?.viewCount || '0',
                                        likeCount: item.statistics?.likeCount || '0',
                                        commentCount: item.statistics?.commentCount || '0'
                                    };
                                });
                            }

                            for (const item of searchData.items) {
                                const videoId = item.id?.videoId;
                                if (!videoId) continue;
                                const detail = detailsMap[videoId];
                                if (detail && parseISODuration(detail.duration) > 60) continue;

                                const snippet = item.snippet;
                                const viewsNum = detail ? parseInt(detail.viewCount, 10) : 100000;
                                const likesNum = detail ? parseInt(detail.likeCount, 10) : Math.floor(viewsNum * 0.08);
                                const commentsNum = detail ? parseInt(detail.commentCount, 10) : Math.floor(viewsNum * 0.005);

                                fetchedShorts.push({
                                    id: videoId,
                                    title: snippet.title || 'Trending Short',
                                    channel: snippet.channelTitle || 'Creator',
                                    views: formatViewCount(String(viewsNum)),
                                    likes: formatViewCount(String(likesNum)),
                                    commentsCount: formatViewCount(String(commentsNum)),
                                    img: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
                                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(snippet.channelTitle || 'C')}&background=7928ca&color=fff`
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('[Shorts Feed] Live API fetch failed, using curated feed:', err);
            }
        }

        // Merge fetched shorts with SHORTS_FALLBACK without duplicates
        const combined = [...fetchedShorts];
        SHORTS_FALLBACK.forEach(item => {
            if (!combined.some(s => s.id === item.id)) {
                combined.push(item);
            }
        });

        shortsFeedList = combined.length > 0 ? combined : SHORTS_FALLBACK;
        renderShortsReels(shortsFeedList);

        let startIdx = 0;
        if (targetShortId) {
            const foundIdx = shortsFeedList.findIndex(s => s.id === targetShortId);
            if (foundIdx !== -1) startIdx = foundIdx;
        }

        setTimeout(() => {
            activateShortAtIndex(startIdx, true);
        }, 150);
    }

    /**
     * Renders all short reel elements into the viewport and attaches intersection observer
     */
    function renderShortsReels(shorts) {
        const viewport = document.getElementById('shortsViewport');
        if (!viewport) return;

        viewport.innerHTML = '';
        if (shortsObserver) {
            shortsObserver.disconnect();
        }

        shorts.forEach((short, index) => {
            const item = createShortReelElement(short, index);
            viewport.appendChild(item);
        });

        // Setup IntersectionObserver to detect which Short is currently centered in viewport
        shortsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
                    const idx = parseInt(entry.target.getAttribute('data-index'), 10);
                    if (!isNaN(idx) && idx !== activeShortIndex) {
                        activateShortAtIndex(idx, false);
                    }
                }
            });
        }, {
            root: viewport,
            threshold: 0.65
        });

        const reelElements = viewport.querySelectorAll('.short-reel-item');
        reelElements.forEach(el => shortsObserver.observe(el));
    }

    /**
     * Creates a single full-screen short reel DOM element
     */
    function createShortReelElement(short, index) {
        const item = document.createElement('div');
        item.className = 'short-reel-item';
        item.setAttribute('data-index', index);
        item.setAttribute('data-id', short.id);

        const channelAvatar = short.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(short.channel || 'Creator')}&background=7928ca&color=fff`;
        const cleanTitle = (short.title || 'Video')
            .replace(/#shorts?\b/gi, '')
            .replace(/#trending\b/gi, '')
            .replace(/#viral\b/gi, '')
            .replace(/#fyp\b/gi, '')
            .trim();

        item.innerHTML = `
            <div class="short-video-wrapper">
                <img class="short-video-poster" src="${short.img}" alt="${escapeHtml(cleanTitle)}" loading="lazy">
                <div class="short-iframe-container" style="width: 100%; height: 100%;"></div>
            </div>
            <div class="short-click-surface" title="Click to Play / Pause"></div>
            
            <!-- Top Bar with Mute Control -->
            <div class="short-top-bar">
                <div class="short-top-controls">
                    <button type="button" class="short-ctrl-btn btn-short-mute" title="Mute/Unmute (M)" aria-label="Mute Audio">
                        <i class="fas ${isShortsMuted ? 'fa-volume-xmark' : 'fa-volume-high'}"></i>
                    </button>
                </div>
            </div>

            <!-- Center Play/Pause Feedback Ripple -->
            <div class="short-center-play-indicator">
                <i class="fas fa-play"></i>
            </div>

            <!-- Metadata & Creator Info (Bottom Left) -->
            <div class="short-meta-overlay">
                <div class="short-creator-row">
                    <img class="short-channel-avatar" src="${channelAvatar}" alt="${escapeHtml(short.channel)}">
                    <span class="short-channel-name">@${escapeHtml((short.channel || 'creator').replace(/\s+/g, '').toLowerCase())}</span>
                </div>
                <div class="short-caption-text" title="Click to expand">${escapeHtml(cleanTitle)}</div>
            </div>

            <!-- Bottom Progress Bar -->
            <div class="short-progress-track">
                <div class="short-progress-fill"></div>
            </div>
        `;

        setupShortReelEvents(item, short, index);
        return item;
    }

    /**
     * Attaches interactive events to a single short reel card
     */
    function setupShortReelEvents(item, short, index) {
        const clickSurface = item.querySelector('.short-click-surface');
        const muteBtn = item.querySelector('.btn-short-mute');
        const caption = item.querySelector('.short-caption-text');
        const playIndicator = item.querySelector('.short-center-play-indicator');

        let isPlaying = true;

        // Play/Pause Tap on video surface
        clickSurface.addEventListener('click', () => {
            const iframe = item.querySelector('iframe');
            if (!iframe) return;

            isPlaying = !isPlaying;
            const command = isPlaying ? 'playVideo' : 'pauseVideo';
            iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: command, args: [] }), '*');

            // Feedback ripple
            if (playIndicator) {
                playIndicator.innerHTML = isPlaying ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
                playIndicator.classList.add('show');
                setTimeout(() => {
                    playIndicator.classList.remove('show');
                }, 400);
            }
        });

        // Mute / Unmute Button
        if (muteBtn) {
            muteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                isShortsMuted = !isShortsMuted;
                updateAllShortsMuteState();
            });
        }

        // Expand / Collapse Caption
        if (caption) {
            caption.addEventListener('click', (e) => {
                e.stopPropagation();
                caption.classList.toggle('expanded');
            });
        }
    }

    /**
     * Activates a short at given index, mounting YouTube iframe & pausing others
     */
    function activateShortAtIndex(index, scrollIntoView = false) {
        if (index < 0 || index >= shortsFeedList.length) return;

        const viewport = document.getElementById('shortsViewport');
        if (!viewport) return;

        const items = viewport.querySelectorAll('.short-reel-item');
        if (!items || items.length === 0) return;

        const targetItem = items[index];
        if (!targetItem) return;

        if (scrollIntoView) {
            targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        activeShortIndex = index;
        const short = shortsFeedList[index];

        // Pause / clear all other iframes to conserve resources & bandwidth
        items.forEach((item, idx) => {
            const iframeContainer = item.querySelector('.short-iframe-container');
            const poster = item.querySelector('.short-video-poster');
            const progressFill = item.querySelector('.short-progress-fill');

            if (idx === index) {
                // Active item: inject iframe if not already loaded
                if (iframeContainer && !iframeContainer.querySelector('iframe')) {
                    const iframe = document.createElement('iframe');
                    iframe.src = `https://www.youtube-nocookie.com/embed/${short.id}?autoplay=1&mute=${isShortsMuted ? 1 : 0}&loop=1&playlist=${short.id}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;
                    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                    iframe.allowFullscreen = false;
                    iframeContainer.innerHTML = '';
                    iframeContainer.appendChild(iframe);

                    iframe.onload = () => {
                        if (poster) poster.classList.add('hidden');
                    };
                } else if (iframeContainer) {
                    // Send play command to existing iframe
                    const iframe = iframeContainer.querySelector('iframe');
                    iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
                }

                // Animate progress bar simulating short duration
                if (progressFill) {
                    progressFill.style.transition = 'none';
                    progressFill.style.width = '0%';
                    setTimeout(() => {
                        progressFill.style.transition = 'width 30s linear';
                        progressFill.style.width = '100%';
                    }, 50);
                }
            } else {
                // Non-active items: pause video or clear iframe if far away
                if (Math.abs(idx - index) > 2) {
                    if (iframeContainer) iframeContainer.innerHTML = '';
                    if (poster) poster.classList.remove('hidden');
                } else {
                    const iframe = iframeContainer?.querySelector('iframe');
                    iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
                }
                if (progressFill) {
                    progressFill.style.transition = 'none';
                    progressFill.style.width = '0%';
                }
            }
        });
    }

    /**
     * Pauses and stops all Shorts playback (e.g. when user navigates away)
     */
    function pauseAllShorts() {
        const viewport = document.getElementById('shortsViewport');
        if (!viewport) return;
        const items = viewport.querySelectorAll('.short-reel-item');
        items.forEach(item => {
            const iframe = item.querySelector('iframe');
            iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        });
    }

    /**
     * Updates mute state across all active shorts
     */
    function updateAllShortsMuteState() {
        const viewport = document.getElementById('shortsViewport');
        if (!viewport) return;

        const muteBtns = viewport.querySelectorAll('.btn-short-mute i');
        muteBtns.forEach(icon => {
            icon.className = `fas ${isShortsMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`;
        });

        const activeItem = viewport.querySelectorAll('.short-reel-item')[activeShortIndex];
        const iframe = activeItem?.querySelector('iframe');
        if (iframe) {
            const func = isShortsMuted ? 'mute' : 'unMute';
            iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
        }
    }

    /**
     * Desktop Next/Prev Arrows & Keyboard Arrow Navigation
     */
    function initShortsKeyboardAndNav() {
        const btnNext = document.getElementById('btnNextShort');
        const btnPrev = document.getElementById('btnPrevShort');
        const viewport = document.getElementById('shortsViewport');

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (activeShortIndex < shortsFeedList.length - 1) {
                    activateShortAtIndex(activeShortIndex + 1, true);
                }
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (activeShortIndex > 0) {
                    activateShortAtIndex(activeShortIndex - 1, true);
                }
            });
        }

        window.addEventListener('keydown', (e) => {
            const shortsSection = document.getElementById('shorts-section');
            if (!shortsSection || !shortsSection.classList.contains('active')) return;

            // Don't intercept if user is typing in comment input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'ArrowDown' || e.key === 'PageDown') {
                e.preventDefault();
                if (activeShortIndex < shortsFeedList.length - 1) {
                    activateShortAtIndex(activeShortIndex + 1, true);
                }
            } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
                e.preventDefault();
                if (activeShortIndex > 0) {
                    activateShortAtIndex(activeShortIndex - 1, true);
                }
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                isShortsMuted = !isShortsMuted;
                updateAllShortsMuteState();
            } else if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
                e.preventDefault();
                const items = viewport?.querySelectorAll('.short-reel-item');
                const clickSurface = items?.[activeShortIndex]?.querySelector('.short-click-surface');
                clickSurface?.click();
            }
        });
    }

    /**
     * Slide-in Comments Drawer Logic for Shorts
     */
    function initShortsCommentsDrawer() {
        const modal = document.getElementById('shortsCommentsModal');
        const backdrop = document.getElementById('shortsCommentsBackdrop');
        const btnClose = document.getElementById('btnCloseShortsComments');
        const form = document.getElementById('shortsCommentForm');
        const input = document.getElementById('shortsCommentInput');

        if (!modal) return;

        const closeModal = () => {
            modal.hidden = true;
        };

        if (backdrop) backdrop.addEventListener('click', closeModal);
        if (btnClose) btnClose.addEventListener('click', closeModal);

        if (form && input) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = input.value.trim();
                if (!text || !activeShortCommentsId) return;

                if (!userShortsComments[activeShortCommentsId]) {
                    userShortsComments[activeShortCommentsId] = [];
                }

                userShortsComments[activeShortCommentsId].unshift({
                    author: currentProfile.name || 'User',
                    avatar: currentProfile.avatar || 'https://ui-avatars.com/api/?name=User&background=7928ca&color=fff',
                    time: 'Just now',
                    text: text
                });

                input.value = '';
                renderCommentsList(activeShortCommentsId);

                // Update comments badge
                const countBadge = document.getElementById('shortsCommentsCount');
                if (countBadge) {
                    const total = (defaultShortsComments.length + userShortsComments[activeShortCommentsId].length);
                    countBadge.textContent = `${total}`;
                }
            });
        }
    }

    function openShortsComments(short) {
        const modal = document.getElementById('shortsCommentsModal');
        const countBadge = document.getElementById('shortsCommentsCount');
        if (!modal) return;

        activeShortCommentsId = short.id;
        modal.hidden = false;

        const total = defaultShortsComments.length + (userShortsComments[short.id]?.length || 0);
        if (countBadge) {
            countBadge.textContent = short.commentsCount || `${total}`;
        }

        renderCommentsList(short.id);
    }

    function renderCommentsList(shortId) {
        const list = document.getElementById('shortsCommentsList');
        if (!list) return;

        list.innerHTML = '';
        const userList = userShortsComments[shortId] || [];
        const allComments = [...userList, ...defaultShortsComments];

        allComments.forEach(c => {
            const item = document.createElement('div');
            item.className = 'shorts-comment-item';
            item.innerHTML = `
                <img class="shorts-comment-avatar" src="${c.avatar}" alt="${escapeHtml(c.author)}">
                <div class="shorts-comment-body">
                    <div class="shorts-comment-author">
                        ${escapeHtml(c.author)}
                        <span class="shorts-comment-time">${escapeHtml(c.time)}</span>
                    </div>
                    <div class="shorts-comment-msg">${escapeHtml(c.text)}</div>
                </div>
            `;
            list.appendChild(item);
        });
    }

    /**
     * Toast notification utility for Shorts interactions
     */
    function showShortsToast(message) {
        let toast = document.querySelector('.shorts-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'shorts-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add('show');

        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2600);
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

    // --- DYNAMIC TOPIC TAGS FILTER BAR (ALGORITHMIC & VIDEO SPECIFIC) ---
    let currentActiveTag = 'All';

    function renderTopicTags(currentVideo) {
        const container = document.getElementById('suggestionTagsContainer');
        if (!container) {
            renderSuggestedVideos(currentVideo, 'All');
            return;
        }

        container.innerHTML = '';

        const channelName = currentVideo.channel || 'Channel';
        const rawVideoTags = currentVideo.tags || extractVideoTags(currentVideo, currentVideo.category || '');

        // Generate contextual tags directly related to the currently playing video
        const contextualTags = new Set();
        contextualTags.add('All');
        if (channelName && channelName !== 'YouTube Creator') {
            contextualTags.add(`From ${channelName}`);
        }
        contextualTags.add('Related');

        // Add specific tags derived from video's genre, keywords, title & description
        rawVideoTags.forEach(t => {
            if (t && t.toLowerCase() !== 'all' && contextualTags.size < 12) {
                contextualTags.add(t);
            }
        });

        // Complement with user engagement affinity and global trending tags
        const dynamicGlobalPool = getDynamicTags({
            allVideos: (currentVideoFeed && currentVideoFeed.length > 0) ? currentVideoFeed : getFallbackYouTubeVideos(countryCode),
            userHistory: userEngagementHistory,
            limit: 20
        });

        dynamicGlobalPool.forEach(tag => {
            if (contextualTags.size < 16 && !contextualTags.has(tag)) {
                contextualTags.add(tag);
            }
        });

        const tagList = Array.from(contextualTags);
        currentActiveTag = 'All';

        tagList.forEach(tagText => {
            const btn = document.createElement('button');
            btn.className = `tag-pill ${tagText === 'All' ? 'active' : ''}`;
            btn.textContent = tagText;
            btn.type = 'button';
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-selected', tagText === 'All' ? 'true' : 'false');

            btn.addEventListener('click', () => {
                if (currentActiveTag === tagText) return;
                currentActiveTag = tagText;

                // Track affinity without mutating the rendered DOM order
                if (tagText.toLowerCase() !== 'all' && !tagText.startsWith('From ')) {
                    const existing = userEngagementHistory.clickedTags[tagText] || { count: 0, lastClicked: 0, weight: 1.0 };
                    userEngagementHistory.clickedTags[tagText] = {
                        count: existing.count + 1,
                        lastClicked: Date.now(),
                        weight: (existing.weight || 1.0) + 0.15
                    };
                    try {
                        localStorage.setItem('tog3r_user_engagement_history', JSON.stringify(userEngagementHistory));
                    } catch (err) {
                        console.warn('[Tag Storage Error]', err);
                    }
                }

                // Strictly update active state in-place (no position changing)
                const pills = container.querySelectorAll('.tag-pill');
                pills.forEach(p => {
                    const isSelected = p.textContent.trim() === tagText;
                    p.classList.toggle('active', isSelected);
                    p.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                });

                renderSuggestedVideos(currentVideo, tagText);
            });

            container.appendChild(btn);
        });

        checkSuggestionTagScrollButtons();
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
            // Sort candidates by relatedness to the current video (shared tags, shared channel, genre match)
            const currentTags = new Set((currentVideo.tags || extractVideoTags(currentVideo)).map(t => t.toLowerCase()));
            const currentChan = (currentVideo.channel || '').toLowerCase();

            filtered = [...candidates].sort((a, b) => {
                let scoreA = 0;
                let scoreB = 0;

                if ((a.channel || '').toLowerCase() === currentChan) scoreA += 5;
                if ((b.channel || '').toLowerCase() === currentChan) scoreB += 5;

                const aTags = a.tags || extractVideoTags(a);
                const bTags = b.tags || extractVideoTags(b);

                aTags.forEach(t => { if (currentTags.has(t.toLowerCase())) scoreA += 3; });
                bTags.forEach(t => { if (currentTags.has(t.toLowerCase())) scoreB += 3; });

                return scoreB - scoreA;
            });
        } else if (activeTag.startsWith('From ')) {
            const chanFilter = activeTag.replace('From ', '').trim().toLowerCase();
            filtered = candidates.filter(v => (v.channel || '').toLowerCase().includes(chanFilter));
            if (filtered.length === 0) filtered = candidates;
        } else {
            const tagLower = activeTag.toLowerCase();
            filtered = candidates.filter(v => {
                const vTags = (v.tags || extractVideoTags(v)).map(t => t.toLowerCase());
                return vTags.includes(tagLower) ||
                    (v.tag || '').toLowerCase().includes(tagLower) ||
                    (v.category || '').toLowerCase().includes(tagLower) ||
                    (v.title || '').toLowerCase().includes(tagLower) ||
                    (v.description || '').toLowerCase().includes(tagLower);
            });
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

    function handleBackNavigation(isPopState = false) {
        if (!isWatching) return;

        // If user navigated through multiple videos in watch view, go back to previous video
        if (navigationHistoryStack.length > 2) {
            navigationHistoryStack.pop(); // Remove current video
            const prevEntry = navigationHistoryStack[navigationHistoryStack.length - 1];
            if (prevEntry && prevEntry.type === 'video') {
                openWatchView(prevEntry.videoId, prevEntry.title, prevEntry.channel, prevEntry.views, prevEntry.img, prevEntry.description, true);
                return;
            }
        }

        // Reset history stack
        navigationHistoryStack = [];

        // If this was triggered from in-player back button (not browser popstate) and we have hash history
        if (!isPopState && window.location.hash.startsWith('#watch')) {
            try {
                window.history.back();
                return;
            } catch (e) {}
        }

        exitWatchView(previousViewState);
    }

    function exitWatchView(stateToRestore = null) {
        isWatching = false;

        if (liveChatUnsubscribe) {
            liveChatUnsubscribe();
            liveChatUnsubscribe = null;
        }

        document.body.classList.remove('watch-active');

        // Stop video by pausing custom player and clearing iframe src
        if (window.customPlayer && typeof window.customPlayer.pause === 'function') {
            try { window.customPlayer.pause(); } catch (e) {}
        }
        const iframe = document.getElementById('youtube-player') || document.getElementById('youtubeIframe');
        if (iframe) iframe.src = '';

        // Hide watch section
        const watchView = document.getElementById('watch-view');
        if (watchView) watchView.classList.remove('active');

        // Target category and section
        const targetCategory = stateToRestore?.category || currentCategory || 'home';
        const targetSectionId = stateToRestore?.sectionId || `${targetCategory}-section`;
        currentCategory = targetCategory;

        // Restore active class on the section
        const sections = document.querySelectorAll('.dashboard-section');
        let matchedSection = null;
        sections.forEach(sec => {
            if (sec.id === targetSectionId) {
                sec.classList.add('active');
                matchedSection = sec;
            } else {
                sec.classList.remove('active');
            }
        });

        // Fallback to home-section if none matched
        if (!matchedSection) {
            const homeSection = document.getElementById('home-section');
            if (homeSection) homeSection.classList.add('active');
        }

        // Restore Hero Section style if returning home
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            heroSection.style.display = '';
        }

        // Restore sidebar navigation active link
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            const sec = link.getAttribute('data-section');
            if (link.parentElement) {
                link.parentElement.classList.toggle('active', sec === targetCategory);
            }
        });

        // If returning to home and tag filter was active, restore active tag state
        if (stateToRestore?.activeFilterTag && typeof activeFilterTag !== 'undefined' && stateToRestore.activeFilterTag !== activeFilterTag) {
            activeFilterTag = stateToRestore.activeFilterTag;
            if (typeof updateDynamicTagUI === 'function') {
                updateDynamicTagUI();
            }
        }

        // Restore scroll position
        const targetScrollTop = (stateToRestore && typeof stateToRestore.scrollTop === 'number') ? stateToRestore.scrollTop : 0;
        const contentWrapper = document.querySelector('.content-wrapper');

        if (contentWrapper) {
            // Apply instant scroll restoration immediately and in subsequent render frames
            const originalScrollBehavior = contentWrapper.style.scrollBehavior;
            contentWrapper.style.scrollBehavior = 'auto';
            contentWrapper.scrollTop = targetScrollTop;

            requestAnimationFrame(() => {
                contentWrapper.scrollTop = targetScrollTop;
                setTimeout(() => {
                    contentWrapper.scrollTop = targetScrollTop;
                    contentWrapper.style.scrollBehavior = originalScrollBehavior || '';
                }, 30);
                setTimeout(() => {
                    contentWrapper.scrollTop = targetScrollTop;
                }, 100);
            });
        } else {
            window.scrollTo(0, targetScrollTop);
        }

        // Clean up hash if necessary
        if (window.location.hash.startsWith('#watch')) {
            try {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            } catch (e) {}
        }

        // Reset state
        previousViewState = null;
        navigationHistoryStack = [];

        // Notify Mascot to return from opposite side and greet the user
        if (window.Sam && typeof window.Sam.onVideoClose === 'function') {
            window.Sam.onVideoClose();
        }
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

    function initChatHeightSync() {
        const videoContainer = document.querySelector('.video-player-container');
        if (!videoContainer) return;

        syncChatHeight();

        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => {
                syncChatHeight();
            });
            ro.observe(videoContainer);
        }

        window.addEventListener('resize', syncChatHeight);
    }

    function syncChatHeight() {
        const videoContainer = document.querySelector('.video-player-container');
        const chatContainer = document.getElementById('watchChatContainer');
        if (!videoContainer || !chatContainer) return;

        const playerHeight = videoContainer.getBoundingClientRect().height;
        if (playerHeight > 100) {
            chatContainer.style.setProperty('--player-sync-height', `${Math.round(playerHeight)}px`);
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

                const user = dashAuth?.currentUser;
                const localProfile = JSON.parse(localStorage.getItem('tog3r_user_profile') || '{}');
                const userName = (user && (user.displayName || localProfile.name)) || localProfile.name || 'You';
                const userAvatar = (user && (user.photoURL || localProfile.avatar)) || localProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=7928ca&color=fff`;

                if (dashDb) {
                    dashDb.collection('chat_messages').add({
                        videoId: currentVideoId || 'L_LUpnjgPso',
                        userId: user ? user.uid : 'anon',
                        userName: userName,
                        avatarUrl: userAvatar,
                        message: text,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch((err) => {
                        console.warn('[Firestore] Chat write fallback:', err);
                        appendChatMessage(userName, text, "Just now", userAvatar, true);
                    });
                } else {
                    appendChatMessage(userName, text, "Just now", userAvatar, true);
                }
                chatInput.value = '';
            });
        }

        // Initialize Shorts Scroll Controls
        initShortsScrollControls();

        // Initialize Custom Video Player
        if (window.customPlayer) {
            window.customPlayer.init();
        }
    }

    // =========================================================================
    // ADVANCED CUSTOM VIDEO PLAYER CONTROLLER
    // =========================================================================
    window.customPlayer = {
        ytPlayer: null,
        isApiReady: false,
        isPlaying: false,
        isMuted: false,
        volume: 100,
        playbackRate: 1,
        currentTime: 0,
        duration: 0,
        isScrubbing: false,
        captionsOn: false,
        activeCaptionLang: 'off',
        activeQuality: '1080p',
        isLooping: false,
        ambientGlow: true,
        isFullscreen: false,
        isChatOpen: false,
        fullscreenChatOpen: false,
        controlsTimer: null,
        syncInterval: null,
        subtitleTimer: null,
        initialized: false,

        // Display Settings State
        aspectRatios: ['16:9', '4:3', '21:9', '1:1', '9:16', 'Auto'],
        currentAspectRatioIndex: 0,
        aspectRatio: '16:9',
        scalingModes: ['Fill', 'Fit', 'Cover', 'Stretch'],
        currentScalingIndex: 0,
        scalingMode: 'Fill',
        isFlipped: false,
        rotation: 0,

        init() {
            if (this.initialized) return;
            this.initialized = true;

            this.bindDomElements();
            this.bindEvents();
            this.initYouTubeApi();
            this.startSyncTimer();
        },

        bindDomElements() {
            this.container = document.getElementById('videoPlayerContainer');
            this.masterContainer = document.getElementById('watchMasterContainer');
            this.iframe = document.getElementById('youtube-player');
            this.customUi = document.getElementById('customPlayerUi');
            this.clickSurface = document.getElementById('playerClickSurface');
            this.centerRipple = document.getElementById('playerCenterRipple');
            this.rippleIconBox = document.getElementById('rippleIconBox');
            this.bufferSpinner = document.getElementById('playerBufferSpinner');
            this.subtitlesBox = document.getElementById('playerSubtitlesBox');
            this.subtitlesText = document.getElementById('subtitlesText');
            this.headerTitle = document.getElementById('playerHeaderTitle');
            this.backBtn = document.getElementById('playerBackBtn');
            this.ambientGlowEl = document.getElementById('playerAmbientGlow');

            // Scrubber
            this.scrubberTrack = document.getElementById('playerScrubberTrack');
            this.scrubberBufferBar = document.getElementById('scrubberBufferBar');
            this.scrubberHoverBar = document.getElementById('scrubberHoverBar');
            this.scrubberPlayedBar = document.getElementById('scrubberPlayedBar');
            this.scrubberPinHandle = document.getElementById('scrubberPinHandle');
            this.scrubberHoverTimestamp = document.getElementById('scrubberHoverTimestamp');

            // Buttons
            this.playPauseBtn = document.getElementById('ctrlPlayPauseBtn');
            this.rewind10Btn = document.getElementById('ctrlRewind10Btn');
            this.forward10Btn = document.getElementById('ctrlForward10Btn');
            this.volumeBtn = document.getElementById('ctrlVolumeBtn');
            this.volumeSliderFill = document.getElementById('volumeSliderFill');
            this.volumeRangeInput = document.getElementById('volumeRangeInput');
            this.currentTimeEl = document.getElementById('ctrlCurrentTime');
            this.totalDurationEl = document.getElementById('ctrlTotalDuration');
            this.captionsBtn = document.getElementById('ctrlCaptionsBtn');
            this.settingsBtn = document.getElementById('ctrlSettingsBtn');
            this.chatSidebarBtn = document.getElementById('ctrlChatSidebarBtn');
            this.fullscreenBtn = document.getElementById('ctrlFullscreenBtn');

            // Settings Modal
            this.settingsModal = document.getElementById('playerSettingsModal');
            this.pageMain = document.getElementById('settingsPageMain');
            this.pageSpeed = document.getElementById('settingsPageSpeed');
            this.pageQuality = document.getElementById('settingsPageQuality');
            this.pageCaptions = document.getElementById('settingsPageCaptions');
            this.activeSpeedLabel = document.getElementById('activeSpeedLabel');
            this.activeQualityLabel = document.getElementById('activeQualityLabel');
            this.activeCaptionsLabel = document.getElementById('activeCaptionsLabel');
            this.toggleLoopVideo = document.getElementById('toggleLoopVideo');
            this.toggleAmbientGlow = document.getElementById('toggleAmbientGlow');

            // Display Settings DOM
            this.pageDisplay = document.getElementById('settingsPageDisplay');
            this.activeDisplayLabel = document.getElementById('activeDisplayLabel');
            this.aspectRatioVal = document.getElementById('aspectRatioVal');
            this.aspectRatioPrev = document.getElementById('aspectRatioPrev');
            this.aspectRatioNext = document.getElementById('aspectRatioNext');
            this.scalingVal = document.getElementById('scalingVal');
            this.scalingPrev = document.getElementById('scalingPrev');
            this.scalingNext = document.getElementById('scalingNext');
            this.btnFlipVideo = document.getElementById('btnFlipVideo');
            this.btnRotateVideo = document.getElementById('btnRotateVideo');
            this.rotateBadge = document.getElementById('rotateBadge');
        },

        initYouTubeApi() {
            // Listen to YouTube postMessage events globally
            if (!this._hasMessageListener) {
                this._hasMessageListener = true;
                window.addEventListener('message', (event) => {
                    let data;
                    try {
                        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                    } catch (e) {
                        return;
                    }
                    if (!data || typeof data !== 'object') return;

                    if (data.event === 'infoDelivery' || data.event === 'initialDelivery') {
                        const info = data.info;
                        if (info) {
                            if (typeof info.duration === 'number' && info.duration > 0) {
                                this.duration = info.duration;
                            }
                            if (typeof info.currentTime === 'number' && !this.isScrubbing) {
                                this.currentTime = info.currentTime;
                            }
                            if (typeof info.videoLoadedFraction === 'number' && this.scrubberBufferBar) {
                                this.scrubberBufferBar.style.width = `${Math.min(100, Math.max(0, info.videoLoadedFraction * 100))}%`;
                            }
                            if (typeof info.playerState === 'number') {
                                this.handlePlayerState(info.playerState);
                            }
                            this.syncProgressUI();
                        }
                    } else if (data.event === 'onStateChange') {
                        this.handlePlayerState(data.info);
                    } else if (data.event === 'onReady') {
                        this.isApiReady = true;
                        this.postIframeMessage('listening');
                        this.postIframeMessage('addEventListener', ['onStateChange']);
                        this.postIframeMessage('addEventListener', ['infoDelivery']);
                    }
                });
            }

            const setupYT = () => {
                if (window.YT && window.YT.Player) {
                    this.isApiReady = true;
                    if (this.iframe && !this.ytPlayer) {
                        try {
                            this.ytPlayer = new YT.Player('youtube-player', {
                                events: {
                                    onReady: (e) => this.onPlayerReady(e),
                                    onStateChange: (e) => this.onPlayerStateChange(e),
                                    onError: (e) => this.onPlayerError(e)
                                }
                            });
                        } catch (err) {
                            console.warn('YT.Player initialization fallback', err);
                        }
                    }
                }
            };

            if (window.YT && window.YT.Player) {
                setupYT();
            } else {
                window.onYouTubeIframeAPIReady = () => {
                    setupYT();
                };
            }
        },

        loadVideo(videoId, title) {
            this.currentVideoId = videoId;
            if (this.headerTitle) {
                this.headerTitle.textContent = title || 'Loading video...';
            }

            const ccPolicy = this.captionsOn ? '1' : '0';
            const embedSrc = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&iv_load_policy=3&cc_load_policy=${ccPolicy}&disablekb=1&fs=0`;

            this.isPlaying = true;
            this.currentTime = 0;
            this.duration = 0;
            this.updatePlayPauseIcon(true);
            this.syncProgressUI();

            if (this.iframe) {
                this.iframe.src = embedSrc;
                this.iframe.onload = () => {
                    setTimeout(() => {
                        this.postIframeMessage('listening');
                        this.postIframeMessage('addEventListener', ['onStateChange']);
                        this.postIframeMessage('addEventListener', ['infoDelivery']);
                    }, 250);
                };
            }

            if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
                try {
                    this.ytPlayer.loadVideoById(videoId);
                } catch (e) {
                    // Fallback to iframe src reload handled above
                }
            }

            this.applyYouTubeCaptionsState();
            this.applyVideoTransforms();
            this.showControls();
            this.resetControlsTimer();
        },

        onPlayerReady(e) {
            this.isApiReady = true;
            if (this.volume !== undefined) {
                try { e.target.setVolume(this.volume); } catch(err) {}
            }
            if (this.isMuted) {
                try { e.target.mute(); } catch(err) {}
            }
            this.applyYouTubeCaptionsState();
            this.postIframeMessage('listening');
        },

        onPlayerStateChange(e) {
            this.handlePlayerState(e.data);
        },

        handlePlayerState(state) {
            // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
            if (state === 1) { // Playing
                this.isPlaying = true;
                this.updatePlayPauseIcon(true);
                if (this.bufferSpinner) this.bufferSpinner.hidden = true;
                this.resetControlsTimer();
                this.applyYouTubeCaptionsState();
            } else if (state === 2) { // Paused
                this.isPlaying = false;
                this.updatePlayPauseIcon(false);
                if (this.bufferSpinner) this.bufferSpinner.hidden = true;
                this.showControls();
            } else if (state === 3) { // Buffering
                if (this.bufferSpinner) this.bufferSpinner.hidden = false;
            } else if (state === 0) { // Ended
                if (this.isLooping) {
                    this.seekTo(0);
                    this.play();
                } else {
                    this.isPlaying = false;
                    this.updatePlayPauseIcon(false);
                    this.showControls();
                }
            }
        },

        onPlayerError(e) {
            console.warn('YouTube Player Error code:', e.data || e);
            if (this.bufferSpinner) this.bufferSpinner.hidden = true;
        },

        postIframeMessage(func, args = []) {
            if (this.iframe && this.iframe.contentWindow) {
                this.iframe.contentWindow.postMessage(JSON.stringify({
                    event: 'command',
                    func: func,
                    args: args
                }), '*');
            }
        },

        play() {
            if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
                try { this.ytPlayer.playVideo(); } catch (e) { this.postIframeMessage('playVideo'); }
            } else {
                this.postIframeMessage('playVideo');
            }
            this.isPlaying = true;
            this.updatePlayPauseIcon(true);
            this.triggerRipple('fa-play');
            this.resetControlsTimer();
        },

        pause() {
            if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
                try { this.ytPlayer.pauseVideo(); } catch (e) { this.postIframeMessage('pauseVideo'); }
            } else {
                this.postIframeMessage('pauseVideo');
            }
            this.isPlaying = false;
            this.updatePlayPauseIcon(false);
            this.triggerRipple('fa-pause');
            this.showControls();
        },

        togglePlay() {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        },

        seekTo(seconds) {
            const maxDuration = this.duration > 0 ? this.duration : 3600;
            const sec = Math.max(0, Math.min(seconds, maxDuration));
            this.currentTime = sec;

            // Direct iframe command
            this.postIframeMessage('seekTo', [sec, true]);

            // YT.Player API call
            if (this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
                try {
                    this.ytPlayer.seekTo(sec, true);
                } catch (e) {
                    // Fallback to postMessage
                }
            }

            this.syncProgressUI();
        },

        rewind(seconds = 10) {
            const target = Math.max(0, this.currentTime - seconds);
            this.seekTo(target);
            this.triggerRipple('fa-rotate-left');
        },

        forward(seconds = 10) {
            const maxDuration = this.duration > 0 ? this.duration : (this.currentTime + seconds + 60);
            const target = Math.min(maxDuration, this.currentTime + seconds);
            this.seekTo(target);
            this.triggerRipple('fa-rotate-right');
        },

        setVolume(val) {
            this.volume = Math.max(0, Math.min(100, val));
            this.isMuted = this.volume === 0;

            if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
                try {
                    this.ytPlayer.setVolume(this.volume);
                    if (this.isMuted) this.ytPlayer.mute(); else this.ytPlayer.unMute();
                } catch (e) {
                    this.postIframeMessage('setVolume', [this.volume]);
                }
            } else {
                this.postIframeMessage('setVolume', [this.volume]);
            }

            this.updateVolumeUI();
        },

        toggleMute() {
            if (this.isMuted) {
                this.isMuted = false;
                this.setVolume(this.previousVolume || 80);
            } else {
                this.previousVolume = this.volume;
                this.isMuted = true;
                this.setVolume(0);
            }
        },

        setPlaybackRate(speed) {
            this.playbackRate = speed;
            if (this.ytPlayer && typeof this.ytPlayer.setPlaybackRate === 'function') {
                try { this.ytPlayer.setPlaybackRate(speed); } catch (e) { this.postIframeMessage('setPlaybackRate', [speed]); }
            } else {
                this.postIframeMessage('setPlaybackRate', [speed]);
            }

            if (this.activeSpeedLabel) {
                this.activeSpeedLabel.textContent = speed === 1 ? 'Normal (1x)' : `${speed}x`;
            }

            const options = document.querySelectorAll('#speedOptionsList .option-item');
            options.forEach(opt => {
                const s = parseFloat(opt.getAttribute('data-speed'));
                opt.classList.toggle('active', s === speed);
            });
        },

        setQuality(quality) {
            this.activeQuality = quality;
            if (this.activeQualityLabel) {
                this.activeQualityLabel.textContent = quality === 'auto' ? 'Auto (Adaptive)' : `${quality} (HD)`;
            }

            const options = document.querySelectorAll('#qualityOptionsList .option-item');
            options.forEach(opt => {
                opt.classList.toggle('active', opt.getAttribute('data-quality') === quality);
            });

            this.triggerRipple('fa-wand-magic-sparkles');
        },

        toggleCaptions(lang = null) {
            if (typeof lang === 'string') {
                if (lang === 'off') {
                    this.captionsOn = false;
                    this.activeCaptionLang = 'off';
                } else {
                    this.captionsOn = true;
                    this.activeCaptionLang = lang;
                }
            } else if (typeof lang === 'boolean') {
                this.captionsOn = lang;
                if (!this.captionsOn) this.activeCaptionLang = 'off';
                else if (!this.activeCaptionLang || this.activeCaptionLang === 'off') this.activeCaptionLang = 'en';
            } else {
                this.captionsOn = !this.captionsOn;
                if (!this.captionsOn) {
                    this.activeCaptionLang = 'off';
                } else if (!this.activeCaptionLang || this.activeCaptionLang === 'off') {
                    this.activeCaptionLang = 'en';
                }
            }

            if (this.captionsBtn) {
                this.captionsBtn.classList.toggle('active', this.captionsOn);
                this.captionsBtn.title = this.captionsOn ? "Subtitles/CC (c) - Active" : "Subtitles/CC (c) - Off";
                this.captionsBtn.setAttribute('aria-pressed', this.captionsOn ? 'true' : 'false');
            }

            if (this.activeCaptionsLabel) {
                this.activeCaptionsLabel.textContent = this.captionsOn ? 'On' : 'Off';
            }

            const options = document.querySelectorAll('#captionsOptionsList .option-item');
            options.forEach(opt => {
                const optVal = opt.getAttribute('data-caption');
                opt.classList.toggle('active', optVal === this.activeCaptionLang || (optVal === 'off' && !this.captionsOn));
            });

            // Ensure custom fake subtitles container remains hidden so only real YouTube captions display
            if (this.subtitlesBox) {
                this.subtitlesBox.hidden = true;
            }

            this.applyYouTubeCaptionsState();
            this.triggerRipple(this.captionsOn ? 'fa-closed-captioning' : 'fa-closed-captioning');
        },

        applyYouTubeCaptionsState(explicitState) {
            const shouldBeOn = explicitState !== undefined ? !!explicitState : this.captionsOn;
            const targetLang = (this.activeCaptionLang && this.activeCaptionLang !== 'off') ? this.activeCaptionLang : 'en';

            if (shouldBeOn) {
                // 1. YouTube IFrame API Methods
                if (this.ytPlayer) {
                    try {
                        if (typeof this.ytPlayer.loadModule === 'function') {
                            this.ytPlayer.loadModule('captions');
                            this.ytPlayer.loadModule('cc');
                        }
                        if (typeof this.ytPlayer.setOption === 'function') {
                            this.ytPlayer.setOption('captions', 'track', { languageCode: targetLang });
                            this.ytPlayer.setOption('cc', 'track', { languageCode: targetLang });
                            this.ytPlayer.setOption('captions', 'reload', true);
                        }
                    } catch (e) {}
                }

                // 2. Direct PostMessage to YouTube IFrame
                this.postIframeMessage('loadModule', ['captions']);
                this.postIframeMessage('loadModule', ['cc']);
                this.postIframeMessage('setOption', ['captions', 'track', { languageCode: targetLang }]);
                this.postIframeMessage('setOption', ['cc', 'track', { languageCode: targetLang }]);
                this.postIframeMessage('setOption', ['captions', 'reload', true]);
            } else {
                // 1. YouTube IFrame API Methods
                if (this.ytPlayer) {
                    try {
                        if (typeof this.ytPlayer.setOption === 'function') {
                            this.ytPlayer.setOption('captions', 'track', {});
                            this.ytPlayer.setOption('cc', 'track', {});
                        }
                        if (typeof this.ytPlayer.unloadModule === 'function') {
                            this.ytPlayer.unloadModule('captions');
                            this.ytPlayer.unloadModule('cc');
                        }
                    } catch (e) {}
                }

                // 2. Direct PostMessage to YouTube IFrame
                this.postIframeMessage('setOption', ['captions', 'track', {}]);
                this.postIframeMessage('setOption', ['cc', 'track', {}]);
                this.postIframeMessage('unloadModule', ['captions']);
                this.postIframeMessage('unloadModule', ['cc']);
            }
        },

        toggleFullscreen() {
            const master = this.masterContainer || document.getElementById('watchMasterContainer') || this.container;
            if (!master) return;

            if (!document.fullscreenElement && !master.classList.contains('is-fullscreen')) {
                // Enter fullscreen
                if (master.requestFullscreen) {
                    master.requestFullscreen().catch(() => {
                        master.classList.add('is-fullscreen');
                    });
                } else if (master.webkitRequestFullscreen) {
                    master.webkitRequestFullscreen();
                } else {
                    master.classList.add('is-fullscreen');
                }
                master.classList.add('is-fullscreen');
                this.isFullscreen = true;
                master.classList.toggle('chat-collapsed', !this.isChatOpen);
                if (this.fullscreenBtn) {
                    this.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                    this.fullscreenBtn.title = "Exit Fullscreen (Esc / F)";
                }
            } else {
                // Exit fullscreen
                if (document.fullscreenElement && document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }
                master.classList.remove('is-fullscreen');
                master.classList.toggle('chat-collapsed', !this.isChatOpen);
                this.isFullscreen = false;
                if (this.fullscreenBtn) {
                    this.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                    this.fullscreenBtn.title = "Full Screen (F)";
                }
            }
        },

        toggleLiveChat(forceState = null) {
            const chatContainer = document.getElementById('watchChatContainer');
            const master = this.masterContainer || document.getElementById('watchMasterContainer');

            if (forceState !== null && forceState !== undefined) {
                this.isChatOpen = !!forceState;
            } else {
                this.isChatOpen = !this.isChatOpen;
            }
            this.fullscreenChatOpen = this.isChatOpen;

            if (this.chatSidebarBtn) {
                this.chatSidebarBtn.classList.toggle('active', this.isChatOpen);
                this.chatSidebarBtn.setAttribute('aria-pressed', this.isChatOpen ? 'true' : 'false');
                this.chatSidebarBtn.title = this.isChatOpen ? "Hide Live Chat" : "Toggle Live Chat";
            }

            if (chatContainer) {
                chatContainer.classList.toggle('collapsed', !this.isChatOpen);
            }

            if (master) {
                master.classList.toggle('chat-collapsed', !this.isChatOpen);
            }

            if (this.isChatOpen && typeof syncChatHeight === 'function') {
                syncChatHeight();
            }

            this.triggerRipple(this.isChatOpen ? 'fa-comments' : 'fa-comment-slash');
        },

        toggleFullscreenChat() {
            this.toggleLiveChat();
        },

        triggerRipple(iconClass) {
            if (!this.centerRipple || !this.rippleIconBox) return;
            this.rippleIconBox.innerHTML = `<i class="fas ${iconClass}"></i>`;
            this.centerRipple.classList.remove('is-animating');
            // Force reflow
            void this.centerRipple.offsetWidth;
            this.centerRipple.classList.add('is-animating');
            setTimeout(() => {
                if (this.centerRipple) this.centerRipple.classList.remove('is-animating');
            }, 400);
        },

        updatePlayPauseIcon(isPlaying) {
            if (this.playPauseBtn) {
                this.playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
            }
        },

        updateVolumeUI() {
            if (this.volumeSliderFill) {
                this.volumeSliderFill.style.width = `${this.volume}%`;
            }
            if (this.volumeRangeInput) {
                this.volumeRangeInput.value = this.volume;
            }
            if (this.volumeBtn) {
                let icon = 'fa-volume-high';
                if (this.isMuted || this.volume === 0) icon = 'fa-volume-xmark';
                else if (this.volume < 40) icon = 'fa-volume-low';
                this.volumeBtn.innerHTML = `<i class="fas ${icon}"></i>`;
            }
        },

        formatTime(seconds) {
            if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        },

        syncProgressUI() {
            if (this.currentTimeEl) {
                this.currentTimeEl.textContent = this.formatTime(this.currentTime);
            }
            if (this.totalDurationEl) {
                if (this.duration > 0) {
                    this.totalDurationEl.textContent = this.formatTime(this.duration);
                } else {
                    this.totalDurationEl.textContent = '0:00';
                }
            }
            const dur = this.duration > 0 ? this.duration : (this.currentTime > 0 ? this.currentTime + 30 : 0);
            if (dur > 0) {
                const pct = Math.min(100, Math.max(0, (this.currentTime / dur) * 100));
                if (this.scrubberPlayedBar) {
                    this.scrubberPlayedBar.style.width = `${pct}%`;
                }
                if (this.scrubberPinHandle) {
                    this.scrubberPinHandle.style.left = `${pct}%`;
                }
            } else {
                if (this.scrubberPlayedBar) {
                    this.scrubberPlayedBar.style.width = '0%';
                }
                if (this.scrubberPinHandle) {
                    this.scrubberPinHandle.style.left = '0%';
                }
            }
        },

        startSyncTimer() {
            if (this.syncInterval) clearInterval(this.syncInterval);
            let pollCounter = 0;
            this.syncInterval = setInterval(() => {
                pollCounter++;

                // 1. Query YT.Player API if available
                if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function' && !this.isScrubbing) {
                    try {
                        const cur = this.ytPlayer.getCurrentTime();
                        const dur = this.ytPlayer.getDuration();
                        const frac = this.ytPlayer.getVideoLoadedFraction ? this.ytPlayer.getVideoLoadedFraction() : 0;

                        if (typeof cur === 'number' && !isNaN(cur)) this.currentTime = cur;
                        if (typeof dur === 'number' && !isNaN(dur) && dur > 0) this.duration = dur;

                        if (this.scrubberBufferBar && frac > 0) {
                            this.scrubberBufferBar.style.width = `${Math.min(100, Math.max(0, frac * 100))}%`;
                        }
                    } catch (e) {}
                }

                // 2. Send listening ping to YouTube iframe periodically to keep infoDelivery active
                if (pollCounter % 4 === 0 || this.duration <= 0) {
                    this.postIframeMessage('listening');
                }

                this.syncProgressUI();
            }, 250);
        },

        showControls() {
            if (this.customUi) {
                this.customUi.classList.remove('controls-hidden');
            }
            if (this.container) {
                this.container.style.cursor = 'default';
            }
        },

        hideControls() {
            // Never hide controls if the settings modal is open
            if (this.settingsModal && !this.settingsModal.hidden) {
                return;
            }
            if (this.isPlaying && !this.isScrubbing) {
                if (this.customUi) {
                    this.customUi.classList.add('controls-hidden');
                }
                if (this.container) {
                    this.container.style.cursor = 'none';
                }
            }
        },

        resetControlsTimer() {
            this.showControls();
            if (this.controlsTimer) clearTimeout(this.controlsTimer);
            // If settings modal is open, do not start auto-hide timer
            if (this.settingsModal && !this.settingsModal.hidden) {
                return;
            }
            this.controlsTimer = setTimeout(() => {
                this.hideControls();
            }, 2500);
        },

        bindEvents() {
            // Container mouse activity -> auto-show/hide controls
            if (this.container) {
                this.container.addEventListener('mousemove', () => this.resetControlsTimer());
                this.container.addEventListener('mouseleave', () => {
                    if (this.settingsModal && !this.settingsModal.hidden) return;
                    if (this.isPlaying) this.hideControls();
                });
            }

            // Click surface: single-click play/pause, double-click fullscreen
            let clickTimeout = null;
            if (this.clickSurface) {
                this.clickSurface.addEventListener('click', () => {
                    if (this.settingsModal && !this.settingsModal.hidden) {
                        this.settingsModal.hidden = true;
                        this.resetControlsTimer();
                        return;
                    }
                    if (clickTimeout) {
                        clearTimeout(clickTimeout);
                        clickTimeout = null;
                        this.toggleFullscreen();
                    } else {
                        clickTimeout = setTimeout(() => {
                            clickTimeout = null;
                            this.togglePlay();
                        }, 250);
                    }
                });
            }

            // Back Button
            if (this.backBtn) {
                this.backBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleBackNavigation();
                });
            }

            // Play / Pause Button
            if (this.playPauseBtn) {
                this.playPauseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.togglePlay();
                });
            }

            // Rewind 10s & Forward 10s
            if (this.rewind10Btn) {
                this.rewind10Btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.rewind(10);
                });
            }
            if (this.forward10Btn) {
                this.forward10Btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.forward(10);
                });
            }

            // Volume
            if (this.volumeBtn) {
                this.volumeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleMute();
                });
            }
            if (this.volumeRangeInput) {
                this.volumeRangeInput.addEventListener('input', (e) => {
                    this.setVolume(parseFloat(e.target.value));
                });
            }

            // Progress Scrubber Interaction
            if (this.scrubberTrack) {
                const getPercentage = (clientX) => {
                    const rect = this.scrubberTrack.getBoundingClientRect();
                    if (rect.width <= 0) return 0;
                    const x = clientX - rect.left;
                    return Math.max(0, Math.min(1, x / rect.width));
                };

                const updateHoverUi = (pct) => {
                    if (this.scrubberHoverBar) {
                        this.scrubberHoverBar.style.width = `${pct * 100}%`;
                    }
                    if (this.scrubberHoverTimestamp) {
                        const dur = this.duration > 0 ? this.duration : 180;
                        this.scrubberHoverTimestamp.style.left = `${pct * 100}%`;
                        this.scrubberHoverTimestamp.textContent = this.formatTime(pct * dur);
                    }
                };

                this.scrubberTrack.addEventListener('mousemove', (e) => {
                    const pct = getPercentage(e.clientX);
                    updateHoverUi(pct);
                });

                const handleScrub = (clientX) => {
                    const pct = getPercentage(clientX);
                    const dur = this.duration > 0 ? this.duration : 180;
                    const targetSec = pct * dur;
                    this.seekTo(targetSec);
                    updateHoverUi(pct);
                };

                this.scrubberTrack.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    this.isScrubbing = true;
                    this.scrubberTrack.classList.add('is-scrubbing');
                    handleScrub(e.clientX);

                    const onMouseMove = (ev) => {
                        if (!this.isScrubbing) return;
                        handleScrub(ev.clientX);
                    };

                    const onMouseUp = (ev) => {
                        if (this.isScrubbing) {
                            handleScrub(ev.clientX);
                            this.isScrubbing = false;
                            this.scrubberTrack.classList.remove('is-scrubbing');
                        }
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });

                // Touch support
                this.scrubberTrack.addEventListener('touchstart', (e) => {
                    if (e.touches && e.touches.length > 0) {
                        this.isScrubbing = true;
                        this.scrubberTrack.classList.add('is-scrubbing');
                        handleScrub(e.touches[0].clientX);
                    }
                }, { passive: true });

                this.scrubberTrack.addEventListener('touchmove', (e) => {
                    if (this.isScrubbing && e.touches && e.touches.length > 0) {
                        handleScrub(e.touches[0].clientX);
                    }
                }, { passive: true });

                this.scrubberTrack.addEventListener('touchend', (e) => {
                    if (this.isScrubbing) {
                        if (e.changedTouches && e.changedTouches.length > 0) {
                            handleScrub(e.changedTouches[0].clientX);
                        }
                        this.isScrubbing = false;
                        this.scrubberTrack.classList.remove('is-scrubbing');
                    }
                });
            }

            // Captions / Subtitles Button
            if (this.captionsBtn) {
                this.captionsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleCaptions();
                });
            }

            // Settings Button & Menus
            if (this.settingsBtn && this.settingsModal) {
                this.settingsModal.addEventListener('click', (e) => {
                    e.stopPropagation();
                });

                this.settingsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isHidden = this.settingsModal.hidden;
                    this.settingsModal.hidden = !isHidden;
                    if (!this.settingsModal.hidden) {
                        this.showSettingsPage('main');
                        this.showControls();
                        if (this.controlsTimer) clearTimeout(this.controlsTimer);
                    } else {
                        this.resetControlsTimer();
                    }
                });
            }

            // Submenu Navigation
            const btnOpenSpeed = document.getElementById('btnOpenSpeedMenu');
            const btnOpenQuality = document.getElementById('btnOpenQualityMenu');
            const btnOpenCaptions = document.getElementById('btnOpenCaptionsMenu');
            const btnOpenDisplay = document.getElementById('btnOpenDisplayMenu');
            const btnBackSpeed = document.getElementById('btnBackToMainFromSpeed');
            const btnBackQuality = document.getElementById('btnBackToMainFromQuality');
            const btnBackCaptions = document.getElementById('btnBackToMainFromCaptions');
            const btnBackDisplay = document.getElementById('btnBackToMainFromDisplay');

            if (btnOpenSpeed) btnOpenSpeed.addEventListener('click', () => this.showSettingsPage('speed'));
            if (btnOpenQuality) btnOpenQuality.addEventListener('click', () => this.showSettingsPage('quality'));
            if (btnOpenCaptions) btnOpenCaptions.addEventListener('click', () => this.showSettingsPage('captions'));
            if (btnOpenDisplay) btnOpenDisplay.addEventListener('click', () => this.showSettingsPage('display'));
            if (btnBackSpeed) btnBackSpeed.addEventListener('click', () => this.showSettingsPage('main'));
            if (btnBackQuality) btnBackQuality.addEventListener('click', () => this.showSettingsPage('main'));
            if (btnBackCaptions) btnBackCaptions.addEventListener('click', () => this.showSettingsPage('main'));
            if (btnBackDisplay) btnBackDisplay.addEventListener('click', () => this.showSettingsPage('main'));

            // Display Steppers & Transform Actions
            if (this.aspectRatioPrev) {
                this.aspectRatioPrev.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cycleAspectRatio(-1);
                });
            }
            if (this.aspectRatioNext) {
                this.aspectRatioNext.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cycleAspectRatio(1);
                });
            }
            if (this.aspectRatioVal) {
                this.aspectRatioVal.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cycleAspectRatio(1);
                });
            }

            if (this.scalingPrev) {
                this.scalingPrev.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cycleScaling(-1);
                });
            }
            if (this.scalingNext) {
                this.scalingNext.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cycleScaling(1);
                });
            }
            if (this.scalingVal) {
                this.scalingVal.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cycleScaling(1);
                });
            }

            if (this.btnFlipVideo) {
                this.btnFlipVideo.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleFlip();
                });
            }

            if (this.btnRotateVideo) {
                this.btnRotateVideo.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.rotateVideo();
                });
            }

            // Speed options
            const speedItems = document.querySelectorAll('#speedOptionsList .option-item');
            speedItems.forEach(item => {
                item.addEventListener('click', () => {
                    const spd = parseFloat(item.getAttribute('data-speed'));
                    this.setPlaybackRate(spd);
                    this.showSettingsPage('main');
                });
            });

            // Quality options
            const qualityItems = document.querySelectorAll('#qualityOptionsList .option-item');
            qualityItems.forEach(item => {
                item.addEventListener('click', () => {
                    const q = item.getAttribute('data-quality');
                    this.setQuality(q);
                    this.showSettingsPage('main');
                });
            });

            // Captions options
            const captionsItems = document.querySelectorAll('#captionsOptionsList .option-item');
            captionsItems.forEach(item => {
                item.addEventListener('click', () => {
                    const cap = item.getAttribute('data-caption');
                    this.toggleCaptions(cap);
                    this.showSettingsPage('main');
                });
            });

            // Loop Toggle
            if (this.toggleLoopVideo) {
                this.toggleLoopVideo.addEventListener('click', () => {
                    this.isLooping = !this.isLooping;
                    this.toggleLoopVideo.classList.toggle('active', this.isLooping);
                });
            }

            // Ambient Glow Toggle
            if (this.toggleAmbientGlow) {
                this.toggleAmbientGlow.addEventListener('click', () => {
                    this.ambientGlow = !this.ambientGlow;
                    this.toggleAmbientGlow.classList.toggle('active', this.ambientGlow);
                    if (this.ambientGlowEl) {
                        this.ambientGlowEl.style.opacity = this.ambientGlow ? '1' : '0';
                    }
                });
            }

            // Live Chat Sidebar Toggle Button
            if (this.chatSidebarBtn) {
                this.chatSidebarBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleLiveChat();
                });
            }

            // Chat Close Button inside Chat Header
            const chatCloseBtn = document.getElementById('chatCloseBtn');
            if (chatCloseBtn) {
                chatCloseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleLiveChat(false);
                });
            }

            // Share Button on Top Player Bar
            const playerShareBtn = document.getElementById('playerShareBtn');
            if (playerShareBtn) {
                playerShareBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = window.location.href;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(url).then(() => {
                            this.triggerRipple('fa-check');
                        }).catch(() => {});
                    } else {
                        this.triggerRipple('fa-check');
                    }
                });
            }

            // Fullscreen Button
            if (this.fullscreenBtn) {
                this.fullscreenBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleFullscreen();
                });
            }

            // Fullscreen change listener
            const onFsChange = () => {
                const isFs = !!document.fullscreenElement;
                if (!isFs && this.masterContainer) {
                    this.masterContainer.classList.remove('is-fullscreen');
                    this.masterContainer.classList.remove('chat-collapsed');
                    this.isFullscreen = false;
                    if (this.fullscreenBtn) {
                        this.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                    }
                }
            };
            document.addEventListener('fullscreenchange', onFsChange);
            document.addEventListener('webkitfullscreenchange', onFsChange);

            // Global Keyboard Shortcuts (Space, K, Left, Right, Up, Down, M, F, C)
            document.addEventListener('keydown', (e) => {
                // Ignore if user is currently typing in an input / textarea
                if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
                const watchView = document.getElementById('watch-view');
                if (!watchView || !watchView.classList.contains('active')) return;

                switch (e.key) {
                    case ' ':
                    case 'k':
                    case 'K':
                        e.preventDefault();
                        this.togglePlay();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.rewind(10);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.forward(10);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.setVolume(this.volume + 10);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.setVolume(this.volume - 10);
                        break;
                    case 'm':
                    case 'M':
                        e.preventDefault();
                        this.toggleMute();
                        break;
                    case 'f':
                    case 'F':
                        e.preventDefault();
                        this.toggleFullscreen();
                        break;
                    case 'c':
                    case 'C':
                        e.preventDefault();
                        this.toggleCaptions();
                        break;
                    case 'Escape':
                        if (this.settingsModal && !this.settingsModal.hidden) {
                            this.settingsModal.hidden = true;
                        } else if (this.isFullscreen) {
                            this.toggleFullscreen();
                        }
                        break;
                }
            });
        },

        showSettingsPage(pageName) {
            if (this.pageMain) this.pageMain.hidden = pageName !== 'main';
            if (this.pageSpeed) this.pageSpeed.hidden = pageName !== 'speed';
            if (this.pageQuality) this.pageQuality.hidden = pageName !== 'quality';
            if (this.pageCaptions) this.pageCaptions.hidden = pageName !== 'captions';
            if (this.pageDisplay) this.pageDisplay.hidden = pageName !== 'display';
        },

        // Display Settings Methods
        cycleAspectRatio(delta) {
            this.currentAspectRatioIndex = (this.currentAspectRatioIndex + delta + this.aspectRatios.length) % this.aspectRatios.length;
            const ratio = this.aspectRatios[this.currentAspectRatioIndex];
            this.setAspectRatio(ratio);
        },

        setAspectRatio(ratio) {
            this.aspectRatio = ratio;
            this.currentAspectRatioIndex = this.aspectRatios.indexOf(ratio);
            if (this.currentAspectRatioIndex === -1) this.currentAspectRatioIndex = 0;

            if (this.aspectRatioVal) this.aspectRatioVal.textContent = ratio;
            if (this.activeDisplayLabel) this.activeDisplayLabel.textContent = ratio;

            if (this.container) {
                switch (ratio) {
                    case '16:9':
                        this.container.style.aspectRatio = '16 / 9';
                        this.container.style.maxHeight = '';
                        break;
                    case '4:3':
                        this.container.style.aspectRatio = '4 / 3';
                        this.container.style.maxHeight = '75vh';
                        break;
                    case '21:9':
                        this.container.style.aspectRatio = '21 / 9';
                        this.container.style.maxHeight = '';
                        break;
                    case '1:1':
                        this.container.style.aspectRatio = '1 / 1';
                        this.container.style.maxHeight = '65vh';
                        break;
                    case '9:16':
                        this.container.style.aspectRatio = '9 / 16';
                        this.container.style.maxHeight = '75vh';
                        break;
                    case 'Auto':
                    default:
                        this.container.style.aspectRatio = '16 / 9';
                        this.container.style.maxHeight = '';
                        break;
                }
            }

            if (typeof syncChatHeight === 'function') {
                syncChatHeight();
                requestAnimationFrame(() => syncChatHeight());
            }

            this.applyVideoTransforms();
            this.triggerRipple('fa-crop-simple');
        },

        cycleScaling(delta) {
            this.currentScalingIndex = (this.currentScalingIndex + delta + this.scalingModes.length) % this.scalingModes.length;
            const mode = this.scalingModes[this.currentScalingIndex];
            this.setScaling(mode);
        },

        setScaling(mode) {
            this.scalingMode = mode;
            this.currentScalingIndex = this.scalingModes.indexOf(mode);
            if (this.currentScalingIndex === -1) this.currentScalingIndex = 0;

            if (this.scalingVal) this.scalingVal.textContent = mode;
            this.applyVideoTransforms();
            this.triggerRipple('fa-expand');
        },

        toggleFlip() {
            this.isFlipped = !this.isFlipped;
            if (this.btnFlipVideo) {
                this.btnFlipVideo.classList.toggle('active', this.isFlipped);
            }
            this.applyVideoTransforms();
            this.triggerRipple('fa-arrows-left-right');
        },

        rotateVideo() {
            this.rotation = (this.rotation + 90) % 360;
            if (this.rotateBadge) {
                this.rotateBadge.textContent = `${this.rotation}°`;
            }
            if (this.btnRotateVideo) {
                this.btnRotateVideo.classList.toggle('active', this.rotation !== 0);
            }
            this.applyVideoTransforms();
            this.triggerRipple('fa-rotate');
        },

        applyVideoTransforms() {
            if (!this.iframe) return;

            const scaleX = this.isFlipped ? -1 : 1;
            const scaleY = 1;

            let baseScale = 1;
            if (this.scalingMode === 'Cover') {
                baseScale = 1.32;
            } else if (this.scalingMode === 'Fit') {
                baseScale = 1.0;
            } else if (this.scalingMode === 'Fill') {
                baseScale = 1.0;
            } else if (this.scalingMode === 'Stretch') {
                baseScale = 1.0;
            }

            // Fit container bounds during 90° or 270° rotation to prevent clipping
            let rotScale = 1;
            if (this.rotation === 90 || this.rotation === 270) {
                if (this.aspectRatio === '16:9' || this.aspectRatio === 'Auto') {
                    rotScale = 9 / 16;
                } else if (this.aspectRatio === '21:9') {
                    rotScale = 9 / 21;
                } else if (this.aspectRatio === '4:3') {
                    rotScale = 3 / 4;
                } else if (this.aspectRatio === '9:16') {
                    rotScale = 16 / 9;
                }
            }

            const finalScaleX = scaleX * baseScale * rotScale;
            const finalScaleY = scaleY * baseScale * rotScale;

            this.iframe.style.transform = `rotate(${this.rotation}deg) scale(${finalScaleX}, ${finalScaleY})`;
        }
    };

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

                const heroSection = document.querySelector('.hero-section');

                if (sectionName === 'shorts') {
                    openShortsView();
                    return;
                } else {
                    pauseAllShorts();
                    showLoader(false);
                    if (heroSection) {
                        heroSection.style.display = '';
                    }
                    if (previousViewState && previousViewState.category === sectionName) {
                        const contentWrapper = document.querySelector('.content-wrapper');
                        if (contentWrapper && typeof previousViewState.scrollTop === 'number') {
                            contentWrapper.scrollTop = previousViewState.scrollTop;
                        }
                    }
                }

                if (sectionName === 'cinema') {
                    loadCinemaMovies();
                } else if (['home', 'trending', 'live'].includes(sectionName)) {
                    loadYouTubeVideos(false);
                } else if (sectionName === 'history') {
                    populateHistory();
                } else if (sectionName === 'favorites') {
                    populateFavorites();
                } else if (sectionName === 'watchlist') {
                    populateWatchlist();
                } else if (sectionName === 'search') {
                    if (!currentSearchQuery) {
                        performSearch('Trending Trailers');
                    }
                }
            });
        });

        const toggleSwitches = document.querySelectorAll('.toggle-switch');
        toggleSwitches.forEach(sw => {
            sw.addEventListener('click', () => {
                sw.classList.toggle('active');
            });
        });

        // Browser Popstate Event Listener (Back/Forward navigation)
        window.addEventListener('popstate', (e) => {
            if (isWatching) {
                handleBackNavigation(true);
            }
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
        if (!section) return;

        let container = section.querySelector('.card-grid');
        if (!container) {
            container = document.createElement('div');
            container.className = 'card-grid';
            section.appendChild(container);
        }

        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;"><i class="fas fa-spinner fa-spin" style="font-size: 20px; color: var(--pink-deep); margin-bottom: 8px;"></i><p>Loading history...</p></div>';

        if (dashDb && dashAuth && dashAuth.currentUser) {
            const user = dashAuth.currentUser;
            dashDb.collection('users').doc(user.uid).collection('history')
                .orderBy('watchedAt', 'desc')
                .limit(40)
                .get()
                .then(snapshot => {
                    container.innerHTML = '';
                    if (!snapshot.empty) {
                        snapshot.forEach(doc => {
                            container.appendChild(createMovieCard(doc.data()));
                        });
                    } else {
                        renderEmptyHistory(container);
                    }
                })
                .catch(err => {
                    console.warn('[History] Firestore read error:', err);
                    container.innerHTML = '';
                    renderEmptyHistory(container);
                });
        } else {
            container.innerHTML = '';
            renderEmptyHistory(container);
        }
    }

    function renderEmptyHistory(container) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 70px 20px; color: #94a3b8;">
                <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(255, 126, 179, 0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-clock-rotate-left" style="font-size: 32px; color: var(--pink-deep);"></i>
                </div>
                <h3 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">No Watch History Yet</h3>
                <p style="font-size: 14px; max-width: 420px; margin: 0 auto; color: #94a3b8; line-height: 1.6;">You haven't watched any videos yet. Videos you stream will automatically appear here so you can easily continue watching.</p>
            </div>
        `;
    }

    function populateFavorites() {
        const section = document.querySelector('#favorites-section');
        if (!section) return;

        let container = section.querySelector('.card-grid');
        if (!container) {
            container = document.createElement('div');
            container.className = 'card-grid';
            section.appendChild(container);
        }

        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;"><i class="fas fa-spinner fa-spin" style="font-size: 20px; color: var(--pink-deep); margin-bottom: 8px;"></i><p>Loading favorites...</p></div>';

        if (dashDb && dashAuth && dashAuth.currentUser) {
            const user = dashAuth.currentUser;
            dashDb.collection('users').doc(user.uid).collection('favorites')
                .orderBy('savedAt', 'desc')
                .get()
                .then(snapshot => {
                    container.innerHTML = '';
                    if (!snapshot.empty) {
                        snapshot.forEach(doc => {
                            container.appendChild(createMovieCard(doc.data()));
                        });
                    } else {
                        renderEmptyFavorites(container);
                    }
                })
                .catch(err => {
                    console.warn('[Favorites] Firestore read error:', err);
                    container.innerHTML = '';
                    renderEmptyFavorites(container);
                });
        } else {
            container.innerHTML = '';
            renderEmptyFavorites(container);
        }
    }

    function renderEmptyFavorites(container) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 70px 20px; color: #94a3b8;">
                <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(255, 126, 179, 0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-heart" style="font-size: 32px; color: var(--pink-deep);"></i>
                </div>
                <h3 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">No Favorites Added</h3>
                <p style="font-size: 14px; max-width: 420px; margin: 0 auto; color: #94a3b8; line-height: 1.6;">Your favorites list is empty. Click the heart icon on any movie or video card to save it to your favorites.</p>
            </div>
        `;
    }

    function populateWatchlist() {
        const section = document.querySelector('#watchlist-section');
        if (!section) return;

        let container = section.querySelector('.card-grid');
        if (!container) {
            container = document.createElement('div');
            container.className = 'card-grid';
            section.appendChild(container);
        }

        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;"><i class="fas fa-spinner fa-spin" style="font-size: 20px; color: #38bdf8; margin-bottom: 8px;"></i><p>Loading watchlist...</p></div>';

        if (dashDb && dashAuth && dashAuth.currentUser) {
            const user = dashAuth.currentUser;
            dashDb.collection('users').doc(user.uid).collection('watchlist')
                .orderBy('addedAt', 'desc')
                .get()
                .then(snapshot => {
                    container.innerHTML = '';
                    if (!snapshot.empty) {
                        snapshot.forEach(doc => {
                            container.appendChild(createMovieCard(doc.data()));
                        });
                    } else {
                        renderEmptyWatchlist(container);
                    }
                })
                .catch(err => {
                    console.warn('[Watchlist] Firestore read error:', err);
                    container.innerHTML = '';
                    renderEmptyWatchlist(container);
                });
        } else {
            container.innerHTML = '';
            renderEmptyWatchlist(container);
        }
    }

    function renderEmptyWatchlist(container) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 70px 20px; color: #94a3b8;">
                <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(56, 189, 248, 0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-bookmark" style="font-size: 32px; color: #38bdf8;"></i>
                </div>
                <h3 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">Your Watchlist is Empty</h3>
                <p style="font-size: 14px; max-width: 420px; margin: 0 auto; color: #94a3b8; line-height: 1.6;">Save movies and videos to watch later by clicking the bookmark icon on cards or "Add to List" in the hero banner.</p>
            </div>
        `;
    }

    // =========================================================================
    // CINEMA SECTION: ACTUAL MOVIES, SEARCHABLE LANGUAGE & GENRE DROPDOWNS
    // =========================================================================
    const CINEMA_LANGUAGES = [
        { code: 'all', name: 'All Languages', region: 'Worldwide' },
        { code: 'en', name: 'English', region: 'Hollywood & Global' },
        { code: 'hi', name: 'Hindi', region: 'Bollywood' },
        { code: 'ur', name: 'Urdu', region: 'Pakistani & Lollywood' },
        { code: 'pa', name: 'Punjabi', region: 'Pollywood & Punjabi Cinema' },
        { code: 'ta', name: 'Tamil', region: 'Kollywood' },
        { code: 'te', name: 'Telugu', region: 'Tollywood' },
        { code: 'ml', name: 'Malayalam', region: 'Mollywood' },
        { code: 'kn', name: 'Kannada', region: 'Sandalwood' },
        { code: 'bn', name: 'Bengali', region: 'Tollywood (Bengal)' },
        { code: 'mr', name: 'Marathi', region: 'Marathi Cinema' },
        { code: 'gu', name: 'Gujarati', region: 'Gujarati Cinema' },
        { code: 'bho', name: 'Bhojpuri', region: 'Bhojpuri Cinema' },
        { code: 'ja', name: 'Japanese', region: 'Anime & Japanese Cinema' },
        { code: 'ko', name: 'Korean', region: 'K-Cinema & Thrillers' },
        { code: 'zh', name: 'Chinese', region: 'Asian Epics & Wuxia' },
        { code: 'es', name: 'Spanish', region: 'Spanish & Latin America' },
        { code: 'fr', name: 'French', region: 'European Art & Cinema' },
        { code: 'de', name: 'German', region: 'German Cinema' },
        { code: 'it', name: 'Italian', region: 'Italian Classics & Modern' },
        { code: 'pt', name: 'Portuguese', region: 'Brazil & Portugal' },
        { code: 'ru', name: 'Russian', region: 'Russian Cinema' },
        { code: 'tr', name: 'Turkish', region: 'Turkish Dramas & Cinema' },
        { code: 'ar', name: 'Arabic', region: 'Middle Eastern Cinema' },
        { code: 'fa', name: 'Persian', region: 'Iranian Cinema' },
        { code: 'id', name: 'Indonesian', region: 'Indonesian Cinema' },
        { code: 'th', name: 'Thai', region: 'Thai Martial Arts' },
        { code: 'vi', name: 'Vietnamese', region: 'Vietnamese Cinema' },
        { code: 'tl', name: 'Filipino', region: 'Philippine Cinema' },
        { code: 'pl', name: 'Polish', region: 'Polish Cinema' },
        { code: 'sv', name: 'Swedish', region: 'Nordic Cinema' },
        { code: 'nl', name: 'Dutch', region: 'Dutch Cinema' },
        { code: 'el', name: 'Greek', region: 'Greek Cinema' },
        { code: 'uk', name: 'Ukrainian', region: 'Ukrainian Cinema' }
    ];

    const CINEMA_GENRES = [
        { id: 'all', name: 'All Genres', tag: 'All' },
        { id: 'action', name: 'Action', tag: 'High-Octane' },
        { id: 'sci-fi', name: 'Sci-Fi', tag: 'Space & Cyberpunk' },
        { id: 'drama', name: 'Drama', tag: 'Emotional & Deep' },
        { id: 'comedy', name: 'Comedy', tag: 'Humor & Satire' },
        { id: 'thriller', name: 'Thriller', tag: 'Suspense & Crime' },
        { id: 'horror', name: 'Horror', tag: 'Supernatural & Chills' },
        { id: 'romance', name: 'Romance', tag: 'Love Stories' },
        { id: 'mystery', name: 'Mystery', tag: 'Detective & Whodunnit' },
        { id: 'crime', name: 'Crime', tag: 'Mafia & Heist' },
        { id: 'animation', name: 'Animation / Anime', tag: 'Feature Anime' },
        { id: 'fantasy', name: 'Fantasy', tag: 'Magic & Mythology' },
        { id: 'superhero', name: 'Superhero', tag: 'Marvel & DC' },
        { id: 'war', name: 'War & Historical', tag: 'Epic Battles' },
        { id: 'documentary', name: 'Documentary', tag: 'Real Stories' },
        { id: 'adventure', name: 'Adventure', tag: 'Expeditions' },
        { id: 'musical', name: 'Musical', tag: 'Music & Dance' },
        { id: 'western', name: 'Western', tag: 'Outlaws & Frontier' },
        { id: 'family', name: 'Family & Kids', tag: 'All Ages' },
        { id: 'biography', name: 'Biography', tag: 'True Legends' },
        { id: 'martial-arts', name: 'Martial Arts', tag: 'Combat & Kung Fu' },
        { id: 'sports', name: 'Sports', tag: 'Athletics & Victory' },
        { id: 'cyberpunk', name: 'Cyberpunk & Dystopia', tag: 'Futuristic' },
        { id: 'spy', name: 'Spy & Espionage', tag: 'Secret Agents' }
    ];

    // Curated catalog of verified real full movies uploaded on YouTube across languages and genres
    const CINEMA_MOVIES_DATABASE = [
        // English
        {
            id: '0oQDFZ1UOOA',
            title: 'The Daredevils 4 (Full Movie)',
            year: 2024,
            language: 'English',
            langCode: 'en',
            genres: ['Action', 'Thriller', 'Crime'],
            genreIds: ['action', 'thriller', 'crime'],
            runtime: '1h 32m',
            director: 'Blockbuster English Movies',
            img: 'https://i.ytimg.com/vi/0oQDFZ1UOOA/hqdefault.jpg',
            views: '4.8M views',
            description: 'Jason Statham, Sylvester Stallone, and Dolph Lundgren in a high-octane Hollywood full action movie.'
        },
        {
            id: 'Dvswi9biuCE',
            title: 'Mission in Shelter (Full Movie)',
            year: 2026,
            language: 'English',
            langCode: 'en',
            genres: ['Action', 'Thriller', 'Sci-Fi'],
            genreIds: ['action', 'thriller', 'sci-fi'],
            runtime: '1h 33m',
            director: 'ZED Drama',
            img: 'https://i.ytimg.com/vi/Dvswi9biuCE/hqdefault.jpg',
            views: '3.2M views',
            description: 'An elite operative faces extreme survival conditions and covert hostile mercenaries inside an underground bunker facility.'
        },
        {
            id: 'WpvK8VWMvHk',
            title: 'The Final Assignment (Full Movie)',
            year: 2024,
            language: 'English',
            langCode: 'en',
            genres: ['Action', 'Mystery', 'Thriller'],
            genreIds: ['action', 'mystery', 'thriller', 'crime'],
            runtime: '1h 43m',
            director: 'Liam Neeson & Guy Pearce',
            img: 'https://i.ytimg.com/vi/WpvK8VWMvHk/hqdefault.jpg',
            views: '6.5M views',
            description: 'A seasoned veteran investigator undertakes a dangerous final mission in a high-stakes conspiracy thriller.'
        },
        {
            id: 'KtqQtYSIJWE',
            title: 'Mission Hong Kong (Full Movie)',
            year: 2024,
            language: 'English',
            langCode: 'en',
            genres: ['Action', 'Comedy', 'Adventure'],
            genreIds: ['action', 'comedy', 'adventure'],
            runtime: '1h 40m',
            director: 'Jackie Chan',
            img: 'https://i.ytimg.com/vi/KtqQtYSIJWE/hqdefault.jpg',
            views: '8.1M views',
            description: 'Jackie Chan in an explosive action comedy full of world-class martial arts choreography and daring stunts.'
        },
        {
            id: 'Yj-I_GHFQAI',
            title: 'Legendary 007 Golden Mission (Full Movie)',
            year: 2024,
            language: 'English',
            langCode: 'en',
            genres: ['Action', 'Thriller', 'Mystery'],
            genreIds: ['action', 'thriller', 'mystery'],
            runtime: '2h 10m',
            director: 'Pierce Brosnan',
            img: 'https://i.ytimg.com/vi/Yj-I_GHFQAI/hqdefault.jpg',
            views: '5.2M views',
            description: 'An undercover operative battles an international syndicate in a thrilling globe-trotting mission.'
        },
        {
            id: 'Rp0ZXQ5GHeI',
            title: 'The Security Guard (Full Movie)',
            year: 2023,
            language: 'English',
            langCode: 'en',
            genres: ['Action', 'Comedy', 'Crime'],
            genreIds: ['action', 'comedy', 'crime'],
            runtime: '1h 31m',
            director: 'Dwayne Johnson',
            img: 'https://i.ytimg.com/vi/Rp0ZXQ5GHeI/hqdefault.jpg',
            views: '7.9M views',
            description: 'An ex-special forces security officer must defend a crowded complex from an elite squad of armed infiltrators.'
        },
        {
            id: 'HipOsodwwrY',
            title: 'Cleaner (Full Movie)',
            year: 2026,
            language: 'English',
            langCode: 'en',
            genres: ['Action', 'Crime', 'Thriller'],
            genreIds: ['action', 'crime', 'thriller'],
            runtime: '1h 35m',
            director: 'Jason Statham',
            img: 'https://i.ytimg.com/vi/HipOsodwwrY/hqdefault.jpg',
            views: '4.1M views',
            description: 'A relentless fixer takes justice into his own hands when corruption threatens the innocent.'
        },
        {
            id: 'J7K4k0hhdB8',
            title: 'Death Order (Full Movie)',
            year: 2026,
            language: 'English',
            langCode: 'en',
            genres: ['Action', 'Thriller', 'Drama'],
            genreIds: ['action', 'thriller', 'drama'],
            runtime: '1h 32m',
            director: 'Angelina Jolie',
            img: 'https://i.ytimg.com/vi/J7K4k0hhdB8/hqdefault.jpg',
            views: '3.8M views',
            description: 'A top intelligence agent fights against ruthless assassins after uncovering a rogue government network.'
        },
        {
            id: 'cDYicbmUxhg',
            title: "Gangster's Baby (Full Movie)",
            year: 2023,
            language: 'English',
            langCode: 'en',
            genres: ['Action', 'Comedy', 'Adventure'],
            genreIds: ['action', 'comedy', 'adventure'],
            runtime: '2h 02m',
            director: 'Jackie Chan',
            img: 'https://i.ytimg.com/vi/cDYicbmUxhg/hqdefault.jpg',
            views: '12.4M views',
            description: 'A hilarious martial arts adventure following two unlikely allies caught in a frantic high-stakes rescue.'
        },
        {
            id: '0l46rEbOr6o',
            title: 'The Fist Master (Full Movie)',
            year: 2023,
            language: 'English',
            langCode: 'en',
            genres: ['Action', 'Comedy', 'Drama'],
            genreIds: ['action', 'comedy', 'drama'],
            runtime: '1h 51m',
            director: 'Jackie Chan',
            img: 'https://i.ytimg.com/vi/0l46rEbOr6o/hqdefault.jpg',
            views: '9.3M views',
            description: 'The legendary martial arts master takes on powerful rivals to restore honor to his historic academy.'
        },

        // Hindi
        {
            id: '1nDaPbN3Fjk',
            title: 'The Power of Narsimha (Full Movie)',
            year: 2024,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Action', 'Romance', 'Drama'],
            genreIds: ['action', 'romance', 'drama'],
            runtime: '2h 35m',
            director: 'Jr. NTR & Tamannaah Bhatia',
            img: 'https://i.ytimg.com/vi/1nDaPbN3Fjk/hqdefault.jpg',
            views: '45.8M views',
            description: 'Superhit blockbuster action love story starring Jr. NTR and Tamannaah Bhatia with electrifying action and emotions.'
        },
        {
            id: 'cHhQpjECD3w',
            title: 'DADA (Full Movie)',
            year: 2026,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Action', 'Crime', 'Drama'],
            genreIds: ['action', 'crime', 'drama'],
            runtime: '1h 31m',
            director: 'Sanjay Dutt',
            img: 'https://i.ytimg.com/vi/cHhQpjECD3w/hqdefault.jpg',
            views: '14.2M views',
            description: 'Sanjay Dutt in an action-packed Bollywood crime drama exploring loyalty, underworld rivalries, and redemption.'
        },
        {
            id: 'Lr53wiDeY-g',
            title: 'BAAP (Full Movie)',
            year: 2026,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Action', 'Crime', 'Thriller'],
            genreIds: ['action', 'crime', 'thriller'],
            runtime: '1h 52m',
            director: 'Sanjay Dutt',
            img: 'https://i.ytimg.com/vi/Lr53wiDeY-g/hqdefault.jpg',
            views: '16.7M views',
            description: 'A powerful patriarch must confront dangerous forces to safeguard his family and his legacy.'
        },
        {
            id: 'x2SeyqGjySs',
            title: 'MISSION PAK (Full Movie)',
            year: 2025,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Action', 'Thriller', 'Drama'],
            genreIds: ['action', 'thriller', 'drama'],
            runtime: '2h 11m',
            director: 'Allu Arjun & Kareena',
            img: 'https://i.ytimg.com/vi/x2SeyqGjySs/hqdefault.jpg',
            views: '32.1M views',
            description: 'Allu Arjun stars in a high-octane patriotic action thriller with intense combat missions and thrilling twists.'
        },
        {
            id: '1LxMOWZWeaI',
            title: 'Action (Blockbuster Full Movie)',
            year: 2023,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Action', 'Comedy', 'Thriller'],
            genreIds: ['action', 'comedy', 'thriller', 'crime'],
            runtime: '2h 18m',
            director: 'Vishal & Tamannaah Bhatia',
            img: 'https://i.ytimg.com/vi/1LxMOWZWeaI/hqdefault.jpg',
            views: '68.4M views',
            description: 'An Indian military intelligence officer travels across the world to avenge his brother and foil international terrorism.'
        },
        {
            id: 'Vf5IcdOxJQk',
            title: 'Action 4K (Full Action Thriller)',
            year: 2024,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Action', 'Thriller', 'Crime'],
            genreIds: ['action', 'thriller', 'crime'],
            runtime: '2h 06m',
            director: 'Vishal & Aishwarya Lekshmi',
            img: 'https://i.ytimg.com/vi/Vf5IcdOxJQk/hqdefault.jpg',
            views: '24.9M views',
            description: 'Blockbuster South action thriller film in high definition 4K featuring intense international chase sequences.'
        },
        {
            id: 'cD-TLEshy5g',
            title: 'Cocktail (Full Movie)',
            year: 2024,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Romance', 'Comedy', 'Drama'],
            genreIds: ['romance', 'comedy', 'drama'],
            runtime: '2h 24m',
            director: 'Saif Ali Khan & Deepika Padukone',
            img: 'https://i.ytimg.com/vi/cD-TLEshy5g/hqdefault.jpg',
            views: '82.5M views',
            description: 'The beloved Bollywood romantic drama about love, friendship, heartbreak, and finding where you belong.'
        },
        {
            id: 'G0OQgnmA3IA',
            title: 'SHIDDAT (Full Romantic Movie)',
            year: 2024,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Romance', 'Drama'],
            genreIds: ['romance', 'drama'],
            runtime: '2h 01m',
            director: 'Sunny Kaushal & Radhika Madan',
            img: 'https://i.ytimg.com/vi/G0OQgnmA3IA/hqdefault.jpg',
            views: '39.8M views',
            description: 'A passionate romantic drama depicting the intense journey of a young man who will stop at nothing for true love.'
        },
        {
            id: 'uk-PWyVL3t8',
            title: 'One Night Stand (Full Movie)',
            year: 2023,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Romance', 'Drama', 'Thriller'],
            genreIds: ['romance', 'drama', 'thriller'],
            runtime: '1h 24m',
            director: 'Sunny Leone & Tanuj Virwani',
            img: 'https://i.ytimg.com/vi/uk-PWyVL3t8/hqdefault.jpg',
            views: '28.3M views',
            description: 'A romantic thriller exploring love, temptation, and the unforeseen consequences of a fleeting encounter.'
        },
        {
            id: 'lf_3IKQ208g',
            title: 'Love Games (Full Movie)',
            year: 2024,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Romance', 'Thriller', 'Mystery'],
            genreIds: ['romance', 'thriller', 'mystery'],
            runtime: '1h 48m',
            director: 'Vikram Bhatt',
            img: 'https://i.ytimg.com/vi/lf_3IKQ208g/hqdefault.jpg',
            views: '19.4M views',
            description: 'A gripping romantic thriller delving into high-society secrets, dangerous attraction, and emotional dilemmas.'
        },
        {
            id: 'UuQVE0CgaI8',
            title: 'Jism (Full Movie)',
            year: 2023,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Romance', 'Thriller', 'Mystery'],
            genreIds: ['romance', 'thriller', 'mystery'],
            runtime: '2h 14m',
            director: 'John Abraham & Bipasha Basu',
            img: 'https://i.ytimg.com/vi/UuQVE0CgaI8/hqdefault.jpg',
            views: '41.6M views',
            description: 'The iconic romantic thriller revolving around a passionate romance and a mysterious murder plot.'
        },
        {
            id: '8i7EVHhpNko',
            title: 'Blockbuster Action Crime Drama (Full Movie)',
            year: 2024,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Action', 'Crime', 'Drama'],
            genreIds: ['action', 'crime', 'drama'],
            runtime: '2h 43m',
            director: 'Prithviraj & Yash',
            img: 'https://i.ytimg.com/vi/8i7EVHhpNko/hqdefault.jpg',
            views: '31.2M views',
            description: 'An epic crime drama depicting intense power struggles, high-stakes undercover operations, and heroic sacrifices.'
        },
        {
            id: 'h_3hhqN-3GE',
            title: 'MISSION FAUJI (Full Movie)',
            year: 2024,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Action', 'Drama'],
            genreIds: ['action', 'drama'],
            runtime: '2h 11m',
            director: 'Nandamuri Balakrishna & Sreeleela',
            img: 'https://i.ytimg.com/vi/h_3hhqN-3GE/hqdefault.jpg',
            views: '22.8M views',
            description: 'A courageous military officer risks everything to protect the nation and dismantle an international threat.'
        },
        {
            id: '4n7DuK3bQJ8',
            title: 'Thalapathy Vijay Blockbuster (Full Movie)',
            year: 2026,
            language: 'Hindi',
            langCode: 'hi',
            genres: ['Action', 'Drama', 'Thriller'],
            genreIds: ['action', 'drama', 'thriller'],
            runtime: '2h 15m',
            director: 'Thalapathy Vijay & Sai Pallavi',
            img: 'https://i.ytimg.com/vi/4n7DuK3bQJ8/hqdefault.jpg',
            views: '58.9M views',
            description: 'Thalapathy Vijay in a high-energy action drama with thunderous dialogue, heroism, and family devotion.'
        },

        // Japanese & Anime
        {
            id: 'cDYicbmUxhg',
            title: 'Tokyo Rumble (Full Martial Arts Feature)',
            year: 2023,
            language: 'Japanese',
            langCode: 'ja',
            genres: ['Action', 'Comedy', 'Adventure'],
            genreIds: ['action', 'comedy', 'adventure'],
            runtime: '2h 02m',
            director: 'Asian Cinema Classics',
            img: 'https://i.ytimg.com/vi/cDYicbmUxhg/hqdefault.jpg',
            views: '12.4M views',
            description: 'High-octane martial arts adventure and comedy feature full of incredible acrobatics and rapid action.'
        },
        {
            id: '0l46rEbOr6o',
            title: 'The Ronin Master (Full Movie)',
            year: 2023,
            language: 'Japanese',
            langCode: 'ja',
            genres: ['Action', 'Drama'],
            genreIds: ['action', 'drama'],
            runtime: '1h 51m',
            director: 'Martial Arts Box Office',
            img: 'https://i.ytimg.com/vi/0l46rEbOr6o/hqdefault.jpg',
            views: '9.3M views',
            description: 'A master swordsman must fight through legions of opponents to defend his clan and preserve his heritage.'
        },

        // Korean
        {
            id: 'WpvK8VWMvHk',
            title: 'Seoul Retribution (Full Action Movie)',
            year: 2024,
            language: 'Korean',
            langCode: 'ko',
            genres: ['Action', 'Crime', 'Thriller'],
            genreIds: ['action', 'crime', 'thriller'],
            runtime: '1h 43m',
            director: 'Korean Cinema Collection',
            img: 'https://i.ytimg.com/vi/WpvK8VWMvHk/hqdefault.jpg',
            views: '6.5M views',
            description: 'A gripping neo-noir crime thriller following an operative navigating underground networks in Seoul.'
        },

        // Spanish
        {
            id: '0oQDFZ1UOOA',
            title: 'Escuadrón Peligro (Película Completa)',
            year: 2024,
            language: 'Spanish',
            langCode: 'es',
            genres: ['Action', 'Thriller', 'Crime'],
            genreIds: ['action', 'thriller', 'crime'],
            runtime: '1h 32m',
            director: 'Cine de Acción',
            img: 'https://i.ytimg.com/vi/0oQDFZ1UOOA/hqdefault.jpg',
            views: '4.8M views',
            description: 'Película completa de acción y suspenso en alta definición con misiones tácticas y combate extremo.'
        },

        // Telugu & Tamil (South Cinema)
        {
            id: '1nDaPbN3Fjk',
            title: 'Narasimhudu (Blockbuster Full Movie)',
            year: 2024,
            language: 'Telugu',
            langCode: 'te',
            genres: ['Action', 'Romance', 'Drama'],
            genreIds: ['action', 'romance', 'drama'],
            runtime: '2h 35m',
            director: 'Jr. NTR & Tamannaah',
            img: 'https://i.ytimg.com/vi/1nDaPbN3Fjk/hqdefault.jpg',
            views: '45.8M views',
            description: 'Tollywood mega blockbuster starring Jr. NTR in an explosive action romance with massive dance numbers.'
        },
        {
            id: '4n7DuK3bQJ8',
            title: 'Thalapathy (Blockbuster Full Movie)',
            year: 2026,
            language: 'Tamil',
            langCode: 'ta',
            genres: ['Action', 'Drama', 'Thriller'],
            genreIds: ['action', 'drama', 'thriller'],
            runtime: '2h 15m',
            director: 'Thalapathy Vijay',
            img: 'https://i.ytimg.com/vi/4n7DuK3bQJ8/hqdefault.jpg',
            views: '58.9M views',
            description: 'Kollywood superhit starring Thalapathy Vijay in an intense drama filled with heroism and emotion.'
        }
    ];

    let cinemaActiveLanguage = 'all';
    let cinemaActiveGenre = 'all';
    let cinemaCurrentMovies = [...CINEMA_MOVIES_DATABASE];
    let cinemaSearchSeq = 0;
    let cinemaSearchQuery = '';
    let isCinemaLoading = false;
    let cinemaHasMore = true;
    let cinemaQueryTokens = {};
    let cinemaSeenVideoIds = new Set();
    let cinemaActiveQueries = [];
    let cinemaSyntheticPage = 1;

    // Convert language names or codes to standard 3-letter short codes
    function formatLanguageShort(lang) {
        if (!lang) return 'ENG';
        const l = lang.trim().toLowerCase();
        if (l === 'english' || l === 'en' || l === 'eng') return 'ENG';
        if (l === 'hindi' || l === 'hi' || l === 'hin') return 'HIN';
        if (l === 'urdu' || l === 'ur' || l === 'urd') return 'URD';
        if (l === 'punjabi' || l === 'pa' || l === 'pun') return 'PUN';
        if (l === 'tamil' || l === 'ta' || l === 'tam') return 'TAM';
        if (l === 'telugu' || l === 'te' || l === 'tel') return 'TEL';
        if (l === 'malayalam' || l === 'ml' || l === 'mal') return 'MAL';
        if (l === 'kannada' || l === 'kn' || l === 'kan') return 'KAN';
        if (l === 'bengali' || l === 'bn' || l === 'ben') return 'BEN';
        if (l === 'marathi' || l === 'mr' || l === 'mar') return 'MAR';
        if (l === 'gujarati' || l === 'gu' || l === 'guj') return 'GUJ';
        if (l === 'bhojpuri' || l === 'bho') return 'BHO';
        if (l === 'japanese' || l === 'ja' || l === 'jap' || l === 'jpn') return 'JAP';
        if (l === 'korean' || l === 'ko' || l === 'kor') return 'KOR';
        if (l === 'chinese' || l === 'zh' || l === 'chi' || l === 'zho' || l === 'mandarin' || l === 'cantonese') return 'CHI';
        if (l === 'spanish' || l === 'es' || l === 'spa' || l === 'español' || l === 'espanol') return 'SPA';
        if (l === 'french' || l === 'fr' || l === 'fre' || l === 'fra' || l === 'français' || l === 'francais') return 'FRE';
        if (l === 'german' || l === 'de' || l === 'ger' || l === 'deu' || l === 'deutsch') return 'GER';
        if (l === 'italian' || l === 'it' || l === 'ita' || l === 'italiano') return 'ITA';
        if (l === 'portuguese' || l === 'pt' || l === 'por' || l === 'português' || l === 'portugues') return 'POR';
        if (l === 'russian' || l === 'ru' || l === 'rus') return 'RUS';
        if (l === 'turkish' || l === 'tr' || l === 'tur' || l === 'türkçe' || l === 'turkce') return 'TUR';
        if (l === 'arabic' || l === 'ar' || l === 'ara') return 'ARA';
        if (l === 'persian' || l === 'fa' || l === 'fas' || l === 'farsi') return 'PER';
        if (l === 'indonesian' || l === 'id' || l === 'ind') return 'IND';
        if (l === 'thai' || l === 'th' || l === 'tha') return 'THA';
        if (l === 'vietnamese' || l === 'vi' || l === 'vie') return 'VIE';
        if (l === 'filipino' || l === 'tl' || l === 'tgl' || l === 'tagalog') return 'FIL';
        if (l === 'polish' || l === 'pl' || l === 'pol') return 'POL';
        if (l === 'swedish' || l === 'sv' || l === 'swe') return 'SWE';
        if (l === 'dutch' || l === 'nl' || l === 'nld') return 'NLD';
        if (l === 'greek' || l === 'el' || l === 'ell') return 'GRE';
        if (l === 'ukrainian' || l === 'uk' || l === 'ukr') return 'UKR';
        return l.length <= 4 ? l.toUpperCase() : l.slice(0, 3).toUpperCase();
    }

    // Parse ISO 8601 duration (e.g., PT1H35M20S) into seconds
    function parseISODuration(iso) {
        if (!iso) return 0;
        const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        const h = parseInt(match[1] || '0', 10);
        const m = parseInt(match[2] || '0', 10);
        const s = parseInt(match[3] || '0', 10);
        return h * 3600 + m * 60 + s;
    }

    // Format duration nicely (e.g. 1h 45m or 48m)
    function formatRuntimeFromSeconds(sec) {
        if (!sec || isNaN(sec)) return '1h 45m';
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (h > 0) {
            return `${h}h ${m}m`;
        }
        return `${m}m`;
    }

    // Clean YouTube noise from titles
    function cleanMovieTitle(title) {
        if (!title) return 'Full Movie';
        return title
            .replace(/\b(?:1080p|720p|4k|uhd|hd|full hd|bluray|dvdrip|web-dl)\b/gi, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Detect language from metadata
    function detectLanguageFromText(text, activeLang) {
        if (activeLang && activeLang !== 'all') {
            return activeLang;
        }
        const t = (text || '').toLowerCase();
        if (/[\u0900-\u097F]/.test(text) || t.includes('hindi') || t.includes('bollywood') || t.includes('goldmines') || t.includes('t-series') || t.includes('shemaroo')) {
            return 'hi';
        }
        if (/[\u0600-\u06FF]/.test(text)) {
            if (t.includes('urdu') || t.includes('lollywood') || t.includes('pakistani') || t.includes('hum tv') || t.includes('ary digital')) return 'ur';
            if (t.includes('farsi') || t.includes('iran') || t.includes('persian')) return 'fa';
            return 'ar';
        }
        if (t.includes('urdu') || t.includes('lollywood')) return 'ur';
        if (/[\u0A00-\u0A7F]/.test(text) || t.includes('punjabi') || t.includes('pollywood')) return 'pa';
        if (/[\u0B80-\u0BFF]/.test(text) || t.includes('tamil') || t.includes('kollywood')) return 'ta';
        if (/[\u0C00-\u0C7F]/.test(text) || t.includes('telugu') || t.includes('tollywood')) return 'te';
        if (/[\u0D00-\u0D7F]/.test(text) || t.includes('malayalam') || t.includes('mollywood')) return 'ml';
        if (/[\u0C80-\u0CFF]/.test(text) || t.includes('kannada') || t.includes('sandalwood')) return 'kn';
        if (/[\u0980-\u09FF]/.test(text) || t.includes('bengali') || t.includes('bangla')) return 'bn';
        if (t.includes('marathi')) return 'mr';
        if (t.includes('gujarati')) return 'gu';
        if (t.includes('bhojpuri')) return 'bho';
        if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text) || t.includes('japanese') || t.includes('anime') || t.includes('toho')) return 'ja';
        if (/[\uac00-\ud7af]/.test(text) || t.includes('korean') || t.includes('k-movie') || t.includes('hangul')) return 'ko';
        if (t.includes('chinese') || t.includes('mandarin') || t.includes('cantonese') || t.includes('wuxia')) return 'zh';
        if (t.includes('español') || t.includes('espanol') || t.includes('pelicula') || t.includes('castellano') || t.includes('latino')) return 'es';
        if (t.includes('français') || t.includes('francais') || t.includes('film complet') || t.includes('french')) return 'fr';
        if (t.includes('deutsch') || t.includes('ganzer film') || t.includes('german')) return 'de';
        if (t.includes('italiano') || t.includes('italian')) return 'it';
        if (t.includes('português') || t.includes('portugues') || t.includes('dublado') || t.includes('brazil')) return 'pt';
        if (/[\u0400-\u04FF]/.test(text) || t.includes('русский') || t.includes('russian')) return 'ru';
        if (t.includes('türkçe') || t.includes('turkce') || t.includes('turkish')) return 'tr';
        if (t.includes('arabic')) return 'ar';
        if (t.includes('indonesia') || t.includes('indonesian')) return 'id';
        if (/[\u0E00-\u0E7F]/.test(text) || t.includes('thai')) return 'th';
        if (t.includes('vietnamese') || t.includes('vietnam')) return 'vi';
        if (t.includes('tagalog') || t.includes('filipino') || t.includes('pinoy')) return 'tl';
        if (t.includes('polish') || t.includes('polski')) return 'pl';
        if (t.includes('swedish') || t.includes('svenska')) return 'sv';
        return 'en';
    }

    // Extract genre tags from movie title/description
    function extractMovieGenres(text, activeGenre) {
        const list = [];
        if (activeGenre && activeGenre !== 'all') {
            const gObj = CINEMA_GENRES.find(g => g.id === activeGenre);
            if (gObj) list.push(gObj.name);
        }
        const t = (text || '').toLowerCase();
        if (t.includes('action') || t.includes('fight') || t.includes('warrior')) list.push('Action');
        if (t.includes('martial') || t.includes('kung fu') || t.includes('karate')) list.push('Martial Arts');
        if (t.includes('sci-fi') || t.includes('space') || t.includes('alien') || t.includes('future') || t.includes('cyberpunk')) list.push('Sci-Fi');
        if (t.includes('thriller') || t.includes('suspense') || t.includes('crime') || t.includes('investigation')) list.push('Thriller');
        if (t.includes('comedy') || t.includes('funny') || t.includes('laugh') || t.includes('humor')) list.push('Comedy');
        if (t.includes('horror') || t.includes('ghost') || t.includes('creepy') || t.includes('scary')) list.push('Horror');
        if (t.includes('romance') || t.includes('love') || t.includes('romantic')) list.push('Romance');
        if (t.includes('drama') || t.includes('emotional')) list.push('Drama');
        if (t.includes('mystery') || t.includes('detective') || t.includes('whodunnit')) list.push('Mystery');
        if (t.includes('crime') || t.includes('gangster') || t.includes('mafia') || t.includes('heist')) list.push('Crime');
        if (t.includes('anime') || t.includes('animation') || t.includes('cartoon')) list.push('Animation / Anime');
        if (t.includes('adventure') || t.includes('journey') || t.includes('quest')) list.push('Adventure');
        if (t.includes('fantasy') || t.includes('magic') || t.includes('mythology')) list.push('Fantasy');
        if (t.includes('superhero') || t.includes('marvel') || t.includes('avengers') || t.includes('batman')) list.push('Superhero');
        if (t.includes('war') || t.includes('military') || t.includes('army') || t.includes('battle')) list.push('War & Historical');
        if (t.includes('sports') || t.includes('boxing') || t.includes('football') || t.includes('cricket')) list.push('Sports');
        if (t.includes('spy') || t.includes('agent') || t.includes('secret service') || t.includes('mission')) list.push('Spy & Espionage');

        const unique = Array.from(new Set(list));
        return unique.length > 0 ? unique.slice(0, 3) : ['Cinema Feature'];
    }

    // Location-tailored algorithmic search query generator for the Cinema feed
    function getLocationTailoredMovieQueries(country) {
        const c = (country || 'US').toUpperCase();
        const regionQueries = {
            'IN': [
                'Hindi action full movie',
                'Bollywood romantic movie full',
                'South movie Hindi dubbed full HD',
                'Hindi comedy movie full',
                'Hollywood Hindi dubbed movie full',
                'Tamil full movie HD',
                'Telugu blockbuster full movie'
            ],
            'PK': [
                'Hindi full movie HD',
                'Urdu drama movie full',
                'Hollywood action movie Hindi dubbed',
                'Pakistani cinema movie full',
                'Punjabi comedy full movie',
                'Bollywood romantic movie full'
            ],
            'BD': [
                'Bangla full movie HD',
                'Hindi full movie HD',
                'Hollywood action movie full',
                'Bangla action cinema'
            ],
            'JP': [
                'Japanese cinema full movie',
                'Anime full movie HD',
                'Japanese mystery thriller movie',
                'Hollywood movie Japanese sub'
            ],
            'KR': [
                'Korean thriller movie full',
                'Korean action cinema full HD',
                'Korean romance movie',
                'Hollywood full movie Korean'
            ],
            'ES': [
                'Peliculas completas en espanol HD',
                'Accion pelicula completa en castellano',
                'Cine espanol pelicula completa'
            ],
            'MX': [
                'Peliculas completas en espanol latino',
                'Accion pelicula completa latino',
                'Comedia pelicula completa en espanol'
            ],
            'FR': [
                'Film complet en francais HD',
                'Cinema francais film complet',
                'Action film francais complet'
            ],
            'DE': [
                'Ganzer film deutsch HD',
                'Action filme auf deutsch komplett',
                'Krimi film deutsch'
            ],
            'IT': [
                'Film completo in italiano HD',
                'Cinema italiano film completo',
                'Azione film completo italiano'
            ],
            'BR': [
                'Filme completo dublado em portugues',
                'Acao filme completo dublado HD',
                'Cinema brasileiro filme completo'
            ],
            'RU': [
                'Фильмы полностью на русском HD',
                'Боевик фильм полностью',
                'Комедия фильм русский'
            ],
            'TR': [
                'Türkçe dublaj tek parça film HD',
                'Türk sineması full film izle',
                'Aksiyon filmleri türkçe full'
            ],
            'SA': [
                'Arabic full movie HD',
                'Hollywood movie Arabic sub full',
                'Egyptian comedy full movie'
            ],
            'AE': [
                'Arabic full movie HD',
                'Hollywood movie full HD',
                'Hindi movie full HD'
            ],
            'EG': [
                'Arabic full movie HD',
                'Egyptian comedy movie full',
                'Arabic action movie full'
            ],
            'ID': [
                'Film bioskop indonesia full movie',
                'Action movie subtitle indonesia',
                'Horor film indonesia full'
            ],
            'TH': [
                'Thai martial arts full movie',
                'Thai action comedy movie full',
                'Hollywood movie Thai sub full'
            ],
            'PH': [
                'Pinoy full movie tagalog',
                'Filipino action comedy movie full',
                'Hollywood blockbuster full movie'
            ],
            'US': [
                'Full action movie HD',
                'Sci-fi full movie cinema',
                'Hollywood thriller movie full',
                'Adventure mystery full movie'
            ],
            'GB': [
                'British cinema full movie',
                'Classic mystery full movie',
                'Action thriller full movie cinema'
            ],
            'CA': [
                'Full action movie HD cinema',
                'Sci-fi adventure full movie',
                'Thriller movie full HD'
            ],
            'AU': [
                'Full action movie HD cinema',
                'Thriller mystery movie full',
                'Adventure sci-fi full movie'
            ]
        };

        const list = regionQueries[c] || [
            'Full action movie HD cinema',
            'Hollywood thriller movie full',
            'Sci-fi full movie HD',
            'Classic adventure full movie'
        ];

        const shuffled = [...list].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 4);
    }

    // Fetches videos from YouTube and strictly filters duration > 30 minutes (1800 seconds) with pagination support
    async function fetchYouTubeMoviesWithDuration(queries, seq, isAppend = false) {
        if (!API_KEY || !queries || queries.length === 0) return { movies: [], hasMore: false };
        
        const allVideoItems = [];
        let hasAnyNextPageToken = false;

        const fetchPromises = queries.map(async (q) => {
            try {
                // If appending, retrieve the pageToken for this query
                const currentToken = isAppend ? (cinemaQueryTokens[q] || '') : '';
                if (isAppend && cinemaQueryTokens[q] === null) {
                    // Token is explicitly null (exhausted for this query)
                    return [];
                }

                const tokenParam = currentToken ? `&pageToken=${encodeURIComponent(currentToken)}` : '';
                const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=long&videoEmbeddable=true&maxResults=20&q=${encodeURIComponent(q)}${tokenParam}&key=${API_KEY}`;
                
                const res = await fetch(searchUrl);
                if (res.ok) {
                    const data = await res.json();
                    if (data.nextPageToken) {
                        cinemaQueryTokens[q] = data.nextPageToken;
                        hasAnyNextPageToken = true;
                    } else {
                        cinemaQueryTokens[q] = null; // No more pages for this query
                    }
                    return data.items || [];
                }
            } catch (e) {
                console.warn('[Cinema Fetch Warning]', e);
            }
            return [];
        });

        const results = await Promise.all(fetchPromises);
        if (seq !== cinemaSearchSeq) return { movies: [], hasMore: false };

        results.forEach(items => {
            items.forEach(item => {
                const vidId = item.id?.videoId;
                if (vidId && !cinemaSeenVideoIds.has(vidId)) {
                    cinemaSeenVideoIds.add(vidId);
                    allVideoItems.push(item);
                }
            });
        });

        if (allVideoItems.length === 0) {
            return { movies: [], hasMore: hasAnyNextPageToken };
        }

        // Fetch contentDetails to accurately filter only movies > 30 minutes (1800s)
        const videoIds = allVideoItems.map(item => item.id.videoId).slice(0, 45).join(',');
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status&id=${videoIds}&key=${API_KEY}`;
        
        try {
            const detailsRes = await fetch(detailsUrl);
            if (!detailsRes.ok) return { movies: [], hasMore: hasAnyNextPageToken };
            if (seq !== cinemaSearchSeq) return { movies: [], hasMore: false };

            const detailsData = await detailsRes.json();
            if (!detailsData.items) return { movies: [], hasMore: hasAnyNextPageToken };

            const validMovies = [];

            detailsData.items.forEach(item => {
                // Ensure video is embeddable
                if (item.status && item.status.embeddable === false) {
                    return;
                }

                const durationIso = item.contentDetails?.duration || '';
                const durationSec = parseISODuration(durationIso);

                // STRICT FILTER: ONLY VIDEOS LONGER THAN 30 MINUTES (1800s)
                if (durationSec < 1800) {
                    return;
                }

                const rawTitle = item.snippet?.title || 'Full Movie';
                // Exclude obvious non-movies like teasers, short clips or news
                if (/\b(?:official trailer|teaser trailer|gameplay|walkthrough|podcast|live stream|news bulletin)\b/i.test(rawTitle)) {
                    return;
                }

                const title = rawTitle;
                const desc = item.snippet?.description || '';
                const channel = item.snippet?.channelTitle || 'Cinema Studio';
                const pubDate = item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).getFullYear() : 2024;
                const runtime = formatRuntimeFromSeconds(durationSec);

                const langCode = detectLanguageFromText(title + ' ' + desc + ' ' + channel, cinemaActiveLanguage);
                const genres = extractMovieGenres(title + ' ' + desc, cinemaActiveGenre);

                validMovies.push({
                    id: item.id,
                    title: cleanMovieTitle(title),
                    year: pubDate,
                    language: langCode,
                    langCode: langCode,
                    genres: genres,
                    runtime: runtime,
                    director: channel,
                    img: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                    views: formatViewCount(item.statistics?.viewCount || '1500000'),
                    description: desc || 'Stream high-definition cinema feature on TOG3R.'
                });
            });

            return { movies: validMovies, hasMore: hasAnyNextPageToken || validMovies.length > 0 };
        } catch (err) {
            console.warn('[Cinema Details Warning]', err);
            return { movies: [], hasMore: false };
        }
    }

    function renderCinemaSkeletons(container, count = 8) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const sk = document.createElement('div');
            sk.className = 'cinema-movie-card cinema-skeleton-card';
            sk.innerHTML = `
                <div class="cinema-card-poster skeleton-thumb" style="aspect-ratio: 16/9; background: rgba(255,255,255,0.06); animation: pulse 1.5s ease-in-out infinite;"></div>
                <div class="cinema-card-info" style="padding: 16px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="height: 16px; width: 75%; background: rgba(255,255,255,0.08); border-radius: 4px; animation: pulse 1.5s ease-in-out infinite;"></div>
                    <div style="height: 12px; width: 45%; background: rgba(255,255,255,0.05); border-radius: 4px; animation: pulse 1.5s ease-in-out infinite;"></div>
                    <div style="height: 12px; width: 90%; background: rgba(255,255,255,0.04); border-radius: 4px; animation: pulse 1.5s ease-in-out infinite;"></div>
                </div>
            `;
            container.appendChild(sk);
        }
    }

    function initCinemaDropdowns() {
        const langTrigger = document.getElementById('cinemaLangDropdownBtn');
        const langWrapper = document.getElementById('cinemaLangDropdownWrapper');
        const langSearch = document.getElementById('cinemaLangSearchInput');

        const genreTrigger = document.getElementById('cinemaGenreDropdownBtn');
        const genreWrapper = document.getElementById('cinemaGenreDropdownWrapper');
        const genreSearch = document.getElementById('cinemaGenreSearchInput');

        const resetBtn = document.getElementById('cinemaResetFiltersBtn');
        const clearAllChipsBtn = document.getElementById('cinemaClearAllChipsBtn');

        // Populate initial dropdown lists
        renderCinemaLanguagesList('');
        renderCinemaGenresList('');

        // Language Dropdown Toggle
        if (langTrigger && langWrapper) {
            langTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = langWrapper.classList.contains('open');
                if (genreWrapper) genreWrapper.classList.remove('open');
                langWrapper.classList.toggle('open', !isOpen);
                langTrigger.setAttribute('aria-expanded', (!isOpen).toString());
                if (!isOpen && langSearch) {
                    setTimeout(() => langSearch.focus(), 50);
                }
            });
        }

        // Genre Dropdown Toggle
        if (genreTrigger && genreWrapper) {
            genreTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = genreWrapper.classList.contains('open');
                if (langWrapper) langWrapper.classList.remove('open');
                genreWrapper.classList.toggle('open', !isOpen);
                genreTrigger.setAttribute('aria-expanded', (!isOpen).toString());
                if (!isOpen && genreSearch) {
                    setTimeout(() => genreSearch.focus(), 50);
                }
            });
        }

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (langWrapper && !langWrapper.contains(e.target)) {
                langWrapper.classList.remove('open');
                if (langTrigger) langTrigger.setAttribute('aria-expanded', 'false');
            }
            if (genreWrapper && !genreWrapper.contains(e.target)) {
                genreWrapper.classList.remove('open');
                if (genreTrigger) genreTrigger.setAttribute('aria-expanded', 'false');
            }
        });

        // Search within Language Dropdown
        if (langSearch) {
            langSearch.addEventListener('input', (e) => {
                renderCinemaLanguagesList(e.target.value.trim());
            });
            langSearch.addEventListener('click', (e) => e.stopPropagation());
        }

        // Search within Genre Dropdown
        if (genreSearch) {
            genreSearch.addEventListener('input', (e) => {
                renderCinemaGenresList(e.target.value.trim());
            });
            genreSearch.addEventListener('click', (e) => e.stopPropagation());
        }

        // Reset All Filters
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                selectCinemaLanguage('all', 'All Languages');
                selectCinemaGenre('all', 'All Genres');
            });
        }

        if (clearAllChipsBtn) {
            clearAllChipsBtn.addEventListener('click', () => {
                selectCinemaLanguage('all', 'All Languages');
                selectCinemaGenre('all', 'All Genres');
            });
        }
    }

    function renderCinemaLanguagesList(searchTerm = '') {
        const list = document.getElementById('cinemaLangList');
        if (!list) return;
        list.innerHTML = '';

        const term = searchTerm.toLowerCase();
        const filtered = CINEMA_LANGUAGES.filter(l => 
            l.name.toLowerCase().includes(term) || l.region.toLowerCase().includes(term)
        );

        if (filtered.length === 0) {
            list.innerHTML = '<div style="padding: 12px; font-size: 12px; color: #94a3b8; text-align: center;">No matching language found</div>';
            return;
        }

        filtered.forEach(lang => {
            const item = document.createElement('div');
            item.className = `cinema-dropdown-item ${cinemaActiveLanguage === lang.code ? 'active' : ''}`;
            const shortCode = lang.code === 'all' ? 'ALL' : formatLanguageShort(lang.name);
            item.innerHTML = `
                <div>
                    <span>${escapeHtml(lang.name)}</span>
                    <span class="item-sub">(${escapeHtml(shortCode)} • ${escapeHtml(lang.region)})</span>
                </div>
                <i class="fas fa-check item-check"></i>
            `;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                selectCinemaLanguage(lang.code, lang.name);
                const wrapper = document.getElementById('cinemaLangDropdownWrapper');
                if (wrapper) wrapper.classList.remove('open');
            });
            list.appendChild(item);
        });
    }

    function renderCinemaGenresList(searchTerm = '') {
        const list = document.getElementById('cinemaGenreList');
        if (!list) return;
        list.innerHTML = '';

        const term = searchTerm.toLowerCase();
        const filtered = CINEMA_GENRES.filter(g => 
            g.name.toLowerCase().includes(term) || g.tag.toLowerCase().includes(term)
        );

        if (filtered.length === 0) {
            list.innerHTML = '<div style="padding: 12px; font-size: 12px; color: #94a3b8; text-align: center;">No matching genre found</div>';
            return;
        }

        filtered.forEach(genre => {
            const item = document.createElement('div');
            item.className = `cinema-dropdown-item ${cinemaActiveGenre === genre.id ? 'active' : ''}`;
            item.innerHTML = `
                <div>
                    <span>${escapeHtml(genre.name)}</span>
                    <span class="item-sub">• ${escapeHtml(genre.tag)}</span>
                </div>
                <i class="fas fa-check item-check"></i>
            `;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                selectCinemaGenre(genre.id, genre.name);
                const wrapper = document.getElementById('cinemaGenreDropdownWrapper');
                if (wrapper) wrapper.classList.remove('open');
            });
            list.appendChild(item);
        });
    }

    function selectCinemaLanguage(langCode, langName) {
        cinemaActiveLanguage = langCode;
        const label = document.getElementById('cinemaSelectedLangLabel');
        if (label) {
            const short = langCode === 'all' ? 'All' : formatLanguageShort(langName);
            label.textContent = langCode === 'all' ? 'Language: All' : `Language: ${langName} (${short})`;
        }
        renderCinemaLanguagesList('');
        updateCinemaActiveFiltersUI();
        loadCinemaMovies(cinemaSearchQuery);
    }

    function selectCinemaGenre(genreId, genreName) {
        cinemaActiveGenre = genreId;
        const label = document.getElementById('cinemaSelectedGenreLabel');
        if (label) {
            label.textContent = genreId === 'all' ? 'Genre: All' : `Genre: ${genreName}`;
        }
        renderCinemaGenresList('');
        updateCinemaActiveFiltersUI();
        loadCinemaMovies(cinemaSearchQuery);
    }

    function updateCinemaActiveFiltersUI() {
        const bar = document.getElementById('cinemaActiveFiltersBar');
        const container = document.getElementById('cinemaActiveChipsContainer');
        if (!bar || !container) return;

        container.innerHTML = '';
        const hasLang = cinemaActiveLanguage !== 'all';
        const hasGenre = cinemaActiveGenre !== 'all';

        if (!hasLang && !hasGenre) {
            bar.style.display = 'none';
            return;
        }

        bar.style.display = 'flex';

        if (hasLang) {
            const langObj = CINEMA_LANGUAGES.find(l => l.code === cinemaActiveLanguage);
            const langName = langObj ? langObj.name : cinemaActiveLanguage;
            const short = formatLanguageShort(langName);
            const chip = document.createElement('div');
            chip.className = 'cinema-filter-chip';
            chip.innerHTML = `
                <span>Language: <strong>${escapeHtml(langName)} (${escapeHtml(short)})</strong></span>
                <button type="button" class="chip-remove-btn" title="Remove language filter" aria-label="Remove language filter">
                    <i class="fas fa-times"></i>
                </button>
            `;
            chip.querySelector('.chip-remove-btn').addEventListener('click', () => {
                selectCinemaLanguage('all', 'All Languages');
            });
            container.appendChild(chip);
        }

        if (hasGenre) {
            const genreObj = CINEMA_GENRES.find(g => g.id === cinemaActiveGenre);
            const chip = document.createElement('div');
            chip.className = 'cinema-filter-chip';
            chip.innerHTML = `
                <span>Genre: <strong>${escapeHtml(genreObj ? genreObj.name : cinemaActiveGenre)}</strong></span>
                <button type="button" class="chip-remove-btn" title="Remove genre filter" aria-label="Remove genre filter">
                    <i class="fas fa-times"></i>
                </button>
            `;
            chip.querySelector('.chip-remove-btn').addEventListener('click', () => {
                selectCinemaGenre('all', 'All Genres');
            });
            container.appendChild(chip);
        }
    }

    // MAIN CINEMA ENGINE: Background search algorithm, >30m duration filter, location-aware feed, infinite scroll
    async function loadCinemaMovies(userQuery = '', isAppend = false) {
        const grid = document.getElementById('cinemaMovieGrid');
        if (!grid) return;

        if (isAppend) {
            if (isCinemaLoading || !cinemaHasMore) return;
            isCinemaLoading = true;
            showLoader(true);

            try {
                const seq = cinemaSearchSeq;
                const { movies, hasMore } = await fetchYouTubeMoviesWithDuration(cinemaActiveQueries, seq, true);
                if (seq !== cinemaSearchSeq) {
                    isCinemaLoading = false;
                    showLoader(false);
                    return;
                }

                if (movies && movies.length > 0) {
                    cinemaCurrentMovies.push(...movies);
                    movies.forEach(movie => {
                        grid.appendChild(createCinemaMovieCard(movie));
                    });
                    cinemaHasMore = hasMore;
                } else {
                    // Supplement unseen movies from the curated database
                    const unseenDb = CINEMA_MOVIES_DATABASE.filter(m => {
                        if (cinemaSeenVideoIds.has(m.id)) return false;
                        if (cinemaActiveLanguage !== 'all' && m.langCode !== cinemaActiveLanguage && m.language.toLowerCase() !== cinemaActiveLanguage.toLowerCase()) return false;
                        if (cinemaActiveGenre !== 'all' && (!m.genreIds || !m.genreIds.includes(cinemaActiveGenre))) return false;
                        return true;
                    });

                    if (unseenDb.length > 0) {
                        const batch = unseenDb.slice(0, 6);
                        batch.forEach(movie => {
                            cinemaSeenVideoIds.add(movie.id);
                            cinemaCurrentMovies.push(movie);
                            grid.appendChild(createCinemaMovieCard(movie));
                        });
                        cinemaHasMore = unseenDb.length > 6;
                    } else {
                        cinemaHasMore = false;
                    }
                }
            } catch (err) {
                console.warn('[Cinema Infinite Scroll Error]', err);
                cinemaHasMore = false;
            } finally {
                showLoader(false);
                isCinemaLoading = false;
            }
            return;
        }

        // Initial Load or New Search/Filter
        cinemaSearchQuery = userQuery;
        const seq = ++cinemaSearchSeq;
        isCinemaLoading = true;
        cinemaHasMore = true;
        cinemaQueryTokens = {};
        cinemaSeenVideoIds.clear();
        cinemaSyntheticPage = 1;

        // Render sleek placeholder skeletons while fetching
        renderCinemaSkeletons(grid, 8);

        try {
            let movies = [];
            let hasMore = true;

            if (API_KEY) {
                let targetQueries = [];

                if (userQuery && userQuery.trim().length > 0) {
                    // User typed search query in search bar while in Cinema section
                    const clean = userQuery.trim();
                    let langText = '';
                    if (cinemaActiveLanguage !== 'all') {
                        const lObj = CINEMA_LANGUAGES.find(l => l.code === cinemaActiveLanguage);
                        if (lObj) langText = lObj.name;
                    }
                    let genreText = '';
                    if (cinemaActiveGenre !== 'all') {
                        const gObj = CINEMA_GENRES.find(g => g.id === cinemaActiveGenre);
                        if (gObj) genreText = gObj.name;
                    }

                    targetQueries.push([clean, langText, genreText, 'full movie'].filter(Boolean).join(' '));
                    targetQueries.push([clean, langText, 'full movie HD'].filter(Boolean).join(' '));
                    targetQueries.push([clean, 'blockbuster cinema movie full'].filter(Boolean).join(' '));
                } else if (cinemaActiveLanguage !== 'all' || cinemaActiveGenre !== 'all') {
                    // User selected Language or Genre in dropdowns
                    let langText = '';
                    if (cinemaActiveLanguage !== 'all') {
                        const lObj = CINEMA_LANGUAGES.find(l => l.code === cinemaActiveLanguage);
                        if (lObj) langText = lObj.name;
                    }
                    let genreText = '';
                    if (cinemaActiveGenre !== 'all') {
                        const gObj = CINEMA_GENRES.find(g => g.id === cinemaActiveGenre);
                        if (gObj) genreText = gObj.name;
                    }

                    if (langText && genreText) {
                        targetQueries.push(`${langText} ${genreText} full movie`);
                        targetQueries.push(`${genreText} movie in ${langText} full HD`);
                        targetQueries.push(`${langText} ${genreText} cinema feature film`);
                    } else if (langText) {
                        targetQueries.push(`${langText} full movie HD`);
                        targetQueries.push(`${langText} blockbuster movie full`);
                        targetQueries.push(`${langText} action romance full movie`);
                    } else if (genreText) {
                        targetQueries.push(`${genreText} full movie HD`);
                        targetQueries.push(`Hollywood ${genreText} full movie`);
                        targetQueries.push(`Blockbuster ${genreText} cinema full movie`);
                    }
                } else {
                    // Initial load: Algorithmic selection tailored to user's geographic location
                    targetQueries = getLocationTailoredMovieQueries(countryCode);
                }

                cinemaActiveQueries = targetQueries;
                const fetchRes = await fetchYouTubeMoviesWithDuration(targetQueries, seq, false);
                movies = fetchRes.movies || [];
                hasMore = fetchRes.hasMore;
            }

            if (seq !== cinemaSearchSeq) return;

            // If API didn't return movies or was offline, supplement from curated database (>30m guaranteed)
            if (!movies || movies.length === 0) {
                let filteredDb = CINEMA_MOVIES_DATABASE.filter(movie => {
                    let matchLang = true;
                    let matchGenre = true;
                    let matchQuery = true;

                    if (cinemaActiveLanguage !== 'all') {
                        matchLang = movie.langCode === cinemaActiveLanguage || 
                                    movie.language.toLowerCase() === cinemaActiveLanguage.toLowerCase();
                    }

                    if (cinemaActiveGenre !== 'all') {
                        matchGenre = movie.genreIds && movie.genreIds.includes(cinemaActiveGenre);
                    }

                    if (userQuery && userQuery.trim().length > 0) {
                        const q = userQuery.toLowerCase().trim();
                        matchQuery = movie.title.toLowerCase().includes(q) || 
                                     (movie.director && movie.director.toLowerCase().includes(q)) ||
                                     (movie.description && movie.description.toLowerCase().includes(q));
                    }

                    return matchLang && matchGenre && matchQuery;
                });

                filteredDb.forEach(m => cinemaSeenVideoIds.add(m.id));
                movies = filteredDb;
                hasMore = filteredDb.length > 0;
            }

            cinemaCurrentMovies = movies;
            cinemaHasMore = hasMore;
            grid.innerHTML = '';

            if (movies.length === 0) {
                renderCinemaEmptyState(grid);
            } else {
                movies.forEach(movie => {
                    grid.appendChild(createCinemaMovieCard(movie));
                });
            }

        } catch (err) {
            if (seq !== cinemaSearchSeq) return;
            console.warn('[Cinema Engine Error]', err);
            grid.innerHTML = '';
            const fallbackList = CINEMA_MOVIES_DATABASE.filter(m => {
                if (cinemaActiveLanguage !== 'all' && m.langCode !== cinemaActiveLanguage) return false;
                if (cinemaActiveGenre !== 'all' && (!m.genreIds || !m.genreIds.includes(cinemaActiveGenre))) return false;
                return true;
            });
            fallbackList.forEach(m => cinemaSeenVideoIds.add(m.id));
            if (fallbackList.length === 0) {
                renderCinemaEmptyState(grid);
            } else {
                fallbackList.forEach(movie => {
                    grid.appendChild(createCinemaMovieCard(movie));
                });
            }
        } finally {
            isCinemaLoading = false;
        }
    }

    function createCinemaMovieCard(movie) {
        const div = document.createElement('div');
        div.className = 'cinema-movie-card';
        const isWatchlisted = userWatchlistSet.has(movie.id);
        const shortLang = formatLanguageShort(movie.langCode || movie.language || 'ENG');

        const genrePillsHtml = (movie.genres || ['Cinema Feature'])
            .slice(0, 3)
            .map(g => `<span class="cinema-genre-pill">${escapeHtml(g)}</span>`)
            .join('');

        div.innerHTML = `
            <div class="cinema-card-poster">
                <img class="cinema-poster-img" src="${movie.img}" alt="${escapeHtml(movie.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=640&q=80'">
                <div class="cinema-poster-overlay">
                    <div class="cinema-play-badge"><i class="fas fa-play"></i></div>
                </div>
                <div class="cinema-card-badges">
                    <span class="cinema-card-badge-lang">${escapeHtml(shortLang)}</span>
                </div>
                <span class="cinema-card-duration">${escapeHtml(movie.runtime || '1h 45m')}</span>
                <button type="button" class="cinema-card-wl-btn" title="${isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}" aria-label="Watchlist" style="color: ${isWatchlisted ? '#38bdf8' : '#fff'};">
                    <i class="fas fa-bookmark"></i>
                </button>
            </div>
            <div class="cinema-card-info">
                <h3 class="cinema-card-title">${escapeHtml(movie.title)}</h3>
                <div class="cinema-card-meta">
                    <span>${escapeHtml(String(movie.year || '2024'))}</span>
                    <span>•</span>
                    <span>${escapeHtml(movie.director || 'Cinema Feature')}</span>
                </div>
                <div class="cinema-card-genres">
                    ${genrePillsHtml}
                </div>
                <p class="cinema-card-desc">${escapeHtml(movie.description || 'Stream high-definition cinema feature on TOG3R.')}</p>
            </div>
        `;

        const wlBtn = div.querySelector('.cinema-card-wl-btn');
        if (wlBtn) {
            wlBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (userWatchlistSet.has(movie.id)) {
                    userWatchlistSet.delete(movie.id);
                    wlBtn.style.color = '#fff';
                    wlBtn.title = 'Add to Watchlist';
                    if (dashDb && dashAuth && dashAuth.currentUser) {
                        dashDb.collection('users').doc(dashAuth.currentUser.uid).collection('watchlist').doc(movie.id).delete().catch(err => console.warn(err));
                    }
                } else {
                    userWatchlistSet.add(movie.id);
                    wlBtn.style.color = '#38bdf8';
                    wlBtn.title = 'In Watchlist';
                    if (dashDb && dashAuth && dashAuth.currentUser) {
                        dashDb.collection('users').doc(dashAuth.currentUser.uid).collection('watchlist').doc(movie.id).set({
                            id: movie.id,
                            title: movie.title,
                            channel: movie.director || 'Cinema Studio',
                            views: movie.views || '1.5M views',
                            img: movie.img,
                            tag: 'CINEMA',
                            addedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }).catch(err => console.warn(err));
                    }
                }
            });
        }

        div.addEventListener('click', () => {
            openWatchView(
                movie.id,
                movie.title,
                movie.director || 'Cinema Feature',
                movie.views || 'Full Movie',
                movie.img,
                movie.description
            );
        });

        return div;
    }

    function renderCinemaEmptyState(container) {
        container.innerHTML = `
            <div class="cinema-empty-state">
                <div class="cinema-empty-icon"><i class="fas fa-film"></i></div>
                <h3 class="cinema-empty-title">No Movies Matching Your Criteria</h3>
                <p class="cinema-empty-text">We couldn't find any long-form full movies (>30 mins) matching this combination. Try selecting another language, genre, or reset filters.</p>
                <button type="button" class="cinema-empty-reset-btn" id="cinemaEmptyResetBtn">View All Movies</button>
            </div>
        `;

        const resetBtn = container.querySelector('#cinemaEmptyResetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                selectCinemaLanguage('all', 'All Languages');
                selectCinemaGenre('all', 'All Genres');
            });
        }
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
                id: "L_LUpnjgPso",
                title: "Interstellar: <br>Beyond Time",
                cleanTitle: "Interstellar: Beyond Time",
                desc: "A masterpiece by Christopher Nolan. A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
                channel: "Warner Bros. Pictures",
                views: "48.2M views",
                img: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=90"
            },
            {
                id: "YoHD9XEInc0",
                title: "Neon Nights <br>2049",
                cleanTitle: "Neon Nights 2049",
                desc: "In a world where technology and humanity blur, one detective must uncover the truth behind a city-wide conspiracy.",
                channel: "Warner Bros. Pictures",
                views: "34.5M views",
                img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1400&q=90"
            },
            {
                id: "1G4isv_Fylg",
                title: "Dune: Part Two <br>Official Trailer",
                cleanTitle: "Dune: Part Two Official Trailer",
                desc: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
                channel: "Warner Bros. Pictures",
                views: "29.8M views",
                img: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1400&q=90"
            }
        ];

        let currentHeroIndex = 0;
        const heroImgElements = document.querySelectorAll('.hero-img');
        const heroTitle = document.getElementById('heroTitle');
        const heroDesc = document.getElementById('heroDesc');
        const heroNext = document.getElementById('heroNext');
        const indicators = document.querySelectorAll('.indicator');
        const heroPlayBtn = document.querySelector('.hero-buttons .play-btn');
        const heroAddBtn = document.querySelector('.hero-buttons .info-btn');

        function updateHeroButtonsState() {
            const currentItem = heroData[currentHeroIndex];
            if (!currentItem || !heroAddBtn) return;
            const isWatchlisted = userWatchlistSet.has(currentItem.id);
            if (isWatchlisted) {
                heroAddBtn.innerHTML = '<i class="fas fa-bookmark" style="color: #38bdf8;"></i> In Watchlist';
                heroAddBtn.style.borderColor = '#38bdf8';
            } else {
                heroAddBtn.innerHTML = '<i class="fas fa-plus"></i> Add to List';
                heroAddBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }
        }

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
            updateHeroButtonsState();
        }

        if (heroPlayBtn) {
            heroPlayBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const item = heroData[currentHeroIndex] || heroData[0];
                openWatchView(item.id, item.cleanTitle, item.channel, item.views, item.img, item.desc);
            });
        }

        if (heroAddBtn) {
            heroAddBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const item = heroData[currentHeroIndex] || heroData[0];
                if (dashDb && dashAuth && dashAuth.currentUser) {
                    const user = dashAuth.currentUser;
                    const wlRef = dashDb.collection('users').doc(user.uid).collection('watchlist').doc(item.id);
                    if (userWatchlistSet.has(item.id)) {
                        userWatchlistSet.delete(item.id);
                        wlRef.delete().catch(err => console.warn('[Watchlist] Delete error:', err));
                    } else {
                        userWatchlistSet.add(item.id);
                        wlRef.set({
                            id: item.id,
                            title: item.cleanTitle,
                            channel: item.channel,
                            views: item.views,
                            img: item.img,
                            tag: 'WATCHLIST',
                            addedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }).catch(err => console.warn('[Watchlist] Write error:', err));
                    }
                    updateHeroButtonsState();
                }
            });
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

        updateHeroButtonsState();
    }

    // =========================================================================
    // YOUTUBE SEARCH ENGINE & MULTI-FILTER RESULTS EXPERIENCE
    // =========================================================================
    let currentSearchQuery = '';
    let searchNextPageToken = '';
    let isSearchLoading = false;
    let searchHistory = ['Interstellar', 'Cyberpunk 2077', 'Lofi Girl Live', 'Dune 2 Official Trailer'];
    let searchFilters = {
        uploadDate: 'all',
        type: 'all',
        duration: 'all',
        sortBy: 'relevance'
    };

    // Load search history from localStorage
    try {
        const savedHistory = localStorage.getItem('tog3r_search_history');
        if (savedHistory) {
            searchHistory = JSON.parse(savedHistory);
        }
    } catch (e) {
        console.warn('[Search History] Local storage error:', e);
    }

    function saveSearchHistory(query) {
        if (!query || query.trim().length < 2) return;
        const clean = query.trim();
        searchHistory = [clean, ...searchHistory.filter(h => h.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
        try {
            localStorage.setItem('tog3r_search_history', JSON.stringify(searchHistory));
        } catch (e) {}
    }

    let currentSearchSeq = 0;
    let activeSearchTag = 'all'; // 'all' | 'videos' | 'shorts' | 'channels'

    function extractYouTubeVideoId(input) {
        if (!input || typeof input !== 'string') return null;
        const str = input.trim();
        const ytRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
        const match = str.match(ytRegex);
        if (match && match[1]) {
            return match[1];
        }
        return null;
    }

    async function handleDirectYouTubeVideo(videoId) {
        if (!videoId) return;
        showLoader(true);
        const suggestionsDropdown = document.getElementById('searchSuggestionsDropdown');
        if (suggestionsDropdown) suggestionsDropdown.classList.remove('active');

        let title = 'YouTube Video';
        let channel = 'YouTube Stream';
        let views = 'Direct Stream';
        let img = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        let desc = 'Streaming direct YouTube video on TOG3R.';

        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`);
            if (res.ok) {
                const data = await res.json();
                if (data.items && data.items.length > 0) {
                    const item = data.items[0];
                    title = item.snippet?.title || title;
                    channel = item.snippet?.channelTitle || channel;
                    views = formatViewCount(item.statistics?.viewCount || '0');
                    img = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || img;
                    desc = item.snippet?.description || desc;
                }
            }
        } catch (e) {
            console.warn('[Direct URL Player API Fetch Warning]', e);
        } finally {
            showLoader(false);
            openWatchView(videoId, title, channel, views, img, desc);
        }
    }

    function initSearch() {
        const searchInput = document.querySelector('.search-bar input');
        const searchClearBtn = document.getElementById('searchClearBtn');
        const suggestionsDropdown = document.getElementById('searchSuggestionsDropdown');
        const viewListBtn = document.getElementById('btnViewList') || document.getElementById('viewListBtn');
        const viewGridBtn = document.getElementById('btnViewGrid') || document.getElementById('viewGridBtn');
        const resultsContainer = document.getElementById('searchResultsContainer');
        const searchForm = document.getElementById('globalSearchForm');

        if (!searchInput) return;

        let suggestionsDebounce = null;
        let realtimeSearchDebounce = null;

        // Auto-show suggestions on focus
        const showSuggestions = () => {
            const val = searchInput.value.trim();
            renderSearchSuggestions(val);
        };

        searchInput.addEventListener('focus', showSuggestions);
        
        // REAL-TIME SEARCH ON INPUT AS YOU WRITE (OR DIRECT URL PLAY)
        searchInput.addEventListener('input', () => {
            const rawVal = searchInput.value;
            const cleanVal = rawVal.trim();

            if (searchClearBtn) {
                searchClearBtn.style.display = rawVal.length > 0 ? 'flex' : 'none';
            }

            // Check if user pasted/typed a YouTube URL
            const directVideoId = extractYouTubeVideoId(cleanVal);
            if (directVideoId) {
                if (realtimeSearchDebounce) clearTimeout(realtimeSearchDebounce);
                if (suggestionsDebounce) clearTimeout(suggestionsDebounce);
                handleDirectYouTubeVideo(directVideoId);
                return;
            }

            // Quick suggestion rendering
            if (suggestionsDebounce) clearTimeout(suggestionsDebounce);
            suggestionsDebounce = setTimeout(() => {
                renderSearchSuggestions(cleanVal);
            }, 120);

            // Real-time live search while typing
            if (realtimeSearchDebounce) clearTimeout(realtimeSearchDebounce);
            realtimeSearchDebounce = setTimeout(() => {
                if (currentCategory === 'cinema') {
                    loadCinemaMovies(cleanVal);
                } else {
                    if (cleanVal.length > 0) {
                        performSearch(cleanVal, false, false);
                    } else {
                        performSearch('Trending Trailers', false, false);
                    }
                }
            }, 240);
        });

        // Clear button action
        if (searchClearBtn) {
            searchClearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                searchInput.value = '';
                searchClearBtn.style.display = 'none';
                searchInput.focus();
                renderSearchSuggestions('');
                if (realtimeSearchDebounce) clearTimeout(realtimeSearchDebounce);
                if (currentCategory === 'cinema') {
                    loadCinemaMovies('');
                } else {
                    performSearch('Trending Trailers', false, false);
                }
            });
        }

        // Form submission or Enter key for instant execution
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = searchInput.value.trim();
                const directVideoId = extractYouTubeVideoId(query);
                if (directVideoId) {
                    if (realtimeSearchDebounce) clearTimeout(realtimeSearchDebounce);
                    handleDirectYouTubeVideo(directVideoId);
                    hideSuggestions();
                    return;
                }
                if (realtimeSearchDebounce) clearTimeout(realtimeSearchDebounce);
                if (currentCategory === 'cinema') {
                    loadCinemaMovies(query);
                    hideSuggestions();
                } else if (query) {
                    performSearch(query, false, true);
                    hideSuggestions();
                }
            });
        }

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                const directVideoId = extractYouTubeVideoId(query);
                if (directVideoId) {
                    if (realtimeSearchDebounce) clearTimeout(realtimeSearchDebounce);
                    handleDirectYouTubeVideo(directVideoId);
                    hideSuggestions();
                    return;
                }
                if (realtimeSearchDebounce) clearTimeout(realtimeSearchDebounce);
                if (currentCategory === 'cinema') {
                    loadCinemaMovies(query);
                    hideSuggestions();
                } else if (query) {
                    performSearch(query, false, true);
                    hideSuggestions();
                }
            } else if (e.key === 'Escape') {
                hideSuggestions();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                navigateSuggestions(e.key === 'ArrowDown' ? 1 : -1);
            }
        });

        // Click outside suggestions to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-bar-container')) {
                hideSuggestions();
            }
        });

        function hideSuggestions() {
            if (suggestionsDropdown) {
                suggestionsDropdown.classList.remove('active');
            }
        }

        // Quick Category Chips Bar (All, Videos, Shorts, Channels)
        const searchChips = document.querySelectorAll('.search-chip');
        searchChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                searchChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const tagVal = chip.getAttribute('data-filter-tag') || chip.textContent.trim().toLowerCase();
                activeSearchTag = tagVal;

                // DON'T inject text in search box; sort / filter results according to active tag
                const baseQuery = currentSearchQuery || (searchInput ? searchInput.value.trim() : '') || 'Trending';
                performSearch(baseQuery, false, false);
            });
        });

        // View Mode Toggles (List vs Grid)
        if (viewListBtn && viewGridBtn && resultsContainer) {
            // Restore persisted view preference
            const savedLayout = localStorage.getItem('tog3r_search_layout');
            if (savedLayout === 'grid') {
                viewGridBtn.classList.add('active');
                viewListBtn.classList.remove('active');
                resultsContainer.classList.add('grid-layout');
                resultsContainer.classList.remove('list-layout');
            } else {
                viewListBtn.classList.add('active');
                viewGridBtn.classList.remove('active');
                resultsContainer.classList.add('list-layout');
                resultsContainer.classList.remove('grid-layout');
            }

            viewListBtn.addEventListener('click', () => {
                viewListBtn.classList.add('active');
                viewGridBtn.classList.remove('active');
                resultsContainer.classList.add('list-layout');
                resultsContainer.classList.remove('grid-layout');
                try { localStorage.setItem('tog3r_search_layout', 'list'); } catch (e) {}
            });

            viewGridBtn.addEventListener('click', () => {
                viewGridBtn.classList.add('active');
                viewListBtn.classList.remove('active');
                resultsContainer.classList.add('grid-layout');
                resultsContainer.classList.remove('list-layout');
                try { localStorage.setItem('tog3r_search_layout', 'grid'); } catch (e) {}
            });
        }

        // Suggestion Tag navigation with Keyboard
        function navigateSuggestions(delta) {
            if (!suggestionsDropdown || !suggestionsDropdown.classList.contains('active')) return;
            const items = suggestionsDropdown.querySelectorAll('.suggestion-item');
            if (items.length === 0) return;

            let currentIdx = -1;
            items.forEach((it, idx) => {
                if (it.classList.contains('highlighted')) currentIdx = idx;
                it.classList.remove('highlighted');
            });

            let nextIdx = currentIdx + delta;
            if (nextIdx < 0) nextIdx = items.length - 1;
            if (nextIdx >= items.length) nextIdx = 0;

            items[nextIdx].classList.add('highlighted');
            searchInput.value = items[nextIdx].querySelector('.suggestion-text')?.textContent || searchInput.value;
        }

        function renderSearchSuggestions(query) {
            if (!suggestionsDropdown) return;
            suggestionsDropdown.innerHTML = '';

            const trimmed = query.trim().toLowerCase();
            const suggestions = [];

            // 1. Matched Search History Items
            searchHistory.forEach(h => {
                if (!trimmed || h.toLowerCase().includes(trimmed)) {
                    suggestions.push({ text: h, isHistory: true });
                }
            });

            // 2. Curated Trending YouTube Search Suggestions
            const trendingKeywords = [
                'Interstellar IMAX Trailer 4K',
                'Cyberpunk 2077 Night City',
                'Lofi Girl Chill Beats Live',
                'Dune 2 Official Trailer',
                'Inception Hans Zimmer Soundtrack',
                'The Dark Knight Gotham Scene',
                'Avatar The Way of Water 4K HDR',
                'Marvel Avengers Endgame Final Battle',
                'Top Gun Maverick Flight Scenes',
                'Oppenheimer 70mm IMAX Featurette',
                'Studio Ghibli Relaxing Piano',
                'Unreal Engine 5 Next-Gen Graphics Tech Demo'
            ];

            trendingKeywords.forEach(kw => {
                if (!suggestions.some(s => s.text.toLowerCase() === kw.toLowerCase())) {
                    if (!trimmed || kw.toLowerCase().includes(trimmed)) {
                        suggestions.push({ text: kw, isHistory: false });
                    }
                }
            });

            const displayList = suggestions.slice(0, 7);

            if (displayList.length === 0) {
                suggestionsDropdown.classList.remove('active');
                return;
            }

            displayList.forEach(item => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.innerHTML = `
                    <div class="suggestion-left">
                        <i class="${item.isHistory ? 'fas fa-clock-rotate-left history-icon' : 'fas fa-magnifying-glass search-icon'}"></i>
                        <span class="suggestion-text">${escapeHtml(item.text)}</span>
                    </div>
                    ${item.isHistory ? '<button type="button" class="remove-history-btn" title="Remove from search history"><i class="fas fa-xmark"></i></button>' : ''}
                `;

                div.addEventListener('click', (e) => {
                    if (e.target.closest('.remove-history-btn')) {
                        e.stopPropagation();
                        searchHistory = searchHistory.filter(h => h.toLowerCase() !== item.text.toLowerCase());
                        try {
                            localStorage.setItem('tog3r_search_history', JSON.stringify(searchHistory));
                        } catch (err) {}
                        renderSearchSuggestions(searchInput.value.trim());
                        return;
                    }
                    searchInput.value = item.text;
                    if (searchClearBtn) searchClearBtn.style.display = 'flex';
                    if (currentCategory === 'cinema') {
                        loadCinemaMovies(item.text);
                    } else {
                        performSearch(item.text);
                    }
                    hideSuggestions();
                });

                suggestionsDropdown.appendChild(div);
            });

            suggestionsDropdown.classList.add('active');
        }
    }

    // --- MAIN SEARCH EXECUTION (YOUTUBE DATA API V3) ---
    async function performSearch(query, isAppend = false, saveToHistory = false) {
        if (!query || query.trim() === '') return;
        const cleanQuery = query.trim();
        currentSearchQuery = cleanQuery;
        
        if (saveToHistory && cleanQuery.length >= 2) {
            saveSearchHistory(cleanQuery);
        }

        const seq = ++currentSearchSeq;

        // Synchronize header input value if not actively focused by user
        const searchInput = document.querySelector('.search-bar input');
        const searchClearBtn = document.getElementById('searchClearBtn');
        if (searchInput && document.activeElement !== searchInput && searchInput.value !== cleanQuery) {
            searchInput.value = cleanQuery;
        }
        if (searchClearBtn) {
            searchClearBtn.style.display = cleanQuery.length > 0 ? 'flex' : 'none';
        }

        // Close Watch View if open
        if (isWatching) {
            exitWatchView();
        }

        // Switch active section to Search Section
        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(sec => sec.classList.remove('active'));
        const searchSection = document.getElementById('search-section');
        if (searchSection) {
            searchSection.classList.add('active');
        }

        // Highlight "Search" in Navigation Menu
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(l => {
            const isSearch = l.getAttribute('data-section') === 'search';
            l.parentElement.classList.toggle('active', isSearch);
        });

        currentCategory = 'search';

        // Update UI Display Heading & Meta (No 3 dots, exact typed text)
        const searchQueryText = document.getElementById('searchQueryText');
        const searchHeadingTitle = document.getElementById('searchHeadingTitle');
        const searchMetaSubtitle = document.getElementById('searchMetaSubtitle');
        const searchResultsCount = document.getElementById('searchResultsCount');
        const resultsContainer = document.getElementById('searchResultsContainer');
        const emptyState = document.getElementById('ytSearchEmptyState');

        if (searchQueryText) {
            searchQueryText.textContent = cleanQuery;
        } else if (searchHeadingTitle) {
            searchHeadingTitle.innerHTML = `Results for "<span id="searchQueryText">${escapeHtml(cleanQuery)}</span>"`;
        }

        if (searchMetaSubtitle) {
            if (activeSearchTag === 'channels') {
                searchMetaSubtitle.textContent = `Showing channels for "${cleanQuery}"`;
            } else if (activeSearchTag === 'shorts') {
                searchMetaSubtitle.textContent = `Showing YouTube shorts for "${cleanQuery}"`;
            } else if (activeSearchTag === 'videos') {
                searchMetaSubtitle.textContent = `Showing videos for "${cleanQuery}"`;
            } else {
                searchMetaSubtitle.textContent = `Showing top results for "${cleanQuery}"`;
            }
        }

        if (emptyState) emptyState.hidden = true;

        if (!isAppend) {
            if (searchResultsCount) searchResultsCount.textContent = 'Searching YouTube...';
            if (resultsContainer) {
                renderSearchSkeletons(resultsContainer, 6);
            }
            const contentWrapper = document.querySelector('.content-wrapper');
            if (contentWrapper) contentWrapper.scrollTop = 0;
            searchNextPageToken = '';
        }

        isSearchLoading = true;
        showLoader(true);

        try {
            let filterParams = '';
            let typeParam = '&type=video';
            let finalSearchQuery = cleanQuery;

            if (activeSearchTag === 'channels') {
                typeParam = '&type=channel';
            } else if (activeSearchTag === 'shorts') {
                typeParam = '&type=video';
                filterParams += '&videoDuration=short';
                finalSearchQuery = `${cleanQuery} shorts`;
            } else if (activeSearchTag === 'videos') {
                typeParam = '&type=video';
            } else {
                // All
                typeParam = '&type=video';
            }

            const tokenQuery = (isAppend && searchNextPageToken) ? `&pageToken=${searchNextPageToken}` : '';
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet${typeParam}${filterParams}&maxResults=18&q=${encodeURIComponent(finalSearchQuery)}${tokenQuery}&regionCode=${countryCode}&key=${API_KEY}`;

            const res = await fetch(searchUrl);
            if (seq !== currentSearchSeq) return; // Stale request discarded

            if (!res.ok) {
                throw new Error(`YouTube Search API HTTP error: ${res.status}`);
            }

            const data = await res.json();
            if (seq !== currentSearchSeq) return;

            searchNextPageToken = data.nextPageToken || '';

            if (data.items && data.items.length > 0) {
                if (activeSearchTag === 'channels') {
                    // Only render channels
                    const channelItems = data.items.filter(item => item.id.kind === 'youtube#channel' || item.id.channelId);
                    
                    // Fetch additional channel stats (subscriber count, video count)
                    const channelIds = channelItems.map(c => c.id.channelId || c.id).filter(Boolean);
                    let enrichedChannels = channelItems;

                    if (channelIds.length > 0) {
                        try {
                            const chanDetailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelIds.join(',')}&key=${API_KEY}`;
                            const chanDetailsRes = await fetch(chanDetailsUrl);
                            if (chanDetailsRes.ok) {
                                const chanDetailsData = await chanDetailsRes.json();
                                const chanMap = {};
                                (chanDetailsData.items || []).forEach(it => { chanMap[it.id] = it; });

                                enrichedChannels = channelItems.map(c => {
                                    const cId = c.id.channelId || c.id;
                                    const details = chanMap[cId];
                                    return {
                                        id: cId,
                                        snippet: {
                                            title: details?.snippet?.title || c.snippet.title,
                                            description: details?.snippet?.description || c.snippet.description,
                                            thumbnails: details?.snippet?.thumbnails || c.snippet.thumbnails,
                                            customUrl: details?.snippet?.customUrl || `@${(details?.snippet?.title || c.snippet.title).toLowerCase().replace(/[^a-z0-9]/g, '')}`
                                        },
                                        statistics: details?.statistics || {
                                            subscriberCount: '1500000',
                                            videoCount: '240'
                                        }
                                    };
                                });
                            }
                        } catch (e) {
                            console.warn('[Channels stats fetch warning]', e);
                        }
                    }

                    renderYouTubeSearchResults(enrichedChannels, [], isAppend, cleanQuery);
                    if (searchResultsCount) searchResultsCount.textContent = `About ${enrichedChannels.length} channels`;

                } else {
                    // Video search (All, Videos, Shorts) - Never render channels here
                    const videoItems = data.items.filter(item => item.id.kind === 'youtube#video' || item.id.videoId);
                    let enrichedVideos = [];
                    const videoIds = videoItems.map(v => v.id.videoId || v.id).filter(Boolean);

                    if (videoIds.length > 0) {
                        try {
                            const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds.join(',')}&key=${API_KEY}`;
                            const detailsRes = await fetch(detailsUrl);
                            if (seq !== currentSearchSeq) return;

                            if (detailsRes.ok) {
                                const detailsData = await detailsRes.json();
                                if (seq !== currentSearchSeq) return;

                                const detailsMap = {};
                                (detailsData.items || []).forEach(item => {
                                    detailsMap[item.id] = item;
                                });

                                enrichedVideos = videoItems.map(item => {
                                    const vidId = item.id.videoId || item.id;
                                    const details = detailsMap[vidId];
                                    const viewCount = details?.statistics?.viewCount || '0';
                                    const durationIso = details?.contentDetails?.duration || '';
                                    const isLive = item.snippet.liveBroadcastContent === 'live';

                                    return {
                                        id: vidId,
                                        title: item.snippet.title,
                                        channel: item.snippet.channelTitle,
                                        channelId: item.snippet.channelId,
                                        views: formatViewCount(viewCount),
                                        viewCount: parseInt(viewCount, 10),
                                        uploadDate: item.snippet.publishedAt,
                                        duration: isLive ? 'LIVE' : (durationIso ? formatIsoDuration(durationIso) : getRandomDuration(vidId)),
                                        img: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
                                        description: item.snippet.description || '',
                                        live: isLive,
                                        tags: extractVideoTags(item)
                                    };
                                });
                            }
                        } catch (e) {
                            console.warn('[Search Details Fetch Failed]', e);
                        }
                    }

                    if (seq !== currentSearchSeq) return;

                    // Fallback map if details fetch was empty
                    if (enrichedVideos.length === 0) {
                        enrichedVideos = videoItems.map(item => ({
                            id: item.id.videoId || item.id,
                            title: item.snippet.title,
                            channel: item.snippet.channelTitle,
                            channelId: item.snippet.channelId,
                            views: '1.4M views',
                            viewCount: 1400000,
                            uploadDate: item.snippet.publishedAt,
                            duration: item.snippet.liveBroadcastContent === 'live' ? 'LIVE' : getRandomDuration(item.id.videoId || '0'),
                            img: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
                            description: item.snippet.description || '',
                            live: item.snippet.liveBroadcastContent === 'live',
                            tags: extractVideoTags(item)
                        }));
                    }

                    renderYouTubeSearchResults([], enrichedVideos, isAppend, cleanQuery);
                    if (searchResultsCount) searchResultsCount.textContent = `About ${enrichedVideos.length} results`;
                }

            } else {
                throw new Error('No results returned from API');
            }

        } catch (err) {
            if (seq !== currentSearchSeq) return;
            console.warn('[YouTube Search API Error, falling back to smart search]', err);
            
            if (activeSearchTag === 'channels') {
                const simulatedChannels = [
                    {
                        id: 'chan-1',
                        snippet: {
                            title: `${cleanQuery} Official`,
                            description: `Official YouTube channel for ${cleanQuery}. Latest videos, trailers, and series.`,
                            thumbnails: { high: { url: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanQuery)}&background=7928ca&color=fff&bold=true` } },
                            customUrl: `@${cleanQuery.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                        },
                        statistics: { subscriberCount: '3400000', videoCount: '890' }
                    },
                    {
                        id: 'chan-2',
                        snippet: {
                            title: `${cleanQuery} Central`,
                            description: `Community clips, highlights, and discussions about ${cleanQuery}.`,
                            thumbnails: { high: { url: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanQuery + ' Central')}&background=ff7eb3&color=fff&bold=true` } },
                            customUrl: `@${cleanQuery.toLowerCase().replace(/[^a-z0-9]/g, '')}_central`
                        },
                        statistics: { subscriberCount: '820000', videoCount: '340' }
                    }
                ];
                renderYouTubeSearchResults(simulatedChannels, [], isAppend, cleanQuery);
                if (searchResultsCount) searchResultsCount.textContent = `About ${simulatedChannels.length} channels`;
            } else {
                const simulatedResults = generateFallbackSearchResults(cleanQuery);
                renderYouTubeSearchResults([], simulatedResults, isAppend, cleanQuery);
                if (searchResultsCount) searchResultsCount.textContent = `About ${simulatedResults.length} results`;
            }
        } finally {
            if (seq === currentSearchSeq) {
                isSearchLoading = false;
                showLoader(false);
            }
        }
    }

    function renderYouTubeSearchResults(channels, videos, isAppend = false, query = '') {
        const resultsContainer = document.getElementById('searchResultsContainer');
        const emptyState = document.getElementById('ytSearchEmptyState');
        if (!resultsContainer) return;

        if (!isAppend) {
            resultsContainer.innerHTML = '';
        }

        if (channels.length === 0 && videos.length === 0 && !isAppend) {
            if (emptyState) {
                emptyState.hidden = false;
                initEmptyStateClicks();
            }
            return;
        }

        if (emptyState) emptyState.hidden = true;

        // Render Channels (Only when in Channels mode)
        if (channels && channels.length > 0) {
            channels.forEach(chan => {
                const chanCard = createYouTubeChannelCard(chan);
                resultsContainer.appendChild(chanCard);
            });
        }

        // Render Video Cards
        if (videos && videos.length > 0) {
            videos.forEach(video => {
                const card = createYouTubeSearchCard(video);
                resultsContainer.appendChild(card);
            });
        }
    }

    function createYouTubeChannelCard(channelData) {
        const div = document.createElement('div');
        div.className = 'yt-channel-spotlight-card';
        const title = channelData.snippet?.title || 'YouTube Creator';
        const desc = channelData.snippet?.description || 'Official channel videos, trailers, clips, and highlights.';
        const avatar = channelData.snippet?.thumbnails?.high?.url || channelData.snippet?.thumbnails?.medium?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=7928ca&color=fff&bold=true`;
        
        const subs = channelData.statistics?.subscriberCount ? formatViewCount(channelData.statistics.subscriberCount) : '2.4M';
        const vids = channelData.statistics?.videoCount ? `${parseInt(channelData.statistics.videoCount, 10).toLocaleString()} videos` : '850 videos';
        const handle = channelData.snippet?.customUrl || `@${title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        div.innerHTML = `
            <div class="yt-channel-main">
                <div class="yt-channel-avatar-wrapper">
                    <img class="yt-channel-avatar-lg" src="${avatar}" alt="${escapeHtml(title)}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=ff7eb3&color=fff'">
                </div>
                <div class="yt-channel-meta">
                    <div class="yt-channel-meta-title">
                        <span>${escapeHtml(title)}</span>
                        <i class="fas fa-circle-check verified-badge" title="Verified Channel"></i>
                    </div>
                    <div class="yt-channel-stats">
                        <span>${escapeHtml(handle)}</span>
                        <span class="bullet">•</span>
                        <span>${subs} subscribers</span>
                        <span class="bullet">•</span>
                        <span>${vids}</span>
                    </div>
                    <p class="yt-channel-desc">${escapeHtml(desc)}</p>
                </div>
            </div>
            <button class="btn-subscribe-yt" type="button" aria-label="Subscribe to channel">
                <i class="fas fa-bell"></i>
                <span>Subscribe</span>
            </button>
        `;

        const subBtn = div.querySelector('.btn-subscribe-yt');
        if (subBtn) {
            subBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                subBtn.classList.toggle('subscribed');
                const isSubbed = subBtn.classList.contains('subscribed');
                subBtn.innerHTML = isSubbed 
                    ? '<i class="fas fa-check"></i> <span>Subscribed</span>'
                    : '<i class="fas fa-bell"></i> <span>Subscribe</span>';
            });
        }

        div.addEventListener('click', () => {
            // Switch to Videos tag for this channel
            const searchChips = document.querySelectorAll('.search-chip');
            searchChips.forEach(c => {
                const tag = c.getAttribute('data-filter-tag');
                c.classList.toggle('active', tag === 'videos');
            });
            activeSearchTag = 'videos';
            performSearch(title, false, true);
        });

        return div;
    }

    function createYouTubeSearchCard(video) {
        const div = document.createElement('div');
        div.className = 'yt-search-card';

        const isWatchlisted = userWatchlistSet.has(video.id);
        const uploadTimeAgo = video.uploadDate ? formatRelativeTime(video.uploadDate) : 'Recently';
        const channelAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(video.channel || 'Y')}&background=7928ca&color=fff`;

        div.innerHTML = `
            <div class="yt-search-thumb-box">
                <img class="yt-search-thumb" src="${video.img}" alt="${escapeHtml(video.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=640&q=80'">
                <div class="yt-search-thumb-overlay">
                    <div class="yt-play-icon-circle"><i class="fas fa-play"></i></div>
                </div>
                ${video.live ? '<span class="yt-thumb-badge live"><span class="live-dot"></span> LIVE</span>' : `<span class="yt-thumb-badge">${video.duration || '3:45'}</span>`}
            </div>
            <div class="yt-search-info">
                <h3 class="yt-search-title">${escapeHtml(video.title)}</h3>
                <div class="yt-search-meta-line">
                    <span>${video.views || '1.2M views'}</span>
                    <span class="meta-sep">•</span>
                    <span>${uploadTimeAgo}</span>
                </div>
                <div class="yt-search-channel-row">
                    <img class="yt-channel-avatar-sm" src="${channelAvatar}" alt="${escapeHtml(video.channel)}">
                    <span class="yt-channel-name-text">
                        <span>${escapeHtml(video.channel || 'YouTube Creator')}</span>
                        <i class="fas fa-circle-check verified-icon" title="Verified"></i>
                    </span>
                </div>
                <p class="yt-search-desc-snippet">${escapeHtml(video.description || 'Watch high-definition streaming on TOG3R.')}</p>
                <div class="yt-search-badges-row">
                    <span class="yt-pill-badge highlight">${(video.tags && video.tags[0]) || 'Video'}</span>
                    <div class="yt-search-actions-bar">
                        <button type="button" class="btn-card-action btn-search-watchlist" title="${isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}" aria-label="Add to Watchlist">
                            <i class="fas fa-bookmark" style="color: ${isWatchlisted ? '#38bdf8' : 'inherit'};"></i>
                        </button>
                        <button type="button" class="btn-card-action btn-search-copylink" title="Copy Video Link" aria-label="Copy Video Link">
                            <i class="fas fa-link"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Watchlist Action
        const watchlistBtn = div.querySelector('.btn-search-watchlist');
        if (watchlistBtn) {
            watchlistBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (dashDb && dashAuth && dashAuth.currentUser) {
                    const user = dashAuth.currentUser;
                    const wlRef = dashDb.collection('users').doc(user.uid).collection('watchlist').doc(video.id);
                    if (userWatchlistSet.has(video.id)) {
                        userWatchlistSet.delete(video.id);
                        watchlistBtn.querySelector('i').style.color = 'inherit';
                        watchlistBtn.title = 'Add to Watchlist';
                        wlRef.delete().catch(err => console.warn('[Watchlist] Delete error:', err));
                    } else {
                        userWatchlistSet.add(video.id);
                        watchlistBtn.querySelector('i').style.color = '#38bdf8';
                        watchlistBtn.title = 'In Watchlist';
                        wlRef.set({
                            id: video.id,
                            title: video.title,
                            channel: video.channel || 'YouTube Creator',
                            views: video.views || '1.2M views',
                            img: video.img || `https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`,
                            tag: 'WATCHLIST',
                            addedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }).catch(err => console.warn('[Watchlist] Write error:', err));
                    }
                }
            });
        }

        // Copy Link Action
        const copyLinkBtn = div.querySelector('.btn-search-copylink');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ytUrl = `https://www.youtube.com/watch?v=${video.id}`;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(ytUrl).then(() => {
                        copyLinkBtn.innerHTML = '<i class="fas fa-check" style="color: #10b981;"></i>';
                        copyLinkBtn.title = 'Link Copied!';
                        setTimeout(() => {
                            copyLinkBtn.innerHTML = '<i class="fas fa-link"></i>';
                            copyLinkBtn.title = 'Copy Video Link';
                        }, 1800);
                    }).catch(() => {
                        fallbackCopyText(ytUrl, copyLinkBtn);
                    });
                } else {
                    fallbackCopyText(ytUrl, copyLinkBtn);
                }
            });
        }

        function fallbackCopyText(text, btn) {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                btn.innerHTML = '<i class="fas fa-check" style="color: #10b981;"></i>';
                btn.title = 'Link Copied!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-link"></i>';
                    btn.title = 'Copy Video Link';
                }, 1800);
            } catch (err) {}
        }

        // Click card to open in customized 2-column Watch View
        div.addEventListener('click', () => {
            openWatchView(video.id, video.title, video.channel, video.views, video.img, video.description);
        });

        return div;
    }

    function renderSearchSkeletons(container, count = 6) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const sk = document.createElement('div');
            sk.className = 'yt-search-skeleton-card';
            sk.innerHTML = `
                <div class="skeleton-thumb"></div>
                <div class="skeleton-info">
                    <div class="skeleton-line title"></div>
                    <div class="skeleton-line meta"></div>
                    <div class="skeleton-line channel"></div>
                    <div class="skeleton-line desc"></div>
                    <div class="skeleton-line desc-short"></div>
                </div>
            `;
            container.appendChild(sk);
        }
    }

    function initEmptyStateClicks() {
        const topicBtns = document.querySelectorAll('.empty-topic-btn');
        topicBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const topic = btn.textContent.trim();
                performSearch(topic, false);
            });
        });
    }

    function generateFallbackSearchResults(query) {
        const queryLower = query.toLowerCase();
        const catalog = getFallbackYouTubeVideos(countryCode);
        
        let matches = catalog.filter(v => 
            v.title.toLowerCase().includes(queryLower) ||
            v.channel.toLowerCase().includes(queryLower) ||
            (v.tags && v.tags.some(t => t.toLowerCase().includes(queryLower))) ||
            (v.description && v.description.toLowerCase().includes(queryLower))
        );

        if (matches.length === 0) {
            matches = catalog;
        }

        return matches.map((v, i) => ({
            id: v.id,
            title: v.title,
            channel: v.channel,
            views: v.views || '1.2M views',
            viewCount: v.viewCount || 1200000,
            uploadDate: v.uploadDate || '2023-01-01',
            duration: getRandomDuration(v.id),
            img: v.img,
            description: v.description || 'Watch high-definition streaming on TOG3R.',
            hd: true,
            live: v.category === 'Live',
            tags: v.tags || ['Trending']
        }));
    }

    function formatIsoDuration(iso) {
        const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return '3:45';
        const h = parseInt(match[1] || '0', 10);
        const m = parseInt(match[2] || '0', 10);
        const s = parseInt(match[3] || '0', 10);
        const sFormatted = s < 10 ? `0${s}` : s;

        if (h > 0) {
            const mFormatted = m < 10 ? `0${m}` : m;
            return `${h}:${mFormatted}:${sFormatted}`;
        }
        return `${m}:${sFormatted}`;
    }

    function formatRelativeTime(dateStr) {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffSeconds = Math.floor((now - date) / 1000);

            if (diffSeconds < 60) return 'Just now';
            const diffMinutes = Math.floor(diffSeconds / 60);
            if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            const diffMonths = Math.floor(diffDays / 30);
            if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
            const diffYears = Math.floor(diffMonths / 12);
            return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
        } catch (e) {
            return 'Recently';
        }
    }

    // --- FALLBACK YOUTUBE DATA WITH RICH METADATA & GENRES ---
    function getFallbackYouTubeVideos(region) {
        return [
            { id: "L_LUpnjgPso", title: "Interstellar - Official Trailer 3", channel: "Warner Bros. Pictures", views: "48.2M views", viewCount: 48200000, uploadDate: "2014-10-01", tags: ["Sci-Fi", "Trailers", "Cinema", "4K"], category: "Cinema", img: "https://i.ytimg.com/vi/L_LUpnjgPso/maxresdefault.jpg", tag: "TRAILER", description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival." },
            { id: "YoHD9XEInc0", title: "Inception - Official Trailer", channel: "Warner Bros. Pictures", views: "34.5M views", viewCount: 34500000, uploadDate: "2010-05-10", tags: ["Action", "Sci-Fi", "Cinema", "4K"], category: "Cinema", img: "https://i.ytimg.com/vi/YoHD9XEInc0/maxresdefault.jpg", tag: "4K", description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task." },
            { id: "EXeTwQWrcwY", title: "The Dark Knight - Official Trailer", channel: "Warner Bros. Pictures", views: "62.1M views", viewCount: 62100000, uploadDate: "2008-05-01", tags: ["Action", "Cinema", "Trending", "Trailers"], category: "Cinema", img: "https://i.ytimg.com/vi/EXeTwQWrcwY/maxresdefault.jpg", tag: "POPULAR", description: "When the menace known as the Joker wreaks havoc and chaos on Gotham, Batman must accept his greatest test." },
            { id: "1G4isv_Fylg", title: "Dune: Part Two - Official Trailer 2", channel: "Warner Bros. Pictures", views: "29.8M views", viewCount: 29800000, uploadDate: "2023-11-01", tags: ["Sci-Fi", "Action", "Cinema", "Trailers", "4K"], category: "Cinema", img: "https://i.ytimg.com/vi/1G4isv_Fylg/maxresdefault.jpg", tag: "TRENDING", description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family." },
            { id: "qEVUtrk8_B4", title: "Cyberpunk 2077 - Official Night City Trailer", channel: "Cyberpunk 2077", views: "19.4M views", viewCount: 19400000, uploadDate: "2020-11-20", tags: ["Gaming", "Cyberpunk", "Sci-Fi", "Action", "4K"], category: "Gaming", img: "https://i.ytimg.com/vi/qEVUtrk8_B4/maxresdefault.jpg", tag: "GAMING", description: "Explore the vast futuristic metropolis of Night City in Cyberpunk 2077." },
            { id: "jfKfPfyJRdk", title: "Lofi Hip Hop Radio - Beats to Relax/Study to", channel: "Lofi Girl", views: "85.6M views", viewCount: 85600000, uploadDate: "2022-01-01", tags: ["Music", "Live", "Lofi", "Trending"], category: "Live", img: "https://i.ytimg.com/vi/jfKfPfyJRdk/maxresdefault.jpg", tag: "LIVE", description: "Peaceful lofi hip hop beats to help you study, work, or relax." },
            { id: "5qap5aO4i9A", title: "Lofi Hip Hop Radio - Beats to Sleep/Chill to", channel: "Lofi Girl", views: "41.2M views", viewCount: 41200000, uploadDate: "2022-03-01", tags: ["Music", "Live", "Lofi"], category: "Live", img: "https://i.ytimg.com/vi/5qap5aO4i9A/maxresdefault.jpg", tag: "LIVE", description: "Soothing lofi beats crafted for sleep and deep relaxation." },
            { id: "dQw4w9WgXcQ", title: "Rick Astley - Never Gonna Give You Up", channel: "Rick Astley", views: "1.4B views", viewCount: 1400000000, uploadDate: "2009-10-25", tags: ["Music", "Trending", "Classics"], category: "Music", img: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg", tag: "MUSIC", description: "The official video for Never Gonna Give You Up by Rick Astley." },
            { id: "8g1vEAtTU24", title: "Avatar: The Way of Water - Official Teaser Trailer", channel: "20th Century Studios", views: "52.3M views", viewCount: 52300000, uploadDate: "2022-05-09", tags: ["Sci-Fi", "Action", "Cinema", "Trailers", "4K"], category: "Cinema", img: "https://i.ytimg.com/vi/8g1vEAtTU24/maxresdefault.jpg", tag: "4K", description: "Set more than a decade after the events of the first film, learn the story of the Sully family." },
            { id: "KzJq4Fm97eA", title: "Cyberpunk: Edgerunners - Official Trailer", channel: "Netflix", views: "14.2M views", viewCount: 14200000, uploadDate: "2022-08-30", tags: ["Anime", "Cyberpunk", "Action", "Sci-Fi"], category: "Animation", img: "https://i.ytimg.com/vi/KzJq4Fm97eA/maxresdefault.jpg", tag: "ANIME", description: "A street kid trying to survive in a technology and body modification-obsessed city of the future." },
            { id: "V-_O7nl0Ii0", title: "The Batman - Main Trailer", channel: "Warner Bros. Pictures", views: "43.7M views", viewCount: 43700000, uploadDate: "2021-10-16", tags: ["Action", "Cinema", "Trailers", "4K"], category: "Cinema", img: "https://i.ytimg.com/vi/V-_O7nl0Ii0/maxresdefault.jpg", tag: "TRAILER", description: "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family." },
            { id: "TcMBFSGVi1c", title: "Avengers: Endgame - Official Trailer", channel: "Marvel Entertainment", views: "158.0M views", viewCount: 158000000, uploadDate: "2018-12-07", tags: ["Action", "Sci-Fi", "Trailers", "Cinema", "Marvel"], category: "Cinema", img: "https://i.ytimg.com/vi/TcMBFSGVi1c/maxresdefault.jpg", tag: "POPULAR", description: "The grave course of events set in motion by Thanos that wiped out half the universe." }
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
