import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Paperclip, Activity, StopCircle, Upload, Play, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    audioUrl?: string; // For assistant voice response
    imageUrl?: string; // For user image upload
}

export const QwenOmniPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    // Refs
    const bottomRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const createdUrlsRef = useRef<string[]>([]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isProcessing]);

    // Cleanup audio/image URLs on unmount
    useEffect(() => {
        return () => {
            createdUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                handleVoiceSend(audioBlob); // Auto send on stop
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            // Handle permission error visually
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop all tracks
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleVoiceSend = async (blob: Blob) => {
        setIsProcessing(true);
        // Add optimistic user message (audio placeholder or generic wav icon)
        const userMsg: Message = { role: 'user', content: '🎤 Voice Message' };
        setMessages(prev => [...prev, userMsg]);

        const formData = new FormData();
        formData.append('audio', blob, 'recording.wav');

        try {
            // Direct call to voice_service
            const response = await fetch('http://localhost:5004/api/v1/omni/chat', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Voice service error');

            // Expecting audio/wav response with headers indicating text? 
            // Or multipart response? For now, let's assume we get audio back 
            // and maybe we need a different endpoint layout or response format to get BOTH text and audio.
            // Requirement said "live bidirectional voice", "text chat".
            // Implementation plan said "Audio -> STT -> Qwen -> TTS -> Audio response".
            // Let's assume the response IS the audio blob of the answer.
            // And maybe we can fetch the transcription via headers or a separate call? 
            // For MVP "Live Voice", let's play the audio. 

            // Expecting JSON response with { text: "...", audio: "base64..." }
            const data = await response.json();

            // Decode base64 audio
            const audioResponseBlob = await (await fetch(`data:audio/wav;base64,${data.audio}`)).blob();
            const audioUrl = URL.createObjectURL(audioResponseBlob);
            createdUrlsRef.current.push(audioUrl);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.text || '🗣️ (Voice Response)',
                audioUrl
            }]);

            // Auto play
            const audio = new Audio(audioUrl);
            audio.play();

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Error communicating with Qwen Omni.' }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTextSend = async () => {
        if (!input.trim() && !uploadFile) return;

        const userMsg: Message = {
            role: 'user',
            content: input,
            imageUrl: uploadFile ? (() => {
                const url = URL.createObjectURL(uploadFile);
                createdUrlsRef.current.push(url);
                return url;
            })() : undefined
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setUploadFile(null);
        setIsProcessing(true);

        const formData = new FormData();
        formData.append('text', userMsg.content);
        if (uploadFile) {
            formData.append('image', uploadFile); // or 'file'
        }

        try {
            // If text only, we treat it as text-chat. 
            // Does /omni/chat handle text input? We need to ensure backend handles it.
            // If backend expects audio, we need a flexible endpoint.

            // Let's assume we use the SAME endpoint /v1/omni/chat but pass 'text' instead of 'audio'.

            const response = await fetch('http://localhost:5004/api/v1/omni/chat', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Omni service error');

            // Handle response (Text + Audio?)
            // For text chat, we probably prefer text response + optional audio.
            // If we get blob, it's likely audio.

            // Expecting JSON response with { text: "...", audio: "base64..." }
            const data = await response.json();

            // Decode base64 audio
            const audioResponseBlob = await (await fetch(`data:audio/wav;base64,${data.audio}`)).blob();
            const audioUrl = URL.createObjectURL(audioResponseBlob);
            createdUrlsRef.current.push(audioUrl);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.text || '🗣️ (Voice Response)',
                audioUrl
            }]);

            const audio = new Audio(audioUrl);
            audio.play();

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + error }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0]);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto px-4 relative">
            {/* Header */}
            <div className="py-4 border-b border-white/5 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="text-orange-500" size={20} />
                    <h2 className="text-lg font-semibold text-white">Qwen Omni (Live Voice)</h2>
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-zinc-700'}`}></span>
                    {isRecording ? 'Recording...' : 'Ready'}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto space-y-6 pb-20 scrollbar-thin scrollbar-thumb-zinc-800">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-4">
                        <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                            <Mic className="text-orange-500 w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-medium text-white">Start a Conversation</h3>
                        <p className="text-zinc-400 text-center max-w-sm">
                            Use your voice or type to chat. Upload images or audio files to analyze.
                        </p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-zinc-800 text-zinc-100 rounded-bl-none'}`}>
                            {msg.imageUrl && (
                                <img src={msg.imageUrl} alt="Upload" className="max-w-full h-auto rounded-lg mb-2" />
                            )}
                            <div className="prose prose-invert prose-sm">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            {msg.audioUrl && (
                                <div className="mt-2 flex items-center gap-2 bg-black/20 p-2 rounded-lg">
                                    <button
                                        onClick={() => new Audio(msg.audioUrl).play()}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                    >
                                        <Play size={16} />
                                    </button>
                                    <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full w-full bg-orange-500/50 origin-left"></div>
                                    </div>
                                    <span className="text-xs opacity-70">Voice</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isProcessing && (
                    <div className="flex justify-start">
                        <div className="bg-zinc-800 p-4 rounded-2xl rounded-bl-none animate-pulse flex gap-2 items-center">
                            <Sparkles size={16} className="text-orange-400" />
                            <span className="text-xs text-zinc-400">Processing...</span>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 left-0 right-0 px-4 max-w-5xl mx-auto">
                <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 p-2 rounded-2xl shadow-2xl flex items-center gap-2">
                    {/* File Upload */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                        accept="image/*,audio/*"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-3 rounded-xl transition-colors ${uploadFile ? 'bg-green-500/20 text-green-500' : 'hover:bg-zinc-800 text-zinc-400'}`}
                        title="Upload file"
                    >
                        {uploadFile ? <Upload size={20} /> : <Paperclip size={20} />}
                    </button>

                    {/* Text Input */}
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTextSend()}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-zinc-500 px-2"
                        disabled={isRecording}
                    />

                    {/* Voice Button */}
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-3 rounded-xl transition-all ${isRecording
                            ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                            : 'hover:bg-zinc-800 text-zinc-400'
                            }`}
                        title={isRecording ? "Stop recording" : "Start recording"}
                    >
                        {isRecording ? <StopCircle size={24} /> : <Mic size={24} />}
                    </button>

                    {/* Send Button */}
                    <button
                        onClick={handleTextSend}
                        disabled={!input.trim() && !uploadFile}
                        className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
