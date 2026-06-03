import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../config";

const emptyQuestion = {
  questionText: "",
  options: ["", "", "", ""],
  correctOptionIndex: 0,
};

function Host() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(25);
  const [questions, setQuestions] = useState([{ ...emptyQuestion }]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [readyQuizzes, setReadyQuizzes] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateSuccessMsg, setTemplateSuccessMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("quizupp_token");

    if (!token) {
      navigate("/login");
      return;
    }

    const fetchTemplates = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/ready-quizzes`);
        const data = await response.json();
        if (response.ok) {
          setReadyQuizzes(data.quizzes || []);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    };

    fetchTemplates();
  }, [navigate]);

  const handleApplyTemplateById = (templateId) => {
    const selectedQuiz = readyQuizzes.find((q) => q.id === templateId);
    if (!selectedQuiz) return;

    setTitle(selectedQuiz.title);
    setTimerSeconds(selectedQuiz.timerSeconds);
    
    const formattedQuestions = selectedQuiz.questions.map((q) => ({
      questionText: q.questionText,
      options: [...q.options],
      correctOptionIndex: q.correctOptionIndex,
    }));
    
    setQuestions(formattedQuestions);
    setTemplateSuccessMsg(`"${selectedQuiz.title}" şablonu başarıyla uygulandı! ${formattedQuestions.length} soru yüklendi.`);
    setErrorMessage("");
    
    setTimeout(() => {
      const titleElement = document.getElementById("quiz-title-input");
      if (titleElement) {
        titleElement.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);

    setTimeout(() => {
      setTemplateSuccessMsg("");
    }, 5000);
  };

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
  };

  const handleTimerChange = (event) => {
    setTimerSeconds(event.target.value);
  };

  const handleQuestionTextChange = (questionIndex, value) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              questionText: value,
            }
          : question
      )
    );
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        const updatedOptions = [...question.options];
        updatedOptions[optionIndex] = value;

        return {
          ...question,
          options: updatedOptions,
        };
      })
    );
  };

  const handleCorrectOptionChange = (questionIndex, optionIndex) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              correctOptionIndex: optionIndex,
            }
          : question
      )
    );
  };

  const handleAddQuestion = () => {
    setQuestions((prevQuestions) => [
      ...prevQuestions,
      {
        questionText: "",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
      },
    ]);
  };

  const handleRemoveQuestion = (questionIndex) => {
    if (questions.length === 1) {
      setErrorMessage("En az 1 soru olmalı.");
      return;
    }

    setQuestions((prevQuestions) =>
      prevQuestions.filter((_, index) => index !== questionIndex)
    );
  };

  const validateForm = () => {
    if (!title.trim()) {
      return "Quiz başlığı zorunludur.";
    }

    const cleanTimerSeconds = Number(timerSeconds);

    if (Number.isNaN(cleanTimerSeconds)) {
      return "Soru süresi sayı olmalıdır.";
    }

    if (cleanTimerSeconds < 5) {
      return "Soru süresi en az 5 saniye olmalıdır.";
    }

    if (cleanTimerSeconds > 120) {
      return "Soru süresi en fazla 120 saniye olabilir.";
    }

    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];

      if (!question.questionText.trim()) {
        return `${i + 1}. sorunun metni boş olamaz.`;
      }

      for (let j = 0; j < question.options.length; j += 1) {
        if (!question.options[j].trim()) {
          return `${i + 1}. sorunun ${j + 1}. seçeneği boş olamaz.`;
        }
      }
    }

    return null;
  };

  const handleCreateQuiz = async (event) => {
    event.preventDefault();

    setErrorMessage("");

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

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
      setLoading(true);

      const response = await fetch(`${BACKEND_URL}/api/quizzes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          timerSeconds: Number(timerSeconds),
          questions: questions.map((question) => ({
            questionText: question.questionText.trim(),
            options: question.options.map((option) => option.trim()),
            correctOptionIndex: question.correctOptionIndex,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Quiz oluşturulamadı.");
        return;
      }

      navigate("/game", {
        state: {
          roomCode: data.roomCode,
          username: user?.username || "Host",
          isHost: true,
          quizTitle: title.trim(),
        },
      });
    } catch (error) {
      console.error("Create quiz error:", error);
      setErrorMessage("Backend sunucusuna ulaşılamıyor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="form-card wide-card">
        <h1>QuizUpp</h1>
        <h2>Quiz Oluştur</h2>

        {errorMessage && <div className="alert alert-error">{errorMessage}</div>}
        {templateSuccessMsg && <div className="alert alert-success">{templateSuccessMsg}</div>}

        {readyQuizzes.length > 0 && (
          <div className="template-loader-section">
            <label className="template-loader-label">✨ Hazır Konu Şablonu Seçin</label>
            <p className="template-loader-helper" style={{ marginBottom: "16px", fontSize: "13.5px" }}>
              Aşağıdaki hazır kategorilerden birini seçerek tüm soruları (20 adet) ve süre ayarlarını anında forma doldurabilir, ardından dilediğin gibi düzenleyebilirsin.
            </p>
            <div className="template-cards-grid">
              {readyQuizzes.map((quiz) => {
                let gradientClass = "gradient-purple";
                if (quiz.id === "ready-tarih-cografya") gradientClass = "gradient-orange";
                if (quiz.id === "ready-spor-dunyasi") gradientClass = "gradient-green";
                if (quiz.id === "ready-yesilcam-sinema") gradientClass = "gradient-coral";
                if (quiz.id === "ready-bilim-teknoloji") gradientClass = "gradient-blue";
                if (quiz.id === "ready-matematik-mantik") gradientClass = "gradient-indigo";
                if (quiz.id === "ready-gastronomi") gradientClass = "gradient-pink";
                if (quiz.id === "ready-turk-soz-deyis") gradientClass = "gradient-teal";
                if (quiz.id === "ready-bosluk-tamamlama") gradientClass = "gradient-cyan";
                if (quiz.id === "ready-dort-islem") gradientClass = "gradient-crimson";
                if (quiz.id === "ready-hayvanlar-dunyasi") gradientClass = "gradient-amber";
                if (quiz.id === "ready-islam-kulturu") gradientClass = "gradient-emerald";

                return (
                  <div 
                    key={quiz.id} 
                    className={`template-card-item ${gradientClass}`}
                    onClick={() => handleApplyTemplateById(quiz.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="template-card-header">
                      <span className="template-card-badge">{quiz.category}</span>
                      <span className="template-card-qcount">{quiz.questions.length} Soru</span>
                    </div>
                    <h4>{quiz.title}</h4>
                    <button type="button" className="template-card-apply-btn">
                      Bu Şablonu Uygula ⚡
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={handleCreateQuiz}>
          <label>Quiz Başlığı</label>
          <input
            id="quiz-title-input"
            type="text"
            placeholder="Örn: Genel Kültür Quiz"
            value={title}
            onChange={handleTitleChange}
            disabled={loading}
          />

          <label>Soru Süresi</label>
          <select
            value={timerSeconds}
            onChange={handleTimerChange}
            disabled={loading}
          >
            <option value={5}>5 saniye</option>
            <option value={10}>10 saniye</option>
            <option value={15}>15 saniye</option>
            <option value={20}>20 saniye</option>
            <option value={25}>25 saniye</option>
            <option value={30}>30 saniye</option>
            <option value={45}>45 saniye</option>
            <option value={60}>60 saniye</option>
            <option value={90}>90 saniye</option>
            <option value={120}>120 saniye</option>
          </select>

          {questions.map((question, questionIndex) => (
            <div className="question-box" key={questionIndex}>
              <div className="question-header">
                <h3>Soru {questionIndex + 1}</h3>

                {questions.length > 1 && (
                  <button
                    type="button"
                    className="small-danger-button"
                    onClick={() => handleRemoveQuestion(questionIndex)}
                    disabled={loading}
                  >
                    Sil
                  </button>
                )}
              </div>

              <label>Soru Metni</label>
              <input
                type="text"
                placeholder="Sorunu yaz"
                value={question.questionText}
                onChange={(event) =>
                  handleQuestionTextChange(questionIndex, event.target.value)
                }
                disabled={loading}
              />

              <div className="spacer" />

              <label>Seçenekler</label>

              {question.options.map((option, optionIndex) => (
                <div className="option-row" key={optionIndex}>
                  <input
                    type="radio"
                    name={`correct-option-${questionIndex}`}
                    checked={question.correctOptionIndex === optionIndex}
                    onChange={() =>
                      handleCorrectOptionChange(questionIndex, optionIndex)
                    }
                    disabled={loading}
                  />

                  <input
                    type="text"
                    placeholder={`${optionIndex + 1}. seçenek`}
                    value={option}
                    onChange={(event) =>
                      handleOptionChange(
                        questionIndex,
                        optionIndex,
                        event.target.value
                      )
                    }
                    disabled={loading}
                  />
                </div>
              ))}

              <p className="helper-text">
                İşaretli olan seçenek doğru cevap olarak kaydedilir.
              </p>
            </div>
          ))}

          <button
            type="button"
            className="secondary-form-button"
            onClick={handleAddQuestion}
            disabled={loading}
          >
            Yeni Soru Ekle
          </button>

          <button type="submit" disabled={loading}>
            {loading ? "Quiz oluşturuluyor..." : "Quiz Oluştur ve Odayı Aç"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Host;