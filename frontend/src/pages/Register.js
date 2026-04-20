import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    console.log("Kayıt verisi:", { username, email, password });
    alert("Kayıt başarılı! Şimdi giriş yapabilirsin.");
    navigate('/login');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-800">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-gray-100">
        <h2 className="text-3xl font-extrabold mb-6 text-center text-green-600">Yeni Hesap Aç</h2>
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Kullanıcı Adı" 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input 
            type="email" 
            placeholder="E-posta" 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Şifre" 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold mt-6 hover:bg-green-700 shadow-lg transition-all active:scale-95">
          Hesap Oluştur
        </button>
        <p className="mt-6 text-sm text-center text-gray-500">
          Zaten üye misin? <span onClick={() => navigate('/login')} className="text-green-600 font-bold cursor-pointer hover:underline">Giriş Yap</span>
        </p>
      </form>
    </div>
  );
}

export default Register;