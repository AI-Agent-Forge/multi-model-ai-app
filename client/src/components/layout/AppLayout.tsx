import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { Menu } from 'lucide-react';
import { Toaster } from 'sonner';
import { Header } from './Header';
import { useChatStore } from '@/store/useChatStore';
import { QwenTTSLayout } from '../tts/QwenTTSLayout';
import { ImageStudioLayout } from '../image-studio/ImageStudioLayout';
import { VideoStudioLayout } from '../video/VideoStudioLayout';
import { QwenChatLayout } from '../qwen/QwenChatLayout';

export const AppLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { appMode } = useChatStore();

    return (
        <div className="flex h-screen bg-black overflow-hidden font-sans text-foreground">
            <Toaster position="top-center" theme="dark" />

            {/* Only show Sidebar in Chat Mode? Or always? 
                The plan didn't specify, but usually sidebars are for Chat History. 
                For TTS, maybe we don't need chat history sidebar. 
                Let's hide sidebar in TTS mode for a cleaner "Premium" look, or keep it if user wants to switch context.
                Let's keep it for now but maybe disable it.
            */}
            {appMode === 'chat' && (
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            )}

            <main className="flex-1 flex flex-col relative w-full h-full">
                {/* Desktop Header */}
                <div className="hidden md:block z-50">
                    <Header />
                </div>

                {/* Mobile Header - Adjusted to show only in Chat mode or adapted? 
                    For now, keep existing logic for mobile sidebar toggle only in chat mode 
                */}
                <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 z-20 flex items-center px-4">
                    {appMode === 'chat' && (
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-zinc-400 hover:text-white">
                            <Menu size={24} />
                        </button>
                    )}
                    <span className="ml-2 font-semibold text-white">AI Agent</span>
                </header>

                <div className="flex-1 pt-16 relative overflow-hidden"> {/* pt-16 For Header offset */}
                    {appMode === 'chat' ? (
                        <ChatWindow />
                    ) : appMode === 'tts' ? (
                        <QwenTTSLayout />
                    ) : appMode === 'image-studio' ? (
                        <ImageStudioLayout />
                    ) : appMode === 'video-studio' ? (
                        <VideoStudioLayout />
                    ) : (
                        <QwenChatLayout />
                    )}
                </div>
            </main>
        </div>
    );
};
