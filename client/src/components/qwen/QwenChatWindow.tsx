// Qwen Chat Window Component
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    image?: string;
}

export const QwenChatWindow: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() && !imageUrl.trim()) return;

        const userMsg: Message = {
            role: 'user',
            content: input,
            image: imageUrl || undefined
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setImageUrl('');
        setIsLoading(true);

        try {
            // Construct payload compatible with our microservice
            const payload = {
                model: "Qwen/Qwen3-VL-32B-Thinking",
                messages: [
                    ...messages.map(m => {
                        if (m.image) {
                            return {
                                role: m.role,
                                content: [
                                    { type: "text", text: m.content },
                                    { type: "image_url", image_url: { url: m.image } }
                                ]
                            }
                        }
                        return { role: m.role, content: m.content };
                    }),
                    {
                        role: "user",
                        content: userMsg.image
                            ? [
                                { type: "text", text: userMsg.content },
                                { type: "image_url", image_url: { url: userMsg.image } }
                            ]
                            : userMsg.content
                    }
                ],
                stream: false // Microservice doesn't support streaming yet
            };

            const response = await fetch('http://localhost:5004/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            const assistantMsg = data.choices[0].message.content;

            setMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Error communicating with Qwen service. Is it running on port 5004?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto px-4 md:px-0">
            {/* Header / Title */}
            <div className="py-4 border-b border-white/5 mb-4 flex items-center gap-2">
                <Sparkles className="text-orange-400" size={20} />
                <h2 className="text-lg font-semibold text-white">Qwen3-VL-32B (Direct API)</h2>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-6 pb-4 scrollbar-thin scrollbar-thumb-zinc-800">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                            <Sparkles className="text-orange-500 w-8 h-8" />
                        </div>
                        <p className="text-zinc-400">Send a message to start chatting with Qwen3-VL.</p>
                        <p className="text-xs text-zinc-600">Supports text and image URLs.</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-zinc-800 text-zinc-100 rounded-bl-none'
                            }`}>
                            {msg.image && (
                                <img src={msg.image} alt="User upload" className="max-w-full h-auto rounded-lg mb-2 border border-white/10" />
                            )}
                            <div className="prose prose-invert prose-sm">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-zinc-800 p-4 rounded-2xl rounded-bl-none animate-pulse flex gap-2 items-center">
                            <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="py-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                    <input
                        type="text"
                        placeholder="Image URL (optional)..."
                        className="bg-transparent text-xs text-zinc-400 focus:outline-none focus:text-white border-b border-zinc-800 pb-2 w-full"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <div className="flex gap-2 items-end">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent text-white placeholder-zinc-500 resize-none focus:outline-none max-h-32 min-h-[24px]"
                            rows={1}
                            style={{ height: 'auto', minHeight: '24px' }}
                            onInput={(e) => {
                                e.currentTarget.style.height = 'auto';
                                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || (!input.trim() && !imageUrl.trim())}
                            className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
