import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { Menu } from 'lucide-react';
import { Toaster } from 'sonner';

export const AppLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-black overflow-hidden font-sans text-foreground">
            <Toaster position="top-center" theme="dark" />
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="flex-1 flex flex-col relative w-full h-full">
                {/* Mobile Header */}
                <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 z-20 flex items-center px-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-zinc-400 hover:text-white">
                        <Menu size={24} />
                    </button>
                    <span className="ml-2 font-semibold text-white">AI Agent</span>
                </header>

                <ChatWindow />
            </main>
        </div>
    );
};
