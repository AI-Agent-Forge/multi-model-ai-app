import React, { useState } from 'react';
import { Send, Download, Play } from 'lucide-react';

export const VoiceDesign: React.FC = () => {
    const [text, setText] = useState('');
    const [instruct, setInstruct] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!text || !instruct) return;
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('text', text);
            formData.append('instruct', instruct);
            formData.append('language', 'English'); // Hardcoded for now, can be state

            const response = await fetch('http://localhost:5003/api/v1/tts/design', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            } else {
                console.error('Failed to generate audio');
            }
        } catch (error) {
            console.error('Error generating audio:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Voice Instruction</label>
                    <textarea
                        value={instruct}
                        onChange={(e) => setInstruct(e.target.value)}
                        placeholder="Describe the voice (e.g., 'A confident young woman with a British accent' or 'An old wizard voice')"
                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 h-24 resize-none transition-all"
                    />
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Text to Speak</label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enter the text you want the AI to read..."
                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 h-32 resize-none transition-all"
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !text || !instruct}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Generating...</span>
                        </>
                    ) : (
                        <>
                            <Send size={18} />
                            <span>Generate Audio</span>
                        </>
                    )}
                </button>
            </div>

            {audioUrl && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <Play size={24} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="font-medium text-white">Generated Audio</h3>
                            <p className="text-sm text-zinc-500">Ready to play</p>
                        </div>
                    </div>
                    <audio controls src={audioUrl} className="hidden" id="audio-player" />
                    {/* Custom player controls could be built here, using standard HTML5 audio for simplicity now but hidden/styled */}
                    <div className="flex items-center gap-3">
                        <audio controls src={audioUrl} className="h-10 rounded-full" />
                        <a href={audioUrl} download="voice-design.wav" className="p-3 text-zinc-400 hover:text-white transition-colors">
                            <Download size={20} />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
