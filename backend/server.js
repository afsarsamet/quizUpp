require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || "quizupp_secret";

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "roomapp",
  password: process.env.DB_PASSWORD || "6767",
  port: Number(process.env.DB_PORT) || 5432,
});

/*
  Oyun odaları hâlâ RAM'de.
  Ama artık quizler ve sorular PostgreSQL'e kaydediliyor.
*/
const rooms = new Map();

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      timer_seconds INTEGER NOT NULL DEFAULT 20,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id SERIAL PRIMARY KEY,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option_index INTEGER NOT NULL CHECK (
        correct_option_index >= 0 AND correct_option_index <= 3
      ),
      position INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Database tabloları hazır.");
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Yetkisiz işlem. Token bulunamadı.",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Yetkisiz işlem. Token geçersiz.",
    });
  }

  try {
    const decodedUser = jwt.verify(token, JWT_SECRET);
    req.user = decodedUser;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Oturum süresi dolmuş veya token geçersiz.",
    });
  }
}

function generateRoomCode() {
  let code = "";

  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));

  return code;
}

function normalizeQuestions(questions) {
  return questions.map((question, index) => ({
    id: index + 1,
    questionText: question.questionText.trim(),
    options: question.options.map((option) => option.trim()),
    correctOptionIndex: Number(question.correctOptionIndex),
  }));
}

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return "En az 1 soru eklemelisin.";
  }

  if (questions.length > 30) {
    return "En fazla 30 soru ekleyebilirsin.";
  }

  for (let i = 0; i < questions.length; i += 1) {
    const question = questions[i];

    if (!question.questionText || !question.questionText.trim()) {
      return `${i + 1}. sorunun metni boş olamaz.`;
    }

    if (!Array.isArray(question.options) || question.options.length !== 4) {
      return `${i + 1}. soru için 4 seçenek olmalıdır.`;
    }

    for (let j = 0; j < question.options.length; j += 1) {
      if (!question.options[j] || !question.options[j].trim()) {
        return `${i + 1}. sorunun ${j + 1}. seçeneği boş olamaz.`;
      }
    }

    const correctOptionIndex = Number(question.correctOptionIndex);

    if (
      Number.isNaN(correctOptionIndex) ||
      correctOptionIndex < 0 ||
      correctOptionIndex > 3
    ) {
      return `${i + 1}. soru için doğru cevap seçmelisin.`;
    }
  }

  return null;
}

function normalizeTimerSeconds(value) {
  const timerSeconds = Number(value);

  if (Number.isNaN(timerSeconds)) {
    return 20;
  }

  if (timerSeconds < 5) {
    return 5;
  }

  if (timerSeconds > 120) {
    return 120;
  }

  return timerSeconds;
}

function calculatePoints(room, isCorrect) {
  if (!isCorrect) {
    return {
      pointsGained: 0,
      remainingSeconds: 0,
    };
  }

  const remainingMs = room.questionEndsAt - Date.now();
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const pointsGained = 100 + remainingSeconds * 10;

  return {
    pointsGained,
    remainingSeconds,
  };
}

function getPublicPlayers(room) {
  return room.players.map((player) => ({
    username: player.username,
    score: player.score,
    answered: player.answeredQuestions.has(room.currentQuestionIndex),
  }));
}

function getLeaderboard(room) {
  return [...room.players]
    .map((player) => ({
      username: player.username,
      score: player.score,
    }))
    .sort((a, b) => b.score - a.score);
}

function getCurrentQuestionPayload(room) {
  const question = room.questions[room.currentQuestionIndex];

  return {
    questionNumber: room.currentQuestionIndex + 1,
    totalQuestions: room.questions.length,
    questionText: question.questionText,
    options: question.options,
    timerSeconds: room.timerSeconds,
    endsAt: room.questionEndsAt,
  };
}

function emitRoomUpdated(io, roomCode, room) {
  io.to(roomCode).emit("roomUpdated", {
    roomCode: room.roomCode,
    title: room.title,
    players: getPublicPlayers(room),
  });
}

function clearRoomTimers(room) {
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

  if (room.nextQuestionTimer) {
    clearTimeout(room.nextQuestionTimer);
    room.nextQuestionTimer = null;
  }
}

function finishGame(io, roomCode, room) {
  clearRoomTimers(room);

  room.isFinished = true;
  room.isStarted = false;
  room.questionLocked = true;

  io.to(roomCode).emit("gameFinished", {
    leaderboard: getLeaderboard(room),
  });

  emitRoomUpdated(io, roomCode, room);
}

function sendQuestion(io, roomCode, room) {
  clearRoomTimers(room);

  room.questionLocked = false;
  room.questionStartedAt = Date.now();
  room.questionEndsAt = Date.now() + room.timerSeconds * 1000;

  io.to(roomCode).emit("nextQuestion", getCurrentQuestionPayload(room));
  emitRoomUpdated(io, roomCode, room);

  room.questionTimer = setTimeout(() => {
    const currentQuestion = room.questions[room.currentQuestionIndex];

    room.questionLocked = true;

    io.to(roomCode).emit("questionEnded", {
      correctOptionIndex: currentQuestion.correctOptionIndex,
      correctAnswer: currentQuestion.options[currentQuestion.correctOptionIndex],
      leaderboard: getLeaderboard(room),
    });

    emitRoomUpdated(io, roomCode, room);

    room.nextQuestionTimer = setTimeout(() => {
      if (!room.isStarted || room.isFinished) {
        return;
      }

      const nextIndex = room.currentQuestionIndex + 1;

      if (nextIndex >= room.questions.length) {
        finishGame(io, roomCode, room);
        return;
      }

      room.currentQuestionIndex = nextIndex;
      sendQuestion(io, roomCode, room);
    }, 2500);
  }, room.timerSeconds * 1000);
}

async function saveQuizToDatabase({ userId, title, timerSeconds, questions }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const quizResult = await client.query(
      `
      INSERT INTO quizzes (user_id, title, timer_seconds)
      VALUES ($1, $2, $3)
      RETURNING id, title, timer_seconds, created_at
      `,
      [userId, title, timerSeconds]
    );

    const quiz = quizResult.rows[0];

    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];

      await client.query(
        `
        INSERT INTO quiz_questions (
          quiz_id,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_option_index,
          position
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          quiz.id,
          question.questionText,
          question.options[0],
          question.options[1],
          question.options[2],
          question.options[3],
          question.correctOptionIndex,
          i + 1,
        ]
      );
    }

    await client.query("COMMIT");

    return quiz;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

app.get("/", (req, res) => {
  res.json({ message: "QuizUpp backend çalışıyor." });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Kullanıcı adı, email ve şifre zorunludur.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Şifre en az 6 karakter olmalıdır.",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Bu email ile kayıtlı bir kullanıcı zaten var.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at
      `,
      [username.trim(), email.trim().toLowerCase(), hashedPassword]
    );

    const user = result.rows[0];
    const token = createToken(user);

    return res.status(201).json({
      message: "Kayıt başarılı.",
      token,
      user,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      message: "Kayıt sırasında sunucu hatası oluştu.",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email ve şifre zorunludur.",
      });
    }

    const result = await pool.query(
      "SELECT id, username, email, password, created_at FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Email veya şifre hatalı.",
      });
    }

    const user = result.rows[0];
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Email veya şifre hatalı.",
      });
    }

    delete user.password;

    const token = createToken(user);

    return res.json({
      message: "Giriş başarılı.",
      token,
      user,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Giriş sırasında sunucu hatası oluştu.",
    });
  }
});

app.post("/api/quizzes", authenticateUser, async (req, res) => {
  try {
    const { title, questions, timerSeconds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Quiz başlığı zorunludur.",
      });
    }

    const validationError = validateQuestions(questions);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const cleanTitle = title.trim();
    const cleanTimerSeconds = normalizeTimerSeconds(timerSeconds);
    const normalizedQuestions = normalizeQuestions(questions);

    const savedQuiz = await saveQuizToDatabase({
      userId: req.user.id,
      title: cleanTitle,
      timerSeconds: cleanTimerSeconds,
      questions: normalizedQuestions,
    });

    const roomCode = generateRoomCode();

    const room = {
      roomCode,
      quizId: savedQuiz.id,
      title: cleanTitle,
      timerSeconds: cleanTimerSeconds,
      host: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
      },
      questions: normalizedQuestions,
      players: [],
      currentQuestionIndex: 0,
      isStarted: false,
      isFinished: false,
      questionLocked: false,
      questionStartedAt: null,
      questionEndsAt: null,
      questionTimer: null,
      nextQuestionTimer: null,
      createdAt: new Date().toISOString(),
    };

    rooms.set(roomCode, room);

    return res.status(201).json({
      message: "Quiz oluşturuldu ve kaydedildi.",
      roomCode,
      quiz: {
        id: savedQuiz.id,
        title: room.title,
        questionCount: room.questions.length,
        timerSeconds: room.timerSeconds,
      },
    });
  } catch (error) {
    console.error("Create quiz error:", error);
    return res.status(500).json({
      message: "Quiz oluşturulurken sunucu hatası oluştu.",
    });
  }
});

app.get("/api/my-quizzes", authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        q.id,
        q.title,
        q.timer_seconds,
        q.created_at,
        COUNT(qq.id) AS question_count
      FROM quizzes q
      LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
      WHERE q.user_id = $1
      GROUP BY q.id
      ORDER BY q.created_at DESC
      `,
      [req.user.id]
    );

    return res.json({
      quizzes: result.rows.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        timerSeconds: quiz.timer_seconds,
        questionCount: Number(quiz.question_count),
        createdAt: quiz.created_at,
      })),
    });
  } catch (error) {
    console.error("My quizzes error:", error);
    return res.status(500).json({
      message: "Quizler alınırken sunucu hatası oluştu.",
    });
  }
});

app.get("/api/quizzes/:quizId", authenticateUser, async (req, res) => {
  try {
    const { quizId } = req.params;

    const quizResult = await pool.query(
      `
      SELECT id, title, timer_seconds, created_at
      FROM quizzes
      WHERE id = $1 AND user_id = $2
      `,
      [quizId, req.user.id]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({
        message: "Quiz bulunamadı.",
      });
    }

    const questionsResult = await pool.query(
      `
      SELECT
        id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option_index,
        position
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY position ASC
      `,
      [quizId]
    );

    const quiz = quizResult.rows[0];

    return res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        timerSeconds: quiz.timer_seconds,
        createdAt: quiz.created_at,
        questions: questionsResult.rows.map((question) => ({
          id: question.id,
          questionText: question.question_text,
          options: [
            question.option_a,
            question.option_b,
            question.option_c,
            question.option_d,
          ],
          correctOptionIndex: question.correct_option_index,
        })),
      },
    });
  } catch (error) {
    console.error("Get quiz error:", error);
    return res.status(500).json({
      message: "Quiz alınırken sunucu hatası oluştu.",
    });
  }
});

app.post("/api/quizzes/:quizId/start-room", authenticateUser, async (req, res) => {
  try {
    const { quizId } = req.params;

    const quizResult = await pool.query(
      `
      SELECT id, title, timer_seconds
      FROM quizzes
      WHERE id = $1 AND user_id = $2
      `,
      [quizId, req.user.id]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({
        message: "Quiz bulunamadı.",
      });
    }

    const questionsResult = await pool.query(
      `
      SELECT
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option_index,
        position
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY position ASC
      `,
      [quizId]
    );

    if (questionsResult.rows.length === 0) {
      return res.status(400).json({
        message: "Bu quizde soru yok.",
      });
    }

    const quiz = quizResult.rows[0];

    const questions = questionsResult.rows.map((question, index) => ({
      id: index + 1,
      questionText: question.question_text,
      options: [
        question.option_a,
        question.option_b,
        question.option_c,
        question.option_d,
      ],
      correctOptionIndex: question.correct_option_index,
    }));

    const roomCode = generateRoomCode();

    const room = {
      roomCode,
      quizId: quiz.id,
      title: quiz.title,
      timerSeconds: quiz.timer_seconds,
      host: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
      },
      questions,
      players: [],
      currentQuestionIndex: 0,
      isStarted: false,
      isFinished: false,
      questionLocked: false,
      questionStartedAt: null,
      questionEndsAt: null,
      questionTimer: null,
      nextQuestionTimer: null,
      createdAt: new Date().toISOString(),
    };

    rooms.set(roomCode, room);

    return res.status(201).json({
      message: "Oda oluşturuldu.",
      roomCode,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        questionCount: questions.length,
        timerSeconds: quiz.timer_seconds,
      },
    });
  } catch (error) {
    console.error("Start saved quiz room error:", error);
    return res.status(500).json({
      message: "Kayıtlı quizden oda oluşturulurken sunucu hatası oluştu.",
    });
  }
});

app.get("/api/rooms/:roomCode", (req, res) => {
  const { roomCode } = req.params;
  const room = rooms.get(roomCode);

  if (!room) {
    return res.status(404).json({
      message: "Oda bulunamadı.",
    });
  }

  return res.json({
    roomCode: room.roomCode,
    title: room.title,
    questionCount: room.questions.length,
    timerSeconds: room.timerSeconds,
    isStarted: room.isStarted,
    isFinished: room.isFinished,
    playerCount: room.players.length,
  });
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Yeni bağlanan:", socket.id);

  socket.on("joinRoom", ({ roomId, username, isHost }, callback) => {
    const room = rooms.get(roomId);

    if (!room) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Oda bulunamadı.",
        });
      }
      return;
    }

    if (room.isFinished) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Bu oyun bitmiş.",
        });
      }
      return;
    }

    const cleanUsername = username && username.trim() ? username.trim() : "Oyuncu";

    if (!isHost) {
      const usernameAlreadyTaken = room.players.some(
        (player) =>
          player.username.toLowerCase() === cleanUsername.toLowerCase() &&
          player.socketId !== socket.id
      );

      if (usernameAlreadyTaken) {
        if (typeof callback === "function") {
          callback({
            ok: false,
            message: "Bu kullanıcı adı odada zaten kullanılıyor.",
          });
        }
        return;
      }
    }

    socket.join(roomId);

    /*
      Host oyuncu listesine eklenmez.
      Böylece host soru çözmez, puan almaz, sadece yönetir/izler.
    */
    if (!isHost) {
      const alreadyJoined = room.players.some(
        (player) => player.socketId === socket.id
      );

      if (!alreadyJoined) {
        room.players.push({
          socketId: socket.id,
          username: cleanUsername,
          score: 0,
          answeredQuestions: new Set(),
        });
      }
    }

    console.log(`${cleanUsername}, ${roomId} odasına girdi.`);

    emitRoomUpdated(io, roomId, room);

    if (room.isStarted) {
      socket.emit("gameStarted");
      socket.emit("nextQuestion", getCurrentQuestionPayload(room));
    }

    if (typeof callback === "function") {
      callback({
        ok: true,
        room: {
          roomCode: room.roomCode,
          title: room.title,
          questionCount: room.questions.length,
          timerSeconds: room.timerSeconds,
          isStarted: room.isStarted,
        },
      });
    }
  });

  socket.on("startGame", (roomId, callback) => {
    const room = rooms.get(roomId);

    if (!room) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Oda bulunamadı.",
        });
      }
      return;
    }

    if (room.questions.length === 0) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Bu odada soru yok.",
        });
      }
      return;
    }

    if (room.players.length === 0) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Oyunu başlatmak için en az 1 oyuncu gerekli.",
        });
      }
      return;
    }

    room.isStarted = true;
    room.isFinished = false;
    room.currentQuestionIndex = 0;
    room.questionLocked = false;

    room.players = room.players.map((player) => ({
      ...player,
      score: 0,
      answeredQuestions: new Set(),
    }));

    io.to(roomId).emit("gameStarted");
    sendQuestion(io, roomId, room);

    if (typeof callback === "function") {
      callback({
        ok: true,
        message: "Oyun başlatıldı.",
      });
    }
  });

  socket.on("submitAnswer", ({ roomId, selectedOptionIndex }, callback) => {
    const room = rooms.get(roomId);

    if (!room) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Oda bulunamadı.",
        });
      }
      return;
    }

    if (!room.isStarted || room.isFinished) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Aktif oyun yok.",
        });
      }
      return;
    }

    if (room.questionLocked) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Süre bitti. Bu soru cevaplanamaz.",
        });
      }
      return;
    }

    const player = room.players.find((item) => item.socketId === socket.id);

    if (!player) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Host cevap veremez. Sadece oyuncular cevaplayabilir.",
        });
      }
      return;
    }

    if (player.answeredQuestions.has(room.currentQuestionIndex)) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Bu soruyu zaten cevapladın.",
        });
      }
      return;
    }

    const question = room.questions[room.currentQuestionIndex];
    const cleanSelectedOptionIndex = Number(selectedOptionIndex);

    if (
      Number.isNaN(cleanSelectedOptionIndex) ||
      cleanSelectedOptionIndex < 0 ||
      cleanSelectedOptionIndex > 3
    ) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Geçersiz cevap.",
        });
      }
      return;
    }

    const isCorrect = cleanSelectedOptionIndex === question.correctOptionIndex;
    const { pointsGained, remainingSeconds } = calculatePoints(room, isCorrect);

    player.score += pointsGained;
    player.answeredQuestions.add(room.currentQuestionIndex);

    emitRoomUpdated(io, roomId, room);

    if (typeof callback === "function") {
      callback({
        ok: true,
        isCorrect,
        correctOptionIndex: question.correctOptionIndex,
        score: player.score,
        pointsGained,
        remainingSeconds,
      });
    }
  });

  socket.on("finishGame", (roomId, callback) => {
    const room = rooms.get(roomId);

    if (!room) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Oda bulunamadı.",
        });
      }
      return;
    }

    finishGame(io, roomId, room);

    if (typeof callback === "function") {
      callback({
        ok: true,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Oyuncu ayrıldı:", socket.id);

    for (const [, room] of rooms) {
      const beforeCount = room.players.length;

      room.players = room.players.filter((player) => player.socketId !== socket.id);

      if (room.players.length !== beforeCount) {
        emitRoomUpdated(io, room.roomCode, room);
      }
    }
  });
});

initializeDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Sunucu http://localhost:${PORT} üzerinde hazır.`);
    });
  })
  .catch((error) => {
    console.error("Database başlatılamadı:", error);
    process.exit(1);
  });