// Build script: converts DATA from engrow_test_bank_redesigned.html into QUESTION_BANK format
// Run: node build_test_bank.js

const fs = require('fs');

// SECTION_MAP matches the HTML section names to backend skill keys
const SECTION_MAP = { Grammar: 'grammar', Vocabulary: 'vocabulary', Reading: 'reading', Dialogue: 'dialogue', Writing: 'writing' };
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SKILL_ORDER = ['grammar', 'vocabulary', 'reading', 'writing', 'dialogue'];

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
