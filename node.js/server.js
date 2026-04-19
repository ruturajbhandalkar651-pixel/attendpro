const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

// ==========================
// MIDDLEWARE (IMPORTANT)
// ==========================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ==========================
// 🗄 MySQL Connection
// ==========================
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Ruturaj@123",
  database: "attendance_system"
});

db.connect(err => {
  if (err) {
    console.log("❌ DB Connection Failed:", err);
  } else {
    console.log("✅ Connected to MySQL");
  }
});

app.post("/login", (req, res) => {

  console.log("LOGIN BODY:", req.body); // debug

  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, message: "Email or password missing" });
  }

  const sql = "SELECT * FROM users WHERE email = ? LIMIT 1";

  db.query(sql, [email], (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ success: false, message: "Database error" });
    }

    if (result.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const user = result[0];

    console.log("DB USER:", user); // debug

    // safer comparison
    if (String(user.password).trim() === String(password).trim()) {
      return res.json({
        success: true,
        role: user.role,
        message: "Login successful"
      });
    } else {
      return res.json({
        success: false,
        message: "Invalid password"
      });
    }
  });
});
// ==========================
// 👨‍🎓 GET ALL STUDENTS
// ==========================
app.get("/students", (req, res) => {
  db.query("SELECT * FROM students", (err, result) => {
    if (err) return res.json(err);
    res.json(result);
  });
});

// ==========================
// ➕ ADD STUDENT
// ==========================
app.post("/add-student", (req, res) => {
  const { name, email, className } = req.body;

  const sql = "INSERT INTO students (name, email, class) VALUES (?, ?, ?)";

  db.query(sql, [name, email, className], (err) => {
    if (err) return res.json(err);
    res.json({ success: true, message: "Student Added" });
  });
});

// ==========================
// 🗑 DELETE STUDENT
// ==========================
app.delete("/delete-student/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM students WHERE student_id = ?", [id], (err) => {
    if (err) return res.json(err);
    res.json({ success: true, message: "Student Deleted" });
  });
});

// ==========================
// 📅 MARK ATTENDANCE
// ==========================
app.post("/mark-attendance", (req, res) => {
  const { student_id, date, status } = req.body;

  const sql =
    "INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)";

  db.query(sql, [student_id, date, status], (err) => {
    if (err) return res.json(err);
    res.json({ success: true });
  });
});

// ==========================
// 📊 REPORT (FIXED)
// ==========================
app.get("/report", (req, res) => {

  const sql = `
    SELECT 
      students.name,
      COUNT(attendance.id) AS total_days,
      SUM(CASE WHEN attendance.status = 'Present' THEN 1 ELSE 0 END) AS present_days,
      (SUM(CASE WHEN attendance.status = 'Present' THEN 1 ELSE 0 END) / COUNT(attendance.id)) * 100 AS percentage
    FROM students
    LEFT JOIN attendance 
      ON students.student_id = attendance.student_id
    GROUP BY students.student_id
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.json([]);
    }

    res.json(result);
  });

});
// ==========================
// 📆 GET ATTENDANCE BY DATE
// ==========================
app.get("/attendance/:date", (req, res) => {
  const date = req.params.date;

  const sql = `
    SELECT s.name, a.status
    FROM attendance a
    JOIN students s ON a.student_id = s.student_id
    WHERE a.date = ?
  `;

  db.query(sql, [date], (err, result) => {
    if (err) return res.json(err);
    res.json(result);
  });
});

// ==========================
// ⚠ LOW ATTENDANCE
// ==========================
app.get("/low-attendance", (req, res) => {
  const sql = `
    SELECT 
      s.name,
      IFNULL(
        (COUNT(CASE WHEN a.status = 'Present' THEN 1 END) / NULLIF(COUNT(a.student_id),0)) * 100,
        0
      ) AS percentage
    FROM students s
    LEFT JOIN attendance a ON s.student_id = a.student_id
    GROUP BY s.student_id
    HAVING percentage < 75
  `;

  db.query(sql, (err, result) => {
    if (err) return res.json(err);
    res.json(result);
  });
});

// ==========================
// 🔍 SEARCH STUDENT
// ==========================
app.get("/search/:name", (req, res) => {
  const name = req.params.name;

  const sql = "SELECT * FROM students WHERE name LIKE ?";

  db.query(sql, [`%${name}%`], (err, result) => {
    if (err) return res.json(err);
    res.json(result);
  });
});

// ==========================
// ✏ UPDATE ATTENDANCE
// ==========================
app.put("/update-attendance", (req, res) => {
  const { student_id, date, status } = req.body;

  const sql = `
    UPDATE attendance
    SET status = ?
    WHERE student_id = ? AND date = ?
  `;

  db.query(sql, [status, student_id, date], (err) => {
    if (err) return res.json(err);
    res.json({ success: true });
  });
});

// ==========================
// 🚀 START SERVER
// ==========================
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});