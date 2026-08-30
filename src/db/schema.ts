import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table (linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Watch History table
export const watchHistory = pgTable('watch_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  videoId: text('video_id').notNull(),
  videoTitle: text('video_title').notNull(),
  channelName: text('channel_name'),
  timestampSeconds: integer('timestamp_seconds').default(0),
  watchedAt: timestamp('watched_at').defaultNow(),
});

// Saved / Liked Videos (Watch Later / Favorites)
export const savedVideos = pgTable('saved_videos', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  videoId: text('video_id').notNull(),
  videoTitle: text('video_title').notNull(),
  channelName: text('channel_name'),
  thumbnailUrl: text('thumbnail_url'),
  savedAt: timestamp('saved_at').defaultNow(),
});

// Live Stream Chat Messages
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  videoId: text('video_id').notNull(),
  message: text('message').notNull(),
  isEmoji: boolean('is_emoji').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  history: many(watchHistory),
  saved: many(savedVideos),
  chats: many(chatMessages),
}));

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  user: one(users, {
    fields: [watchHistory.userId],
    references: [users.id],
  }),
}));

export const savedVideosRelations = relations(savedVideos, ({ one }) => ({
  user: one(users, {
    fields: [savedVideos.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));
