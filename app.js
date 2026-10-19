/**
 * Mindful Journal — Voice-First AI Companion
 * Private by design: all data stays in the browser (localStorage).
 */

// ========== State ==========
let currentUser = null;
let recognition = null;
let isRecording = false;
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

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
function showToast(message, duration = 2800) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), duration);
}

function hashPassword(password) {
  // Simple hash for demo privacy (not production-grade)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

function getUsers() {
  return JSON.parse(localStorage.getItem('mj_users') || '{}');
}

function saveUsers(users) {
  localStorage.setItem('mj_users', JSON.stringify(users));
}

function getEntriesKey() {
  return `mj_entries_${currentUser}`;
}

function getEntries() {
  return JSON.parse(localStorage.getItem(getEntriesKey()) || '[]');
}

function saveEntries(entries) {
  localStorage.setItem(getEntriesKey(), JSON.stringify(entries));
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

// ========== Auth ==========
function showAuth() {
  authScreen.classList.add('active');
  appScreen.classList.remove('active');
  currentUser = null;
}

function showApp() {
  authScreen.classList.remove('active');
  appScreen.classList.add('active');
  currentDateEl.textContent = formatToday();
  renderEntries();
}

function login(username, password) {
  const users = getUsers();
  const hashed = hashPassword(password);
  if (users[username] && users[username] === hashed) {
    currentUser = username;
    localStorage.setItem('mj_session', username);
    showApp();
    showToast(`Welcome back, ${username}`);
    return true;
  }
  showToast('Invalid username or password');
  return false;
}

function signup(username, password) {
  const users = getUsers();
  if (users[username]) {
    showToast('Username already exists');
    return false;
  }
  if (username.length < 3) {
    showToast('Username must be at least 3 characters');
    return false;
  }
  if (password.length < 4) {
    showToast('Password must be at least 4 characters');
    return false;
  }
  users[username] = hashPassword(password);
  saveUsers(users);
  currentUser = username;
  localStorage.setItem('mj_session', username);
  showApp();
  showToast('Account created. Your journal is private to this device.');
  return true;
}

function logout() {
  localStorage.removeItem('mj_session');
  currentUser = null;
  transcriptEl.value = '';
  aiSection.classList.add('hidden');
  showAuth();
  showToast('Logged out');
}

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

// ========== Speech Recognition (Web Speech API) ==========
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.disabled = true;
    micBtn.querySelector('.mic-label').textContent = 'Not supported';
    showToast('Speech recognition not supported in this browser');
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
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript + ' ';
      } else {
        interim += transcript;
      }
    }
    if (final) {
      transcriptEl.value = (transcriptEl.value + ' ' + final).trim();
      updateSaveButton();
    }
    // Optionally show interim in placeholder or a temporary overlay — keep simple
  };

  recognition.onerror = (event) => {
    console.warn('Speech error:', event.error);
    if (event.error === 'not-allowed') {
      showToast('Microphone permission denied');
    } else if (event.error !== 'aborted') {
      showToast('Speech recognition error: ' + event.error);
    }
    stopRecording();
  };

  recognition.onend = () => {
    if (isRecording) {
      // Auto-restart if still meant to be recording (some browsers stop early)
      try { recognition.start(); } catch (e) { stopRecording(); }
    } else {
      stopRecording();
    }
  };
}

function startRecording() {
  if (!recognition) return;
  try {
    recognition.start();
  } catch (e) {
    // Already started
  }
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
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

// ========== Text-to-Speech ==========
function getBestVoice() {
  const voices = speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Priority list: most natural / neural voices first
  const preferredNames = [
    // Apple / macOS / iOS high-quality
    'Samantha', 'Karen', 'Moira', 'Tessa', 'Fiona', 'Victoria',
    // Google / Chrome
    'Google UK English Female', 'Google US English', 'Google UK English Male',
    // Microsoft Edge neural voices
    'Microsoft Aria Online (Natural) - English (United States)',
    'Microsoft Jenny Online (Natural) - English (United States)',
    'Microsoft Guy Online (Natural) - English (United States)',
    'Microsoft Sonia Online (Natural) - English (United Kingdom)',
    'Microsoft Natasha Online (Natural) - English (Australia)',
    'Microsoft Ana Online (Natural) - English (United States)',
    // Other good ones
    'Samantha (Enhanced)', 'Allison', 'Susan', 'Zira'
  ];

  // 1. Exact or partial match from preferred list
  for (const name of preferredNames) {
    const match = voices.find(v => v.name === name || v.name.includes(name));
    if (match) return match;
  }

  // 2. Any English voice that looks neural / natural / enhanced
  const natural = voices.find(v =>
    v.lang.startsWith('en') &&
    (v.name.toLowerCase().includes('natural') ||
     v.name.toLowerCase().includes('neural') ||
     v.name.toLowerCase().includes('enhanced') ||
     v.name.toLowerCase().includes('premium'))
  );
  if (natural) return natural;

  // 3. Prefer female English voices (usually warmer for this use-case)
  const femaleEn = voices.find(v =>
    v.lang.startsWith('en') &&
    (v.name.toLowerCase().includes('female') ||
     v.name.toLowerCase().includes('woman') ||
     ['samantha','karen','moira','tessa','fiona','victoria','zira','susan','allison','aria','jenny','sonia','natasha'].some(n => v.name.toLowerCase().includes(n)))
  );
  if (femaleEn) return femaleEn;

  // 4. Any English voice
  return voices.find(v => v.lang.startsWith('en')) || voices[0];
}

function speakText(text) {
  if (!text || !text.trim()) return;

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  // Make the text sound more natural by adding a short pause between summary and question
  // (many browsers respect the comma / period timing better with slight restructuring)
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1 ')   // normalize spacing after punctuation
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleaned);
  
  // More natural conversational settings
  utterance.rate = 0.92;      // slightly slower = more thoughtful
  utterance.pitch = 1.05;     // very slight lift keeps it warm, not flat
  utterance.volume = 1;

  const voice = getBestVoice();
  if (voice) {
    utterance.voice = voice;
  }

  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
}

// ========== AI Companion ("The Mindful Listener") ==========
// Lightweight, privacy-preserving local analysis (no external API calls)
function analyzeEntry(text) {
  const lower = text.toLowerCase();
  
  // Mood detection via keyword scoring
  const moods = {
    Grateful: ['grateful', 'thankful', 'blessed', 'appreciate', 'thank you', 'thanks', 'lucky', 'fortunate', 'joy', 'happy', 'love', 'wonderful'],
    Hopeful: ['hope', 'hopeful', 'looking forward', 'excited', 'optimistic', 'better', 'future', 'possible', 'believe', 'dream'],
    Calm: ['calm', 'peace', 'peaceful', 'relaxed', 'serene', 'quiet', 'still', 'content', 'centered', 'grounded', 'breathe'],
    Anxious: ['anxious', 'anxiety', 'worried', 'worry', 'nervous', 'stress', 'stressed', 'fear', 'scared', 'panic', 'uneasy', 'tense'],
    Overwhelmed: ['overwhelm', 'overwhelmed', 'too much', 'can\'t handle', 'exhausted', 'burned out', 'burnout', 'drowning', 'swamped', 'chaos'],
    Sad: ['sad', 'down', 'depressed', 'lonely', 'hurt', 'cry', 'crying', 'grief', 'miss', 'empty', 'hopeless', 'blue'],
    Reflective: ['think', 'thinking', 'reflect', 'wonder', 'realize', 'understand', 'learn', 'growth', 'insight', 'meaning'],
    Energized: ['energy', 'energized', 'motivated', 'inspired', 'productive', 'achieved', 'accomplished', 'progress', 'strong', 'powerful']
  };

  let scores = {};
  for (const [mood, keywords] of Object.entries(moods)) {
    scores[mood] = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
  }

  // Default if no strong signals
  let dominant = 'Reflective';
  let maxScore = 0;
  for (const [mood, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominant = mood;
    }
  }

  // Empathetic 2-sentence summary templates
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

  // CBT / mindfulness follow-up questions
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

  const summaryPair = summaries[dominant] || summaries.Reflective;
  const questionList = questions[dominant] || questions.Reflective;

  // Pick based on simple hash of text for variety
  const idx = text.length % 2;

  return {
    mood: dominant,
    summary: summaryPair[idx],
    question: questionList[idx]
  };
}

// ========== Entry Management ==========
function updateSaveButton() {
  saveBtn.disabled = transcriptEl.value.trim().length === 0;
}

function saveEntry() {
  const text = transcriptEl.value.trim();
  if (!text) return;

  stopRecording();

  const analysis = analyzeEntry(text);
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text,
    mood: analysis.mood,
    summary: analysis.summary,
    question: analysis.question,
    createdAt: new Date().toISOString()
  };

  const entries = getEntries();
  entries.unshift(entry);
  saveEntries(entries);

  // Show AI response
  moodTagEl.textContent = analysis.mood;
  moodTagEl.className = 'mood-tag ' + analysis.mood.toLowerCase();
  aiSummaryEl.textContent = analysis.summary;
  aiQuestionEl.textContent = analysis.question;
  aiSection.classList.remove('hidden');

  // Clear input
  transcriptEl.value = '';
  updateSaveButton();

  renderEntries();
  showToast('Entry saved privately');
  
  // Scroll AI into view
  aiSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function deleteEntry(id) {
  let entries = getEntries();
  entries = entries.filter(e => e.id !== id);
  saveEntries(entries);
  renderEntries();
  showToast('Entry deleted');
}

function renderEntries() {
  const entries = getEntries();
  const mood = moodFilter.value;
  const from = dateFrom.value ? new Date(dateFrom.value) : null;
  const to = dateTo.value ? new Date(dateTo.value + 'T23:59:59') : null;

  const filtered = entries.filter(e => {
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

  // Event listeners for dynamic buttons
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== Event Listeners ==========
function initEvents() {
  // Auth tabs
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
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    login(username, password);
  });

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    if (password !== confirm) {
      showToast('Passwords do not match');
      return;
    }
    signup(username, password);
  });

  // Mic
  micBtn.addEventListener('click', toggleRecording);

  // Transcript
  transcriptEl.addEventListener('input', updateSaveButton);
  clearBtn.addEventListener('click', () => {
    transcriptEl.value = '';
    updateSaveButton();
    stopRecording();
  });
  saveBtn.addEventListener('click', saveEntry);

  // AI section
  ttsBtn.addEventListener('click', () => {
    // Add a natural conversational pause between the reflection and the question
    const summary = aiSummaryEl.textContent.trim();
    const question = aiQuestionEl.textContent.trim();
    const text = `${summary} ... ${question}`;
    speakText(text);
  });
  dismissAiBtn.addEventListener('click', () => {
    aiSection.classList.add('hidden');
    speechSynthesis.cancel();
  });

  // Filters
  moodFilter.addEventListener('change', renderEntries);
  dateFrom.addEventListener('change', renderEntries);
  dateTo.addEventListener('change', renderEntries);
  clearFiltersBtn.addEventListener('click', () => {
    moodFilter.value = 'all';
    dateFrom.value = '';
    dateTo.value = '';
    renderEntries();
  });

  // Header
  themeToggle.addEventListener('click', toggleTheme);
  logoutBtn.addEventListener('click', logout);

  // Pre-load voices for TTS (browsers often load them asynchronously)
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
      // Voices are now available — getBestVoice() will pick the best one
    };
  }
  // Force a voice list load on some browsers
  speechSynthesis.getVoices();
}

// ========== Boot ==========
function boot() {
  initTheme();
  initSpeechRecognition();
  initEvents();

  const session = localStorage.getItem('mj_session');
  if (session && getUsers()[session]) {
    currentUser = session;
    showApp();
  } else {
    showAuth();
  }
}

boot();
