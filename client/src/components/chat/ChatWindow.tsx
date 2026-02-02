import React, { useRef, useEffect } from 'react';
import { InputOmnibar } from './InputOmnibar';
import { MessageBubble } from './MessageBubble';
import { Sparkles } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { useChatStream } from '@/hooks/useChatStream';

export const ChatWindow: React.FC = () => {
    const { messages, isLoading } = useChatStore();
    const { sendMessage } = useChatStream();
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleStarterClick = (prompt: string) => {
        sendMessage(prompt);
    };

    return (
        <div className="flex-1 relative flex flex-col h-screen overflow-hidden bg-black text-white">
            {/* Scrollable Message Area */}
            <div className="flex-1 overflow-y-auto px-4 pb-40 pt-10 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                <div className="max-w-4xl mx-auto space-y-2">
                    {messages.length === 0 ? (
                        /* Empty State / Welcome */
                        <div className="flex flex-col items-center justify-center mt-20 text-center space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-xl">
                                <Sparkles className="w-8 h-8 text-blue-400" />
                            </div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                How can I help you today?
                            </h1>

                            {/* Starter Prompts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-8">
                                {['Generate a video about space', 'Explain quantum computing', 'Analyze this spreadsheet', 'Create a fast React component'].map((prompt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleStarterClick(prompt)}
                                        className="p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-left transition-all text-sm group"
                                    >
                                        <span className="text-zinc-300 group-hover:text-white">{prompt}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Message List */
                        <>
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} />
                            ))}
                            {/* Loading Indicator */}
                            {isLoading && (
                                <div className="flex justify-start w-full mb-6">
                                    <div className="flex gap-3 max-w-[75%] flex-row">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40">
                                            <Sparkles size={14} className="text-white animate-pulse" />
                                        </div>
                                        <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl rounded-tl-sm backdrop-blur-sm flex items-center gap-1">
                                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={bottomRef} className="h-4" />
                </div>
            </div>

            {/* Input Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                <div className="pointer-events-auto max-w-4xl mx-auto">
                    <InputOmnibar onSend={sendMessage} />
                </div>
            </div>
        </div>
    );
};
