import React, { useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/useChatStore';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { chats, loadChats, selectChat, createChat, activeChatId } = useChatStore();

    useEffect(() => {
        loadChats();
    }, [loadChats]);

    const handleNewChat = () => {
        createChat();
        if (window.innerWidth < 768) {
            onClose();
        }
    };

    const handleSelectChat = (id: number) => {
        selectChat(id);
        if (window.innerWidth < 768) {
            onClose();
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <aside className={cn(
                "fixed md:static inset-y-0 left-0 z-30 w-64 bg-zinc-900/95 backdrop-blur-md border-r border-zinc-800 transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* New Chat Button */}
                <div className="p-4">
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl transition-all font-medium shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={20} />
                        <span>New Chat</span>
                    </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto py-2 px-3 space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2">Recent</h3>
                        {chats.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleSelectChat(item.id)}
                                className={cn(
                                    "group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors relative",
                                    activeChatId === item.id
                                        ? "bg-zinc-800 text-white"
                                        : "hover:bg-zinc-800/50 text-zinc-300 hover:text-white"
                                )}
                            >
                                <MessageSquare size={16} />
                                <span className="text-sm truncate pr-8">{item.title}</span>

                                {/* Actions (visible on hover) */}
                                <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex gap-1 bg-zinc-800/50 rounded-md p-0.5 transition-opacity">
                                    <button className="p-1 hover:text-blue-400"><Edit2 size={12} /></button>
                                    <button className="p-1 hover:text-red-400"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* User / Settings */}
                <div className="p-4 border-t border-zinc-800 space-y-2">
                    <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors">
                        <Settings size={18} />
                        <span className="text-sm">Settings</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center">
                            <User size={14} className="text-white" />
                        </div>
                        <span className="text-sm">User Profile</span>
                    </button>
                </div>
            </aside>
        </>
    );
};
