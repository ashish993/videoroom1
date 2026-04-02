import React, { useState, useRef, useEffect } from "react";
import { Send, X, Smile, Paperclip, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
  currentUserId: string;
}

export default function Chat({ messages, onSendMessage, onClose, currentUserId }: ChatProps) {
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="font-semibold text-sm">Room Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-neutral-400" />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-50">
            <div className="p-4 bg-neutral-800 rounded-full">
              <Send className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium">No messages yet.<br/>Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.userId === currentUserId;
            const showName = index === 0 || messages[index - 1].userId !== msg.userId;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col max-w-[85%]",
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                {showName && !isMe && (
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 ml-1">
                    {msg.userName}
                  </span>
                )}
                <div
                  className={cn(
                    "px-3 py-2 rounded-2xl text-sm shadow-sm",
                    isMe 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-neutral-800 text-neutral-200 rounded-tl-none"
                  )}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-neutral-600 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-900/80">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full pl-4 pr-12 py-3 bg-neutral-800 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-sm placeholder:text-neutral-600"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-lg transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-neutral-800 rounded-md transition-colors">
              <Smile className="w-4 h-4 text-neutral-500" />
            </button>
            <button className="p-1.5 hover:bg-neutral-800 rounded-md transition-colors">
              <Paperclip className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
          <button className="p-1.5 hover:bg-neutral-800 rounded-md transition-colors">
            <MoreVertical className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { MessageSquare } from "lucide-react";
