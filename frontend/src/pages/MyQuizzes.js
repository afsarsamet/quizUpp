import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function MyQuizzes() {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingQuizId, setStartingQuizId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("quizupp_token");

    if (!token) {
      navigate("/login");
      return;
    }

    const fetchMyQuizzes = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch("http://localhost:5000/api/my-quizzes", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data.message || "Quizler alınamadı.");
          return;
        }

        setQuizzes(data.quizzes || []);
      } catch (error) {
        console.error("Fetch my quizzes error:", error);
        setErrorMessage("Backend sunucusuna ulaşılamıyor.");
      } finally {
        setLoading(false);
      }
    };

    fetchMyQuizzes();
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
        `http://localhost:5000/api/quizzes/${quizId}/start-room`,
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
          <p className="waiting-text">Quizlerin yükleniyor...</p>
        ) : quizzes.length === 0 ? (
          <div className="empty-state">
            <h3>Henüz kayıtlı quizin yok.</h3>
            <p>
              İlk quizini oluşturduğunda burada görünecek. Sonra tek tıkla yeni
              oda açabileceksin.
            </p>

            <Link className="primary-button" to="/host">
              İlk Quizini Oluştur
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
                  disabled={startingQuizId === quiz.id}
                >
                  {startingQuizId === quiz.id ? "Oda açılıyor..." : "Odayı Aç"}
                </button>
              </div>
            ))}
          </div>
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