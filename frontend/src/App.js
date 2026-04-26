import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Host from "./pages/Host";
import Join from "./pages/Join";
import Game from "./pages/Game";
import MyQuizzes from "./pages/MyQuizzes";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/host" element={<Host />} />
        <Route path="/join" element={<Join />} />
        <Route path="/game" element={<Game />} />
        <Route path="/my-quizzes" element={<MyQuizzes />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;