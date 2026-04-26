import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Sayfa değiştirmek için
import { socket } from "../socket"; // Socket bağlantımızın olduğu dosya

function Join() {
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate(); // Yönlendirme fonksiyonu

  const handleJoin = () => {
    if (roomCode !== "" && name !== "") {
      // 1. Sunucuya "Ben bu odaya girdim" haberini gönderiyoruz
      socket.emit("joinRoom", { roomId: roomCode, username: name });

      // 2. Kullanıcıyı /game sayfasına yönlendiriyoruz
      // 'state' içinde verileri gönderiyoruz ki diğer sayfada 'arda' ve '123' bilgilerini okuyabilelim
      navigate("/game", { state: { roomCode, name, isHost: false } });
      
      console.log("Bağlantı isteği gönderildi ve yönlendiriliyor...");
    } else {
      alert("Kanka oda kodunu ve ismini yazmayı unutma!");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">Quiz'e Katıl</h1>

      <input
        type="text"
        placeholder="Oda Kodu"
        className="border p-2 rounded"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
      />

      <input
        type="text"
        placeholder="İsmin"
        className="border p-2 rounded"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button 
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
        onClick={handleJoin}
      >
        Katıl
      </button>
    </div>
  );
}

export default Join;