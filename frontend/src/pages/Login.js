import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.email.trim()) {
      setErrorMessage("Email zorunludur.");
      return;
    }

    if (!formData.password) {
      setErrorMessage("Şifre zorunludur.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Giriş başarısız.");
        return;
      }

      localStorage.setItem("quizupp_token", data.token);
      localStorage.setItem("quizupp_user", JSON.stringify(data.user));

      setSuccessMessage("Giriş başarılı. Yönlendiriliyorsun...");

      setTimeout(() => {
        navigate("/");
      }, 800);
    } catch (error) {
      console.error("Login request error:", error);
      setErrorMessage("Backend sunucusuna ulaşılamıyor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>QuizUpp</h1>
        <h2>Giriş Yap</h2>

        {errorMessage && <div className="alert alert-error">{errorMessage}</div>}
        {successMessage && (
          <div className="alert alert-success">{successMessage}</div>
        )}

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Email adresini gir"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
          />

          <label>Şifre</label>
          <input
            type="password"
            name="password"
            placeholder="Şifreni gir"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <p>
          Hesabın yok mu? <Link to="/register">Kayıt ol</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;