/*
  AI Confidence Analyzer - Unified Script
  - Stable SpeechRecognition with multi-language support (en-US, ta-IN, hi-IN)
  - Ensures recognition.start() only on user click
  - Avoids premature "no-speech" errors by requiring minimum listen time
  - Proper handling of onstart, onresult, onerror, onend
  - Real-time transcript display, Start/Stop UI control
  - Integration with existing analysis/display functions (kept simple)
*/

// ---- Configuration ----
const MIN_LISTEN_SECONDS = 5; // minimum time to listen before auto-stop
const SILENCE_THRESHOLD = 1.2; // seconds of silence to consider stopping after MIN_LISTEN_SECONDS

// ---- UI element refs (from index.html) ----
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMessage = document.getElementById('statusMessage');
const transcriptSection = document.getElementById('transcriptSection');
const transcriptDiv = document.getElementById('transcript');
const languageSelect = document.getElementById('languageSelect');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultsSection = document.getElementById('resultsSection');
const durationValue = document.getElementById('durationValue');
const wpmValue = document.getElementById('wpmValue');

// ---- State ----
let recognition = null;
let supported = false;
let isRecording = false;
let userRequestedStop = false;
let finalTranscript = '';
let interimTranscript = '';
let startTime = 0;
let lastResultTime = 0;
let silenceTimer = null;
let lastConfidence = null; // store last-final result confidence (0-1) or null if not provided

// ---- Helper: UI updates ----
function setStatus(text, type = 'info') {
  if (!statusMessage) return;
  statusMessage.textContent = text;
  statusMessage.className = 'status-message';
  statusMessage.classList.remove('hidden');
  if (type === 'error') statusMessage.classList.add('error');
  else if (type === 'success') statusMessage.classList.add('success');
  else statusMessage.classList.add('info');
}

function enableStart(enabled) { if (startBtn) startBtn.disabled = !enabled; }
function enableStop(enabled) { if (stopBtn) stopBtn.disabled = !enabled; }
function clearTranscriptUI() {
  finalTranscript = '';
  interimTranscript = '';
  lastConfidence = null;
  if (transcriptDiv) transcriptDiv.textContent = '';
  if (transcriptSection) transcriptSection.classList.add('hidden');
  if (durationValue) durationValue.textContent = '0s';
  if (wpmValue) wpmValue.textContent = '0';
}

// ---- Environment check ----
function checkEnvironment() {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  supported = !!Speech;
  if (!supported) {
    setStatus('❌ Web Speech API not supported. Use Chrome (desktop) for best results.', 'error');
    enableStart(false); enableStop(false);
  } else {
    setStatus('Ready — select language and press Start', 'info');
    enableStart(true); enableStop(false);
  }
  const secure = (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  if (!secure) console.warn('Not secure origin — speech recognition works reliably on HTTPS or localhost');
}

// ---- Microphone permission helper ----
async function ensureMicrophoneAccess() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach(t => t.stop());
    return true;
  } catch (err) {
    console.warn('getUserMedia failed:', err);
    return false;
  }
}

// ---- Recognition factory ----
function createRecognition(lang) {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) return null;
  const r = new Speech();
  r.lang = lang || 'en-US';
  r.interimResults = true;
  r.continuous = true;
  r.maxAlternatives = 1;
  r.onstart = onStart;
  r.onresult = onResult;
  r.onerror = onError;
  r.onend = onEnd;
  return r;
}

// ---- Start recording (user click) ----
async function startRecording() {
  if (!supported) { setStatus('❌ Web Speech API unsupported.', 'error'); return; }

  const micOk = await ensureMicrophoneAccess();
  if (!micOk) { setStatus('Please allow microphone access.', 'error'); return; }

  clearTranscriptUI();
  userRequestedStop = false;

  try {
    recognition = createRecognition(languageSelect ? languageSelect.value : 'en-US');
  } catch (err) {
    console.error('createRecognition failed', err);
    setStatus('Failed to initialize speech recognition.', 'error');
    return;
  }

  try {
    recognition.start(); // must be called from user gesture
    enableStart(false);
    setStatus('Starting... allow microphone if prompted.', 'info');
  } catch (err) {
    console.error('recognition.start error', err);
    setStatus('Could not start recognition. Check permissions.', 'error');
    enableStart(true);
  }
}

// ---- Stop recording (user click or silence) ----
function stopRecording() {
  userRequestedStop = true;
  if (!recognition) { finalizeRecording(); return; }
  try { recognition.stop(); } catch (err) { console.warn('stop error', err); finalizeRecording(); }
}

// ---- Finalize UI and call analysis ----
function finalizeRecording() {
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  isRecording = false;
  enableStart(true); enableStop(false);

  const text = (finalTranscript || '').trim();
  if (!text) {
    setStatus("We couldn't hear you clearly. Please speak louder and try again.", 'error');
    transcriptSection.classList.add('hidden');
    return;
  }

  // Compute duration and WPM
  const durationSec = Math.max(0.5, (Date.now() - startTime) / 1000);
  const words = text.split(/\s+/).filter(Boolean).length;
  const wpm = Math.round((words / durationSec) * 60);
  if (wpmValue) wpmValue.textContent = wpm;
  if (durationValue) durationValue.textContent = Math.round(durationSec) + 's';

  // Confidence UI: show percentage if available, otherwise 'Not Available'
  try {
    const confElem = document.getElementById('confidencePercent');
    const confBar = document.getElementById('confidenceBar');
    if (confElem) {
      if (typeof lastConfidence === 'number' && lastConfidence > 0) {
        const pct = Math.round(lastConfidence * 100);
        confElem.textContent = pct + '%';
        if (confBar) confBar.style.width = pct + '%';
      } else {
        confElem.textContent = 'Not Available';
        if (confBar) confBar.style.width = '0%';
      }
    }
  } catch (e) { console.warn('Confidence UI update failed', e); }

  setStatus('✅ Recording complete. Analysis ready.', 'success');

  // Call existing analysis if available
  if (typeof analyzeConfidence === 'function') {
    loadingSpinner && loadingSpinner.classList.remove('hidden');
    setTimeout(() => {
      analyzeConfidence(text, durationSec);
      // Save session to practice history (always save, even if no confidence)
      try { saveSessionToHistory({ transcript: text, wpm, language: (languageSelect?languageSelect.value:'en-US'), date: new Date().toISOString(), confidence: (typeof lastConfidence === 'number' ? lastConfidence : null) }); } catch (e) { console.warn('save history failed', e); }
    }, 120);
  }
}

// ---- Event handlers ----
function onStart() {
  isRecording = true;
  startTime = Date.now();
  lastResultTime = Date.now();
  userRequestedStop = false;
  setStatus('🔴 Recording... Speak now', 'info');
  enableStart(false); enableStop(true);
  transcriptSection.classList.remove('hidden');

  if (silenceTimer) clearTimeout(silenceTimer);
  silenceTimer = setTimeout(checkSilenceAndMaybeStop, MIN_LISTEN_SECONDS * 1000);
}

function onResult(event) {
  lastResultTime = Date.now();
  let interim = '';
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const r = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      finalTranscript += r + ' ';
      // capture confidence from final results when available
      try {
        const conf = event.results[i][0].confidence;
        if (typeof conf === 'number') lastConfidence = conf;
      } catch (e) { /* ignore */ }
    }
    else interim += r;
  }
  interimTranscript = interim;
  const display = (finalTranscript + interimTranscript).trim();
  transcriptDiv.textContent = display;

  // reset silence timer
  if (silenceTimer) clearTimeout(silenceTimer);
  silenceTimer = setTimeout(checkSilenceAndMaybeStop, MIN_LISTEN_SECONDS * 1000);
}

function onError(event) {
  console.error('Recognition error', event);
  const code = event && (event.error || event.type || event.name);
  if (code === 'not-allowed' || code === 'PermissionDeniedError' || code === 'SecurityError') {
    setStatus('Please allow microphone access.', 'error');
    enableStart(true); enableStop(false);
    return;
  }
  if (code === 'network') { setStatus('Network error occurred during speech recognition.', 'error'); return; }
  if (code === 'no-speech') { console.info('no-speech event — will be handled by finalize logic'); return; }
  setStatus('Speech recognition error: ' + (code || 'unknown'), 'error');
}

function onEnd() {
  console.log('Recognition ended; userRequestedStop=', userRequestedStop);
  if (userRequestedStop) { finalizeRecording(); return; }
  const listened = (Date.now() - startTime) / 1000;
  const sinceLast = (Date.now() - lastResultTime) / 1000;
  if (listened >= MIN_LISTEN_SECONDS && sinceLast >= 0.8) { finalizeRecording(); return; }

  // attempt a gentle restart to avoid transient stops
  setStatus('🟢 Listening... resuming', 'info');
  try {
    recognition = createRecognition(languageSelect ? languageSelect.value : 'en-US');
    recognition && recognition.start();
  } catch (err) { console.warn('Auto-restart failed', err); finalizeRecording(); }
}

// ---- Silence monitor ----
function checkSilenceAndMaybeStop() {
  const now = Date.now();
  const listened = (now - startTime) / 1000;
  const sinceLast = (now - lastResultTime) / 1000;
  if (listened >= MIN_LISTEN_SECONDS && sinceLast >= SILENCE_THRESHOLD) {
    console.info('Silence detected after listening; stopping');
    stopRecording();
  } else {
    if (silenceTimer) clearTimeout(silenceTimer);
    const remaining = Math.max(0.5, (MIN_LISTEN_SECONDS - listened));
    silenceTimer = setTimeout(checkSilenceAndMaybeStop, Math.min(2000, remaining * 1000));
  }
}

// ---- Language change: restart if running ----
languageSelect && languageSelect.addEventListener('change', (e) => {
  const lang = e.target.value;
  if (isRecording) {
    try {
      userRequestedStop = false;
      recognition && recognition.stop();
      setTimeout(() => { recognition = createRecognition(lang); recognition && recognition.start(); }, 250);
    } catch (err) { console.warn('Language change while recording failed', err); setStatus('Could not change language while recording.', 'error'); }
  } else {
    recognition = createRecognition(lang);
  }
});

// ---- Wire UI controls ----
startBtn && startBtn.addEventListener('click', (e) => { e.preventDefault(); startRecording(); });
stopBtn && stopBtn.addEventListener('click', (e) => { e.preventDefault(); stopRecording(); });
resetBtn && resetBtn.addEventListener('click', (e) => { e.preventDefault(); clearTranscriptUI(); setStatus('Cleared.', 'info'); });

// ---- Practice history (localStorage) ----
const HISTORY_KEY = 'ai_confidence_history_v1';
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { console.warn('loadHistory parse failed', e); return []; }
}

function saveHistory(arr) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); } catch (e) { console.warn('saveHistory failed', e); }
}

function saveSessionToHistory(session) {
  try {
    const history = loadHistory();
    history.unshift(session); // most recent first
    // cap history to 200 entries
    if (history.length > 200) history.length = 200;
    saveHistory(history);
    renderHistoryList();
    updateHistoryChart();
  } catch (e) { console.warn('saveSessionToHistory error', e); }
}

function renderHistoryList() {
  try {
    const list = document.getElementById('historyList');
    if (!list) return;
    const history = loadHistory();
    list.innerHTML = '';
    if (!history.length) { list.innerHTML = '<li>No practice history yet.</li>'; return; }
    history.forEach((s, idx) => {
      const li = document.createElement('li');
      const date = s.date ? new Date(s.date).toLocaleString() : 'Unknown';
      const confText = (s.confidence === null || typeof s.confidence !== 'number') ? 'N/A' : Math.round(s.confidence*100) + '%';
      li.innerHTML = `<strong>${date}</strong> — <em>${s.language || 'en'}</em> — WPM: ${s.wpm || 0} — Confidence: ${confText}<div class="history-transcript">${(s.transcript||'').slice(0,200)}</div>`;
      list.appendChild(li);
    });
  } catch (e) { console.warn('renderHistoryList failed', e); }
}

// lightweight history chart updater (Chart.js must be present)
let historyChartInstance = null;
function updateHistoryChart() {
  try {
    const raw = loadHistory().slice(0,30).reverse();
    const labels = raw.map((s,i)=> s.date ? new Date(s.date).toLocaleTimeString() : i);
    const data = raw.map(s => (typeof s.confidence === 'number' ? Math.round(s.confidence*100) : null));
    const ctx = document.getElementById('historyChart');
    if (!ctx) return;
    if (historyChartInstance) { historyChartInstance.data.labels = labels; historyChartInstance.data.datasets[0].data = data; historyChartInstance.update(); return; }
    if (typeof Chart !== 'undefined') {
      historyChartInstance = new Chart(ctx, { type: 'line', data: { labels, datasets:[{ label:'Confidence %', data, borderColor:'#4caf50', backgroundColor:'rgba(76,175,80,0.15)', spanGaps:true }] }, options:{ scales:{ y:{ beginAtZero:true, max:100 } } } });
    }
  } catch (e) { console.warn('updateHistoryChart failed', e); }
}

// ---- Boot ----
function init() {
  checkEnvironment();
  // pre-create recognition for chosen language (not started)
  recognition = createRecognition(languageSelect ? languageSelect.value : 'en-US');
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('DOMContentLoaded', () => { renderHistoryList(); updateHistoryChart(); });

// -----------------------
// Below: NLP analysis and display functions (imported/adapted from earlier code)
// Keep these functions intact so that analyzeConfidence(...) called above works
// -----------------------

// Grammar rules
const GRAMMAR_RULES = [
    { pattern: /\bi\s+(?:is|was|go|goes|have|has|do|does)\b/gi, error: 'Subject-verb agreement' },
    { pattern: /\bhe\s+(?:go|are|have|do)\b/gi, error: 'Subject-verb agreement' },
    { pattern: /\bshe\s+(?:go|are|have|do|don\'t|didn\'t)\b/gi, error: 'Subject-verb agreement' },
    { pattern: /\bthey\s+(?:goes|was|doesn\'t|has)\b/gi, error: 'Subject-verb agreement' },
    { pattern: /\bwe\s+(?:was|goes|doesn\'t|has)\b/gi, error: 'Subject-verb agreement' },
    { pattern: /\bit\s+(?:have|do|are)\b/gi, error: 'Subject-verb agreement' },
    { pattern: /\byou\s+(?:was|goes|doesn\'t)\b/gi, error: 'Subject-verb agreement' },
    { pattern: /\b(?:yesterday|last\s+week)\s+(?:i\s+go|he\s+go|she\s+eat)\b/gi, error: 'Incorrect past tense' },
    { pattern: /\ba\s+[aeiou]/gi, error: 'Incorrect article usage' },
    { pattern: /\bdiscuss\s+about\b/gi, error: 'Redundant preposition' },
    { pattern: /\breturn\s+back\b/gi, error: 'Redundant word' },
    { pattern: /\b(\w+)\s+\1\b/gi, error: 'Repeated word' },
    { pattern: /\b(?:don\'t|didn\'t|can\'t)\s+(?:no|nothing|never|nobody)/gi, error: 'Double negative' },
    { pattern: /\b(?:more|very)\s+(?:better|worse|best|worst)\b/gi, error: 'Redundant modifier' },
    { pattern: /\beach\s+and\s+every\b/gi, error: 'Redundant expression' }
];

const FILLER_WORDS = [
    'um', 'uh', 'err', 'erm', 'uhh', 'umm', 'ugh',
    'like', 'you know', 'i mean', 'well', 'so', 'anyway',
    'basically', 'actually', 'literally', 'sort of', 'kind of',
    'maybe', 'probably', 'possibly', 'perhaps', 'i think',
    'really', 'very much', 'quite', 'rather', 'somewhat',
    'just', 'namely', 'so to speak', 'after all'
];

function detectGrammarErrors(text) {
    const errors = [];
    const lowerText = text.toLowerCase();
    GRAMMAR_RULES.forEach(rule => {
        const regex = new RegExp(rule.pattern);
        let match;
        while ((match = regex.exec(lowerText)) !== null) {
            const errorPhrase = text.substring(match.index, match.index + match[0].length);
            errors.push({ error: rule.error, phrase: errorPhrase });
        }
    });
    return errors;
}

function detectFluencyIssues(text, sentences) {
    const issues = [];
    const words = text.toLowerCase().split(/\s+/).filter(w => w);
    if (words.length < 10) issues.push({ error: 'Very short response', phrase: `Only ${words.length} words` });
    sentences.forEach(sentence => { const sentenceWords = sentence.trim().split(/\s+/).length; if (sentenceWords > 25) issues.push({ error: 'Run-on sentence', phrase: `${sentenceWords} words without pause` }); });
    return issues;
}

function detectFillerWords(text) {
    const issues = [];
    let totalFillers = 0;
    FILLER_WORDS.forEach(filler => {
        const regex = new RegExp('\\b' + filler + '\\b', 'gi');
        let m;
        while ((m = regex.exec(text)) !== null) { totalFillers++; }
    });
    return { issues, total: totalFillers };
}

function analyzeVocabulary(text) {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const unique = new Set(words);
    const richness = words.length ? unique.size / words.length : 0;
    const issues = [];
    if (richness < 0.4) issues.push({ error: 'Low vocabulary diversity', phrase: `Only ${Math.round(richness*100)}% unique words` });
    return { issues, richness, unique: unique.size, total: words.length };
}

function calculateGrammarAccuracyScoreHigh(grammarErrors, words = [], sentences = []) {
    const errorCount = grammarErrors.length;
    const base = 100;
    const grammarPenalty = errorCount * (5 + errorCount);
    const freq = {}; words.forEach(w => { if (w && w.length > 2) freq[w] = (freq[w] || 0) + 1; });
    const repeatedWordCount = Object.values(freq).filter(c => c > 2).length;
    const repetitionPenalty = repeatedWordCount * (3 + repeatedWordCount);
    const totalWords = words.length; const sentenceCount = Math.max(1, sentences.length);
    const avg = sentenceCount > 0 ? totalWords / sentenceCount : totalWords; let sentencePenalty = 0;
    if (avg < 6 || avg > 30) sentencePenalty = 20; else if (avg < 8 || avg > 20) sentencePenalty = 8;
    let totalPenalty = grammarPenalty + repetitionPenalty + sentencePenalty; let score = Math.max(0, base - totalPenalty); score = Math.round(Math.max(0, Math.min(100, score)));
    return score;
}

function calculateConfidenceLevelHigh(fillerPercentage, vocabAnalysis, words, sentences, totalWords, fluencyIssues, grammarErrorsCount = 0) {
    let score = 100; let fillerPenalty = 0;
    if (fillerPercentage > 20) fillerPenalty = 40; else if (fillerPercentage > 10) fillerPenalty = 25; else if (fillerPercentage > 5) fillerPenalty = 12; else if (fillerPercentage > 0) fillerPenalty = 5;
    score -= fillerPenalty; const uniqueRatio = vocabAnalysis.richness || 0; let vocabPenalty = 0;
    if (uniqueRatio < 0.4) vocabPenalty = 30; else if (uniqueRatio < 0.5) vocabPenalty = 20; else if (uniqueRatio < 0.6) vocabPenalty = 10; score -= vocabPenalty;
    const freq = {}; words.forEach(w => { if (w && w.length > 2) freq[w] = (freq[w] || 0) + 1; });
    const repeatedWordCount = Object.values(freq).filter(c => c > 2).length; const repetitionPenalty = repeatedWordCount > 0 ? repeatedWordCount * (3 + repeatedWordCount) : 0; score -= repetitionPenalty;
    const sentenceCount = Math.max(1, sentences.length); const avgWordsPerSentence = sentenceCount > 0 ? totalWords / sentenceCount : totalWords;
    let sentencePenalty = 0; if (avgWordsPerSentence < 6 || avgWordsPerSentence > 30) sentencePenalty = 20; else if (avgWordsPerSentence < 8 || avgWordsPerSentence > 20) sentencePenalty = 6; score -= sentencePenalty;
    const runOnCount = fluencyIssues.filter(i => i.error === 'Run-on sentence').length; if (runOnCount > 0) score -= Math.min(15, runOnCount * 5);
    if (totalWords < 12) score -= 18; else if (totalWords < 20) score -= 8;
    if (fillerPercentage > 15 || grammarErrorsCount > 4) score = Math.min(score, 70);
    return Math.round(Math.max(0, Math.min(100, score)));
}

function calculateConfidenceLevel(fillerPercentage, vocabAnalysis, words, sentences, totalWords, fluencyIssues, grammarErrorsCount = 0) {
    return calculateConfidenceLevelHigh(fillerPercentage, vocabAnalysis, words, sentences, totalWords, fluencyIssues, grammarErrorsCount);
}

function analyzeConfidence(transcript, durationSec = 0) {
    if (!transcript || transcript.trim().length === 0) { loadingSpinner && loadingSpinner.classList.add('hidden'); setStatus('❌ Error: No speech to analyze.', 'error'); return; }
    const text = transcript.toLowerCase(); const words = text.split(/\s+/).filter(w => w.length>0); const sentences = transcript.split(/[.!?]+/).filter(s=>s.trim().length>0); const totalWords = words.length;
    const duration = durationSec || Math.max(0.5, (Date.now() - startTime) / 1000); const wpm = duration>0 ? (totalWords / duration)*60 : 0;
    const grammarErrors = detectGrammarErrors(transcript); const fluencyIssues = detectFluencyIssues(text, sentences); const { issues: fillerIssues, total: fillerCount } = detectFillerWords(text); const vocabAnalysis = analyzeVocabulary(text);
    const fillerPercentage = totalWords>0 ? (fillerCount / totalWords)*100 : 0;
    const grammarAccuracy = calculateGrammarAccuracyScoreHigh(grammarErrors, words, sentences);
    const confidenceLevel = calculateConfidenceLevel(fillerPercentage, vocabAnalysis, words, sentences, totalWords, fluencyIssues, grammarErrors.length);
    const overallPerformance = Math.round((grammarAccuracy + confidenceLevel)/2);
    let feedback=''; if (overallPerformance>=80) feedback='⭐ Excellent!'; else if (overallPerformance>=70) feedback='👍 Good!'; else if (overallPerformance>=50) feedback='💪 Moderate.'; else feedback='🎯 Keep practicing!';
    displayResults({ grammarAccuracy, confidenceLevel, overallPerformance, feedback, grammarErrors, fluencyIssues, fillerIssues, vocabAnalysis, metrics:{ totalWords, fillerCount, fillerPercentage, vocabRichness: vocabAnalysis.richness, durationSec: duration, wpm } });
}

// Display results (keeps previous detailed implementation)
function displayResults(data) {
    try {
        if (!data) throw new Error('No data');
        const { grammarAccuracy, confidenceLevel, overallPerformance, feedback, grammarErrors, fluencyIssues, fillerIssues, vocabAnalysis, metrics } = data;
        const grammarAccuracyElem = document.getElementById('grammarAccuracyValue'); const grammarProgressBar = document.getElementById('grammarProgressBar');
        const confidenceLevelElem = document.getElementById('confidenceLevelValue'); const confidenceProgressBar = document.getElementById('confidenceProgressBar');
        const overallPerfElem = document.getElementById('overallPerformanceValue'); const overallProgressBar = document.getElementById('overallProgressBar');
        const feedbackText = document.getElementById('feedbackText');
        loadingSpinner && loadingSpinner.classList.add('hidden'); setStatus('✅ Analysis complete!', 'success');
        animateScoreIncrease(grammarAccuracyElem, grammarProgressBar, grammarAccuracy);
        animateScoreIncrease(confidenceLevelElem, confidenceProgressBar, confidenceLevel);
        animateScoreIncrease(overallPerfElem, overallProgressBar, overallPerformance);
        feedbackText && (feedbackText.textContent = feedback);
        const metricElements = { 'totalWords': metrics.totalWords, 'fillerCount': metrics.fillerCount, 'fillerPercent': metrics.fillerPercentage.toFixed(1) + '%', 'vocabRichness': (metrics.vocabRichness*100).toFixed(1) + '%' };
        for (const [id, value] of Object.entries(metricElements)) { const el = document.getElementById(id); if (el) el.textContent = value; }
        // WPM/duration
        if (metrics && document.getElementById('wpmValue') && document.getElementById('durationValue')) {
            document.getElementById('wpmValue').textContent = Math.round(metrics.wpm || 0);
            document.getElementById('durationValue').textContent = Math.round(metrics.durationSec || 0) + 's';
        }
        // show visualRow and other UI
        const visualRow = document.getElementById('visualRow'); if (visualRow) visualRow.classList.remove('hidden');
        const resultsSection = document.getElementById('resultsSection'); if (resultsSection) resultsSection.classList.remove('hidden');
        const resetBtn = document.getElementById('resetBtn'); if (resetBtn) resetBtn.style.display = 'inline-flex';
        const startBtn = document.getElementById('startBtn'); const stopBtn = document.getElementById('stopBtn'); if (startBtn) startBtn.disabled = true; if (stopBtn) stopBtn.disabled = true;
    } catch (err) { console.error('displayResults error', err); setStatus('Error displaying results', 'error'); loadingSpinner && loadingSpinner.classList.add('hidden'); }
}

function animateScoreIncrease(scoreElement, progressBar, finalScore) {
    if (!scoreElement || !progressBar) return; let current=0; const inc = finalScore/40; const anim = setInterval(()=>{ current+=inc; if (current>=finalScore) { current=finalScore; clearInterval(anim); } const d = Math.round(current); scoreElement.textContent = d; progressBar.style.width = d + '%'; },16);
}

function getSuggestedCorrection(errorType, phrase) {
    const corrections = { 'Subject-verb agreement':'Ensure the verb agrees with the subject (e.g., "I am" not "I is")', 'Incorrect tense':'Use consistent tense', 'Incorrect past tense':'Use correct past tense', 'Incorrect article usage':'Use "an" before vowels', 'Redundant preposition':'Remove the unnecessary preposition' };
    return corrections[errorType] || null;
}

// End of script
