function Host() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">Quiz Oluştur</h1>

      <input
        type="text"
        placeholder="Quiz Başlığı"
        className="border p-2 rounded"
      />

      <button className="bg-blue-500 text-white px-4 py-2 rounded">
        Quiz Başlat
      </button>
    </div>
  );
}

export default Host;