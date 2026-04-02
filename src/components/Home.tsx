import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion } from "motion/react";
import { Video, Plus, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";

interface HomeProps {
  onJoin: (roomId: string, userName: string) => void;
  initialRoomId?: string;
}

export default function Home({ onJoin, initialRoomId }: HomeProps) {
  const [roomId, setRoomId] = useState(initialRoomId || "");
  const [userName, setUserName] = useState("");
  const [error, setError] = useState("");

  const handleCreateRoom = async () => {
    if (!userName.trim()) {
      setError("Please enter your name first");
      return;
    }
    const newRoomId = uuidv4().slice(0, 8);
    
    try {
      await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newRoomId, name: `${userName}'s Room` }),
      });
      onJoin(newRoomId, userName);
    } catch (e) {
      console.error("Failed to create room metadata:", e);
      // Still join even if metadata fails
      onJoin(newRoomId, userName);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setError("Please enter your name first");
      return;
    }
    if (!roomId.trim()) {
      setError("Please enter a room ID");
      return;
    }
    onJoin(roomId, userName);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 z-10"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <Video className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
            RoomCall
          </h1>
          <p className="text-neutral-400">
            Secure, real-time video calls and chat. No account needed.
          </p>
        </div>

        <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-3xl backdrop-blur-xl space-y-6 shadow-2xl shadow-black/50">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300 ml-1">Your Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  setError("");
                }}
                className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-neutral-600"
              />
            </div>

            <div className="h-px bg-neutral-800 my-6" />

            <div className="space-y-4">
              <button
                onClick={handleCreateRoom}
                className="w-full group relative flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all active:scale-[0.98] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <Plus className="w-5 h-5" />
                Create New Room
              </button>

              <div className="relative flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-neutral-800" />
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">or join existing</span>
                <div className="h-px flex-1 bg-neutral-800" />
              </div>

              <form onSubmit={handleJoinRoom} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={roomId}
                  onChange={(e) => {
                    setRoomId(e.target.value);
                    setError("");
                  }}
                  className="flex-1 px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-neutral-600"
                />
                <button
                  type="submit"
                  className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl transition-all active:scale-95"
                >
                  <ArrowRight className="w-5 h-5 text-neutral-400" />
                </button>
              </form>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-sm text-red-400 text-center font-medium"
            >
              {error}
            </motion.p>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 text-neutral-500 text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500/50" />
            <span>Encrypted P2P</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-neutral-800" />
          <span>No Data Stored</span>
        </div>
      </motion.div>
    </div>
  );
}
