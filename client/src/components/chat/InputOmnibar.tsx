import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, ArrowUp, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileUpload } from '@/hooks/useFileUpload';
import type { Attachment } from '@shared/schema';
import { toast } from 'sonner';

interface InputOmnibarProps {
    onSend: (content: string, attachments?: Attachment[]) => void;
}

export const InputOmnibar: React.FC<InputOmnibarProps> = ({ onSend }) => {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadFile, isUploading } = useFileUpload();

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [input]);

    const handleSend = () => {
        if (!input.trim() && attachments.length === 0) return;
        onSend(input, attachments);
        setInput('');
        setAttachments([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const file = e.target.files[0];
                const result = await uploadFile(file);
                setAttachments(prev => [...prev, {
                    name: result.name,
                    url: result.url,
                    type: result.type as 'image' | 'video' | 'file'
                }]);
                toast.success("File uploaded successfully");
            } catch (error) {
                console.error("Upload failed", error);
                toast.error("Failed to upload file");
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="w-full relative">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <div className="flex gap-2 mb-2 px-2 overflow-x-auto">
                    {attachments.map((att, i) => (
                        <div key={i} className="relative group bg-zinc-800 rounded-lg p-2 flex items-center gap-2 border border-zinc-700 shrink-0">
                            {att.type === 'image' ? (
                                <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover" />
                            ) : (
                                <Paperclip size={16} className="text-zinc-400" />
                            )}
                            <span className="text-xs text-zinc-300 max-w-[100px] truncate">{att.name}</span>
                            <button
                                onClick={() => removeAttachment(i)}
                                className="ml-1 p-0.5 rounded-full hover:bg-zinc-700 text-zinc-500 hover:text-red-400"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="relative group bg-zinc-800/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl p-2 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50">

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                />

                {/* Input Area */}
                <div className="flex items-end gap-2">
                    {/* Attachment Button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                    </button>

                    {/* Text Area */}
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Send a message..."
                        rows={1}
                        className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder:text-zinc-500 resize-none py-3 max-h-[150px] overflow-y-auto"
                        style={{ minHeight: '44px' }}
                    />

                    {/* Right Actions */}
                    <div className="flex items-center gap-1">
                        {/* Voice Record */}
                        <button className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-xl transition-colors">
                            <Mic size={20} />
                        </button>

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            className={cn(
                                "p-3 rounded-xl transition-all duration-200",
                                (input.trim() || attachments.length > 0)
                                    ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                                    : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                            )}
                            disabled={!input.trim() && attachments.length === 0}
                        >
                            <ArrowUp size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="text-center mt-2">
                <p className="text-xs text-zinc-500">
                    AI Agent can make mistakes. Check important info.
                </p>
            </div>
        </div>
    );
};
