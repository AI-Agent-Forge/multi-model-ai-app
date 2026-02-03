import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, X, Download, Mic, Square, RotateCcw } from 'lucide-react';

const READING_PASSAGE = "The birch canoe slid on the smooth planks. Glue the sheet to the dark blue background. It's easy to tell the depth of a well. These days a chicken leg is a rare dish. Rice is often served in round bowls. The juice of lemons makes fine punch. The box was thrown beside the parked truck. The hogs were fed chopped corn and garbage. Four hours of steady work faced us. Large size in stockings is hard to sell.";

export const VoiceClone: React.FC = () => {
    const [text, setText] = useState('');
    const [refText, setRefText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Recording State
    const [mode, setMode] = useState<'upload' | 'record'>('upload');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
            if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        };
    }, [recordedUrl]);

    // Handle File Upload
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            // Clear recording if any
            setRecordedBlob(null);
            setRecordedUrl(null);
        }
    };

    // Recording Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                setRecordedBlob(blob);
                setRecordedUrl(url);

                // Create a File object from the blob to unify submission logic
                const file = new File([blob], "recorded_voice.wav", { type: 'audio/wav' });
                setSelectedFile(file);

                // Auto-fill transparency text if in record mode
                setRefText(READING_PASSAGE);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            // Clear previous file selection if switching to recording
            setSelectedFile(null);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone. Please ensure permission is granted.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) window.clearInterval(timerRef.current);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleGenerate = async () => {
        if (!text || !selectedFile || !refText) return;
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('text', text);
            formData.append('ref_text', refText);
            formData.append('ref_audio', selectedFile);
            formData.append('language', 'English');

            const response = await fetch('http://localhost:8000/api/v1/tts/clone', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            } else {
                console.error('Failed to generate clone');
            }
        } catch (error) {
            console.error('Error generating clone:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Input Selection */}
                <div className="space-y-4">
                    {/* Mode Toggle */}
                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                        <button
                            onClick={() => setMode('upload')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${mode === 'upload' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <Upload size={14} /> Upload Audio
                        </button>
                        <button
                            onClick={() => setMode('record')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${mode === 'record' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <Mic size={14} /> Record Voice
                        </button>
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                        <label className="block text-sm font-medium text-zinc-400 mb-4">Reference Audio</label>

                        {mode === 'upload' ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-zinc-700 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500/50 hover:bg-zinc-800/50 transition-all min-h-[160px]"
                            >
                                {selectedFile && !recordedBlob ? (
                                    <div className="flex items-center gap-2 bg-purple-500/20 text-purple-200 px-4 py-2 rounded-lg">
                                        <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="hover:text-white">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                                        <span className="text-sm text-zinc-400">Click to upload .wav or .mp3</span>
                                    </>
                                )}
                                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileSelect} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center space-y-4 min-h-[160px]">
                                {/* Reading Passage Display */}
                                <div className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 italic leading-relaxed mb-2">
                                    "{READING_PASSAGE}"
                                </div>

                                {!isRecording && !recordedUrl ? (
                                    <button
                                        onClick={startRecording}
                                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all font-medium"
                                    >
                                        <Mic size={20} /> Start Recording
                                    </button>
                                ) : isRecording ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="text-2xl font-mono text-white font-bold animate-pulse">
                                            {formatTime(recordingTime)}
                                        </div>
                                        <button
                                            onClick={stopRecording}
                                            className="flex items-center gap-2 px-6 py-2 rounded-full bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 transition-all mt-2"
                                        >
                                            <Square size={16} fill="currentColor" /> Stop
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-full space-y-3">
                                        <audio controls src={recordedUrl!} className="w-full h-8" />
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => { setRecordedUrl(null); setRecordedBlob(null); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                                            >
                                                <RotateCcw size={12} /> Rerecord
                                            </button>
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                Ready to Clone
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Reference Text</label>
                        <textarea
                            value={refText}
                            onChange={(e) => setRefText(e.target.value)}
                            placeholder={mode === 'record' ? "Text will be auto-filled after recording..." : "Transcribe the reference audio exactly..."}
                            className={`w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 h-24 resize-none transition-all ${mode === 'record' ? 'opacity-70 cursor-not-allowed' : ''}`}
                            readOnly={mode === 'record'}
                        />
                    </div>
                </div>

                {/* Right: Target */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Target Text</label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="What should the cloned voice say?"
                        className="w-full flex-1 bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all min-h-[200px]"
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !text || !selectedFile || !refText}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Cloning...</span>
                        </>
                    ) : (
                        <>
                            <Send size={18} />
                            <span>Generate Clone</span>
                        </>
                    )}
                </button>
            </div>

            {audioUrl && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4">
                        <audio controls src={audioUrl} className="h-10 rounded-full" />
                        <a href={audioUrl} download="cloned-voice.wav" className="p-3 text-zinc-400 hover:text-white transition-colors">
                            <Download size={20} />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
