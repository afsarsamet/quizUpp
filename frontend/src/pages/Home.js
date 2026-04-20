import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-gray-50">
      {/* Giriş Butonlarını Üste Alalım */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={() => navigate("/login")} className="text-blue-500 font-bold border border-blue-500 px-4 py-1 rounded hover:bg-blue-50">Giriş Yap</button>
        <button onClick={() => navigate("/register")} className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600">Kayıt Ol</button>
      </div>

      <h1 className="text-5xl font-extrabold text-blue-600 mb-6">QuizUpp</h1>

      <div className="flex gap-6">
        <button
          onClick={() => navigate("/host")}
          className="bg-blue-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
        >
          Quiz Oluştur
        </button>

        <button
          onClick={() => navigate("/join")}
          className="bg-green-500 text-white px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
        >
          Quiz’e Katıl
        </button>
      </div>
    </div>
  );
}

export default Home;