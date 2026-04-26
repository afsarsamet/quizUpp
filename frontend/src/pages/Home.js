import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("quizupp_user");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("User parse error:", error);
        localStorage.removeItem("quizupp_user");
        localStorage.removeItem("quizupp_token");
      }
    }
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
              Quiz oluşturmak ve kayıtlı quizlerini görmek için giriş yapman gerekir.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default Home;