import React, { useState } from 'react';

export default function Host() {
  // Quiz başlığını tuttuğumuz state
  const [quizTitle, setQuizTitle] = useState('');
  
  // Soruları ve şıkları tuttuğumuz dizi state'i
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

  // Kaydetme simülasyonu
  const handleSaveQuiz = () => {
    const quizData = { title: quizTitle, questions };
    console.log("Backend'e gidecek veri:", quizData);
    alert("Quiz kaydedildi! F12 konsoluna bakabilirsin.");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Quiz Oluştur</h1>
      
      {/* Ana Başlık Input'u */}
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Quiz Başlığı (Örn: React Temelleri)" 
          value={quizTitle}
          onChange={(e) => setQuizTitle(e.target.value)}
          className="w-full p-4 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Soruların Listelendiği Alan */}
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

          {/* Şıklar */}
          {q.options.map((opt, optIndex) => (
            <div key={optIndex} className="flex items-center mb-3">
              <input 
                type="radio" 
                name={`correctOption-${qIndex}`} 
                checked={q.correctOptionIndex === optIndex}
                onChange={() => handleQuestionChange(qIndex, 'correctOption', optIndex)}
                className="w-5 h-5 text-blue-600 cursor-pointer"
                title="Doğru cevabı seç"
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

      {/* Aksiyon Butonları */}
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
          Quizi Kaydet
        </button>
      </div>
    </div>
  );
}