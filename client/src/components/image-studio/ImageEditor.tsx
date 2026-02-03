import React, { useState, useRef } from 'react';
import { Loader2, Upload, GripHorizontal, ArrowRight, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

export const ImageEditor: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
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
        if (!selectedFile || !prompt) return;
        setIsLoading(true);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('prompt', prompt);
        formData.append('steps', '40');
        formData.append('guidance_scale', '4.0');

        try {
            const response = await fetch('http://localhost:8000/edit', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Editing failed');

            const data = await response.json();
            setResultImage(`data:${data.media_type};base64,${data.image}`);
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
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
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
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Edit Instruction</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. Make it snowy, Change cat to dog..."
                        className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                    />
                </div>

                <div className="pt-4 mt-auto">
                    <button
                        onClick={handleEdit}
                        disabled={isLoading || !prompt || !selectedFile}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                        Edit Image
                    </button>
                </div>
            </div>

            {/* Comparison Area */}
            <div className="flex-1 bg-black p-8 flex items-center justify-center gap-8 overflow-auto">
                {/* Original */}
                {previewUrl && (
                    <div className="relative">
                        <div className="absolute -top-8 left-0 text-zinc-500 text-xs font-medium uppercase">Original</div>
                        <img src={previewUrl} alt="Original" className="max-w-[400px] max-h-[70vh] rounded-lg border border-zinc-800 opacity-60" />
                    </div>
                )}

                {/* Arrow */}
                {previewUrl && resultImage && (
                    <div className="text-zinc-700">
                        <ArrowRight size={32} />
                    </div>
                )}

                {/* Result */}
                {resultImage ? (
                    <div className="relative">
                        <div className="absolute -top-8 left-0 text-purple-400 text-xs font-medium uppercase">Result</div>
                        <img src={resultImage} alt="Result" className="max-w-[500px] max-h-[80vh] rounded-lg shadow-2xl shadow-purple-900/20 border border-zinc-800" />
                    </div>
                ) : (
                    !previewUrl && (
                        <div className="text-zinc-700 flex flex-col items-center">
                            <GripHorizontal size={40} className="mb-4 opacity-20" />
                            <p>Upload an image to start editing</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

