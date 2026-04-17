function App() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-3xl font-bold">QuizUp</h1>

      <button className="bg-blue-500 text-white px-4 py-2 rounded">
        Quiz Oluştur
      </button>

      <button className="bg-green-500 text-white px-4 py-2 rounded">
        Quiz’e Katıl
      </button>
    </div>
  );
}

export default App;