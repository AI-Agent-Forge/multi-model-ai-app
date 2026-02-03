import React, { useState } from 'react';
import { Loader2, Download, Image as ImageIcon, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

export const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [steps, setSteps] = useState(50);
    const [guidanceScale, setGuidanceScale] = useState(4.0);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:8000/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    negative_prompt: negativePrompt,
                    steps,
                    guidance_scale: guidanceScale,
                    width: 1024,
                    height: 1024
                }),
            });

            if (!response.ok) throw new Error('Generation failed');

            const data = await response.json();
            setGeneratedImage(`data:${data.media_type};base64,${data.image}`);
            toast.success('Image generated successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate image.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-full">
            {/* Sidebar Controls */}
            <div className="w-80 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-6 overflow-y-auto">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Prompt</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe your imagination..."
                            className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Negative Prompt</label>
                        <textarea
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="What to avoid..."
                            className="w-full h-20 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Steps</label>
                            <span className="text-xs text-zinc-400">{steps}</span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="100"
                            value={steps}
                            onChange={(e) => setSteps(Number(e.target.value))}
                            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Guidance Scale</label>
                            <span className="text-xs text-zinc-400">{guidanceScale.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            step="0.5"
                            value={guidanceScale}
                            onChange={(e) => setGuidanceScale(Number(e.target.value))}
                            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>

                <div className="pt-4 mt-auto">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                        Generate
                    </button>
                </div>
            </div>

            {/* Main Canvas */}
            <div className="flex-1 bg-black flex items-center justify-center p-8 relative">
                {generatedImage ? (
                    <div className="relative group max-w-full max-h-full">
                        <img
                            src={generatedImage}
                            alt="Generated"
                            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl shadow-blue-900/20 border border-zinc-800"
                        />
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-white/20 transition-colors">
                                <Download size={20} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-700">
                        <div className="w-24 h-24 rounded-2xl bg-zinc-900 flex items-center justify-center mb-4">
                            <ImageIcon size={40} className="opacity-20" />
                        </div>
                        <p className="text-lg font-medium">Ready to create</p>
                        <p className="text-sm opacity-50">Enter a prompt to start generating</p>
                    </div>
                )}
            </div>
        </div>
    );
};

