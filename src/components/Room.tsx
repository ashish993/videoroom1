import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Socket } from "socket.io-client";
import Peer from "peerjs";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  MessageSquare, Users, Copy, Check, 
  Maximize2, Minimize2, Settings, Share2,
  Monitor, MonitorOff
} from "lucide-react";
import { cn } from "../lib/utils";
import Chat from "./Chat";

interface RoomProps {
  roomId: string;
  userName: string;
  onLeave: () => void;
}

interface RemotePeer {
  id: string;
  name: string;
  stream?: MediaStream;
  call?: any;
}

export default function Room({ roomId, userName, onLeave }: RoomProps) {
  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const socketRef = useRef<any>(null);
  const peerRef = useRef<any>(null);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    // Initialize Socket.io
    socketRef.current = io();

    // Get user media
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    }).then((stream) => {
      setMyStream(stream);
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }

      // Initialize PeerJS using our local server
      const peer = new Peer(undefined, {
        host: window.location.hostname,
        port: window.location.port ? parseInt(window.location.port) : (window.location.protocol === "https:" ? 443 : 80),
        path: "/peerjs",
        secure: window.location.protocol === "https:",
      });
      peerRef.current = peer;

      peer.on("open", (id) => {
        console.log("My peer ID:", id);
        socketRef.current?.emit("join-room", roomId, id, userName);
      });

      peer.on("call", (call) => {
        call.answer(stream);
        call.on("stream", (remoteStream: MediaStream) => {
          addPeer(call.peer, "Guest", remoteStream, call);
        });
      });

      socketRef.current?.on("user-connected", (userId, name) => {
        console.log("User connected:", userId, name);
        const call = peer.call(userId, stream);
        call.on("stream", (remoteStream: MediaStream) => {
          addPeer(userId, name, remoteStream, call);
        });
        peersRef.current.set(userId, call);
      });

      socketRef.current?.on("user-disconnected", (userId) => {
        console.log("User disconnected:", userId);
        if (peersRef.current.has(userId)) {
          peersRef.current.get(userId).close();
          peersRef.current.delete(userId);
        }
        setPeers((prev) => prev.filter((p) => p.id !== userId));
      });

      socketRef.current?.on("receive-message", (msg) => {
        setMessages((prev) => [...prev, msg]);
      });
    }).catch(err => {
      console.error("Failed to get media stream:", err);
    });

    return () => {
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
      myStream?.getTracks().forEach(track => track.stop());
    };
  }, [roomId]);

  const addPeer = (id: string, name: string, stream: MediaStream, call: any) => {
    setPeers((prev) => {
      if (prev.find(p => p.id === id)) return prev;
      return [...prev, { id, name, stream, call }];
    });
  };

  const toggleMic = () => {
    if (myStream) {
      const audioTrack = myStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  };

  const toggleCam = () => {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsCamOn(videoTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace track for all peers
        peers.forEach((peer) => {
          if (peer.call && peer.call.peerConnection) {
            const senders = peer.call.peerConnection.getSenders();
            const videoSender = senders.find((s: any) => s.track?.kind === "video");
            if (videoSender) {
              videoSender.replaceTrack(screenTrack);
            }
          }
        });

        // Update local preview
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = screenStream;
        }

        // Handle user stopping screen share via browser UI
        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      
      // Restore camera track for all peers
      peers.forEach((peer) => {
        if (peer.call && peer.call.peerConnection) {
          const senders = peer.call.peerConnection.getSenders();
          const videoSender = senders.find((s: any) => s.track?.kind === "video");
          if (videoSender) {
            videoSender.replaceTrack(videoTrack);
          }
        }
      });

      // Restore local preview
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = myStream;
      }
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const sendMessage = (text: string) => {
    socketRef.current?.emit("send-message", text);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950">
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-neutral-800/50 bg-neutral-900/50 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Room: {roomId}</h2>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Live Session</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomId}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs font-medium transition-all"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopied ? "Copied!" : "Copy Invite Link"}
            </button>
            <div className="w-px h-4 bg-neutral-800 mx-2" />
            <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase">{peers.length + 1} Online</span>
            </div>
          </div>
        </header>

        {/* Video Grid */}
        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className={cn(
            "grid gap-4 h-full max-h-[calc(100vh-180px)]",
            peers.length === 0 ? "grid-cols-1" : 
            peers.length === 1 ? "grid-cols-1 md:grid-cols-2" :
            peers.length === 2 ? "grid-cols-1 md:grid-cols-3" :
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          )}>
            {/* My Video */}
            <motion.div 
              layout
              className={cn(
                "relative aspect-video bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-xl group",
                isScreenSharing && "ring-2 ring-indigo-500"
              )}
            >
              <video
                ref={myVideoRef}
                autoPlay
                muted
                playsInline
                className={cn("w-full h-full object-cover", !isScreenSharing && "mirror")}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <div className="px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg text-xs font-medium border border-white/10">
                  {userName} (You)
                </div>
                {!isMicOn && (
                  <div className="p-1.5 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <MicOff className="w-3 h-3 text-red-400" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Remote Videos */}
            {peers.map((peer) => (
              <motion.div
                key={peer.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-video bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-xl group"
              >
                <VideoElement stream={peer.stream!} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg text-xs font-medium border border-white/10">
                    {peer.name}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </main>

        {/* Controls */}
        <footer className="h-24 flex items-center justify-center gap-4 z-20">
          <div className="flex items-center gap-4 px-6 py-3 bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-3xl shadow-2xl">
            <button
              onClick={toggleMic}
              className={cn(
                "p-4 rounded-2xl transition-all active:scale-95",
                isMicOn ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-300" : "bg-red-500/20 text-red-400 border border-red-500/50"
              )}
            >
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
            <button
              onClick={toggleCam}
              className={cn(
                "p-4 rounded-2xl transition-all active:scale-95",
                isCamOn ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-300" : "bg-red-500/20 text-red-400 border border-red-500/50"
              )}
            >
              {isCamOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={cn(
                "p-4 rounded-2xl transition-all active:scale-95",
                isScreenSharing ? "bg-indigo-500 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              )}
            >
              {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
            </button>
            
            <div className="w-px h-8 bg-neutral-800 mx-2" />

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={cn(
                "p-4 rounded-2xl transition-all active:scale-95 relative",
                isChatOpen ? "bg-indigo-500 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              )}
            >
              <MessageSquare className="w-6 h-6" />
              {!isChatOpen && messages.length > 0 && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-indigo-500 border-2 border-neutral-900 rounded-full" />
              )}
            </button>

            <button
              onClick={onLeave}
              className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-all active:scale-95 shadow-lg shadow-red-600/20"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </footer>
      </div>

      {/* Chat Sidebar */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-80 border-l border-neutral-800 bg-neutral-900/50 backdrop-blur-xl z-30"
          >
            <Chat 
              messages={messages} 
              onSendMessage={sendMessage} 
              onClose={() => setIsChatOpen(false)}
              currentUserId={peerRef.current?.id || ""}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function VideoElement({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-cover"
    />
  );
}
