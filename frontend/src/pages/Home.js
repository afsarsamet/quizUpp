import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-3xl font-bold">QuizUp</h1>

      <button
        onClick={() => navigate("/host")}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Quiz Oluştur
      </button>

      <button
        onClick={() => navigate("/join")}
        className="bg-green-500 text-white px-4 py-2 rounded"
      >
        Quiz’e Katıl
      </button>
    </div>
  );
}

export default Home;