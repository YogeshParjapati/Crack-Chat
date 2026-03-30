import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, User, Hash, Shield, Zap, Plus, Lock, Unlock, Smile, Image as ImageIcon, Phone, Video, Palette, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  color: string;
  type: 'text' | 'emoji' | 'gif' | 'sticker';
  url?: string;
}

interface Room {
  id: string;
  name: string;
  hasPassword?: boolean;
}

const COLORS = [
  'text-red-400', 'text-blue-400', 'text-green-400', 
  'text-yellow-400', 'text-purple-400', 'text-pink-400',
  'text-cyan-400', 'text-orange-400'
];

const THEMES = [
  { name: 'Dark Soul', class: 'theme-anime', color: '#ffffff', bgImage: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&q=80&w=1920' },
  { name: 'Classic Orange', class: '', color: '#f97316' },
  { name: 'Neon Green', class: 'theme-neon-green', color: '#22c55e' },
  { name: 'Cyber Pink', class: 'theme-cyber-pink', color: '#ec4899' },
  { name: 'Deep Blue', class: 'theme-deep-blue', color: '#3b82f6' },
  { name: 'Night City', class: 'theme-anime', color: '#8b5cf6', bgImage: 'https://images.unsplash.com/photo-1578632738981-43c9ad4698d8?auto=format&fit=crop&q=80&w=1920' },
  { name: 'Cherry Blossom', class: 'theme-anime', color: '#f472b6', bgImage: 'https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?auto=format&fit=crop&q=80&w=1920' },
  { name: 'Sunset Train', class: 'theme-anime', color: '#fb923c', bgImage: 'https://images.unsplash.com/photo-1541560052-5e137f229371?auto=format&fit=crop&q=80&w=1920' },
  { name: 'Forest Shrine', class: 'theme-anime', color: '#4ade80', bgImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=1920' },
];

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [username, setUsername] = useState('');
  const [userColor, setUserColor] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showRoomCreate, setShowRoomCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPass, setNewRoomPass] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [error, setError] = useState('');
  
  // UI States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isStickerMode, setIsStickerMode] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [isMediaLoading, setIsMediaLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('room_list', (roomList: Room[]) => {
      setRooms(roomList);
    });

    newSocket.on('joined_room', (data: { roomId: string, name: string, messages: Message[] }) => {
      setCurrentRoom({ id: data.roomId, name: data.name });
      setMessages(data.messages);
      setIsJoined(true);
      setError('');
    });

    newSocket.on('receive_message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('error', (msg: string) => {
      setError(msg);
    });

    newSocket.emit('get_rooms');

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoinRoom = (roomId: string, password?: string) => {
    if (!username.trim()) {
      setError('Please choose a codename first');
      return;
    }
    socket?.emit('join_room', { roomId, password });
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      const roomId = newRoomName.toLowerCase().replace(/\s+/g, '-');
      socket?.emit('create_room', { id: roomId, name: newRoomName, password: newRoomPass });
      setNewRoomName('');
      setNewRoomPass('');
      setShowRoomCreate(false);
    }
  };

  const handleSendMessage = (e?: React.FormEvent, customData?: Partial<Message>) => {
    e?.preventDefault();
    if ((inputText.trim() || customData) && socket && isJoined && currentRoom) {
      socket.emit('send_message', {
        roomId: currentRoom.id,
        text: customData?.text || inputText,
        sender: username,
        color: userColor,
        type: customData?.type || 'text',
        url: customData?.url
      });
      setInputText('');
      setShowEmojiPicker(false);
      setShowGifPicker(false);
    }
  };

  const searchGifs = async (isTrending = false) => {
    const type = isStickerMode ? 'stickers' : 'gifs';
    const endpoint = (isTrending || !gifSearch.trim()) ? 'trending' : 'search';
    const query = (isTrending || !gifSearch.trim()) ? '' : `&q=${encodeURIComponent(gifSearch)}`;
    
    setIsMediaLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/${type}/${endpoint}?api_key=dc6zaTOxFJmzC${query}&limit=24`);
      const data = await res.json();
      setGifs(data.data || []);
    } catch (e) {
      console.error("Media search failed", e);
    } finally {
      setIsMediaLoading(false);
    }
  };

  useEffect(() => {
    if (showGifPicker) {
      searchGifs(true);
    }
  }, [showGifPicker, isStickerMode]);

  if (!isJoined) {
    return (
      <div className={cn("min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 font-sans transition-all duration-700 relative overflow-hidden", currentTheme.class)}>
        {currentTheme.bgImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
            style={{ backgroundImage: `url(${currentTheme.bgImage})`, opacity: 0.4 }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full space-y-8 relative z-10"
        >
          <div className="text-center space-y-2">
            <h1 className="text-7xl font-black tracking-tighter uppercase italic text-[var(--crack-orange)]">
              CRACK<span className="text-white">CHAT</span>
            </h1>
            <p className="text-zinc-500 text-sm uppercase tracking-widest font-mono">
              The Void is Calling
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Identity */}
            <div className="space-y-6 bg-zinc-900/30 p-6 border border-zinc-800">
              <h2 className="text-xl font-black uppercase tracking-tighter border-b border-zinc-800 pb-2">Identity</h2>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="CODENAME"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (!userColor) setUserColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 py-4 pl-12 pr-4 focus:outline-none focus:border-[var(--crack-orange)] transition-colors font-mono uppercase"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Select Vibe</label>
                <div className="grid grid-cols-3 gap-2">
                  {THEMES.map(t => (
                    <button
                      key={t.name}
                      onClick={() => setCurrentTheme(t)}
                      className={cn(
                        "h-8 border border-zinc-800 transition-all",
                        currentTheme.name === t.name ? "border-[var(--crack-orange)] scale-105" : "opacity-50 hover:opacity-100"
                      )}
                      style={{ backgroundColor: t.color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Rooms */}
            <div className="space-y-4 bg-zinc-900/30 p-6 border border-zinc-800 flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h2 className="text-xl font-black uppercase tracking-tighter">Rooms</h2>
                <button 
                  onClick={() => setShowRoomCreate(!showRoomCreate)}
                  className="text-zinc-500 hover:text-[var(--crack-orange)] transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {error && <p className="text-red-500 text-[10px] uppercase font-bold">{error}</p>}

              {showRoomCreate ? (
                <form onSubmit={handleCreateRoom} className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <input
                    type="text"
                    placeholder="ROOM NAME"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-[var(--crack-orange)] font-mono uppercase"
                  />
                  <input
                    type="password"
                    placeholder="PASSWORD (OPTIONAL)"
                    value={newRoomPass}
                    onChange={(e) => setNewRoomPass(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-[var(--crack-orange)] font-mono uppercase"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-[var(--crack-orange)] text-black font-black py-2 text-xs uppercase">Create</button>
                    <button type="button" onClick={() => setShowRoomCreate(false)} className="px-4 border border-zinc-800 text-xs uppercase">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[200px] space-y-2 pr-2">
                  {rooms.map(room => (
                    <div 
                      key={room.id}
                      className="group flex items-center justify-between bg-zinc-900/50 p-3 border border-zinc-800 hover:border-[var(--crack-orange)] transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <Hash className="w-4 h-4 text-zinc-600" />
                        <span className="text-sm font-bold uppercase tracking-tighter">{room.name}</span>
                        {room.hasPassword && <Lock className="w-3 h-3 text-zinc-600" />}
                      </div>
                      <div className="flex items-center space-x-2">
                        {room.hasPassword && (
                          <input 
                            type="password" 
                            placeholder="PASS" 
                            className="w-16 bg-zinc-800 border border-zinc-700 text-[10px] p-1 focus:outline-none focus:border-[var(--crack-orange)]"
                            onChange={(e) => setJoinPass(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <button 
                          onClick={() => handleJoinRoom(room.id, joinPass)}
                          className="text-[10px] font-black uppercase text-[var(--crack-orange)] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-screen bg-[#050505] text-white font-sans overflow-hidden transition-all duration-700 relative", currentTheme.class)}>
      {currentTheme.bgImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
          style={{ backgroundImage: `url(${currentTheme.bgImage})`, opacity: 0.25 }}
        />
      )}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-none" />

      {/* Sidebar */}
      <div className="hidden md:flex w-64 border-r border-white/10 flex-col p-6 space-y-8 bg-black/40 backdrop-blur-xl relative z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tighter uppercase italic text-[var(--crack-orange)]">
            CRACK<span className="text-white">CHAT</span>
          </h2>
          <button onClick={() => setShowThemePicker(!showThemePicker)} className="text-zinc-500 hover:text-[var(--crack-orange)]">
            <Palette className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Rooms</div>
            <button onClick={() => setIsJoined(false)} className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold">Switch</button>
          </div>
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => handleJoinRoom(room.id)}
              className={cn(
                "w-full flex items-center space-x-2 p-2 -mx-2 transition-all group",
                currentRoom?.id === room.id ? "text-[var(--crack-orange)] bg-[var(--crack-orange)]/10" : "text-zinc-500 hover:text-white"
              )}
            >
              <Hash className="w-4 h-4" />
              <span className="font-bold uppercase tracking-tighter truncate">{room.name}</span>
              {room.hasPassword && <Lock className="w-3 h-3 ml-auto opacity-50" />}
            </button>
          ))}
        </div>

        <div className="pt-6 border-t border-zinc-900 space-y-4">
          <div className="flex items-center space-x-3">
            <div className={cn("w-3 h-3 rounded-full bg-current shadow-[0_0_10px_rgba(255,255,255,0.2)]", userColor)} />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-tighter">{username}</span>
              <span className="text-[10px] text-zinc-500 uppercase">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md z-20">
          <div className="flex items-center space-x-2">
            <Hash className="w-5 h-5 text-zinc-500" />
            <h3 className="font-black uppercase tracking-tighter">{currentRoom?.name}</h3>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="text-zinc-500 hover:text-[var(--crack-orange)] transition-colors"><Phone className="w-5 h-5" /></button>
            <button className="text-zinc-500 hover:text-[var(--crack-orange)] transition-colors"><Video className="w-5 h-5" /></button>
            <div className="md:hidden text-[var(--crack-orange)] font-black italic tracking-tighter">CRACKCHAT</div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-baseline space-x-2">
                  <span className={cn("text-xs font-black uppercase tracking-tighter", msg.color)}>
                    {msg.sender}
                  </span>
                  <span className="text-[9px] text-zinc-600 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div className="max-w-2xl">
                  {msg.type === 'text' && (
                    <div className="text-zinc-300 text-sm leading-relaxed bg-zinc-900/30 p-3 border-l-2 border-zinc-800">
                      {msg.text}
                    </div>
                  )}
                  {(msg.type === 'gif' || msg.type === 'sticker') && (
                    <img 
                      src={msg.url} 
                      alt="media" 
                      className="max-w-[200px] rounded-sm border border-zinc-800"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Rich Media Pickers */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-24 left-6 z-30"
            >
              <EmojiPicker 
                theme={EmojiTheme.DARK}
                onEmojiClick={(emojiData) => setInputText(prev => prev + emojiData.emoji)}
              />
            </motion.div>
          )}

          {showGifPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-24 left-6 z-30 w-[380px] bg-zinc-900 border border-zinc-800 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => { setIsStickerMode(false); setGifs([]); }}
                    className={cn("text-xs font-black uppercase tracking-tighter transition-colors", !isStickerMode ? "text-[var(--crack-orange)]" : "text-zinc-500 hover:text-zinc-300")}
                  >
                    GIFs
                  </button>
                  <button 
                    onClick={() => { setIsStickerMode(true); setGifs([]); }}
                    className={cn("text-xs font-black uppercase tracking-tighter transition-colors", isStickerMode ? "text-[var(--crack-orange)]" : "text-zinc-500 hover:text-zinc-300")}
                  >
                    Stickers
                  </button>
                </div>
                <button onClick={() => setShowGifPicker(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    value={gifSearch}
                    onChange={(e) => setGifSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchGifs()}
                    placeholder={isStickerMode ? "Search Stickers..." : "Search GIFs..."}
                    className="w-full bg-zinc-800 border border-zinc-700 p-2 pl-8 text-xs focus:outline-none focus:border-[var(--crack-orange)] transition-colors rounded-sm"
                  />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                </div>
                <button 
                  onClick={() => searchGifs()} 
                  className="bg-[var(--crack-orange)] px-4 py-2 rounded-sm hover:brightness-110 transition-all active:scale-95"
                >
                  <span className="text-[10px] font-black uppercase text-black">Find</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {isMediaLoading ? (
                  <div className="col-span-3 py-12 flex flex-col items-center justify-center space-y-3">
                    <div className="w-6 h-6 border-2 border-[var(--crack-orange)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Scanning Giphy...</span>
                  </div>
                ) : gifs.length > 0 ? (
                  gifs.map(gif => (
                    <motion.div
                      key={gif.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative aspect-square bg-zinc-800 rounded-sm overflow-hidden cursor-pointer group"
                      onClick={() => handleSendMessage(undefined, { 
                        type: isStickerMode ? 'sticker' : 'gif', 
                        url: gif.images.fixed_height.url, 
                        text: isStickerMode ? 'Sent a Sticker' : 'Sent a GIF' 
                      })}
                    >
                      <img 
                        src={gif.images.fixed_height_small.url}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-3 py-12 text-center">
                    <p className="text-[10px] text-zinc-600 uppercase font-bold">No results found in the void.</p>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-2 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-[8px] text-zinc-600 uppercase font-bold">Powered by Giphy</span>
                <a href="https://giphy.com" target="_blank" rel="noreferrer" className="text-[8px] text-[var(--crack-orange)] uppercase font-bold hover:underline">Explore More</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="p-6 bg-[#050505] border-t border-zinc-900">
          <form 
            onSubmit={handleSendMessage}
            className="relative flex items-center bg-zinc-900/50 border border-zinc-800 focus-within:border-[var(--crack-orange)] transition-colors"
          >
            <div className="flex items-center px-4 space-x-2 border-r border-zinc-800">
              <button 
                type="button"
                onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                className={cn("text-zinc-500 hover:text-[var(--crack-orange)]", showEmojiPicker && "text-[var(--crack-orange)]")}
              >
                <Smile className="w-5 h-5" />
              </button>
              <button 
                type="button"
                onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                className={cn("text-zinc-500 hover:text-[var(--crack-orange)]", showGifPicker && "text-[var(--crack-orange)]")}
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="TRANSMIT MESSAGE..."
              className="flex-1 bg-transparent py-4 px-6 focus:outline-none font-mono text-sm uppercase tracking-tighter"
            />
            
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-6 text-zinc-500 hover:text-[var(--crack-orange)] disabled:opacity-30 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="flex justify-between items-center mt-2">
            <p className="text-[9px] text-zinc-700 uppercase tracking-widest">
              Room: {currentRoom?.id} • {messages.length} Messages
            </p>
            <button onClick={() => setShowThemePicker(!showThemePicker)} className="text-[9px] text-zinc-600 hover:text-white uppercase font-bold">Change Vibe</button>
          </div>
        </div>

        {/* Theme Overlay */}
        <AnimatePresence>
          {showThemePicker && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <div className="bg-zinc-900 border border-zinc-800 p-8 max-w-md w-full space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">Select Vibe</h3>
                  <button onClick={() => setShowThemePicker(false)}><X className="w-6 h-6" /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {THEMES.map(t => (
                    <button
                      key={t.name}
                      onClick={() => { setCurrentTheme(t); setShowThemePicker(false); }}
                      className={cn(
                        "p-4 border border-zinc-800 flex flex-col items-center space-y-2 transition-all hover:border-[var(--crack-orange)] relative overflow-hidden",
                        currentTheme.name === t.name && "bg-zinc-800 border-[var(--crack-orange)]"
                      )}
                    >
                      {t.bgImage && (
                        <div 
                          className="absolute inset-0 bg-cover bg-center opacity-30"
                          style={{ backgroundImage: `url(${t.bgImage})` }}
                        />
                      )}
                      <div className="w-8 h-8 rounded-full relative z-10" style={{ backgroundColor: t.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest relative z-10">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
