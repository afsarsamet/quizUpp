import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../config";

function MyQuizzes() {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [readyQuizzes, setReadyQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingQuizId, setStartingQuizId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("quizupp_token");

    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        // Fetch My Quizzes
        const response = await fetch(`${BACKEND_URL}/api/my-quizzes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (response.ok) {
          setQuizzes(data.quizzes || []);
        } else {
          setErrorMessage(data.message || "Quizler alınamadı.");
        }

        // Fetch Ready Quizzes
        const readyResponse = await fetch(`${BACKEND_URL}/api/ready-quizzes`);
        const readyData = await readyResponse.json();
        if (readyResponse.ok) {
          setReadyQuizzes(readyData.quizzes || []);
        }

      } catch (error) {
        console.error("Fetch data error:", error);
        setErrorMessage("Backend sunucusuna ulaşılamıyor.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleStartRoom = async (quizId) => {
    const token = localStorage.getItem("quizupp_token");
    const savedUser = localStorage.getItem("quizupp_user");

    if (!token) {
      navigate("/login");
      return;
    }

    let user = null;

    try {
      user = savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("User parse error:", error);
    }

    try {
      setStartingQuizId(quizId);
      setErrorMessage("");

      const response = await fetch(
        `${BACKEND_URL}/api/quizzes/${quizId}/start-room`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Oda oluşturulamadı.");
        return;
      }

      navigate("/game", {
        state: {
          roomCode: data.roomCode,
          username: user?.username || "Host",
          isHost: true,
          quizTitle: data.quiz.title,
        },
      });
    } catch (error) {
      console.error("Start saved quiz room error:", error);
      setErrorMessage("Backend sunucusuna ulaşılamıyor.");
    } finally {
      setStartingQuizId(null);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "";
    }

    const date = new Date(dateValue);

    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="page">
      <div className="form-card wide-card">
        <div className="page-header-row">
          <div>
            <h1>QuizUpp</h1>
            <h2>Quizlerim</h2>
          </div>

          <Link className="secondary-small-link" to="/">
            Ana Sayfa
          </Link>
        </div>

        {errorMessage && <div className="alert alert-error">{errorMessage}</div>}

        {loading ? (
          <p className="waiting-text">Yarışmalar yükleniyor...</p>
        ) : (
          <>
            {readyQuizzes.length > 0 && (
              <div className="ready-packs-section">
                <h3 className="section-title">QuizUpp Hazır Yarışmaları 🏆</h3>
                <p className="section-subtitle">Soru yazmakla uğraşmak istemiyorsan, hazır paketlerden birini seçerek hemen arkadaşlarınla oyna!</p>
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
                          onClick={() => handleStartRoom(pack.id)}
                          disabled={startingQuizId !== null}
                        >
                          {startingQuizId === pack.id ? "Başlatılıyor..." : "Hemen Odayı Aç 🚀"}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="spacer-large" />
              </div>
            )}

            <h3 className="section-title text-left">Benim Hazırladığım Özel Quizler</h3>

            {quizzes.length === 0 ? (
              <div className="empty-state">
                <h3>Henüz kayıtlı özel quizin yok.</h3>
                <p>
                  İlk özel quizini oluşturduğunda burada görünecek. Sonra tek tıkla yeni
                  oda açabileceksin.
                </p>

                <Link className="primary-button" to="/host">
                  İlk Özel Quizini Oluştur
                </Link>
              </div>
            ) : (
              <div className="quiz-list">
                {quizzes.map((quiz) => (
                  <div className="quiz-list-card" key={quiz.id}>
                    <div>
                      <h3>{quiz.title}</h3>

                      <p>
                        {quiz.questionCount} soru • {quiz.timerSeconds} saniye
                      </p>

                      <span>{formatDate(quiz.createdAt)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartRoom(quiz.id)}
                      disabled={startingQuizId !== null}
                    >
                      {startingQuizId === quiz.id ? "Oda açılıyor..." : "Odayı Aç"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="spacer" />

        <Link className="secondary-button" to="/host">
          Yeni Quiz Oluştur
        </Link>
      </div>
    </div>
  );
}

export default MyQuizzes;