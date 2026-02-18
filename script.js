// =====================================================
// AI CONFIDENCE ANALYZER - Advanced NLP Analysis
// Pure JavaScript Frontend - No Backend Required
// =====================================================

// ===== WEB SPEECH API SETUP =====

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    alert('❌ Sorry, your browser does not support Web Speech API.\n\nPlease use Chrome, Edge, or Safari for best results.');
}

const recognition = new SpeechRecognition();

// ===== UI ELEMENT REFERENCES =====
// These will be initialized after DOM loads

let startBtn;
let stopBtn;
let resetBtn;
let statusMessage;
let transcriptSection;
let transcriptDiv;
let loadingSpinner;
let resultsSection;

// ===== STATE VARIABLES =====

let isRecording = false;
let finalTranscript = '';
let interimTranscript = '';
let isStarting = false;
// Toggle high-accuracy scoring mode. Set to true for stricter, more realistic scores.
const HIGH_ACCURACY_MODE = true;

// ===== GRAMMAR RULES DATABASE =====

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

// ===== FILLER WORDS DATABASE =====

const FILLER_WORDS = [
    'um', 'uh', 'err', 'erm', 'uhh', 'umm', 'ugh',
    'like', 'you know', 'i mean', 'well', 'so', 'anyway',
    'basically', 'actually', 'literally', 'sort of', 'kind of',
    'maybe', 'probably', 'possibly', 'perhaps', 'i think',
    'really', 'very much', 'quite', 'rather', 'somewhat',
    'just', 'namely', 'so to speak', 'after all'
];

// ===== INITIALIZATION FUNCTION =====

function initializeElements() {
    startBtn = document.getElementById('startBtn');
    stopBtn = document.getElementById('stopBtn');
    resetBtn = document.getElementById('resetBtn');
    statusMessage = document.getElementById('statusMessage');
    transcriptSection = document.getElementById('transcriptSection');
    transcriptDiv = document.getElementById('transcript');
    loadingSpinner = document.getElementById('loadingSpinner');
    resultsSection = document.getElementById('resultsSection');
    
    const requiredElements = {startBtn, stopBtn, resetBtn, statusMessage, transcriptSection, transcriptDiv, loadingSpinner, resultsSection};
    for (const [name, element] of Object.entries(requiredElements)) {
        if (!element) {
            console.error(`❌ Element not found: ${name}`);
            return false;
        }
    }
    
    console.log('✅ All UI elements loaded');
    return true;
}

// ===== EVENT LISTENER ATTACHMENT =====

function attachEventListeners() {
    console.log('🔗 Attaching event listeners...');
    
    if (!startBtn || !stopBtn || !resetBtn) {
        console.error('❌ Button elements not found');
        return false;
    }
    
    startBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        startRecording();
    });
    
    stopBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        stopRecording();
    });
    
    resetBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        resetAnalyzer();
    });
    
    console.log('✅ Event listeners attached');
    return true;
}

// ===== RECOGNITION EVENT HANDLERS =====

function attachRecognitionHandlers() {
    recognition.onstart = function() {
        console.log('🎤 Recognition started');
        isRecording = true;
        isStarting = false;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        resetBtn.style.display = 'none';
        showStatus('🎤 Listening... Speak now!', 'info');
        finalTranscript = '';
        interimTranscript = '';
        resultsSection.classList.add('hidden');
        transcriptSection.classList.add('hidden');
        loadingSpinner.classList.add('hidden');
    };

    recognition.onerror = function(event) {
        console.error('Recognition error event:', event);
        let errorMessage = 'An unknown error occurred.';

        // event.error is a short code in SpeechRecognition API
        switch (event.error) {
            case 'no-speech':
                errorMessage = '❌ No speech detected. Please speak clearly.';
                break;
            case 'audio-capture':
                errorMessage = '❌ No microphone found. Check your device.';
                break;
            case 'not-allowed':
            case 'service-not-allowed':
                errorMessage = '❌ Microphone access denied. Please allow microphone permission.';
                break;
            case 'network':
                errorMessage = '❌ Network error. Check your connection.';
                break;
            case 'aborted':
                errorMessage = '❌ Recognition aborted.';
                break;
            case 'language-not-supported':
            case 'not-supported':
                errorMessage = '❌ Speech recognition not supported for this language.';
                break;
            default:
                if (event.message) errorMessage = `❌ ${event.message}`;
                else errorMessage = `❌ Error: ${event.error || 'unknown'}`;
        }

        showStatus(errorMessage, 'error');
        startBtn.disabled = false;
        stopBtn.disabled = true;
        isRecording = false;
        isStarting = false;
        loadingSpinner.classList.add('hidden');
    };

    recognition.onend = function() {
        console.log('🛑 Recognition ended');
        // If we ended while we expected to be recording, keep UI consistent
        isRecording = false;
        isStarting = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        // If there is any transcript, show transcript section
        if (finalTranscript.trim() !== '') {
            transcriptSection.classList.remove('hidden');
        }
    };

    recognition.onresult = function(event) {
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript = transcript;
            }
        }
        
        const displayText = finalTranscript + interimTranscript;
        transcriptDiv.textContent = displayText;
        
        if (displayText.trim() !== '') {
            transcriptSection.classList.remove('hidden');
        }
    };
}

// ===== MAIN CONTROL FUNCTIONS =====

// Request microphone access via getUserMedia to ensure permission prompt appears
async function ensureMicrophoneAccess() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showStatus('❌ Microphone API not supported in this browser.', 'error');
        return false;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // stop tracks immediately to free device for SpeechRecognition
        stream.getTracks().forEach(t => t.stop());
        return true;
    } catch (err) {
        console.error('getUserMedia failed:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
            showStatus('❌ Microphone permission denied. Please allow microphone access.', 'error');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            showStatus('❌ No microphone detected. Connect a microphone and try again.', 'error');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            showStatus('❌ Microphone is currently in use by another app.', 'error');
        } else {
            showStatus('❌ Unable to access microphone: ' + (err.message || err.name), 'error');
        }
        return false;
    }
}

async function startRecording() {
    console.log('🔴 START clicked');
    // Prevent duplicate starts
    if (isRecording || isStarting) {
        console.warn('Start requested but recognition already starting/recording');
        showStatus('ℹ️ Recording already in progress.', 'info');
        return;
    }
    isStarting = true;
    startBtn.disabled = true;
    finalTranscript = '';
    interimTranscript = '';
    transcriptSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    statusMessage.classList.add('hidden');
    loadingSpinner.classList.add('hidden');

    if (!SpeechRecognition) {
        showStatus('❌ Web Speech API not supported in this browser.', 'error');
        return;
    }

    // Ensure microphone permission first (works reliably on Chrome localhost)
    const access = await ensureMicrophoneAccess();
    if (!access) {
        isStarting = false;
        startBtn.disabled = false;
        return;
    }

    try {
        recognition.start();
        // onstart handler will set proper UI, but set immediate feedback
        // keep startBtn disabled while starting; onstart will adjust states
        stopBtn.disabled = false;
        showStatus('🎤 Starting microphone... If prompted, allow microphone access.', 'info');
        console.log('✅ recognition.start() invoked');
    } catch (err) {
        console.error('Error calling recognition.start():', err);
        let msg = 'Error starting microphone.';
        if (err && err.message) msg += ' ' + err.message;
        showStatus('❌ ' + msg, 'error');
        startBtn.disabled = false;
        stopBtn.disabled = true;
        isStarting = false;
    }
}

function stopRecording() {
    console.log('⏹️ STOP clicked');
    console.log('Current isRecording state:', isRecording, 'isStarting:', isStarting);
    console.log('Final transcript length:', finalTranscript.length);
    console.log('Transcript content:', finalTranscript);
    // Prevent stopping when not recording or not in the process of starting
    if (!isRecording && !isStarting) {
        console.warn('Stop requested but not recording');
        showStatus('ℹ️ Not currently recording.', 'info');
        return;
    }

    try {
        recognition.stop();
        console.log('✅ recognition.stop() called');
    } catch (err) {
        console.error('Error calling recognition.stop():', err);
    }
    
    const speechText = finalTranscript.trim();
    if (speechText === '') {
        console.error('❌ No speech detected in transcript');
        showStatus('❌ No speech detected. Try again.', 'error');
        startBtn.disabled = false;
        stopBtn.disabled = true;
        return;
    }
    
    console.log('📝 Processing transcript with', speechText.split(/\s+/).length, 'words');
    
    loadingSpinner.classList.remove('hidden');
    showStatus('⏳ Analyzing speech...', 'info');
    
    // Add a small delay to ensure recognition fully stops before analysis
    setTimeout(() => {
        console.log('🔍 Starting analysis after delay');
        analyzeConfidence(speechText);
    }, 100);
}

function resetAnalyzer() {
    console.log('🔄 RESET clicked');
    finalTranscript = '';
    interimTranscript = '';
    isRecording = false;
    transcriptSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    statusMessage.classList.add('hidden');
    loadingSpinner.classList.add('hidden');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    resetBtn.style.display = 'none';
}

// ===== UI HELPER FUNCTIONS =====

function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
    statusMessage.classList.remove('hidden');
}

// ===== GRAMMAR & NLP ANALYSIS =====

function detectGrammarErrors(text) {
    const errors = [];
    const lowerText = text.toLowerCase();
    
    GRAMMAR_RULES.forEach(rule => {
        const regex = new RegExp(rule.pattern);
        let match;
        
        while ((match = regex.exec(lowerText)) !== null) {
            const errorPhrase = text.substring(match.index, match.index + match[0].length);
            errors.push({
                error: rule.error,
                phrase: errorPhrase
            });
        }
    });
    
    return errors;
}

function detectFluencyIssues(text, sentences) {
    const issues = [];
    const words = text.toLowerCase().split(/\s+/).filter(w => w);
    
    if (words.length < 10) {
        issues.push({
            error: 'Very short response',
            phrase: `Only ${words.length} words`
        });
    }
    
    sentences.forEach(sentence => {
        const sentenceWords = sentence.trim().split(/\s+/).length;
        if (sentenceWords > 25) {
            issues.push({
                error: 'Run-on sentence',
                phrase: `${sentenceWords} words without pause`
            });
        }
    });
    
    return issues;
}

function detectFillerWords(text) {
    const issues = [];
    let totalFillers = 0;
    
    FILLER_WORDS.forEach(filler => {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        let count = 0;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            count++;
            totalFillers++;
        }
        
        if (count > 0) {
            issues.push({
                error: `"${filler}"`,
                phrase: `Used ${count} time${count > 1 ? 's' : ''}`
            });
        }
    });
    
    return { issues, total: totalFillers };
}

function analyzeVocabulary(text) {
    const issues = [];
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const uniqueWords = new Set(words);
    const richness = uniqueWords.size / words.length;
    
    if (richness < 0.4) {
        issues.push({
            error: 'Low vocabulary diversity',
            phrase: `Only ${Math.round(richness * 100)}% unique words`
        });
    }
    
    return { issues, richness, unique: uniqueWords.size, total: words.length };
}

// ===== GRAMMAR ACCURACY CALCULATION =====

// ===== PRONUNCIATION ACCURACY ESTIMATION =====

function calculatePronunciationAccuracy(text, words) {
    // Estimate pronunciation accuracy based on:
    // 1. Speech length (longer = more reliable recognition)
    // 2. Common/recognized words present
    // 3. Word pattern coherence
    
    // Common English words that indicate good transcription
    const commonWords = [
        'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
        'be', 'being', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that',
        'what', 'which', 'who', 'when', 'where', 'why', 'how'
    ];
    
    const totalWords = words.length;
    if (totalWords === 0) return 100;
    
    // Count common words present in transcript
    const commonWordsUsed = words.filter(w => commonWords.includes(w.toLowerCase())).length;
    const commonWordRatio = (commonWordsUsed / totalWords) * 100;
    
    // Base pronunciation accuracy on multiple factors
    let pronunciationScore = 100;
    
    // Factor 1: Common word ratio (speech with >20% common words is reliable)
    if (commonWordRatio < 15) {
        pronunciationScore -= 15; // Unusual words, possibly mispronounced
    } else if (commonWordRatio < 25) {
        pronunciationScore -= 5;
    }
    
    // Factor 2: Speech length (need at least 5 words for reliable recognition)
    if (totalWords < 5) {
        pronunciationScore -= 20;
    } else if (totalWords < 10) {
        pronunciationScore -= 10;
    }
    
    // Factor 3: Word length variety (mix of short and long words)
    const wordLengths = words.map(w => w.length);
    const avgWordLength = wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length;
    const maxWordLength = Math.max(...wordLengths);
    const minWordLength = Math.min(...wordLengths);
    
    // If all words are same length or too short, might indicate recognition issues
    if (maxWordLength - minWordLength < 2) {
        pronunciationScore -= 5;
    }
    
    // If average word length is very short, transcription might be fragmented
    if (avgWordLength < 3) {
        pronunciationScore -= 8;
    }
    
    // Ensure score stays in valid range
    return Math.max(0, Math.min(100, pronunciationScore));
}

// ===== CALCULATE GRAMMAR ACCURACY SCORE (Independent) =====

function calculateGrammarAccuracyScore(grammarErrors, sentences) {
    // Default (legacy) grammar scoring kept for non-high accuracy mode.
    // For HIGH_ACCURACY_MODE we use calculateGrammarAccuracyScoreHigh instead.
    console.log('🔤 ===== GRAMMAR ACCURACY SCORING (LEGACY) =====');

    let score = 100;
    const penalties = [];

    if (grammarErrors.length === 0) {
        console.log('  ✅ No grammar errors detected: 100/100');
        console.log('🔤 ===== END GRAMMAR SCORING =====\n');
        return 100;
    }

    // Count errors by type for weighted penalties (legacy fallback)
    const errorsByType = {};
    grammarErrors.forEach(err => {
        errorsByType[err.error] = (errorsByType[err.error] || 0) + 1;
    });

    if (errorsByType['Subject-verb agreement']) {
        const penalty = Math.min(25, errorsByType['Subject-verb agreement'] * 5);
        score -= penalty;
        penalties.push({ type: 'Subject-verb agreement', count: errorsByType['Subject-verb agreement'], penalty });
    }

    // other legacy deductions (kept simple)
    const legacyPenalty = Math.min(30, grammarErrors.length * 3);
    score -= legacyPenalty;

    score = Math.max(0, Math.min(100, score));
    console.log(`  📊 Grammar Accuracy Score (legacy): ${score}/100`);
    console.log('🔤 ===== END GRAMMAR SCORING =====\n');
    return score;
}

/*
 * HIGH ACCURACY: Strict grammar scoring.
 * - Uses dynamic penalty scaling: grammarPenalty = n * (5 + n)
 * - Applies repetition penalty using exponential-like scaling
 * - Applies sentence-balance penalties
 * - Returns value 0..100 (rounded)
 */
function calculateGrammarAccuracyScoreHigh(grammarErrors, words = [], sentences = []) {
    console.log('🔤 ===== GRAMMAR ACCURACY (HIGH ACCURACY MODE) =====');

    const errorCount = grammarErrors.length;
    const base = 100;

    // Dynamic grammar penalty: increases faster when errors repeat
    const grammarPenalty = errorCount * (5 + errorCount);

    // Repetition penalty: count distinct words repeated more than twice
    const freq = {};
    words.forEach(w => { if (w && w.length > 2) freq[w] = (freq[w] || 0) + 1; });
    const repeatedWordCount = Object.values(freq).filter(c => c > 2).length;
    const repetitionPenalty = repeatedWordCount * (3 + repeatedWordCount);

    // Sentence-balance penalty (ideal 8-20 words per sentence)
    const totalWords = words.length;
    const sentenceCount = Math.max(1, sentences.length);
    const avgWordsPerSentence = sentenceCount > 0 ? totalWords / sentenceCount : totalWords;
    let sentencePenalty = 0;
    if (avgWordsPerSentence < 6 || avgWordsPerSentence > 30) {
        sentencePenalty = 20; // heavy penalty for very short/very long sentences
    } else if (avgWordsPerSentence < 8 || avgWordsPerSentence > 20) {
        sentencePenalty = 8; // minor penalty for slightly off-balance
    }

    // Aggregate penalties
    let totalPenalty = grammarPenalty + repetitionPenalty + sentencePenalty;

    // Apply a small floor cap to avoid negative noises
    let score = Math.max(0, base - totalPenalty);

    score = Math.round(Math.max(0, Math.min(100, score)));
    console.log('  errorCount:', errorCount, 'grammarPenalty:', grammarPenalty);
    console.log('  repeatedWordCount:', repeatedWordCount, 'repetitionPenalty:', repetitionPenalty);
    console.log('  avgWordsPerSentence:', avgWordsPerSentence.toFixed(2), 'sentencePenalty:', sentencePenalty);
    console.log(`  📊 Grammar Accuracy (HIGH): ${score}/100`);
    console.log('🔤 ===== END HIGH ACCURACY GRAMMAR SCORING =====\n');
    return score;
}

// High-accuracy confidence function placement (after grammar high scorer)
function calculateConfidenceLevelHigh(fillerPercentage, vocabAnalysis, words, sentences, totalWords, fluencyIssues, grammarErrorsCount = 0) {
    console.log('🎤 ===== CONFIDENCE LEVEL (HIGH ACCURACY MODE) =====');

    const base = 100;
    let score = base;
    const penalties = [];

    // 1) Tier-Based Filler Deduction
    let fillerPenalty = 0;
    if (fillerPercentage > 20) {
        fillerPenalty = 40; // very high
        penalties.push({ name: 'Filler > 20%', points: -fillerPenalty });
    } else if (fillerPercentage > 10) {
        fillerPenalty = 25; // high
        penalties.push({ name: 'Filler 10-20%', points: -fillerPenalty });
    } else if (fillerPercentage > 5) {
        fillerPenalty = 12; // medium
        penalties.push({ name: 'Filler 5-10%', points: -fillerPenalty });
    } else if (fillerPercentage > 0) {
        fillerPenalty = 5; // small
        penalties.push({ name: 'Filler 0-5%', points: -fillerPenalty });
    }
    score -= fillerPenalty;

    // 2) Strong Vocabulary Impact (unique ratio -> heavy penalties)
    const uniqueRatio = vocabAnalysis.richness || 0;
    let vocabPenalty = 0;
    if (uniqueRatio < 0.4) {
        vocabPenalty = 30;
    } else if (uniqueRatio < 0.5) {
        vocabPenalty = 20;
    } else if (uniqueRatio < 0.6) {
        vocabPenalty = 10;
    }
    if (vocabPenalty > 0) {
        penalties.push({ name: `Low vocab richness (${(uniqueRatio*100).toFixed(1)}%)`, points: -vocabPenalty });
        score -= vocabPenalty;
    }

    // 3) Repetition penalty (dynamic scaling)
    const freq = {};
    words.forEach(w => { if (w && w.length > 2) freq[w] = (freq[w] || 0) + 1; });
    const repeatedWordCount = Object.values(freq).filter(c => c > 2).length;
    const repetitionPenalty = repeatedWordCount > 0 ? repeatedWordCount * (3 + repeatedWordCount) : 0;
    if (repetitionPenalty > 0) {
        penalties.push({ name: `Repetition (${repeatedWordCount})`, points: -repetitionPenalty });
        score -= repetitionPenalty;
    }

    // 4) Sentence Balance Check (ideal 8-20 words)
    const sentenceCount = Math.max(1, sentences.length);
    const avgWordsPerSentence = sentenceCount > 0 ? totalWords / sentenceCount : totalWords;
    let sentencePenalty = 0;
    if (avgWordsPerSentence < 6 || avgWordsPerSentence > 30) {
        sentencePenalty = 20; // heavy
        penalties.push({ name: 'Sentence balance (very off)', points: -sentencePenalty });
    } else if (avgWordsPerSentence < 8 || avgWordsPerSentence > 20) {
        sentencePenalty = 6; // small
        penalties.push({ name: 'Sentence balance (slightly off)', points: -sentencePenalty });
    }
    score -= sentencePenalty;

    // 5) Fluency / run-on penalties
    const runOnCount = fluencyIssues.filter(i => i.error === 'Run-on sentence').length;
    if (runOnCount > 0) {
        const runOnPenalty = Math.min(15, runOnCount * 5);
        penalties.push({ name: `Run-on sentences (${runOnCount})`, points: -runOnPenalty });
        score -= runOnPenalty;
    }

    // 6) Short replies heavy penalty
    if (totalWords < 12) {
        const shortPenalty = 18;
        penalties.push({ name: `Very short reply (${totalWords}w)`, points: -shortPenalty });
        score -= shortPenalty;
    } else if (totalWords < 20) {
        const shortPenalty = 8;
        penalties.push({ name: `Short reply (${totalWords}w)`, points: -shortPenalty });
        score -= shortPenalty;
    }

    // 7) Confidence Cap System: if filler% > 15 OR grammarErrors > 4, cap score at 70
    if (fillerPercentage > 15 || grammarErrorsCount > 4) {
        score = Math.min(score, 70);
        penalties.push({ name: 'Confidence cap applied', points: 0 });
    }

    // Ensure score bounds
    score = Math.round(Math.max(0, Math.min(100, score)));

    console.log('  Filler %:', fillerPercentage.toFixed(1), 'fillerPenalty:', fillerPenalty);
    console.log('  vocabRichness:', (uniqueRatio*100).toFixed(1), 'vocabPenalty:', vocabPenalty);
    console.log('  repeatedWordCount:', repeatedWordCount, 'repetitionPenalty:', repetitionPenalty);
    console.log('  avgWordsPerSentence:', avgWordsPerSentence.toFixed(2), 'sentencePenalty:', sentencePenalty);
    console.log('  runOnCount:', runOnCount);
    console.log('\n📊 Confidence Level (HIGH):', score);
    console.log('🎤 ===== END HIGH ACCURACY CONFIDENCE SCORING =====\n');

    return score;
}

// ===== CALCULATE CONFIDENCE LEVEL SCORE (Independent) =====

function calculateConfidenceLevel(fillerPercentage, vocabAnalysis, words, sentences, totalWords, fluencyIssues, grammarErrorsCount = 0) {
    // Route to high-accuracy implementation when enabled.
    if (HIGH_ACCURACY_MODE) {
        return calculateConfidenceLevelHigh(fillerPercentage, vocabAnalysis, words, sentences, totalWords, fluencyIssues, grammarErrorsCount);
    }

    // Legacy scoring retained for backward compatibility
    console.log('🎤 ===== CONFIDENCE LEVEL SCORING (LEGACY) =====');
    let score = 100;
    const penalties = [];
    const bonuses = [];
    // (legacy logic kept unchanged)
    if (fillerPercentage > 0) {
        let fillerPenalty = 0;
        if (fillerPercentage >= 25) fillerPenalty = 35;
        else if (fillerPercentage >= 20) fillerPenalty = 28;
        else if (fillerPercentage >= 15) fillerPenalty = 22;
        else if (fillerPercentage >= 10) fillerPenalty = 15;
        else if (fillerPercentage >= 5) fillerPenalty = 8;
        else fillerPenalty = 3;
        score -= fillerPenalty;
    }
    score = Math.max(0, Math.min(100, score));
    return score;
}

// ===== MAIN ANALYSIS FUNCTION =====

function analyzeConfidence(transcript) {
    console.log('🔍 ===== ANALYSIS STARTED =====');
    console.log('Input transcript:', transcript);
    console.log('Transcript length:', transcript ? transcript.length : 0);
    
    if (!transcript || transcript.trim().length === 0) {
        console.error('❌ ERROR: Empty or null transcript received');
        loadingSpinner.classList.add('hidden');
        showStatus('❌ Error: No speech to analyze.', 'error');
        return;
    }
    
    const text = transcript.toLowerCase();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalWords = words.length;
    
    console.log('📊 Analysis metrics:');
    console.log('  - Total words:', totalWords);
    console.log('  - Sentences:', sentences.length);
    
    // Run analysis
    const grammarErrors = detectGrammarErrors(transcript);
    const fluencyIssues = detectFluencyIssues(text, sentences);
    const { issues: fillerIssues, total: fillerCount } = detectFillerWords(text);
    const vocabAnalysis = analyzeVocabulary(text);
    
    const fillerPercentage = totalWords > 0 ? (fillerCount / totalWords) * 100 : 0;
    
    console.log('🔍 Issues found:');
    console.log('  - Grammar errors:', grammarErrors.length);
    console.log('  - Fluency issues:', fluencyIssues.length);
    console.log('  - Filler words:', fillerCount, `(${fillerPercentage.toFixed(2)}%)`);
    
    // ===== SEPARATE SCORING SYSTEMS =====
    
    // 1. GRAMMAR ACCURACY SCORE (Independent)
    const grammarAccuracy = HIGH_ACCURACY_MODE
        ? calculateGrammarAccuracyScoreHigh(grammarErrors, words, sentences)
        : calculateGrammarAccuracyScore(grammarErrors, sentences);

    // 2. CONFIDENCE LEVEL SCORE (Independent)
    const confidenceLevel = calculateConfidenceLevel(fillerPercentage, vocabAnalysis, words, sentences, totalWords, fluencyIssues, grammarErrors.length);
    
    // 3. OVERALL PERFORMANCE (Average of both)
    const overallPerformance = Math.round((grammarAccuracy + confidenceLevel) / 2);
    
    console.log('\n📈 DUAL SCORING RESULTS:');
    console.log(`  🔤 Grammar Accuracy: ${grammarAccuracy}%`);
    console.log(`  🎤 Confidence Level: ${confidenceLevel}%`);
    console.log(`  ⭐ Overall Performance: ${overallPerformance}%`);
    
    // Feedback based on overall performance
    let feedback = '';
    if (overallPerformance >= 80) feedback = '⭐ Excellent! Outstanding communication skills.';
    else if (overallPerformance >= 70) feedback = '👍 Good! Minor improvements can enhance your scores.';
    else if (overallPerformance >= 50) feedback = '💪 Moderate. Focus on grammar and confidence in delivery.';
    else feedback = '🎯 Keep practicing! Work on grammar accuracy and speech confidence.';
    
    console.log('💬 Feedback:', feedback);
    
    // Display results
    console.log('📤 Calling displayResults()');
    displayResults({
        grammarAccuracy,
        confidenceLevel,
        overallPerformance,
        feedback,
        grammarErrors,
        fluencyIssues,
        fillerIssues,
        vocabAnalysis,
        metrics: {
            totalWords,
            fillerCount,
            fillerPercentage,
            vocabRichness: vocabAnalysis.richness
        }
    });
    
    console.log('✅ Analysis complete');
}

// ===== DISPLAY RESULTS =====

function displayResults(data) {
    console.log('🎨 ===== DISPLAYING RESULTS =====');
    console.log('Data received:', data);
    
    try {
        if (!data) {
            throw new Error('No data object provided to displayResults');
        }
        
        const { grammarAccuracy, confidenceLevel, overallPerformance, feedback, grammarErrors, fluencyIssues, fillerIssues, vocabAnalysis, metrics } = data;
        
        console.log('📍 Looking for DOM elements...');
        
        // Check and get grammar accuracy elements
        const grammarAccuracyElem = document.getElementById('grammarAccuracyValue');
        const grammarProgressBar = document.getElementById('grammarProgressBar');
        
        if (!grammarAccuracyElem) console.error('❌ Element not found: grammarAccuracyValue');
        if (!grammarProgressBar) console.error('❌ Element not found: grammarProgressBar');
        if (!grammarAccuracyElem || !grammarProgressBar) {
            throw new Error('Grammar accuracy elements not found in DOM');
        }
        console.log('✅ Grammar accuracy elements found');
        
        // Check and get confidence level elements
        const confidenceLevelElem = document.getElementById('confidenceLevelValue');
        const confidenceProgressBar = document.getElementById('confidenceProgressBar');
        
        if (!confidenceLevelElem) console.error('❌ Element not found: confidenceLevelValue');
        if (!confidenceProgressBar) console.error('❌ Element not found: confidenceProgressBar');
        if (!confidenceLevelElem || !confidenceProgressBar) {
            throw new Error('Confidence level elements not found in DOM');
        }
        console.log('✅ Confidence level elements found');
        
        // Check and get overall performance elements
        const overallPerfElem = document.getElementById('overallPerformanceValue');
        const overallProgressBar = document.getElementById('overallProgressBar');
        
        if (!overallPerfElem) console.error('❌ Element not found: overallPerformanceValue');
        if (!overallProgressBar) console.error('❌ Element not found: overallProgressBar');
        if (!overallPerfElem || !overallProgressBar) {
            throw new Error('Overall performance elements not found in DOM');
        }
        console.log('✅ Overall performance elements found');
        
        // Check feedback element
        const feedbackText = document.getElementById('feedbackText');
        if (!feedbackText) throw new Error('Element not found: feedbackText');
        console.log('✅ Feedback element found');
        
        // Hide loading spinner
        loadingSpinner.classList.add('hidden');
        showStatus('✅ Analysis complete!', 'success');
        
        // Update grammar accuracy score
        console.log('🔤 Updating grammar accuracy display...');
        animateScoreIncrease(grammarAccuracyElem, grammarProgressBar, grammarAccuracy);
        
        // Update confidence level score
        console.log('🎤 Updating confidence level display...');
        animateScoreIncrease(confidenceLevelElem, confidenceProgressBar, confidenceLevel);
        
        // Update overall performance score
        console.log('⭐ Updating overall performance display...');
        animateScoreIncrease(overallPerfElem, overallProgressBar, overallPerformance);
        
        // Update feedback
        console.log('💬 Updating feedback...');
        feedbackText.textContent = feedback;
        
        // Update metrics - check each element exists
        console.log('📊 Updating metrics...');
        const metricElements = {
            'totalWords': metrics.totalWords,
            'fillerCount': metrics.fillerCount,
            'fillerPercent': metrics.fillerPercentage.toFixed(1) + '%',
            'vocabRichness': (metrics.vocabRichness * 100).toFixed(1) + '%'
        };
        
        for (const [id, value] of Object.entries(metricElements)) {
            const elem = document.getElementById(id);
            if (!elem) {
                console.error(`❌ Metric element not found: ${id}`);
            } else {
                elem.textContent = value;
                console.log(`✅ ${id}: ${value}`);
            }
        }
        
        // Update Grammar Issues section (with corrections)
        console.log('🔍 Updating grammar section...');
        const grammarSection = document.getElementById('grammarSection');
        const grammarList = document.getElementById('grammarList');
        if (!grammarSection || !grammarList) {
            console.error('❌ Grammar elements not found');
        } else {
            if (grammarErrors.length > 0) {
                grammarSection.classList.remove('hidden');
                grammarList.innerHTML = grammarErrors.map(err => {
                    let correction = getSuggestedCorrection(err.error, err.phrase);
                    return `<li class="issue-item">
                        <strong>${err.error}:</strong> "${err.phrase}"
                        ${correction ? `<br><em class="correction">Suggestion: ${correction}</em>` : ''}
                    </li>`;
                }).join('');
                console.log(`✅ Grammar section: ${grammarErrors.length} errors found`);
            } else {
                grammarSection.classList.add('hidden');
                console.log('✅ Grammar section: hidden (no errors)');
            }
        }
        
        // Update Fluency section
        console.log('⚡ Updating fluency section...');
        const fluencySection = document.getElementById('fluencySection');
        const fluencyList = document.getElementById('fluencyList');
        if (!fluencySection || !fluencyList) {
            console.error('❌ Fluency elements not found');
        } else {
            if (fluencyIssues.length > 0) {
                fluencySection.classList.remove('hidden');
                fluencyList.innerHTML = fluencyIssues.map(issue => 
                    `<li class="issue-item"><strong>${issue.error}:</strong> ${issue.phrase}</li>`
                ).join('');
                console.log(`✅ Fluency section: ${fluencyIssues.length} issues found`);
            } else {
                fluencySection.classList.add('hidden');
                console.log('✅ Fluency section: hidden (no issues)');
            }
        }
        
        // Update Filler section
        console.log('🎤 Updating filler section...');
        const fillerSection = document.getElementById('fillerSection');
        const fillerList = document.getElementById('fillerList');
        if (!fillerSection || !fillerList) {
            console.error('❌ Filler elements not found');
        } else {
            if (fillerIssues.length > 0) {
                fillerSection.classList.remove('hidden');
                fillerList.innerHTML = fillerIssues.map(issue => 
                    `<li class="issue-item"><strong>${issue.error}:</strong> ${issue.phrase}</li>`
                ).join('');
                console.log(`✅ Filler section: ${fillerIssues.length} fillers found`);
            } else {
                fillerSection.classList.add('hidden');
                console.log('✅ Filler section: hidden (no fillers)');
            }
        }
        
        // Update Vocabulary section
        console.log('📚 Updating vocabulary section...');
        const vocabSection = document.getElementById('vocabularySection');
        const vocabList = document.getElementById('vocabularyList');
        if (!vocabSection || !vocabList) {
            console.error('❌ Vocabulary elements not found');
        } else {
            if (vocabAnalysis.issues.length > 0) {
                vocabSection.classList.remove('hidden');
                vocabList.innerHTML = vocabAnalysis.issues.map(issue => 
                    `<li class="issue-item"><strong>${issue.error}:</strong> ${issue.phrase}</li>`
                ).join('');
                console.log(`✅ Vocabulary section: ${vocabAnalysis.issues.length} issues found`);
            } else {
                vocabSection.classList.add('hidden');
                console.log('✅ Vocabulary section: hidden (no issues)');
            }
        }
        
        // Show results section
        console.log('🎯 Showing results section...');
        resultsSection.classList.remove('hidden');
        resetBtn.style.display = 'inline-flex';
        startBtn.disabled = true;
        stopBtn.disabled = true;
        
        console.log('✅ ===== RESULTS DISPLAYED SUCCESSFULLY =====');
        
    } catch (error) {
        console.error('❌ ERROR in displayResults:', error);
        console.error('Error details:', error.message);
        showStatus('❌ Error displaying results: ' + error.message, 'error');
        loadingSpinner.classList.add('hidden');
    }
}

function animateScoreIncrease(scoreElement, progressBar, finalScore) {
    let currentScore = 0;
    const increment = finalScore / 40;
    
    const animation = setInterval(() => {
        currentScore += increment;
        if (currentScore >= finalScore) {
            currentScore = finalScore;
            clearInterval(animation);
        }
        
        const displayScore = Math.round(currentScore);
        scoreElement.textContent = displayScore;
        progressBar.style.width = displayScore + '%';
        
        if (displayScore >= 80) {
            progressBar.style.background = 'linear-gradient(90deg, #4caf50, #8bc34a)';
        } else if (displayScore >= 60) {
            progressBar.style.background = 'linear-gradient(90deg, #4fc3f7, #ff9800)';
        } else if (displayScore >= 40) {
            progressBar.style.background = 'linear-gradient(90deg, #ff9800, #ff5722)';
        } else {
            progressBar.style.background = 'linear-gradient(90deg, #f5576c, #f5576c)';
        }
    }, 16);
}

function getScoreLabel(score) {
    if (score >= 80) return '🌟 Excellent - Outstanding communication!';
    if (score >= 60) return '✨ Good - Strong performance!';
    if (score >= 40) return '📈 Moderate - Keep improving!';
    return '🎯 Needs Work - Practice makes perfect!';
}

// ===== GRAMMAR CORRECTION SUGGESTIONS =====

function getSuggestedCorrection(errorType, phrase) {
    const corrections = {
        'Subject-verb agreement': 'Ensure the verb agrees with the subject (e.g., "I am" not "I is")',
        'Incorrect tense': 'Use consistent past, present, or future tense',
        'Incorrect past tense': 'Use the correct past tense form',
        'Incorrect article usage': 'Use "an" before vowels (an apple) and "a" before consonants (a book)',
        'Redundant preposition': 'Remove the unnecessary preposition',
        'Redundant word': 'Remove the repeated or unnecessary word',
        'Double negative': 'Use only one negative word per clause',
        'Repetition': 'Vary your word choices to avoid repetition',
        'Preposition error': 'Check preposition usage (in, on, at, etc.)'
    };
    
    return corrections[errorType] || null;
}

// ===== INITIALIZATION =====

function initializeApp() {
    console.log('⏳ Initializing AI Confidence Analyzer...');
    
    if (!initializeElements()) {
        alert('❌ Failed to load. Please refresh.');
        return;
    }
    
    if (!SpeechRecognition) {
        alert('❌ Web Speech API not supported.');
        return;
    }
    
    if (!attachEventListeners()) {
        alert('❌ Failed to initialize buttons.');
        return;
    }
    
    attachRecognitionHandlers();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    // Initial button/UI states
    startBtn.disabled = false;
    stopBtn.disabled = true;
    resetBtn.style.display = 'none';
    statusMessage.classList.add('hidden');

    console.log('✅ AI Confidence Analyzer Ready!');
    console.log('🔘 Start Button: Ready');
    console.log('⏹️ Stop Button: Ready');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
