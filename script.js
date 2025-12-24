// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDwGzTPmFg-gjoYtNWNJM47p22NfBugYFA",
    authDomain: "mock-test-1eea6.firebaseapp.com",
    databaseURL: "https://mock-test-1eea6-default-rtdb.firebaseio.com",
    projectId: "mock-test-1eea6",
    storageBucket: "mock-test-1eea6.firebaseapp.com",
    messagingSenderId: "111849173136",
    appId: "1:111849173136:web:8b211f58d854119e88a815",
    measurementId: "G-5RLWPTP8YD"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Variables
let quizData = {};
let currIdx = 0;
let score = 0;
let userAns = [];
let timerInterval;

// Get Quiz ID from URL
const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get('quiz');

// 1. Direct Load (No Login Check)
window.onload = function() {
    if(!quizId) {
        document.body.innerHTML = "<h2 style='text-align:center; padding:20px;'>কোনো কুইজ লিংক পাওয়া যায়নি!</h2>";
        return;
    }
    loadQuiz();
};

function loadQuiz() {
    db.ref('quizzes/'+quizId).once('value', s => {
        quizData = s.val();
        if(!quizData) {
            alert("Quiz not found or Deleted!");
            return;
        }
        
        // Update UI Info
        document.getElementById('quiz-title').innerText = quizData.title;
        document.getElementById('total-q').innerText = quizData.questions ? quizData.questions.length : 0;
        document.getElementById('total-time').innerText = quizData.time;
        document.getElementById('total-marks').innerText = (quizData.questions.length * quizData.positive).toFixed(0);
        document.getElementById('neg-mark').innerText = quizData.negative;
    });
}

// 2. Start Exam
document.getElementById('start-btn').onclick = () => {
    if(!quizData.questions) return alert("প্রশ্ন লোড হচ্ছে, একটু অপেক্ষা করুন...");
    
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('quiz-screen').classList.add('active');
    
    // Timer Start
    startTimer(quizData.time * 60);
    loadQuestion();
};

function startTimer(sec) {
    timerInterval = setInterval(() => {
        sec--;
        let m = Math.floor(sec/60), s = sec%60;
        document.getElementById('timer').innerText = `${m}:${s<10?'0'+s:s}`;
        if(sec <= 0) submitQuiz();
    }, 1000);
}

// 3. Question Load
function loadQuestion() {
    if(currIdx >= quizData.questions.length) return submitQuiz();
    
    const q = quizData.questions[currIdx];
    document.getElementById('curr-q-no').innerText = currIdx+1;
    document.getElementById('question-text').innerHTML = q.question;
    document.getElementById('q-mark-val').innerText = quizData.positive;
    
    const div = document.getElementById('options-container');
    div.innerHTML = '';
    
    q.options.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'option';
        btn.innerText = opt;
        
        // If already answered, show selection
        if(userAns[currIdx] === opt) btn.classList.add('selected');
        
        btn.onclick = () => {
            document.querySelectorAll('.option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            userAns[currIdx] = opt;
            
            // Auto Next after 300ms
            setTimeout(() => {
                currIdx++;
                loadQuestion();
            }, 300);
        };
        div.appendChild(btn);
    });
    
    // MathJax Render
    if(window.renderMathInElement) renderMathInElement(div);
}

document.getElementById('skip-btn').onclick = () => {
    // If not selected, mark null
    if(!userAns[currIdx]) userAns[currIdx] = null;
    currIdx++;
    loadQuestion();
};

document.getElementById('submit-btn').onclick = () => {
    if(confirm("আপনি কি সাবমিট করতে চান?")) submitQuiz();
};

// 4. Submit & Calculation
function submitQuiz() {
    clearInterval(timerInterval);
    document.getElementById('quiz-screen').classList.remove('active');
    document.getElementById('result-screen').classList.add('active');
    
    let correct = 0, wrong = 0;
    score = 0;
    
    quizData.questions.forEach((q, i) => {
        if(userAns[i] === q.answer) {
            score += parseFloat(quizData.positive);
            correct++;
        } else if(userAns[i] != null) { // Answered but wrong
            score -= parseFloat(quizData.negative);
            wrong++;
        }
    });
    
    // Prevent negative score display (Optional)
    if(score < 0) score = 0;
    
    const totalM = quizData.questions.length * quizData.positive;
    const passM = (totalM * quizData.passMark) / 100;
    
    document.getElementById('final-score').innerText = score.toFixed(2);
    document.getElementById('res-correct').innerText = correct;
    document.getElementById('res-wrong').innerText = wrong;
    
    document.getElementById('result-status').innerText = score >= passM ? "PASSED 🎉" : "FAILED 😢";
    document.getElementById('result-status').style.color = score >= passM ? "green" : "red";
    
    // NOTE: Since no login, we are NOT saving result to database to prevent errors.
}

// 5. View Solutions
document.getElementById('view-sol-btn').onclick = () => {
    document.getElementById('solution-container').style.display = 'block';
    const list = document.getElementById('sol-list');
    list.innerHTML = '';
    
    quizData.questions.forEach((q, i) => {
        const myAns = userAns[i];
        let statusClass = myAns === q.answer ? 'correct' : (myAns ? 'wrong' : '');
        
        list.innerHTML += `
            <div class="sol-card ${statusClass}">
                <p><b>Q${i+1}. ${q.question}</b></p>
                <div style="display:flex; justify-content:space-between; font-size:0.9rem;">
                    <span style="color:green">✔ সঠিক: ${q.answer}</span>
                    <span style="color:${myAns===q.answer?'green':(myAns?'red':'#777')}">
                        👤 আপনার: ${myAns || 'Skipped'}
                    </span>
                </div>
                ${q.explanation ? `<div class="exp-box">💡 <b>ব্যাখ্যা:</b> ${q.explanation}</div>` : ''}
            </div>`;
    });
    
    if(window.renderMathInElement) renderMathInElement(list);
    document.getElementById('view-sol-btn').style.display = 'none'; // Hide button after click
};