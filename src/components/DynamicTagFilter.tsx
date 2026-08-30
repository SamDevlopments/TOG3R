import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * ============================================================================
 * 1. DATA SCHEMA & CORE TYPE DEFINITIONS
 * ============================================================================
 */

export type VideoSkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface VideoItem {
  id: string;
  title: string;
  tags: string[];
  level: VideoSkillLevel;
  duration: number; // in seconds
  views: number;
  completionRate?: number; // global metric (0.0 to 1.0)
  channel?: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface TagAffinityMeta {
  score: number;
  lastWatchedTimestamp: number;
  fatigueCount: number; // number of refresh/session cycles shown without interaction
  highCompletionCount: number; // count of videos watched >= 80% with this tag
}

export interface LearningTrack {
  mainTag: string;
  depthScore: number; // 1 = beginner completed, 2 = intermediate completed, 3 = advanced completed
  startedTimestamp: number;
}

export interface WatchHistoryItem {
  videoId: string;
  watchedRatio: number; // 0.0 to 1.0
  timestamp: number;
  durationWatched: number; // seconds
}

export interface UserProfileState {
  tagAffinity: Record<string, TagAffinityMeta>;
  activeLearningTrack: LearningTrack | null;
  watchHistory: WatchHistoryItem[];
}

export interface RecommendationBuckets {
  learningTrack: VideoItem[];
  contextual: VideoItem[];
  coreInterests: VideoItem[];
  serendipitous: VideoItem[];
}

const STORAGE_KEY = 'tog3r_smart_user_profile_v1';
const MS_IN_24_HOURS = 24 * 60 * 60 * 1000;

/**
 * ============================================================================
 * 2. ALGORITHMIC HELPER FUNCTIONS (PURE / STATELESS)
 * ============================================================================
 */

/**
 * In-place modern Fisher-Yates shuffle algorithm.
 * Interleaves candidates to prevent category clumpiness.
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

/**
 * Calculates a video's baseline quality and personalization ranking value.
 * Applies:
 * - 1.5x Satisfaction completion boost
 * - 0.5x Anti-fatigue penalty
 * - 1.2x Novelty boost (unseen in 24h)
 * - Progressive Learning Track bonus
 */
export function calculateVideoValueScore(video: VideoItem, userState: UserProfileState): number {
  let score = 1.0;
  const now = Date.now();

  // Baseline normalized view/completion quality
  const viewFactor = Math.log10(Math.max(10, video.views)) / 6; // ~0.5 to 1.5
  const completionFactor = (video.completionRate ?? 0.7) * 1.2;
  score *= (viewFactor + completionFactor) / 2;

  let hasCompletedTag = false;
  let hasFatiguedTag = false;
  let isNovelTag = true;

  video.tags.forEach((tag) => {
    const affinity = userState.tagAffinity[tag];
    if (affinity) {
      // Rule: Completion Weight (1.5x boost if user completed videos with this tag > 80%)
      if (affinity.highCompletionCount > 0) {
        hasCompletedTag = true;
      }
      // Rule: Anti-Fatigue Penalty (0.5x if fatigueCount > 3)
      if (affinity.fatigueCount > 3) {
        hasFatiguedTag = true;
      }
      // Rule: Novelty Check (< 24h)
      if (now - affinity.lastWatchedTimestamp < MS_IN_24_HOURS) {
        isNovelTag = false;
      }
      // Apply existing affinity baseline
      score += affinity.score * 0.2;
    }
  });

  if (hasCompletedTag) score *= 1.5;
  if (hasFatiguedTag) score *= 0.5;
  if (isNovelTag && video.tags.length > 0) score *= 1.2;

  // Learning track depth matching boost
  if (userState.activeLearningTrack && video.tags.includes(userState.activeLearningTrack.mainTag)) {
    const currentDepth = userState.activeLearningTrack.depthScore;
    const targetLevel: VideoSkillLevel = currentDepth < 1.5 ? 'beginner' : currentDepth < 2.5 ? 'intermediate' : 'advanced';
    if (video.level === targetLevel) {
      score *= 1.8; // Strong progressive incentive
    }
  }

  return Math.max(0.1, score);
}

/**
 * Evaluates whether a user qualifies for an "Intent Track" rather than blind clicks.
 * If >= 2 recent watch history items share a niche tag with >= 60% completion,
 * an active learning track is created or deepened.
 */
export function deriveActiveLearningTrack(
  watchHistory: WatchHistoryItem[],
  allVideos: VideoItem[],
  currentTrack: LearningTrack | null
): LearningTrack | null {
  if (watchHistory.length < 2) return currentTrack;

  // Map video ID to Video metadata
  const videoMap = new Map<string, VideoItem>();
  allVideos.forEach(v => videoMap.set(v.id, v));

  // Inspect the last 5 watched videos
  const recentWatches = watchHistory.slice(-5);
  const tagIntentCounts: Record<string, { count: number; completedCount: number; maxLevelScore: number }> = {};

  recentWatches.forEach(w => {
    const v = videoMap.get(w.videoId);
    if (!v) return;

    const levelWeight = v.level === 'advanced' ? 3 : v.level === 'intermediate' ? 2 : 1;
    v.tags.forEach(t => {
      if (!tagIntentCounts[t]) {
        tagIntentCounts[t] = { count: 0, completedCount: 0, maxLevelScore: 1 };
      }
      tagIntentCounts[t].count += 1;
      if (w.watchedRatio >= 0.6) {
        tagIntentCounts[t].completedCount += 1;
      }
      tagIntentCounts[t].maxLevelScore = Math.max(tagIntentCounts[t].maxLevelScore, levelWeight);
    });
  });

  // Find tag with highest intent depth
  let highestIntentTag: string | null = null;
  let maxIntentScore = 0;

  Object.entries(tagIntentCounts).forEach(([tag, meta]) => {
    if (meta.count >= 2 && meta.completedCount >= 1) {
      const intentScore = meta.count * 1.5 + meta.completedCount * 2;
      if (intentScore > maxIntentScore) {
        maxIntentScore = intentScore;
        highestIntentTag = tag;
      }
    }
  });

  if (highestIntentTag) {
    const meta = tagIntentCounts[highestIntentTag];
    return {
      mainTag: highestIntentTag,
      depthScore: meta.maxLevelScore,
      startedTimestamp: currentTrack?.mainTag === highestIntentTag ? currentTrack.startedTimestamp : Date.now()
    };
  }

  return currentTrack;
}

/**
 * Assembles the home feed matching exact specified ratio distribution:
 * 1. Learning Track: 30%
 * 2. Contextual Context: 30%
 * 3. Core Interests: 20%
 * 4. Serendipitous Discovery: 20%
 */
export function generateSmartFeed(
  allVideos: VideoItem[],
  userState: UserProfileState,
  targetCount: number = 10
): VideoItem[] {
  if (!allVideos || allVideos.length === 0) return [];

  const watchedVideoIds = new Set(userState.watchHistory.map(w => w.videoId));
  // Filter out recently watched videos unless library is very small
  const availablePool = allVideos.filter(v => allVideos.length <= targetCount || !watchedVideoIds.has(v.id));

  // Determine quotas
  const countLearning = Math.max(1, Math.round(targetCount * 0.3));
  const countContextual = Math.max(1, Math.round(targetCount * 0.3));
  const countCore = Math.max(1, Math.round(targetCount * 0.2));
  const countDiscovery = Math.max(1, targetCount - (countLearning + countContextual + countCore));

  const selectedIds = new Set<string>();

  // 1. Learning Track (30%)
  const learningCandidates: VideoItem[] = [];
  if (userState.activeLearningTrack) {
    const { mainTag, depthScore } = userState.activeLearningTrack;
    const targetLevel: VideoSkillLevel = depthScore <= 1 ? 'beginner' : depthScore <= 2 ? 'intermediate' : 'advanced';

    // Prioritize progressive videos in current track
    availablePool
      .filter(v => v.tags.includes(mainTag))
      .sort((a, b) => {
        const aLevelMatch = a.level === targetLevel ? 2 : 1;
        const bLevelMatch = b.level === targetLevel ? 2 : 1;
        return (bLevelMatch * calculateVideoValueScore(b, userState)) - (aLevelMatch * calculateVideoValueScore(a, userState));
      })
      .forEach(v => {
        if (learningCandidates.length < countLearning && !selectedIds.has(v.id)) {
          learningCandidates.push(v);
          selectedIds.add(v.id);
        }
      });
  }

  // 2. Contextual Context (30%): Relies on most recent watch tags
  const recentWatches = userState.watchHistory.slice(-3);
  const recentTags = new Set<string>();
  recentWatches.forEach(w => {
    const v = allVideos.find(item => item.id === w.videoId);
    v?.tags.forEach(t => recentTags.add(t));
  });

  const contextualCandidates: VideoItem[] = [];
  availablePool
    .filter(v => !selectedIds.has(v.id) && v.tags.some(t => recentTags.has(t)))
    .sort((a, b) => calculateVideoValueScore(b, userState) - calculateVideoValueScore(a, userState))
    .forEach(v => {
      if (contextualCandidates.length < countContextual) {
        contextualCandidates.push(v);
        selectedIds.add(v.id);
      }
    });

  // 3. Core Interests (20%): Long-term top affinity tags
  const highAffinityTags = Object.entries(userState.tagAffinity)
    .filter(([_, meta]) => meta.score > 0)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5)
    .map(([tag]) => tag);

  const coreCandidates: VideoItem[] = [];
  availablePool
    .filter(v => !selectedIds.has(v.id) && v.tags.some(t => highAffinityTags.includes(t)))
    .sort((a, b) => calculateVideoValueScore(b, userState) - calculateVideoValueScore(a, userState))
    .forEach(v => {
      if (coreCandidates.length < countCore) {
        coreCandidates.push(v);
        selectedIds.add(v.id);
      }
    });

  // 4. Serendipitous Discovery (20%): High quality videos outside top user tags
  const knownTags = new Set([...recentTags, ...highAffinityTags]);
  if (userState.activeLearningTrack) knownTags.add(userState.activeLearningTrack.mainTag);

  const discoveryCandidates: VideoItem[] = [];
  availablePool
    .filter(v => !selectedIds.has(v.id))
    .sort((a, b) => {
      // Penalize tags user already has saturation in
      const aNovelty = a.tags.some(t => !knownTags.has(t)) ? 2 : 1;
      const bNovelty = b.tags.some(t => !knownTags.has(t)) ? 2 : 1;
      return (bNovelty * (b.views / 100000)) - (aNovelty * (a.views / 100000));
    })
    .forEach(v => {
      if (discoveryCandidates.length < countDiscovery) {
        discoveryCandidates.push(v);
        selectedIds.add(v.id);
      }
    });

  // Fill remainder if any pool came up short
  if (selectedIds.size < targetCount) {
    availablePool
      .filter(v => !selectedIds.has(v.id))
      .sort((a, b) => calculateVideoValueScore(b, userState) - calculateVideoValueScore(a, userState))
      .forEach(v => {
        if (selectedIds.size < targetCount) {
          discoveryCandidates.push(v);
          selectedIds.add(v.id);
        }
      });
  }

  // Interleave using Fisher-Yates distribution
  const consolidated = [
    ...learningCandidates,
    ...contextualCandidates,
    ...coreCandidates,
    ...discoveryCandidates
  ];

  return fisherYatesShuffle(consolidated);
}

/**
 * Dynamic Tag Recommendation Engine
 * Computes tag weights: (Affinity Score * 0.5) + (Global Popularity * 0.3) + (Random Discovery * 0.2)
 * Applies fatigue penalties and prepends "All" at index 0.
 */
export function generateSmartTags(
  videos: VideoItem[],
  userState: UserProfileState,
  limit: number = 10
): string[] {
  const globalTagFrequency: Record<string, number> = {};
  videos.forEach(v => {
    v.tags.forEach(t => {
      const clean = t.trim();
      if (clean && clean.toLowerCase() !== 'all') {
        globalTagFrequency[clean] = (globalTagFrequency[clean] || 0) + 1;
      }
    });
  });

  const totalTagsCount = Object.values(globalTagFrequency).reduce((a, b) => a + b, 0) || 1;
  const allUniqueTags = Object.keys(globalTagFrequency);

  // Score each tag mathematically
  const scoredTags = allUniqueTags.map(tag => {
    const affinityMeta = userState.tagAffinity[tag];
    const affinityScore = affinityMeta ? affinityMeta.score : 0;
    const globalPopNorm = (globalTagFrequency[tag] || 1) / totalTagsCount;
    const randomDiscovery = Math.random();

    // Base formula
    let weight = (affinityScore * 0.5) + (globalPopNorm * 10 * 0.3) + (randomDiscovery * 0.2);

    // Anti-Fatigue / Novelty Decay: 50% drop if fatigueCount >= 3
    if (affinityMeta && affinityMeta.fatigueCount >= 3) {
      weight *= 0.5;
    }

    // Active learning track bonus
    if (userState.activeLearningTrack?.mainTag === tag) {
      weight *= 1.4;
    }

    return { tag, weight };
  });

  // Sort descending
  scoredTags.sort((a, b) => b.weight - a.weight);

  const topTags = scoredTags.slice(0, limit - 1).map(item => item.tag);
  return ['All', ...topTags];
}

/**
 * ============================================================================
 * 3. DELIVERABLE CUSTOM HOOKS
 * ============================================================================
 */

/**
 * Deliverable 1: useTagAffinityEngine
 * Manages user intent tracks, completion percentages, fatigue counts, and persistent storage.
 */
export function useTagAffinityEngine(initialVideos: VideoItem[] = []) {
  const [userState, setUserState] = useState<UserProfileState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[AffinityEngine] Storage load warning:', e);
    }
    return {
      tagAffinity: {},
      activeLearningTrack: null,
      watchHistory: []
    };
  });

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userState));
    } catch (e) {
      console.warn('[AffinityEngine] Storage write warning:', e);
    }
  }, [userState]);

  /**
   * Records a user clicking on a tag (explicit interest signal).
   */
  const recordTagClick = useCallback((tag: string) => {
    if (!tag || tag.toLowerCase() === 'all') return;

    setUserState(prev => {
      const current = prev.tagAffinity[tag] || {
        score: 0,
        lastWatchedTimestamp: Date.now(),
        fatigueCount: 0,
        highCompletionCount: 0
      };

      const updatedAffinity = {
        ...prev.tagAffinity,
        [tag]: {
          ...current,
          score: current.score + 1.0,
          fatigueCount: 0 // Reset fatigue upon explicit user action
        }
      };

      return {
        ...prev,
        tagAffinity: updatedAffinity
      };
    });
  }, []);

  /**
   * Records video watch event with completion percentage.
   * Rule: > 80% completion boosts associated tags 3x compared to early abandon.
   */
  const recordVideoWatch = useCallback((
    videoId: string,
    watchedSeconds: number,
    totalDurationSeconds: number,
    tags: string[] = []
  ) => {
    const ratio = Math.min(1.0, Math.max(0, watchedSeconds / Math.max(1, totalDurationSeconds)));
    const isCompleted80 = ratio >= 0.8;
    const now = Date.now();

    setUserState(prev => {
      // 1. Update Watch History (keep last 30 events)
      const newHistory: WatchHistoryItem[] = [
        ...prev.watchHistory,
        {
          videoId,
          watchedRatio: ratio,
          timestamp: now,
          durationWatched: watchedSeconds
        }
      ].slice(-30);

      // 2. Score tags based on satisfaction completion ratio
      const updatedAffinity = { ...prev.tagAffinity };
      const boostAmount = isCompleted80 ? 3.0 : ratio < 0.2 ? 0.3 : 1.0;

      tags.forEach(tag => {
        const existing = updatedAffinity[tag] || {
          score: 0,
          lastWatchedTimestamp: now,
          fatigueCount: 0,
          highCompletionCount: 0
        };

        updatedAffinity[tag] = {
          score: existing.score + boostAmount,
          lastWatchedTimestamp: now,
          fatigueCount: 0, // Reset fatigue
          highCompletionCount: existing.highCompletionCount + (isCompleted80 ? 1 : 0)
        };
      });

      // 3. Derive or advance Intent Learning Track
      const updatedTrack = deriveActiveLearningTrack(newHistory, initialVideos, prev.activeLearningTrack);

      return {
        ...prev,
        watchHistory: newHistory,
        tagAffinity: updatedAffinity,
        activeLearningTrack: updatedTrack
      };
    });
  }, [initialVideos]);

  /**
   * Advances the fatigue counter for tags displayed in feed without user interaction.
   * If a tag has been in the feed for 3 cycles without engagement, its score drops by 50%.
   */
  const incrementFeedFatigue = useCallback((displayedTags: string[]) => {
    setUserState(prev => {
      const updatedAffinity = { ...prev.tagAffinity };
      displayedTags.forEach(tag => {
        if (tag.toLowerCase() === 'all') return;
        const current = updatedAffinity[tag];
        if (current) {
          const newFatigue = current.fatigueCount + 1;
          const newScore = newFatigue >= 3 ? current.score * 0.5 : current.score;
          updatedAffinity[tag] = {
            ...current,
            fatigueCount: newFatigue,
            score: newScore
          };
        }
      });
      return {
        ...prev,
        tagAffinity: updatedAffinity
      };
    });
  }, []);

  /**
   * Manually resets recommendation engine profiles (for testing & evaluation).
   */
  const resetUserProfile = useCallback(() => {
    const fresh: UserProfileState = {
      tagAffinity: {},
      activeLearningTrack: null,
      watchHistory: []
    };
    setUserState(fresh);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    userState,
    recordTagClick,
    recordVideoWatch,
    incrementFeedFatigue,
    resetUserProfile
  };
}

/**
 * Deliverable 2: useSmartRecommendation
 * Generates and caches the multi-bucket smart feed and dynamic tag recommendations.
 */
export function useSmartRecommendation(
  allVideos: VideoItem[],
  userState: UserProfileState,
  incrementFeedFatigue: (tags: string[]) => void
) {
  const [feed, setFeed] = useState<VideoItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string>('All');
  const [refreshCycle, setRefreshCycle] = useState<number>(0);

  // Trigger feed regeneration
  const refreshFeed = useCallback(() => {
    setRefreshCycle(c => c + 1);
  }, []);

  // Compute feed and tags whenever user state or refresh cycle changes
  useEffect(() => {
    if (!allVideos || allVideos.length === 0) return;

    const assembledFeed = generateSmartFeed(allVideos, userState, 10);
    const dynamicTags = generateSmartTags(allVideos, userState, 10);

    setFeed(assembledFeed);
    setTags(dynamicTags);

    // Apply fatigue tick on every feed generation cycle
    incrementFeedFatigue(dynamicTags);
  }, [allVideos, userState, refreshCycle, incrementFeedFatigue]);

  // Compute filtered feed if active tag is selected (without mutating master feed order)
  const filteredFeed = useMemo(() => {
    if (activeTag === 'All') return feed;
    const tagQuery = activeTag.toLowerCase();
    const matches = feed.filter(v => v.tags.some(t => t.toLowerCase() === tagQuery));
    // If not enough in current feed, draw from entire video collection
    if (matches.length < 3) {
      const extra = allVideos.filter(v => v.tags.some(t => t.toLowerCase() === tagQuery));
      const combined = [...matches, ...extra.filter(v => !matches.some(m => m.id === v.id))];
      return combined;
    }
    return matches;
  }, [feed, activeTag, allVideos]);

  return {
    feed: filteredFeed,
    rawFeed: feed,
    tags,
    activeTag,
    setActiveTag,
    refreshFeed
  };
}

/**
 * ============================================================================
 * 4. DEMO DATA SET
 * ============================================================================
 */

export const SAMPLE_VIDEOS: VideoItem[] = [
  {
    id: 'v1',
    title: 'WebGL Fundamentals: Introduction to Shaders & Buffers',
    tags: ['WebGL Game Dev', 'Graphics', 'JavaScript'],
    level: 'beginner',
    duration: 600,
    views: 45000,
    completionRate: 0.85
  },
  {
    id: 'v2',
    title: 'Building 3D Mesh Pipelines in WebGL',
    tags: ['WebGL Game Dev', '3D Math', 'Graphics'],
    level: 'intermediate',
    duration: 920,
    views: 32000,
    completionRate: 0.88
  },
  {
    id: 'v3',
    title: 'Advanced Raymarching and Volumetric Lighting in WebGL',
    tags: ['WebGL Game Dev', 'Shaders', 'Advanced Graphics'],
    level: 'advanced',
    duration: 1450,
    views: 19000,
    completionRate: 0.92
  },
  {
    id: 'v4',
    title: 'React 19 Server Components Explained in 10 Minutes',
    tags: ['React', 'Web Dev', 'Frontend'],
    level: 'intermediate',
    duration: 620,
    views: 120000,
    completionRate: 0.74
  },
  {
    id: 'v5',
    title: 'Rust for JavaScript Developers: Memory Safety & Borrowing',
    tags: ['Rust', 'Systems Programming', 'WebAssembly'],
    level: 'beginner',
    duration: 810,
    views: 65000,
    completionRate: 0.81
  },
  {
    id: 'v6',
    title: 'Cyberpunk Aesthetic Design Systems: CSS Grid & Neon Tokens',
    tags: ['UI/UX', 'CSS', 'Design'],
    level: 'beginner',
    duration: 480,
    views: 89000,
    completionRate: 0.68
  },
  {
    id: 'v7',
    title: 'Neural Networks from Scratch in Python',
    tags: ['Machine Learning', 'Python', 'AI'],
    level: 'intermediate',
    duration: 1800,
    views: 210000,
    completionRate: 0.9
  },
  {
    id: 'v8',
    title: 'Micro-Frontends with Module Federation Architecture',
    tags: ['React', 'Architecture', 'Frontend'],
    level: 'advanced',
    duration: 1100,
    views: 42000,
    completionRate: 0.79
  },
  {
    id: 'v9',
    title: 'How Game Engines Implement Spatial Audio',
    tags: ['Audio Engineering', 'Game Dev', 'Sound Design'],
    level: 'intermediate',
    duration: 750,
    views: 54000,
    completionRate: 0.83
  },
  {
    id: 'v10',
    title: 'Quantum Computing Algorithms: Deutsch-Jozsa Simplified',
    tags: ['Quantum', 'Physics', 'Computer Science'],
    level: 'advanced',
    duration: 1320,
    views: 38000,
    completionRate: 0.87
  }
];

/**
 * ============================================================================
 * 5. DELIVERABLE MODULAR REACT DEMO COMPONENT
 * ============================================================================
 * Clean HTML structure with no custom CSS/styling per specification.
 */
export const SmartRecommendationDemo: React.FC = () => {
  // Step 1: Initialize User Tag Affinity Engine Hook
  const {
    userState,
    recordTagClick,
    recordVideoWatch,
    incrementFeedFatigue,
    resetUserProfile
  } = useTagAffinityEngine(SAMPLE_VIDEOS);

  // Step 2: Initialize Smart Recommendation Engine Hook
  const {
    feed,
    tags,
    activeTag,
    setActiveTag,
    refreshFeed
  } = useSmartRecommendation(SAMPLE_VIDEOS, userState, incrementFeedFatigue);

  // Handle clicking a tag: update active tag & record affinity signal
  const handleTagSelect = (tag: string) => {
    setActiveTag(tag);
    recordTagClick(tag);
  };

  // Simulate watching a video with given completion ratio
  const handleSimulateWatch = (video: VideoItem, ratio: number) => {
    recordVideoWatch(video.id, video.duration * ratio, video.duration, video.tags);
  };

  return (
    <div id="smartRecommendationRoot">
      {/* Header & Control Section */}
      <header id="recommendationEngineHeader">
        <h2>Intelligent Video Recommendation & Intent Track Engine</h2>
        <p>
          Demonstrating Intent Tracks (30%), Contextual Context (30%), Core Interests (20%), and Serendipitous Discovery (20%).
        </p>

        {/* Engine Dashboard Overview */}
        <section id="engineStateInspection">
          <h3>User Recommendation State</h3>
          <p>
            <strong>Active Learning Track: </strong>
            {userState.activeLearningTrack ? (
              <span>
                {userState.activeLearningTrack.mainTag} (Depth Level: {userState.activeLearningTrack.depthScore})
              </span>
            ) : (
              <em>None (Watch 2+ videos in a niche to trigger)</em>
            )}
          </p>

          <p>
            <strong>Total Watched Videos: </strong> {userState.watchHistory.length}
          </p>

          <div>
            <strong>High-Affinity Tags: </strong>
            {Object.keys(userState.tagAffinity).length === 0 ? (
              <em>No engagement recorded yet</em>
            ) : (
              <ul>
                {Object.entries(userState.tagAffinity).map(([tag, meta]) => (
                  <li key={tag}>
                    <strong>{tag}:</strong> Score {meta.score.toFixed(1)} | Completed: {meta.highCompletionCount} | Fatigue Count: {meta.fatigueCount}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <button type="button" onClick={refreshFeed}>
              Refresh Feed (Fatigue +1)
            </button>
            <button type="button" onClick={resetUserProfile}>
              Reset User Profile
            </button>
          </div>
        </section>
      </header>

      {/* Dynamic Recommendation Tags Bar */}
      <nav id="dynamicTagsBar" aria-label="Dynamic Topic Tags">
        <h3>Dynamic Tags (Algorithmic: Affinity 50% + Global 30% + Discovery 20%)</h3>
        <div role="tablist">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              role="tab"
              aria-selected={activeTag === tag}
              onClick={() => handleTagSelect(tag)}
            >
              {tag} {activeTag === tag ? '(Selected)' : ''}
            </button>
          ))}
        </div>
      </nav>

      {/* Recommended Video Feed */}
      <main id="recommendedVideosFeed">
        <h3>Recommended Feed ({feed.length} videos assembled)</h3>
        {feed.length === 0 ? (
          <p>No candidate videos found for this topic.</p>
        ) : (
          <ul>
            {feed.map((video) => (
              <li key={video.id} id={`video-card-${video.id}`}>
                <h4>{video.title}</h4>
                <p>
                  <strong>Level:</strong> {video.level} | <strong>Duration:</strong> {Math.round(video.duration / 60)}m | <strong>Views:</strong> {video.views.toLocaleString()}
                </p>
                <p>
                  <strong>Tags:</strong> {video.tags.join(', ')}
                </p>

                {/* Simulation Interaction Controls */}
                <div>
                  <span>Simulate User Interaction: </span>
                  <button type="button" onClick={() => handleSimulateWatch(video, 1.0)}>
                    Watch 100% (3x Satisfaction Boost)
                  </button>
                  <button type="button" onClick={() => handleSimulateWatch(video, 0.85)}>
                    Watch 85% (3x Satisfaction Boost)
                  </button>
                  <button type="button" onClick={() => handleSimulateWatch(video, 0.15)}>
                    Abandon at 15% (Low Weight)
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default SmartRecommendationDemo;
