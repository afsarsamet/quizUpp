require('dotenv').config(); // .env dosyasındaki şifreleri okumak için şart
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// 1. HTTP ve Socket.io'yu içeri alıyoruz
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// 2. Express'i HTTP server içine sarıyoruz
const server = http.createServer(app);

// Middleware (Ara Yazılımlar)
app.use(cors());
app.use(express.json()); // React'ten gelen JSON verilerini okuyabilmek için

// Veritabanı Bağlantı Ayarları (.env dosyasından çekiyor)
const pool = new Pool({
  user: "postgres",       
  host: "localhost",      
  database: "roomapp",    
  password: process.env.DB_PASSWORD, 
  port: 5432,
});

// Veritabanı bağlantı testi
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Veritabanı bağlantı hatası:', err.stack);
  }
  console.log('🔥 PostgreSQL (Docker) bağlantısı başarılı!');
});

// 3. Socket.IO'yu ayağa kaldırıyoruz (CORS ayarlarıyla birlikte)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // DİKKAT: React genelde 3000 portunda çalışır (Eğer Vite kullanıyorsan burayı http://localhost:5173 yap)
    methods: ["GET", "POST"]
  }
});

// 4. Socket.IO Olayları (Bağlantı, odaya girme, cevap verme vs.)
io.on('connection', (socket) => {
  console.log(`🟢 Yeni bir oyuncu bağlandı: ${socket.id}`);

  // Oyuncuyu belirli bir odaya (quiz PIN) alma
  socket.on('join_room', (roomCode) => {
    socket.join(roomCode);
    console.log(`${socket.id} kullanıcısı ${roomCode} odasına katıldı.`);
  });

  // Biri cevap gönderdiğinde
  socket.on('submit_answer', (data) => {
    console.log(`Cevap geldi: ${data.answer} (Oda: ${data.room})`);
    
    // Cevabı odadaki diğer herkese gönder (Liderlik tablosu vs. için)
    io.to(data.room).emit('receive_answer', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Oyuncu ayrıldı: ${socket.id}`);
  });
});

// --- API ROTLARI ---

// 1. Ana Sayfa Test Rotası
app.get("/", (req, res) => {
  res.send("Backend tıkır tıkır çalışıyor!");
});

// 2. KAYIT OL (REGISTER) API'si
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
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

// 5. app.listen YERİNE server.listen kullanıyoruz!
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Sunucu http://localhost:${PORT} adresinde ayaklandı!`);
});