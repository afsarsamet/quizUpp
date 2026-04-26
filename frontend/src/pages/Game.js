import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];

function Game() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    roomCode,
    username,
    isHost = false,
    quizTitle = "",
  } = location.state || {};

  const socket = useMemo(() => {
    return io("http://localhost:5000", {
      autoConnect: false,
    });
  }, []);

  const [connected, setConnected] = useState(false);
  const [roomTitle, setRoomTitle] = useState(quizTitle);
  const [players, setPlayers] = useState([]);

  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [questionEnded, setQuestionEnded] = useState(false);
  const [questionEndPayload, setQuestionEndPayload] = useState(null);

  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    if (!roomCode || !username) {
      navigate("/");
      return;
    }

    socket.connect();

    socket.on("connect", () => {
      setConnected(true);

      socket.emit(
        "joinRoom",
        {
          roomId: roomCode,
          username,
          isHost,
        },
        (response) => {
          if (!response?.ok) {
            setErrorMessage(response?.message || "Odaya katılınamadı.");
            return;
          }

          setRoomTitle(response.room.title);
          setGameStarted(Boolean(response.room.isStarted));
        }
      );
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("roomUpdated", (room) => {
      setRoomTitle(room.title);
      setPlayers(room.players || []);
    });

    socket.on("gameStarted", () => {
      setGameStarted(true);
      setGameFinished(false);
      setLeaderboard([]);
      setErrorMessage("");
      setCopyMessage("");
    });

    socket.on("nextQuestion", (question) => {
      setCurrentQuestion(question);
      setSelectedOptionIndex(null);
      setAnswerResult(null);
      setQuestionEnded(false);
      setQuestionEndPayload(null);
      setErrorMessage("");
      setCopyMessage("");
    });

    socket.on("questionEnded", (payload) => {
      setQuestionEnded(true);
      setQuestionEndPayload(payload);
      setLeaderboard(payload?.leaderboard || []);
      setErrorMessage("");
    });

    socket.on("gameFinished", (payload) => {
      setGameStarted(false);
      setGameFinished(true);
      setCurrentQuestion(null);
      setSelectedOptionIndex(null);
      setAnswerResult(null);
      setQuestionEnded(false);
      setQuestionEndPayload(null);
      setLeaderboard(payload?.leaderboard || []);
      setErrorMessage("");
      setCopyMessage("");
      setRemainingSeconds(null);
    });

    socket.on("gameError", (error) => {
      setErrorMessage(error?.message || "Oyun sırasında hata oluştu.");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("roomUpdated");
      socket.off("gameStarted");
      socket.off("nextQuestion");
      socket.off("questionEnded");
      socket.off("gameFinished");
      socket.off("gameError");
      socket.disconnect();
    };
  }, [navigate, roomCode, socket, username, isHost]);

  useEffect(() => {
    if (!currentQuestion?.endsAt || questionEnded || gameFinished) {
      return;
    }

    const updateRemainingSeconds = () => {
      const remainingMs = currentQuestion.endsAt - Date.now();
      const nextRemainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
      setRemainingSeconds(nextRemainingSeconds);
    };

    updateRemainingSeconds();

    const intervalId = setInterval(updateRemainingSeconds, 250);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentQuestion, questionEnded, gameFinished]);

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopyMessage("Oda kodu kopyalandı.");

      setTimeout(() => {
        setCopyMessage("");
      }, 2000);
    } catch (error) {
      console.error("Copy room code error:", error);
      setErrorMessage("Oda kodu kopyalanamadı.");
    }
  };

  const handleStartGame = () => {
    setErrorMessage("");
    setCopyMessage("");

    socket.emit("startGame", roomCode, (response) => {
      if (!response?.ok) {
        setErrorMessage(response?.message || "Oyun başlatılamadı.");
      }
    });
  };

  const handleSelectOption = (optionIndex) => {
    if (isHost || answerResult || questionEnded) {
      return;
    }

    setSelectedOptionIndex(optionIndex);
    setErrorMessage("");
  };

  const handleSubmitAnswer = () => {
    if (isHost) {
      setErrorMessage("Host cevap veremez. Host sadece oyunu yönetir.");
      return;
    }

    if (questionEnded) {
      setErrorMessage("Süre bitti. Bu soru artık cevaplanamaz.");
      return;
    }

    if (selectedOptionIndex === null) {
      setErrorMessage("Önce bir seçenek seçmelisin.");
      return;
    }

    setErrorMessage("");

    socket.emit(
      "submitAnswer",
      {
        roomId: roomCode,
        selectedOptionIndex,
      },
      (response) => {
        if (!response?.ok) {
          setErrorMessage(response?.message || "Cevap gönderilemedi.");
          return;
        }

        setAnswerResult({
  isCorrect: response.isCorrect,
  correctOptionIndex: response.correctOptionIndex,
  score: response.score,
  pointsGained: response.pointsGained,
  remainingSeconds: response.remainingSeconds,
});
      }
    );
  };

  const handleFinishGame = () => {
    setErrorMessage("");

    socket.emit("finishGame", roomCode, (response) => {
      if (!response?.ok) {
        setErrorMessage(response?.message || "Oyun bitirilemedi.");
      }
    });
  };

  const getCorrectOptionIndex = () => {
    if (questionEndPayload) {
      return questionEndPayload.correctOptionIndex;
    }

    if (answerResult) {
      return answerResult.correctOptionIndex;
    }

    return null;
  };

  const getOptionClassName = (optionIndex) => {
    const correctOptionIndex = getCorrectOptionIndex();
    const colorClass = colors[optionIndex] || "bg-blue-500";

    if (!answerResult && !questionEnded) {
      return selectedOptionIndex === optionIndex
        ? `quiz-option-button ${colorClass} selected-option`
        : `quiz-option-button ${colorClass}`;
    }

    if (correctOptionIndex === optionIndex) {
      return "quiz-option-button correct-option";
    }

    if (
      selectedOptionIndex === optionIndex &&
      correctOptionIndex !== optionIndex
    ) {
      return "quiz-option-button wrong-option";
    }

    return `quiz-option-button ${colorClass} disabled-option`;
  };

  const getTimerClassName = () => {
    if (remainingSeconds === null) {
      return "timer-box";
    }

    if (remainingSeconds <= 5) {
      return "timer-box timer-danger";
    }

    if (remainingSeconds <= 10) {
      return "timer-box timer-warning";
    }

    return "timer-box";
  };

  if (!roomCode || !username) {
    return null;
  }

  const answeredCount = players.filter((player) => player.answered).length;
  const playerCount = players.length;

  return (
    <div className="page">
      <div className="game-card wide-card">
        <h1>QuizUpp</h1>

        <div className="game-topbar">
          <div>
            <p className="muted-text">Oda Kodu</p>
            <span className="room-code">{roomCode}</span>
          </div>

          <div
            className={
              connected ? "connection-status" : "connection-status offline"
            }
          >
            {connected ? "Bağlandı" : "Bağlanıyor..."}
          </div>
        </div>

        <div className="spacer" />

        <h2>{roomTitle || "Quiz Odası"}</h2>

        {isHost && (
          <p className="host-note">
            Host modundasın. Soruları oyuncular çözer, sen oyunu yönetirsin.
          </p>
        )}

        {errorMessage && <div className="alert alert-error">{errorMessage}</div>}
        {copyMessage && <div className="alert alert-success">{copyMessage}</div>}

        {!gameStarted && !gameFinished && (
          <>
            <div className="waiting-room-card">
              <p className="waiting-room-label">Arkadaşların bu kodla katılsın</p>

              <div className="big-room-code">{roomCode}</div>

              <button
                type="button"
                className="copy-code-button"
                onClick={handleCopyRoomCode}
              >
                Oda Kodunu Kopyala
              </button>

              <p className="waiting-room-subtitle">
                Oyuna katılmak için ana sayfadan “Oyuna Katıl” butonuna basıp bu
                kodu girmeleri yeterli.
              </p>
            </div>

            <div className="spacer" />

            <div className="players-box">
              <div className="players-header">
                <h3>Oyuncular</h3>
                <span>{playerCount} oyuncu</span>
              </div>

              {players.length === 0 ? (
                <p className="muted-text">
                  Henüz oyuncu yok. Oda kodunu paylaş ve oyuncuların gelmesini
                  bekle.
                </p>
              ) : (
                <ul className="player-list">
                  {players.map((player, index) => (
                    <li key={`${player.username}-${index}`}>
                      <span>{player.username}</span>
                      <strong>{player.score || 0} puan</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="spacer" />

            {isHost ? (
              <>
                {players.length === 0 && (
                  <p className="waiting-text">
                    Oyunu başlatmak için en az 1 oyuncu gerekli.
                  </p>
                )}

                <button
                  onClick={handleStartGame}
                  disabled={players.length === 0}
                >
                  Oyunu Başlat
                </button>
              </>
            ) : (
              <p className="waiting-text">
                Host oyunu başlatınca soru burada görünecek.
              </p>
            )}
          </>
        )}

        {gameStarted && currentQuestion && (
          <>
            <div className="question-box">
              <div className="question-status-row">
                <p className="muted-text">
                  Soru {currentQuestion.questionNumber} /{" "}
                  {currentQuestion.totalQuestions}
                </p>

                <div className={getTimerClassName()}>
                  {questionEnded
                    ? "Süre bitti"
                    : `${remainingSeconds ?? currentQuestion.timerSeconds} sn`}
                </div>
              </div>

              <h3>{currentQuestion.questionText}</h3>

              <div className="option-list">
                {currentQuestion.options.map((option, optionIndex) => (
                  <button
                    type="button"
                    key={`${option}-${optionIndex}`}
                    className={getOptionClassName(optionIndex)}
                    onClick={() => handleSelectOption(optionIndex)}
                    disabled={isHost || Boolean(answerResult) || questionEnded}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {!isHost && !answerResult && !questionEnded && (
                <button
                  className="secondary-form-button"
                  type="button"
                  onClick={handleSubmitAnswer}
                >
                  Cevabı Gönder
                </button>
              )}

              {!isHost && answerResult && !questionEnded && (
                <div
                  className={
                    answerResult.isCorrect
                      ? "alert alert-success"
                      : "alert alert-error"
                  }
                >
                  {answerResult.isCorrect
  ? `Doğru cevap! +${answerResult.pointsGained} puan aldın. Toplam puanın: ${answerResult.score}`
  : "Yanlış cevap. Süre bitince doğru cevap gösterilecek."}
                </div>
              )}

              {questionEnded && (
                <div className="alert alert-success">
                  Doğru cevap:{" "}
                  {currentQuestion.options[questionEndPayload.correctOptionIndex]}
                </div>
              )}

              {isHost && questionEnded && (
                <p className="waiting-text">
                  Sonraki soruya otomatik geçiliyor...
                </p>
              )}

              {!isHost && questionEnded && (
                <p className="waiting-text">
                  Sonraki soru için bekleniyor...
                </p>
              )}

              {isHost && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={handleFinishGame}
                >
                  Oyunu Erken Bitir
                </button>
              )}
            </div>

            <div className="spacer" />

            <div className="players-box">
              <div className="players-header">
                <h3>Skorlar</h3>
                <span>
                  {answeredCount}/{playerCount} cevapladı
                </span>
              </div>

              {players.length === 0 ? (
                <p className="muted-text">Oyuncu yok.</p>
              ) : (
                <ul className="player-list">
                  {players.map((player, index) => (
                    <li key={`${player.username}-score-${index}`}>
                      <span>
                        {player.username}
                        {player.answered ? " ✅" : ""}
                      </span>
                      <strong>{player.score || 0} puan</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {gameFinished && (
          <div className="players-box">
            <h3>Oyun Bitti 🎉</h3>

            {leaderboard.length === 0 ? (
              <p className="muted-text">Skor bulunamadı.</p>
            ) : (
              <ol className="leaderboard-list">
                {leaderboard.map((player, index) => (
                  <li key={`${player.username}-leaderboard-${index}`}>
                    <span>
                      {index + 1}. {player.username}
                    </span>
                    <strong>{player.score} puan</strong>
                  </li>
                ))}
              </ol>
            )}

            <div className="spacer" />

            {isHost && (
              <button type="button" onClick={handleStartGame}>
                Aynı Quiz ile Tekrar Başlat
              </button>
            )}
          </div>
        )}

        <div className="spacer" />

        <Link className="secondary-button" to="/">
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}

export default Game;