// --- Questions Database (Default if not loaded) ---
const questionsSource = [
    {
      question_bn: "Demo Question?",
      question_en: "Demo Question?",
      options_bn: ["A", "B", "C", "D"],
      options_en: ["A", "B", "C", "D"],
      correctIndex: 0 
    }
];

// --- Firebase Config ---
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
const database = firebase.database();

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Globals ---
let questions = [];
let currentIdx = 0;
let status, userAnswers;
let isSubmitted = false;
let currentLang = 'bn'; 
let timerInterval;
let timeLeft = 90 * 60; // Default 90 mins
let isPaused = false;
let filteredIndices = [];

// --- Init ---
function initQuestions(sourceData) {
    let tempQuestions = JSON.parse(JSON.stringify(sourceData));
    tempQuestions.forEach(q => {
        let indices = [0, 1, 2, 3];
        shuffleArray(indices);
        let newOptBn = [], newOptEn = [];
        let newCorrectIndex = 0;
        indices.forEach((oldIndex, newIndex) => {
            newOptBn.push(q.options_bn[oldIndex]);
            newOptEn.push(q.options_en[oldIndex]);
            if (oldIndex === q.correctIndex) newCorrectIndex = newIndex;
        });
        q.options_bn = newOptBn;
        q.options_en = newOptEn;
        q.correctIndex = newCorrectIndex;
    });
    questions = shuffleArray(tempQuestions);
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('id');

    if (quizId) {
        document.getElementById('instContent').innerHTML = "<div style='text-align:center; padding:20px;'>Loading Quiz Details... Please wait.</div>";
        loadQuizFromFirebase(quizId);
    } else {
        alert("URL Error: No Quiz ID found.");
    }
});

function loadQuizFromFirebase(quizId) {
    database.ref('quizzes/' + quizId).once('value').then((snapshot) => {
        const data = snapshot.val();
        
        if (data && data.questions) {
            const processedQuestions = data.questions.map(q => {
                let correctIdx = q.options.indexOf(q.answer);
                if (correctIdx === -1) correctIdx = 0; 
                return {
                    question_bn: q.question, 
                    question_en: q.question, 
                    options_bn: q.options,
                    options_en: q.options,
                    correctIndex: correctIdx
                };
            });

            initQuestions(processedQuestions);
            
            if(data.title) {
                document.getElementById('instTitle').innerText = data.title;
            }
            if(data.duration) {
                timeLeft = parseInt(data.duration) * 60;
            }

            status = new Array(questions.length).fill(0); 
            userAnswers = new Array(questions.length).fill(null); 
            updateInstructions('en');
            
        } else {
            alert("Quiz not found.");
        }
    });
}

// --- Instructions (IMPROVED & PROFESSIONAL) ---
const translations = {
    en: {
        title: "General Instructions",
        choose: "Language: ",
        content: `
            <div style="font-family: 'Roboto', sans-serif; line-height: 1.8;">
                <h3 style="color:#00b5e2; margin-top:0;">Please read the instructions carefully</h3>
                
                <p><strong>1. General:</strong></p>
                <ul style="list-style-type: disc; margin-left: 20px;">
                    <li>Total duration of the examination is decided by the admin.</li>
                    <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.</li>
                    <li>When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
                </ul>

                <p><strong>2. Marking Scheme:</strong></p>
                <ul style="list-style-type: disc; margin-left: 20px;">
                    <li>Each Question carries <strong>+1 Mark</strong>.</li>
                    <li>For every wrong answer, <strong style="color:red;">0.33 Marks</strong> will be deducted.</li>
                    <li>No marks will be deducted for unattempted questions.</li>
                </ul>

                <p><strong>3. Answering a Question:</strong></p>
                <ul style="list-style-type: disc; margin-left: 20px;">
                    <li>To select your answer, click on the button of one of the options.</li>
                    <li>To deselect your chosen answer, click on the button of the chosen option again or click on the <strong>Clear Response</strong> button.</li>
                    <li>To save your answer, you MUST click on the <strong>Save & Next</strong> button.</li>
                    <li>To mark the question for review, click on the <strong>Mark for Review & Next</strong> button.</li>
                </ul>

                <br>
                <div style="background:#e3f2fd; padding:10px; border-radius:5px; text-align:center; font-weight:bold; color:#0d47a1;">
                    Best of Luck for your Exam!
                </div>
            </div>
        `,
        declaration: "I have read and understood the instructions. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test.",
        btn: "I am ready to begin"
    },
    bn: {
        title: "সাধারণ নির্দেশাবলী",
        choose: "ভাষা: ",
        content: `
            <div style="font-family: 'Roboto', sans-serif; line-height: 1.8;">
                <h3 style="color:#00b5e2; margin-top:0;">অনুগ্রহ করে নির্দেশাবলী মনোযোগ সহকারে পড়ুন</h3>
                
                <p><strong>১. সাধারণ নিয়মাবলী:</strong></p>
                <ul style="list-style-type: disc; margin-left: 20px;">
                    <li>পরীক্ষার মোট সময়কাল অ্যাডমিন দ্বারা নির্ধারিত।</li>
                    <li>সার্ভারে ঘড়ি সেট করা হয়েছে। স্ক্রিনের উপরের ডানদিকের কোণে কাউন্টডাউন টাইমারটি পরীক্ষার জন্য অবশিষ্ট সময় প্রদর্শন করবে।</li>
                    <li>টাইমার শূন্যে পৌঁছালে, পরীক্ষাটি স্বয়ংক্রিয়ভাবে শেষ হয়ে যাবে। আপনাকে আলাদাভাবে সাবমিট করতে হবে না।</li>
                </ul>

                <p><strong>২. মার্কিং স্কিম (Marking Scheme):</strong></p>
                <ul style="list-style-type: disc; margin-left: 20px;">
                    <li>প্রতিটি সঠিক উত্তরের জন্য <strong>+১ নম্বর</strong> দেওয়া হবে।</li>
                    <li>প্রতিটি ভুল উত্তরের জন্য <strong style="color:red;">০.৩৩ নম্বর</strong> কাটা যাবে (Negative Marking)।</li>
                    <li>যেসব প্রশ্নের উত্তর দেওয়া হবে না, সেগুলোর জন্য কোনো নম্বর কাটা যাবে না।</li>
                </ul>

                <p><strong>৩. উত্তর প্রদানের নিয়ম:</strong></p>
                <ul style="list-style-type: disc; margin-left: 20px;">
                    <li>আপনার উত্তর নির্বাচন করতে অপশনগুলোর মধ্যে একটিতে ক্লিক করুন।</li>
                    <li>নির্বাচিত উত্তর মুছে ফেলতে <strong>Clear Response</strong> বাটনে ক্লিক করুন।</li>
                    <li>উত্তর সেভ করতে এবং পরের প্রশ্নে যেতে অবশ্যই <strong>Save & Next</strong> বাটনে ক্লিক করুন।</li>
                    <li>প্রশ্নটি পরে দেখার জন্য চিহ্নিত করতে চাইলে <strong>Mark for Review & Next</strong> এ ক্লিক করুন।</li>
                </ul>

                <br>
                <div style="background:#e3f2fd; padding:10px; border-radius:5px; text-align:center; font-weight:bold; color:#0d47a1;">
                    আপনার পরীক্ষার জন্য শুভকামনা!
                </div>
            </div>
        `,
        declaration: "আমি নির্দেশাবলী পড়েছি এবং বুঝেছি। আমি রাজি আছি যে নির্দেশাবলী না মানলে আমাকে এই পরীক্ষা থেকে বিরত রাখা হতে পারে।",
        btn: "আমি শুরু করতে প্রস্তুত"
    }
};

const langSelector = document.getElementById('langSelector');
function updateInstructions(lang) {
    const t = translations[lang];
    // Keep dynamic title logic
    const currentTitle = document.getElementById('instTitle').innerText;
    // Only update title if it's the generic one, otherwise keep quiz title
    if(currentTitle.includes("General") || currentTitle.includes("Instructions") || currentTitle.includes("সাধারণ")) {
        // do nothing or generic text
    } 
    
    document.getElementById('lblChooseLang').innerText = t.choose;
    document.getElementById('instContent').innerHTML = t.content;
    document.getElementById('agreeLabel').innerText = t.declaration;
    document.getElementById('startTestBtn').innerText = t.btn;
}
langSelector.addEventListener('change', (e) => { updateInstructions(e.target.value); });
document.getElementById('agreeCheck').addEventListener('change', (e) => { document.getElementById('startTestBtn').disabled = !e.target.checked; });
document.getElementById('startTestBtn').addEventListener('click', () => {
    document.getElementById('instructionScreen').style.display = 'none';
    document.getElementById('quizMainArea').style.display = 'block';
    loadQuestion(0);
    startTimer();
});

// --- Quiz ---
document.getElementById('quizLangSelect').addEventListener('change', (e) => { currentLang = e.target.value; loadQuestion(currentIdx); });

function loadQuestion(index) {
    if(status[index] === 0) status[index] = 1; 
    currentIdx = index;
    document.getElementById('currentQNum').innerText = index + 1;
    const q = questions[index];
    document.getElementById('questionTextBox').innerText = currentLang === 'bn' ? q.question_bn : q.question_en;
    const opts = currentLang === 'bn' ? q.options_bn : q.options_en;
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    
    document.getElementById('saveNextBtn').innerText = "Save & Next";

    opts.forEach((opt, i) => {
        const row = document.createElement('div');
        row.className = 'option-row';
        if(userAnswers[index] === i) row.classList.add('selected');
        row.innerHTML = `<div class="radio-circle"></div><div class="opt-text">${opt}</div>`;
        row.onclick = () => { if(isPaused) return; document.querySelectorAll('.option-row').forEach(r => r.classList.remove('selected')); row.classList.add('selected'); };
        container.appendChild(row);
    });
}
function getSelIdx() { const s = document.querySelector('.option-row.selected'); return s ? Array.from(s.parentNode.children).indexOf(s) : null; }
document.getElementById('markReviewBtn').addEventListener('click', () => { if(isPaused) return; const i = getSelIdx(); if(i!==null){ userAnswers[currentIdx]=i; status[currentIdx]=4; } else status[currentIdx]=3; nextQ(); });
document.getElementById('saveNextBtn').addEventListener('click', () => { 
    if(isPaused) return; const i = getSelIdx(); 
    if(i!==null){ userAnswers[currentIdx]=i; status[currentIdx]=2; } else status[currentIdx]=1; 
    nextQ(); 
});
document.getElementById('clearResponseBtn').addEventListener('click', () => { if(isPaused) return; document.querySelectorAll('.option-row').forEach(r => r.classList.remove('selected')); userAnswers[currentIdx]=null; status[currentIdx]=1; });
function nextQ() { if(currentIdx < questions.length - 1) loadQuestion(currentIdx + 1); else openDrawer(); }

// Drawer
const drawer = document.getElementById('paletteSheet');
document.querySelector('.menu-icon').addEventListener('click', () => { renderPalette(); drawer.classList.add('open'); document.getElementById('sheetOverlay').style.display='block'; });
function closeDrawer() { drawer.classList.remove('open'); setTimeout(()=>document.getElementById('sheetOverlay').style.display='none', 300); }
document.getElementById('closeSheetBtn').addEventListener('click', closeDrawer);
document.getElementById('sheetOverlay').addEventListener('click', closeDrawer);
function renderPalette() {
    const grid = document.getElementById('paletteGrid');
    grid.innerHTML = '';
    status.forEach((s, i) => {
        const btn = document.createElement('div');
        btn.className = 'p-btn'; btn.innerText = i + 1;
        if(s===2) btn.classList.add('answered'); else if(s===1) btn.classList.add('not-answered');
        else if(s===3) btn.classList.add('marked'); else if(s===4) btn.classList.add('marked-ans');
        if(i===currentIdx) btn.classList.add('current');
        btn.onclick = () => { if(!isPaused) { loadQuestion(i); closeDrawer(); }};
        grid.appendChild(btn);
    });
}

// Timer
const pauseMsg = document.createElement('div');
pauseMsg.innerText = "⚠️ Test Paused";
pauseMsg.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:24px; font-weight:bold; color:#666; display:none; z-index:50;";
document.querySelector('.content-area').parentElement.appendChild(pauseMsg);
function startTimer() {
    clearInterval(timerInterval);
    let m = parseInt(timeLeft / 60), s = parseInt(timeLeft % 60);
    document.getElementById('timerDisplay').innerText = `${m}:${s<10?'0'+s:s}`;
    
    timerInterval = setInterval(() => {
        if(timeLeft <= 0) { clearInterval(timerInterval); submitTest(); return; }
        timeLeft--;
        m = parseInt(timeLeft / 60); s = parseInt(timeLeft % 60);
        document.getElementById('timerDisplay').innerText = `${m}:${s<10?'0'+s:s}`;
    }, 1000);
}
document.getElementById('pauseBtn').addEventListener('click', () => {
    const ca = document.querySelector('.content-area');
    const b = document.getElementById('pauseBtn');
    if(!isPaused) {
        clearInterval(timerInterval); isPaused=true; b.innerText="Resume"; b.style.background="#ff9800"; b.style.color="white";
        ca.style.opacity='0'; ca.style.visibility='hidden'; pauseMsg.style.display='block';
    } else {
        startTimer(); isPaused=false; b.innerText="Pause"; b.style.background="white"; b.style.color="#007bff";
        ca.style.opacity='1'; ca.style.visibility='visible'; pauseMsg.style.display='none';
    }
});

// --- SUBMIT & RESULT ---
function submitTest() {
    if(isSubmitted) return;
    isSubmitted = true;
    clearInterval(timerInterval);

    let s=0, c=0, w=0, sk=0;
    questions.forEach((q, i) => { if(userAnswers[i]!==null) { if(userAnswers[i]===q.correctIndex) {s++; c++;} else {s-=0.33; w++;} } else sk++; });
    document.getElementById('resScore').innerText = s.toFixed(2);
    document.getElementById('resCorrect').innerText = c;
    document.getElementById('resWrong').innerText = w;
    document.getElementById('resSkip').innerText = sk;
    document.getElementById('resultModal').style.display = 'flex';
    applyFilter('all');
}
function applyFilter(t) {
    document.querySelectorAll('.f-btn').forEach(b => { b.classList.remove('active'); if(b.innerText.toLowerCase()===t) b.classList.add('active'); });
    filteredIndices = [];
    questions.forEach((q, i) => {
        const u = userAnswers[i];
        let st = 'skipped';
        if(u !== null) st = (u === q.correctIndex) ? 'correct' : 'wrong';
        if(t === 'all' || t === st) filteredIndices.push(i);
    });
    renderResultPalette();
    if(filteredIndices.length > 0) {
        document.getElementById('resContentArea').style.display = 'flex';
        document.getElementById('resEmptyMsg').style.display = 'none';
        loadResultQuestion(filteredIndices[0]);
    } else {
        document.getElementById('resContentArea').style.display = 'none';
        document.getElementById('resEmptyMsg').style.display = 'flex';
    }
}
function renderResultPalette() {
    const c = document.getElementById('resPaletteContainer'); c.innerHTML = '';
    filteredIndices.forEach(idx => {
        const btn = document.createElement('div'); btn.className = 'rp-btn'; btn.innerText = idx + 1;
        const u = userAnswers[idx], q = questions[idx];
        if(u===null) btn.classList.add('skipped'); else if(u===q.correctIndex) btn.classList.add('correct'); else btn.classList.add('wrong');
        btn.onclick = () => loadResultQuestion(idx);
        c.appendChild(btn);
    });
}
function loadResultQuestion(realIdx) {
    const nIdx = filteredIndices.indexOf(realIdx);
    if(nIdx === -1) return;
    document.querySelectorAll('.rp-btn').forEach(b => b.classList.remove('active'));
    if(document.querySelectorAll('.rp-btn')[nIdx]) document.querySelectorAll('.rp-btn')[nIdx].classList.add('active');
    
    document.getElementById('resCurrentQNum').innerText = realIdx + 1;
    const u = userAnswers[realIdx], q = questions[realIdx], c = q.correctIndex;
    const b = document.getElementById('resQStatusBadge');
    if(u===null) { b.innerText="Skipped"; b.style.background="#ffc107"; b.style.color="#333"; }
    else if(u===c) { b.innerText="Correct"; b.style.background="#26a745"; b.style.color="white"; }
    else { b.innerText="Wrong"; b.style.background="#dc3545"; b.style.color="white"; }
    
    document.getElementById('resQuestionText').innerText = currentLang==='bn'?q.question_bn:q.question_en;
    const opts = currentLang==='bn'?q.options_bn:q.options_en;
    const con = document.getElementById('resOptionsContainer'); con.innerHTML = '';
    opts.forEach((o, i) => {
        let cls = 'res-opt-row';
        if(i===c) cls+=' correct-ans';
        if(u===i && u!==c) cls+=' user-wrong';
        con.innerHTML += `<div class="${cls}"><div class="res-circle"></div><div class="res-opt-text">${o}</div></div>`;
    });
    document.getElementById('resPrevBtn').onclick = () => { if(nIdx > 0) loadResultQuestion(filteredIndices[nIdx - 1]); };
    document.getElementById('resNextBtn').onclick = () => { if(nIdx < filteredIndices.length - 1) loadResultQuestion(filteredIndices[nIdx + 1]); };
}
document.getElementById('submitTestBtn').addEventListener('click', submitTest);
window.addEventListener('beforeunload', (e) => { if(!isSubmitted) { e.preventDefault(); e.returnValue = ''; } });
