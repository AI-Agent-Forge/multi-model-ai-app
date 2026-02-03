import React, { useState, useRef } from 'react';
import { Play, Download, Wand2, Upload, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const VideoStudioLayout: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [showEnhance, setShowEnhance] = useState(false);

    // Settings (hidden by default)
    const [width] = useState(768);
    const [height] = useState(512);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!prompt && activeTab === 'text') {
            toast.error('Please enter a prompt');
            return;
        }
        if (activeTab === 'image' && !imageFile) {
            toast.error('Please upload an image');
            return;
        }

        setIsGenerating(true);
        setGeneratedVideo(null);

        try {
            const formData = new FormData();
            formData.append('prompt', prompt || (activeTab === 'image' ? "Animate this image" : "")); // Default prompt for image if empty
            formData.append('width', width.toString());
            formData.append('height', height.toString());
            console.log("Generating with params:", { prompt, width, height, activeTab });

            let response;
            if (activeTab === 'text') {
                response = await fetch('http://localhost:8002/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, width, height }),
                });
            } else {
                if (imageFile) {
                    formData.append('file', imageFile);
                }
                response = await fetch('http://localhost:8002/image-to-video', {
                    method: 'POST',
                    body: formData,
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Generation failed');
            }

            const data = await response.json();
            if (data.video) {
                setGeneratedVideo(`data:video/mp4;base64,${data.video}`);
                toast.success('Video generated successfully!');
            }
        } catch (error) {
            console.error('Generation error:', error);
            toast.error('Failed to generate video. Ensure video service is running.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black text-white p-6 gap-6 max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row gap-6 h-full">
                {/* Left Panel: Inputs */}
                <div className="w-full md:w-1/3 flex flex-col gap-6">
                    <div className="bg-zinc-900/50 rounded-2xl p-1 border border-zinc-800 flex">
                        <button
                            onClick={() => setActiveTab('text')}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'text' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            <Video size={16} />
                            Text to Video
                        </button>
                        <button
                            onClick={() => setActiveTab('image')}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'image' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            <ImageIcon size={16} />
                            Image to Video
                        </button>
                    </div>

                    <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 flex-1 flex flex-col gap-6">
                        {/* Image Upload Area */}
                        {activeTab === 'image' && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-zinc-700 rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors bg-zinc-950/50 relative overflow-hidden group"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-sm font-medium">Click to change</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                                        <span className="text-zinc-400 text-sm">Upload Image</span>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-zinc-400 flex justify-between">
                                Prompt
                                <button
                                    onClick={() => setShowEnhance(!showEnhance)}
                                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                >
                                    <Wand2 size={12} />
                                    Enhance
                                </button>
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={activeTab === 'text' ? "Describe the video you want to generate..." : "Describe motion or changes (optional)..."}
                                className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-4 resize-none focus:outline-none focus:ring-1 focus:ring-pink-500/50 text-sm placeholder:text-zinc-600"
                            />
                        </div>

                        <div className="mt-auto pt-6">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Play size={18} fill="currentColor" />
                                        Generate Video
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div className="w-full md:w-2/3 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 flex items-center justify-center relative overflow-hidden group p-1">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

                    {generatedVideo ? (
                        <div className="relative w-full h-full flex flex-col">
                            <video
                                src={generatedVideo}
                                controls
                                autoPlay
                                loop
                                className="w-full h-full object-contain rounded-xl bg-black"
                            />
                            <a
                                href={generatedVideo}
                                download="generated-video.mp4"
                                className="absolute top-4 right-4 p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
                            >
                                <Download size={20} />
                            </a>
                        </div>
                    ) : (
                        <div className="text-center space-y-4 max-w-sm px-6">
                            <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-6 ring-1 ring-white/10">
                                <Video className="w-10 h-10 text-zinc-600" />
                            </div>
                            <h3 className="text-xl font-medium text-white">Ready to Create</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed">
                                Enter your prompt or upload an image to start generating high-quality AI videos powered by LTX-2.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
