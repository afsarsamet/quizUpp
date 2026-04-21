const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "127.0.0.1",
  database: "postgres",
  password: "6767",
  port: 5432,
});

app.get("/", (req, res) => {
  res.send("Backend çalışıyor");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT current_database(), NOW()");
    res.json({
      message: "PostgreSQL bağlı",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      message: "DB bağlantı hatası",
      error: err.message,
    });
  }
});

app.listen(5000, () => {
  console.log("Server 5000 portunda çalışıyor");
});