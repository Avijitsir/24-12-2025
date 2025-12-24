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

// Elements
const quizIdInput = document.getElementById('quiz-id-input');
const quizTitleInput = document.getElementById('quiz-title-input');
const loadQuizBtn = document.getElementById('load-quiz-btn');
const subjectSelect = document.getElementById('question-subject-select');

const qText = document.getElementById('question-text-input');
const o1 = document.getElementById('option1-input');
const o2 = document.getElementById('option2-input');
const o3 = document.getElementById('option3-input');
const o4 = document.getElementById('option4-input');
const cOpt = document.getElementById('correct-option-select');
const explInput = document.getElementById('explanation-input'); // New

const addBtn = document.getElementById('add-question-btn');
const updBtn = document.getElementById('update-question-btn');
const saveBtn = document.getElementById('save-quiz-btn');
const bulkBtn = document.getElementById('process-bulk-btn');

const qContainer = document.getElementById('questions-container');
const bulkText = document.getElementById('bulk-input-textarea');
const statusMsg = document.getElementById('status-message');
const linkBox = document.getElementById('share-link-box');
const linkInput = document.getElementById('generated-link');

let questions = [];
let editIdx = -1;

// --- Listeners ---
addBtn.addEventListener('click', addQ);
updBtn.addEventListener('click', updQ);
bulkBtn.addEventListener('click', procBulk);
saveBtn.addEventListener('click', saveFirebase);
loadQuizBtn.addEventListener('click', loadFirebase);

// --- Functions ---
function getForm() {
    const s = subjectSelect.value;
    const q = qText.value.trim();
    const ops = [o1.value.trim(), o2.value.trim(), o3.value.trim(), o4.value.trim()];
    const c = cOpt.value;
    const ex = explInput.value.trim();

    if(!q || ops.some(o=>!o) || !c) { show("সব তথ্য দিন!", "error"); return null; }
    
    return { subject: s, question: q, options: ops, answer: ops[parseInt(c)], explanation: ex };
}

function addQ() {
    const d = getForm();
    if(d) { questions.push(d); render(); clear(); show("প্রশ্ন যোগ হয়েছে", "success"); }
}

function editQ(i) {
    const q = questions[i];
    subjectSelect.value = q.subject || "General Knowledge";
    qText.value = q.question;
    o1.value = q.options[0]; o2.value = q.options[1];
    o3.value = q.options[2]; o4.value = q.options[3];
    cOpt.value = q.options.indexOf(q.answer);
    explInput.value = q.explanation || ""; // Load explanation
    
    editIdx = i;
    addBtn.style.display='none'; updBtn.style.display='block';
    document.getElementById('question-form').scrollIntoView({behavior:"smooth"});
}

function updQ() {
    const d = getForm();
    if(d) {
        questions[editIdx] = d; editIdx = -1;
        addBtn.style.display='block'; updBtn.style.display='none';
        render(); clear(); show("আপডেট হয়েছে", "success");
    }
}

function delQ(i) { if(confirm("মুছে ফেলবেন?")) { questions.splice(i, 1); render(); } }

function clear() {
    qText.value=''; o1.value=''; o2.value=''; o3.value=''; o4.value=''; cOpt.value=''; explInput.value='';
}

function procBulk() {
    const txt = bulkText.value.trim();
    const sub = subjectSelect.value;
    if(!txt) { show("বক্স খালি!", "error"); return; }

    const blocks = txt.split(/\n\s*\n/);
    let count = 0;

    blocks.forEach((b, idx) => {
        const lines = b.trim().split('\n').map(l=>l.trim()).filter(l=>l);
        if(lines.length >= 6) {
            const qt = lines[0];
            const ops = [lines[1], lines[2], lines[3], lines[4]];
            
            // Find Answer line
            let ansLine = lines.find(l => /^(answer|ans|correct):/i.test(l));
            // Find Explanation line
            let expLine = lines.find(l => /^(explanation|exp|ব্যাখ্যা):/i.test(l));

            if(ansLine) {
                let rawAns = ansLine.replace(/^(answer|ans|correct):\s*/i, "").trim();
                let explanationText = expLine ? expLine.replace(/^(explanation|exp|ব্যাখ্যা):\s*/i, "").trim() : "";
                let finalAns = null;

                const exactMatch = ops.find(o => o.toLowerCase() === rawAns.toLowerCase());
                if(exactMatch) finalAns = exactMatch;

                if(!finalAns) {
                    const optionMap = {'a':0, 'b':1, 'c':2, 'd':3, '1':0, '2':1, '3':2, '4':3};
                    const key = rawAns.toLowerCase().replace(/[\.\)]/g, '');
                    if(optionMap.hasOwnProperty(key)) finalAns = ops[optionMap[key]];
                }

                if(finalAns) {
                    questions.push({ subject: sub, question: qt, options: ops, answer: finalAns, explanation: explanationText });
                    count++;
                }
            }
        }
    });

    if(count > 0) { render(); bulkText.value=''; show(`${count} টি প্রশ্ন যোগ হয়েছে`, "success"); }
    else { show("ফরম্যাট সঠিক নয়", "error"); }
}

function render() {
    qContainer.innerHTML = '';
    document.getElementById('questions-list-header').innerText = `প্রশ্ন তালিকা (${questions.length})`;
    questions.forEach((q, i) => {
        const div = document.createElement('div');
        div.className = 'q-card';
        let oh = '';
        q.options.forEach(o => oh += `<li ${o===q.answer?'class="correct"':''}>${o}</li>`);
        // Show snippet of explanation if exists
        let expHtml = q.explanation ? `<div style="font-size:12px; color:#666; margin-top:5px; border-top:1px dashed #ccc; padding-top:3px;">💡 ${q.explanation}</div>` : '';
        
        div.innerHTML = `
            <div class="q-header">
                <span class="subject-tag">${q.subject}</span>
                <div class="card-actions">
                    <span class="action-btn btn-edit" onclick="editQ(${i})"><span class="material-icons" style="font-size:16px;">edit</span></span>
                    <span class="action-btn btn-delete" onclick="delQ(${i})"><span class="material-icons" style="font-size:16px;">delete</span></span>
                </div>
            </div>
            <span class="q-text">Q${i+1}. ${q.question}</span>
            <ul class="q-options">${oh}</ul>
            ${expHtml}
        `;
        qContainer.appendChild(div);
    });
    
    // Math Render call if needed
    if (window.renderMathInElement) {
        renderMathInElement(qContainer, {
            delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "\\(", right: "\\)", display: false}
            ],
            throwOnError: false
        });
    }
}

function saveFirebase() {
    const id = quizIdInput.value.trim();
    const title = quizTitleInput.value.trim();
    if(!id || !title || questions.length===0) { show("ID, Title এবং প্রশ্ন দিন", "error"); return; }

    show("সেভ হচ্ছে...", "success");
    database.ref('quizzes/'+id).set({ title: title, questions: questions })
        .then(() => { show("সফল!", "success"); genLink(id); })
        .catch(e => show("Error: "+e.message, "error"));
}

function genLink(id) {
    const url = window.location.href.replace('admin.html', 'index.html').split('?')[0] + '?quiz=' + id;
    linkInput.value = url;
    linkBox.style.display = 'block';
    linkBox.scrollIntoView({behavior:"smooth"});
}

function copyToClipboard() {
    linkInput.select(); document.execCommand("copy"); alert("লিংক কপি হয়েছে!");
}

function loadFirebase() {
    const id = quizIdInput.value.trim();
    if(!id) { show("ID দিন", "error"); return; }
    linkBox.style.display='none';
    database.ref('quizzes/'+id).once('value').then(s => {
        const d = s.val();
        if(d) { 
            quizTitleInput.value=d.title; 
            questions=d.questions||[]; 
            render(); 
            show("লোড হয়েছে", "success"); 
        }
        else show("পাওয়া যায়নি", "error");
    });
}

function show(m, t) {
    statusMsg.innerText = m; statusMsg.className = t; statusMsg.style.display='block';
    setTimeout(()=>statusMsg.style.display='none', 4000);
}
