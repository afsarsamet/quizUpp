import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Join() {
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const savedUser = localStorage.getItem("quizupp_user");

    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUsername(user.username || "");
      } catch (error) {
        console.error("User parse error:", error);
      }
    }
  }, []);

  const handleJoinRoom = async (event) => {
    event.preventDefault();

    setErrorMessage("");

    const cleanRoomCode = roomCode.trim();
    const cleanUsername = username.trim();

    if (!cleanRoomCode) {
      setErrorMessage("Oda kodu zorunludur.");
      return;
    }

    if (!cleanUsername) {
      setErrorMessage("Kullanıcı adı zorunludur.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `http://localhost:5000/api/rooms/${cleanRoomCode}`
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Oda bulunamadı.");
        return;
      }

      navigate("/game", {
        state: {
          roomCode: data.roomCode,
          username: cleanUsername,
          isHost: false,
          quizTitle: data.title,
        },
      });
    } catch (error) {
      console.error("Join room error:", error);
      setErrorMessage("Backend sunucusuna ulaşılamıyor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="form-card">
        <h1>QuizUpp</h1>
        <h2>Oyuna Katıl</h2>

        {errorMessage && <div className="alert alert-error">{errorMessage}</div>}

        <form onSubmit={handleJoinRoom}>
          <label>Oda Kodu</label>
          <input
            type="text"
            placeholder="Örn: 123456"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value)}
            disabled={loading}
          />

          <label>Kullanıcı Adı</label>
          <input
            type="text"
            placeholder="Oyunda görünecek adın"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Odaya giriliyor..." : "Oyuna Katıl"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Join;