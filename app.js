/**
 * Mindful Journal — Voice-First AI Companion
 * With Firebase Auth + Firestore for cross-device sync
 */

// ========== FIREBASE CONFIG ==========
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use existing)
// 3. Add a Web app
// 4. Copy the config object and paste it below
// 5. Enable Authentication → Email/Password
// 6. Create a Firestore Database (start in test mode for now)

const firebaseConfig = {
  apiKey: "xxx",
  authDomain: "mindful-journal-c079b.firebaseapp.com",
  projectId: "mindful-journal-c079b",
  storageBucket: "mindful-journal-c079b.firebasestorage.app",
  messagingSenderId: "81303258573",
  appId: "1:81303258573:web:baa51c90e118e1623e7084",
  measurementId: "G-D7Z0BEYGC5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ========== State ==========
let currentUser = null;
let recognition = null;
let isRecording = false;
let currentUtterance = null;
let unsubscribeEntries = null;

// ========== DOM Elements ==========
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const tabs = document.querySelectorAll('.auth-tabs .tab');
const micBtn = document.getElementById('mic-btn');
const recordingStatus = document.getElementById('recording-status');
const transcriptEl = document.getElementById('transcript');
const clearBtn = document.getElementById('clear-btn');
const saveBtn = document.getElementById('save-btn');
const aiSection = document.getElementById('ai-response-section');
const moodTagEl = document.getElementById('mood-tag');
const aiSummaryEl = document.getElementById('ai-summary');
const aiQuestionEl = document.getElementById('ai-question');
const ttsBtn = document.getElementById('tts-btn');
const dismissAiBtn = document.getElementById('dismiss-ai');
const entriesList = document.getElementById('entries-list');
const emptyState = document.getElementById('empty-state');
const moodFilter = document.getElementById('mood-filter');
const dateFrom = document.getElementById('date-from');
const dateTo = document.getElementById('date-to');
const clearFiltersBtn = document.getElementById('clear-filters');
const themeToggle = document.getElementById('theme-toggle');
const logoutBtn = document.getElementById('logout-btn');
const currentDateEl = document.getElementById('current-date');
const toastEl = document.getElementById('toast');

// ========== Utilities ==========
function showToast(message, duration = 3000) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), duration);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== Auth ==========
function showAuth() {
  authScreen.classList.add('active');
  appScreen.classList.remove('active');
  currentUser = null;
  if (unsubscribeEntries) {
    unsubscribeEntries();
    unsubscribeEntries = null;
  }
}

function showApp() {
  authScreen.classList.remove('active');
  appScreen.classList.add('active');
  currentDateEl.textContent = formatToday();
  listenToEntries();
}

async function login(email, password) {
  try {
    showToast('Signing in...');
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    console.error(error);
    let msg = 'Login failed';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      msg = 'Invalid email or password';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Invalid email address';
    } else if (error.code === 'auth/too-many-requests') {
      msg = 'Too many attempts. Try again later.';
    }
    showToast(msg);
  }
}

async function signup(email, password) {
  try {
    showToast('Creating account...');
    await auth.createUserWithEmailAndPassword(email, password);
  } catch (error) {
    console.error(error);
    let msg = 'Sign up failed';
    if (error.code === 'auth/email-already-in-use') {
      msg = 'Email already registered. Try logging in.';
    } else if (error.code === 'auth/weak-password') {
      msg = 'Password should be at least 6 characters';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Invalid email address';
    }
    showToast(msg);
  }
}

async function logout() {
  try {
    await auth.signOut();
    transcriptEl.value = '';
    aiSection.classList.add('hidden');
    showToast('Logged out');
  } catch (error) {
    showToast('Logout failed');
  }
}

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    showApp();
    showToast('Welcome back');
  } else {
    showAuth();
  }
});

// ========== Theme ==========
function initTheme() {
  const saved = localStorage.getItem('mj_theme') || 'dark';
  if (saved === 'light') {
    document.body.classList.add('light');
  }
}

function toggleTheme() {
  document.body.classList.toggle('light');
  const theme = document.body.classList.contains('light') ? 'light' : 'dark';
  localStorage.setItem('mj_theme', theme);
}

// ========== Speech Recognition ==========
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.disabled = true;
    micBtn.querySelector('.mic-label').textContent = 'Not supported';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add('recording');
    micBtn.querySelector('.mic-label').textContent = 'Listening...';
    recordingStatus.classList.remove('hidden');
  };

  recognition.onresult = (event) => {
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript + ' ';
      }
    }
    if (final) {
      transcriptEl.value = (transcriptEl.value + ' ' + final).trim();
      updateSaveButton();
    }
  };

  recognition.onerror = (event) => {
    if (event.error === 'not-allowed') {
      showToast('Microphone permission denied');
    } else if (event.error !== 'aborted') {
      showToast('Speech error: ' + event.error);
    }
    stopRecording();
  };

  recognition.onend = () => {
    if (isRecording) {
      try { recognition.start(); } catch (e) { stopRecording(); }
    } else {
      stopRecording();
    }
  };
}

function startRecording() {
  if (!recognition) return;
  try { recognition.start(); } catch (e) {}
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
  }
  micBtn.classList.remove('recording');
  micBtn.querySelector('.mic-label').textContent = 'Tap to Speak';
  recordingStatus.classList.add('hidden');
}

function toggleRecording() {
  if (isRecording) stopRecording();
  else startRecording();
}

// ========== Text-to-Speech ==========
function getBestVoice() {
  const voices = speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const preferredNames = [
    'Samantha', 'Karen', 'Moira', 'Tessa', 'Fiona', 'Victoria',
    'Google UK English Female', 'Google US English',
    'Microsoft Aria Online (Natural) - English (United States)',
    'Microsoft Jenny Online (Natural) - English (United States)',
    'Microsoft Sonia Online (Natural) - English (United Kingdom)',
    'Samantha (Enhanced)', 'Allison', 'Susan', 'Zira'
  ];

  for (const name of preferredNames) {
    const match = voices.find(v => v.name === name || v.name.includes(name));
    if (match) return match;
  }

  const natural = voices.find(v =>
    v.lang.startsWith('en') &&
    (v.name.toLowerCase().includes('natural') ||
     v.name.toLowerCase().includes('neural') ||
     v.name.toLowerCase().includes('enhanced'))
  );
  if (natural) return natural;

  const femaleEn = voices.find(v =>
    v.lang.startsWith('en') &&
    (v.name.toLowerCase().includes('female') ||
     ['samantha','karen','moira','tessa','fiona','victoria','zira','aria','jenny'].some(n => v.name.toLowerCase().includes(n)))
  );
  if (femaleEn) return femaleEn;

  return voices.find(v => v.lang.startsWith('en')) || voices[0];
}

function speakText(text) {
  if (!text || !text.trim()) return;
  speechSynthesis.cancel();

  const cleaned = text.replace(/\s+/g, ' ').trim();
  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = 0.92;
  utterance.pitch = 1.05;
  utterance.volume = 1;

  const voice = getBestVoice();
  if (voice) utterance.voice = voice;

  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
}

// ========== AI Companion ==========
function analyzeEntry(text) {
  const lower = text.toLowerCase();

  const moods = {
    Grateful: ['grateful', 'thankful', 'blessed', 'appreciate', 'thank you', 'thanks', 'lucky', 'fortunate', 'joy', 'happy', 'love', 'wonderful'],
    Hopeful: ['hope', 'hopeful', 'looking forward', 'excited', 'optimistic', 'better', 'future', 'possible', 'believe', 'dream'],
    Calm: ['calm', 'peace', 'peaceful', 'relaxed', 'serene', 'quiet', 'still', 'content', 'centered', 'grounded', 'breathe'],
    Anxious: ['anxious', 'anxiety', 'worried', 'worry', 'nervous', 'stress', 'stressed', 'fear', 'scared', 'panic', 'uneasy', 'tense'],
    Overwhelmed: ['overwhelm', 'overwhelmed', 'too much', "can't handle", 'exhausted', 'burned out', 'burnout', 'drowning', 'swamped', 'chaos'],
    Sad: ['sad', 'down', 'depressed', 'lonely', 'hurt', 'cry', 'crying', 'grief', 'miss', 'empty', 'hopeless', 'blue'],
    Reflective: ['think', 'thinking', 'reflect', 'wonder', 'realize', 'understand', 'learn', 'growth', 'insight', 'meaning'],
    Energized: ['energy', 'energized', 'motivated', 'inspired', 'productive', 'achieved', 'accomplished', 'progress', 'strong', 'powerful']
  };

  let scores = {};
  for (const [mood, keywords] of Object.entries(moods)) {
    scores[mood] = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
  }

  let dominant = 'Reflective';
  let maxScore = 0;
  for (const [mood, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominant = mood;
    }
  }

  const summaries = {
    Grateful: [
      "There's a warmth in how you're noticing the good things around you. Holding space for gratitude like this can quietly shift the whole day.",
      "You're pausing to appreciate what is present. That kind of attention is a form of care for yourself."
    ],
    Hopeful: [
      "There's a forward-looking energy in what you shared. Even small sparks of hope are worth noticing and protecting.",
      "You're allowing yourself to look ahead with openness. That stance can be a gentle source of strength."
    ],
    Calm: [
      "Your words carry a sense of steadiness. Moments of calm are worth lingering in when they appear.",
      "There's a quiet groundedness here. Letting yourself rest in it is a form of wisdom."
    ],
    Anxious: [
      "It makes sense that these worries are taking up space right now. Naming them is already a step toward not carrying them alone.",
      "Anxiety often arrives when something matters deeply. You're allowing yourself to feel it without pushing it away."
    ],
    Overwhelmed: [
      "It sounds like a lot is landing on you at once. You don't have to sort everything in this moment — one breath is enough.",
      "Feeling stretched thin is a signal, not a failure. Your system is asking for a little more space and kindness."
    ],
    Sad: [
      "Sadness has a way of making everything feel heavier. It's okay to sit with it without needing to fix it right away.",
      "You're giving voice to something tender. That honesty is a quiet act of courage."
    ],
    Reflective: [
      "You're turning things over carefully, looking for meaning. That kind of inner dialogue is valuable.",
      "There's a thoughtful quality to what you shared. Reflection like this often plants seeds that grow later."
    ],
    Energized: [
      "There's a clear aliveness in how you're showing up. Momentum like this is worth acknowledging.",
      "You're tapping into a sense of capability and drive. Let yourself feel the lift of that energy."
    ]
  };

  const questions = {
    Grateful: [
      "What is one small thing from today that you might not usually notice, but that you're glad exists?",
      "If you could bottle the feeling of this gratitude and share it with someone, who would it be and why?"
    ],
    Hopeful: [
      "What is the smallest next step that would keep this sense of hope alive for you?",
      "When you imagine things going well, what does a single ordinary good day look like?"
    ],
    Calm: [
      "Where in your body do you notice this calm most clearly right now?",
      "What helped create this sense of ease, and how might you invite a little more of it tomorrow?"
    ],
    Anxious: [
      "If this worry could speak in a single sentence, what would it say it needs from you?",
      "What is one thing that is still within your control, even while this uncertainty is present?"
    ],
    Overwhelmed: [
      "If you could put just one thing down for the next hour, what would it be?",
      "What would 'good enough' look like for the rest of today?"
    ],
    Sad: [
      "What does this sadness need most from you right now — comfort, space, or simply to be witnessed?",
      "Is there a kind thing you could offer yourself in this moment, even if it feels small?"
    ],
    Reflective: [
      "What new understanding is beginning to form for you as you sit with this?",
      "If a trusted friend shared the same reflection, what gentle question would you ask them?"
    ],
    Energized: [
      "How might you channel a little of this energy toward something that matters to you?",
      "What would it look like to protect some of this momentum for tomorrow?"
    ]
  };

  const idx = text.length % 2;
  return {
    mood: dominant,
    summary: (summaries[dominant] || summaries.Reflective)[idx],
    question: (questions[dominant] || questions.Reflective)[idx]
  };
}

// ========== Entries (Firestore) ==========
function updateSaveButton() {
  saveBtn.disabled = transcriptEl.value.trim().length === 0;
}

async function saveEntry() {
  const text = transcriptEl.value.trim();
  if (!text || !currentUser) return;

  stopRecording();
  saveBtn.disabled = true;
  showToast('Saving...');

  try {
    const analysis = analyzeEntry(text);
    const entry = {
      text,
      mood: analysis.mood,
      summary: analysis.summary,
      question: analysis.question,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid: currentUser.uid
    };

    await db.collection('entries').add(entry);

    moodTagEl.textContent = analysis.mood;
    moodTagEl.className = 'mood-tag ' + analysis.mood.toLowerCase();
    aiSummaryEl.textContent = analysis.summary;
    aiQuestionEl.textContent = analysis.question;
    aiSection.classList.remove('hidden');

    transcriptEl.value = '';
    updateSaveButton();
    showToast('Entry saved & synced');
    aiSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    console.error(error);
    showToast('Failed to save entry');
    saveBtn.disabled = false;
  }
}

async function deleteEntry(id) {
  try {
    await db.collection('entries').doc(id).delete();
    showToast('Entry deleted');
  } catch (error) {
    console.error(error);
    showToast('Failed to delete');
  }
}

function listenToEntries() {
  if (!currentUser) return;
  if (unsubscribeEntries) unsubscribeEntries();

  unsubscribeEntries = db.collection('entries')
    .where('uid', '==', currentUser.uid)
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      const entries = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        entries.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        });
      });
      renderEntries(entries);
    }, (error) => {
      console.error('Listen error:', error);
      if (error.code === 'failed-precondition') {
        showToast('Setting up database index... try again in a minute');
      }
    });
}

function renderEntries(allEntries = []) {
  const mood = moodFilter.value;
  const from = dateFrom.value ? new Date(dateFrom.value) : null;
  const to = dateTo.value ? new Date(dateTo.value + 'T23:59:59') : null;

  const filtered = allEntries.filter(e => {
    if (mood !== 'all' && e.mood !== mood) return false;
    const d = new Date(e.createdAt);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });

  entriesList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  filtered.forEach(entry => {
    const item = document.createElement('article');
    item.className = 'entry-item';
    item.innerHTML = `
      <div class="entry-meta">
        <span class="entry-date">${formatDate(entry.createdAt)}</span>
        <span class="entry-mood ${entry.mood.toLowerCase()}">${entry.mood}</span>
      </div>
      <p class="entry-text">${escapeHtml(entry.text)}</p>
      <div class="entry-ai">
        <span class="ai-label">The Mindful Listener</span>
        <p>${escapeHtml(entry.summary)}</p>
        <p style="margin-top:8px;font-style:italic;opacity:0.9">“${escapeHtml(entry.question)}”</p>
      </div>
      <div class="entry-actions">
        <button class="btn text tts-entry" data-text="${escapeHtml(entry.summary + ' ... ' + entry.question)}">🔊 Listen</button>
        <button class="btn text delete-entry" data-id="${entry.id}">Delete</button>
      </div>
    `;
    entriesList.appendChild(item);
  });

  entriesList.querySelectorAll('.delete-entry').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this entry permanently?')) {
        deleteEntry(btn.dataset.id);
      }
    });
  });

  entriesList.querySelectorAll('.tts-entry').forEach(btn => {
    btn.addEventListener('click', () => {
      speakText(btn.dataset.text);
    });
  });
}

// ========== Event Listeners ==========
function initEvents() {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      loginForm.classList.toggle('active', target === 'login');
      signupForm.classList.toggle('active', target === 'signup');
    });
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    login(email, password);
  });

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    if (password !== confirm) {
      showToast('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }
    signup(email, password);
  });

  micBtn.addEventListener('click', toggleRecording);

  transcriptEl.addEventListener('input', updateSaveButton);
  clearBtn.addEventListener('click', () => {
    transcriptEl.value = '';
    updateSaveButton();
    stopRecording();
  });
  saveBtn.addEventListener('click', saveEntry);

  ttsBtn.addEventListener('click', () => {
    const summary = aiSummaryEl.textContent.trim();
    const question = aiQuestionEl.textContent.trim();
    speakText(summary + ' ... ' + question);
  });
  dismissAiBtn.addEventListener('click', () => {
    aiSection.classList.add('hidden');
    speechSynthesis.cancel();
  });

  moodFilter.addEventListener('change', () => listenToEntries());
  dateFrom.addEventListener('change', () => listenToEntries());
  dateTo.addEventListener('change', () => listenToEntries());
  clearFiltersBtn.addEventListener('click', () => {
    moodFilter.value = 'all';
    dateFrom.value = '';
    dateTo.value = '';
    listenToEntries();
  });

  themeToggle.addEventListener('click', toggleTheme);
  logoutBtn.addEventListener('click', logout);

  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {};
  }
  speechSynthesis.getVoices();
}

// ========== Boot ==========
function boot() {
  initTheme();
  initSpeechRecognition();
  initEvents();
}

boot();
