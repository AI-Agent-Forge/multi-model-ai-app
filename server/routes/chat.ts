import { Router } from 'express';
import { db } from '../db';
import { messages, chats, insertMessageSchema } from '../../shared/schema';
import { generateChatResponse } from '../services/gemini';
import { eq, desc, asc } from 'drizzle-orm';

export const chatRouter = Router();

// GET /api/chat - List all chats
chatRouter.get('/', async (req, res) => {
    try {
        const allChats = await db.select().from(chats).orderBy(desc(chats.timestamp));
        res.json(allChats);
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// GET /api/chat/:id - Get messages for a specific chat
chatRouter.get('/:id', async (req, res) => {
    try {
        const chatId = parseInt(req.params.id);
        if (isNaN(chatId)) {
            res.status(400).json({ error: 'Invalid chat ID' });
            return;
        }

        const chatMessages = await db.select()
            .from(messages)
            .where(eq(messages.chatId, chatId))
            .orderBy(asc(messages.timestamp)); // Oldest first for display

        res.json(chatMessages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/chat - Send message (creates chat if no chatId)
chatRouter.post('/', async (req, res) => {
    try {
        const { message, attachments, chatId: providedChatId } = req.body;

        let chatId = providedChatId ? parseInt(providedChatId) : null;
        let isNewChat = false;

        // 1. Create chat if doesn't exist
        if (!chatId) {
            const result = await db.insert(chats).values({
                title: message.substring(0, 30) + (message.length > 30 ? "..." : ""), // Simple title gen
                timestamp: Date.now(),
            }).returning();
            chatId = result[0].id;
            isNewChat = true;
        }

        // 2. Save User Message
        await db.insert(messages).values({
            chatId,
            role: 'user',
            content: message,
            attachments: attachments || [],
            timestamp: Date.now(),
        });

        // 3. Set up SSE Headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send the Chat ID first if it's new (custom event)
        if (isNewChat) {
            res.write(`data: ${JSON.stringify({ chatId })}\n\n`);
        }

        // 4. Get History (Last 20 messages)
        const history = await db.select()
            .from(messages)
            .where(eq(messages.chatId, chatId))
            .orderBy(desc(messages.timestamp))
            .limit(20);

        const context = history.reverse();

        // 5. Generate Response
        const stream = await generateChatResponse(context, message, attachments);

        let fullResponse = "";

        for await (const chunk of stream) {
            const text = chunk.text();
            fullResponse += text;
            res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
        }

        // 6. Save Assistant Message
        await db.insert(messages).values({
            chatId,
            role: 'assistant',
            content: fullResponse,
            timestamp: Date.now(),
        });

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('Chat API Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate response' });
        } else {
            res.write(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`);
            res.end();
        }
    }
});
