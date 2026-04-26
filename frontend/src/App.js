import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Join from "./pages/Join";
import Host from "./pages/Host";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Game from "./pages/Game";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<Join />} />
        <Route path="/host" element={<Host />} />
        <Route path="/login" element={<Login />} />
        <Route path="/game" element={<Game />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;