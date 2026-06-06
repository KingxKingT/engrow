const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set — AI features will fail');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `You are a real English teacher — warm, smart, and human. You are helping people learn English inside an app. Some of your users struggle with dyslexia, ADHD, or dyscalculia, so you keep things simple and human.

How you think and respond:
- You read the student's answer and think about it the way a real person would — not like a machine running a checklist.
- You understand MEANING, not just spelling. If someone said it right but with slightly different words, that counts.
- You are honest. If something is wrong, you say so clearly — but kindly, like a friend who wants them to improve.
- You are specific. You never say "your grammar needs work." You say "the word 'is' needs to be 'are' here because you're talking about more than one thing."
- You never use grammar formulas like Subject + Verb + Object. You describe grammar the way a person would — using movement and plain language. Words "move", "swap", "jump to the front", "get pushed back."
- You keep responses short. 1-3 sentences maximum. Never a wall of text.
- You end every evaluation with either VERDICT: CORRECT or VERDICT: WRONG on its own line.`;

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction: SYSTEM_INSTRUCTION
});

const SKILL_ORDER = ['grammar', 'vocabulary', 'reading', 'writing', 'dialogue'];
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Question types that can be checked directly (no AI needed for correctness)
const DIRECT_CHECK_TYPES = ['mc', 'fill', 'sort', 'match', 'error'];

// ─────────────────────────────────────────────
// QUESTION BANK
// ─────────────────────────────────────────────
const QUESTION_BANK = {
  grammar: {
    A1: [
      { id: 'g-a1-1', type: 'mc', instruction: 'Choose the correct word to complete the sentence: "She ___ like coffee in the morning."', options: ["don't", "doesn't", "isn't", "didn't"], correct: "doesn't", correctIndex: 1, hint: "Third person singular (she/he/it) uses doesn't in negative." },
      { id: 'g-a1-2', type: 'fill', instruction: 'Choose the correct word:', parts: ['He ', '[has/have]', ' a very big house near the park.'], blanks: [{ answer: 'has', options: ['has', 'have'] }], correct: 'has', hint: 'He = third person singular → has' },
      { id: 'g-a1-3', type: 'sort', instruction: 'Put these words in the right order to make a sentence:', words: ['school', 'at', 'I', 'am', 'a', 'student'], correct: 'I am a student at school' },
      { id: 'g-a1-4', type: 'mc', instruction: 'Choose the correct verb: "They ___ my best friends since school."', options: ['is', 'am', 'are', 'was'], correct: 'are', correctIndex: 2 },
      { id: 'g-a1-5', type: 'error', instruction: 'Fix the mistake in this sentence:', sentence: 'My sister is a doctor but she work in London.', underline: 'work', options: ['work', 'works', 'working', 'worked'], correct: 'works', correctIndex: 1, hint: 'She = third person singular → works' },
      { id: 'g-a1-6', type: 'match', instruction: 'Match the subject with the correct verb form:', left: ['I', 'She', 'They', 'He'], right: ['is a teacher', 'are happy', 'am tired', 'has a car'], pairs: { 0: 2, 1: 0, 2: 1, 3: 3 } }
    ],
    A2: [
      { id: 'g-a2-1', type: 'error', instruction: 'Fix the mistake:', sentence: 'Yesterday I go to the market with my mother.', underline: 'go', options: ['go', 'gone', 'went', 'goes'], correct: 'went', correctIndex: 2 },
      { id: 'g-a2-2', type: 'mc', instruction: 'Which sentence is grammatically correct?', options: ['She is very more tall than her brother.', 'She is much more tall than her brother.', 'She is much taller than her brother.', 'She is very taller than her brother.'], correct: 'She is much taller than her brother.', correctIndex: 2 },
      { id: 'g-a2-3', type: 'fill', instruction: 'Choose the correct word:', parts: ['I ', '[went/go/gone]', ' to Paris last summer and it was incredible.'], blanks: [{ answer: 'went', options: ['went', 'go', 'gone'] }], correct: 'went' },
      { id: 'g-a2-4', type: 'fill', instruction: 'Choose the correct word:', parts: ['She ', '[was/is/has]', ' studying when I called her.'], blanks: [{ answer: 'was', options: ['was', 'is', 'has'] }], correct: 'was' },
      { id: 'g-a2-5', type: 'sort', instruction: 'Make a correct past simple sentence:', words: ['bought', 'a', 'last', 'I', 'phone', 'month', 'new'], correct: 'I bought a new phone last month' },
      { id: 'g-a2-6', type: 'match', instruction: 'Match the time expression with the correct tense:', left: ['Yesterday I ...', 'Right now I ...', 'Every day I ...', 'Last year I ...'], right: ['Past simple', 'Past simple', 'Present simple', 'Present continuous'], pairs: { 0: 0, 1: 3, 2: 2, 3: 1 } }
    ],
    B1: [
      { id: 'g-b1-1', type: 'error', instruction: 'Fix the mistake:', sentence: 'I have seen that film last night.', underline: 'have seen', options: ['have seen', 'had seen', 'saw', 'was seeing'], correct: 'saw', correctIndex: 2 },
      { id: 'g-b1-2', type: 'mc', instruction: 'Which sentence is grammatically correct?', options: ['If I will have more money, I will travel.', 'If I have more money, I will travel.', 'If I would have more money, I will travel.', 'If I had more money, I will travel.'], correct: 'If I have more money, I will travel.', correctIndex: 1 },
      { id: 'g-b1-3', type: 'fill', instruction: 'Choose the correct word:', parts: ['If I ', '[had/have/would have]', ' more time, I would definitely travel more.'], blanks: [{ answer: 'had', options: ['had', 'have', 'would have'] }], correct: 'had' },
      { id: 'g-b1-4', type: 'fill', instruction: 'Choose the correct word:', parts: ['She ', '[has/have/had]', ' lived in this city since she was born.'], blanks: [{ answer: 'has', options: ['has', 'have', 'had'] }], correct: 'has' },
      { id: 'g-b1-5', type: 'sort', instruction: 'Arrange into a correct passive sentence:', words: ['written', 'was', 'The book', 'a', 'French', 'by', 'famous', 'author'], correct: 'The book was written by a famous French author' },
      { id: 'g-b1-6', type: 'match', instruction: 'Match each sentence to the correct tense or structure:', left: ['She has lived here for ten years.', 'I saw him yesterday.', 'If I were rich, I would travel.', 'They were watching TV when I arrived.'], right: ['Past continuous + past simple', 'Present perfect + for', 'Second conditional', 'Past simple'], pairs: { 0: 1, 1: 3, 2: 2, 3: 0 } }
    ],
    B2: [
      { id: 'g-b2-1', type: 'error', instruction: 'Fix the mistake:', sentence: 'The deadline must be submitted until Friday.', underline: 'until', options: ['until', 'by', 'for', 'before of'], correct: 'by', correctIndex: 1 },
      { id: 'g-b2-2', type: 'error', instruction: 'Fix the mistake:', sentence: 'Despite of the heavy rain, the match continued.', underline: 'Despite of', options: ['Despite of', 'Although', 'Despite', 'Even so'], correct: 'Despite', correctIndex: 2 },
      { id: 'g-b2-3', type: 'fill', instruction: 'Choose the correct word:', parts: ['She ', '[must/should/would]', ' have taken the promotion — she seems so much happier now.'], blanks: [{ answer: 'must', options: ['must', 'should', 'would'] }], correct: 'must' },
      { id: 'g-b2-4', type: 'fill', instruction: 'Choose the correct word:', parts: ['By the time we arrived, the film ', '[has/had/would]', ' already started.'], blanks: [{ answer: 'had', options: ['has', 'had', 'would'] }], correct: 'had' },
      { id: 'g-b2-5', type: 'sort', instruction: 'Build a third conditional sentence:', words: ['I', 'had', 'If', 'the', 'job', 'accepted', 'would', 'have', 'I', 'regretted', 'it'], correct: 'If I had accepted the job I would have regretted it' },
      { id: 'g-b2-6', type: 'mc', instruction: 'Choose the correct form: "She wishes she ___ medicine instead of law."', options: ['would study', 'studies', 'had studied', 'was studying'], correct: 'had studied', correctIndex: 2 }
    ],
    C1: [
      { id: 'g-c1-1', type: 'mc', instruction: 'Choose the correct form for formal recommendation: "The committee recommended that the funding ___ distributed equally."', options: ['is', 'was', 'be', 'will be'], correct: 'be', correctIndex: 2 },
      { id: 'g-c1-2', type: 'error', instruction: 'Fix the mistake:', sentence: 'No sooner she had sat down than the phone rang.', underline: 'she had sat', options: ['she had sat', 'had she sat', 'she sat', 'had sat she'], correct: 'had she sat', correctIndex: 1 },
      { id: 'g-c1-3', type: 'fill', instruction: 'Choose the correct word:', parts: ['It is essential that every student ', '[submits/submit/submitted]', ' the form before the deadline.'], blanks: [{ answer: 'submit', options: ['submits', 'submit', 'submitted'] }], correct: 'submit' },
      { id: 'g-c1-4', type: 'fill', instruction: 'Choose the correct word:', parts: ['', '[Had/If I had/Should]', ' I known about the problem earlier, I could have prevented it.'], blanks: [{ answer: 'Had', options: ['Had', 'If I had', 'Should'] }], correct: 'Had' },
      { id: 'g-c1-5', type: 'sort', instruction: 'Rewrite in passive, keeping "The new policy" as subject:', words: ['The', 'new', 'policy', 'has', 'been', 'implemented', 'the', 'by', 'government'], correct: 'The new policy has been implemented by the government' },
      { id: 'g-c1-6', type: 'error', instruction: 'Fix the mistake:', sentence: 'The suspect was said to have being involved in the fraud.', underline: 'being', options: ['being', 'be', 'been', 'have been'], correct: 'been', correctIndex: 2 }
    ],
    C2: [
      { id: 'g-c2-1', type: 'mc', instruction: 'Which sentence correctly uses an inverted conditional with a distancing modal?', options: ['Should it be the case that the board refuses, the offer would lapse.', 'Should the board would refuse, the offer lapses.', 'Were the board to refuses, the offer would lapse.', 'Had the board refused, the offer will lapse.'], correct: 'Should it be the case that the board refuses, the offer would lapse.', correctIndex: 0 },
      { id: 'g-c2-2', type: 'error', instruction: 'Fix the mistake:', sentence: 'The legislation, for all its flaws, have been broadly welcomed by industry.', underline: 'have', options: ['have', 'has', 'having', 'had'], correct: 'has', correctIndex: 1 },
      { id: 'g-c2-3', type: 'fill', instruction: 'Choose the correct word:', parts: ['Not until the results were published ', '[did the committee realise / the committee realised / the committee did realise]', ' the scale of the problem.'], blanks: [{ answer: 'did the committee realise', options: ['did the committee realise', 'the committee realised', 'the committee did realise'] }], correct: 'did the committee realise' },
      { id: 'g-c2-4', type: 'sort', instruction: 'Build a formally inverted concessive clause:', words: ['be', 'may', 'however', 'the', 'circumstances', 'difficult'], correct: 'However difficult the circumstances may be' },
      { id: 'g-c2-5', type: 'mc', instruction: 'Which option uses the correct subjunctive in a formal register?', options: ['It is vital that the report is submitted on time.', 'It is vital that the report be submitted on time.', 'It is vital that the report would be submitted on time.', 'It is vital that the report should submitted on time.'], correct: 'It is vital that the report be submitted on time.', correctIndex: 1 },
      { id: 'g-c2-6', type: 'write', instruction: 'Rewrite this sentence using nominalization and a passive voice: "The engineers quickly solved the problem."', evaluationCriteria: 'Uses nominalization (e.g., "resolution" instead of "solved"), passive voice correctly formed, meaning preserved', ai: true }
    ]
  },

  vocabulary: {
    A1: [
      { id: 'v-a1-1', type: 'mc', instruction: 'What does "hungry" mean?', options: ['wanting to sleep', 'wanting to eat', 'feeling cold', 'feeling sick'], correct: 'wanting to eat', correctIndex: 1 },
      { id: 'v-a1-2', type: 'mc', instruction: 'What does "angry" mean?', options: ['very happy', 'very tired', 'very upset', 'very excited'], correct: 'very upset', correctIndex: 2 },
      { id: 'v-a1-3', type: 'fill', instruction: 'Choose the correct word:', parts: ['I ', '[made/did/had]', ' a big mistake at work today.'], blanks: [{ answer: 'made', options: ['made', 'did', 'had'] }], correct: 'made' },
      { id: 'v-a1-4', type: 'mc', instruction: 'Complete: "I ___ a shower every morning."', options: ['make', 'take', 'do', 'have'], correct: 'take', correctIndex: 1 },
      { id: 'v-a1-5', type: 'write', instruction: 'Write ONE sentence using the word "happy". Describe a moment or feeling.', evaluationCriteria: 'happy used correctly as an adjective describing a positive emotional state', ai: true }
    ],
    A2: [
      { id: 'v-a2-1', type: 'mc', instruction: 'What does "exhausted" mean?', options: ['slightly tired', 'very angry', 'extremely tired', 'a bit bored'], correct: 'extremely tired', correctIndex: 2 },
      { id: 'v-a2-2', type: 'mc', instruction: 'What does "nervous" mean?', options: ['excited and happy', 'worried and anxious', 'angry and upset', 'tired and bored'], correct: 'worried and anxious', correctIndex: 1 },
      { id: 'v-a2-3', type: 'fill', instruction: 'Choose the correct word:', parts: ['Can you ', '[make/do/give]', ' me a favour?'], blanks: [{ answer: 'do', options: ['make', 'do', 'give'] }], correct: 'do' },
      { id: 'v-a2-4', type: 'mc', instruction: 'The weather that day was quite grey and damp. Which word best describes it?', options: ['sunny', 'breezy', 'misty', 'warm'], correct: 'misty', correctIndex: 2 },
      { id: 'v-a2-5', type: 'write', instruction: 'Write ONE sentence using the word "unfortunately". It should describe something that went wrong.', evaluationCriteria: 'unfortunately used as a sentence adverb introducing a negative outcome', ai: true }
    ],
    B1: [
      { id: 'v-b1-1', type: 'mc', instruction: 'What does "reluctant" mean?', options: ['very willing and eager', 'unwilling or hesitant to do something', 'confused about what to do', 'unable to do something'], correct: 'unwilling or hesitant to do something', correctIndex: 1 },
      { id: 'v-b1-2', type: 'mc', instruction: 'What does "significant" mean?', options: ['very small and unimportant', 'secret and hidden', 'large and important enough to notice', 'old-fashioned'], correct: 'large and important enough to notice', correctIndex: 2 },
      { id: 'v-b1-3', type: 'fill', instruction: 'Choose the correct word:', parts: ['The Prime Minister ', '[made/gave/said/told]', ' a speech to the nation last night.'], blanks: [{ answer: 'gave', options: ['made', 'gave', 'said', 'told'] }], correct: 'gave' },
      { id: 'v-b1-4', type: 'write', instruction: 'Write ONE sentence using the word "consequently". Show cause and effect.', evaluationCriteria: 'consequently used as a cause-effect connector between two clauses', ai: true },
      { id: 'v-b1-5', type: 'mc', instruction: 'What does "flexible" mean in a work context?', options: ['very strict about rules', 'able to change or adapt easily', 'very experienced', 'physically strong'], correct: 'able to change or adapt easily', correctIndex: 1 }
    ],
    B2: [
      { id: 'v-b2-1', type: 'mc', instruction: 'What does "ambiguous" mean?', options: ['very clear and easy to understand', 'having more than one possible meaning', 'completely wrong', 'very formal in tone'], correct: 'having more than one possible meaning', correctIndex: 1 },
      { id: 'v-b2-2', type: 'mc', instruction: 'What does "inevitable" mean?', options: ['something that can be prevented', 'something that might happen', 'something that will certainly happen', 'something that already happened'], correct: 'something that will certainly happen', correctIndex: 2 },
      { id: 'v-b2-3', type: 'write', instruction: 'Write a sentence using "albeit" to show a contrast within the same idea.', evaluationCriteria: 'albeit used as a concessive connector before an adjective or noun phrase', ai: true },
      { id: 'v-b2-4', type: 'fill', instruction: 'Choose the correct word:', parts: ['The new law came ', '[into/in/to/onto]', ' effect last January.'], blanks: [{ answer: 'into', options: ['into', 'in', 'to', 'onto'] }], correct: 'into' },
      { id: 'v-b2-5', type: 'mc', instruction: 'What does "arbitrary" mean?', options: ['based on careful evidence', 'based on skill and practice', 'decided by random chance or personal whim', 'decided by a group of experts'], correct: 'decided by random chance or personal whim', correctIndex: 2 }
    ],
    C1: [
      { id: 'v-c1-1', type: 'mc', instruction: 'What does "mitigate" mean?', options: ['to make a problem worse', 'to ignore a problem completely', 'to make a problem less severe', 'to fully solve a problem'], correct: 'to make a problem less severe', correctIndex: 2 },
      { id: 'v-c1-2', type: 'mc', instruction: 'What does "sycophantic" mean?', options: ['genuinely admiring and respectful', 'excessively flattering to gain personal advantage', 'critically honest and direct', 'emotionally detached and cold'], correct: 'excessively flattering to gain personal advantage', correctIndex: 1 },
      { id: 'v-c1-3', type: 'write', instruction: 'Write ONE sentence using "exacerbate" in an academic or formal context.', evaluationCriteria: 'exacerbate used as a verb meaning to make a bad situation worse', ai: true },
      { id: 'v-c1-4', type: 'mc', instruction: 'Choose the word that fits: "His speech was full of ___, hollow phrases that said nothing new."', options: ['platitudes', 'attitudes', 'magnitudes', 'latitudes'], correct: 'platitudes', correctIndex: 0 },
      { id: 'v-c1-5', type: 'mc', instruction: 'What does "equivocal" mean?', options: ['very clear and decisive', 'having a double or uncertain meaning', 'morally wrong', 'technically accurate'], correct: 'having a double or uncertain meaning', correctIndex: 1 }
    ],
    C2: [
      { id: 'v-c2-1', type: 'mc', instruction: 'What does "tendentious" mean?', options: ['balanced and objective', 'promoting a particular cause or point of view', 'academic and formal in style', 'obscure and difficult to understand'], correct: 'promoting a particular cause or point of view', correctIndex: 1 },
      { id: 'v-c2-2', type: 'mc', instruction: 'What does "pellucid" mean?', options: ['extremely obscure and unclear', 'translucently clear, in style or thought', 'emotionally intense', 'logically contradictory'], correct: 'translucently clear, in style or thought', correctIndex: 1 },
      { id: 'v-c2-3', type: 'write', instruction: 'Use "ineluctable" in a sentence to describe something unavoidable in a formal or literary register.', evaluationCriteria: 'ineluctable used correctly as an adjective meaning unavoidable, in a formal register', ai: true },
      { id: 'v-c2-4', type: 'mc', instruction: 'Choose the word that most precisely fits: "His argument, while superficially coherent, rested on a fundamental ___."', options: ['paradox', 'tautology', 'syllogism', 'polemic'], correct: 'tautology', correctIndex: 1 },
      { id: 'v-c2-5', type: 'mc', instruction: 'What is the best definition of "peripatetic"?', options: ['tending to argue and debate', 'moving or travelling from place to place', 'overly cautious and hesitant', 'formally educated and academic'], correct: 'moving or travelling from place to place', correctIndex: 1 },
      { id: 'v-c2-6', type: 'spot_fake', instruction: 'Click any word you think is a fake English word. It must look like real English but not exist in any dictionary. There are exactly 10.', passage: 'The relentless proliferation of digital media has precipitated a profound shift in our collective psychology, ostensibly designed to foster unprecedented global connectivity. However, beneath this veneer of limitless interaction lies a pervasive ephemerance, where substantive discourse is rapidly supplanted by fleeting, superficial engagements. We are frequently confronted by the ostentatiary displays of curated personas, which only serve to exacerbate the latent cognitive dissonance experienced by the average individual. Despite concerted efforts to achieve some ameliorance of this digital fatigue, the sheer vociferity of the online ecosystem drowns out nuanced contemplation. In our pursuit of serendipital discoveries within the algorithmic expanse, we often find ourselves entangled in an ineffablistic web of data that defies logical categorization. This relentless bombardment demands a high degree of cognitancy just to navigate the daily barrage of information, yet the inherent obfuscity of platform algorithms ensures that true clarity remains elusive. Consequently, what initially sparked a sense of global ebulliment has, for many, devolved into a stubborn intransigism, leaving society fundamentally fragmented despite its illusion of absolute cohesion.', pseudoWords: ['ephemerance', 'ostentatiary', 'ameliorance', 'vociferity', 'serendipital', 'ineffablistic', 'cognitancy', 'obfuscity', 'ebulliment', 'intransigism'], timer: 600 }
    ]
  },

  reading: {
    A1: [
      { id: 'r-a1-1', type: 'mc', instruction: 'Read this text carefully, then answer the question.', text: 'Tom has a dog called Max. Max is brown and very friendly. Every morning, before breakfast, Tom takes Max for a walk in the park. Max loves the park because there are many other dogs to play with. Tom always brings a ball for Max to catch.', question: 'What does Tom do every morning before breakfast?', options: ['He eats breakfast', 'He takes Max for a walk', 'He plays with a ball', 'He goes to work'], correct: 'He takes Max for a walk', correctIndex: 1 },
      { id: 'r-a1-2', type: 'mc', instruction: 'Read this text carefully, then answer the question.', text: 'Tom has a dog called Max. Max is brown and very friendly. Every morning, before breakfast, Tom takes Max for a walk in the park. Max loves the park because there are many other dogs to play with. Tom always brings a ball for Max to catch.', question: 'What colour is Max?', options: ['Black', 'White', 'Brown', 'Golden'], correct: 'Brown', correctIndex: 2 }
    ],
    A2: [
      { id: 'r-a2-1', type: 'mc', instruction: 'Read this text, then answer the question.', text: 'Maria moved to London three years ago to look for work. At first, she found the city very big and lonely — she missed her family and the food from home. However, after a few months, she made some good friends at her new job. Now she loves the city and cannot imagine living anywhere else.', question: 'Why did Maria move to London?', options: ['To study at university', 'To be with her family', 'To find work', 'To learn English'], correct: 'To find work', correctIndex: 2 },
      { id: 'r-a2-2', type: 'mc', instruction: 'Read the same text again, then answer this question.', text: 'Maria moved to London three years ago to look for work. At first, she found the city very big and lonely — she missed her family and the food from home. However, after a few months, she made some good friends at her new job. Now she loves the city and cannot imagine living anywhere else.', question: "How did Maria's feelings about London change over time?", options: ['She always loved it', 'She went from feeling lonely to loving it', 'She still misses home', 'She decided to leave'], correct: 'She went from feeling lonely to loving it', correctIndex: 1 }
    ],
    B1: [
      { id: 'r-b1-1', type: 'mc', instruction: 'Read this text carefully, then answer the question.', text: 'Many governments have launched campaigns encouraging citizens to recycle. However, critics argue these campaigns give people a false sense that the plastic problem is being managed, when in reality less than 10% of all plastic ever produced has been recycled. Recycling alone, they say, cannot solve the crisis — a fundamental rethinking of production and consumption is required. Asking people to simply "sort their bins" may let corporations off the hook entirely.', question: 'What do critics say about recycling campaigns?', options: ['They are very effective', 'They make people believe the problem is under control when it is not', 'They are too expensive to run', 'They focus too much on corporations'], correct: 'They make people believe the problem is under control when it is not', correctIndex: 1 },
      { id: 'r-b1-2', type: 'mc', instruction: 'Read the same text again, then answer this question.', text: 'Many governments have launched campaigns encouraging citizens to recycle. However, critics argue these campaigns give people a false sense that the plastic problem is being managed, when in reality less than 10% of all plastic ever produced has been recycled. Recycling alone, they say, cannot solve the crisis — a fundamental rethinking of production and consumption is required. Asking people to simply "sort their bins" may let corporations off the hook entirely.', question: 'What does the phrase "sort their bins" suggest about the author\'s view?', options: ['Sorting bins is the most important action', 'Recycling alone is not enough to solve the crisis', 'Governments should do more bin collection', 'People are too lazy to recycle'], correct: 'Recycling alone is not enough to solve the crisis', correctIndex: 1 },
      { id: 'r-b1-3', type: 'mc', instruction: 'Read the same text again, then answer this question.', text: 'Many governments have launched campaigns encouraging citizens to recycle. However, critics argue these campaigns give people a false sense that the plastic problem is being managed, when in reality less than 10% of all plastic ever produced has been recycled. Recycling alone, they say, cannot solve the crisis — a fundamental rethinking of production and consumption is required. Asking people to simply "sort their bins" may let corporations off the hook entirely.', question: 'What percentage of plastic has ever been recycled?', options: ['More than 50%', 'About 25%', 'Less than 10%', 'About 40%'], correct: 'Less than 10%', correctIndex: 2 }
    ],
    B2: [
      { id: 'r-b2-1', type: 'mc', instruction: 'Read this text carefully, then answer the question.', text: 'Research consistently links heavy social media use to rising rates of anxiety, depression, and loneliness — yet these same platforms were designed to connect people. This is the paradox at the heart of the debate. Some researchers point to amplification effects, arguing that platforms worsen pre-existing mental health conditions rather than cause new ones. Others focus on addictive design patterns: infinite scroll, variable reward notifications, and algorithmically curated content that maximises time on screen. Governments have begun calling for independent audits, though whether these will lead to binding regulation remains deeply uncertain.', question: 'What is "the paradox" referred to in the passage?', options: ['Social media is popular but boring', 'Platforms designed to connect people are making them more isolated', 'People use social media but don\'t like it', 'Governments support social media companies'], correct: 'Platforms designed to connect people are making them more isolated', correctIndex: 1 },
      { id: 'r-b2-2', type: 'mc', instruction: 'Read the same text again, then answer this question.', text: 'Research consistently links heavy social media use to rising rates of anxiety, depression, and loneliness — yet these same platforms were designed to connect people. This is the paradox at the heart of the debate. Some researchers point to amplification effects, arguing that platforms worsen pre-existing mental health conditions rather than cause new ones. Others focus on addictive design patterns: infinite scroll, variable reward notifications, and algorithmically curated content that maximises time on screen. Governments have begun calling for independent audits, though whether these will lead to binding regulation remains deeply uncertain.', question: 'What does the final sentence imply?', options: ['Regulation is certain to come soon', 'The harm is proven and action will definitely be taken', 'There is doubt that audits will lead to real legal change', 'Governments are not interested in the issue'], correct: 'There is doubt that audits will lead to real legal change', correctIndex: 2 },
      { id: 'r-b2-3', type: 'mc', instruction: 'Read the same text again, then answer this question.', text: 'Research consistently links heavy social media use to rising rates of anxiety, depression, and loneliness — yet these same platforms were designed to connect people. This is the paradox at the heart of the debate. Some researchers point to amplification effects, arguing that platforms worsen pre-existing mental health conditions rather than cause new ones. Others focus on addictive design patterns: infinite scroll, variable reward notifications, and algorithmically curated content that maximises time on screen. Governments have begun calling for independent audits, though whether these will lead to binding regulation remains deeply uncertain.', question: 'Which two explanations for the link between social media and mental health are mentioned?', options: ['Loneliness and addiction', 'Amplification of pre-existing conditions and addictive design patterns', 'Poor content quality and too much advertising', 'Government inaction and corporate greed'], correct: 'Amplification of pre-existing conditions and addictive design patterns', correctIndex: 1 }
    ],
    C1: [
      { id: 'r-c1-1', type: 'mc', instruction: 'Read this text carefully, then answer the question.', text: 'Proponents of Universal Basic Income argue that the rise of automation represents an unprecedented threat to employment — one that traditional welfare systems are not equipped to handle. Critics, however, question the underlying assumption: that this wave of technological disruption is fundamentally different from previous ones. The Industrial Revolution displaced the weavers of the 1800s, yet new industries emerged. The certainty of catastrophe, these critics suggest, is no more defensible than complacency. What is clear is that the debate turns not on whether jobs will change — they will — but on whether societies will act with sufficient foresight to manage that change humanely.', question: 'What assumption in the pro-UBI argument do critics question?', options: ['That automation is bad for workers', "That previous disruptions were less severe than today's", 'That automation is unprecedented, when historically economies adapt', 'That governments should control technology'], correct: 'That automation is unprecedented, when historically economies adapt', correctIndex: 2 },
      { id: 'r-c1-2', type: 'mc', instruction: 'Read the same text again, then answer this question.', text: 'Proponents of Universal Basic Income argue that the rise of automation represents an unprecedented threat to employment — one that traditional welfare systems are not equipped to handle. Critics, however, question the underlying assumption: that this wave of technological disruption is fundamentally different from previous ones. The Industrial Revolution displaced the weavers of the 1800s, yet new industries emerged. The certainty of catastrophe, these critics suggest, is no more defensible than complacency. What is clear is that the debate turns not on whether jobs will change — they will — but on whether societies will act with sufficient foresight to manage that change humanely.', question: 'What does "the certainty of catastrophe is no more defensible than complacency" suggest about the author?', options: ['The author strongly supports UBI', 'The author thinks catastrophe is certain', 'The author is balanced and avoids taking a firm side', 'The author believes we should do nothing'], correct: 'The author is balanced and avoids taking a firm side', correctIndex: 2 },
      { id: 'r-c1-3', type: 'mc', instruction: 'Read the same text again, then answer this question.', text: 'Proponents of Universal Basic Income argue that the rise of automation represents an unprecedented threat to employment — one that traditional welfare systems are not equipped to handle. Critics, however, question the underlying assumption: that this wave of technological disruption is fundamentally different from previous ones. The Industrial Revolution displaced the weavers of the 1800s, yet new industries emerged. The certainty of catastrophe, these critics suggest, is no more defensible than complacency. What is clear is that the debate turns not on whether jobs will change — they will — but on whether societies will act with sufficient foresight to manage that change humanely.', question: 'What historical example is used and what point does it make?', options: ['The French Revolution — showing that change is violent', 'Industrial Revolution weavers — showing that past displacement did not prevent new industries from emerging', 'The invention of the internet — showing technology always creates jobs', 'World War II — showing that economies can recover quickly'], correct: 'Industrial Revolution weavers — showing that past displacement did not prevent new industries from emerging', correctIndex: 1 }
    ],
    C2: [
      { id: 'r-c2-1', type: 'mc', instruction: 'Read this text carefully, then answer the question.', text: 'The tension between judicial independence and democratic accountability has never been fully resolved in liberal constitutional theory. Courts that strike down legislation passed by elected majorities inevitably attract the charge of counter-majoritarianism — the accusation that an unelected judiciary is substituting its own preferences for those of the people. Yet defenders of judicial review contend that democracy is not reducible to majority rule: if constitutional rights are to mean anything, they must be enforceable even against the wishes of a transient parliamentary majority. The debate thus forces us to confront a prior question: what do we mean, precisely, when we invoke "democracy"?', question: 'What is "counter-majoritarianism" as used in the passage?', options: ['A theory that courts should have more power than parliaments', 'The accusation that courts override elected majorities with their own preferences', 'The view that minorities should be protected from majority rule', 'A political movement opposed to constitutional reform'], correct: 'The accusation that courts override elected majorities with their own preferences', correctIndex: 1 },
      { id: 'r-c2-2', type: 'mc', instruction: 'Read the same text again, then answer this question.', text: 'The tension between judicial independence and democratic accountability has never been fully resolved in liberal constitutional theory. Courts that strike down legislation passed by elected majorities inevitably attract the charge of counter-majoritarianism — the accusation that an unelected judiciary is substituting its own preferences for those of the people. Yet defenders of judicial review contend that democracy is not reducible to majority rule: if constitutional rights are to mean anything, they must be enforceable even against the wishes of a transient parliamentary majority. The debate thus forces us to confront a prior question: what do we mean, precisely, when we invoke "democracy"?', question: 'How do defenders of judicial review respond to the charge?', options: ['They argue courts always reflect public opinion', 'They deny that courts ever strike down legislation', 'They argue democracy means more than majority rule and rights must be protected from transient majorities', 'They argue the judiciary should be elected'], correct: 'They argue democracy means more than majority rule and rights must be protected from transient majorities', correctIndex: 2 },
      { id: 'r-c2-3', type: 'mc', instruction: 'Read the same text again, then answer this question.', text: 'The tension between judicial independence and democratic accountability has never been fully resolved in liberal constitutional theory. Courts that strike down legislation passed by elected majorities inevitably attract the charge of counter-majoritarianism — the accusation that an unelected judiciary is substituting its own preferences for those of the people. Yet defenders of judicial review contend that democracy is not reducible to majority rule: if constitutional rights are to mean anything, they must be enforceable even against the wishes of a transient parliamentary majority. The debate thus forces us to confront a prior question: what do we mean, precisely, when we invoke "democracy"?', question: 'What "prior question" does the author say the debate forces us to confront?', options: ['Whether courts should be reformed', 'What we actually mean by the concept of democracy itself', 'Whether rights should be written into law', 'Whether judges should be politically neutral'], correct: 'What we actually mean by the concept of democracy itself', correctIndex: 1 }
    ]
  },

  writing: {
    A1: [{ id: 'w-a1-1', type: 'free_write', instruction: 'Think of an important decision you made in your life. What was it, why did you make it, and what happened? Write 40–80 words.', minWords: 30, maxWords: 100 }],
    A2: [{ id: 'w-a2-1', type: 'free_write', instruction: 'Write about something you did last week using past simple. What did you do? Where did you go? (40–80 words)', minWords: 30, maxWords: 100 }],
    B1: [{ id: 'w-b1-1', type: 'free_write', instruction: 'Think of an important decision you made in your life. What was it, why did you make it, and what happened? Write 80–150 words. Use at least one past perfect or conditional structure.', minWords: 60, maxWords: 180 }],
    B2: [{ id: 'w-b2-1', type: 'free_write', instruction: 'A friend is considering quitting their stable job to start a business. Write them an email of advice (100–160 words). Use at least one modal of advice (should, ought to, might want to) and one conditional.', minWords: 80, maxWords: 200 }],
    C1: [{ id: 'w-c1-1', type: 'free_write', instruction: 'Write a formal argumentative paragraph (120–200 words) on the following: "Governments have a duty to regulate social media platforms." Use hedging language, a counter-argument, and a coherent conclusion.', minWords: 100, maxWords: 250 }],
    C2: [{ id: 'w-c2-1', type: 'free_write', instruction: 'Write a critically analytical paragraph (150–220 words) responding to: "Expertise is overrated in democratic decision-making." Your paragraph should acknowledge complexity, deploy precise hedging, and reach a nuanced position.', minWords: 120, maxWords: 280 }]
  },

  dialogue: {
    A1: [
      { id: 'd-a1-1', type: 'mc', instruction: 'Read this conversation, then answer the question.', text: 'Lucy: Hi James! You look a bit lost — is everything okay?\nJames: Oh, hi! Yes, I\'m new here. I can\'t find the bathroom.\nLucy: No problem! It\'s on the second floor, next to the stairs.\nJames: Thank you so much! This building is really confusing.\nLucy: Don\'t worry, you\'ll get used to it quickly!', question: 'Where is the bathroom?', options: ['First floor, near the lift', 'Second floor, next to the stairs', 'Third floor, by the window', 'Ground floor, near the exit'], correct: 'Second floor, next to the stairs', correctIndex: 1 },
      { id: 'd-a1-2', type: 'mc', instruction: 'Read the same conversation again.', text: 'Lucy: Hi James! You look a bit lost — is everything okay?\nJames: Oh, hi! Yes, I\'m new here. I can\'t find the bathroom.\nLucy: No problem! It\'s on the second floor, next to the stairs.\nJames: Thank you so much! This building is really confusing.\nLucy: Don\'t worry, you\'ll get used to it quickly!', question: 'Why does James need help?', options: ["He's injured", "He's new and doesn't know the building", 'He forgot his keys', "He can't read the signs"], correct: "He's new and doesn't know the building", correctIndex: 1 }
    ],
    A2: [
      { id: 'd-a2-1', type: 'mc', instruction: 'Read this conversation, then answer the question.', text: 'Customer: Excuse me. I bought this jacket here last week, but there\'s a problem with it.\nAssistant: Oh, I\'m sorry to hear that. What seems to be the issue?\nCustomer: The zip is broken. It got stuck the first time I used it.\nAssistant: That\'s not acceptable at all. Would you like a refund or an exchange?\nCustomer: I really like the jacket, so I\'d prefer to exchange it if possible.\nAssistant: Of course. Let me check if we have your size in stock.', question: 'What is the problem with the jacket?', options: ['It is the wrong size', 'The zip is broken', 'The colour is wrong', 'There is a hole in it'], correct: 'The zip is broken', correctIndex: 1 },
      { id: 'd-a2-2', type: 'mc', instruction: 'Read the same conversation again.', text: 'Customer: Excuse me. I bought this jacket here last week, but there\'s a problem with it.\nAssistant: Oh, I\'m sorry to hear that. What seems to be the issue?\nCustomer: The zip is broken. It got stuck the first time I used it.\nAssistant: That\'s not acceptable at all. Would you like a refund or an exchange?\nCustomer: I really like the jacket, so I\'d prefer to exchange it if possible.\nAssistant: Of course. Let me check if we have your size in stock.', question: 'What does the customer decide to do?', options: ['Get a refund', 'Exchange it for another jacket', 'Keep the broken jacket', 'Ask for a discount'], correct: 'Exchange it for another jacket', correctIndex: 1 }
    ],
    B1: [
      { id: 'd-b1-1', type: 'mc', instruction: 'Read this conversation, then answer the question.', text: 'Manager: I wanted to have a quick word about the recent lateness. You\'ve been late three times this week.\nEmployee: I know, and I\'m really sorry. There are roadworks near my house and the bus has been severely delayed every morning.\nManager: I see. I appreciate you explaining. Have you looked at other routes?\nEmployee: I\'ve tried, but they all add at least 40 minutes.\nManager: In that case, what if you worked from home on Mondays and Fridays for the next month? We can review after that.\nEmployee: That would be incredibly helpful. Thank you for being so understanding.', question: 'Why has the employee been arriving late?', options: ['They overslept', 'Roadworks are causing bus delays', 'Their car is broken', 'They live too far away'], correct: 'Roadworks are causing bus delays', correctIndex: 1 },
      { id: 'd-b1-2', type: 'mc', instruction: 'Read the same conversation again.', text: 'Manager: I wanted to have a quick word about the recent lateness. You\'ve been late three times this week.\nEmployee: I know, and I\'m really sorry. There are roadworks near my house and the bus has been severely delayed every morning.\nManager: I see. I appreciate you explaining. Have you looked at other routes?\nEmployee: I\'ve tried, but they all add at least 40 minutes.\nManager: In that case, what if you worked from home on Mondays and Fridays for the next month? We can review after that.\nEmployee: That would be incredibly helpful. Thank you for being so understanding.', question: 'What does the manager\'s response reveal about their approach?', options: ['They are angry and strict', 'They are flexible and solution-focused', 'They want to fire the employee', "They don't care about the issue"], correct: 'They are flexible and solution-focused', correctIndex: 1 },
      { id: 'd-b1-3', type: 'mc', instruction: 'Read the same conversation again.', text: 'Manager: I wanted to have a quick word about the recent lateness. You\'ve been late three times this week.\nEmployee: I know, and I\'m really sorry. There are roadworks near my house and the bus has been severely delayed every morning.\nManager: I see. I appreciate you explaining. Have you looked at other routes?\nEmployee: I\'ve tried, but they all add at least 40 minutes.\nManager: In that case, what if you worked from home on Mondays and Fridays for the next month? We can review after that.\nEmployee: That would be incredibly helpful. Thank you for being so understanding.', question: 'What do they agree on as a solution?', options: ['A different job role', 'A pay cut', 'Working from home on Mondays and Fridays', 'Starting work later every day'], correct: 'Working from home on Mondays and Fridays', correctIndex: 2 }
    ],
    B2: [
      { id: 'd-b2-1', type: 'mc', instruction: 'Read this conversation, then answer the question.', text: 'Interviewer: During your CV gap, what were you actually doing?\nCandidate: I completed a professional analytics course online and spent six months volunteering with a local charity, independently managing their donor communications.\nInterviewer: Interesting. When you say "independently" — do you mean you had formal oversight, or were you entirely self-directed?\nCandidate: Entirely self-directed. I set my own targets, reported to no one, and built their system from scratch.\nInterviewer: And how does that period connect to the role you\'re applying for today?\nCandidate: It was entirely intentional. I knew I wanted to move into data-driven communications, and I used the gap to build the skills I was missing.', question: 'Name two things the candidate did during their gap year.', options: ['Travelled and learned languages', 'Completed an analytics course and volunteered at a charity', 'Worked part-time and studied full-time', 'Took care of family and freelanced'], correct: 'Completed an analytics course and volunteered at a charity', correctIndex: 1 },
      { id: 'd-b2-2', type: 'mc', instruction: 'Read the same conversation again.', text: 'Interviewer: During your CV gap, what were you actually doing?\nCandidate: I completed a professional analytics course online and spent six months volunteering with a local charity, independently managing their donor communications.\nInterviewer: Interesting. When you say "independently" — do you mean you had formal oversight, or were you entirely self-directed?\nCandidate: Entirely self-directed. I set my own targets, reported to no one, and built their system from scratch.\nInterviewer: And how does that period connect to the role you\'re applying for today?\nCandidate: It was entirely intentional. I knew I wanted to move into data-driven communications, and I used the gap to build the skills I was missing.', question: 'Why does the interviewer ask about the word "independently"?', options: ['They think the candidate is lying', 'They want to check whether it means formally supervised or self-directed', "They don't know what the word means", 'They are testing the candidate\'s language skills'], correct: 'They want to check whether it means formally supervised or self-directed', correctIndex: 1 },
      { id: 'd-b2-3', type: 'mc', instruction: 'Read the same conversation again.', text: 'Interviewer: During your CV gap, what were you actually doing?\nCandidate: I completed a professional analytics course online and spent six months volunteering with a local charity, independently managing their donor communications.\nInterviewer: Interesting. When you say "independently" — do you mean you had formal oversight, or were you entirely self-directed?\nCandidate: Entirely self-directed. I set my own targets, reported to no one, and built their system from scratch.\nInterviewer: And how does that period connect to the role you\'re applying for today?\nCandidate: It was entirely intentional. I knew I wanted to move into data-driven communications, and I used the gap to build the skills I was missing.', question: 'How does the candidate\'s gap period connect to their current application?', options: ['It was unplanned but worked out', 'It shows the gap was intentional and designed to build relevant skills', 'It proves they were unemployable elsewhere', 'It shows they prefer working alone'], correct: 'It shows the gap was intentional and designed to build relevant skills', correctIndex: 1 }
    ],
    C1: [
      { id: 'd-c1-1', type: 'mc', instruction: 'Read this conversation, then answer the question.', text: 'Journalist: Minister, the housing targets were missed for the fourth consecutive year. At what point does a target become meaningless?\nMinister: I understand the frustration, but these are complex structural issues. We remain fully committed to the programme.\nJournalist: You told Parliament last spring you were "confident" the targets would be met. Were you confident?\nMinister: I was confident in the direction of the programme, yes.\nJournalist: Confident, or certain?\nMinister: Well... I was confident we had the right approach. Whether every figure would be hit — I couldn\'t be certain of that.', question: 'What technique does the journalist use in their opening question?', options: ['They ask a vague general question', 'They use specific evidence (four consecutive years) to challenge the minister\'s credibility', 'They express sympathy for the minister\'s situation', 'They ask the minister to explain government policy'], correct: 'They use specific evidence (four consecutive years) to challenge the minister\'s credibility', correctIndex: 1 },
      { id: 'd-c1-2', type: 'mc', instruction: 'Read the same conversation again.', text: 'Journalist: Minister, the housing targets were missed for the fourth consecutive year. At what point does a target become meaningless?\nMinister: I understand the frustration, but these are complex structural issues. We remain fully committed to the programme.\nJournalist: You told Parliament last spring you were "confident" the targets would be met. Were you confident?\nMinister: I was confident in the direction of the programme, yes.\nJournalist: Confident, or certain?\nMinister: Well... I was confident we had the right approach. Whether every figure would be hit — I couldn\'t be certain of that.', question: 'What does the minister\'s final answer reveal?', options: ['They were always secretly confident', 'They had full parliamentary support', 'They did not have guaranteed certainty — "confident" was overstated', 'They blame the journalist for misquoting them'], correct: 'They did not have guaranteed certainty — "confident" was overstated', correctIndex: 2 },
      { id: 'd-c1-3', type: 'mc', instruction: 'Read the same conversation again.', text: 'Journalist: Minister, the housing targets were missed for the fourth consecutive year. At what point does a target become meaningless?\nMinister: I understand the frustration, but these are complex structural issues. We remain fully committed to the programme.\nJournalist: You told Parliament last spring you were "confident" the targets would be met. Were you confident?\nMinister: I was confident in the direction of the programme, yes.\nJournalist: Confident, or certain?\nMinister: Well... I was confident we had the right approach. Whether every figure would be hit — I couldn\'t be certain of that.', question: 'What is the purpose of pressing the minister on "confident" vs "certain"?', options: ['To test the minister\'s vocabulary', 'To show that the journalist is pedantic', 'To expose the gap between public confidence and private doubt', 'To confuse the audience'], correct: 'To expose the gap between public confidence and private doubt', correctIndex: 2 }
    ],
    C2: [
      { id: 'd-c2-1', type: 'mc', instruction: 'Read this conversation, then answer the question.', text: 'Chair: Professor, your paper claims the evidence for this intervention is "robust." The Cochrane review published last March rated it as low-certainty. How do you reconcile those characterisations?\nProfessor: The Cochrane review used a GRADE framework that penalises heterogeneity across trials. Our meta-analysis controlled for baseline confounds.\nChair: Controlled for, or adjusted post-hoc?\nProfessor: The adjustments were pre-registered in our protocol.\nChair: Registered before or after you saw the data?\nProfessor: Before final analysis, yes — though some preliminary figures were available at the time of registration.\nChair: That\'s not pre-registration as it is ordinarily understood in the field, is it?', question: 'What specific methodological conflict does the Chair identify?', options: ['The professor used the wrong statistics', 'The Cochrane review contradicts the professor\'s "robust" claim, given it rated evidence as low-certainty', 'The professor has no peer-reviewed publications', 'The professor used data from a different country'], correct: 'The Cochrane review contradicts the professor\'s "robust" claim, given it rated evidence as low-certainty', correctIndex: 1 },
      { id: 'd-c2-2', type: 'mc', instruction: 'Read the same conversation again.', text: 'Chair: Professor, your paper claims the evidence for this intervention is "robust." The Cochrane review published last March rated it as low-certainty. How do you reconcile those characterisations?\nProfessor: The Cochrane review used a GRADE framework that penalises heterogeneity across trials. Our meta-analysis controlled for baseline confounds.\nChair: Controlled for, or adjusted post-hoc?\nProfessor: The adjustments were pre-registered in our protocol.\nChair: Registered before or after you saw the data?\nProfessor: Before final analysis, yes — though some preliminary figures were available at the time of registration.\nChair: That\'s not pre-registration as it is ordinarily understood in the field, is it?', question: 'What does the Chair\'s final question imply about the professor\'s pre-registration?', options: ['The professor correctly followed the protocol', 'The professor\'s pre-registration is technically accurate but does not meet the standard the field actually requires', 'The professor is fraudulent', 'The professor registered the wrong protocol'], correct: 'The professor\'s pre-registration is technically accurate but does not meet the standard the field actually requires', correctIndex: 1 },
      { id: 'd-c2-3', type: 'mc', instruction: 'Read the same conversation again.', text: 'Chair: Professor, your paper claims the evidence for this intervention is "robust." The Cochrane review published last March rated it as low-certainty. How do you reconcile those characterisations?\nProfessor: The Cochrane review used a GRADE framework that penalises heterogeneity across trials. Our meta-analysis controlled for baseline confounds.\nChair: Controlled for, or adjusted post-hoc?\nProfessor: The adjustments were pre-registered in our protocol.\nChair: Registered before or after you saw the data?\nProfessor: Before final analysis, yes — though some preliminary figures were available at the time of registration.\nChair: That\'s not pre-registration as it is ordinarily understood in the field, is it?', question: 'How does the dialogue structure reveal the Chair\'s strategy?', options: ['The Chair attacks the professor personally', 'The Chair asks vague general questions', 'The Chair progressively narrows each answer to expose a logical inconsistency about methodology and research integrity', 'The Chair agrees with the professor at every step'], correct: 'The Chair progressively narrows each answer to expose a logical inconsistency about methodology and research integrity', correctIndex: 2 }
    ]
  }
};

// ─────────────────────────────────────────────
// ADAPTIVE LOGIC HELPERS
// ─────────────────────────────────────────────

function determineStartLevel() { return 'A1'; }

function getNextLevel(skillAnswers, currentLevel) {
  const atCurrentLevel = skillAnswers.filter(a => a.level === currentLevel);
  const levelIndex = CEFR_LEVELS.indexOf(currentLevel);

  // Climbing phase (A1, A2): 1 question, always go forward
  if (levelIndex <= 1) {
    if (atCurrentLevel.length === 0) return { action: 'continue', level: currentLevel };
    if (levelIndex < CEFR_LEVELS.length - 1) return { action: 'up', level: CEFR_LEVELS[levelIndex + 1] };
    return { action: 'confirm', level: currentLevel };
  }

  // Confirmation phase (B1+): 3 questions to confirm
  if (atCurrentLevel.length < 3) return { action: 'continue', level: currentLevel };

  const last3 = atCurrentLevel.slice(-3);
  const correctCount = last3.filter(a => a.correct).length;

  if (correctCount >= 2) {
    if (levelIndex < CEFR_LEVELS.length - 1) return { action: 'up', level: CEFR_LEVELS[levelIndex + 1] };
    return { action: 'confirm', level: currentLevel };
  }

  return { action: 'confirm', level: currentLevel };
}

function isSkillConfirmed(skillAnswers, currentLevel) {
  const atLevel = skillAnswers.filter(a => a.level === currentLevel);
  const levelIndex = CEFR_LEVELS.indexOf(currentLevel);

  if (levelIndex <= 1) return false;

  if (atLevel.length < 3) return false;

  const last3 = atLevel.slice(-3);
  const correctCount = last3.filter(a => a.correct).length;

  if (correctCount >= 2) {
    if (levelIndex < CEFR_LEVELS.length - 1) {
      const nextAnswers = skillAnswers.filter(a => a.level === CEFR_LEVELS[levelIndex + 1]);
      if (nextAnswers.length >= 3) {
        const nextCorrect = nextAnswers.slice(-3).filter(a => a.correct).length;
        if (nextCorrect < 2) return true;
      }
      return false;
    }
    return true;
  }

  return true;
}

function getFinalLevel(skillAnswers) {
  if (!skillAnswers || skillAnswers.length === 0) return 'A1';
  const levelScores = {};
  CEFR_LEVELS.forEach(l => { levelScores[l] = { correct: 0, total: 0 }; });
  skillAnswers.forEach(a => {
    if (levelScores[a.level]) {
      levelScores[a.level].total++;
      if (a.correct) levelScores[a.level].correct++;
    }
  });
  for (let i = CEFR_LEVELS.length - 1; i >= 0; i--) {
    const level = CEFR_LEVELS[i];
    const s = levelScores[level];
    if (i <= 1) {
      if (s.total >= 1 && s.correct >= 1) return level;
    } else {
      if (s.total >= 3 && s.correct >= 2) return level;
    }
  }
  return 'A1';
}

function getNextQuestion(skill, currentLevel, usedIds) {
  const bank = QUESTION_BANK[skill];
  if (!bank) return null;

  // Writing: per-level prompts
  if (skill === 'writing') {
    const levelBank = bank[currentLevel];
    if (levelBank && levelBank.length > 0) {
      const available = levelBank.filter(q => !usedIds.includes(q.id));
      if (available.length > 0) return { ...available[0], skill, level: currentLevel };
    }
    // Fallback: try other levels
    for (const lvl of CEFR_LEVELS) {
      const lb = bank[lvl];
      if (lb) {
        const av = lb.filter(q => !usedIds.includes(q.id));
        if (av.length > 0) return { ...av[0], skill, level: currentLevel };
      }
    }
    return null;
  }

  const levelBank = bank[currentLevel];
  if (!levelBank) {
    const fallbackLevel = CEFR_LEVELS[Math.max(0, CEFR_LEVELS.indexOf(currentLevel) - 1)] || 'B1';
    const fallback = bank[fallbackLevel];
    if (!fallback) return null;
    const available = fallback.filter(q => !usedIds.includes(q.id));
    return available.length > 0 ? { ...available[0], skill, level: currentLevel } : null;
  }
  const available = levelBank.filter(q => !usedIds.includes(q.id));
  if (available.length === 0) {
    const levelIndex = CEFR_LEVELS.indexOf(currentLevel);
    const fallbackIdx = levelIndex > 0 ? levelIndex - 1 : 1;
    const fallback = bank[CEFR_LEVELS[fallbackIdx]];
    if (!fallback) return null;
    const fallbackAvailable = fallback.filter(q => !usedIds.includes(q.id));
    return fallbackAvailable.length > 0 ? { ...fallbackAvailable[0], skill, level: currentLevel } : null;
  }
  return { ...available[0], skill, level: currentLevel };
}

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

router.get('/status', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, status, current_skill, results, retake_eligible_at FROM placement_tests WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`,
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.json({ hasTest: false, canTake: true });
    const test = result.rows[0];
    if (test.status === 'in_progress') return res.json({ hasTest: true, status: 'in_progress', testId: test.id });
    const canRetake = !test.retake_eligible_at || new Date() > new Date(test.retake_eligible_at);
    return res.json({ hasTest: true, status: 'completed', results: test.results, canRetake, retakeEligibleAt: test.retake_eligible_at });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Something went wrong.' }); }
});

router.post('/start', authMiddleware, async (req, res) => {
  try {
    const existing = await pool.query(
      `SELECT id FROM placement_tests WHERE user_id = $1 AND status = 'in_progress'`,
      [req.user.userId]
    );
    if (existing.rows.length > 0) return res.json({ testId: existing.rows[0].id, resumed: true });

    const completed = await pool.query(
      `SELECT retake_eligible_at FROM placement_tests WHERE user_id = $1 AND status = 'completed' ORDER BY started_at DESC LIMIT 1`,
      [req.user.userId]
    );
    if (completed.rows.length > 0) {
      const retakeAt = completed.rows[0].retake_eligible_at;
      if (retakeAt && new Date() < new Date(retakeAt)) {
        return res.status(403).json({ error: 'Please wait before retaking the test.' });
      }
    }

    const result = await pool.query(
      `INSERT INTO placement_tests (user_id, status, current_skill, current_question) VALUES ($1, 'in_progress', 'grammar', 0) RETURNING id`,
      [req.user.userId]
    );
    res.json({ testId: result.rows[0].id, resumed: false });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Something went wrong.' }); }
});

function checkDirectAnswer(questionType, questionData, answer) {
  if (questionType === 'mc') {
    return answer.trim().toLowerCase() === (questionData.correct || '').toLowerCase();
  }
  if (questionType === 'fill') {
    return answer.trim().toLowerCase() === (questionData.correct || '').toLowerCase();
  }
  if (questionType === 'sort') {
    return answer.trim().toLowerCase().replace(/\s+/g, ' ') === (questionData.correct || '').toLowerCase().replace(/\s+/g, ' ');
  }
  if (questionType === 'match') {
    // Answer should be JSON stringified pairs
    try {
      const userPairs = JSON.parse(answer);
      const correctPairs = questionData.pairs;
      return Object.entries(userPairs).every(([k, v]) => correctPairs[k] === v);
    } catch { return false; }
  }
  if (questionType === 'error') {
    return answer.trim().toLowerCase() === (questionData.correct || '').toLowerCase();
  }
  if (questionType === 'spot_fake') {
    try {
      const userFound = JSON.parse(answer);
      const fakeCount = userFound.filter(w => questionData.pseudoWords.includes(w)).length;
      return fakeCount >= Math.ceil(questionData.pseudoWords.length / 2);
    } catch { return false; }
  }
  return null;
}

router.get('/:testId/question', authMiddleware, async (req, res) => {
  try {
    const testResult = await pool.query('SELECT * FROM placement_tests WHERE id = $1 AND user_id = $2', [req.params.testId, req.user.userId]);
    if (testResult.rows.length === 0) return res.status(404).json({ error: 'Test not found' });
    const test = testResult.rows[0];
    if (test.status === 'completed') return res.json({ completed: true, results: test.results });

    const skill = test.current_skill;
    const answers = test.answers || [];
    const skillAnswers = answers.filter(a => a.skill === skill);
    const usedIds = skillAnswers.map(a => a.questionId).filter(Boolean);

    if (skill === 'writing') {
      if (skillAnswers.length > 0) {
        const skillIndex = SKILL_ORDER.indexOf(skill);
        if (skillIndex === SKILL_ORDER.length - 1) {
          return res.json({ completed: true, results: test.results });
        }
        const nextSkill = SKILL_ORDER[skillIndex + 1];
        await pool.query('UPDATE placement_tests SET current_skill = $1 WHERE id = $2', [nextSkill, req.params.testId]);
        return res.json({ skillComplete: true, completedSkill: skill, completedLevel: getFinalLevel(skillAnswers), nextSkill, allComplete: false });
      }
      const level = determineStartLevel();
      const question = getNextQuestion(skill, level, usedIds);
      if (!question) {
        const skillIndex = SKILL_ORDER.indexOf(skill);
        if (skillIndex === SKILL_ORDER.length - 1) return res.json({ skillComplete: true, allComplete: true });
        const nextSkill = SKILL_ORDER[skillIndex + 1];
        await pool.query('UPDATE placement_tests SET current_skill = $1 WHERE id = $2', [nextSkill, req.params.testId]);
        return res.json({ skillComplete: true, completedSkill: skill, completedLevel: 'A1', nextSkill, allComplete: false });
      }
      return res.json({
        question: { ...question, skill, level: question.level || level },
        progress: { currentSkill: skill, skillIndex: SKILL_ORDER.indexOf(skill), totalSkills: SKILL_ORDER.length, questionsInSkill: 0, showEncouragement: false }
      });
    }

    let currentLevel = determineStartLevel();
    if (skillAnswers.length > 0) {
      const lastLevel = skillAnswers[skillAnswers.length - 1].level;
      const nextDecision = getNextLevel(skillAnswers, lastLevel);
      currentLevel = nextDecision.level;
    }

    if (isSkillConfirmed(skillAnswers, currentLevel)) {
      const skillIndex = SKILL_ORDER.indexOf(skill);
      if (skillIndex === SKILL_ORDER.length - 1) {
        return res.json({ skillComplete: true, allComplete: true });
      }
      const nextSkill = SKILL_ORDER[skillIndex + 1];
      await pool.query('UPDATE placement_tests SET current_skill = $1 WHERE id = $2', [nextSkill, req.params.testId]);
      return res.json({ skillComplete: true, completedSkill: skill, completedLevel: getFinalLevel(skillAnswers), nextSkill, allComplete: false });
    }

    const question = getNextQuestion(skill, currentLevel, usedIds);
    if (!question) {
      const skillIndex = SKILL_ORDER.indexOf(skill);
      if (skillIndex === SKILL_ORDER.length - 1) return res.json({ skillComplete: true, allComplete: true });
      const nextSkill = SKILL_ORDER[skillIndex + 1];
      await pool.query('UPDATE placement_tests SET current_skill = $1 WHERE id = $2', [nextSkill, req.params.testId]);
      return res.json({ skillComplete: true, completedSkill: skill, completedLevel: getFinalLevel(skillAnswers), nextSkill, allComplete: false });
    }

    const wrongInRow = skillAnswers.length >= 3 && skillAnswers.slice(-3).every(a => !a.correct);
    res.json({ question, progress: { currentSkill: skill, skillIndex: SKILL_ORDER.indexOf(skill), totalSkills: SKILL_ORDER.length, questionsInSkill: skillAnswers.length, showEncouragement: wrongInRow } });
  } catch (err) { console.error('Get question error:', err); res.status(500).json({ error: err?.message || 'Something went wrong.' }); }
});

router.post('/:testId/answer', authMiddleware, async (req, res) => {
  try {
    const { answer, skill, level, questionType, questionData } = req.body;
    const testResult = await pool.query(
      'SELECT * FROM placement_tests WHERE id = $1 AND user_id = $2',
      [req.params.testId, req.user.userId]
    );
    if (testResult.rows.length === 0) return res.status(404).json({ error: 'Test not found' });

    // ── Writing: special evaluation ──────────────────────────────────────
    if (questionType === 'free_write') {
      const currentAnswers = testResult.rows[0].answers || [];
      const baseAnswer = {
        skill, level: 'pending', questionType,
        answer: answer.substring(0, 500), correct: true,
        questionId: questionData?.id,
        timestamp: new Date().toISOString()
      };
      await pool.query(
        'UPDATE placement_tests SET answers = $1 WHERE id = $2',
        [JSON.stringify([...currentAnswers, baseAnswer]), req.params.testId]
      );

      try {
        const prompt = `You are a real English teacher reading a student's writing. Read it the way a real person would — not like a machine.

The student was given this prompt:
"${questionData.instruction}"

They wrote:
"${answer.substring(0, 2000)}"

Read it carefully. Think about:
- How well do they express ideas?
- What grammar patterns do they use?
- How wide is their vocabulary?
- Do their sentences connect smoothly?
- Did they actually answer the prompt?

Now assign a level:
- A1: barely connected sentences, very limited words
- A2: simple sentences, some errors, everyday vocabulary
- B1: clear writing with some errors, decent vocabulary
- B2: good writing, occasional errors, solid vocabulary
- C1: sophisticated writing, rare errors, precise vocabulary
- C2: near-native, exceptional precision

Write your response like a real teacher talking to a student — warm, honest, specific. Two or three sentences. Name something specific they did well and one specific thing to work on.

Then on the very last lines add:
LEVEL_DATA: {"level": "B1", "sublevel": "mid", "evidence": "your notes", "strengths": ["one strength"], "specific_errors": ["one error with correction"], "priority_improvement": "the most important thing to work on"}`;
        const result = await model.generateContent(prompt);
        const rawText = result.response.text().trim();

        const levelDataMatch = rawText.match(/LEVEL_DATA:\s*(\{[\s\S]+\})/);
        let levelData = { detectedLevel: 'B1', sublevel: 'mid', strengths: [], specific_errors: [], improvement: '' };
        let humanFeedback = rawText;

        if (levelDataMatch) {
          try {
            const parsed = JSON.parse(levelDataMatch[1]);
            levelData = {
              detectedLevel: parsed.level || 'B1',
              sublevel: parsed.sublevel || 'mid',
              strengths: parsed.strengths || [],
              specific_errors: parsed.specific_errors || [],
              improvement: parsed.priority_improvement || ''
            };
            humanFeedback = rawText.split('LEVEL_DATA:')[0].trim();
          } catch { /* keep defaults */ }
        }

        const updatedAnswers = [...currentAnswers, { ...baseAnswer, level: levelData.detectedLevel, writingEvaluation: levelData }];
        await pool.query(
          'UPDATE placement_tests SET answers = $1 WHERE id = $2',
          [JSON.stringify(updatedAnswers), req.params.testId]
        );

        return res.json({
          correct: true,
          feedback: humanFeedback,
          writingLevel: levelData.detectedLevel,
          writingData: levelData,
          correction: null, rule: null
        });
      } catch {
        return res.json({ correct: true, feedback: 'Your writing has been saved — good effort.', correction: null, rule: null });
      }
    }

    // ── spot_fake: special evaluation ────────────────────────────────────
    if (questionType === 'spot_fake') {
      const currentAnswers = testResult.rows[0].answers || [];
      let userFound = [];
      try { userFound = JSON.parse(answer); } catch { userFound = []; }
      const pseudoWords = questionData.pseudoWords || [];
      const correctFinds = userFound.filter(w => pseudoWords.includes(w));
      const wrongFinds = userFound.filter(w => !pseudoWords.includes(w));
      const isCorrect = correctFinds.length >= Math.ceil(pseudoWords.length / 2);
      const feedback = isCorrect ? 'Strong vocabulary intuition! You spotted most of the fake words.' : `You found ${correctFinds.length}/${pseudoWords.length} fake words. The fake words were: ${pseudoWords.join(', ')}.`;

      await pool.query(
        'UPDATE placement_tests SET answers = $1 WHERE id = $2',
        [JSON.stringify([...currentAnswers, { skill, level, questionType, answer, correct: isCorrect, questionId: questionData?.id, timestamp: new Date().toISOString() }]), req.params.testId]
      );
      return res.json({ correct: isCorrect, feedback, correction: isCorrect ? null : `The fake words: ${pseudoWords.join(', ')}`, rule: null });
    }

    // ── Direct-check types: mc, fill, sort, match, error ────────────────
    if (DIRECT_CHECK_TYPES.includes(questionType)) {
      const isCorrect = checkDirectAnswer(questionType, questionData, answer);
      const feedback = isCorrect ? 'Correct!' : `Not quite — the correct answer is "${questionData.correct}".`;
      const currentAnswers = testResult.rows[0].answers || [];
      await pool.query(
        'UPDATE placement_tests SET answers = $1 WHERE id = $2',
        [JSON.stringify([...currentAnswers, { skill, level, questionType, answer, correct: isCorrect, questionId: questionData?.id, timestamp: new Date().toISOString() }]), req.params.testId]
      );
      return res.json({ correct: isCorrect, feedback, correction: isCorrect ? null : questionData.correct, rule: null });
    }

    // ── Write/use-in-sentence: AI evaluation ────────────────────────────
    let prompt = '';

    if (questionType === 'write' || questionType === 'write_sentence' || questionType === 'use_in_sentence') {
      prompt = `You are an English teacher checking a student's sentence.

Task: "${questionData.instruction}"
${questionData.evaluationCriteria ? `What makes a good answer: ${questionData.evaluationCriteria}` : ''}

The student wrote: "${answer}"

Respond in 1-2 short sentences. If wrong, name the specific word that slipped. If right, say what they did well. Then on the very last line write either:
VERDICT: CORRECT
or
VERDICT: WRONG`;
    }

    let isCorrect = false;
    let feedback = '';
    let correction = null;

    try {
      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();

      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      const lastLine = lines[lines.length - 1];
      isCorrect = lastLine.toUpperCase().includes('VERDICT: CORRECT');

      const feedbackLines = lines.filter(l => !l.toUpperCase().startsWith('VERDICT:'));
      feedback = feedbackLines.join(' ').trim();

      if (!isCorrect) {
        correction = questionData.correct || questionData.evaluationCriteria || null;
      }
    } catch (err) {
      console.error('AI evaluation error:', err?.message || err);
      isCorrect = false;
      feedback = 'Could not evaluate — please try again.';
      correction = questionData.correct || null;
    }

    const currentAnswers = testResult.rows[0].answers || [];
    await pool.query(
      'UPDATE placement_tests SET answers = $1 WHERE id = $2',
      [JSON.stringify([...currentAnswers, { skill, level, questionType, answer: answer.substring(0, 300), correct: isCorrect, questionId: questionData?.id, timestamp: new Date().toISOString() }]), req.params.testId]
    );

    res.json({ correct: isCorrect, feedback, correction, rule: null });

  } catch (err) {
    console.error('Answer error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.post('/:testId/complete', authMiddleware, async (req, res) => {
  try {
    const testResult = await pool.query('SELECT * FROM placement_tests WHERE id = $1 AND user_id = $2', [req.params.testId, req.user.userId]);
    if (testResult.rows.length === 0) return res.status(404).json({ error: 'Test not found' });

    const answers = testResult.rows[0].answers || [];
    const results = {};
    const explanations = {};
    for (const skill of SKILL_ORDER) {
      const skillAnswers = answers.filter(a => a.skill === skill);
      let detectedLevel = 'A1';

      if (skill === 'writing') {
        const writingAnswer = skillAnswers.find(a => a.writingEvaluation);
        detectedLevel = writingAnswer?.writingEvaluation?.detectedLevel || writingAnswer?.level || 'A2';
      } else if (skillAnswers.length > 0) {
        detectedLevel = getFinalLevel(skillAnswers);
      }

      results[skill] = detectedLevel;

      const wrongAnswers = skillAnswers.filter(a => !a.correct);
      const prompt = `You are telling a friend their results from an English test — warmly, in plain everyday words.

Skill: ${skill}
Their level: ${detectedLevel}
Questions tried: ${skillAnswers.length}
Got wrong: ${wrongAnswers.length}

Write exactly 2 short sentences:
1. What this level means in real life — a concrete everyday example (what they can do / struggle with). No CEFR codes, no "upper-intermediate" jargon.
2. The ONE specific thing that will help them most right now. Name the exact thing, not a general category.

Write at a level this person can understand. Warm, direct, human. No bullet points. No formulas.`;

      try {
        const r = await model.generateContent(prompt);
        explanations[skill] = r.response.text().trim();
      } catch { explanations[skill] = `Your ${skill} level is ${detectedLevel}.`; }

      await pool.query(
        `INSERT INTO user_skill_levels (user_id, skill, cefr_level) VALUES ($1, $2, $3) ON CONFLICT (user_id, skill) DO UPDATE SET cefr_level = $3, last_updated = NOW()`,
        [req.user.userId, skill, detectedLevel]
      );
    }

    const retakeDate = new Date();
    retakeDate.setDate(retakeDate.getDate() + 30);
    await pool.query(
      `UPDATE placement_tests SET status = 'completed', results = $1, completed_at = NOW(), retake_eligible_at = $2 WHERE id = $3`,
      [JSON.stringify({ levels: results, explanations }), retakeDate, req.params.testId]
    );

    res.json({ results, explanations });
  } catch (err) { console.error('Complete test error:', err); res.status(500).json({ error: 'Something went wrong.' }); }
});

module.exports = router;
