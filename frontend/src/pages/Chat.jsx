import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, User, MessageSquare, Clock, Paperclip, File, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import Toast from '../components/Toast';

const ENDPOINT = 'http://localhost:5001';

const Chat = () => {
    const [socket, setSocket] = useState(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [room, setRoom] = useState('General');
    const [username, setUsername] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const displayName = storedUser.name || storedUser.email || `User-${Math.floor(Math.random() * 1000)}`;
        setUsername(displayName);

        const newSocket = io(ENDPOINT, {
            withCredentials: true,
        });

        setSocket(newSocket);

        newSocket.emit('join_room', room);

        newSocket.on('receive_message', (data) => {
            setMessages((prev) => [...prev, data]);
        });

        return () => newSocket.close();
    }, [room]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleFileSelect = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if ((!message.trim() && !file) || !socket) return;

        let fileData = null;

        if (file) {
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', file);
                const { data } = await api.post('/chat/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                fileData = {
                    url: data.url,
                    type: data.mimetype,
                    name: data.filename
                };
            } catch (error) {
                console.error('File upload failed', error);
                setUploading(false);
                return;
            }
            setUploading(false);
            setFile(null);
        }

        const msgData = {
            room,
            author: username,
            message: message,
            file: fileData,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        socket.emit('send_message', msgData);
        setMessages((prev) => [...prev, msgData]);
        setMessage('');
    };

    const renderMessageContent = (msg) => {
        return (
            <div className="flex flex-col gap-2">
                {msg.file && (
                    <div className="mb-1">
                        {msg.file.type.startsWith('image/') ? (
                            <img src={msg.file.url} alt="Shared image" className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.file.url, '_blank')} />
                        ) : (
                            <a href={msg.file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/10 p-2 rounded-lg hover:bg-black/20 transition-colors">
                                <File size={20} />
                                <span className="text-sm underline truncate max-w-[200px]">{msg.file.name}</span>
                            </a>
                        )}
                    </div>
                )}
                {msg.message && <p>{msg.message}</p>}
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6">
            {/* Sidebar / Room List */}
            <div className="w-full lg:w-80 glass-card rounded-2xl p-4 flex flex-col">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <MessageSquare className="text-indigo-500" />
                        Chat Rooms
                    </h2>
                </div>

                <div className="space-y-2 overflow-y-auto flex-1">
                    {['General', 'Announcements', 'Doubts', 'Project Discussion'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRoom(r)}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all ${room === r
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }`}
                        >
                            # {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 glass-card rounded-2xl flex flex-col overflow-hidden bg-card border border-border">
                {/* Header */}
                <div className="p-4 border-b border-border bg-secondary/30 backdrop-blur-md flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-foreground"># {room}</h3>
                        <p className="text-xs text-muted-foreground">Real-time discussion</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Online
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background/50">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <MessageSquare size={48} className="mb-2" />
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.author === username;
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <span className="text-xs text-muted-foreground font-medium">
                                                {isMe ? 'You' : msg.author}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/70">{msg.time}</span>
                                        </div>
                                        <div
                                            className={`px-4 py-2 rounded-2xl break-words shadow-sm ${isMe
                                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                                : 'bg-white dark:bg-gray-800 text-foreground border border-border rounded-tl-none'
                                                }`}
                                        >
                                            {renderMessageContent(msg)}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-card border-t border-border">
                    {file && (
                        <div className="flex items-center gap-2 mb-2 p-2 bg-secondary rounded-lg w-fit">
                            <File size={16} className="text-indigo-500" />
                            <span className="text-sm text-foreground truncate max-w-[200px]">{file.name}</span>
                            <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive">
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    <form onSubmit={sendMessage} className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 text-muted-foreground hover:text-indigo-500 hover:bg-secondary rounded-xl transition-colors"
                        >
                            <Paperclip size={20} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-muted-foreground"
                        />
                        <button
                            type="submit"
                            disabled={(!message.trim() && !file) || uploading}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chat;
