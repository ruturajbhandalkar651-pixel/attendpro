const API = "http://localhost:3000";

// =======================
// 🔐 Auth Protection
// =======================
if (!localStorage.getItem("user")) {
  window.location.href = "login.html";
}


// =======================
// 📌 DOM Elements
// =======================
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const classInput = document.getElementById("studentClass");

const studentTable = document.getElementById("studentTable");
const attendanceTable = document.getElementById("attendanceTable");

const totalStudents = document.getElementById("totalStudents");
const presentCount = document.getElementById("presentCount");
const absentCount = document.getElementById("absentCount");
const reportTable = document.getElementById("reportTable");

// =======================
// 📂 Navigation
// =======================
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// =======================
// 🚪 Logout
// =======================
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// =======================
// ➕ Add Student
// =======================
async function addStudent() {
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const cls = classInput.value.trim();

  if (!name || !email || !cls) {
    alert("Please fill all fields!");
    return;
  }

  await fetch(API + "/add-student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      className: cls
    })
  });

  nameInput.value = "";
  emailInput.value = "";
  classInput.value = "";

  loadStudents();
}

// =======================
// 📋 Load Students
// =======================
async function loadStudents() {
  const res = await fetch(API + "/students");
  const data = await res.json();

  studentTable.innerHTML = "";
  attendanceTable.innerHTML = "";

  totalStudents.innerText = data.length;

  let present = 0;
  let absent = 0;

  data.forEach(s => {
    studentTable.innerHTML += `
      <tr>
        <td>${s.student_id}</td>
        <td>${s.name}</td>
        <td>${s.email}</td>
        <td>${s.className || s.class || ""}</td>
        <td><button onclick="deleteStudent(${s.student_id})">Delete</button></td>
      </tr>
    `;

    attendanceTable.innerHTML += `
      <tr>
        <td>${s.name}</td>
        <td>
          <select id="status-${s.student_id}">
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
          </select>
        </td>
      </tr>
    `;
  });
}

// =======================
// ❌ Delete Student
// =======================
async function deleteStudent(id) {
  await fetch(API + "/delete-student/" + id, {
    method: "DELETE"
  });

  loadStudents();
}

// =======================
// 💾 Save Attendance
// =======================
async function saveAttendance() {
  const date = document.getElementById("date").value;

  if (!date) {
    alert("Select date first!");
    return;
  }

  const res = await fetch(API + "/students");
  const students = await res.json();

  let present = 0;
  let absent = 0;

  for (let s of students) {
    const status = document.getElementById(`status-${s.student_id}`).value;

    if (status === "Present") present++;
    else absent++;

    await fetch(API + "/mark-attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: s.student_id,
        date,
        status
      })
    });
  }

  presentCount.innerText = present;
  absentCount.innerText = absent;

  alert("Attendance Saved!");
  loadReports();
}

// =======================
// 📊 Reports
let barChart, pieChart;

async function loadReports() {
  const res = await fetch(API + "/report");
  const data = await res.json();

  console.log("REPORT:", data);

  reportTable.innerHTML = "";

  if (!data || data.length === 0) {
    reportTable.innerHTML = "<tr><td colspan='5'>No Data Found</td></tr>";
    return;
  }

  let names = [];
  let percentages = [];
  let presentTotal = 0;
  let absentTotal = 0;

  let totalPercent = 0;

  let best = { name: "", percent: 0 };
  let low = { name: "", percent: 100 };

  data.forEach(r => {
    const percent = parseFloat(r.percentage) || 0;

    names.push(r.name);
    percentages.push(percent);

    presentTotal += r.present_days;
    absentTotal += (r.total_days - r.present_days);

    totalPercent += percent;

    if (percent > best.percent) best = { name: r.name, percent };
    if (percent < low.percent) low = { name: r.name, percent };

    let status = "Good";
    if (percent < 75) status = "Low";
    else if (percent < 90) status = "Average";

    reportTable.innerHTML += `
      <tr>
        <td>${r.name}</td>
        <td>${r.present_days}</td>
        <td>${r.total_days}</td>
        <td>${percent.toFixed(2)}%</td>
        <td>${status}</td>
      </tr>
    `;
  });

  // 🔢 Cards
  document.getElementById("totalStudentsCard").innerText = data.length;
  document.getElementById("avgAttendance").innerText =
    (totalPercent / data.length).toFixed(2) + "%";
  document.getElementById("bestStudent").innerText = best.name;
  document.getElementById("lowStudent").innerText = low.name;

  // 🔥 Destroy old charts
  if (barChart) barChart.destroy();
  if (pieChart) pieChart.destroy();

  // 📊 Bar Chart
  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: names,
      datasets: [{
        label: "Attendance %",
        data: percentages
      }]
    }
  });

  // 🥧 Pie Chart
  pieChart = new Chart(document.getElementById("pieChart"), {
    type: "pie",
    data: {
      labels: ["Present", "Absent"],
      datasets: [{
        data: [presentTotal, absentTotal]
      }]
    }
  });
}

// =======================
// 🚀 INIT
// =======================
window.onload = () => {
  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }

  loadStudents();
  loadReports();
};