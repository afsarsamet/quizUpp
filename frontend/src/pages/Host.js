import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Yönlendirme için
import { socket } from '../socket'; // Socket bağlantısı için

export default function Host() {
  const navigate = useNavigate();
  const [quizTitle, setQuizTitle] = useState('');
  
  // Soruları ve şıkları tuttuğumuz dizi
  const [questions, setQuestions] = useState([
    { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0 }
  ]);

  // Yeni soru ekleme
  const addQuestion = () => {
    setQuestions([
      ...questions,
      { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0 }
    ]);
  };

  // State güncelleyici
  const handleQuestionChange = (index, field, value, optionIndex = null) => {
    const updatedQuestions = [...questions];
    if (field === 'questionText') {
      updatedQuestions[index].questionText = value;
    } else if (field === 'option') {
      updatedQuestions[index].options[optionIndex] = value;
    } else if (field === 'correctOption') {
      updatedQuestions[index].correctOptionIndex = value;
    }
    setQuestions(updatedQuestions);
  };

  // ASIL OLAY BURASI: Kaydet ve Odayı Kur
  const handleSaveQuiz = () => {
    if (!quizTitle || questions[0].questionText === '') {
      return alert("Kanka önce başlığı ve en az bir soruyu doldur!");
    }

    const quizData = { title: quizTitle, questions };
    console.log("Backend'e gidecek veri:", quizData);

    // 1. Rastgele bir Oda Kodu oluştur (Şimdilik manuel, ilerde DB'den gelir)
    const generatedRoomCode = Math.floor(1000 + Math.random() * 9000).toString();

    // 2. Socket ile Backend'e "Ben Host olarak bu odayı açtım" diyoruz
    socket.emit("joinRoom", { roomId: generatedRoomCode, username: "HOST-ADMIN" });

    // 3. Seni Game.js sayfasına 'isHost: true' olarak uçuruyoruz
    // 'questions' verisini de yanımıza alıyoruz ki oyun başlayınca dağıtalım
    navigate("/game", { 
      state: { 
        roomCode: generatedRoomCode, 
        name: "Admin", 
        isHost: true,
        quizData: quizData // Soruları buraya paketledik
      } 
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Quiz Oluştur</h1>
      
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Quiz Başlığı (Örn: React Temelleri)" 
          value={quizTitle}
          onChange={(e) => setQuizTitle(e.target.value)}
          className="w-full p-4 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {questions.map((q, qIndex) => (
        <div key={qIndex} className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Soru {qIndex + 1}</h3>
          
          <input 
            type="text" 
            placeholder="Soru metnini girin..." 
            value={q.questionText}
            onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
            className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {q.options.map((opt, optIndex) => (
            <div key={optIndex} className="flex items-center mb-3">
              <input 
                type="radio" 
                name={`correctOption-${qIndex}`} 
                checked={q.correctOptionIndex === optIndex}
                onChange={() => handleQuestionChange(qIndex, 'correctOption', optIndex)}
                className="w-5 h-5 text-blue-600 cursor-pointer"
              />
              <input 
                type="text" 
                placeholder={`${optIndex + 1}. Şık`} 
                value={opt}
                onChange={(e) => handleQuestionChange(qIndex, 'option', e.target.value, optIndex)}
                className="ml-3 flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-between mt-8">
        <button 
          onClick={addQuestion} 
          className="px-6 py-2 border-2 border-blue-500 text-blue-500 font-bold rounded-lg hover:bg-blue-50 transition-colors"
        >
          + Yeni Soru Ekle
        </button>
        
        <button 
          onClick={handleSaveQuiz} 
          className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors shadow-md"
        >
          Quizi Kaydet ve Odayı Kur
        </button>
      </div>
    </div>
  );
}