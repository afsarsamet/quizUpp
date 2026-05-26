import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../config";

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [readyQuizzes, setReadyQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [guestUsername, setGuestUsername] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loadingGuestRoom, setLoadingGuestRoom] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [activeRooms, setActiveRooms] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedActiveRoom, setSelectedActiveRoom] = useState(null);
  const [joinUsername, setJoinUsername] = useState("");
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem("quizupp_user");

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setGuestUsername(parsed.username || "");
        setJoinUsername(parsed.username || "");
      } catch (error) {
        console.error("User parse error:", error);
        localStorage.removeItem("quizupp_user");
        localStorage.removeItem("quizupp_token");
      }
    } else {
      setGuestUsername("Yarışma Kurucusu");
      setJoinUsername("Yarışmacı");
    }

    const fetchReadyQuizzes = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/ready-quizzes`);
        const data = await response.json();
        if (response.ok) {
          setReadyQuizzes(data.quizzes || []);
        }
      } catch (error) {
        console.error("Error fetching ready quizzes:", error);
      }
    };

    const fetchActiveRooms = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/active-rooms`);
        const data = await response.json();
        if (response.ok) {
          setActiveRooms(data.rooms || []);
        }
      } catch (error) {
        console.error("Error fetching active rooms:", error);
      }
    };

    const fetchGlobalLeaderboard = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/leaderboard`);
        const data = await response.json();
        if (response.ok) {
          setGlobalLeaderboard(data.leaderboard || []);
        }
      } catch (error) {
        console.error("Error fetching global leaderboard:", error);
      }
    };

    fetchReadyQuizzes();
    fetchActiveRooms();
    fetchGlobalLeaderboard();

    const interval = setInterval(() => {
      fetchActiveRooms();
      fetchGlobalLeaderboard();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("quizupp_user");
    localStorage.removeItem("quizupp_token");
    setUser(null);
    navigate("/");
  };

  const handleCreateQuiz = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/host");
  };

  const handleMyQuizzes = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/my-quizzes");
  };

  const handleOpenGuestModal = (quiz) => {
    setSelectedQuiz(quiz);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleStartGuestRoom = async (e) => {
    e.preventDefault();
    if (!selectedQuiz) return;

    const cleanUsername = guestUsername.trim();
    if (!cleanUsername) {
      setErrorMsg("Lütfen geçerli bir isim girin.");
      return;
    }

    try {
      setLoadingGuestRoom(true);
      setErrorMsg("");

      const response = await fetch(
        `${BACKEND_URL}/api/quizzes/ready/${selectedQuiz.id}/start-room-guest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: cleanUsername,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.message || "Oda oluşturulamadı.");
        return;
      }

      setShowModal(false);
      navigate("/game", {
        state: {
          roomCode: data.roomCode,
          username: cleanUsername,
          isHost: true,
          quizTitle: selectedQuiz.title,
        },
      });
    } catch (error) {
      console.error("Start guest room error:", error);
      setErrorMsg("Sunucuya bağlanılamadı.");
    } finally {
      setLoadingGuestRoom(false);
    }
  };

  const handleOpenJoinModal = (room) => {
    setSelectedActiveRoom(room);
    setJoinError("");
    
    if (user) {
      navigate("/game", {
        state: {
          roomCode: room.roomCode,
          username: user.username,
          isHost: false,
          quizTitle: room.title,
        },
      });
    } else {
      setShowJoinModal(true);
    }
  };

  const handleJoinActiveRoom = async (e) => {
    e.preventDefault();
    if (!selectedActiveRoom) return;

    const cleanUsername = joinUsername.trim();
    if (!cleanUsername) {
      setJoinError("Lütfen geçerli bir isim girin.");
      return;
    }

    try {
      setJoiningRoom(true);
      setJoinError("");

      const response = await fetch(
        `${BACKEND_URL}/api/rooms/${selectedActiveRoom.roomCode}`
      );

      const data = await response.json();

      if (!response.ok) {
        setJoinError(data.message || "Odaya katılım başarısız oldu.");
        return;
      }

      setShowJoinModal(false);
      navigate("/game", {
        state: {
          roomCode: data.roomCode,
          username: cleanUsername,
          isHost: false,
          quizTitle: data.title,
        },
      });
    } catch (error) {
      console.error("Join active room error:", error);
      setJoinError("Sunucuya bağlanılamadı.");
    } finally {
      setJoiningRoom(false);
    }
  };

  return (
    <div className="landing-page">
      <header className="navbar">
        <Link className="brand" to="/">
          QuizUpp
        </Link>

        <div className="navbar-actions">
          {user ? (
            <>
              <Link className="navbar-link" to="/my-quizzes">
                Quizlerim
              </Link>

              <span className="navbar-user">Merhaba, {user.username}</span>

              <button className="navbar-button logout-button" onClick={handleLogout}>
                Çıkış Yap
              </button>
            </>
          ) : (
            <>
              <Link className="navbar-link" to="/login">
                Giriş Yap
              </Link>

              <Link className="navbar-button" to="/register">
                Kayıt Ol
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="landing-main">
        <div className="hero-card">
          <p className="hero-badge">Canlı Quiz Oyunu</p>

          <h1>Arkadaşlarınla gerçek zamanlı quiz oyna</h1>

          <p className="hero-description">
            Oda koduyla oyuna katılabilir, kayıt olmadan yarışabilirsin.
            Quiz oluşturmak için giriş yapman yeterli.
          </p>

          <div className="hero-actions">
            <Link className="join-main-button" to="/join">
              Oyuna Katıl
            </Link>

            <button className="create-quiz-button" onClick={handleCreateQuiz}>
              Quiz Oluştur
            </button>

            {user && (
              <button className="my-quizzes-button" onClick={handleMyQuizzes}>
                Quizlerim
              </button>
            )}
          </div>

          {!user && (
            <p className="hero-note">
              Kendi quizini oluşturmak ve kaydetmek için giriş yapman gerekir.
            </p>
          )}
        </div>

        {readyQuizzes.length > 0 && (
          <div className="home-ready-section">
            <div className="home-ready-header">
              <h2>QuizUpp Hızlı Yarışma Portalı 🎮</h2>
              <p>Kayıt olmadan, dilediğin konuyu seç ve anında odanı kurarak arkadaşlarınla yarışmaya başla!</p>
            </div>

            <div className="ready-packs-grid">
              {readyQuizzes.map((pack) => {
                let gradientClass = "gradient-purple";
                if (pack.id === "ready-tarih-cografya") gradientClass = "gradient-orange";
                if (pack.id === "ready-spor-dunyasi") gradientClass = "gradient-green";
                if (pack.id === "ready-yesilcam-sinema") gradientClass = "gradient-coral";
                if (pack.id === "ready-bilim-teknoloji") gradientClass = "gradient-blue";
                if (pack.id === "ready-matematik-mantik") gradientClass = "gradient-indigo";
                if (pack.id === "ready-gastronomi") gradientClass = "gradient-pink";
                if (pack.id === "ready-turk-soz-deyis") gradientClass = "gradient-teal";
                if (pack.id === "ready-bosluk-tamamlama") gradientClass = "gradient-cyan";
                if (pack.id === "ready-dort-islem") gradientClass = "gradient-crimson";
                if (pack.id === "ready-hayvanlar-dunyasi") gradientClass = "gradient-amber";
                if (pack.id === "ready-islam-kulturu") gradientClass = "gradient-emerald";

                return (
                  <div className={`ready-pack-card ${gradientClass}`} key={pack.id}>
                    <div className="ready-card-content">
                      <span className="ready-category-badge">{pack.category}</span>
                      <h4>{pack.title}</h4>
                      <p>{pack.description}</p>
                      <span className="ready-questions-info">
                        ⏱️ Süre: {pack.timerSeconds}sn • 📝 {pack.questions.length} Soru
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ready-start-button"
                      onClick={() => handleOpenGuestModal(pack)}
                    >
                      Oda Aç ve Yarış ⚡
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Live Rooms Portal */}
        <div className="active-rooms-section">
          <div className="active-rooms-header">
            <h2>📡 Canlı Aktif Lobilere Katıl 🚀</h2>
            <p>Şu an diğer oyuncular tarafından kurulmuş ve başlama bekleyen canlı oyun odaları. Hemen katıl ve birlikte yarış!</p>
          </div>

          {activeRooms.length > 0 ? (
            <div className="active-rooms-list">
              {activeRooms.map((room) => (
                <div className="active-room-card" key={room.roomCode}>
                  <div className="active-room-info">
                    <div className="active-room-badge-row">
                      <span className="active-room-code-badge">Oda: {room.roomCode}</span>
                      <span className="active-room-players-badge">👥 {room.playerCount} Oyuncu</span>
                    </div>
                    <h4>{room.title}</h4>
                    <p className="active-room-host">Kurucu: <strong>{room.hostName}</strong></p>
                    <p className="active-room-specs">⏱️ Süre: {room.timerSeconds}sn • 📝 {room.questionCount} Soru</p>
                  </div>
                  <button
                    type="button"
                    className="active-room-join-button"
                    onClick={() => handleOpenJoinModal(room)}
                  >
                    Hemen Katıl ve Yarış ⚡
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-active-rooms">
              <p style={{ margin: 0, fontSize: "16px" }}>
                📡 Şu anda beklemede olan aktif bir canlı oda bulunmuyor. 
              </p>
              <p style={{ fontSize: "13.5px", color: "var(--text-muted)", fontWeight: "normal", margin: "8px 0 0 0" }}>
                Yukarıdaki paneli kullanarak hemen yeni bir oda kurabilir ve arkadaşlarınla oda kodunu paylaşabilirsin!
              </p>
            </div>
          )}
        </div>

        {/* Global Liderlik Kürsüsü - Top 3 */}
        <div className="global-leaderboard-section">
          <div className="global-leaderboard-header">
            <h2>🏆 Haftalık Liderlik Kürsüsü (En İyi 3) 👑</h2>
            <p>QuizUpp dünyasının en yüksek puanlı efsanevi yarışmacıları. Kürsüde yerini al!</p>
          </div>

          {globalLeaderboard.length > 0 ? (
            <div className="podium-container">
              {/* 2. Sıra (Gümüş) */}
              {globalLeaderboard[1] && (
                <div className="podium-column silver-column">
                  <div className="podium-medal">🥈</div>
                  <div className="podium-name">{globalLeaderboard[1].username}</div>
                  <div className="podium-score">{globalLeaderboard[1].score} KP</div>
                  <div className="podium-step silver-step">2</div>
                </div>
              )}

              {/* 1. Sıra (Altın) */}
              {globalLeaderboard[0] && (
                <div className="podium-column gold-column">
                  <div className="podium-medal">👑🥇</div>
                  <div className="podium-name">{globalLeaderboard[0].username}</div>
                  <div className="podium-score">{globalLeaderboard[0].score} KP</div>
                  <div className="podium-step gold-step">1</div>
                </div>
              )}

              {/* 3. Sıra (Bronz) */}
              {globalLeaderboard[2] && (
                <div className="podium-column bronze-column">
                  <div className="podium-medal">🥉</div>
                  <div className="podium-name">{globalLeaderboard[2].username}</div>
                  <div className="podium-score">{globalLeaderboard[2].score} KP</div>
                  <div className="podium-step bronze-step">3</div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-active-rooms">
              <p style={{ margin: 0, fontSize: "16px" }}>
                🏆 Henüz kaydedilmiş yüksek skor bulunmuyor.
              </p>
              <p style={{ fontSize: "13.5px", color: "var(--text-muted)", fontWeight: "normal", margin: "8px 0 0 0" }}>
                Hemen bir yarışma başlatarak kürsüdeki ilk isim sen ol!
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Guest Name Entry Modal */}
      {showModal && selectedQuiz && (
        <div className="guest-modal-overlay">
          <div className="guest-modal-content">
            <div className="guest-modal-header">
              <h3>Hızlı Lobi Kurulumu 🚀</h3>
              <button className="guest-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleStartGuestRoom}>
              <div className="guest-modal-body">
                <p className="guest-modal-subtitle">
                  Seçilen Kategori: <strong>{selectedQuiz.title}</strong>
                </p>

                {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

                <label className="guest-modal-label">Lobi Kurucu Adı (Host)</label>
                <input
                  type="text"
                  className="guest-modal-input"
                  placeholder="İsmini yaz"
                  value={guestUsername}
                  onChange={(e) => setGuestUsername(e.target.value)}
                  disabled={loadingGuestRoom}
                  maxLength={15}
                  required
                />
                <p className="guest-modal-help">
                  Bu isim, lobiyi yönetirken ve oda kodunu paylaşırken diğer oyunculara lobi sahibi olarak görünecektir.
                </p>
              </div>

              <div className="guest-modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                  disabled={loadingGuestRoom}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={loadingGuestRoom}
                >
                  {loadingGuestRoom ? "Lobi Kuruluyor..." : "Odayı Kur ve Başlat ⚡"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Room Guest Join Modal */}
      {showJoinModal && selectedActiveRoom && (
        <div className="guest-modal-overlay">
          <div className="guest-modal-content">
            <div className="guest-modal-header">
              <h3>Canlı Oyuna Katıl 🎮</h3>
              <button className="guest-modal-close" onClick={() => setShowJoinModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleJoinActiveRoom}>
              <div className="guest-modal-body">
                <p className="guest-modal-subtitle">
                  Katılınan Yarışma: <strong>{selectedActiveRoom.title}</strong> (Oda: {selectedActiveRoom.roomCode})
                </p>

                {joinError && <div className="alert alert-error">{joinError}</div>}

                <label className="guest-modal-label">Oyundaki Adın (Takma Ad)</label>
                <input
                  type="text"
                  className="guest-modal-input"
                  placeholder="İsmini yaz"
                  value={joinUsername}
                  onChange={(e) => setJoinUsername(e.target.value)}
                  disabled={joiningRoom}
                  maxLength={15}
                  required
                />
                <p className="guest-modal-help">
                  Bu isim, liderlik tablosunda ve yarışma ekranında diğer oyunculara görünecektir.
                </p>
              </div>

              <div className="guest-modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowJoinModal(false)}
                  disabled={joiningRoom}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={joiningRoom}
                >
                  {joiningRoom ? "Odaya Giriliyor..." : "Oyuna Giriş Yap ⚡"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;