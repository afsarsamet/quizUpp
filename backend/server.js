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

const pool = new Pool({
  user: "postgres",       
  host: "localhost",      
  database: "roomapp",    
  password: process.env.DB_PASSWORD, 
  port: 5432,
});

pool.connect((err) => {
  if (err) return console.error('Veritabanı bağlantı hatası:', err.stack);
  console.log('PostgreSQL (Docker) bağlantısı başarılı!');
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`🟢 Yeni bir oyuncu bağlandı: ${socket.id}`);

  socket.on('joinRoom', ({ roomId, username }) => {
    socket.join(roomId); 
    console.log(`📡 [KATILIM] ${username}, ${roomId} odasına girdi.`);
    socket.to(roomId).emit('userJoined', { username });
  });

  socket.on('startGame', async (roomId) => {
    console.log("-----------------------------------------");
    console.log(`🚀 [START] Oyun başlatma isteği: ${roomId}`);
    console.log("-----------------------------------------");
    
    try {
      // Veritabanından soruyu çek
      const result = await pool.query("SELECT * FROM questions ORDER BY RANDOM() LIMIT 1");
      
      if (result.rows.length > 0) {
        const question = result.rows[0];
        
        // Önce herkese "Başladı" de, sonra soruyu yolla
        io.to(roomId).emit('gameStarted');
        
        io.to(roomId).emit('nextQuestion', {
          questionText: question.question_text,
          options: [question.option_a, question.option_b, question.option_c, question.option_d],
          correctOptionIndex: question.correct_answer
        });
        
        console.log(`✅ ${roomId} odasına soru gönderildi.`);
      } else {
        console.log("⚠️ Veritabanında soru yok!");
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
server.listen(PORT, () => console.log(`🚀 Server http://localhost:${PORT}`));