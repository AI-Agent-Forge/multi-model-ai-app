import React from 'react';
import type { Message } from '@shared/schema';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './content/MarkdownRenderer';
import { FileIcon, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
    message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.role === 'user';
    const hasAttachments = message.attachments && message.attachments.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn(
                "flex w-full mb-6",
                isUser ? "justify-end" : "justify-start"
            )}
        >
            <div className={cn(
                "flex max-w-[85%] md:max-w-[75%] gap-3",
                isUser ? "flex-row-reverse" : "flex-row"
            )}>

                {/* Avatar */}
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    isUser ? "bg-zinc-700" : "bg-blue-600 shadow-lg shadow-blue-900/40"
                )}>
                    {isUser ? (
                        <span className="text-xs font-medium text-white">You</span>
                    ) : (
                        <Sparkles size={14} className="text-white" />
                    )}
                </div>

                {/* Bubble */}
                <div className={cn(
                    "flex flex-col gap-2 p-4 rounded-2xl shadow-sm overflow-hidden",
                    isUser
                        ? "bg-zinc-800 text-white rounded-tr-sm"
                        : "bg-zinc-900/60 border border-zinc-800 text-zinc-100 rounded-tl-sm backdrop-blur-sm"
                )}>
                    {/* Attachments */}
                    {hasAttachments && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {message.attachments?.map((att, i) => (
                                <div key={i} className="relative group overflow-hidden rounded-lg border border-zinc-700 bg-black/40">
                                    {att.type === 'image' ? (
                                        <img src={att.url} alt={att.name} className="h-32 w-auto object-cover" />
                                    ) : (
                                        <div className="flex items-center gap-2 p-3">
                                            <FileIcon size={16} className="text-blue-400" />
                                            <span className="text-xs truncate max-w-[150px]">{att.name}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Content */}
                    <div className="prose prose-invert prose-sm max-w-none">
                        <MarkdownRenderer content={message.content} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
