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
        // Keep explanation as is
        q.explanation = q.explanation || "";
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
                    correctIndex: correctIdx,
                    explanation: q.explanation // NEW: Load explanation
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

// --- Instructions ---
const translations = {
    en: {
        title: "General Instructions",
        choose: "Choose Language: ",
        content: `
            <div style="font-family: 'Roboto', sans-serif; font-size: 15px; line-height: 1.6;">
                <h3 style="margin-top:0;">Please read the instructions carefully:</h3>
                
                <p>1. The total duration of the examination is decided by the admin.</p>
                <p>2. The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.</p>
                
                <p>3. The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:</p>
                
                <ul class="legend-list" style="list-style: none; padding-left: 0;">
                    <li><span class="dot-icon not-visited"></span> You have not visited the question yet.</li>
                    <li><span class="dot-icon not-answered"></span> You have not answered the question.</li>
                    <li><span class="dot-icon answered"></span> You have answered the question.</li>
                    <li><span class="dot-icon marked"></span> You have NOT answered the question but have marked the question for review.</li>
                    <li><span class="dot-icon marked-ans"></span> The question(s) "Answered and Marked for Review" will be considered for evaluation.</li>
                </ul>

                <p>4. To answer a question, click on the option you want to select.</p>
                <p>5. To deselect your chosen answer, click on the <strong>Clear Response</strong> button.</p>
                <p>6. To save your answer, you MUST click on the <strong>Save & Next</strong> button.</p>
                <p>7. To mark the question for review, click on the <strong>Mark for Review & Next</strong> button.</p>
            </div>
        `,
        declaration: "I have read and understood the instructions. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test.",
        btn: "I am ready to begin"
    },
    bn: {
        title: "সাধারণ নির্দেশাবলী",
        choose: "ভাষা নির্বাচন করুন: ",
        content: `
            <div style="font-family: 'Roboto', sans-serif; font-size: 15px; line-height: 1.6;">
                <h3 style="margin-top:0;">অনুগ্রহ করে নির্দেশাবলী মনোযোগ সহকারে পড়ুন:</h3>
                
                <p>১. পরীক্ষার মোট সময়কাল অ্যাডমিন দ্বারা নির্ধারিত।</p>
                <p>২. সার্ভারে ঘড়ি সেট করা হয়েছে। স্ক্রিনের উপরের ডানদিকের কোণে কাউন্টডাউন টাইমারটি পরীক্ষার জন্য অবশিষ্ট সময় প্রদর্শন করবে।</p>
                
                <p>৩. স্ক্রিনের ডানদিকে প্রদর্শিত প্রশ্ন প্যালেটটি প্রতিটি প্রশ্নের অবস্থা নিম্নলিখিত প্রতীকগুলির মাধ্যমে দেখাবে:</p>
                
                <ul class="legend-list" style="list-style: none; padding-left: 0;">
                    <li><span class="dot-icon not-visited"></span> আপনি এখনও প্রশ্নটি দেখেননি।</li>
                    <li><span class="dot-icon not-answered"></span> আপনি প্রশ্নটির উত্তর দেননি।</li>
                    <li><span class="dot-icon answered"></span> আপনি প্রশ্নটির উত্তর দিয়েছেন।</li>
                    <li><span class="dot-icon marked"></span> আপনি উত্তর দেননি কিন্তু পর্যালোচনার (Review) জন্য চিহ্নিত করেছেন।</li>
                    <li><span class="dot-icon marked-ans"></span> যে প্রশ্নগুলো "উত্তর দেওয়া এবং পর্যালোচনার জন্য চিহ্নিত" (Marked for Review), সেগুলো মূল্যায়নের জন্য গণ্য হবে।</li>
                </ul>

                <p>৪. উত্তর দিতে, আপনার পছন্দের অপশনে ক্লিক করুন।</p>
                <p>৫. উত্তর মুছে ফেলতে <strong>Clear Response</strong> বাটনে ক্লিক করুন।</p>
                <p>৬. উত্তর সেভ করতে অবশ্যই <strong>Save & Next</strong> বাটনে ক্লিক করুন।</p>
                <p>৭. প্রশ্নটি পরে দেখার জন্য চিহ্নিত করতে <strong>Mark for Review & Next</strong> বাটনে ক্লিক করুন।</p>
            </div>
        `,
        declaration: "আমি নির্দেশাবলী পড়েছি এবং বুঝেছি। আমি রাজি আছি যে নির্দেশাবলী না মানলে আমাকে এই পরীক্ষা থেকে বিরত রাখা হতে পারে।",
        btn: "আমি শুরু করতে প্রস্তুত"
    }
};

const langSelector = document.getElementById('langSelector');
function updateInstructions(lang) {
    const t = translations[lang];
    const currentTitle = document.getElementById('instTitle').innerText;
    
    if(currentTitle.includes("General") || currentTitle.includes("Instructions") || currentTitle.includes("সাধারণ")) {
        
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
    
    if(document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if(document.documentElement.webkitRequestFullscreen) { 
        document.documentElement.webkitRequestFullscreen();
    }

    loadQuestion(0);
    startTimer();
});

// Fullscreen Logic
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        document.getElementById('fullscreenOverlay').style.display = 'flex';
    } else {
        document.getElementById('fullscreenOverlay').style.display = 'none';
    }
});
document.getElementById('returnFsBtn').addEventListener('click', () => {
    if(document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if(document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
    }
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
    
    const nextBtn = document.getElementById('saveNextBtn');
    if (index === questions.length - 1) {
        nextBtn.innerText = "Final Submit";
        nextBtn.style.backgroundColor = "#ff5722"; 
    } else {
        nextBtn.innerText = "Save & Next";
        nextBtn.style.backgroundColor = "#00c696";
    }

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
    if(isPaused) return; 
    const i = getSelIdx(); 
    if(i!==null){ userAnswers[currentIdx]=i; status[currentIdx]=2; } else status[currentIdx]=1; 
    
    if (currentIdx === questions.length - 1) {
        if (confirm("আপনি কি নিশ্চিত যে আপনি পরীক্ষা শেষ করতে চান?")) {
            submitTest();
        }
    } else {
        nextQ(); 
    }
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

    if(document.exitFullscreen) document.exitFullscreen();

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
    
    // NEW: Show Explanation
    const explBox = document.getElementById('resExplanation');
    const explText = document.getElementById('resExplText');
    if(q.explanation && q.explanation.trim() !== "") {
        explBox.style.display = "block";
        explText.innerText = q.explanation;
    } else {
        explBox.style.display = "none";
    }

    document.getElementById('resPrevBtn').onclick = () => { if(nIdx > 0) loadResultQuestion(filteredIndices[nIdx - 1]); };
    document.getElementById('resNextBtn').onclick = () => { if(nIdx < filteredIndices.length - 1) loadResultQuestion(filteredIndices[nIdx + 1]); };
}
document.getElementById('submitTestBtn').addEventListener('click', submitTest);
window.addEventListener('beforeunload', (e) => { if(!isSubmitted) { e.preventDefault(); e.returnValue = ''; } });
