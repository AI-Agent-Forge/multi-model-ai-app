
import { useChatStore } from '@/store/useChatStore';
import type { Message } from '@shared/schema';

export const useChatStream = () => {
    const {
        addMessage,
        updateLastMessage,
        setLoading,
        setStreaming,
        activeChatId,
        setActiveChatId,
        loadChats
    } = useChatStore();

    const sendMessage = async (content: string, attachments: any[] = []) => {
        // Add user message
        const userMsg: Message = {
            id: Date.now(),
            role: 'user',
            content,
            attachments: attachments && attachments.length > 0 ? attachments : null,
            timestamp: Date.now(),
            chatId: activeChatId,
        };
        addMessage(userMsg);

        // Add placeholder AI message
        const aiMsgId = Date.now() + 1;
        const aiMsg: Message = {
            id: aiMsgId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            chatId: activeChatId, // Initially same as request
            attachments: null,
        };
        addMessage(aiMsg);

        setLoading(true);
        setStreaming(true);

        try {
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: content,
                    chatId: activeChatId,
                    attachments
                }),
            });

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') break;

                        try {
                            const parsed = JSON.parse(data);

                            // Check for chatId update (new chat created)
                            if (parsed.chatId) {
                                setActiveChatId(parsed.chatId);
                                loadChats(); // Refresh sidebar
                            }

                            if (parsed.token) {
                                aiContent += parsed.token;
                                updateLastMessage(aiContent);
                            }

                            if (parsed.error) {
                                console.error('API Error:', parsed.error);
                                updateLastMessage(`Error: ${parsed.error}`);
                            }

                        } catch (e) {
                            console.error('Error parsing JSON chunk', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Streaming error:', error);
            updateLastMessage('Sorry, something went wrong.');
        } finally {
            setLoading(false);
            setStreaming(false);
        }
    };

    return { sendMessage };
};
