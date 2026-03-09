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

    // WebSocket state
    const wsRef = useRef<WebSocket | null>(null);
    const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

    // Refs
    const bottomRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const createdUrlsRef = useRef<string[]>([]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isProcessing]);

    // WebSocket connection logic
    useEffect(() => {
        let reconnectTimeout: number;

        const connectWs = () => {
            setWsStatus('connecting');
            const socket = new WebSocket('ws://localhost:5004/api/v1/omni/ws/chat');

            socket.onopen = () => {
                setWsStatus('connected');
                wsRef.current = socket;
            };

            socket.onmessage = async (event) => {
                if (event.data instanceof Blob) {
                    // Audio response
                    const audioUrl = URL.createObjectURL(event.data);
                    createdUrlsRef.current.push(audioUrl);

                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMsg = newMessages[newMessages.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content !== '🗣️ (Voice Response)') {
                            newMessages[newMessages.length - 1] = { ...lastMsg, audioUrl };
                            return newMessages;
                        } else {
                            return [...newMessages, {
                                role: 'assistant',
                                content: '🗣️ (Voice Response)',
                                audioUrl
                            }];
                        }
                    });

                    setIsProcessing(false);
                    const audio = new Audio(audioUrl);
                    audio.play();
                } else if (typeof event.data === 'string') {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'text_response') {
                            setIsProcessing(false);
                            setMessages(prev => [...prev, {
                                role: 'assistant',
                                content: data.text
                            }]);
                        } else if (data.type === 'transcription') {
                            setMessages(prev => {
                                const newMsgs = [...prev];
                                const lastUser = [...newMsgs].reverse().find(m => m.role === 'user');
                                if (lastUser && lastUser.content === '🎤 Voice Message') {
                                    lastUser.content = `🎤 ${data.text}`;
                                }
                                return newMsgs;
                            });
                        } else if (data.type === 'error') {
                            setIsProcessing(false);
                            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.message}` }]);
                        }
                    } catch (e) {
                        console.error("Invalid WS message", e);
                    }
                }
            };

            socket.onclose = () => {
                setWsStatus('disconnected');
                wsRef.current = null;
                reconnectTimeout = window.setTimeout(connectWs, 3000);
            };

            socket.onerror = (err) => {
                console.error("WebSocket error:", err);
                socket.close();
            };
        };

        connectWs();

        return () => {
            clearTimeout(reconnectTimeout);
            if (wsRef.current) {
                wsRef.current.close();
            }
            createdUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const startRecording = async () => {
        if (wsStatus !== 'connected' || !wsRef.current) {
            console.error("WebSocket not connected");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Note: browser support for mimeType may vary, webm/audio or audio/ogg is typical
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            setMessages(prev => [...prev, { role: 'user', content: '🎤 Voice Message' }]);
            setIsProcessing(true);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'stop_recording' }));
                }
            };

            mediaRecorder.start(250);
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            setIsProcessing(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
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

        if (wsStatus === 'connected' && wsRef.current && !uploadFile) {
            wsRef.current.send(JSON.stringify({
                type: 'text_chat',
                text: userMsg.content
            }));
            return;
        }

        // Fallback for file uploads
        const formData = new FormData();
        formData.append('text', userMsg.content);
        if (uploadFile) {
            formData.append('audio', uploadFile);
        }

        try {
            const response = await fetch('http://localhost:5004/api/v1/omni/chat', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Omni service error');

            const data = await response.json();
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
                    {wsStatus === 'connecting' && <span className="text-yellow-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> Connecting...</span>}
                    {wsStatus === 'disconnected' && <span className="text-red-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Disconnected</span>}
                    {wsStatus === 'connected' && (
                        <>
                            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                            {isRecording ? 'Recording...' : 'Connected'}
                        </>
                    )}
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
