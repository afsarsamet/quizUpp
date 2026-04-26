import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const emptyQuestion = {
  questionText: "",
  options: ["", "", "", ""],
  correctOptionIndex: 0,
};

function Host() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(20);
  const [questions, setQuestions] = useState([{ ...emptyQuestion }]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("quizupp_token");

    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

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

      const response = await fetch("http://localhost:5000/api/quizzes", {
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

        <form onSubmit={handleCreateQuiz}>
          <label>Quiz Başlığı</label>
          <input
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