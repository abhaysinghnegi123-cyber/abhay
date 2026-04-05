const STORAGE_KEY = "mcq_slots_v2";
const SESSION_KEY = "mcq_session_v1";
const FIREBASE_DOC_COLLECTION = "mcq_app";
const FIREBASE_DOC_ID = "shared_data";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC9zjkDwkOaxIzrrsRx4G0nBGwdUxhj4fQ",
  authDomain: "abahy-94f12.firebaseapp.com",
  projectId: "abahy-94f12",
  storageBucket: "abahy-94f12.firebasestorage.app",
  messagingSenderId: "683907125621",
  appId: "1:683907125621:web:bae5b82d4578992cb0033c"
};

const USERS = {
  teacher: { username: "abhay", password: "abhay2010" },
  student: { username: "chanchal", password: "chanchal2013" }
};

const loginSection = document.getElementById("loginSection");
const teacherSection = document.getElementById("teacherSection");
const studentSection = document.getElementById("studentSection");
const cloudStatus = document.getElementById("cloudStatus");

const loginForm = document.getElementById("loginForm");
const roleInput = document.getElementById("role");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.getElementById("togglePasswordBtn");
const loginMessage = document.getElementById("loginMessage");

const teacherLogoutBtn = document.getElementById("teacherLogoutBtn");
const slotForm = document.getElementById("slotForm");
const slotCodeInput = document.getElementById("slotCode");
const slotNameInput = document.getElementById("slotName");
const slotMessage = document.getElementById("slotMessage");
const slotSelect = document.getElementById("slotSelect");
const teacherQuestionForm = document.getElementById("teacherQuestionForm");
const questionText = document.getElementById("questionText");
const optionA = document.getElementById("optionA");
const optionB = document.getElementById("optionB");
const optionC = document.getElementById("optionC");
const optionD = document.getElementById("optionD");
const correctAnswer = document.getElementById("correctAnswer");
const questionMessage = document.getElementById("questionMessage");
const importSlotSelect = document.getElementById("importSlotSelect");
const txtImportFile = document.getElementById("txtImportFile");
const importTxtBtn = document.getElementById("importTxtBtn");
const importMessage = document.getElementById("importMessage");
const editSlotSelect = document.getElementById("editSlotSelect");
const editQuestionSelect = document.getElementById("editQuestionSelect");
const editQuestionText = document.getElementById("editQuestionText");
const editOptionA = document.getElementById("editOptionA");
const editOptionB = document.getElementById("editOptionB");
const editOptionC = document.getElementById("editOptionC");
const editOptionD = document.getElementById("editOptionD");
const editCorrectAnswer = document.getElementById("editCorrectAnswer");
const saveEditBtn = document.getElementById("saveEditBtn");
const deleteQuestionBtn = document.getElementById("deleteQuestionBtn");
const editMessage = document.getElementById("editMessage");
const exportBackupBtn = document.getElementById("exportBackupBtn");
const importBackupFile = document.getElementById("importBackupFile");
const importBackupBtn = document.getElementById("importBackupBtn");
const backupMessage = document.getElementById("backupMessage");
const teacherSlotList = document.getElementById("teacherSlotList");
const clearAllBtn = document.getElementById("clearAllBtn");
const teacherDashGrid = document.getElementById("teacherDashGrid");

const studentLogoutBtn = document.getElementById("studentLogoutBtn");
const studentSlotSelect = document.getElementById("studentSlotSelect");
const studentForm = document.getElementById("studentForm");
const studentPreview = document.getElementById("studentPreview");
const studentDashGrid = document.getElementById("studentDashGrid");
const refreshStudentSlotsBtn = document.getElementById("refreshStudentSlotsBtn");
const prevQuestionBtn = document.getElementById("prevQuestionBtn");
const submitQuizBtn = document.getElementById("submitQuizBtn");
const resultBox = document.getElementById("resultBox");
const backDashButtons = document.querySelectorAll(".back-dash-btn");

const quizState = {
  slotCode: "",
  currentIndex: 0,
  answers: {}
};

let db = null;
let cloudEnabled = false;
let slotsCache = [];
let unsubscribeCloud = null;

function cloneSlots(slots) {
  return JSON.parse(JSON.stringify(slots || []));
}

function loadLocalSlots() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function setCloudStatus(message, isError = false) {
  cloudStatus.textContent = message;
  cloudStatus.style.color = isError ? "#ff6b6b" : "#9decb8";
}

function isFirebaseConfigured() {
  return (
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.appId &&
    !FIREBASE_CONFIG.apiKey.startsWith("YOUR_")
  );
}

function handleCloudUpdate(nextSlots) {
  slotsCache = cloneSlots(nextSlots);
  if (!teacherSection.classList.contains("hidden")) {
    renderTeacherSlots();
  }
  if (!studentSection.classList.contains("hidden")) {
    renderStudentSlots();
  }
}

async function initDataStore() {
  slotsCache = loadLocalSlots();

  if (!window.firebase || !isFirebaseConfigured()) {
    setCloudStatus("Cloud sync is OFF. Configure Firebase in app.js to sync across devices.");
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.firestore();
    cloudEnabled = true;

    const docRef = db.collection(FIREBASE_DOC_COLLECTION).doc(FIREBASE_DOC_ID);
    const snapshot = await docRef.get();
    if (snapshot.exists && Array.isArray(snapshot.data().slots)) {
      slotsCache = cloneSlots(snapshot.data().slots);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slotsCache));
    } else if (slotsCache.length > 0) {
      await docRef.set(
        {
          slots: slotsCache,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }

    unsubscribeCloud = docRef.onSnapshot((snap) => {
      if (!snap.exists) return;
      const remoteSlots = snap.data().slots;
      if (Array.isArray(remoteSlots)) {
        handleCloudUpdate(remoteSlots);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slotsCache));
      }
    });

    setCloudStatus("Cloud sync connected. Teacher and student devices stay in sync.");
  } catch (error) {
    cloudEnabled = false;
    setCloudStatus("Cloud sync failed. Using local browser storage only.", true);
  }
}

function getSlots() {
  return cloneSlots(slotsCache);
}

function saveSlots(slots) {
  slotsCache = cloneSlots(slots);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slotsCache));

  if (!cloudEnabled || !db) return;

  db.collection(FIREBASE_DOC_COLLECTION)
    .doc(FIREBASE_DOC_ID)
    .set(
      {
        slots: slotsCache,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    )
    .catch(() => {
      setCloudStatus("Cloud write failed temporarily. Changes saved locally.", true);
    });
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && parsed.role ? parsed : null;
  } catch (error) {
    return null;
  }
}

function setSession(role, username) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ role, username }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "#ff4d4f" : "#1ed760";
}

function resetMessage(element) {
  element.textContent = "";
}

function hideAllSections() {
  loginSection.classList.add("hidden");
  teacherSection.classList.add("hidden");
  studentSection.classList.add("hidden");
}

function setTeacherView() {
  hideAllSections();
  teacherSection.classList.remove("hidden");
  renderTeacherSlots();
  showTeacherModule(null);
}

function setStudentView() {
  hideAllSections();
  studentSection.classList.remove("hidden");
  renderStudentSlots();
  showStudentModule(null);
}

function setLoginView() {
  hideAllSections();
  loginSection.classList.remove("hidden");
}

function normalizeCode(code) {
  return code.trim().toUpperCase();
}

function showTeacherModule(moduleId) {
  const modules = teacherSection.querySelectorAll(".teacher-module");
  modules.forEach((module) => {
    const isShown = moduleId && module.id === moduleId;
    module.classList.toggle("hidden", !isShown);
    module.classList.toggle("module-animate", isShown);
  });
  if (moduleId === "teacherEditCard") {
    populateEditSlotSelect();
  }
}

function showStudentModule(moduleId) {
  const modules = studentSection.querySelectorAll(".student-module");
  modules.forEach((module) => {
    const isShown = moduleId && module.id === moduleId;
    module.classList.toggle("hidden", !isShown);
    module.classList.toggle("module-animate", isShown);
  });
}

function renderSlotSelects() {
  const slots = getSlots();
  slotSelect.innerHTML = "";
  studentSlotSelect.innerHTML = "";
  importSlotSelect.innerHTML = "";
  editSlotSelect.innerHTML = "";

  if (slots.length === 0) {
    slotSelect.innerHTML = '<option value="">No slots found</option>';
    studentSlotSelect.innerHTML = '<option value="">No slots found</option>';
    importSlotSelect.innerHTML = '<option value="">No slots found</option>';
    editSlotSelect.innerHTML = '<option value="">No slots found</option>';
    return;
  }

  slotSelect.innerHTML = '<option value="">Select slot</option>';
  studentSlotSelect.innerHTML = '<option value="">Select slot</option>';
  importSlotSelect.innerHTML = '<option value="">Select slot</option>';
  editSlotSelect.innerHTML = '<option value="">Select slot</option>';

  slots.forEach((slot) => {
    const label = `${slot.code} - ${slot.name}`;

    const optionTeacher = document.createElement("option");
    optionTeacher.value = slot.code;
    optionTeacher.textContent = label;
    slotSelect.appendChild(optionTeacher);

    const optionStudent = document.createElement("option");
    optionStudent.value = slot.code;
    optionStudent.textContent = label;
    studentSlotSelect.appendChild(optionStudent);

    const optionImport = document.createElement("option");
    optionImport.value = slot.code;
    optionImport.textContent = label;
    importSlotSelect.appendChild(optionImport);

    const optionEdit = document.createElement("option");
    optionEdit.value = slot.code;
    optionEdit.textContent = label;
    editSlotSelect.appendChild(optionEdit);
  });
}

function populateEditSlotSelect() {
  renderSlotSelects();
  if (editSlotSelect.options.length > 1) {
    editSlotSelect.value = editSlotSelect.options[1].value;
  }
  populateEditQuestionSelect();
}

function populateEditQuestionSelect() {
  const slots = getSlots();
  const slot = slots.find((s) => s.code === editSlotSelect.value);
  editQuestionSelect.innerHTML = "";

  if (!slot || slot.questions.length === 0) {
    editQuestionSelect.innerHTML = '<option value="">No questions found</option>';
    editQuestionText.value = "";
    editOptionA.value = "";
    editOptionB.value = "";
    editOptionC.value = "";
    editOptionD.value = "";
    editCorrectAnswer.value = "A";
    return;
  }

  slot.questions.forEach((q, index) => {
    const op = document.createElement("option");
    op.value = String(index);
    op.textContent = `Q${index + 1}: ${q.question.slice(0, 50)}`;
    editQuestionSelect.appendChild(op);
  });

  editQuestionSelect.value = "0";
  loadEditQuestionFields();
}

function loadEditQuestionFields() {
  const slots = getSlots();
  const slot = slots.find((s) => s.code === editSlotSelect.value);
  const index = Number(editQuestionSelect.value);
  if (!slot || Number.isNaN(index) || !slot.questions[index]) return;

  const q = slot.questions[index];
  editQuestionText.value = q.question;
  editOptionA.value = q.options.A;
  editOptionB.value = q.options.B;
  editOptionC.value = q.options.C;
  editOptionD.value = q.options.D;
  editCorrectAnswer.value = q.correct;
}

function renderTeacherSlots() {
  const slots = getSlots();
  renderSlotSelects();

  if (slots.length === 0) {
    teacherSlotList.innerHTML = '<p class="empty">No slots created yet.</p>';
    return;
  }

  teacherSlotList.innerHTML = "";
  slots.forEach((slot) => {
    const card = document.createElement("article");
    card.className = "question-item";

    let questionHtml = '<p class="empty">No questions in this slot yet.</p>';
    if (slot.questions.length > 0) {
      questionHtml = slot.questions
        .map((q, index) => {
          return `
            <div class="slot-question">
              <h4>Q${index + 1}: ${q.question}</h4>
              <ul>
                <li><strong>A:</strong> ${q.options.A}</li>
                <li><strong>B:</strong> ${q.options.B}</li>
                <li><strong>C:</strong> ${q.options.C}</li>
                <li><strong>D:</strong> ${q.options.D}</li>
              </ul>
              <p class="answer-line"><strong>Correct:</strong> ${q.correct}</p>
            </div>
          `;
        })
        .join("");
    }

    card.innerHTML = `
      <h3>${slot.code} - ${slot.name}</h3>
      <p><strong>Total Questions:</strong> ${slot.questions.length}</p>
      ${questionHtml}
    `;
    teacherSlotList.appendChild(card);
  });
}

function getScoreEmoji(score, total) {
  const percent = (score / total) * 100;
  if (percent >= 90) return "\u{1F3C6}";
  if (percent >= 70) return "\u{1F60A}";
  if (percent >= 40) return "\u{1F642}";
  return "\u{1F605}";
}

function renderStudentQuizBySlot(slotCode) {
  const slots = getSlots();
  const selectedSlot = slots.find((slot) => slot.code === slotCode);
  quizState.slotCode = slotCode;
  quizState.currentIndex = 0;
  quizState.answers = {};
  resultBox.innerHTML = "";

  if (!selectedSlot || selectedSlot.questions.length === 0) {
    studentForm.innerHTML = '<p class="empty">No questions available in this slot.</p>';
    studentPreview.innerHTML = "";
    submitQuizBtn.disabled = true;
    prevQuestionBtn.disabled = true;
    return;
  }

  submitQuizBtn.disabled = false;
  prevQuestionBtn.disabled = true;
  renderCurrentStudentQuestion();
}

function renderStudentPreview() {
  const slots = getSlots();
  const slot = slots.find((s) => s.code === quizState.slotCode);
  if (!slot || slot.questions.length === 0) {
    studentPreview.innerHTML = "";
    return;
  }

  const total = slot.questions.length;
  const answeredCount = Object.keys(quizState.answers).length;

  const items = slot.questions
    .map((_, idx) => {
      const answer = quizState.answers[idx];
      const isCurrent = idx === quizState.currentIndex;
      const statusClass = isCurrent ? "current-chip" : answer ? "done-chip" : "todo-chip";
      const statusText = isCurrent ? "Current" : answer ? `Answered: ${answer}` : "Pending";
      return `<li class="${statusClass}">Q${idx + 1} - ${statusText}</li>`;
    })
    .join("");

  studentPreview.innerHTML = `
    <div class="preview-head">Preview: ${answeredCount}/${total} answered</div>
    <ul class="preview-list">${items}</ul>
  `;
}

function renderCurrentStudentQuestion() {
  const slots = getSlots();
  const slot = slots.find((s) => s.code === quizState.slotCode);

  if (!slot || slot.questions.length === 0) {
    studentForm.innerHTML = '<p class="empty">No questions available in this slot.</p>';
    submitQuizBtn.disabled = true;
    return;
  }

  const index = quizState.currentIndex;
  const question = slot.questions[index];
  const total = slot.questions.length;
  const isLast = index === total - 1;
  const savedAnswer = quizState.answers[index] || "";

  submitQuizBtn.textContent = isLast ? "Submit Quiz" : "Next Question";
  prevQuestionBtn.disabled = index === 0;

  studentForm.innerHTML = `
    <div class="question-frame animate-in">
      <p class="muted"><strong>Marking:</strong> 1 mark per question. Total marks: ${total}</p>
      <p class="quiz-progress">Question ${index + 1} of ${total}</p>
      <fieldset class="student-question">
        <legend>Q${index + 1}: ${question.question}</legend>
        <label><input type="radio" name="current_question" value="A" ${savedAnswer === "A" ? "checked" : ""} /> A. ${question.options.A}</label>
        <label><input type="radio" name="current_question" value="B" ${savedAnswer === "B" ? "checked" : ""} /> B. ${question.options.B}</label>
        <label><input type="radio" name="current_question" value="C" ${savedAnswer === "C" ? "checked" : ""} /> C. ${question.options.C}</label>
        <label><input type="radio" name="current_question" value="D" ${savedAnswer === "D" ? "checked" : ""} /> D. ${question.options.D}</label>
      </fieldset>
    </div>
  `;
  renderStudentPreview();
}

function renderStudentSlots() {
  renderSlotSelects();
  const slots = getSlots();
  if (slots.length > 0) {
    const firstCode = slots[0].code;
    studentSlotSelect.value = firstCode;
    renderStudentQuizBySlot(firstCode);
  } else {
    renderStudentQuizBySlot("");
  }
}

function persistCurrentAnswerIfSelected() {
  const selected = studentForm.querySelector('input[name="current_question"]:checked');
  if (selected) {
    quizState.answers[quizState.currentIndex] = selected.value;
  }
}

function clearTeacherQuestionForm() {
  teacherQuestionForm.reset();
}

function isValidSlotData(data) {
  if (!Array.isArray(data)) return false;
  return data.every((slot) => {
    if (!slot || typeof slot !== "object") return false;
    if (typeof slot.code !== "string" || typeof slot.name !== "string") return false;
    if (!Array.isArray(slot.questions)) return false;
    return slot.questions.every((q) => {
      return (
        q &&
        typeof q.question === "string" &&
        q.options &&
        typeof q.options.A === "string" &&
        typeof q.options.B === "string" &&
        typeof q.options.C === "string" &&
        typeof q.options.D === "string" &&
        ["A", "B", "C", "D"].includes(q.correct)
      );
    });
  });
}

function extractValue(line, keys) {
  for (const key of keys) {
    const match = line.match(new RegExp(`^${key}\\s*[:\\-\\)\\.]\\s*(.+)$`, "i"));
    if (match) return match[1].trim();
  }
  return "";
}

function parseQuestionsFromText(rawText) {
  const blocks = rawText
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const parsedQuestions = [];
  let skipped = 0;
  const numberToLetter = { "1": "A", "2": "B", "3": "C", "4": "D" };

  function resolveAnswerKey(answerRaw, options) {
    if (!answerRaw) return "";
    const clean = answerRaw.trim();
    const letter = clean.toUpperCase();
    if (["A", "B", "C", "D"].includes(letter)) return letter;
    if (numberToLetter[clean]) return numberToLetter[clean];

    const matched = Object.entries(options).find(
      ([, value]) => value.trim().toLowerCase() === clean.toLowerCase()
    );
    return matched ? matched[0] : "";
  }

  blocks.forEach((block) => {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const optionMap = {};
    let answerRaw = "";

    lines.forEach((line) => {
      const letterOpt = line.match(/^([A-D])\s*[\)\.\:\-]\s*(.+)$/i);
      if (letterOpt) {
        optionMap[letterOpt[1].toUpperCase()] = letterOpt[2].trim();
        return;
      }

      const numberOpt = line.match(/^([1-4])\s*[\)\.\:\-]\s*(.+)$/i);
      if (numberOpt) {
        optionMap[numberToLetter[numberOpt[1]]] = numberOpt[2].trim();
        return;
      }

      const ansMatch = line.match(/^(?:\u{1F449}\s*)?(?:ans|answer)\s*[:=\-]\s*(.+)$/iu);
      if (ansMatch) {
        answerRaw = ansMatch[1].trim();
      }
    });

    const compactOptionsLine = lines.find((line) => /a\)\s*.+\s+b\)\s*.+\s+c\)\s*.+\s+d\)\s*.+/i.test(line));
    if (compactOptionsLine && Object.keys(optionMap).length < 4) {
      const compactMatch = compactOptionsLine.match(/A\)\s*(.*?)\s*B\)\s*(.*?)\s*C\)\s*(.*?)\s*D\)\s*(.*)$/i);
      if (compactMatch) {
        optionMap.A = compactMatch[1].trim();
        optionMap.B = compactMatch[2].trim();
        optionMap.C = compactMatch[3].trim();
        optionMap.D = compactMatch[4].trim();
      }
    }

    if (Object.keys(optionMap).length < 4) {
      skipped += 1;
      return;
    }

    const questionLine = lines.find(
      (line) =>
        !/^([A-D]|[1-4])\s*[\)\.\:\-]/i.test(line) &&
        !/^(?:\u{1F449}\s*)?(?:ans|answer)\s*[:=\-]/iu.test(line) &&
        !/a\)\s*.+\s+b\)\s*.+\s+c\)\s*.+\s+d\)\s*.+/i.test(line)
    );

    if (!questionLine) {
      skipped += 1;
      return;
    }

    const question = questionLine.replace(/^q\d*\s*[\.\):\-]\s*/i, "").replace(/^q(?:uestion)?\s*[:\-\)\.]\s*/i, "").trim();
    const correct = resolveAnswerKey(answerRaw, optionMap);

    if (!question || !correct) {
      skipped += 1;
      return;
    }

    parsedQuestions.push({
      question,
      options: {
        A: optionMap.A,
        B: optionMap.B,
        C: optionMap.C,
        D: optionMap.D
      },
      correct
    });
  });

  return { parsedQuestions, skipped };
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  resetMessage(loginMessage);

  const role = roleInput.value;
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!role || !username || !password) {
    showMessage(loginMessage, "Please fill all login fields.", true);
    return;
  }

  const user = USERS[role];
  const valid = user && user.username === username && user.password === password;

  if (!valid) {
    showMessage(loginMessage, "Invalid role/username/password.", true);
    return;
  }

  setSession(role, username);
  loginForm.reset();
  showMessage(loginMessage, "Login successful.");
  passwordInput.type = "password";
  togglePasswordBtn.textContent = "Show";

  if (role === "teacher") setTeacherView();
  if (role === "student") setStudentView();
});

togglePasswordBtn.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  togglePasswordBtn.textContent = show ? "Hide" : "Show";
});

teacherLogoutBtn.addEventListener("click", () => {
  clearSession();
  setLoginView();
});

studentLogoutBtn.addEventListener("click", () => {
  clearSession();
  setLoginView();
});

slotForm.addEventListener("submit", (event) => {
  event.preventDefault();
  resetMessage(slotMessage);

  const code = normalizeCode(slotCodeInput.value);
  const name = slotNameInput.value.trim();

  if (!code || !name) {
    showMessage(slotMessage, "Please enter slot code and slot name.", true);
    return;
  }

  const slots = getSlots();
  const exists = slots.some((slot) => slot.code === code);
  if (exists) {
    showMessage(slotMessage, `Slot ${code} already exists.`, true);
    return;
  }

  slots.push({ code, name, questions: [] });
  saveSlots(slots);
  slotForm.reset();
  renderTeacherSlots();
  showMessage(slotMessage, `Slot ${code} created.`);
});

teacherQuestionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  resetMessage(questionMessage);

  const slotCode = slotSelect.value;
  const question = questionText.value.trim();
  const a = optionA.value.trim();
  const b = optionB.value.trim();
  const c = optionC.value.trim();
  const d = optionD.value.trim();
  const correct = correctAnswer.value;

  if (!slotCode || !question || !a || !b || !c || !d || !correct) {
    showMessage(questionMessage, "Please fill all question fields.", true);
    return;
  }

  const slots = getSlots();
  const slot = slots.find((s) => s.code === slotCode);
  if (!slot) {
    showMessage(questionMessage, "Selected slot not found.", true);
    return;
  }

  slot.questions.push({
    question,
    options: { A: a, B: b, C: c, D: d },
    correct
  });

  saveSlots(slots);
  renderTeacherSlots();
  clearTeacherQuestionForm();
  slotSelect.value = slotCode;
  showMessage(questionMessage, "Question saved to slot.");
});

importTxtBtn.addEventListener("click", () => {
  resetMessage(importMessage);
  const slotCode = importSlotSelect.value;
  const file = txtImportFile.files && txtImportFile.files[0];

  if (!slotCode) {
    showMessage(importMessage, "Please choose a slot for import.", true);
    return;
  }

  if (!file) {
    showMessage(importMessage, "Please select a .txt file.", true);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    const { parsedQuestions, skipped } = parseQuestionsFromText(text);

    if (parsedQuestions.length === 0) {
      showMessage(importMessage, "No valid questions found in file.", true);
      return;
    }

    const slots = getSlots();
    const slot = slots.find((s) => s.code === slotCode);
    if (!slot) {
      showMessage(importMessage, "Selected slot not found.", true);
      return;
    }

    slot.questions.push(...parsedQuestions);
    saveSlots(slots);
    renderTeacherSlots();
    txtImportFile.value = "";
    showMessage(
      importMessage,
      `Imported ${parsedQuestions.length} question(s). Skipped ${skipped} invalid block(s).`
    );
  };

  reader.onerror = () => {
    showMessage(importMessage, "Unable to read the selected file.", true);
  };

  reader.readAsText(file);
});

clearAllBtn.addEventListener("click", () => {
  saveSlots([]);
  renderTeacherSlots();
  renderStudentSlots();
  showMessage(slotMessage, "All slots removed.");
  resetMessage(questionMessage);
  resetMessage(importMessage);
});

studentSlotSelect.addEventListener("change", () => {
  renderStudentQuizBySlot(studentSlotSelect.value);
});

teacherDashGrid.addEventListener("click", (event) => {
  const target = event.target.closest(".dash-tile");
  if (!target) return;
  const moduleId = target.getAttribute("data-module");
  if (!moduleId) return;
  showTeacherModule(moduleId);
});

studentDashGrid.addEventListener("click", (event) => {
  const target = event.target.closest(".dash-tile");
  if (!target) return;
  const moduleId = target.getAttribute("data-module");
  if (!moduleId) return;
  showStudentModule(moduleId);
  if (moduleId === "studentQuizCard") {
    renderStudentQuizBySlot(studentSlotSelect.value);
  }
});

refreshStudentSlotsBtn.addEventListener("click", () => {
  renderStudentSlots();
});

backDashButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const role = btn.getAttribute("data-role");
    if (role === "teacher") {
      showTeacherModule(null);
      return;
    }
    if (role === "student") {
      showStudentModule(null);
    }
  });
});

editSlotSelect.addEventListener("change", () => {
  populateEditQuestionSelect();
});

editQuestionSelect.addEventListener("change", () => {
  loadEditQuestionFields();
});

saveEditBtn.addEventListener("click", () => {
  resetMessage(editMessage);
  const slotCode = editSlotSelect.value;
  const questionIndex = Number(editQuestionSelect.value);
  const question = editQuestionText.value.trim();
  const a = editOptionA.value.trim();
  const b = editOptionB.value.trim();
  const c = editOptionC.value.trim();
  const d = editOptionD.value.trim();
  const correct = editCorrectAnswer.value;

  if (!slotCode || Number.isNaN(questionIndex) || !question || !a || !b || !c || !d || !correct) {
    showMessage(editMessage, "Please fill all edit fields.", true);
    return;
  }

  const slots = getSlots();
  const slot = slots.find((s) => s.code === slotCode);
  if (!slot || !slot.questions[questionIndex]) {
    showMessage(editMessage, "Selected question not found.", true);
    return;
  }

  slot.questions[questionIndex] = {
    question,
    options: { A: a, B: b, C: c, D: d },
    correct
  };

  saveSlots(slots);
  renderTeacherSlots();
  populateEditSlotSelect();
  showMessage(editMessage, "Question updated.");
});

deleteQuestionBtn.addEventListener("click", () => {
  resetMessage(editMessage);
  const slotCode = editSlotSelect.value;
  const questionIndex = Number(editQuestionSelect.value);

  if (!slotCode || Number.isNaN(questionIndex)) {
    showMessage(editMessage, "Select a question to delete.", true);
    return;
  }

  const slots = getSlots();
  const slot = slots.find((s) => s.code === slotCode);
  if (!slot || !slot.questions[questionIndex]) {
    showMessage(editMessage, "Selected question not found.", true);
    return;
  }

  slot.questions.splice(questionIndex, 1);
  saveSlots(slots);
  renderTeacherSlots();
  populateEditSlotSelect();
  showMessage(editMessage, "Question deleted.");
});

exportBackupBtn.addEventListener("click", () => {
  resetMessage(backupMessage);
  const slots = getSlots();
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    slots
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `mcq-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showMessage(backupMessage, "Backup exported.");
});

importBackupBtn.addEventListener("click", () => {
  resetMessage(backupMessage);
  const file = importBackupFile.files && importBackupFile.files[0];
  if (!file) {
    showMessage(backupMessage, "Please select a backup JSON file.", true);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const slots = Array.isArray(parsed) ? parsed : parsed.slots;
      if (!isValidSlotData(slots)) {
        showMessage(backupMessage, "Invalid backup format.", true);
        return;
      }

      saveSlots(slots);
      renderTeacherSlots();
      renderStudentSlots();
      importBackupFile.value = "";
      showMessage(backupMessage, `Backup restored. Loaded ${slots.length} slot(s).`);
    } catch (error) {
      showMessage(backupMessage, "Could not read backup JSON.", true);
    }
  };

  reader.onerror = () => {
    showMessage(backupMessage, "Unable to read selected file.", true);
  };

  reader.readAsText(file);
});

studentForm.addEventListener("change", () => {
  persistCurrentAnswerIfSelected();
  renderStudentPreview();
});

prevQuestionBtn.addEventListener("click", () => {
  if (quizState.currentIndex === 0) return;
  persistCurrentAnswerIfSelected();
  quizState.currentIndex -= 1;
  resultBox.innerHTML = "";
  renderCurrentStudentQuestion();
});

submitQuizBtn.addEventListener("click", () => {
  const slotCode = studentSlotSelect.value;
  const slots = getSlots();
  const slot = slots.find((s) => s.code === slotCode);

  if (!slot || slot.questions.length === 0) {
    resultBox.innerHTML = "<p>No questions to submit.</p>";
    prevQuestionBtn.disabled = true;
    return;
  }

  const selected = studentForm.querySelector('input[name="current_question"]:checked');
  if (!selected) {
    resultBox.innerHTML = '<p class="wrong-text">Please select an option to continue \u274C</p>';
    return;
  }

  const currentIndex = quizState.currentIndex;
  quizState.answers[currentIndex] = selected.value;
  renderStudentPreview();
  resultBox.innerHTML = "";

  const isLast = currentIndex === slot.questions.length - 1;
  if (!isLast) {
    quizState.currentIndex += 1;
    renderCurrentStudentQuestion();
    return;
  }

  let score = 0;
  const totalMarks = slot.questions.length;
  const review = [];

  slot.questions.forEach((q, index) => {
    const answer = quizState.answers[index];
    const isCorrect = answer === q.correct;
    if (isCorrect) score += 1;

    review.push(
      `<li><strong>Q${index + 1}:</strong> ${
        isCorrect
          ? '<span class="correct-text">Correct \u2705</span>'
          : '<span class="wrong-text">Wrong \u274C</span>'
      }</li>`
    );
  });

  resultBox.innerHTML = `
    <h4>${slot.code} - ${slot.name}</h4>
    <h3>Score: ${score} / ${totalMarks} ${getScoreEmoji(score, totalMarks)}</h3>
    <ul class="result-status-list">${review.join("")}</ul>
  `;
});

async function init() {
  await initDataStore();
  const session = getSession();
  if (!session) {
    setLoginView();
    return;
  }

  if (session.role === "teacher") {
    setTeacherView();
    return;
  }

  if (session.role === "student") {
    setStudentView();
    return;
  }

  setLoginView();
}

init();
