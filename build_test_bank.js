// Build script: converts DATA from engrow_test_bank_redesigned.html into QUESTION_BANK format
// Run: node build_test_bank.js

const fs = require('fs');

// SECTION_MAP matches the HTML section names to backend skill keys
const SECTION_MAP = { Grammar: 'grammar', Vocabulary: 'vocabulary', Reading: 'reading', Dialogue: 'dialogue', Writing: 'writing', Listening: 'listening' };
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SKILL_ORDER = ['grammar', 'vocabulary', 'reading', 'writing', 'dialogue', 'listening'];

// Read the HTML file and extract the DATA variable
const html = fs.readFileSync('engrow_test_bank_redesigned.html', 'utf8');
const dataMatch = html.match(/const DATA\s*=\s*(\{[\s\S]*?\});\s*\n\s*const SECTION_MAP/);
if (!dataMatch) {
  console.error('Could not extract DATA from HTML');
  process.exit(1);
}
const dataStr = dataMatch[1];

// Evaluate the DATA string to a JS object
// First, clean up template literals (backtick strings with \n)
const cleaned = dataStr.replace(/`([^`]*)`/g, (match, inner) => {
  return JSON.stringify(inner.replace(/\\n/g, '\n'));
});
const DATA = eval('(' + cleaned + ')');

// Build the QUESTION_BANK
const QUESTION_BANK = {};
SKILL_ORDER.forEach(skill => {
  QUESTION_BANK[skill] = {};
  CEFR_LEVELS.forEach(l => { QUESTION_BANK[skill][l] = []; });
});

let idCounter = {};
function nextId(skill, level) {
  const key = skill + '_' + level;
  idCounter[key] = (idCounter[key] || 0) + 1;
  return skill[0] + '-' + level.toLowerCase() + '-' + idCounter[key];
}

CEFR_LEVELS.forEach(level => {
  const sections = DATA[level];
  if (!sections) return;
  Object.entries(sections).forEach(([sectionName, questions]) => {
    const skill = SECTION_MAP[sectionName];
    if (!skill) return;
    questions.forEach(q => {
      if (q.type === 'read') {
        q.questions.forEach((subq, si) => {
          const conv = {
            id: nextId(skill, level),
            type: 'mc',
            instruction: subq.q.replace(/<[^>]+>/g, ''),
            options: subq.options,
            correct: subq.options[subq.correct],
            correctIndex: subq.correct
          };
          if (q.passage) conv.text = q.passage.replace(/<[^>]+>/g, '').replace(/\n/g, '\n');
          QUESTION_BANK[skill][level].push(conv);
        });
      } else if (q.type === 'write') {
        const conv = {
          id: nextId(skill, level),
          type: 'free_write',
          instruction: q.q.replace(/<[^>]+>/g, ''),
          ai: q.ai !== false
        };
        if (q.wordCount) { conv.minWords = q.wordCount[0]; conv.maxWords = q.wordCount[1]; }
        if (q.placeholder) conv.placeholder = q.placeholder;
        QUESTION_BANK[skill][level].push(conv);
      } else {
        const conv = { id: nextId(skill, level), type: q.type };
        // instruction field
        if (q.q) conv.instruction = q.q.replace(/<[^>]+>/g, '');
        else if (q.type === 'fill') conv.instruction = 'Choose the correct word to complete the sentence:';
        else if (q.type === 'error') conv.instruction = 'Choose the correct word to fix the error in the sentence:';
        else if (sectionName === 'Reading' || sectionName === 'Dialogue') conv.instruction = 'Read the text and answer the question.';
        
        // Copy common fields
        if (q.options) conv.options = q.options;
        if (q.hint) conv.hint = q.hint;
        if (q.text) conv.text = q.text;
        if (q.question) conv.question = q.question;
        if (q.sentence) conv.sentence = q.sentence;
        if (q.underline) conv.underline = q.underline;
        if (q.words) conv.words = q.words;
        if (q.left) conv.left = q.left;
        if (q.right) conv.right = q.right;
        if (q.pairs) conv.pairs = q.pairs;
        if (q.parts) conv.parts = q.parts;
        if (q.blanks) conv.blanks = q.blanks;
        if (q.evaluationCriteria) conv.evaluationCriteria = q.evaluationCriteria;
        if (q.ai !== undefined) conv.ai = q.ai;
        if (q.passage) conv.passage = q.passage;
        if (q.pseudoWords) conv.pseudoWords = q.pseudoWords;
        if (q.timer) conv.timer = q.timer;

        // Correct answer handling
        if (q.type === 'mc' || q.type === 'error') {
          conv.correct = q.options[q.correct];
          conv.correctIndex = q.correct;
        } else if (q.type === 'fill') {
          conv.correct = q.blanks[0].answer;
        } else if (q.type === 'sort') {
          conv.correct = q.answer;
        } else if (q.type === 'match') {
          // correct is derived from pairs in checkDirectAnswer
        }

        QUESTION_BANK[skill][level].push(conv);
      }
    });
  });
});

// ── Helper to add listening questions ──────────────────────────────
function addListeningQuestion(skill, level, id, audioUrl, instruction, options, correctIndex) {
  QUESTION_BANK[skill][level].push({
    id, type: 'mc', instruction, options,
    correct: options[correctIndex],
    correctIndex,
    audioUrl
  });
}

// ── Inject listening questions for each level ──────────────────────
// A1 — voice-a1.mp3 (Morning Routine)
addListeningQuestion('listening', 'A1', 'l-a1-1', '/audio/voice-a1.mp3',
  'Listen to the passage about a morning routine. Based on what you hear, how does the person truly feel about the bus being late?',
  ['They hate it because it makes them late for work', 'They don\'t mind it because it gives them time to rest', 'They enjoy it because they can eat breakfast on the bus', 'They are confused because the bus is never on time'], 1);
addListeningQuestion('listening', 'A1', 'l-a1-2', '/audio/voice-a1.mp3',
  'Listen again. What does the narrator do during the morning commute?',
  ['Eat a big breakfast and read the news', 'Drink coffee, run to the bus, and sleep on the way', 'Walk slowly while listening to music', 'Take a taxi to avoid being late'], 1);
// A1 — voice-a1-a2.mp3 (Shoe Shopping)
addListeningQuestion('listening', 'A1', 'l-a1-3', '/audio/voice-a1-a2.mp3',
  'Listen to the passage about shopping. Why didn\'t the person buy any shoes?',
  ['They decided they didn\'t need new shoes after all', 'The store was closed when they arrived', 'They only like wearing sneakers', 'The nice shoes were too expensive and the cheap ones were uncomfortable'], 3);

// A2 — voice-a2.mp3 (Evening Routine)
addListeningQuestion('listening', 'A2', 'l-a2-1', '/audio/voice-a2.mp3',
  'Listen to the passage about an evening at home. What is the real reason the person left the dishes in the sink?',
  ['They wanted to relax and watch their game because it was getting late', 'They broke the kitchen light and couldn\'t see to clean', 'They expected someone else to wash them', 'They realized they needed to buy soap the next morning'], 0);
addListeningQuestion('listening', 'A2', 'l-a2-2', '/audio/voice-a2.mp3',
  'Listen again. What can be inferred about the narrator\'s priorities at that moment?',
  ['They felt guilty about not cleaning up', 'They valued their own comfort and leisure over the chore', 'They planned to wake up early and do the dishes', 'They were angry about having to cook dinner'], 1);
// A2 — voice-a2-b1.mp3 (Leaving the Party)
addListeningQuestion('listening', 'A2', 'l-a2-3', '/audio/voice-a2-b1.mp3',
  'Listen to the passage about a party. What can be inferred about Sarah\'s departure?',
  ['She suddenly became very ill and needed medical attention', 'She was not enjoying the loud crowded environment', 'Her brother had an emergency and forced her to leave', 'She was angry because the host played bad music'], 1);

// B1 — voice-b1.mp3 (Gym Membership / Office)
addListeningQuestion('listening', 'B1', 'l-b1-1', '/audio/voice-b1.mp3',
  'Listen to the passage about a new office. What is the underlying problem the narrator is facing?',
  ['They are unhappy that the new office is too far from home', 'They dislike the taste of the new espresso machine', 'The open office design lacks the privacy and quiet needed to concentrate', 'They are trying to avoid a specific coworker'], 2);
addListeningQuestion('listening', 'B1', 'l-b1-2', '/audio/voice-b1.mp3',
  'Listen again. Why did the narrator schedule a meeting with their manager?',
  ['To complain about the printer placement', 'To request permission to work remotely on certain days', 'To ask for a desk relocation away from the hallway', 'To discuss getting a promotion'], 1);
// B1 — voice-b1-b2.mp3 (Mountain Trip)
addListeningQuestion('listening', 'B1', 'l-b1-3', '/audio/voice-b1-b2.mp3',
  'Listen to the passage about a planned trip. Why did the narrator suggest taking the train instead of driving?',
  ['They wanted to enjoy the snowy scenery without focusing on the road', 'They recognized that driving their car in heavy snow would be dangerous', 'They thought the extra bags would be too heavy for the car', 'Their partner dislikes driving long distances in winter'], 1);

// B2 — voice-b2.mp3 (Corporate Merger)
addListeningQuestion('listening', 'B2', 'l-b2-1', '/audio/voice-b2.mp3',
  'Listen to the passage about a corporate merger. What do the senior employees anticipate will happen?',
  ['They expect to be promoted to middle management', 'They anticipate that the merger will result in layoffs', 'They think the CEO is planning to leave the company', 'They believe the rival firm will cancel the merger'], 1);
addListeningQuestion('listening', 'B2', 'l-b2-2', '/audio/voice-b2.mp3',
  'Listen again. Why are the senior employees speaking in hushed tones?',
  ['They don\'t want the CEO to hear their concerns', 'They are discussing a secret project', 'They are afraid of being overheard by rival firm spies', 'The breakroom has a quiet policy'], 0);
addListeningQuestion('listening', 'B2', 'l-b2-3', '/audio/voice-b2.mp3',
  'Based on the passage, what does the CEO\'s enthusiastic email suggest?',
  ['The company is honestly preparing employees for changes', 'The company is using positive language to hide potential negative outcomes', 'The company wants everyone to celebrate the merger', 'The company is excited about new business partnerships'], 1);

// C1 — voice-c1.mp3 (Restaurant Supply)
addListeningQuestion('listening', 'C1', 'l-c1-1', '/audio/voice-c1.mp3',
  'Listen to the passage about a restaurant. What is the implicit message regarding the restaurant\'s business practices?',
  ['The restaurant is expanding to serve out-of-state customers', 'The owner is buying the regional farms to ensure supply', 'The restaurant relies on commercial suppliers despite its local branding', 'The restaurant\'s farm-to-table marketing is deceptive'], 3);
addListeningQuestion('listening', 'C1', 'l-c1-2', '/audio/voice-c1.mp3',
  'Listen again. How does the owner\'s response to the food blogger reveal the truth?',
  ['It demonstrates a genuine commitment to quality ingredients', 'The vague justification suggests an attempt to deflect scrutiny', 'It shows the restaurant is transparent about its supply chain', 'The owner is proud of the seasonal menu variety'], 1);
// C1 — voice-c1-c2.mp3 (Municipal Library)
addListeningQuestion('listening', 'C1', 'l-c1-3', '/audio/voice-c1-c2.mp3',
  'Listen to the passage about a new library. What is the author\'s primary underlying criticism of the project?',
  ['It prioritized modern aesthetics over essential community support services', 'The glass and steel design is inferior to the historic brick building', 'The politicians failed to provide enough books for the library', 'The silent atmosphere is too intimidating for local children'], 0);

// C2 — voice-c2.mp3 (Educational Reform)
addListeningQuestion('listening', 'C2', 'l-c2-1', '/audio/voice-c2.mp3',
  'Listen to the passage about educational reform. According to the passage, what was the actual result of the reform?',
  ['A truly equal educational system that closed the socioeconomic gap', 'Higher levels of critical thinking among students', 'The complete abandonment of standardized testing', 'A superficial statistical success that stifled genuine learning'], 3);
addListeningQuestion('listening', 'C2', 'l-c2-2', '/audio/voice-c2.mp3',
  'Listen again. What does the author imply about the phrase \'standardize excellence\'?',
  ['It accurately describes the reform\'s successful outcomes', 'It is a misleading slogan used to promote a flawed policy', 'It represents a breakthrough in educational measurement', 'It helped teachers focus on what matters most'], 1);
addListeningQuestion('listening', 'C2', 'l-c2-3', '/audio/voice-c2.mp3',
  'Based on the passage, what was the \'profound unmeasured casualty\' of the reform?',
  ['The loss of funding for arts programs', 'The decline in teacher morale and retention', 'The sacrifice of intellectual curiosity and deep learning', 'The increase in dropout rates among disadvantaged students'], 2);

// ── Inject hardcoded spot_fake question into vocabulary C2 ──────────
QUESTION_BANK.vocabulary.C2.push({
  id: 'v-c2-6',
  type: 'spot_fake',
  instruction: 'Click any word you think is a fake English word. It must look like real English but not exist in any dictionary. There are exactly 10.',
  passage: 'The relentless proliferation of digital media has precipitated a profound shift in our collective psychology, ostensibly designed to foster unprecedented global connectivity. However, beneath this veneer of limitless interaction lies a pervasive ephemerance, where substantive discourse is rapidly supplanted by fleeting, superficial engagements. We are frequently confronted by the ostentatiary displays of curated personas, which only serve to exacerbate the latent cognitive dissonance experienced by the average individual. Despite concerted efforts to achieve some ameliorance of this digital fatigue, the sheer vociferity of the online ecosystem drowns out nuanced contemplation. In our pursuit of serendipital discoveries within the algorithmic expanse, we often find ourselves entangled in an ineffablistic web of data that defies logical categorization. This relentless bombardment demands a high degree of cognitancy just to navigate the daily barrage of information, yet the inherent obfuscity of platform algorithms ensures that true clarity remains elusive. Consequently, what initially sparked a sense of global ebulliment has, for many, devolved into a stubborn intransigism, leaving society fundamentally fragmented despite its illusion of absolute cohesion.',
  pseudoWords: ['ephemerance', 'ostentatiary', 'ameliorance', 'vociferity', 'serendipital', 'ineffablistic', 'cognitancy', 'obfuscity', 'ebulliment', 'intransigism'],
  timer: 600
});

// Output the result as a formatted JS string
const output = 'const QUESTION_BANK = ' + JSON.stringify(QUESTION_BANK, null, 2) + ';';
fs.writeFileSync('generated_question_bank.json', JSON.stringify(QUESTION_BANK, null, 2));
console.log('Generated question bank written to generated_question_bank.json');
console.log('Total questions per skill:');
SKILL_ORDER.forEach(skill => {
  let count = 0;
  CEFR_LEVELS.forEach(l => { count += QUESTION_BANK[skill][l].length; });
  console.log('  ' + skill + ': ' + count);
});
