const GAS_URL = 'https://script.google.com/macros/s/AKfycbzuYh7IvAap7G_GjZH2GpLf6DEVujUynmBAQQYztj9aNNze7M6DHS9IBqWl5Oxepn3c/exec';
const ADMIN_EMAIL = 'kellygancayco@gmail.com';

const ADMIN_BYPASS = false;

const EXAM_WINDOW = {
  start: new Date('2026-01-01T00:00:00'),
  end: new Date('2026-04-23T23:59:59')
};

let questions = [];
let timeLeft = 10800;
let timerInterval;
let submitted = false;
let currentTest = null;
let currentEmail = null;

window.addEventListener('copy', e => e.preventDefault());
window.addEventListener('paste', e => e.preventDefault());
window.addEventListener('cut', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    e.stopPropagation();
  }
});

// ── Exam Date Display ─────────────────────────────────────

function formatExamDate(date) {
  return date.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function injectExamDates() {
  const closeStr = formatExamDate(EXAM_WINDOW.end);
  const label = `<div class="exam-date-range">Deadline: <strong style="color:#673ab7;">${closeStr}</strong></div>`;
  document.querySelectorAll('.exam-date-slot').forEach(el => el.innerHTML = label);
}

window.onload = () => {
  if (!checkExamWindow()) return;
  const savedEmail = localStorage.getItem('userEmail');
  const isAdmin = savedEmail && savedEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (savedEmail && !(isAdmin && ADMIN_BYPASS)) {
    currentEmail = savedEmail;
    showPage('selectionPage');
    checkForSavedProgress();
  } else {
    showPage('authPage');
    showAuthForm('landing');
  }

  injectExamDates(); // ← add this line
};

// ── Loading Overlay ───────────────────────────────────────

function showLoading(msg = 'Please wait...') {
  document.getElementById('loadingText').textContent = msg;
  document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('active');
}

// ── Exam Window ───────────────────────────────────────────

function checkExamWindow() {
  const now = new Date();
  if (now < EXAM_WINDOW.start) {
    const dateStr = EXAM_WINDOW.start.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = EXAM_WINDOW.start.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    showDateMessage('not-yet', `The examination will open on <strong>${dateStr}</strong> at <strong>${timeStr}</strong>.`);
    return false;
  }
  if (now > EXAM_WINDOW.end) {
    const dateStr = EXAM_WINDOW.end.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
    showDateMessage('ended', `The examination period ended on <strong>${dateStr}</strong>.`);
    return false;
  }
  return true;
}

function showDateMessage(type, message) {
  const icons = { 'not-yet': '🗓', 'ended': '🔒' };
  const titles = { 'not-yet': 'Not Yet Open', 'ended': 'Exam Closed' };
  document.getElementById('authPage').innerHTML = `
    <div style="text-align:center; padding:10px 0;">
      <div style="font-size:48px; margin-bottom:16px;">${icons[type]}</div>
      <h2 style="color:#673ab7; margin:0 0 12px;">${titles[type]}</h2>
      <p style="color:#555; line-height:1.6;">${message}</p>
      <p style="color:#888; font-size:13px; margin-top:20px;">Please contact your instructor for more information.</p>
    </div>
  `;
}

// ── Page Navigation ───────────────────────────────────────

function showPage(pageId) {
  ['authPage','selectionPage','startPage','quizPage'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  document.getElementById(pageId).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showAuthForm(form) {
  ['authLanding','authRegister','authLogin'].forEach(id =>
    document.getElementById(id).classList.add('hidden')
  );
  hideAuthMsg();
  if (form === 'landing') document.getElementById('authLanding').classList.remove('hidden');
  if (form === 'register') {
    document.getElementById('authRegister').classList.remove('hidden');
    showRegisterStep(1);
  }
  if (form === 'login') document.getElementById('authLogin').classList.remove('hidden');
}

function showRegisterStep(step) {
  ['registerStep1','registerStep2','registerStep3'].forEach(id =>
    document.getElementById(id).classList.add('hidden')
  );
  document.getElementById(`registerStep${step}`).classList.remove('hidden');
}

// ── Auth Messages ─────────────────────────────────────────

function showAuthMsg(msg, type = 'error') {
  const el = document.getElementById('authMsg');
  el.textContent = msg;
  el.className = `auth-msg ${type}`;
  el.classList.remove('hidden');
}

function hideAuthMsg() {
  const el = document.getElementById('authMsg');
  el.classList.add('hidden');
}

// ── Passcode UI ───────────────────────────────────────────

function togglePasscodeView(prefix) {
  const inputId = prefix === 'reg' ? 'regPasscodeInput'
    : prefix === 'regConf' ? 'regConfirmInput'
    : 'loginPasscodeInput';
  const iconId = `${prefix}EyeIcon`;

  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);

  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`;
  } else {
    input.type = 'password';
    icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  }
}

function getPasscodeValue(prefix) {
  const inputId = prefix === 'reg' ? 'regPasscodeInput'
    : prefix === 'regConf' ? 'regConfirmInput'
    : 'loginPasscodeInput';
  return document.getElementById(inputId).value.trim();
}

// ── GAS Helper ────────────────────────────────────────────

function gasCall(data) {
  const url = GAS_URL + '?' + new URLSearchParams(data).toString();
  return fetch(url)
    .then(res => res.json())
    .catch(err => {
      console.error('gasCall error:', err);
      return { success: false, message: 'Network error. Please try again.' };
    });
}

function gasPost(data) { return gasCall(data); }
function gasGet(params) { return gasCall(params); }

// ── Register Flow ─────────────────────────────────────────

function registerSendCode() {
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  if (!email) { showAuthMsg('Please enter your email.'); return; }

  const btn = document.getElementById('regSendBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  hideAuthMsg();
  showLoading('Sending verification code...');

  gasCall({ action: 'registerEmail', email })
    .then(res => {
      if (res.success) {
        document.getElementById('regEmailDisplay').textContent = email;
        showRegisterStep(2);
        showAuthMsg('Verification code sent! Check your inbox.', 'success');
      } else {
        showAuthMsg(res.message);
      }
    })
    .finally(() => {
      hideLoading();
      btn.disabled = false;
      btn.textContent = 'Send Verification Code';
    });
}

function registerVerifyCode() {
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const code = document.getElementById('regCode').value.trim();
  if (!code) { showAuthMsg('Please enter the verification code.'); return; }

  const btn = document.getElementById('regVerifyBtn');
  btn.disabled = true;
  btn.textContent = 'Verifying...';
  hideAuthMsg();
  showLoading('Verifying code...');

  gasCall({ action: 'verifyCode', email, code })
    .then(res => {
      if (res.success) {
        showRegisterStep(3);
        hideAuthMsg();
      } else {
        showAuthMsg(res.message);
      }
    })
    .finally(() => {
      hideLoading();
      btn.disabled = false;
      btn.textContent = 'Verify Code';
    });
}

function registerSetPasscode() {
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const passcode = getPasscodeValue('reg');
  const confirm = getPasscodeValue('regConf');

  if (passcode.length < 4) { showAuthMsg('Passcode must be 4 digits.'); return; }
  if (!/^\d{4}$/.test(passcode)) { showAuthMsg('Passcode must be numbers only.'); return; }
  if (passcode !== confirm) { showAuthMsg('Passcodes do not match.'); return; }

  const btn = document.getElementById('regPasscodeBtn');
  btn.disabled = true;
  btn.textContent = 'Creating account...';
  hideAuthMsg();
  showLoading('Creating your account...');

  gasCall({ action: 'setPasscode', email, passcode })
    .then(res => {
      if (res.success) {
        showAuthMsg('Account created! Please log in.', 'success');
        document.getElementById('regEmail').value = '';
        document.getElementById('regPasscodeInput').value = '';
        document.getElementById('regConfirmInput').value = '';
        setTimeout(() => {
          showAuthForm('login');
          document.getElementById('loginEmail').value = email;
          hideAuthMsg();
        }, 1500);
      } else {
        showAuthMsg(res.message);
      }
    })
    .catch(() => showAuthMsg('Something went wrong. Please try again.'))
    .finally(() => {
      hideLoading();
      btn.disabled = false;
      btn.textContent = 'Create Account';
    });
}

// ── Login Flow ────────────────────────────────────────────

function loginSubmit() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const passcode = getPasscodeValue('login');

  if (!email) { showAuthMsg('Please enter your email.'); return; }
  if (!passcode) { showAuthMsg('Please enter your passcode.'); return; }
  if (passcode.length < 4) { showAuthMsg('Passcode must be 4 digits.'); return; }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Logging in...';
  hideAuthMsg();
  showLoading('Logging in...');

  gasCall({ action: 'login', email, passcode })
    .then(res => {
      console.log('Login response:', res);
      if (res.success) {
        localStorage.setItem('userEmail', email);
        currentEmail = email;
        showPage('selectionPage');
        checkForSavedProgress();
      } else {
        showAuthMsg(res.message || 'Login failed. Please try again.');
      }
    })
    .catch(err => {
      console.error('Login error:', err);
      showAuthMsg('Something went wrong. Please try again.');
    })
    .finally(() => {
      hideLoading();
      btn.disabled = false;
      btn.textContent = 'Log In';
    });
}

// ── Selection & Progress ──────────────────────────────────

function checkForSavedProgress() {
  const savedTest = localStorage.getItem('currentTest');
  const savedAnswers = savedTest ? localStorage.getItem(`answers_test${savedTest}`) : null;
  const savedTime = savedTest ? localStorage.getItem(`timeLeft_test${savedTest}`) : null;

  document.querySelectorAll('.continue-btn').forEach(btn => btn.classList.add('hidden'));

  if (savedTest && (savedAnswers || savedTime)) {
    currentTest = parseInt(savedTest);
    const continueBtn = document.getElementById(`continueBtn${savedTest}`);
    if (continueBtn) continueBtn.classList.remove('hidden');
  }
}

function selectTest(testNumber) {
  currentTest = testNumber;
  localStorage.setItem('currentTest', testNumber);

  const testNames = { 1: 'Simulation Examination 1', 2: 'Simulation Examination 2' };
  document.getElementById('startTestName').textContent = testNames[testNumber];

  const introTexts = {
    1: `
      <p>This simulation examination consists of <strong>100 items</strong>, designed to reflect a <strong>departmental examination format</strong>, covering all topics in Special Laws, <strong>except RA 10607 (Insurance Law)</strong>.</p>
      <p>You are given <strong>3 hours</strong> to complete the test. Manage your time wisely.</p>
      <p>Read each item carefully before selecting your answer. Treat this as the actual exam.</p>
      <p><strong>Important:</strong> This is a one-time attempt. Answer all questions before submitting.</p>
    `,
    2: `
      <p>This simulation examination consists of <strong>45 items</strong> covering Special Laws topics.</p>
      <p>You are given <strong>3 hours</strong> to complete it.</p>
      <p><strong>Important:</strong> This is a one-time attempt. Answer all questions before submitting.</p>
    `
  };
  document.getElementById('startIntro').innerHTML = introTexts[testNumber];

  const isAdmin = currentEmail && currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  if (isAdmin && ADMIN_BYPASS) {
    showPage('startPage');
    return;
  }

  showLoading('Checking exam status...');

  gasCall({ action: 'checkTaken', email: currentEmail, testNumber })
    .then(res => {
      if (res.success && res.examsTaken >= 1) {
        showLockedResult(testNumber);
      } else {
        showPage('startPage');
      }
    })
    .catch(() => showPage('startPage'))
    .finally(() => hideLoading());
}

function showLockedResult(testNumber) {
  document.getElementById('quiz').innerHTML = '';
  document.getElementById('quiz').style.display = 'none';
  document.getElementById('submitBtn').style.display = 'none';

  const resultScreen = document.getElementById('resultScreen');
  resultScreen.classList.remove('hidden');
  document.getElementById('resultMessage').textContent = 'You have already completed this examination.';
  document.querySelector('.result-complete').textContent = 'Examination Locked';

  showLoading('Loading your results...');

  gasCall({ action: 'getScore', email: currentEmail, testNumber })
    .then(res => {
      if (res.success && res.score !== undefined) {
        document.getElementById('statRaw').textContent = `${res.score} / ${res.total}`;
        document.getElementById('statCorrect').textContent = res.score;
        document.getElementById('statWrong').textContent = res.total - res.score;
        document.getElementById('statTime').textContent = res.timeUsed || '--:--:--';
        document.getElementById('donutPercent').textContent = res.percent + '%';
        animateDonut(res.score, res.total);
      }
    })
    .finally(() => hideLoading());

  showPage('quizPage');
}

function continueTest(testNumber) {
  currentTest = testNumber;
  localStorage.setItem('currentTest', testNumber);
  submitted = false;
  const savedTime = localStorage.getItem(`timeLeft_test${currentTest}`);
  if (savedTime) timeLeft = parseInt(savedTime);
  showPage('quizPage');
  loadQuestions(true);
}

function startQuiz() {
  localStorage.removeItem(`timeLeft_test${currentTest}`);
  localStorage.removeItem(`answers_test${currentTest}`);
  submitted = false;
  timeLeft = 10800;
  showPage('quizPage');
  loadQuestions(false);
}

// ── Quiz ──────────────────────────────────────────────────

function loadQuestions(isResuming = false) {
  showLoading('Loading exam questions...');
  const fileMap = { 1: 'questions.json', 2: 'questions2.json' };
  const file = fileMap[currentTest] || 'questions.json';
  fetch(file)
    .then(res => res.json())
    .then(data => {
      questions = data;
      renderQuiz();
      startTimer();
    })
    .catch(err => console.log('Failed to load questions:', err))
    .finally(() => hideLoading());
}

function renderQuiz() {
  const quizDiv = document.getElementById('quiz');
  quizDiv.innerHTML = '';
  quizDiv.style.display = '';

  questions.forEach((q, index) => {
    quizDiv.innerHTML += `
      <div class="card" id="card-${index}">
        <div class="question-header">
          <div class="question-text"><b>${index + 1}. ${q.Question}</b></div>
          <div id="icon-${index}" class="icon"></div>
        </div>
        ${['A','B','C','D'].map(opt => `
          <label class="option" id="opt-${index}-${opt}">
            <input type="radio" name="q${index}" value="${opt}">
            ${q[opt]}
          </label>
        `).join('')}
      </div>
    `;
  });
  restoreAnswers();
}

function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function updateTimerBar() {
  const percent = Math.max(0, (timeLeft / 10800) * 100);
  const bar = document.getElementById('timerBar');
  if (!bar) return;
  bar.style.width = percent + '%';
  if (percent > 50) bar.style.background = '#34a853';
  else if (percent > 20) bar.style.background = '#fbbc04';
  else bar.style.background = '#ea4335';
}

function startTimer() {
  clearInterval(timerInterval);
  document.getElementById('timer').innerText = formatTime(timeLeft);
  updateTimerBar();
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').innerText = formatTime(timeLeft);
    updateTimerBar();
    localStorage.setItem(`timeLeft_test${currentTest}`, timeLeft);
    if (timeLeft < 0) { clearInterval(timerInterval); submitQuiz(); }
  }, 1000);
}

function submitQuiz() {
  if (submitted) return;
  submitted = true;
  clearInterval(timerInterval);

  let score = 0;
  const timeUsed = 10800 - timeLeft;

  questions.forEach((q, index) => {
    const selected = document.querySelector(`input[name="q${index}"]:checked`);
    if (selected && selected.value === q.Answer) score++;
  });

  document.getElementById('quiz').style.display = 'none';

  const total = questions.length;
  const wrong = total - score;
  const percent = Math.round((score / total) * 100);

  document.getElementById('statRaw').textContent = `${score} / ${total}`;
  document.getElementById('statCorrect').textContent = score;
  document.getElementById('statWrong').textContent = wrong;

  const hrs = Math.floor(timeUsed / 3600);
  const mins = Math.floor((timeUsed % 3600) / 60);
  const secs = timeUsed % 60;
  const timeStr = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  document.getElementById('statTime').textContent = timeStr;

  let msg = '';
  if (percent >= 90) msg = 'Outstanding! Excellent work!';
  else if (percent >= 75) msg = "Great job! You passed with flying colors!";
  else if (percent >= 50) msg = "Good effort! Keep reviewing and you'll do even better.";
  else msg = "Don't give up! Review the material and try again.";
  document.getElementById('resultMessage').textContent = msg;

  document.getElementById('resultScreen').classList.remove('hidden');
  document.getElementById('submitBtn').style.display = 'none';

  animateDonut(score, total);
  launchConfetti();

  const isAdmin = currentEmail && currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  if (!isAdmin || !ADMIN_BYPASS) {
    showLoading('Submitting your answers...');
    gasCall({
      action: 'saveScore',
      email: currentEmail,
      testNumber: currentTest,
      score,
      total,
      percent,
      timeUsed: timeStr
    }).finally(() => hideLoading());
  }

  localStorage.removeItem(`timeLeft_test${currentTest}`);
  localStorage.removeItem(`answers_test${currentTest}`);
  localStorage.removeItem('currentTest');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function animateDonut(score, total) {
  setTimeout(() => {
    const circumference = 2 * Math.PI * 45;
    const wrong = total - score;
    const correctArc = (score / total) * circumference;
    const wrongArc = (wrong / total) * circumference;
    const percent = Math.round((score / total) * 100);

    const correctCircle = document.getElementById('donutCorrect');
    const wrongCircle = document.getElementById('donutWrong');

    correctCircle.style.transition = 'none';
    wrongCircle.style.transition = 'none';
    correctCircle.setAttribute('stroke-dasharray', `0 ${circumference}`);
    correctCircle.setAttribute('transform', 'rotate(-90 60 60)');
    wrongCircle.setAttribute('stroke-dasharray', `0 ${circumference}`);
    wrongCircle.setAttribute('transform', 'rotate(-90 60 60)');

    correctCircle.getBoundingClientRect();
    wrongCircle.getBoundingClientRect();

    correctCircle.style.transition = 'stroke-dasharray 1.2s ease';
    correctCircle.setAttribute('stroke-dasharray', `${correctArc} ${circumference}`);

    setTimeout(() => {
      const correctDeg = (score / total) * 360 - 90;
      wrongCircle.setAttribute('transform', `rotate(${correctDeg} 60 60)`);
      wrongCircle.getBoundingClientRect();
      wrongCircle.style.transition = 'stroke-dasharray 1s ease';
      wrongCircle.setAttribute('stroke-dasharray', `${wrongArc} ${circumference}`);
    }, 1300);

    let p = 0;
    const counter = setInterval(() => {
      p++;
      document.getElementById('donutPercent').textContent = p + '%';
      if (p >= percent) clearInterval(counter);
    }, 1200 / (percent || 1));
  }, 100);
}

window.addEventListener('change', () => {
  if (submitted) return;
  const answers = {};
  questions.forEach((q, index) => {
    const selected = document.querySelector(`input[name="q${index}"]:checked`);
    if (selected) answers[index] = selected.value;
  });
  localStorage.setItem(`answers_test${currentTest}`, JSON.stringify(answers));
});

function restoreAnswers() {
  const saved = JSON.parse(localStorage.getItem(`answers_test${currentTest}`)) || {};
  Object.keys(saved).forEach(index => {
    const input = document.querySelector(`input[name="q${index}"][value="${saved[index]}"]`);
    if (input) input.checked = true;
  });
}

function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    r: Math.random() * 8 + 4,
    d: Math.random() * 80 + 20,
    color: ['#673ab7','#34a853','#fbbc04','#ea4335','#4285f4'][Math.floor(Math.random()*5)],
    tilt: Math.random() * 10 - 5,
    tiltAngle: 0,
    tiltSpeed: Math.random() * 0.1 + 0.05
  }));
  let angle = 0, frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    angle += 0.01;
    pieces.forEach(p => {
      p.tiltAngle += p.tiltSpeed;
      p.y += (Math.cos(angle + p.d) + 2);
      p.x += Math.sin(angle) * 0.5;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();
    });
    if (pieces.some(p => p.y < canvas.height)) frame = requestAnimationFrame(draw);
    else canvas.remove();
  }
  draw();
  setTimeout(() => { cancelAnimationFrame(frame); canvas.remove(); }, 4000);
}

function goToSelection() {
  submitted = false;
  clearInterval(timerInterval);
  currentTest = null;
  document.getElementById('resultScreen').classList.add('hidden');
  document.getElementById('submitBtn').style.display = '';
  document.getElementById('quiz').style.display = '';
  document.getElementById('quiz').innerHTML = '';
  showPage('selectionPage');
  checkForSavedProgress();
}

function resetQuiz() {
  submitted = false;
  timeLeft = 10800;
  localStorage.removeItem(`timeLeft_test${currentTest}`);
  localStorage.removeItem(`answers_test${currentTest}`);
  document.getElementById('resultScreen').classList.add('hidden');
  document.getElementById('submitBtn').style.display = '';
  document.getElementById('quiz').style.display = '';
  document.getElementById('quiz').innerHTML = '';
  showPage('quizPage');
  loadQuestions(false);
}