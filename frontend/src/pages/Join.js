function Join() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">Quiz'e Katıl</h1>

      <input
        type="text"
        placeholder="Oda Kodu"
        className="border p-2 rounded"
      />

      <input
        type="text"
        placeholder="İsmin"
        className="border p-2 rounded"
      />

      <button className="bg-green-500 text-white px-4 py-2 rounded">
        Katıl
      </button>
    </div>
  );
}

export default Join;