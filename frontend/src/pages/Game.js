import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../config";


const getPlayerAvatar = (username) => {
  const avatars = ["🦊", "🦁", "🐯", "🐼", "🐨", "🤖", "👻", "👽", "🦄", "🐙", "🦖", "🐸", "🐱", "🐶"];
  if (!username) return "👤";
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatars.length;
  return avatars[index];
};

function Game() {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve state or fallback to sessionStorage
  const roomCode = location.state?.roomCode || sessionStorage.getItem("quizupp_roomCode");
  const username = location.state?.username || sessionStorage.getItem("quizupp_username");
  const isHost = location.state?.isHost ?? (sessionStorage.getItem("quizupp_isHost") === "true");
  const quizTitle = location.state?.quizTitle || sessionStorage.getItem("quizupp_quizTitle") || "";

  const socket = useMemo(() => {
    return io(BACKEND_URL, {
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
  const [isReadyQuiz, setIsReadyQuiz] = useState(false);

  // Academic A+ Features State
  const [emotes, setEmotes] = useState([]);
  const [spentJokers, setSpentJokers] = useState({
    joker5050: false,
    jokerDoubleChance: false,
  });
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [triedOptions, setTriedOptions] = useState([]);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem("quizupp_muted") === "true");

  const playSynthSound = (type) => {
    if (localStorage.getItem("quizupp_muted") === "true") return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === "swoosh") {
        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = 8;
        filter.frequency.setValueAtTime(100, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.35);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
      } else if (type === "correct") {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.15);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime);

        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.6);
        osc2.stop(ctx.currentTime + 0.6);
      } else if (type === "wrong") {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(130.81, ctx.currentTime);
        osc1.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.4);

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(138.59, ctx.currentTime);
        osc2.frequency.linearRampToValueAtTime(95, ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.55, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.45);
        osc2.stop(ctx.currentTime + 0.45);
      } else if (type === "rocket") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.5);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.55);
      } else if (type === "tick") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(1800, ctx.currentTime);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } else if (type === "champion") {
        const playTone = (freq, start, duration) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
          g.gain.setValueAtTime(0, ctx.currentTime + start);
          g.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + duration);
        };
        
        playTone(261.63, 0.0, 0.4); // C4
        playTone(329.63, 0.15, 0.4); // E4
        playTone(392.00, 0.3, 0.4); // G4
        playTone(523.25, 0.45, 0.8); // C5
        playTone(659.25, 0.45, 0.8); // E5
        playTone(783.99, 0.45, 0.8); // G5
      }
    } catch (err) {
      console.error("Audio synthesis error:", err);
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem("quizupp_muted", String(nextMuted));
  };

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

          // Persist to sessionStorage on successful join
          sessionStorage.setItem("quizupp_roomCode", roomCode);
          sessionStorage.setItem("quizupp_username", username);
          sessionStorage.setItem("quizupp_isHost", String(isHost));

          setRoomTitle(response.room.title);
          setGameStarted(Boolean(response.room.isStarted));
          setIsReadyQuiz(Boolean(response.room.isReadyQuiz));
        }
      );
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });


    socket.on("reconnectionState", (state) => {
      if (state.answered) {
        setAnswerResult({
          isCorrect: true, // bypass option selection with correct status
          score: state.score,
          pointsGained: 0,
          reconnected: true,
        });
      }
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
      setSpentJokers({ joker5050: false, jokerDoubleChance: false });
      setHiddenOptions([]);
      setTriedOptions([]);
    });

    socket.on("nextQuestion", (question) => {
      setCurrentQuestion(question);
      setSelectedOptionIndex(null);
      setAnswerResult(null);
      setQuestionEnded(false);
      setQuestionEndPayload(null);
      setErrorMessage("");
      setCopyMessage("");
      setHiddenOptions([]);
      setTriedOptions([]);
      playSynthSound("swoosh");
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
      playSynthSound("champion");
    });

    socket.on("receiveEmote", (data) => {
      const id = Date.now() + Math.random();
      setEmotes((prev) => [
        ...prev,
        {
          id,
          username: data.username,
          emote: data.emote,
          left: Math.floor(Math.random() * 80) + 10,
        },
      ]);
      setTimeout(() => {
        setEmotes((prev) => prev.filter((e) => e.id !== id));
      }, 3000);
    });

    socket.on("gameError", (error) => {
      setErrorMessage(error?.message || "Oyun sırasında hata oluştu.");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("reconnectionState");
      socket.off("roomUpdated");
      socket.off("gameStarted");
      socket.off("nextQuestion");
      socket.off("questionEnded");
      socket.off("gameFinished");
      socket.off("receiveEmote");
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
      
      setRemainingSeconds((prev) => {
        if (prev !== nextRemainingSeconds) {
          if (nextRemainingSeconds > 0 && nextRemainingSeconds <= 5) {
            playSynthSound("tick");
          }
          return nextRemainingSeconds;
        }
        return prev;
      });
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
    if ((isHost && !isReadyQuiz) || answerResult || questionEnded || triedOptions.includes(optionIndex)) {
      return;
    }

    setSelectedOptionIndex(optionIndex);
    setErrorMessage("");

    socket.emit(
      "submitAnswer",
      {
        roomId: roomCode,
        selectedOptionIndex: optionIndex,
      },
      (response) => {
        if (!response?.ok) {
          setErrorMessage(response?.message || "Cevap gönderilemedi.");
          setSelectedOptionIndex(null);
          return;
        }

        if (response.doubleChanceTriggered) {
          playSynthSound("wrong");
          setErrorMessage(response.message);
          setTriedOptions((prev) => [...prev, optionIndex]);
          setSelectedOptionIndex(null);
          return;
        }

        setAnswerResult({
          isCorrect: response.isCorrect,
          correctOptionIndex: response.correctOptionIndex,
          score: response.score,
          pointsGained: response.pointsGained,
          remainingSeconds: response.remainingSeconds,
          speedBonus: response.speedBonus,
        });

        if (response.isCorrect) {
          if (response.speedBonus > 0) {
            playSynthSound("rocket");
            setTimeout(() => playSynthSound("correct"), 200);
          } else {
            playSynthSound("correct");
          }
        } else {
          playSynthSound("wrong");
        }
      }
    );
  };

  const handleUseJoker5050 = () => {
    if ((isHost && !isReadyQuiz) || spentJokers.joker5050 || questionEnded || answerResult) return;

    socket.emit("useJoker5050", { roomId: roomCode }, (response) => {
      if (response && response.ok) {
        setSpentJokers((prev) => ({ ...prev, joker5050: true }));
        setHiddenOptions(response.toHide || []);
      } else {
        setErrorMessage("Yarı Yarıya jokeri şu an kullanılamaz.");
      }
    });
  };

  const handleUseJokerDoubleChance = () => {
    if ((isHost && !isReadyQuiz) || spentJokers.jokerDoubleChance || questionEnded || answerResult) return;

    socket.emit("useJokerDoubleChance", { roomId: roomCode }, (response) => {
      if (response && response.ok) {
        setSpentJokers((prev) => ({ ...prev, jokerDoubleChance: true }));
        setErrorMessage("Çift Şans jokerin aktifleşti! Bu soru için yanlış yapsan bile bir hakkın daha olacak!");
      } else {
        setErrorMessage("Çift Şans jokeri şu an kullanılamaz.");
      }
    });
  };

  const handleSendEmote = (emote) => {
    socket.emit("sendEmote", { roomId: roomCode, emote });
  };

  const handleExitGame = () => {
    sessionStorage.removeItem("quizupp_roomCode");
    sessionStorage.removeItem("quizupp_username");
    sessionStorage.removeItem("quizupp_isHost");
    sessionStorage.removeItem("quizupp_quizTitle");
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

    if (triedOptions.includes(optionIndex)) {
      return "quiz-option-button wrong-option";
    }

    if (!questionEnded) {
      return selectedOptionIndex === optionIndex
        ? `quiz-option-button selected-option`
        : `quiz-option-button`;
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

    return `quiz-option-button disabled-option`;
  };

  const getOptionStyle = (optionIndex) => {
    if (hiddenOptions.includes(optionIndex)) {
      return { opacity: 0, pointerEvents: "none", visibility: "hidden" };
    }
    return {};
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


  const renderAnswerDistribution = () => {
    if (!questionEndPayload || !questionEndPayload.answerDistribution) return null;
    const distribution = questionEndPayload.answerDistribution;
    const totalVotes = distribution.reduce((sum, count) => sum + count, 0);

    const labels = ["A", "B", "C", "D"];

    return (
      <div className="answer-distribution-chart">
        <h4 className="chart-title">📊 Oy Dağılım Grafiği</h4>
        {distribution.map((count, index) => {
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return (
            <div key={index} className="chart-row">
              <span className={`chart-option-badge badge-${index}`}>{labels[index]}</span>
              <div className="chart-bar-wrapper">
                <svg width="100%" height="16" className="chart-svg">
                  <rect width="100%" height="16" rx="8" className="chart-bar-bg" />
                  <rect 
                    width={`${percentage}%`} 
                    height="16" 
                    rx="8" 
                    className={`chart-bar-fill fill-${index}`} 
                    style={{
                      transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                  />
                </svg>
              </div>
              <span className="chart-percentage-text">{count} Oy (%{percentage})</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (!roomCode || !username) {
    return null;
  }

  const answeredCount = players.filter((player) => player.answered).length;
  const playerCount = players.length;

  return (
    <div className="page">
      {/* FLOATING EMOTES CANVAS */}
      <div className="emotes-floating-canvas">
        {emotes.map((e) => (
          <div
            key={e.id}
            className="flying-emote"
            style={{ left: `${e.left}%` }}
          >
            <span className="emote-sender">{e.username}</span>
            <span className="emote-symbol">{e.emote}</span>
          </div>
        ))}
      </div>

      <div className="game-card wide-card">
        {/* UTILITY BAR FOR SOUND */}
        <div className="game-utility-bar" style={{ justifyContent: "flex-end" }}>
          <div className="sound-toggle-container">
            <button className="sound-toggle-btn" onClick={handleToggleMute}>
              {isMuted ? "🔇 Ses Kapalı" : "🔊 Ses Açık"}
            </button>
          </div>
        </div>

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

        {isHost && !isReadyQuiz && (
          <p className="host-note">
            Host modundasın. Soruları oyuncular çözer, sen oyunu yönetirsin.
          </p>
        )}
        {isHost && isReadyQuiz && (
          <p className="host-note" style={{ borderColor: "var(--neon-emerald)", boxShadow: "0 0 10px rgba(16, 185, 129, 0.2)" }}>
            Host modundasın (Hazır Konu). Oyunu sen yönetiyorsun ama aynı zamanda bir oyuncu olarak sen de soru çözebilirsin! 🎮
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
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="player-avatar-mini">{getPlayerAvatar(player.username)}</span>
                        {player.username}
                      </span>
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
          <div className="game-grid-layout">
            {/* SOL KOLON: Soru, Seçenekler, Jokerler ve Oy Dağılımı */}
            <div className="game-main-column">
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
                    <div key={`${option}-${optionIndex}`} className="option-container-wrapper" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <button
                        type="button"
                        className={getOptionClassName(optionIndex)}
                        onClick={() => handleSelectOption(optionIndex)}
                        style={getOptionStyle(optionIndex)}
                        disabled={(isHost && !isReadyQuiz) || Boolean(answerResult) || questionEnded || triedOptions.includes(optionIndex)}
                      >
                        {option}
                      </button>
                      {/* Soru bittikten sonra bu şıkkı seçenlerin profil resimleri */}
                      {questionEnded && questionEndPayload?.playerAnswers && (
                        <div className="option-voters-list" style={{ display: "flex", flexWrap: "wrap", gap: "6px", paddingLeft: "10px", marginTop: "2px" }}>
                          {questionEndPayload.playerAnswers
                            .filter((voter) => voter.selectedOption === optionIndex)
                            .map((voter) => (
                              <span key={voter.username} className="voter-badge" title={voter.username} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.08)", padding: "3px 8px", borderRadius: "12px", fontSize: "12px", color: "var(--white)", border: "1px solid rgba(255,255,255,0.12)" }}>
                                <span className="voter-avatar" style={{ fontSize: "14px" }}>{getPlayerAvatar(voter.username)}</span>
                                <span className="voter-name" style={{ fontWeight: "600" }}>{voter.username}</span>
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* JOKER SISTEMI */}
                {(!isHost || isReadyQuiz) && (
                  <div className="jokers-section-container">
                    <h4 className="jokers-title">🃏 Yarışma Jokerleri</h4>
                    <div className="jokers-row">
                      <button
                        type="button"
                        className="joker-card-button"
                        disabled={spentJokers.joker5050 || questionEnded || Boolean(answerResult)}
                        onClick={handleUseJoker5050}
                      >
                        <span className="joker-icon">🌓</span>
                        <span className="joker-name">%50</span>
                        <span className="joker-status">{spentJokers.joker5050 ? "Kullanıldı" : "Hazır"}</span>
                      </button>
                      <button
                        type="button"
                        className="joker-card-button"
                        disabled={spentJokers.jokerDoubleChance || questionEnded || Boolean(answerResult)}
                        onClick={handleUseJokerDoubleChance}
                      >
                        <span className="joker-icon">🛡️</span>
                        <span className="joker-name">Çift Şans</span>
                        <span className="joker-status">{spentJokers.jokerDoubleChance ? "Kullanıldı" : "Hazır"}</span>
                      </button>
                    </div>
                  </div>
                )}


                {questionEnded && (
                  <>
                    {(!isHost || isReadyQuiz) && answerResult && (
                      <div
                        className={
                          answerResult.isCorrect
                            ? "alert alert-success"
                            : "alert alert-error"
                        }
                      >
                        {answerResult.isCorrect
                          ? `Tebrikler, Doğru cevap! ${
                              answerResult.speedBonus > 0
                                ? `🚀 En hızlı cevap bonusu (+${answerResult.speedBonus} KP) kazandınız! `
                                : ""
                            }+${answerResult.pointsGained} puan aldınız. Toplam puanınız: ${answerResult.score}`
                          : "Yanlış cevap verdiniz! Doğru seçeneği yeşil renkte görebilirsiniz."}
                      </div>
                    )}

                    {(!isHost || isReadyQuiz) && !answerResult && (
                      <div className="alert alert-error">
                        Süre bitti, herhangi bir şık seçmediniz!
                      </div>
                    )}

                    {renderAnswerDistribution()}

                    <div className="next-question-loader">
                      <div className="next-question-loader-text">
                        5 Saniye İçinde Yeni Soruya Geçiliyor...
                      </div>
                      <div className="next-question-loader-bar-bg">
                        <div className="next-question-loader-bar-fill" />
                      </div>
                    </div>
                  </>
                )}

                {isHost && (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={handleFinishGame}
                    style={{ marginTop: "16px" }}
                  >
                    Oyunu Erken Bitir
                  </button>
                )}
              </div>
            </div>

            {/* SAĞ KOLON: Skorlar ve Emojiler */}
            <div className="game-sidebar-column">
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
                        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className="player-avatar-mini">{getPlayerAvatar(player.username)}</span>
                          {player.username}
                          {player.answered ? " ✅" : ""}
                        </span>
                        <strong>{player.score || 0} puan</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* EMOJI REAKSIYON FIŞKIRTICI */}
              <div className="emotes-bar-container">
                <span className="emotes-label">Reaksiyon Gönder:</span>
                <div className="emotes-buttons-row">
                  {["👍", "🔥", "🎉", "😮", "👑", "💡"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="emote-btn"
                      onClick={() => handleSendEmote(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {gameFinished && (
          <div className="players-box finished-box">
            <h3>Oyun Bitti 🎉</h3>

            {leaderboard.length > 0 && (
              <div className="champion-card">
                <div className="crown-icon">👑</div>
                <h4>Yarışma Şampiyonu</h4>
                <div className="champion-name" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  <span style={{ fontSize: "28px" }}>{getPlayerAvatar(leaderboard[0].username)}</span>
                  {leaderboard[0].username}
                </div>
                <div className="champion-score">{leaderboard[0].score} KP</div>
                <p className="champion-congrats">Tebrikler! Muhteşem bir yarış çıkardın! 🎉</p>
              </div>
            )}

            <div className="spacer" />

            {leaderboard.length === 0 ? (
              <p className="muted-text">Skor bulunamadı.</p>
            ) : (
              <>
                <h4 className="leaderboard-title">Yarışma Sıralaması (En İyi 3)</h4>
                <ol className="leaderboard-list">
                  {leaderboard.slice(0, 3).map((player, index) => (
                    <li key={`${player.username}-leaderboard-${index}`}>
                      <span className="player-rank-info" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="rank-badge">{index + 1}</span>
                        <span className="player-avatar-mini">{getPlayerAvatar(player.username)}</span>
                        {player.username}
                      </span>
                      <strong>{player.score} puan</strong>
                    </li>
                  ))}
                </ol>
              </>
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

        <Link className="secondary-button" to="/" onClick={handleExitGame}>
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}

export default Game;