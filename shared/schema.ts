import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';

export const chats = sqliteTable('chats', {
    id: integer('id').primaryKey(),
    title: text('title').notNull(),
    timestamp: integer('timestamp').notNull(),
});

export const messages = sqliteTable('messages', {
    id: integer('id').primaryKey(),
    chatId: integer('chat_id').references(() => chats.id),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    attachments: text('attachments', { mode: 'json' }).$type<Attachment[]>(),
    timestamp: integer('timestamp').notNull(),
});

export interface Attachment {
    name: string;
    url: string;
    type: 'image' | 'video' | 'file';
}

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = typeof chats.$inferInsert;

export const insertMessageSchema = createInsertSchema(messages);
export const insertChatSchema = createInsertSchema(chats);
