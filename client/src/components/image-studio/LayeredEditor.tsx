import React, { useState, useRef } from 'react';
import { Loader2, Upload, GripHorizontal, ArrowRight, Layers, Download, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export const LayeredEditor: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'original' | 'edited'>('edited');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleEdit = async () => {
        if (!selectedFile) return;
        setIsLoading(true);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('prompt', prompt);
        formData.append('steps', '50');
        formData.append('guidance_scale', '4.0');
        formData.append('target_layer_index', '-1'); // Auto
        formData.append('layers', '-1'); // Dynamic

        try {
            // Updated to port 8003
            const response = await fetch('http://localhost:8003/edit-layered', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Layered editing failed');

            const data = await response.json();

            // Set the final edited image
            const imageStr = `data:${data.media_type};base64,${data.final_image}`;
            setResultImage(imageStr);
            setActiveTab('edited');
            toast.success('Image edited successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to edit image.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-full">
            {/* Sidebar Controls */}
            <div className="w-80 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-6">
                <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Source Image</label>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-square bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/50 transition-all text-zinc-500 hover:text-zinc-300"
                    >
                        {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg bg-white/5" />
                        ) : (
                            <>
                                <Upload size={24} className="mb-2" />
                                <span className="text-xs">Click to upload</span>
                            </>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Edit Instruction (Optional)</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. A beautiful landscape..."
                        className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                    />
                </div>

                <div className="pt-4 mt-auto">
                    <button
                        onClick={handleEdit}
                        disabled={isLoading || !selectedFile}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                        Edit Image
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-black p-8 flex flex-col overflow-auto items-center">
                {!resultImage ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-zinc-700 flex flex-col items-center">
                            <GripHorizontal size={40} className="mb-4 opacity-20" />
                            <p>Upload an image and write instructions to edit it.</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-5xl flex flex-col items-center">
                        <div className="mb-6 w-full flex items-center justify-between">
                            <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                                <button
                                    onClick={() => setActiveTab('original')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'original'
                                        ? 'bg-zinc-800 text-white shadow'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                                        }`}
                                >
                                    <ImageIcon size={16} />
                                    Original Image
                                </button>
                                <button
                                    onClick={() => setActiveTab('edited')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'edited'
                                        ? 'bg-indigo-600 text-white shadow'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                                        }`}
                                >
                                    <ArrowRight size={16} />
                                    Edited Image
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = resultImage;
                                    link.download = `edited-image-${Date.now()}.png`;
                                    link.click();
                                }}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-zinc-700"
                            >
                                <Download size={16} />
                                Download Result
                            </button>
                        </div>

                        <div className="relative group rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/50 max-w-3xl w-full">
                            <div className="aspect-square flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2ZmZiIgLz4KPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZWVlIiAvPgo8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2VlZSIgLz4KPC9zdmc+')] mix-blend-screen bg-repeat opacity-20 absolute inset-0"></div>
                            {activeTab === 'edited' ? (
                                <img
                                    src={resultImage}
                                    alt="Edited Result"
                                    className="relative w-full h-full object-contain z-0"
                                />
                            ) : (
                                <img
                                    src={previewUrl || ''}
                                    alt="Original Source"
                                    className="relative w-full h-full object-contain z-0"
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
