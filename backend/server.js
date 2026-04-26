require('dotenv').config(); // .env dosyasındaki şifreleri okumak için şart
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middleware (Ara Yazılımlar)
app.use(cors());
app.use(express.json()); // React'ten gelen JSON verilerini okuyabilmek için

// Veritabanı Bağlantı Ayarları (.env dosyasından çekiyor)
const pool = new Pool({
 user: "postgres",       
  host: "localhost",      
  database: "roomapp",    
  password:process.env.DB_PASSWORD, 
  port: 5432,
});

// Veritabanı bağlantı testi
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Veritabanı bağlantı hatası:', err.stack);
  }
  console.log('🔥 PostgreSQL (Docker) bağlantısı başarılı!');
});

// --- API ROTLARI ---

// 1. Ana Sayfa Test Rotası
app.get("/", (req, res) => {
  res.send("Backend tıkır tıkır çalışıyor!");
});

// 2. KAYIT OL (REGISTER) API'si
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Kullanıcıyı veritabanındaki 'users' tablosuna ekliyoruz
    const newUser = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
      [username, email, password]
    );

    res.status(201).json({
      message: "Kullanıcı başarıyla kaydedildi!",
      user: newUser.rows[0]
    });
    
    console.log(`✅ Yeni üye: ${username}`);
  } catch (err) {
    console.error("Kayıt hatası:", err.message);
    res.status(500).json({ 
      error: "Kayıt işlemi başarısız. Bu email veya kullanıcı adı alınmış olabilir." 
    });
  }
});
// 3. GİRİŞ YAP (LOGIN) API'si
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Veritabanında bu emaile ve şifreye sahip adam var mı diye bakıyoruz
    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND password = $2", 
      [email, password]
    );

    if (user.rows.length > 0) {
      // Eşleşme bulundu, adamı içeri al
      res.status(200).json({ message: "Giriş başarılı", user: user.rows[0] });
    } else {
      // Eşleşme yok, kapıdan çevir
      res.status(401).json({ message: "E-posta veya şifre hatalı kanka!" });
    }
  } catch (err) {
    console.error("Giriş hatası:", err.message);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});
// Sunucuyu başlat
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu http://localhost:${PORT} adresinde ayaklandı!`);
});