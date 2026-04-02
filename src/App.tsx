import { useState, useEffect } from "react";
import Home from "./components/Home";
import Room from "./components/Room";

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  // Handle URL hash for room joining
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setRoomId(hash);
    }
  }, []);

  const handleJoinRoom = (id: string, name: string) => {
    setRoomId(id);
    setUserName(name);
    window.location.hash = id;
  };

  const handleLeaveRoom = () => {
    setRoomId(null);
    window.location.hash = "";
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {!roomId ? (
        <Home onJoin={handleJoinRoom} initialRoomId={window.location.hash.replace("#", "")} />
      ) : (
        <Room roomId={roomId} userName={userName} onLeave={handleLeaveRoom} />
      )}
    </div>
  );
}
