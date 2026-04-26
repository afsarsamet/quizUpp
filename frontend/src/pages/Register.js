import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
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

    if (!formData.username.trim()) {
      setErrorMessage("Kullanıcı adı zorunludur.");
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage("Email zorunludur.");
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Kayıt başarısız.");
        return;
      }

      localStorage.setItem("quizupp_token", data.token);
      localStorage.setItem("quizupp_user", JSON.stringify(data.user));

      setSuccessMessage("Kayıt başarılı. Yönlendiriliyorsun...");

      setTimeout(() => {
        navigate("/");
      }, 800);
    } catch (error) {
      console.error("Register request error:", error);
      setErrorMessage("Backend sunucusuna ulaşılamıyor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>QuizUpp</h1>
        <h2>Kayıt Ol</h2>

        {errorMessage && <div className="alert alert-error">{errorMessage}</div>}
        {successMessage && (
          <div className="alert alert-success">{successMessage}</div>
        )}

        <form onSubmit={handleSubmit}>
          <label>Kullanıcı Adı</label>
          <input
            type="text"
            name="username"
            placeholder="Kullanıcı adını gir"
            value={formData.username}
            onChange={handleChange}
            disabled={loading}
          />

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
            placeholder="En az 6 karakter"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p>
          Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;