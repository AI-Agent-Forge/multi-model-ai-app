import React, { useState } from 'react';
import { Send, Download } from 'lucide-react';

const PREDEFINED_SPEAKERS = [
    'aiden', 'dylan', 'eric', 'ono_anna', 'ryan', 'serena', 'sohee', 'uncle_fu', 'vivian'
];

export const CustomVoice: React.FC = () => {
    const [text, setText] = useState('');
    const [speaker, setSpeaker] = useState(PREDEFINED_SPEAKERS[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!text) return;
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('text', text);
            formData.append('speaker', speaker);
            formData.append('language', 'English');

            const response = await fetch('http://localhost:5003/api/v1/tts/custom', {
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
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Select Speaker</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {PREDEFINED_SPEAKERS.map((s) => (
                            <button
                                key={s}
                                onClick={() => setSpeaker(s)}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${speaker === s
                                    ? 'bg-purple-500/20 border-purple-500/50 text-white'
                                    : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${speaker === s ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-500'
                                    }`}>
                                    {s[0]}
                                </div>
                                <span className="text-sm font-medium">{s}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Text to Speak</label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enter text..."
                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 h-32 resize-none transition-all"
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !text}
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
                        <audio controls src={audioUrl} className="h-10 rounded-full" />
                        <a href={audioUrl} download="custom-voice.wav" className="p-3 text-zinc-400 hover:text-white transition-colors">
                            <Download size={20} />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
