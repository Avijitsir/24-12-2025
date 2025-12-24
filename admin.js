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

let questions = [];
let editIdx = -1;

// Elements
const els = {
    id: document.getElementById('quiz-id-input'),
    title: document.getElementById('quiz-title-input'),
    time: document.getElementById('time-input'),
    marks: document.getElementById('marks-input'),
    neg: document.getElementById('negative-input'),
    pass: document.getElementById('pass-mark-input'),
    qText: document.getElementById('question-text-input'),
    ops: [1,2,3,4].map(i => document.getElementById('option'+i+'-input')),
    correct: document.getElementById('correct-option-select'),
    expl: document.getElementById('explanation-input'),
    bulk: document.getElementById('bulk-input-textarea')
};

// Functions
function showTab(t) {
    document.querySelectorAll('.tab-content').forEach(d=>d.style.display='none');
    document.getElementById(t+'-tab').style.display='block';
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    event.target.classList.add('active');
}

document.getElementById('add-question-btn').addEventListener('click', () => {
    const q = els.qText.value.trim();
    const ops = els.ops.map(i=>i.value.trim());
    const c = els.correct.value;
    const ex = els.expl.value.trim();

    if(!q || ops.some(o=>!o) || !c) return alert("সব তথ্য দিন!");
    
    questions.push({ question: q, options: ops, answer: ops[c], explanation: ex });
    render(); clear();
});

document.getElementById('process-bulk-btn').addEventListener('click', () => {
    const txt = els.bulk.value.trim();
    if(!txt) return;
    const blocks = txt.split(/\n\s*\n/);
    blocks.forEach(b => {
        const lines = b.trim().split('\n').map(l=>l.trim()).filter(l=>l);
        if(lines.length >= 5) {
            const q = lines[0];
            const ansLine = lines.find(l=>/^(Answer|Ans):/i.test(l));
            const expLine = lines.find(l=>/^(Explanation|Exp):/i.test(l));
            
            const rawOps = lines.filter(l => !l.startsWith('Answer:') && !l.startsWith('Explanation:') && l !== q).slice(0,4);
            
            if(rawOps.length === 4 && ansLine) {
                const ansTxt = ansLine.split(':')[1].trim();
                const expTxt = expLine ? expLine.split(':')[1].trim() : "";
                
                // Find correct option
                let finalAns = rawOps.find(o => o.toLowerCase() === ansTxt.toLowerCase());
                if(!finalAns) { // Try matching A/B/C/D
                   const map = {'a':0,'b':1,'c':2,'d':3};
                   const key = ansTxt.toLowerCase().charAt(0);
                   if(map[key] !== undefined) finalAns = rawOps[map[key]];
                }
                
                if(finalAns) questions.push({ question: q, options: rawOps, answer: finalAns, explanation: expTxt });
            }
        }
    });
    render(); els.bulk.value='';
});

function render() {
    const c = document.getElementById('questions-container');
    c.innerHTML = '';
    document.getElementById('questions-list-header').innerText = `Total: ${questions.length}`;
    questions.forEach((q,i) => {
        c.innerHTML += `
            <div class="q-card">
                <div class="q-header">Q${i+1}. ${q.question}
                    <div><span class="btn-edit" onclick="editQ(${i})">Edit</span><span class="btn-delete" onclick="delQ(${i})">Del</span></div>
                </div>
                <div style="color:green; font-size:0.9rem;">Ans: ${q.answer}</div>
                <div style="color:#666; font-size:0.8rem;">Exp: ${q.explanation || '-'}</div>
            </div>`;
    });
}

function clear() {
    els.qText.value=''; els.ops.forEach(i=>i.value=''); 
    els.correct.value=''; els.expl.value='';
}

function delQ(i) { questions.splice(i,1); render(); }

function editQ(i) {
    const q = questions[i];
    els.qText.value = q.question;
    els.ops.forEach((inp, idx) => inp.value = q.options[idx]);
    els.correct.value = q.options.indexOf(q.answer);
    els.expl.value = q.explanation || "";
    delQ(i); // Remove old, user will add new
}

document.getElementById('save-quiz-btn').addEventListener('click', () => {
    const id = els.id.value.trim();
    if(!id || !questions.length) return alert("ID এবং প্রশ্ন দিন!");
    
    db.ref('quizzes/'+id).set({
        title: els.title.value || "Mock Test",
        time: parseInt(els.time.value) || 20,
        positive: parseFloat(els.marks.value) || 1,
        negative: parseFloat(els.neg.value) || 0.25,
        passMark: parseInt(els.pass.value) || 40,
        questions: questions
    }).then(() => {
        const url = window.location.href.replace('admin.html', 'index.html').split('?')[0] + '?quiz=' + id;
        document.getElementById('generated-link').value = url;
        document.getElementById('share-link-box').style.display='block';
        alert("Saved!");
    });
});

document.getElementById('load-quiz-btn').addEventListener('click', () => {
    const id = els.id.value.trim();
    if(!id) return;
    db.ref('quizzes/'+id).once('value', s => {
        const d = s.val();
        if(d) {
            els.title.value = d.title; els.time.value = d.time;
            els.marks.value = d.positive; els.neg.value = d.negative;
            questions = d.questions || []; render();
        } else alert("Not Found");
    });
});

function copyLink() {
    document.getElementById('generated-link').select();
    document.execCommand('copy');
    alert("Copied!");
}