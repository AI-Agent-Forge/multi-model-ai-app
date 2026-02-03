import React, { useState } from 'react';
import { ImageGenerator } from './ImageGenerator';
import { ImageEditor } from './ImageEditor';
import { Palette, Wand2 } from 'lucide-react';

export const ImageStudioLayout: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'generation' | 'editing'>('generation');

    return (
        <div className="flex flex-col h-full bg-black text-white">
            {/* Sub-header / Tabs */}
            <div className="flex items-center gap-6 px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <button
                    onClick={() => setActiveTab('generation')}
                    className={`flex items-center gap-2 pb-2 text-sm font-medium transition-all relative ${activeTab === 'generation' ? 'text-blue-400' : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    <Wand2 size={18} />
                    Text-to-Image
                    {activeTab === 'generation' && (
                        <div className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('editing')}
                    className={`flex items-center gap-2 pb-2 text-sm font-medium transition-all relative ${activeTab === 'editing' ? 'text-purple-400' : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    <Palette size={18} />
                    Image Editing
                    {activeTab === 'editing' && (
                        <div className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]" />
                    )}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'generation' ? <ImageGenerator /> : <ImageEditor />}
            </div>
        </div>
    );
};
