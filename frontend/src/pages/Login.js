import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Giriş denemesi:", { email, password });
    alert("Backend hazır olunca JWT token alınacak!");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-800">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-gray-100">
        <h2 className="text-3xl font-extrabold mb-6 text-center text-blue-600">Tekrar Hoş Geldin</h2>
        <div className="space-y-4">
          <input 
            type="email" 
            placeholder="E-posta" 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Şifre" 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold mt-6 hover:bg-blue-700 shadow-lg transition-all active:scale-95">
          Giriş Yap
        </button>
        <p className="mt-6 text-sm text-center text-gray-500">
          Hesabın yok mu? <span onClick={() => navigate('/register')} className="text-blue-600 font-bold cursor-pointer hover:underline">Kayıt Ol</span>
        </p>
      </form>
    </div>
  );
}

export default Login;