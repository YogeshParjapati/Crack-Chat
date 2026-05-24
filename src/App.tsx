import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Hash, Shield, Users, Zap, Plus, Lock, Unlock, Smile, Image as ImageIcon, Phone, Video, Palette, X, Search, AlertTriangle, Paperclip, Loader2, Trash2, Terminal, Cpu, Layers, Wifi } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';

import { cn } from '@/src/lib/utils';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  getDocFromServer,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from './firebase';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  color: string;
  type: 'text' | 'emoji' | 'gif' | 'sticker' | 'image' | 'video';
  url?: string;
  uid: string;
  replyTo?: {
    text: string;
    sender: string;
  };
}

interface Room {
  id: string;
  name: string;
  hasPassword?: boolean;
  password?: string;
  createdAt?: number;
  lastActive?: number;
  permanent?: boolean;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const user = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.uid || 'unauthenticated',
      email: user?.email || null,
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || false,
      tenantId: user?.tenantId || null,
      providerInfo: user?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName,
        email: p.email,
        photoUrl: p.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const COLORS = [
  'text-red-400', 'text-blue-400', 'text-green-400', 
  'text-yellow-400', 'text-purple-400', 'text-pink-400',
  'text-cyan-400', 'text-orange-400'
];

const THEMES = [
  { name: 'Classic Orange', class: '', color: '#f97316', vibe: 'HACKER / CLASSIC' },
  { name: 'Neon Green', class: 'theme-neon-green', color: '#22c55e', vibe: 'MATRIX TERMINAL' },
  { name: 'Cyber Pink', class: 'theme-cyber-pink', color: '#ec4899', vibe: 'VAPORWAVE / RETRO' },
  { name: 'Deep Blue', class: 'theme-deep-blue', color: '#3b82f6', vibe: 'SAPPHIRE OCEAN' },
  { name: 'Gold', class: 'theme-gold', color: '#eab308', vibe: 'LUXURY VELVET' },
  { name: 'Blood Red', class: 'theme-blood-red', color: '#ef4444', vibe: 'OMINOUS / CARNAGE' },
  { name: 'Acid Purple', class: 'theme-acid-purple', color: '#a855f7', vibe: 'PLUM SYNTH' },
  { name: 'Ice Synth', class: 'theme-ice-synth', color: '#06b6d4', vibe: 'GLACIAL FROST' },
  { name: 'Toxic Hazard', class: 'theme-toxic-hazard', color: '#84cc16', vibe: 'INDUSTRIAL WASTE' },
  { name: 'Sunset Vibe', class: 'theme-sunset-vibe', color: '#ff6b6b', vibe: 'CORAL HORIZON' },
  { name: 'Minimalist Silver', class: 'theme-minimalist-silver', color: '#f4f4f5', vibe: 'SPECTRE VOID' },
  { name: 'Sakura Sunset 🎏', class: 'theme-sakura-blossom', color: '#f43f5e', vibe: 'SAKURA SHINKAI', bgImage: 'https://images.unsplash.com/photo-1542332213-9b5a5a3abd90?q=80&w=1920&auto=format&fit=crop' },
  { name: 'Neon Shinjuku 🌸', class: 'theme-anime-neon-tokyo', color: '#d946ef', vibe: 'CYBERPUNK TOKYO', bgImage: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=1920&auto=format&fit=crop' },
  { name: 'Lofi Train Cabin 🎧', class: 'theme-anime-lofi-station', color: '#f97316', vibe: 'LOFI EVENING', bgImage: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?q=80&w=1920&auto=format&fit=crop' },
  { name: 'Starlight Dream ✨', class: 'theme-anime-skyline', color: '#38bdf8', vibe: 'CELESTIAL VOID', bgImage: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?q=80&w=1920&auto=format&fit=crop' },
  { name: 'Retro Arcade 👾', class: 'theme-anime-retro-arcade', color: '#06b6d4', vibe: 'PIXEL SYNTHWAVE', bgImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1920&auto=format&fit=crop' },
  { name: 'Ghibli Valley 🎋', class: 'theme-anime-bamboo-forest', color: '#10b981', vibe: 'SUMMER CHILL', bgImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1920&auto=format&fit=crop' },
];

export default function App() {
  return (
    <ChatApp />
  );
}

const BOOT_LOG_LINES = [
  "SYS_PORTAL: SPARKING NETWORK ADAPTOR...",
  "RESOLVING FIREBASE INTERMEDIARY PEER CHANNEL...",
  "ESTABLISHING HOSTING SIGNALS FOR ADOPTED REALM...",
  "DIAGNOSING ATOMIC FREQUENCIES...",
  "MODULATING SENSORY COLOR GRID...",
  "LOADING CORE ASSETS...",
  "INITIALIZATION SUCCESSFUL. HOST SECURED."
];

function ChatApp() {
  const [isBooting, setIsBooting] = useState(true);
  const [bootLogIndex, setBootLogIndex] = useState(0);

  useEffect(() => {
    if (!isBooting) return;
    const interval = setInterval(() => {
      setBootLogIndex((prev) => {
        if (prev >= BOOT_LOG_LINES.length - 1) {
          clearInterval(interval);
          const timeout = setTimeout(() => {
            setIsBooting(false);
          }, 800);
          return prev;
        }
        return prev + 1;
      });
    }, 280);

    return () => clearInterval(interval);
  }, [isBooting]);

  const [userId, setUserId] = useState(() => localStorage.getItem('crackchat_userid') || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [username, setUsername] = useState(localStorage.getItem('crackchat_username') || '');
  const [userColor, setUserColor] = useState(localStorage.getItem('crackchat_color') || COLORS[Math.floor(Math.random() * COLORS.length)]);
  const [isJoined, setIsJoined] = useState(() => localStorage.getItem('crackchat_joined') === 'true');
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
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('crackchat_theme');
    return THEMES.find(t => t.name === saved) || THEMES[0];
  });

  useEffect(() => {
    localStorage.setItem('crackchat_theme', currentTheme.name);
  }, [currentTheme]);
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [roomSearch, setRoomSearch] = useState('');
  const [replyTo, setReplyTo] = useState<{ text: string; sender: string } | null>(null);
  const [callState, setCallState] = useState<{ type: 'voice' | 'video'; status: 'calling' | 'incoming' | 'active'; peer?: string } | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [allRoomsPresence, setAllRoomsPresence] = useState<any[]>([]);
  const [adminActiveTab, setAdminActiveTab] = useState<'members' | 'rooms'>('members');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        localStorage.setItem('crackchat_userid', user.uid);
        // Auto-admin if email matches
        if (user.email === 'yy2561171@gmail.com') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        // We don't auto-login anonymously anymore because it's restricted
        setUserId(localStorage.getItem('crackchat_userid') || '');
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      const errorCode = err?.code;
      if (errorCode === 'auth/cancelled-popup-request') {
        console.warn("Benign: Google Sign-in popup request was cancelled.");
      } else if (errorCode === 'auth/popup-closed-by-user') {
        console.info("Info: User closed the sign-in popup.");
      } else if (errorCode === 'auth/popup-blocked') {
        setError("Sign-in popup blocked. Please allow popups for this site.");
      } else if (errorCode === 'auth/unauthorized-domain') {
        const errorMsg = "UNAUTHORIZED DOMAIN: Please add 'crack-chat.vercel.app' to your Firebase Auth 'Authorized domains' list in the Firebase Console.";
        setError(errorMsg);
        alert("Domain Unauthorized:\nTo fix Google Sign-In on Vercel, allow 'crack-chat.vercel.app' in the Firebase Console -> Authentication -> Settings -> Authorized domains.");
      } else {
        setError("Failed to sign in with Google: " + (err?.message || "Unknown error"));
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsAdmin(false);
    } catch (err) {
      console.error("Sign-Out Error:", err);
    }
  };

  // Admin Presence Listener
  useEffect(() => {
    if (!isAdmin) {
      setAllRoomsPresence([]);
      return;
    }
    
    const unsubscribes: (() => void)[] = [];
    
    rooms.forEach(room => {
      const q = query(collection(db, `rooms/${room.id}/presence`));
      const unsub = onSnapshot(q, (snapshot) => {
        const now = Date.now();
        const members = snapshot.docs.map(doc => ({
          ...doc.data(),
          roomId: room.id,
          roomName: room.name
        })).filter((m: any) => m.lastSeen && (now - m.lastSeen < 60000));
        
        setAllRoomsPresence(prev => {
          const others = prev.filter(p => p.roomId !== room.id);
          return [...others, ...members];
        });
      }, (error) => {
        console.error(`Admin presence listener error for room ${room.id}:`, error);
      });
      unsubscribes.push(unsub);
    });
    
    return () => unsubscribes.forEach(u => u());
  }, [isAdmin, rooms]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Rooms Listener & Cleanup
  useEffect(() => {
    const q = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const roomList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Room[];
      
      const now = Date.now();
      const globalRoomId = 'global';

      // 1. Seed/Update global room
      const globalRoom = roomList.find(r => r.id === globalRoomId);
      if (!globalRoom) {
        await setDoc(doc(db, 'rooms', globalRoomId), {
          name: 'The Void',
          hasPassword: false,
          password: null,
          createdAt: now,
          lastActive: now,
          permanent: true
        });
      } else if (!globalRoom.permanent) {
        // Fix existing global room if it's not permanent
        await setDoc(doc(db, 'rooms', globalRoomId), { ...globalRoom, permanent: true }, { merge: true });
      }

      // 2. Auto-delete stale rooms (not permanent, no activity for 2 mins)
      const staleRooms = roomList.filter(r => !r.permanent && (!r.lastActive || now - r.lastActive > 120000));
      for (const room of staleRooms) {
        try {
          // Note: In a real app we'd delete messages too, but for simplicity we just delete the room doc
          // The messages will stay orphaned but won't be accessible.
          await deleteDoc(doc(db, 'rooms', room.id));
          console.log(`Deleted stale room: ${room.name}`);
        } catch (e) {
          console.error("Failed to delete stale room", e);
        }
      }

      // 3. One-time cleanup (if requested by user "remove all rooms")
      // We'll use a flag to avoid infinite loops or constant deletions
      const hasCleaned = localStorage.getItem('crackchat_initial_cleanup');
      if (!hasCleaned) {
        const otherRooms = roomList.filter(r => !r.permanent && r.id !== globalRoomId);
        for (const room of otherRooms) {
          await deleteDoc(doc(db, 'rooms', room.id));
        }
        localStorage.setItem('crackchat_initial_cleanup', 'true');
      }

      setRooms(roomList.filter(r => !staleRooms.find(sr => sr.id === r.id)));
      
      // Auto-rejoin persisted room
      const savedRoomId = localStorage.getItem('crackchat_roomid');
      if (!currentRoom && roomList.length > 0) {
        const roomToJoin = roomList.find(r => r.id === savedRoomId) || roomList.find(r => r.id === globalRoomId) || roomList[0];
        setCurrentRoom(roomToJoin);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rooms');
    });

    return () => unsubscribe();
  }, [currentRoom]);

  // Call Listener
  useEffect(() => {
    if (!currentRoom || !isJoined) return;

    const q = query(collection(db, `rooms/${currentRoom.id}/calls`), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const callDoc = snapshot.docs[0];
      if (callDoc) {
        const data = callDoc.data();
        if (data.callerId !== userId && data.status === 'calling') {
          setCallState({ type: data.type, status: 'incoming', peer: data.callerName });
        } else if (data.status === 'active') {
          setCallState(prev => prev ? { ...prev, status: 'active' } : null);
        } else if (data.status === 'ended') {
          setCallState(null);
        }
      } else {
        setCallState(null);
      }
    });

    return () => unsubscribe();
  }, [currentRoom, isJoined, userId]);

  // Heartbeat for current room
  useEffect(() => {
    if (!isJoined || !currentRoom || currentRoom.permanent) return;

    const interval = setInterval(async () => {
      try {
        await setDoc(doc(db, 'rooms', currentRoom.id), { lastActive: Date.now() }, { merge: true });
      } catch (e) {
        console.error("Heartbeat failed", e);
      }
    }, 30000); // Every 30s

    return () => clearInterval(interval);
  }, [isJoined, currentRoom]);

  // Presence Heartbeat & Listener
  useEffect(() => {
    if (!isJoined || !currentRoom || !userId) return;

    const presenceRef = doc(db, `rooms/${currentRoom.id}/presence`, userId);
    
    const getDeviceInfo = () => {
      const ua = navigator.userAgent;
      if (/android/i.test(ua)) return "Android";
      if (/iPad|iPhone|iPod/.test(ua)) return "iOS";
      if (/Windows/i.test(ua)) return "Windows";
      if (/Mac/i.test(ua)) return "Mac";
      if (/Linux/i.test(ua)) return "Linux";
      return "Unknown";
    };

    // 1. Initial presence update
    setDoc(presenceRef, { 
      userId, 
      username, 
      lastSeen: Date.now(),
      device: getDeviceInfo()
    }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, presenceRef.path));

    // 2. Heartbeat every 20s
    const heartbeat = setInterval(() => {
      setDoc(presenceRef, { lastSeen: Date.now() }, { merge: true }).catch(() => {});
    }, 20000);

    // 3. Listener for online count
    const q = query(collection(db, `rooms/${currentRoom.id}/presence`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const activeMembers = snapshot.docs.filter(doc => {
        const data = doc.data();
        // Active if seen in last 60 seconds
        return data.lastSeen && (now - data.lastSeen < 60000);
      });
      setOnlineCount(activeMembers.length || 1);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${currentRoom.id}/presence`);
    });

    return () => {
      clearInterval(heartbeat);
      unsubscribe();
      // Try to mark as offline on cleanup
      deleteDoc(presenceRef).catch(() => {});
    };
  }, [isJoined, currentRoom, userId, username]);

  // Messages Listener
  useEffect(() => {
    if (!currentRoom) return;

    const q = query(
      collection(db, `rooms/${currentRoom.id}/messages`), 
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${currentRoom?.id}/messages`);
    });

    return () => unsubscribe();
  }, [currentRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoinRoom = (room: Room, password?: string) => {
    if (!username.trim()) {
      setError('Please choose a codename first');
      return;
    }

    if (!isAdmin && room.hasPassword && room.password !== password) {
      setError('Incorrect password');
      return;
    }

    setCurrentRoom(room);
    setIsJoined(true);
    setError('');
    
    // Save identity and state
    localStorage.setItem('crackchat_username', username);
    localStorage.setItem('crackchat_color', userColor);
    localStorage.setItem('crackchat_joined', 'true');
    localStorage.setItem('crackchat_roomid', room.id);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      const roomId = newRoomName.toLowerCase().replace(/\s+/g, '-');
      const newRoomData = {
        name: newRoomName,
        hasPassword: !!newRoomPass,
        password: newRoomPass || null,
        createdAt: Date.now(),
        lastActive: Date.now(),
        permanent: false
      };
      
      try {
        await setDoc(doc(db, 'rooms', roomId), newRoomData);
        setNewRoomName('');
        setNewRoomPass('');
        setShowRoomCreate(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `rooms/${roomId}`);
      }
    }
  };

  const handleClearChat = async () => {
    if (!currentRoom || !isAdmin) return;
    
    if (!window.confirm(`Are you sure you want to clear all messages in ${currentRoom.name}? This cannot be undone.`)) {
      return;
    }

    try {
      const q = query(collection(db, `rooms/${currentRoom.id}/messages`));
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      await addDoc(collection(db, `rooms/${currentRoom.id}/messages`), {
        text: `Chat cleared by admin`,
        sender: 'SYSTEM',
        color: 'text-red-500',
        type: 'text',
        timestamp: Date.now(),
        uid: 'system'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rooms/${currentRoom.id}/messages`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentRoom) return;
    
    // Only admins or the message sender (though we'll focus on admin for now as per user request context)
    // Actually, let's allow admins to delete anything, and users to delete their own.
    
    try {
      await deleteDoc(doc(db, `rooms/${currentRoom.id}/messages`, messageId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rooms/${currentRoom.id}/messages/${messageId}`);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customData?: Partial<Message>) => {
    e?.preventDefault();
    if ((inputText.trim() || customData) && isJoined && currentRoom) {
      const messageData: any = {
        text: customData?.text || inputText,
        sender: username,
        color: userColor,
        type: customData?.type || 'text',
        url: customData?.url || null,
        timestamp: Date.now(),
        uid: userId,
      };

      if (replyTo) {
        messageData.replyTo = replyTo;
      }

      try {
        await addDoc(collection(db, `rooms/${currentRoom.id}/messages`), messageData);
        setInputText('');
        setReplyTo(null);
        setShowEmojiPicker(false);
        setShowGifPicker(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `rooms/${currentRoom.id}/messages`);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentRoom) return;

    // Firestore document limit is 1MB. Let's limit files to 500KB to be safe with overhead.
    if (file.size > 500 * 1024) {
      alert('File too large. Please select a file smaller than 500KB.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      
      await handleSendMessage(undefined, {
        text: `Shared a ${type}`,
        type: type,
        url: base64
      });
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleStartCall = async (type: 'voice' | 'video') => {
    if (!currentRoom) return;
    setCallState({ type, status: 'calling' });
    try {
      await setDoc(doc(db, `rooms/${currentRoom.id}/calls`, 'active'), {
        type,
        status: 'calling',
        callerId: userId,
        callerName: username,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to start call", error);
    }
  };

  const handleAcceptCall = async () => {
    if (!currentRoom) return;
    try {
      await setDoc(doc(db, `rooms/${currentRoom.id}/calls`, 'active'), {
        status: 'active'
      }, { merge: true });
    } catch (error) {
      console.error("Failed to accept call", error);
    }
  };

  const handleEndCall = async () => {
    if (!currentRoom) return;
    setCallState(null);
    try {
      await deleteDoc(doc(db, `rooms/${currentRoom.id}/calls`, 'active'));
    } catch (error) {
      console.error("Failed to end call", error);
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

  if (isBooting) {
    const progressPercent = Math.min(100, Math.round(((bootLogIndex + 1) / BOOT_LOG_LINES.length) * 100));

    return (
      <div className={cn("min-h-screen bg-[var(--crack-bg)] text-white flex flex-col items-center justify-center p-6 font-sans transition-all duration-700 relative overflow-hidden select-none", currentTheme.class)}>
        {/* Subtle grid pattern background overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        {/* Horizontal scan line animation */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--crack-orange)] to-transparent opacity-30 shadow-[0_0_10px_var(--crack-orange)] animate-scanline pointer-events-none" style={{ animation: 'scanline linear infinite 6s' }} />

        {currentTheme.bgImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
            style={{ backgroundImage: `url(${currentTheme.bgImage})`, opacity: 0.08 }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-black/90 pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-xl w-full relative z-10 space-y-8"
        >
          {/* High-tech Console Frame */}
          <div className="bg-black/80 border border-white/5 p-6 md:p-8 rounded-sm shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Ambient neon corner accent lines */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: 'var(--crack-orange)' }} />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: 'var(--crack-orange)' }} />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: 'var(--crack-orange)' }} />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: 'var(--crack-orange)' }} />

            {/* Frame Header indicators */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 animate-pulse" style={{ color: 'var(--crack-orange)' }} />
                <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-black font-semibold">SYS_INITIALIZATION_MODULE_v3.5</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                <span className="text-[8px] font-mono tracking-widest text-green-500 font-extrabold uppercase">LINK_ESTABLISHED</span>
              </div>
            </div>

            {/* Central Loader Node */}
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="relative flex items-center justify-center w-20 h-20">
                {/* External rotating gear/dots */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                  className="absolute inset-0 rounded-full border border-dashed border-white/20"
                />
                
                {/* Mid track ring */}
                <div className="absolute w-16 h-16 rounded-full border border-white/5" />

                {/* Pulsing Core */}
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="w-12 h-12 rounded-full flex items-center justify-center relative bg-black border"
                  style={{ borderColor: 'var(--crack-orange)', boxShadow: `0 0 15px var(--crack-orange)44` }}
                >
                  <Cpu className="w-5 h-5" style={{ color: 'var(--crack-orange)' }} />
                </motion.div>
                
                <span className="absolute -bottom-3 text-[9px] font-mono text-zinc-400 uppercase font-black bg-black px-1">
                  CORE_U_LNK
                </span>
              </div>

              <div className="text-center pt-2">
                <h3 className="text-xl font-black uppercase tracking-widest font-mono italic">
                  CRACK<span style={{ color: 'var(--crack-orange)' }}>CHAT</span>
                </h3>
                <span className="text-[8px] font-mono tracking-[0.4em] uppercase text-zinc-500 block">REALTIME MATRIX CORE</span>
              </div>
            </div>

            {/* System Log Console Terminal */}
            <div className="bg-black/60 border border-white/5 p-4 rounded-sm font-mono text-[10px] space-y-1.5 text-left h-[135px] overflow-y-auto scrollbar-hide mb-6 relative">
              <div className="absolute top-2 right-2 flex items-center space-x-1.5 opacity-60 pointer-events-none">
                <Wifi className="w-3 h-3 text-zinc-500" />
                <span className="text-[8.5px] text-zinc-500 font-bold uppercase">PING: 14MS</span>
              </div>

              {BOOT_LOG_LINES.slice(0, bootLogIndex + 1).map((line, idx) => (
                <div key={idx} className="flex items-start space-x-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  <span style={{ color: 'var(--crack-orange)' }} className="font-extrabold select-none">&gt;&gt;</span>
                  <p className="flex-1 text-zinc-300 break-all leading-relaxed tracking-wider uppercase font-medium">
                    {line}
                  </p>
                  {idx === bootLogIndex && (
                    <motion.span 
                      animate={{ opacity: [1, 0, 1] }} 
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-1.5 h-3 bg-white inline-block flex-shrink-0"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Technical Progress Loading Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-[9px] font-black text-zinc-400 uppercase">
                <span className="tracking-widest">BOOTING CHANNELS</span>
                <span style={{ color: 'var(--crack-orange)' }} className="font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                <motion.div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${progressPercent}%`, 
                    backgroundColor: 'var(--crack-orange)', 
                    boxShadow: `0 0 10px var(--crack-orange)` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Trigger / Skip Button with extra cyber styling */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <button 
              onClick={() => setIsBooting(false)}
              className="group flex items-center space-x-2 text-[9px] text-zinc-500 hover:text-white font-mono uppercase tracking-[0.3em] transition-all bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 px-5 py-2.5 rounded-sm"
            >
              <span>[[ BYPASS INITIALIZATION ]]</span>
            </button>
            <p className="text-[7.5px] font-mono text-zinc-600 uppercase tracking-widest">
              SECURE CHAT PROTOCOLS ACTIVE &middot; EST. 2026
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className={cn("min-h-screen bg-[var(--crack-bg)] text-white flex flex-col items-center justify-start md:justify-center p-4 md:p-8 font-sans transition-all duration-700 relative overflow-y-auto scrollbar-hide", currentTheme.class)}>
        {currentTheme.bgImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
            style={{ backgroundImage: `url(${currentTheme.bgImage})`, opacity: 0.15 }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full my-auto space-y-8 md:space-y-12 relative z-10 py-6"
        >
          <div className="text-center space-y-3">
            <motion.h1 
              initial={{ scale: 0.8, filter: 'blur(10px)' }}
              animate={{ scale: 1, filter: 'blur(0px)' }}
              className="text-5xl sm:text-7xl md:text-9xl font-black tracking-tighter uppercase italic text-white break-words"
            >
              CRACK<span className="text-[var(--crack-orange)]">CHAT</span>
            </motion.h1>
            <p className="text-zinc-400 text-xs sm:text-sm md:text-base uppercase tracking-[0.3em] md:tracking-[0.5em] font-mono animate-pulse">
              A real-time chat platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 w-full">
            {/* Left: Identity */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-5 md:p-8 space-y-6 md:space-y-8 rounded-sm shadow-2xl">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter border-b border-white/10 pb-3 md:pb-4">Identity</h2>
              
              <div className="space-y-4 md:space-y-6">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="CODENAME"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 py-4 md:py-5 pl-12 pr-4 focus:outline-none focus:border-[var(--crack-orange)] font-mono uppercase text-base md:text-lg transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-3 md:space-y-4">
                <label className="text-xs text-zinc-400 uppercase font-black tracking-widest">Select Vibe</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[170px] md:max-h-[195px] overflow-y-auto pr-1 scrollbar-thin">
                  {THEMES.map(t => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => setCurrentTheme(t)}
                      className={cn(
                        "flex items-center space-x-2 p-2 px-2.5 border transition-all text-left bg-black/40 hover:bg-black/20 group cursor-pointer relative overflow-hidden",
                        currentTheme.name === t.name ? "border-white scale-[1.02] bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]" : "border-white/5 opacity-60 hover:opacity-100"
                      )}
                      style={{ 
                        borderColor: currentTheme.name === t.name ? t.color : 'rgba(255,255,255,0.05)',
                        boxShadow: currentTheme.name === t.name ? `0 0 10px ${t.color}22` : 'none'
                      }}
                    >
                      {t.bgImage && (
                        <div 
                          className="absolute inset-0 bg-cover bg-center opacity-[0.06] group-hover:opacity-15 transition-opacity pointer-events-none"
                          style={{ backgroundImage: `url(${t.bgImage})` }}
                        />
                      )}
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-110 relative z-10" style={{ backgroundColor: t.color, boxShadow: `0 0 10px ${t.color}88` }} />
                      <div className="flex flex-col min-w-0 relative z-10">
                        <span className="text-[9px] font-black uppercase tracking-tighter truncate text-white">{t.name}</span>
                        <span className="text-[7px] font-mono tracking-widest uppercase truncate text-zinc-500 group-hover:text-zinc-400 transition-colors">{t.vibe}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Rooms */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-5 md:p-8 flex flex-col space-y-4 md:space-y-6 rounded-sm shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 md:pb-4">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter">Rooms</h2>
                <button 
                  onClick={() => setShowRoomCreate(!showRoomCreate)}
                  className="text-zinc-500 hover:text-white transition-all hover:scale-110"
                >
                  <Plus className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>

              {error && <p className="text-red-500 text-xs uppercase font-black animate-bounce">{error}</p>}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="SEARCH ROOMS..." 
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 p-2.5 pl-9 text-[10.5px] md:text-xs focus:outline-none focus:border-[var(--crack-orange)] font-mono uppercase transition-all"
                />
              </div>

              {showRoomCreate ? (
                <form onSubmit={handleCreateRoom} className="space-y-3 md:space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <input
                    type="text"
                    placeholder="ROOM NAME"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 p-3 md:p-4 text-xs md:text-sm focus:outline-none focus:border-[var(--crack-orange)] font-mono uppercase transition-all"
                  />
                  <input
                    type="password"
                    placeholder="PASSWORD (OPTIONAL)"
                    value={newRoomPass}
                    onChange={(e) => setNewRoomPass(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 p-3 md:p-4 text-xs md:text-sm focus:outline-none focus:border-[var(--crack-orange)] font-mono uppercase transition-all"
                  />
                  <div className="flex gap-2.5">
                    <button type="submit" className="flex-1 bg-[var(--crack-orange)] text-black font-black uppercase py-2.5 md:py-3 text-xs md:text-sm hover:brightness-110 transition-all">Create</button>
                    <button type="button" onClick={() => setShowRoomCreate(false)} className="px-4 md:px-6 border border-white/10 text-[10px] md:text-xs uppercase hover:bg-white/5 transition-colors">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[190px] md:max-h-[250px] space-y-2 pr-1 scrollbar-hide">
                  {rooms.filter(r => r.name.toLowerCase().includes(roomSearch.toLowerCase())).map(room => (
                    <div 
                      key={room.id}
                      onClick={() => !room.hasPassword && handleJoinRoom(room, '')}
                      className="group flex items-center justify-between bg-white/5 p-3 md:p-4 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="flex items-center space-x-2.5 md:space-x-3 relative z-10 min-w-0 flex-1 mr-2">
                        <Hash className="w-4 h-4 md:w-5 md:h-5 text-zinc-600 group-hover:text-white transition-colors flex-shrink-0" />
                        <span className="text-sm md:text-base font-black uppercase tracking-tighter truncate">{room.name}</span>
                        {room.hasPassword && <Lock className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center space-x-2 relative z-10 flex-shrink-0">
                        {room.hasPassword && (
                          <input 
                            type="password" 
                            placeholder="PASS" 
                            className="w-14 sm:w-20 bg-black/50 border border-white/10 text-[9px] md:text-[10px] p-1.5 focus:outline-none focus:border-[var(--crack-orange)] transition-all"
                            onChange={(e) => setJoinPass(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleJoinRoom(room, joinPass); }}
                          className="text-[10px] md:text-xs font-black uppercase text-white md:opacity-0 md:group-hover:opacity-100 transition-all hover:scale-110 px-2 py-1 bg-white/5 md:bg-transparent rounded-sm"
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
    <div 
      id="crackchat-main-terminal"
      className={cn("flex h-screen bg-[var(--crack-bg)] text-white font-sans overflow-hidden transition-all duration-700 relative", currentTheme.class)}
    >
      <AnimatePresence>
      </AnimatePresence>

      {currentTheme.bgImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
          style={{ backgroundImage: `url(${currentTheme.bgImage})`, opacity: 0.1 }}
        />
      )}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-64 border-r border-white/5 flex-col p-6 space-y-8 bg-black/40 backdrop-blur-2xl relative z-10">
        <SidebarContent 
          rooms={rooms} 
          currentRoom={currentRoom} 
          handleJoinRoom={handleJoinRoom} 
          username={username} 
          userColor={userColor}
          setIsJoined={setIsJoined}
          showThemePicker={showThemePicker}
          setShowThemePicker={setShowThemePicker}
          roomSearch={roomSearch}
          setRoomSearch={setRoomSearch}
          onGoogleSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
          isAuthenticating={isAuthenticating}
        />
      </div>

      {/* Sidebar - Mobile Overlay */}
      <AnimatePresence>
        {showMobileSidebar && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileSidebar(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed inset-y-0 left-0 w-72 bg-[var(--crack-bg)] border-r border-white/10 z-50 p-6 flex flex-col space-y-8 md:hidden"
            >
              <SidebarContent 
                rooms={rooms} 
                currentRoom={currentRoom} 
                handleJoinRoom={handleJoinRoom} 
                username={username} 
                userColor={userColor}
                setIsJoined={setIsJoined}
                showThemePicker={showThemePicker}
                setShowThemePicker={setShowThemePicker}
                roomSearch={roomSearch}
                setRoomSearch={setRoomSearch}
                onClose={() => setShowMobileSidebar(false)}
                onGoogleSignIn={handleGoogleSignIn}
                onSignOut={handleSignOut}
                isAuthenticating={isAuthenticating}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10 w-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-black/60 backdrop-blur-2xl z-20 shadow-lg">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowMobileSidebar(true)}
              className="md:hidden text-zinc-400 hover:text-white transition-colors"
            >
              <Zap className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2">
              <Hash className="w-5 h-5 text-zinc-500" />
              <div className="flex flex-col">
                <h3 className="font-black uppercase tracking-tighter truncate max-w-[120px] md:max-w-none leading-none">{currentRoom?.name}</h3>
                <div className="flex items-center space-x-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{onlineCount} ONLINE</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            <button 
              onClick={() => handleStartCall('voice')}
              className="text-zinc-500 hover:text-white transition-all hover:scale-110 active:scale-95"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleStartCall('video')}
              className="text-zinc-500 hover:text-white transition-all hover:scale-110 active:scale-95"
            >
              <Video className="w-5 h-5" />
            </button>
            {isAdmin && currentRoom?.id === 'global' && (
              <button 
                onClick={handleClearChat}
                className="text-zinc-500 hover:text-red-500 transition-all hover:scale-110 active:scale-95"
                title="Clear Chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            
            {isAdmin ? (
              <span className="hidden sm:inline-flex items-center space-x-1 text-[8px] bg-[var(--crack-orange)]/10 text-[var(--crack-orange)] px-2 py-1 rounded-sm border border-[var(--crack-orange)]/20 font-mono font-bold tracking-widest uppercase">
                <Shield className="w-2.5 h-2.5 animate-pulse" />
                <span>CAPTR_OK</span>
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center space-x-1 text-[8px] bg-red-500/10 text-red-500 px-2 py-1 rounded-sm border border-red-500/20 font-mono font-bold tracking-widest uppercase animate-pulse">
                <Lock className="w-2.5 h-2.5" />
                <span>SHIELD_ON</span>
              </span>
            )}

            <div className="text-white font-black italic tracking-tighter text-sm md:text-base hidden min-[380px]:block">CRACKCHAT</div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                drag="x"
                dragConstraints={{ left: 0, right: 100 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 50) {
                    setReplyTo({ text: msg.text, sender: msg.sender });
                  }
                }}
                className="flex flex-col space-y-1 relative group perspective-container"
              >
                {msg.replyTo && (
                  <div className="ml-2 pl-2 border-l-2 border-white/10 text-[10px] text-zinc-500 italic mb-1">
                    Replying to <span className="font-bold">{msg.replyTo.sender}</span>: {msg.replyTo.text.substring(0, 30)}...
                  </div>
                )}
                <div className="flex items-baseline space-x-2">
                  <span className={cn("text-[10px] md:text-xs font-black uppercase tracking-tighter", msg.color)}>
                    {msg.sender}
                  </span>
                  <span className="text-[8px] md:text-[9px] text-zinc-600 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {(isAdmin || msg.uid === userId) && (
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-500"
                      title="Delete Message"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                <div className="max-w-[90%] md:max-w-2xl">
                  {msg.type === 'text' && (
                    <div className="text-zinc-300 text-sm leading-relaxed bg-white/5 backdrop-blur-sm p-4 border-l-2 border-white/20 transition-all duration-500 hover:bg-white/10 hover:translate-x-1 shadow-xl break-words whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  )}
                  {(msg.type === 'gif' || msg.type === 'sticker' || msg.type === 'image') && (
                    <div className="transition-all duration-500">
                      <img 
                        src={msg.url} 
                        alt="media" 
                        className="max-w-full sm:max-w-[300px] rounded-sm border border-white/10 shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  {msg.type === 'video' && (
                    <div className="transition-all duration-500">
                      <video 
                        src={msg.url} 
                        controls
                        className="max-w-full sm:max-w-[300px] rounded-sm border border-white/10 shadow-2xl"
                      />
                    </div>
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
              className="absolute bottom-24 left-4 md:left-6 z-30 w-[280px] sm:w-[350px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden border border-white/5"
            >
              <EmojiPicker 
                theme={EmojiTheme.DARK}
                onEmojiClick={(emojiData) => setInputText(prev => prev + emojiData.emoji)}
                width="100%"
                height={320}
              />
            </motion.div>
          )}

          {showGifPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-24 left-4 md:left-6 z-30 w-[calc(100%-2rem)] max-w-[380px] bg-zinc-900 border border-zinc-800 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-lg"
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

              <div className="grid grid-cols-3 gap-2 max-h-[200px] sm:max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
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
        <div className="p-4 md:p-6 bg-[var(--crack-bg)] border-t border-zinc-900">
          {replyTo && (
            <div className="flex items-center justify-between bg-zinc-900/80 p-2 mb-2 border-l-2 border-[var(--crack-orange)] animate-in slide-in-from-bottom-2">
              <div className="text-[10px] text-zinc-400">
                Replying to <span className="font-bold text-white">{replyTo.sender}</span>: {replyTo.text.substring(0, 50)}...
              </div>
              <button onClick={() => setReplyTo(null)} className="text-zinc-500 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <form 
            onSubmit={handleSendMessage}
            className="relative flex items-center bg-black/60 backdrop-blur-2xl border border-white/5 focus-within:border-white transition-all duration-500 shadow-2xl"
          >
            <div className="flex items-center px-2 md:px-4 space-x-1 md:space-x-2 border-r border-white/5">
              <button 
                type="button"
                onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                className={cn("p-2 text-zinc-500 hover:text-[var(--crack-orange)]", showEmojiPicker && "text-[var(--crack-orange)]")}
              >
                <Smile className="w-5 h-5" />
              </button>
              <button 
                type="button"
                onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                className={cn("p-2 text-zinc-500 hover:text-[var(--crack-orange)]", showGifPicker && "text-[var(--crack-orange)]")}
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={cn("p-2 text-zinc-500 hover:text-[var(--crack-orange)]", isUploading && "animate-pulse")}
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
              </button>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,video/*"
                className="hidden"
              />
            </div>
            
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="TRANSMIT..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className="flex-1 bg-transparent py-4 px-3 md:px-6 focus:outline-none font-mono text-xs md:text-sm uppercase tracking-tighter"
            />
            
            <button
              type="submit"
              className={cn(
                "px-4 md:px-6 transition-all active:scale-90",
                inputText.trim() ? "text-[var(--crack-orange)]" : "text-zinc-700 opacity-30"
              )}
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
          {callState && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6"
            >
              <div className="text-center space-y-8 max-w-sm w-full">
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center border-4 border-[var(--crack-orange)] animate-pulse">
                    {callState.type === 'video' ? <Video className="w-12 h-12 text-[var(--crack-orange)]" /> : <Phone className="w-12 h-12 text-[var(--crack-orange)]" />}
                  </div>
                  {callState.status === 'active' && <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-black" />}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-3xl font-black uppercase tracking-tighter italic">
                    {callState.status === 'calling' ? 'Transmitting...' : callState.status === 'incoming' ? 'Incoming Signal' : 'Link Established'}
                  </h3>
                  <p className="text-zinc-500 uppercase tracking-widest text-xs font-mono">
                    {callState.status === 'incoming' ? `From: ${callState.peer}` : `Room: ${currentRoom?.name}`}
                  </p>
                </div>

                <div className="flex items-center justify-center space-x-6">
                  {callState.status === 'incoming' ? (
                    <>
                      <button 
                        onClick={handleAcceptCall}
                        className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                      >
                        <Phone className="w-6 h-6 text-white" />
                      </button>
                      <button 
                        onClick={handleEndCall}
                        className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={handleEndCall}
                      className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                    >
                      <X className="w-6 h-6 text-white" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {showThemePicker && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div className="bg-[var(--crack-surface)] border border-white/5 p-4 sm:p-6 md:p-8 max-w-xl w-full space-y-4 sm:space-y-6 rounded-md shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--crack-orange)]/5 via-transparent to-transparent pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter italic text-white flex items-center space-x-2">
                      <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--crack-orange)]" />
                      <span>THEME ATMOSPHERES</span>
                    </h3>
                    <p className="text-[8px] sm:text-[9px] font-mono uppercase tracking-widest text-zinc-500 mt-1">Modulate visual wavelengths</p>
                  </div>
                  <button 
                    onClick={() => setShowThemePicker(false)}
                    className="p-1.5 hover:bg-white/5 text-zinc-500 hover:text-white transition-all rounded"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 min-[450px]:grid-cols-2 gap-2.5 sm:gap-3 max-h-[290px] sm:max-h-[420px] overflow-y-auto pr-1 scrollbar-thin relative z-10">
                  {THEMES.map(t => (
                    <button
                      key={t.name}
                      onClick={() => { setCurrentTheme(t); setShowThemePicker(false); }}
                      className={cn(
                        "p-3 border flex flex-col items-start space-y-2 transition-all relative overflow-hidden text-left group bg-black/40 hover:bg-black/20 hover:scale-[1.01] cursor-pointer",
                        currentTheme.name === t.name ? "bg-white/5 border-white" : "border-white/5 opacity-70 hover:opacity-100"
                      )}
                      style={{ 
                        borderColor: currentTheme.name === t.name ? t.color : 'rgba(255,255,255,0.05)',
                        boxShadow: currentTheme.name === t.name ? `0 0 15px ${t.color}22` : 'none'
                      }}
                    >
                      {t.bgImage && (
                        <div 
                          className="absolute inset-0 bg-cover bg-center opacity-[0.08] group-hover:opacity-20 transition-opacity pointer-events-none"
                          style={{ backgroundImage: `url(${t.bgImage})` }}
                        />
                      )}
                      <div className="flex items-center justify-between w-full relative z-10">
                        <div className="w-3 h-3 rounded-full flex-shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: t.color, boxShadow: `0 0 10px ${t.color}` }} />
                        <span className="text-[7px] font-mono tracking-widest text-[var(--crack-orange)] group-hover:text-white transition-colors opacity-80 uppercase">{t.vibe}</span>
                      </div>
                      
                      <div className="min-w-0 relative z-10 w-full">
                        <span className="text-[11px] sm:text-xs font-black uppercase tracking-tighter text-white block truncate">{t.name}</span>
                      </div>
 
                      {/* Visual swatch indicator strip */}
                      <div className="flex space-x-1 w-full pt-1 relative z-10">
                        <div className="w-full h-1 bg-[#050505] rounded-l border border-white/5" title="Background Base" />
                        <div className="w-full h-1 bg-[#121214] border border-white/5" title="Surface Level" />
                        <div className="w-full h-1 rounded-r" style={{ backgroundColor: t.color }} title="Accent Flare" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SVG Filter for Gooey Effect */}
        <svg className="hidden">
          <defs>
            <filter id="gooey">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
          </defs>
        </svg>

        {/* Admin Panel Toggle */}
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[60] flex flex-col items-center space-y-4">
          <button 
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className={cn(
              "w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center transition-all shadow-2xl group",
              isAdmin ? "text-[var(--crack-orange)] border-[var(--crack-orange)]" : "text-zinc-500 hover:text-white"
            )}
          >
            <Shield className="w-5 h-5" />
            <span className="absolute right-12 bg-black/80 px-2 py-1 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 whitespace-nowrap">Admin Panel</span>
          </button>
        </div>

        {/* Admin Panel Overlay */}
        <AnimatePresence>
          {showAdminPanel && (
            <motion.div 
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-80 max-w-full bg-zinc-950 border-l border-white/10 z-[70] p-6 flex flex-col shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <h2 className="text-xl font-black uppercase tracking-tighter italic">Admin Panel</h2>
                  {isAdmin && <span className="text-[8px] text-[var(--crack-orange)] font-bold uppercase tracking-[0.2em]">Full Access Mode</span>}
                </div>
                <button onClick={() => setShowAdminPanel(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {!isAdmin ? (
                <div className="space-y-6 flex-1 flex flex-col justify-center items-center text-center p-4">
                  <AlertTriangle className="w-12 h-12 text-[#ef4444] animate-pulse mb-2" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#ef4444]">Access Restricted</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mt-2 font-black tracking-tight">
                    This admin console is strictly reserved for Google account <span className="text-white font-mono break-all font-bold">yy2561171@gmail.com</span>. No other credentials, accounts, or emails are permitted.
                  </p>
                  {!auth.currentUser ? (
                    <button 
                      onClick={handleGoogleSignIn}
                      disabled={isAuthenticating}
                      className={cn(
                        "mt-6 w-full bg-white text-black font-black uppercase py-3 text-xs tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center space-x-2",
                        isAuthenticating && "opacity-50 pointer-events-none"
                      )}
                    >
                      {isAuthenticating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[var(--crack-orange)]" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-current text-[var(--crack-orange)]" />
                          <span>Authenticate</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="mt-4 text-[10px] text-zinc-500 font-mono">
                      Currently signed in as: <br />
                      <span className="text-zinc-400 break-all">{auth.currentUser.email}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-[#ef4444] uppercase font-black tracking-widest font-mono">SYS_ADMIN_CONSOLE</span>
                    <button onClick={() => setIsAdmin(false)} className="text-[10px] text-zinc-500 hover:text-red-500 uppercase font-bold transition-colors">Logout</button>
                  </div>

                  {/* Admin Glass Tabs */}
                  <div className="grid grid-cols-2 gap-1 mb-4 p-1 bg-white/5 border border-white/5 text-[10px] uppercase font-black font-mono">
                    <button 
                      onClick={() => setAdminActiveTab('members')}
                      className={cn(
                        "py-2 text-center transition-all",
                        adminActiveTab === 'members' ? "bg-[var(--crack-orange)] text-black font-black" : "text-zinc-500 hover:text-white"
                      )}
                    >
                      USERS ({allRoomsPresence.length})
                    </button>
                    <button 
                      onClick={() => setAdminActiveTab('rooms')}
                      className={cn(
                        "py-2 text-center transition-all",
                        adminActiveTab === 'rooms' ? "bg-[var(--crack-orange)] text-black font-black" : "text-zinc-500 hover:text-white"
                      )}
                    >
                      ROOMS ({rooms.length})
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                    {adminActiveTab === 'members' ? (
                      allRoomsPresence.length === 0 ? (
                        <div className="text-center py-12 text-zinc-600">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-[10px] uppercase font-bold">No active users</p>
                        </div>
                      ) : (
                        allRoomsPresence.map((member, idx) => {
                          const targetRoom = rooms.find(r => r.id === member.roomId);
                          return (
                            <div key={`${member.roomId}-${member.userId}-${idx}`} className="p-3 bg-white/5 border border-white/5 space-y-2 group hover:border-white/10 transition-all">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-tighter text-white">{member.username}</span>
                                <span className="text-[8px] px-1.5 py-0.5 bg-white/10 text-zinc-400 rounded-full font-bold uppercase">{member.device}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-[9px] text-zinc-500">
                                <Hash className="w-3 h-3" />
                                <span className="uppercase font-bold tracking-widest truncate">{member.roomName}</span>
                              </div>
                              <div className="flex items-center space-x-1 justify-between">
                                <div className="flex items-center space-x-1">
                                  <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                  <span className="text-[8px] text-zinc-600 uppercase font-bold">Active Now</span>
                                </div>
                              </div>
                              
                              {targetRoom && (
                                <button
                                  onClick={() => {
                                    handleJoinRoom(targetRoom);
                                    setShowAdminPanel(false);
                                  }}
                                  className="w-full mt-2 py-1.5 bg-white/10 hover:bg-[var(--crack-orange)] text-white hover:text-black font-black font-mono uppercase text-[9px] tracking-widest transition-all flex items-center justify-center space-x-1 border border-white/5"
                                >
                                  <Unlock className="w-2.5 h-2.5" />
                                  <span>JOIN USER ROOM</span>
                                </button>
                              )}
                            </div>
                          );
                        })
                      )
                    ) : (
                      rooms.length === 0 ? (
                        <div className="text-center py-12 text-zinc-600">
                          <Hash className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-[10px] uppercase font-bold">No rooms found</p>
                        </div>
                      ) : (
                        rooms.map((room) => (
                          <div key={room.id} className="p-3 bg-white/5 border border-white/5 space-y-2 hover:border-[var(--crack-orange)] transition-all flex flex-col justify-between">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <Hash className="w-4 h-4 text-[var(--crack-orange)]" />
                                <span className="text-xs font-black uppercase tracking-tighter text-white truncate max-w-[120px]">{room.name}</span>
                              </div>
                              {room.hasPassword ? (
                                <span className="text-[8px] bg-red-500/10 text-red-500 px-1.5 py-0.5 font-bold font-mono tracking-widest uppercase">LOCKED</span>
                              ) : (
                                <span className="text-[8px] bg-green-500/10 text-green-500 px-1.5 py-0.5 font-bold font-mono tracking-widest uppercase font-black">OPEN</span>
                              )}
                            </div>
                            
                            {room.hasPassword && (
                              <div className="text-[9px] text-zinc-500 font-mono tracking-tight flex items-center space-x-1 bg-black/40 p-1 rounded border border-white/5">
                                <span className="text-zinc-600 uppercase font-black text-[7px]">CLEAR PWD:</span>
                                <span className="text-[var(--crack-orange)] font-bold font-mono break-all seleccionar-texto">{room.password || "Empty"}</span>
                              </div>
                            )}
                            
                            <button
                              onClick={() => {
                                handleJoinRoom(room);
                                setShowAdminPanel(false);
                              }}
                              className="w-full mt-2 py-1.5 bg-white text-black hover:bg-[var(--crack-orange)] hover:text-black font-black font-mono uppercase text-[9px] tracking-widest transition-all flex items-center justify-center space-x-1"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>BYPASS & JOIN</span>
                            </button>
                          </div>
                        ))
                      )
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-3">Quick Actions</p>
                    <div className="flex flex-col gap-2">
                      <button className="p-2 w-full bg-white/5 border border-white/5 text-[9px] font-black uppercase hover:bg-white/10 transition-all text-center">Log Audit</button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SidebarContent({ 
  rooms, 
  currentRoom, 
  handleJoinRoom, 
  username, 
  userColor, 
  setIsJoined, 
  showThemePicker, 
  setShowThemePicker,
  roomSearch,
  setRoomSearch,
  onClose,
  onGoogleSignIn,
  onSignOut,
  isAuthenticating
}: { 
  rooms: Room[], 
  currentRoom: Room | null, 
  handleJoinRoom: (room: Room) => void, 
  username: string, 
  userColor: string, 
  setIsJoined: (val: boolean) => void,
  showThemePicker: boolean,
  setShowThemePicker: (val: boolean) => void,
  roomSearch: string,
  setRoomSearch: (val: string) => void,
  onClose?: () => void,
  onGoogleSignIn: () => void,
  onSignOut: () => void,
  isAuthenticating?: boolean
}) {
  const user = auth.currentUser;

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tighter uppercase italic text-white">
          CRACK<span className="text-[var(--crack-orange)]">CHAT</span>
        </h2>
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowThemePicker(!showThemePicker)} className="text-zinc-500 hover:text-white transition-colors">
            <Palette className="w-4 h-4" />
          </button>
          <button onClick={() => setIsJoined(false)} className="text-zinc-500 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide">
        {!user ? (
          <button 
            onClick={onGoogleSignIn}
            disabled={isAuthenticating}
            className={cn(
              "w-full bg-white text-black font-black uppercase py-2 text-[10px] tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center space-x-2",
              isAuthenticating && "opacity-50 pointer-events-none"
            )}
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-[var(--crack-orange)]" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 fill-current" />
                <span>Sign In with Google</span>
              </>
            )}
          </button>
        ) : (
          <div className="p-3 bg-white/5 border border-white/10 rounded-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">Authenticated</span>
              <button onClick={onSignOut} className="text-[8px] text-red-500 hover:text-red-400 uppercase font-black">Sign Out</button>
            </div>
            <div className="flex items-center space-x-2">
              <img src={user.photoURL || ''} alt="" className="w-5 h-5 rounded-full border border-white/10" referrerPolicy="no-referrer" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-white truncate">{user.displayName}</span>
                <span className="text-[8px] text-zinc-500 truncate">{user.email}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Active Rooms</div>
          <button onClick={() => setIsJoined(false)} className="text-[10px] text-zinc-500 hover:text-white uppercase font-black transition-colors">Switch</button>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
          <input 
            type="text" 
            placeholder="SEARCH..." 
            value={roomSearch}
            onChange={(e) => setRoomSearch(e.target.value)}
            className="w-full bg-black/50 border border-white/10 p-2 pl-7 text-[10px] focus:outline-none focus:border-[var(--crack-orange)] font-mono uppercase transition-all"
          />
        </div>

        <div className="space-y-1">
          {rooms.filter(r => r.name.toLowerCase().includes(roomSearch.toLowerCase())).map(room => (
            <button
              key={room.id}
              onClick={() => { handleJoinRoom(room); onClose?.(); }}
              className={cn(
                "w-full flex items-center space-x-2 p-2 -mx-2 transition-all group relative overflow-hidden",
                currentRoom?.id === room.id ? "text-white bg-white/10" : "text-zinc-500 hover:text-white hover:bg-white/5"
              )}
            >
              <Hash className="w-4 h-4" />
              <span className="font-black uppercase tracking-tighter truncate">{room.name}</span>
              {room.hasPassword && <Lock className="w-3 h-3 ml-auto opacity-50" />}
              {currentRoom?.id === room.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white]" />}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-white/5 space-y-4">
        <div className="flex items-center space-x-3">
          <div className={cn("w-3 h-3 rounded-full bg-current shadow-[0_0_15px_currentColor]", userColor)} />
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-tighter">{username}</span>
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] text-zinc-500 uppercase font-bold">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
