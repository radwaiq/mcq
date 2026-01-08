let ALL = [];
let SESSION = {
  questions: [],
  answers: {},   // {questionId: chosenIndex}
  cursor: 0
};

const el = (id) => document.getElementById(id);

const views = {
  setup: el("setupView"),
  quiz: el("quizView"),
  result: el("resultView"),
  review: el("reviewView"),
};

const statusPill = el("statusPill");

// Setup controls
const lectureSelect = el("lectureSelect");
const countSelect = el("countSelect");
const shuffleToggle = el("shuffleToggle");
const startBtn = el("startBtn");
const metaInfo = el("metaInfo");

// Quiz controls
const progressText = el("progressText");
const questionText = el("questionText");
const choicesBox = el("choicesBox");
const prevBtn = el("prevBtn");
const nextBtn = el("nextBtn");
const finishBtn = el("finishBtn");

// Results
const correctCountEl = el("correctCount");
const wrongCountEl = el("wrongCount");
const percentTextEl = el("percentText");
const reviewBtn = el("reviewBtn");
const restartBtn = el("restartBtn");

// Review
const wrongList = el("wrongList");
const backToResultBtn = el("backToResultBtn");
const retryWrongBtn = el("retryWrongBtn");

function show(viewName){
  Object.values(views).forEach(v => v.classList.add("hidden"));
  views[viewName].classList.remove("hidden");
}

function setStatus(txt){
  statusPill.textContent = txt;
}

function shuffle(arr){
  const a = [...arr];
  for (let i=a.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueLectures(){
  const set = new Set(
    ALL.map(q => (q.lecture || "").trim()).filter(Boolean)
  );
  return Array.from(set);
}

function fillLectureSelect(){
  const lectures = uniqueLectures();
  lectureSelect.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "__ALL__";
  optAll.textContent = `كل المحاضرات (${ALL.length})`;
  lectureSelect.appendChild(optAll);

  lectures.forEach(l => {
    const count = ALL.filter(q => (q.lecture||"").trim() === l).length;
    const opt = document.createElement("option");
    opt.value = l;
    opt.textContent = `${l} (${count})`;
    lectureSelect.appendChild(opt);
  });

  metaInfo.textContent = `عدد الأسئلة في الملف: ${ALL.length}`;
}

function buildSession({fromWrongOnly=false} = {}){
  const lecture = lectureSelect.value;
  let pool = [];

  if (fromWrongOnly){
    // Only questions the user answered wrong in the *previous* session
    pool = SESSION.questions.filter(q => {
      const chosen = SESSION.answers[q.id];
      return chosen !== undefined && chosen !== q.correctIndex;
    });
  } else {
    pool = lecture === "__ALL__"
      ? [...ALL]
      : ALL.filter(q => (q.lecture||"").trim() === lecture);
  }

  if (shuffleToggle.checked){
    pool = shuffle(pool);
  }

  const countVal = countSelect.value;
  if (countVal !== "all"){
    const n = Math.max(1, Number(countVal) || 10);
    pool = pool.slice(0, Math.min(n, pool.length));
  }

  SESSION = {
    questions: pool,
    answers: {},
    cursor: 0
  };
}

function render(){
  const q = SESSION.questions[SESSION.cursor];
  if (!q) return;

  progressText.textContent = `${SESSION.cursor + 1} / ${SESSION.questions.length}`;
  questionText.textContent = q.question || "";

  choicesBox.innerHTML = "";
  const chosen = SESSION.answers[q.id];

  (q.choices || []).forEach((choiceText, idx) => {
    const row = document.createElement("label");
    row.className = "choice" + (chosen === idx ? " selected" : "");
    row.innerHTML = `
      <input type="radio" name="choice" ${chosen === idx ? "checked" : ""}/>
      <div class="choiceText">${choiceText}</div>
    `;
    row.addEventListener("click", () => {
      SESSION.answers[q.id] = idx;
      render();
    });
    choicesBox.appendChild(row);
  });

  prevBtn.disabled = SESSION.cursor === 0;
  nextBtn.textContent = (SESSION.cursor === SESSION.questions.length - 1) ? "إنهاء" : "التالي";
}

function next(){
  if (SESSION.cursor < SESSION.questions.length - 1){
    SESSION.cursor++;
    render();
  } else {
    finish();
  }
}

function prev(){
  if (SESSION.cursor > 0){
    SESSION.cursor--;
    render();
  }
}

function calcScore(){
  let correct = 0;
  let wrong = 0;

  for (const q of SESSION.questions){
    const chosen = SESSION.answers[q.id];
    if (chosen === undefined) continue; // unanswered ignored
    if (chosen === q.correctIndex) correct++;
    else wrong++;
  }
  const answered = correct + wrong;
  const percent = answered === 0 ? 0 : Math.round((correct / answered) * 100);
  return { correct, wrong, answered, percent };
}

function finish(){
  const {correct, wrong, percent} = calcScore();
  correctCountEl.textContent = correct;
  wrongCountEl.textContent = wrong;
  percentTextEl.textContent = `${percent}%`;

  setStatus("انتهى الاختبار");
  show("result");
}

function buildWrongReview(){
  wrongList.innerHTML = "";
  const wrongQs = SESSION.questions.filter(q => {
    const chosen = SESSION.answers[q.id];
    return chosen !== undefined && chosen !== q.correctIndex;
  });

  if (wrongQs.length === 0){
    wrongList.innerHTML = `<div class="wrongCard"><div class="q">لا توجد أخطاء 🎉</div></div>`;
    return;
  }

  wrongQs.forEach(q => {
    const chosen = SESSION.answers[q.id];
    const card = document.createElement("div");
    card.className = "wrongCard";
    card.innerHTML = `
      <div class="meta">
        <span class="badge">${(q.lecture || "Lecture").trim()}</span>
        ${q.section ? `<span class="badge">${q.section}</span>` : ""}
      </div>
      <div class="q">${q.question || ""}</div>
      <div class="row"><b>إجابتك:</b> ${q.choices?.[chosen] ?? "—"}</div>
      <div class="row"><b>الصحيح:</b> ${q.choices?.[q.correctIndex] ?? "—"}</div>
    `;
    wrongList.appendChild(card);
  });
}

function safeNormalizeQuestions(data){
  // Ensure expected shape and 0-based correctIndex
  const out = [];
  for (const item of (Array.isArray(data) ? data : [])){
    if (!item || !item.question || !Array.isArray(item.choices)) continue;

    let correctIndex = item.correctIndex;
    if (typeof correctIndex !== "number"){
      correctIndex = Number(correctIndex);
    }

    // If data is accidentally 1-based and within 1..choices.length, convert to 0-based
    if (Number.isFinite(correctIndex) && correctIndex >= 1 && correctIndex <= item.choices.length && ![0,1,2,3].includes(correctIndex) && item.choices.length === 4) {
      // leave as-is (rare case); but we won't assume
    }
    // Heuristic: if correctIndex equals choices.length (e.g., 4) likely 1-based; convert
    if (Number.isFinite(correctIndex) && correctIndex >= 1 && correctIndex <= item.choices.length && correctIndex === item.choices.length){
      correctIndex = correctIndex - 1;
    }

    out.push({
      id: item.id ?? out.length + 1,
      lecture: item.lecture ?? "",
      section: item.section ?? "",
      question: String(item.question),
      choices: item.choices.map(String),
      correctIndex: Number.isFinite(correctIndex) ? correctIndex : null,
    });
  }
  return out;
}

async function init(){
  el("year").textContent = new Date().getFullYear();

  setStatus("تحميل الأسئلة...");
  try{
    const res = await fetch("questions.json", { cache: "no-store" });
    if (!res.ok) throw new Error("تعذر تحميل questions.json");
    const data = await res.json();

    ALL = safeNormalizeQuestions(data);

    if (ALL.length === 0){
      setStatus("لا توجد أسئلة");
      metaInfo.textContent = "لم يتم العثور على أسئلة صالحة داخل questions.json";
      return;
    }

    fillLectureSelect();
    setStatus("جاهز");
    show("setup");
  } catch (e){
    console.error(e);
    setStatus("خطأ");
    metaInfo.textContent = "تأكد أن ملف questions.json موجود بجانب index.html وبنفس الاسم.";
  }
}

// Events
startBtn.addEventListener("click", () => {
  buildSession({fromWrongOnly:false});
  if (SESSION.questions.length === 0){
    setStatus("لا توجد أسئلة");
    metaInfo.textContent = "لا توجد أسئلة لهذا الاختيار.";
    return;
  }
  setStatus("جارٍ الاختبار");
  show("quiz");
  render();
});

nextBtn.addEventListener("click", next);
prevBtn.addEventListener("click", prev);
finishBtn.addEventListener("click", finish);

reviewBtn.addEventListener("click", () => {
  buildWrongReview();
  show("review");
});

restartBtn.addEventListener("click", () => {
  setStatus("جاهز");
  show("setup");
});

backToResultBtn.addEventListener("click", () => {
  show("result");
});

retryWrongBtn.addEventListener("click", () => {
  const prevSession = SESSION; // keep a copy for wrong extraction
  // Build new session from wrong questions of previous session
  SESSION = prevSession;
  buildSession({fromWrongOnly:true});
  if (SESSION.questions.length === 0){
    buildWrongReview();
    return;
  }
  setStatus("إعادة للأخطاء");
  show("quiz");
  render();
});

init();
