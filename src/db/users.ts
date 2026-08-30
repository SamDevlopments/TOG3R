import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string, avatarUrl?: string) {
  const result = await db.insert(users)
    .values({
      uid,
      email,
      displayName: displayName || null,
      avatarUrl: avatarUrl || null,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        displayName: displayName || null,
        avatarUrl: avatarUrl || null,
      },
    })
    .returning();

  return result[0];
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
