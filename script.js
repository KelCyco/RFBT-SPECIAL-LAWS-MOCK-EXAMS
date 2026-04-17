let questions = [];
let timeLeft = 300;
let timerInterval;

document.getElementById('upload').addEventListener('change', handleFile);

function handleFile(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function(evt) {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    questions = XLSX.utils.sheet_to_json(sheet);

    renderQuiz();
    startTimer();
  };

  reader.readAsArrayBuffer(file);
}

function renderQuiz() {
  const quizDiv = document.getElementById('quiz');
  quizDiv.innerHTML = '';

  questions.forEach((q, index) => {
    quizDiv.innerHTML += `
      <div class="question">
        <p>${index + 1}. ${q.Question}</p>

        ${['A','B','C','D'].map(opt => `
          <label>
            <input type="radio" name="q${index}" value="${opt}">
            ${q[opt]}
          </label><br>
        `).join('')}
      </div>
    `;
  });
}

function startTimer() {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    document.getElementById('timer').innerText = `Time: ${timeLeft}s`;
    timeLeft--;

    if (timeLeft < 0) {
      clearInterval(timerInterval);
      submitQuiz();
    }
  }, 1000);
}

function submitQuiz() {
  clearInterval(timerInterval);

  let score = 0;
  let output = '';

  questions.forEach((q, index) => {
    const selected = document.querySelector(`input[name="q${index}"]:checked`);
    const userAnswer = selected ? selected.value : "No answer";

    if (userAnswer === q.Answer) {
      score++;
      output += `<p class="correct">Q${index+1}: Correct</p>`;
    } else {
      output += `<p class="wrong">
        Q${index+1}: Wrong 
        (Your: ${userAnswer} | Correct: ${q.Answer})
      </p>`;
    }
  });

  document.getElementById('result').innerHTML = `
    <h2>Score: ${score}/${questions.length}</h2>
    ${output}
  `;
}