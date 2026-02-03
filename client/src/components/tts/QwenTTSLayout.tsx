import React, { useState } from 'react';
import { Mic, Type, GitBranch } from 'lucide-react';
import { VoiceDesign } from './VoiceDesign';
import { VoiceClone } from './VoiceClone';
import { CustomVoice } from './CustomVoice';

type Tab = 'design' | 'clone' | 'custom';

export const QwenTTSLayout: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('custom');

    const renderContent = () => {
        switch (activeTab) {
            case 'design': return <VoiceDesign />;
            case 'clone': return <VoiceClone />;
            case 'custom': return <CustomVoice />;
            default: return <CustomVoice />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-black text-white px-4 py-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto w-full space-y-8">
                {/* Intro Section */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
                        Qwen3-TTS Studio
                    </h1>
                    <p className="text-zinc-400 max-w-lg mx-auto">
                        Experience next-gen text-to-speech with emotive voice design and ultra-fast cloning.
                    </p>
                </div>

                {/* Navigation Tabs */}
                <div className="flex justify-center">
                    <div className="bg-zinc-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 flex items-center gap-1 shadow-xl">
                        {[
                            { id: 'custom', label: 'Custom Voice', icon: Mic },
                            { id: 'design', label: 'Voice Design', icon: Type },
                            { id: 'clone', label: 'Voice Clone', icon: GitBranch },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                        ? 'bg-zinc-800 text-white shadow-lg shadow-black/50'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
