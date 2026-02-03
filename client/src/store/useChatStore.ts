import { create } from 'zustand';
import type { Message, Chat } from '@shared/schema';

interface ChatState {
    appMode: 'chat' | 'tts' | 'image-studio' | 'video-studio';
    setAppMode: (mode: 'chat' | 'tts' | 'image-studio' | 'video-studio') => void;

    messages: Message[];
    chats: Chat[];
    activeChatId: number | null;
    isLoading: boolean;
    isStreaming: boolean;

    // Actions
    addMessage: (message: Message) => void;
    updateLastMessage: (content: string) => void;
    setLoading: (isLoading: boolean) => void;
    setStreaming: (isStreaming: boolean) => void;
    clearMessages: () => void;

    // History Actions
    loadChats: () => Promise<void>;
    selectChat: (chatId: number) => Promise<void>;
    setActiveChatId: (chatId: number) => void;
    createChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    // App Mode
    appMode: 'chat',
    setAppMode: (mode) => set({ appMode: mode }),

    // Chat
    messages: [],
    chats: [],
    activeChatId: null,
    isLoading: false,
    isStreaming: false,

    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

    updateLastMessage: (content) => set((state) => {
        const messages = [...state.messages];
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'assistant') {
                messages[messages.length - 1] = { ...lastMsg, content };
            }
        }
        return { messages };
    }),

    setLoading: (isLoading) => set({ isLoading }),
    setStreaming: (isStreaming) => set({ isStreaming }),
    clearMessages: () => set({ messages: [] }),

    loadChats: async () => {
        try {
            const res = await fetch('http://localhost:5000/api/chat');
            if (res.ok) {
                const chats = await res.json();
                set({ chats });
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
        }
    },

    selectChat: async (chatId) => {
        set({ activeChatId: chatId, isLoading: true });
        try {
            const res = await fetch(`http://localhost:5000/api/chat/${chatId}`);
            if (res.ok) {
                const messages = await res.json();
                set({ messages, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            set({ isLoading: false });
        }
    },

    setActiveChatId: (chatId) => set({ activeChatId: chatId }),

    createChat: () => {
        set({ activeChatId: null, messages: [] });
    }
}));
