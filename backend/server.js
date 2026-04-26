require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// .env dosyasından gelen verilerle DB bağlantısı
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect((err) => {
  if (err) return console.error('❌ Veritabanı bağlantı hatası:', err.stack);
  console.log('🔥 PostgreSQL (Docker) bağlantısı başarılı!');
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`🟢 Yeni bağlanan: ${socket.id}`);

  socket.on('joinRoom', ({ roomId, username }) => {
    socket.join(roomId); 
    console.log(`📡 [KATILIM] ${username}, ${roomId} odasına girdi.`);
    // Odaya giren herkese güncel kullanıcıyı bildir
    io.to(roomId).emit('userJoined', { username });
  });

  socket.on('startGame', async (roomId) => {
    console.log(`🚀 [START] Oyun başlatılıyor: ${roomId}`);
    
    try {
      const result = await pool.query("SELECT * FROM questions ORDER BY RANDOM() LIMIT 1");
      
      if (result.rows.length > 0) {
        const question = result.rows[0];
        
        // ÖNEMLİ: io.to(roomId) kullanarak sinyali HOST DAHİL herkese gönderiyoruz
        io.to(roomId).emit('gameStarted');
        
        // React state'inin güncellenmesi için yarım saniye bekle ve soruyu fırlat
        setTimeout(() => {
          io.to(roomId).emit('nextQuestion', {
            questionText: question.question_text,
            options: [question.option_a, question.option_b, question.option_c, question.option_d],
            correctOptionIndex: question.correct_answer
          });
          console.log(`✅ ${roomId} odasına soru fırlatıldı.`);
        }, 500);

      } else {
        console.log("⚠️ Veritabanında soru bulunamadı!");
      }
    } catch (err) {
      console.error("❌ DB Hatası:", err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Oyuncu ayrıldı: ${socket.id}`);
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`🚀 Sunucu http://localhost:${PORT} üzerinde hazır!`));