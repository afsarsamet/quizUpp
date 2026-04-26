import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { socket } from "../socket";

function Game() {
  const location = useLocation();
  const { roomCode, name, isHost } = location.state || { roomCode: "", name: "İsimsiz", isHost: false }; 
  
  const [gameState, setGameState] = useState("waiting");
  const [currentQuestion, setCurrentQuestion] = useState(null);

  useEffect(() => {
    if (roomCode) {
      socket.emit("joinRoom", { roomId: roomCode, username: name });
    }

    socket.on("gameStarted", () => {
      setGameState("playing");
    });

    socket.on("nextQuestion", (question) => {
      setCurrentQuestion(question);
    });

    return () => {
      socket.off("gameStarted");
      socket.off("nextQuestion");
    };
  }, [roomCode, name]);

  const handleStartGame = () => {
    socket.emit("startGame", roomCode);
  };

  // Renk paleti (Kahoot stili)
  const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 font-sans">
      
      {/* Üst Bilgi Çubuğu */}
      <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center bg-slate-800 border-b border-slate-700">
        <p className="font-black text-indigo-400">ODA: {roomCode}</p>
        <p className="font-bold text-slate-300">{name} {isHost ? "👑 (HOST)" : "📱 (OYUNCU)"}</p>
      </div>

      {/* 1. BEKLEME EKRANI (LOBİ) */}
      {gameState === "waiting" && (
        <div className="bg-slate-800 p-12 rounded-[40px] shadow-2xl border border-slate-700 text-center max-w-md w-full">
          <h1 className="text-3xl font-black mb-8">Lobi</h1>
          {isHost ? (
            <button 
              onClick={handleStartGame}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-2xl font-black text-2xl shadow-lg transition-all active:scale-95"
            >
              OYUNU BAŞLAT
            </button>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
              <p className="text-slate-400 font-bold">Host bekleniyor...</p>
            </div>
          )}
        </div>
      )}

      {/* 2. OYUN EKRANI */}
      {gameState === "playing" && currentQuestion && (
        <div className="w-full max-w-5xl flex flex-col items-center">
          
          {/* HOST EKRANI: Sadece Soru ve Şık Metinleri */}
          {isHost ? (
            <div className="w-full text-center animate-in fade-in slide-in-from-top duration-700">
              <div className="bg-white text-slate-900 p-10 rounded-3xl shadow-2xl mb-12">
                <h1 className="text-4xl md:text-6xl font-black">{currentQuestion.questionText}</h1>
              </div>
              
              <div className="grid grid-cols-2 gap-6 w-full">
                {currentQuestion.options.map((opt, i) => (
                  <div key={i} className={`${colors[i]} p-8 rounded-2xl text-2xl font-black shadow-lg flex items-center`}>
                    <span className="bg-black/20 w-12 h-12 rounded-full flex items-center justify-center mr-4">
                       {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* OYUNCU EKRANI: Sadece Büyük Renkli Butonlar (Metin Yok) */
            <div className="w-full grid grid-cols-2 gap-4 h-[70vh] animate-in zoom-in duration-300">
              {currentQuestion.options.map((_, i) => (
                <button 
                  key={i}
                  className={`${colors[i]} hover:brightness-110 active:scale-95 rounded-3xl shadow-2xl flex items-center justify-center text-6xl font-black transition-all`}
                  onClick={() => {
                    const isCorrect = i === currentQuestion.correctOptionIndex;
                    alert(isCorrect ? "🎯 DOĞRU!" : "💀 YANLIŞ!");
                  }}
                >
                  {/* Sadece Harf veya Şekil Gözükür */}
                  {String.fromCharCode(65 + i)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Game;