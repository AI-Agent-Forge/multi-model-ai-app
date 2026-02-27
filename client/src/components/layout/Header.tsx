import React from 'react';
import { useChatStore } from '@/store/useChatStore';
import { MessageSquare, Mic, ChevronDown, Palette, Clapperboard, Activity } from 'lucide-react';

export const Header: React.FC = () => {
    const { appMode, setAppMode } = useChatStore();
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

    const handleModeSelect = (mode: 'chat' | 'tts' | 'image-studio' | 'video-studio' | 'qwen-chat' | 'qwen-omni') => {
        setAppMode(mode);
        setIsDropdownOpen(false);
    };

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-xl border-b border-white/5 z-30 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <span className="font-bold text-white text-lg">A</span>
                </div>
                <span className="font-bold text-lg text-white tracking-tight">AI Agent</span>
            </div>

            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={toggleDropdown}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all text-sm font-medium text-zinc-200 group"
                >
                    {appMode === 'chat' ? (
                        <>
                            <MessageSquare size={16} className="text-blue-400" />
                            <span>LLM Chat</span>
                        </>
                    ) : appMode === 'tts' ? (
                        <>
                            <Mic size={16} className="text-purple-400" />
                            <span>Qwen3-TTS</span>
                        </>
                    ) : appMode === 'image-studio' ? (
                        <>
                            <Palette size={16} className="text-green-400" />
                            <span>Image Studio</span>
                        </>
                    ) : appMode === 'video-studio' ? (
                        <>
                            <Clapperboard size={16} className="text-pink-500" />
                            <span>Video Studio</span>
                        </>
                    ) : appMode === 'qwen-chat' ? (
                        <>
                            <MessageSquare size={16} className="text-orange-400" />
                            <span>Qwen Chat</span>
                        </>
                    ) : (
                        <>
                            <Activity size={16} className="text-red-400" />
                            <span>Qwen Omni</span>
                        </>
                    )}
                    <ChevronDown size={14} className={`text-zinc-500 transition-transform group-hover:text-zinc-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-1 space-y-1">
                            <button
                                onClick={() => handleModeSelect('chat')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${appMode === 'chat' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                                    }`}
                            >
                                <MessageSquare size={16} className={appMode === 'chat' ? 'text-blue-400' : 'text-zinc-500'} />
                                LLM Chat
                            </button>
                            <button
                                onClick={() => handleModeSelect('tts')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${appMode === 'tts' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                                    }`}
                            >
                                <Mic size={16} className={appMode === 'tts' ? 'text-purple-400' : 'text-zinc-500'} />
                                Qwen3-TTS
                            </button>
                            <button
                                onClick={() => handleModeSelect('image-studio')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${appMode === 'image-studio' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                                    }`}
                            >
                                <Palette size={16} className={appMode === 'image-studio' ? 'text-green-400' : 'text-zinc-500'} />
                                Image Studio
                            </button>
                            <button
                                onClick={() => handleModeSelect('video-studio')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${appMode === 'video-studio' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                                    }`}
                            >
                                <Clapperboard size={16} className={appMode === 'video-studio' ? 'text-pink-500' : 'text-zinc-500'} />
                                Video Studio
                            </button>
                            <button
                                onClick={() => handleModeSelect('qwen-chat')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${appMode === 'qwen-chat' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                                    }`}
                            >
                                <MessageSquare size={16} className={appMode === 'qwen-chat' ? 'text-orange-400' : 'text-zinc-500'} />
                                Qwen Chat
                            </button>
                            <button
                                onClick={() => handleModeSelect('qwen-omni')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${appMode === 'qwen-omni' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                                    }`}
                            >
                                <Activity size={16} className={appMode === 'qwen-omni' ? 'text-red-400' : 'text-zinc-500'} />
                                Qwen Omni
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Placeholder for future right-side items like Profile or Settings */}
            <div className="w-8"></div>
        </header>
    );
};
