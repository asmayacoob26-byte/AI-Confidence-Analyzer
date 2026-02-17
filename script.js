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
        startBtn.disabled = true;
        stopBtn.disabled = false;
        showStatus('🎤 Listening... Speak now!', 'info');
        finalTranscript = '';
        interimTranscript = '';
        resultsSection.classList.add('hidden');
        transcriptSection.classList.add('hidden');
        loadingSpinner.classList.add('hidden');
    };
    
    recognition.onerror = function(event) {
        let errorMessage = 'An error occurred: ' + event.error;
        switch(event.error) {
            case 'no-speech':
                errorMessage = '❌ No speech detected. Please speak clearly.';
                break;
            case 'audio-capture':
                errorMessage = '❌ No microphone found. Check your device.';
                break;
            case 'network':
                errorMessage = '❌ Network error. Check your connection.';
                break;
            case 'not-allowed':
                errorMessage = '❌ Microphone access denied. Allow permissions.';
                break;
        }
        showStatus(errorMessage, 'error');
        startBtn.disabled = false;
        stopBtn.disabled = true;
        isRecording = false;
        loadingSpinner.classList.add('hidden');
    };
    
    recognition.onend = function() {
        console.log('🛑 Recognition ended');
        isRecording = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
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

function startRecording() {
    console.log('🔴 START clicked');
    finalTranscript = '';
    interimTranscript = '';
    transcriptSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    statusMessage.classList.add('hidden');
    loadingSpinner.classList.add('hidden');
    
    try {
        recognition.start();
        console.log('✅ Recognition started');
    } catch (e) {
        showStatus('❌ Error starting microphone.', 'error');
    }
}

function stopRecording() {
    console.log('⏹️ STOP clicked');
    console.log('Current isRecording state:', isRecording);
    console.log('Final transcript length:', finalTranscript.length);
    console.log('Transcript content:', finalTranscript);
    
    recognition.stop();
    console.log('✅ recognition.stop() called');
    
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
    console.log('🔤 ===== GRAMMAR ACCURACY SCORING =====');
    
    let score = 100;
    const penalties = [];
    
    if (grammarErrors.length === 0) {
        console.log('  ✅ No grammar errors detected: 100/100');
        console.log('🔤 ===== END GRAMMAR SCORING =====\n');
        return 100;
    }
    
    // Count errors by type for weighted penalties
    const errorsByType = {};
    grammarErrors.forEach(err => {
        errorsByType[err.error] = (errorsByType[err.error] || 0) + 1;
    });
    
    console.log('  Error breakdown:', errorsByType);
    
    // Apply strict deductions per error category
    if (errorsByType['Subject-verb agreement']) {
        const penalty = Math.min(25, errorsByType['Subject-verb agreement'] * 5);
        score -= penalty;
        penalties.push({ type: 'Subject-verb agreement', count: errorsByType['Subject-verb agreement'], penalty });
        console.log(`  -${penalty} pts for subject-verb errors`);
    }
    
    if (errorsByType['Incorrect tense'] || errorsByType['Incorrect past tense']) {
        const tensePenalty = (errorsByType['Incorrect tense'] || 0) + (errorsByType['Incorrect past tense'] || 0);
        const penalty = Math.min(20, tensePenalty * 4);
        score -= penalty;
        penalties.push({ type: 'Tense errors', count: tensePenalty, penalty });
        console.log(`  -${penalty} pts for tense errors`);
    }
    
    if (errorsByType['Incorrect article usage']) {
        const penalty = Math.min(15, errorsByType['Incorrect article usage'] * 3);
        score -= penalty;
        penalties.push({ type: 'Article errors', count: errorsByType['Incorrect article usage'], penalty });
        console.log(`  -${penalty} pts for article errors`);
    }
    
    if (errorsByType['Redundant preposition'] || errorsByType['Preposition error']) {
        const prepCount = (errorsByType['Redundant preposition'] || 0) + (errorsByType['Preposition error'] || 0);
        const penalty = Math.min(15, prepCount * 3);
        score -= penalty;
        penalties.push({ type: 'Preposition errors', count: prepCount, penalty });
        console.log(`  -${penalty} pts for preposition errors`);
    }
    
    if (errorsByType['Repeated word']) {
        const penalty = Math.min(12, errorsByType['Repeated word'] * 2);
        score -= penalty;
        penalties.push({ type: 'Repeated words', count: errorsByType['Repeated word'], penalty });
        console.log(`  -${penalty} pts for repeated words`);
    }
    
    if (errorsByType['Double negative']) {
        const penalty = Math.min(18, errorsByType['Double negative'] * 4);
        score -= penalty;
        penalties.push({ type: 'Double negatives', count: errorsByType['Double negative'], penalty });
        console.log(`  -${penalty} pts for double negatives`);
    }
    
    if (errorsByType['Redundant word'] || errorsByType['Redundant modifier']) {
        const redundantCount = (errorsByType['Redundant word'] || 0) + (errorsByType['Redundant modifier'] || 0);
        const penalty = Math.min(10, redundantCount * 2);
        score -= penalty;
        penalties.push({ type: 'Redundancy', count: redundantCount, penalty });
        console.log(`  -${penalty} pts for redundant words`);
    }
    
    score = Math.max(0, Math.min(100, score));
    
    console.log('  Penalties applied:', penalties.length > 0 ? penalties : 'None');
    console.log(`  📊 Grammar Accuracy Score: ${score}/100`);
    console.log('🔤 ===== END GRAMMAR SCORING =====\n');
    
    return score;
}

// ===== CALCULATE CONFIDENCE LEVEL SCORE (Independent) =====

function calculateConfidenceLevel(fillerPercentage, vocabAnalysis, words, sentences, totalWords, fluencyIssues) {
    console.log('🎤 ===== CONFIDENCE LEVEL SCORING =====');
    
    let score = 100;
    const penalties = [];
    const bonuses = [];
    
    // 1. FILLER WORDS (Primary factor for confidence)
    if (fillerPercentage > 0) {
        let fillerPenalty = 0;
        if (fillerPercentage >= 25) {
            fillerPenalty = 35;
            penalties.push({ name: 'Excessive filler words (≥25%)', points: -fillerPenalty });
        } else if (fillerPercentage >= 20) {
            fillerPenalty = 28;
            penalties.push({ name: 'Severe filler words (20-25%)', points: -fillerPenalty });
        } else if (fillerPercentage >= 15) {
            fillerPenalty = 22;
            penalties.push({ name: 'Very high filler words (15-20%)', points: -fillerPenalty });
        } else if (fillerPercentage >= 10) {
            fillerPenalty = 15;
            penalties.push({ name: 'High filler words (10-15%)', points: -fillerPenalty });
        } else if (fillerPercentage >= 5) {
            fillerPenalty = 8;
            penalties.push({ name: 'Moderate filler words (5-10%)', points: -fillerPenalty });
        } else if (fillerPercentage > 0) {
            fillerPenalty = 3;
            penalties.push({ name: 'Minor filler words (<5%)', points: -fillerPenalty });
        }
        score -= fillerPenalty;
        console.log(`  Filler penalty (${fillerPercentage.toFixed(1)}%): -${fillerPenalty}`);
    }
    
    // 2. VOCABULARY RICHNESS (Diversity and range)
    if (vocabAnalysis.richness < 0.30) {
        const vocabPenalty = 25;
        penalties.push({ name: 'Very low vocabulary diversity (<30%)', points: -vocabPenalty });
        score -= vocabPenalty;
        console.log(`  Vocabulary penalty (richness: ${(vocabAnalysis.richness * 100).toFixed(1)}%): -${vocabPenalty}`);
    } else if (vocabAnalysis.richness < 0.40) {
        const vocabPenalty = 15;
        penalties.push({ name: 'Low vocabulary diversity (30-40%)', points: -vocabPenalty });
        score -= vocabPenalty;
        console.log(`  Vocabulary penalty (richness: ${(vocabAnalysis.richness * 100).toFixed(1)}%): -${vocabPenalty}`);
    } else if (vocabAnalysis.richness < 0.50) {
        const vocabPenalty = 8;
        penalties.push({ name: 'Fair vocabulary diversity (40-50%)', points: -vocabPenalty });
        score -= vocabPenalty;
        console.log(`  Vocabulary penalty (richness: ${(vocabAnalysis.richness * 100).toFixed(1)}%): -${vocabPenalty}`);
    }
    
    // 3. REPEATED WORDS (Indicates limited vocabulary in delivery)
    const wordFrequency = {};
    words.forEach(word => {
        if (word.length > 3) {
            wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
    });
    const repeatedWords = Object.entries(wordFrequency).filter(([, count]) => count > 5);
    
    if (repeatedWords.length > 0) {
        let repeatedPenalty = repeatedWords.length * 3;
        repeatedPenalty = Math.min(18, repeatedPenalty);
        penalties.push({ name: `Excessive word repetition (${repeatedWords.length} words)`, points: -repeatedPenalty });
        score -= repeatedPenalty;
        console.log(`  Repeated words penalty: -${repeatedPenalty}`);
    }
    
    // 4. SPEECH LENGTH (Short answers indicate lack of confidence/substance)
    if (totalWords < 15) {
        const lengthPenalty = 25;
        penalties.push({ name: 'Very short response (<15 words)', points: -lengthPenalty });
        score -= lengthPenalty;
        console.log(`  Length penalty (${totalWords} words): -${lengthPenalty}`);
    } else if (totalWords < 25) {
        const lengthPenalty = 12;
        penalties.push({ name: 'Short response (15-25 words)', points: -lengthPenalty });
        score -= lengthPenalty;
        console.log(`  Length penalty (${totalWords} words): -${lengthPenalty}`);
    }
    
    // 5. SPEECH STRUCTURE (Run-on sentences indicate poor planning)
    const runOnCount = fluencyIssues.filter(i => i.error === 'Run-on sentence').length;
    if (runOnCount > 0) {
        const runOnPenalty = Math.min(15, runOnCount * 5);
        penalties.push({ name: `Run-on sentences (${runOnCount})`, points: -runOnPenalty });
        score -= runOnPenalty;
        console.log(`  Run-on sentence penalty: -${runOnPenalty}`);
    }
    
    // BONUSES FOR CONFIDENCE
    
    // Excellent delivery (low fillers + good vocabulary)
    if (fillerPercentage <= 3 && vocabAnalysis.richness >= 0.55 && totalWords >= 35) {
        const deliveryBonus = 8;
        bonuses.push({ name: 'Excellent delivery (low fillers, rich vocabulary)', points: +deliveryBonus });
        score += deliveryBonus;
        console.log(`  Delivery bonus: +${deliveryBonus}`);
    }
    
    // Confident length (substantial answer)
    if (totalWords >= 50 && fillerPercentage <= 5) {
        const lengthBonus = 6;
        bonuses.push({ name: 'Substantial, confident response', points: +lengthBonus });
        score += lengthBonus;
        console.log(`  Length confidence bonus: +${lengthBonus}`);
    }
    
    // Zero fillers
    if (fillerPercentage === 0 && totalWords >= 20) {
        const noFillerBonus = 5;
        bonuses.push({ name: 'No filler words used', points: +noFillerBonus });
        score += noFillerBonus;
        console.log(`  No filler bonus: +${noFillerBonus}`);
    }
    
    // High vocabulary richness
    if (vocabAnalysis.richness >= 0.65) {
        const vocabBonus = 5;
        bonuses.push({ name: 'High vocabulary richness (65%+)', points: +vocabBonus });
        score += vocabBonus;
        console.log(`  Vocabulary quality bonus: +${vocabBonus}`);
    }
    
    score = Math.max(0, Math.min(100, score));
    
    console.log('\n📊 Confidence Score Breakdown:');
    console.log('  Starting score: 100');
    if (penalties.length > 0) {
        penalties.forEach(p => console.log(`    ${p.name}: ${p.points}`));
    } else {
        console.log('    (No penalties)');
    }
    if (bonuses.length > 0) {
        bonuses.forEach(b => console.log(`    ${b.name}: ${b.points}`));
    } else {
        console.log('    (No bonuses)');
    }
    console.log(`  🎤 Confidence Level: ${score}/100`);
    console.log('🎤 ===== END CONFIDENCE SCORING =====\n');
    
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
    const grammarAccuracy = calculateGrammarAccuracyScore(grammarErrors, sentences);
    
    // 2. CONFIDENCE LEVEL SCORE (Independent)
    const confidenceLevel = calculateConfidenceLevel(fillerPercentage, vocabAnalysis, words, sentences, totalWords, fluencyIssues);
    
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
    
    console.log('✅ AI Confidence Analyzer Ready!');
    console.log('🔘 Start Button: Ready');
    console.log('⏹️ Stop Button: Ready');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
