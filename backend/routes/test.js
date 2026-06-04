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

// ─────────────────────────────────────────────
// QUESTION BANK
// ─────────────────────────────────────────────
const QUESTION_BANK = {

  grammar: {
    A1: [
      {
        id: 'g-a1-1', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'She don\'t like coffee in the morning.',
        correct: 'She doesn\'t like coffee in the morning.',
        rule: 'With he / she / it we use "doesn\'t" — not "don\'t".',
        hint: 'Look at the subject. Is it I, you, we, they — or he/she/it?'
      },
      {
        id: 'g-a1-2', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'He have a very big house near the park.',
        correct: 'He has a very big house near the park.',
        rule: 'He / She / It uses "has" — not "have".',
        hint: 'Think about the subject "He" — which form of "have" is correct?'
      },
      {
        id: 'g-a1-3', type: 'fill_blank',
        instruction: 'Choose the correct word to complete the sentence.',
        text: 'I ___ a student at this school.',
        options: ['am', 'is', 'are'], correct: 'am',
        rule: 'I + am. You/We/They + are. He/She/It + is.',
        hint: 'The subject is "I". Which form of "to be" goes with "I"?'
      },
      {
        id: 'g-a1-4', type: 'fill_blank',
        instruction: 'Choose the correct word to complete the sentence.',
        text: 'They ___ my best friends since school.',
        options: ['am', 'is', 'are'], correct: 'are',
        rule: 'They + are.',
        hint: 'The subject is "They". Which form of "to be" matches?'
      },
      {
        id: 'g-a1-5', type: 'write_sentence',
        instruction: 'Write ONE sentence using "I have" to describe something you own or a person in your family.',
        evaluationCriteria: 'correct use of "I have" as the main verb, followed by a noun, makes sense as a sentence',
        hint: ''
      },
      {
        id: 'g-a1-6', type: 'fill_blank',
        instruction: 'Choose the correct word.',
        text: 'My sister ___ a doctor. She works at the hospital.',
        options: ['am', 'is', 'are'], correct: 'is',
        rule: 'My sister = she → use "is".',
        hint: '"My sister" means she — one person who is not you.'
      }
    ],

    A2: [
      {
        id: 'g-a2-1', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'Yesterday I go to the market with my mother.',
        correct: 'Yesterday I went to the market with my mother.',
        rule: '"Yesterday" tells us this happened in the past. Use past simple: go → went.',
        hint: 'The word "Yesterday" is a past time marker. Which tense do we use?'
      },
      {
        id: 'g-a2-2', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'She is very more tall than her brother.',
        correct: 'She is much taller than her brother.',
        rule: 'Short adjectives: add -er (tall → taller). Use "much" not "very more".',
        hint: 'We say "taller" not "more tall". And we use "much" before comparatives, not "very more".'
      },
      {
        id: 'g-a2-3', type: 'fill_blank',
        instruction: 'Choose the correct word.',
        text: 'I ___ to Paris last summer and it was incredible.',
        options: ['go', 'went', 'have gone'], correct: 'went',
        rule: '"Last summer" is a specific time in the past → use past simple.',
        hint: '"Last summer" tells you exactly when. Which tense is for specific past times?'
      },
      {
        id: 'g-a2-4', type: 'fill_blank',
        instruction: 'Choose the correct word.',
        text: 'She ___ studying when I called her.',
        options: ['is', 'was', 'were'], correct: 'was',
        rule: 'Past continuous (was/were + -ing) describes an action in progress in the past.',
        hint: 'This happened in the past and was in progress when I called. Which past form of "be" matches "she"?'
      },
      {
        id: 'g-a2-5', type: 'write_sentence',
        instruction: 'Write ONE sentence about something you did last week. The sentence must use a past simple verb.',
        evaluationCriteria: 'past simple verb correctly formed (regular -ed or irregular), sentence describes a past action',
        hint: ''
      },
      {
        id: 'g-a2-6', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'I buyed a new phone last month. It is very fast.',
        correct: 'I bought a new phone last month. It is very fast.',
        rule: '"Buy" is irregular in the past: buy → bought.',
        hint: 'Some past simple verbs are irregular. "Buy" does not become "buyed".'
      }
    ],

    B1: [
      {
        id: 'g-b1-1', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'I have seen that film last night. It was brilliant.',
        correct: 'I saw that film last night. It was brilliant.',
        rule: '"Last night" is a specific past time → use past simple, not present perfect.',
        hint: 'Present perfect cannot be used with specific past times like "last night", "yesterday", "in 2020".'
      },
      {
        id: 'g-b1-2', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'If I will have more money, I will travel the world.',
        correct: 'If I have more money, I will travel the world.',
        rule: 'First conditional: If + present simple (NOT future), will + infinitive.',
        hint: 'In the "if" part of a first conditional, we do NOT use "will". We use present simple.'
      },
      {
        id: 'g-b1-3', type: 'fill_blank',
        instruction: 'Choose the correct word.',
        text: 'If I ___ more time, I would definitely travel more.',
        options: ['had', 'have', 'will have'], correct: 'had',
        rule: 'Second conditional (imaginary): If + past simple, would + infinitive.',
        hint: 'This is imaginary — you don\'t have time. Use past simple in the "if" part.'
      },
      {
        id: 'g-b1-4', type: 'fill_blank',
        instruction: 'Choose the correct word.',
        text: 'She ___ lived in this city since she was born.',
        options: ['has', 'have', 'had'], correct: 'has',
        rule: 'Present perfect + "since" → has/have + past participle.',
        hint: '"Since she was born" connects the past to now. Which tense connects past to now?'
      },
      {
        id: 'g-b1-5', type: 'write_sentence',
        instruction: 'Write ONE sentence using "have" or "has" + a past participle verb to describe an experience in your life. For example: visited, tried, lived, worked, seen.',
        evaluationCriteria: 'present perfect structure: have/has + past participle, describes a life experience, past participle is correctly formed',
        hint: ''
      },
      {
        id: 'g-b1-6', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'The book was wrote by a famous French author in 1985.',
        correct: 'The book was written by a famous French author in 1985.',
        rule: 'Passive voice: was/were + past participle. "Write" → past participle is "written", not "wrote".',
        hint: '"Wrote" is past simple. The passive needs the past participle — which is different for irregular verbs.'
      }
    ],

    B2: [
      {
        id: 'g-b2-1', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'The deadline must be submitted until Friday without exception.',
        correct: 'The deadline must be met by Friday without exception.',
        rule: '"By" means "no later than". "Until" means "continuously up to that point". Use "by" for deadlines.',
        hint: 'Deadlines use "by" — e.g. "submit by Friday". "Until Friday" would mean you do it continuously until Friday.'
      },
      {
        id: 'g-b2-2', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'Despite of the heavy rain, the match continued.',
        correct: 'Despite the heavy rain, the match continued.',
        rule: '"Despite" is never followed by "of". "Despite + noun" or "In spite of + noun".',
        hint: 'Compare: "Despite the rain" (correct) vs "In spite of the rain" (also correct). Never "Despite of".'
      },
      {
        id: 'g-b2-3', type: 'fill_blank',
        instruction: 'Choose the correct modal verb.',
        text: 'She ___ have taken the promotion — she seems so much happier now.',
        options: ['must', 'should', 'could'], correct: 'must',
        rule: '"Must have" = logical deduction about the past (we are almost certain it happened).',
        hint: 'We\'re not guessing — the evidence (she seems happier) makes us almost certain. Which modal expresses certainty?'
      },
      {
        id: 'g-b2-4', type: 'fill_blank',
        instruction: 'Choose the correct form.',
        text: 'By the time we arrived at the cinema, the film ___ already started.',
        options: ['has', 'had', 'was'], correct: 'had',
        rule: 'Past perfect (had + past participle) for an action completed before another past action.',
        hint: 'Two past events: we arrived (past), the film started (even earlier). The earlier event uses past perfect.'
      },
      {
        id: 'g-b2-5', type: 'write_sentence',
        instruction: 'Write ONE sentence using this exact structure: "If I had [verb]..." to describe something that did not happen and what would have been different. Example structure only — write your own sentence.',
        evaluationCriteria: 'if + past perfect (had + past participle) in first clause, would have + past participle in second clause',
        hint: ''
      },
      {
        id: 'g-b2-6', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'She wishes she would study medicine instead of law.',
        correct: 'She wishes she had studied medicine instead of law.',
        rule: 'Wish + past perfect expresses regret about the past. "Would" cannot follow "wish" about the past.',
        hint: 'This is a regret about the past — she studied law and now regrets it. Which form follows "wish" for past regrets?'
      }
    ],

    C1: [
      {
        id: 'g-c1-1', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'The committee recommended that the funding is distributed equally among all departments.',
        correct: 'The committee recommended that the funding be distributed equally among all departments.',
        rule: 'Subjunctive: after verbs like "recommend", "suggest", "insist", "require" — use bare infinitive (no -s, no "is/was").',
        hint: 'After "recommended that", the subjunctive uses the base form of the verb. Not "is" — just "be".'
      },
      {
        id: 'g-c1-2', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'No sooner she had sat down than the phone rang.',
        correct: 'No sooner had she sat down than the phone rang.',
        rule: '"No sooner...than" requires inverted word order: No sooner + had/did + subject + verb.',
        hint: 'After "No sooner", the auxiliary comes BEFORE the subject, like a question structure.'
      },
      {
        id: 'g-c1-3', type: 'fill_blank',
        instruction: 'Choose the correct form.',
        text: 'It is essential that every student ___ the form before the deadline.',
        options: ['submits', 'submit', 'submitted'], correct: 'submit',
        rule: 'Subjunctive after expressions of necessity (it is essential/vital/important that): use bare infinitive.',
        hint: 'After "it is essential that", we use the bare infinitive — no -s even for he/she/it.'
      },
      {
        id: 'g-c1-4', type: 'fill_blank',
        instruction: 'Choose the correct word for this inverted conditional.',
        text: '___ I known about the problem earlier, I could have prevented it.',
        options: ['Had', 'If', 'Should'], correct: 'Had',
        rule: 'Inverted third conditional: Had + subject + past participle (drops "If", inverts auxiliary).',
        hint: 'This is a formal alternative to "If I had known..." — the auxiliary "had" moves to the front.'
      },
      {
        id: 'g-c1-5', type: 'write_sentence',
        instruction: 'Rewrite this sentence so that "the new policy" is the subject. Keep the same meaning and tense. Original: "The government will announce the new policy tomorrow."',
        evaluationCriteria: 'the new policy becomes the subject, will be + announced (future passive), grammatically correct',
        hint: ''
      },
      {
        id: 'g-c1-6', type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'The suspect was said to have being involved in the incident.',
        correct: 'The suspect was said to have been involved in the incident.',
        rule: '"To have been" — not "to have being". After "to have", use past participle: be → been.',
        hint: '"Been" is the past participle of "be". "Being" is the present participle — wrong here.'
      }
    ]
  },

  vocabulary: {
    A1: [
      {
        id: 'v-a1-1', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'hungry',
        acceptableAnswers: ['want to eat', 'need food', 'need to eat', 'empty stomach', 'feeling of needing food'],
        hint: 'Think about how you feel when you have not eaten for several hours.'
      },
      {
        id: 'v-a1-2', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'angry',
        acceptableAnswers: ['very unhappy with someone', 'mad', 'feeling strong displeasure', 'upset and wanting to shout', 'furious'],
        hint: 'Think about how you feel when someone does something unfair to you.'
      },
      {
        id: 'v-a1-3', type: 'choose_correct',
        instruction: 'Choose the correct word to complete the sentence.',
        text: 'I ___ a big mistake on my exam and I failed.',
        options: ['made', 'did', 'had'], correct: 'made',
        hint: 'In English we say "make a mistake" — not "do a mistake".'
      },
      {
        id: 'v-a1-4', type: 'choose_correct',
        instruction: 'Choose the correct word.',
        text: 'I ___ a shower every morning before school.',
        options: ['make', 'take', 'do'], correct: 'take',
        hint: 'In English we "take" a shower or a bath — not "make" or "do".'
      },
      {
        id: 'v-a1-5', type: 'use_in_sentence',
        instruction: 'Write ONE sentence that shows you know what this word means. Use the word naturally — not just "I know the word happy."',
        word: 'happy',
        evaluationCriteria: 'the word happy is used correctly in context, the sentence shows understanding of its meaning as a positive emotion',
        hint: ''
      }
    ],

    A2: [
      {
        id: 'v-a2-1', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'exhausted',
        acceptableAnswers: ['very tired', 'extremely tired', 'very sleepy', 'no energy at all', 'completely tired'],
        hint: 'This word means more than just "tired" — it is an extreme level of tiredness.'
      },
      {
        id: 'v-a2-2', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'nervous',
        acceptableAnswers: ['worried', 'anxious', 'scared about something', 'feeling worry before an event', 'not calm', 'afraid'],
        hint: 'How do you feel before an important exam or a job interview?'
      },
      {
        id: 'v-a2-3', type: 'choose_correct',
        instruction: 'Choose the correct word.',
        text: 'Can you ___ me a favour? I need help moving this table.',
        options: ['make', 'do', 'give'], correct: 'do',
        hint: 'In English we "do" a favour — not "make" or "give" a favour.'
      },
      {
        id: 'v-a2-4', type: 'choose_correct',
        instruction: 'Choose the word that fits the sentence.',
        text: 'The weather was so ___. We could not see more than ten metres ahead.',
        options: ['misty', 'sunny', 'breezy', 'warm'], correct: 'misty',
        hint: 'Which word describes weather with very low visibility — where fog or mist makes it hard to see?'
      },
      {
        id: 'v-a2-5', type: 'use_in_sentence',
        instruction: 'Write ONE sentence using this word at the START of the sentence to introduce some bad news or a disappointing result.',
        word: 'unfortunately',
        evaluationCriteria: 'unfortunately used as a sentence adverb introducing a negative or disappointing outcome, grammatically correct sentence follows',
        hint: ''
      }
    ],

    B1: [
      {
        id: 'v-b1-1', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'reluctant',
        acceptableAnswers: ['not wanting to do something', 'unwilling', 'hesitant', 'not eager', 'doing something against your wish'],
        hint: 'If you are reluctant to do something, how do you feel about doing it?'
      },
      {
        id: 'v-b1-2', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'significant',
        acceptableAnswers: ['important', 'meaning a lot', 'worth noticing', 'large or noticeable', 'having real meaning or effect'],
        hint: 'A "significant" change is not a tiny one — how would you describe its importance?'
      },
      {
        id: 'v-b1-3', type: 'choose_correct',
        instruction: 'Choose the correct word.',
        text: 'The new prime minister ___ a speech that was broadcast live across the country.',
        options: ['made', 'gave', 'said', 'told'], correct: 'gave',
        hint: 'In English we "give" a speech — not "make", "say" or "tell".'
      },
      {
        id: 'v-b1-4', type: 'use_in_sentence',
        instruction: 'Write ONE sentence where something happens BECAUSE of something else. Use this word to connect the cause and the result.',
        word: 'consequently',
        evaluationCriteria: 'consequently used correctly as a cause-effect connector, the sentence has a clear cause and a clear result',
        hint: ''
      },
      {
        id: 'v-b1-5', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'flexible',
        acceptableAnswers: ['able to change', 'not rigid', 'able to adapt', 'open to different situations', 'willing to adjust'],
        hint: 'If your schedule is "flexible", can it be changed easily or is it completely fixed?'
      }
    ],

    B2: [
      {
        id: 'v-b2-1', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'ambiguous',
        acceptableAnswers: ['unclear', 'can mean two things', 'open to different interpretations', 'not clear', 'having more than one meaning'],
        hint: 'If a statement is "ambiguous", can one person understand it differently from another?'
      },
      {
        id: 'v-b2-2', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'inevitable',
        acceptableAnswers: ['certain to happen', 'cannot be avoided', 'sure to occur', 'impossible to prevent'],
        hint: 'If something is "inevitable", can anything stop it from happening?'
      },
      {
        id: 'v-b2-3', type: 'use_in_sentence',
        instruction: 'Write ONE sentence where you describe something positively, but immediately add a small contrast or qualification using this word.',
        word: 'albeit',
        evaluationCriteria: 'albeit used as a concessive connector (meaning "although" or "even though"), placed before an adjective, adverb, or noun phrase that contrasts with the main statement',
        hint: ''
      },
      {
        id: 'v-b2-4', type: 'choose_correct',
        instruction: 'Choose the correct word.',
        text: 'The new law came ___ effect on the first of January.',
        options: ['into', 'in', 'to', 'onto'], correct: 'into',
        hint: 'The fixed phrase is "come into effect" — meaning a law or rule starts to apply.'
      },
      {
        id: 'v-b2-5', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'arbitrary',
        acceptableAnswers: ['random', 'with no clear reason', 'not based on logic', 'chosen without a real system', 'without fair reasoning'],
        hint: 'If a decision is "arbitrary", was it based on careful reasoning or just made randomly?'
      }
    ],

    C1: [
      {
        id: 'v-c1-1', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'mitigate',
        acceptableAnswers: ['reduce the severity of', 'make less bad', 'lessen the impact of', 'reduce harm', 'minimise the effect'],
        hint: 'If you "mitigate" a problem, do you make it worse or less serious?'
      },
      {
        id: 'v-c1-2', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'sycophantic',
        acceptableAnswers: ['excessively flattering', 'insincere praise', 'telling powerful people what they want to hear', 'fake compliments to gain favour', 'servile praise'],
        hint: 'Think of someone who constantly praises their boss, not because they mean it, but to get benefits.'
      },
      {
        id: 'v-c1-3', type: 'use_in_sentence',
        instruction: 'Write ONE sentence where something makes a problem or bad situation WORSE. Use this word as the main verb.',
        word: 'exacerbate',
        evaluationCriteria: 'exacerbate used as a verb meaning to make something worse, applied to a problem, condition, or negative situation',
        hint: ''
      },
      {
        id: 'v-c1-4', type: 'choose_correct',
        instruction: 'Choose the word that best fits the formal context.',
        text: 'The politician\'s address was full of ___; she made grand claims but offered nothing concrete.',
        options: ['platitudes', 'attitudes', 'magnitudes', 'latitudes'], correct: 'platitudes',
        hint: '"Platitudes" are empty, overused statements that sound meaningful but say nothing real.'
      },
      {
        id: 'v-c1-5', type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'equivocal',
        acceptableAnswers: ['deliberately unclear', 'ambiguous on purpose', 'avoiding a clear answer', 'can be understood in different ways', 'intentionally vague'],
        hint: 'An "equivocal" answer is one that a politician might give — it sounds like an answer but actually isn\'t clear.'
      }
    ]
  },

  reading: {
    A1: [
      {
        id: 'r-a1-1', type: 'read_comprehension',
        instruction: 'Read this text carefully, then answer the question.',
        text: 'Tom has a dog called Max. Max is brown and very big. Tom walks Max every morning before breakfast. They go to the park near their house. Max loves to run and play. Tom loves Max very much.',
        question: 'What does Tom do every morning before breakfast?',
        correct: 'He walks his dog Max / takes Max to the park',
        inferenceLevel: 'literal',
        hint: 'Look for what Tom does "every morning before breakfast".'
      },
      {
        id: 'r-a1-2', type: 'read_comprehension',
        instruction: 'Read this text carefully, then answer the question.',
        text: 'Tom has a dog called Max. Max is brown and very big. Tom walks Max every morning before breakfast. They go to the park near their house. Max loves to run and play. Tom loves Max very much.',
        question: 'What colour is Max?',
        correct: 'brown',
        inferenceLevel: 'literal',
        hint: 'The answer is directly in the text.'
      }
    ],

    A2: [
      {
        id: 'r-a2-1', type: 'read_comprehension',
        instruction: 'Read this text, then answer the question.',
        text: 'Maria moved to London three years ago to find work. At first, she found the city too busy and the weather too cold. She felt lonely because she did not know anyone. But slowly, things changed. She found a job as a nurse, made good friends, and discovered London\'s restaurants and museums. Now she cannot imagine living anywhere else.',
        question: 'Why did Maria move to London?',
        correct: 'To find work',
        inferenceLevel: 'literal',
        hint: 'The reason for her move is stated directly.'
      },
      {
        id: 'r-a2-2', type: 'read_comprehension',
        instruction: 'Read the same text again, then answer this question.',
        text: 'Maria moved to London three years ago to find work. At first, she found the city too busy and the weather too cold. She felt lonely because she did not know anyone. But slowly, things changed. She found a job as a nurse, made good friends, and discovered London\'s restaurants and museums. Now she cannot imagine living anywhere else.',
        question: 'How did Maria\'s feelings about London change from the beginning to now?',
        correct: 'She went from feeling lonely and unhappy to loving it and not wanting to leave',
        inferenceLevel: 'simple_inference',
        hint: 'Compare how she felt at first with how she feels now.'
      }
    ],

    B1: [
      {
        id: 'r-b1-1', type: 'read_comprehension',
        instruction: 'Read this text carefully, then answer the question.',
        text: 'Despite widespread concern about plastic pollution, global plastic production has continued to rise every year for the past decade. Critics argue that recycling campaigns give consumers a false sense that the problem is being managed. In reality, less than ten percent of all plastic ever produced has actually been recycled. Most ends up in landfill, or worse, in the ocean. Some scientists are now calling for a complete rethink of packaging design — moving away from single-use materials entirely rather than simply asking people to sort their bins more carefully.',
        question: 'What do critics say about recycling campaigns?',
        correct: 'They give people a false impression that the problem is under control / being managed',
        inferenceLevel: 'inference',
        hint: 'Look for what critics "argue" — their concern is that recycling campaigns are misleading.'
      },
      {
        id: 'r-b1-2', type: 'read_comprehension',
        instruction: 'Read the same text again, then answer this question.',
        text: 'Despite widespread concern about plastic pollution, global plastic production has continued to rise every year for the past decade. Critics argue that recycling campaigns give consumers a false sense that the problem is being managed. In reality, less than ten percent of all plastic ever produced has actually been recycled. Most ends up in landfill, or worse, in the ocean. Some scientists are now calling for a complete rethink of packaging design — moving away from single-use materials entirely rather than simply asking people to sort their bins more carefully.',
        question: 'What does the phrase "sort their bins more carefully" suggest about the author\'s view of recycling?',
        correct: 'Recycling alone is too simple / insufficient — the problem needs more radical solutions',
        inferenceLevel: 'inference',
        hint: 'The author uses this phrase to contrast with a "complete rethink". What does that contrast imply?'
      }
    ],

    B2: [
      {
        id: 'r-b2-1', type: 'read_comprehension',
        instruction: 'Read this text carefully, then answer the question.',
        text: 'The paradox at the heart of social media is this: platforms designed to connect people appear, in many cases, to be making them feel more isolated. Longitudinal studies suggest a correlation between heavy social media use and increased rates of anxiety and depression, particularly among adolescents. Yet the relationship is not straightforward. Some researchers argue that social media merely amplifies pre-existing conditions rather than creating them. Others point to the deliberately addictive design of these platforms — infinite scroll, variable reward mechanisms — as an engineered source of psychological dependency. The question is no longer whether these platforms affect mental health, but whether society has the regulatory will to act.',
        question: 'What is "the paradox" the author describes in the opening sentence?',
        correct: 'Platforms created to connect people are actually making people feel more isolated and lonely',
        inferenceLevel: 'analysis',
        hint: 'A paradox is a contradiction. What two things contradict each other in the first sentence?'
      },
      {
        id: 'r-b2-2', type: 'read_comprehension',
        instruction: 'Read the same text again, then answer this question.',
        text: 'The paradox at the heart of social media is this: platforms designed to connect people appear, in many cases, to be making them feel more isolated. Longitudinal studies suggest a correlation between heavy social media use and increased rates of anxiety and depression, particularly among adolescents. Yet the relationship is not straightforward. Some researchers argue that social media merely amplifies pre-existing conditions rather than creating them. Others point to the deliberately addictive design of these platforms — infinite scroll, variable reward mechanisms — as an engineered source of psychological dependency. The question is no longer whether these platforms affect mental health, but whether society has the regulatory will to act.',
        question: 'What does the final sentence imply about the author\'s view of the situation?',
        correct: 'The author believes the harm is proven, but doubts governments/regulators will take meaningful action',
        inferenceLevel: 'critical',
        hint: 'The phrase "regulatory will" implies doubt about whether action will be taken. What does this tell us about the author\'s tone?'
      }
    ],

    C1: [
      {
        id: 'r-c1-1', type: 'read_comprehension',
        instruction: 'Read this text carefully, then answer the question.',
        text: 'Proponents of universal basic income often cite automation-driven unemployment as their central justification. Yet this framing contains an uncomfortable assumption: that technological displacement of labour is a novel threat rather than a recurring feature of economic development that markets have historically absorbed. The weavers displaced by the Industrial Revolution did not permanently swell the ranks of the unemployed; they, or their children, found work in industries that did not yet exist. Whether the same will prove true in an era of artificial intelligence remains genuinely uncertain — but certainty of catastrophe is no more defensible than complacency.',
        question: 'What assumption does the author identify in the pro-UBI argument?',
        correct: 'That automation-caused unemployment is new / unprecedented, when historically economies have always adapted to technological change',
        inferenceLevel: 'critical',
        hint: 'The author says the argument contains "an uncomfortable assumption". What exactly is that assumption?'
      },
      {
        id: 'r-c1-2', type: 'read_comprehension',
        instruction: 'Read the same text again, then answer this question.',
        text: 'Proponents of universal basic income often cite automation-driven unemployment as their central justification. Yet this framing contains an uncomfortable assumption: that technological displacement of labour is a novel threat rather than a recurring feature of economic development that markets have historically absorbed. The weavers displaced by the Industrial Revolution did not permanently swell the ranks of the unemployed; they, or their children, found work in industries that did not yet exist. Whether the same will prove true in an era of artificial intelligence remains genuinely uncertain — but certainty of catastrophe is no more defensible than complacency.',
        question: 'The author says "certainty of catastrophe is no more defensible than complacency." What does this sentence tell us about the author\'s overall position?',
        correct: 'The author is balanced / agnostic — they reject both extreme pessimism and complacency, accepting genuine uncertainty',
        inferenceLevel: 'critical',
        hint: 'The author rejects two opposite positions. What are those two positions, and where does the author stand?'
      }
    ]
  },

  writing: {
    universal: {
      id: 'w-universal',
      type: 'free_write',
      instruction: 'Think of an important decision you made in your life. It can be a small or a big decision. Write between 80 and 150 words. Include: what the decision was, why you made it, and what happened as a result.',
      minWords: 60,
      maxWords: 180,
      evaluationPrompt: `You are a real English teacher reading a student's writing. Read it the way a real person would — not like a machine.

The student was asked: "Think of an important decision you made in your life. What was it, why did you make it, and what happened?"

They wrote:
"{writing}"

Read it carefully. Think about:
- How well do they express ideas? Can you understand them easily?
- What grammar patterns do they use? What slips up?
- How wide is their vocabulary — basic everyday words only, or do they reach for more?
- Do their sentences connect smoothly or feel choppy and disconnected?
- Did they actually answer all three parts of the question?

Now assign a level. Be honest — not too generous, not too harsh:
- A1: barely connected sentences, many basic errors, very limited words
- A2: simple sentences that connect, some errors, everyday vocabulary only
- B1: clear writing with some errors, decent vocabulary, some varied sentences
- B2: good writing, occasional errors, solid vocabulary range, well organised
- C1: sophisticated writing, rare errors, precise vocabulary, complex ideas expressed naturally
- C2: near-native, exceptional precision, everything flows

Write your response like a real teacher talking to a student — warm, honest, specific. Two or three sentences. Name something specific they did well and one specific thing to work on. No grammar codes, no formulas, no bullet points.

Then on the very last lines add the JSON data (this is just for the app to read — the student sees your written feedback):
LEVEL_DATA: {"level": "B1", "sublevel": "mid", "evidence": "your feedback text here", "strengths": ["one specific strength"], "specific_errors": ["one specific error with correction"], "priority_improvement": "the one most important thing to work on"}`
    }
  },

  dialogue: {
    A1: [
      {
        id: 'd-a1-1', type: 'dialogue_comprehension',
        instruction: 'Read this conversation, then answer the question.',
        text: 'Lucy: Hi! Are you new here?\nJames: Yes, I started today. My name is James.\nLucy: Nice to meet you, James. I am Lucy. Do you need help?\nJames: Yes, please. Where is the bathroom?\nLucy: It is on the second floor, next to the stairs.',
        question: 'Where is the bathroom?',
        correct: 'On the second floor / next to the stairs',
        hint: 'Lucy gives James the answer directly.'
      },
      {
        id: 'd-a1-2', type: 'dialogue_comprehension',
        instruction: 'Read the same conversation again.',
        text: 'Lucy: Hi! Are you new here?\nJames: Yes, I started today. My name is James.\nLucy: Nice to meet you, James. I am Lucy. Do you need help?\nJames: Yes, please. Where is the bathroom?\nLucy: It is on the second floor, next to the stairs.',
        question: 'Why does James need help?',
        correct: 'He is new and does not know where things are / he needs to find the bathroom',
        hint: 'What does James say when Lucy asks if he needs help?'
      }
    ],

    A2: [
      {
        id: 'd-a2-1', type: 'dialogue_comprehension',
        instruction: 'Read this conversation, then answer the question.',
        text: 'Customer: Excuse me. I bought this jacket last week but the zip is broken.\nShop assistant: I\'m sorry to hear that. Do you have your receipt?\nCustomer: Yes, here it is.\nShop assistant: Thank you. Would you like to exchange it or get a refund?\nCustomer: I would prefer an exchange, please.\nShop assistant: Of course. Let me find the same jacket in your size.',
        question: 'What is the problem with the jacket?',
        correct: 'The zip is broken',
        hint: 'The customer explains the problem in the first line.'
      },
      {
        id: 'd-a2-2', type: 'dialogue_comprehension',
        instruction: 'Read the same conversation again.',
        text: 'Customer: Excuse me. I bought this jacket last week but the zip is broken.\nShop assistant: I\'m sorry to hear that. Do you have your receipt?\nCustomer: Yes, here it is.\nShop assistant: Thank you. Would you like to exchange it or get a refund?\nCustomer: I would prefer an exchange, please.\nShop assistant: Of course. Let me find the same jacket in your size.',
        question: 'What does the customer decide to do?',
        correct: 'Exchange the jacket / get a new one in the same style',
        hint: 'The shop assistant offers two options. Which does the customer choose?'
      }
    ],

    B1: [
      {
        id: 'd-b1-1', type: 'dialogue_comprehension',
        instruction: 'Read this conversation, then answer the question.',
        text: 'Manager: I noticed you have been late three times this week.\nEmployee: I know, I apologise. The bus has been delayed because of the roadworks near the station.\nManager: I understand, but it is affecting your team. Can we find a solution?\nEmployee: I could work from home on Mondays and Fridays when the traffic is worst.\nManager: That sounds reasonable. Let\'s try it for a month and see how it goes.',
        question: 'Why has the employee been late?',
        correct: 'Roadworks near the station are causing bus delays',
        hint: 'The employee explains the reason in their first response.'
      },
      {
        id: 'd-b1-2', type: 'dialogue_comprehension',
        instruction: 'Read the same conversation again.',
        text: 'Manager: I noticed you have been late three times this week.\nEmployee: I know, I apologise. The bus has been delayed because of the roadworks near the station.\nManager: I understand, but it is affecting your team. Can we find a solution?\nEmployee: I could work from home on Mondays and Fridays when the traffic is worst.\nManager: That sounds reasonable. Let\'s try it for a month and see how it goes.',
        question: 'What does the manager\'s response tell us about their management style?',
        correct: 'They are flexible and solution-focused rather than punishing / they listen and try to find practical answers',
        hint: 'Look at how the manager responds to the employee\'s suggestion. Are they strict or understanding?'
      }
    ],

    B2: [
      {
        id: 'd-b2-1', type: 'dialogue_comprehension',
        instruction: 'Read this conversation, then answer the question.',
        text: 'Interviewer: Your CV shows three years at Deloitte, but you left without another role lined up. Can you explain that?\nCandidate: I wanted to reflect on my direction. I completed a part-time analytics course and volunteered with a local charity.\nInterviewer: That sounds constructive. What drew you specifically to this role?\nCandidate: Your company\'s work on ethical AI aligns with research I have been doing independently.\nInterviewer: When you say independently, do you mean in your own time?\nCandidate: Yes — reading widely, attending conferences, building small projects.',
        question: 'What two things did the candidate do during their career gap?',
        correct: 'Completed a part-time analytics course AND volunteered with a local charity',
        hint: 'The candidate lists both activities in their first response.'
      },
      {
        id: 'd-b2-2', type: 'dialogue_comprehension',
        instruction: 'Read the same conversation again.',
        text: 'Interviewer: Your CV shows three years at Deloitte, but you left without another role lined up. Can you explain that?\nCandidate: I wanted to reflect on my direction. I completed a part-time analytics course and volunteered with a local charity.\nInterviewer: That sounds constructive. What drew you specifically to this role?\nCandidate: Your company\'s work on ethical AI aligns with research I have been doing independently.\nInterviewer: When you say independently, do you mean in your own time?\nCandidate: Yes — reading widely, attending conferences, building small projects.',
        question: 'Why does the interviewer ask "When you say independently, do you mean in your own time?" What does this question reveal?',
        correct: 'The interviewer wants to clarify whether the candidate is being vague or precise — they are checking whether "independently" means formally/professionally or just privately',
        hint: 'The interviewer is not sure exactly what "independently" means. What might they be checking or questioning?'
      }
    ],

    C1: [
      {
        id: 'd-c1-1', type: 'dialogue_comprehension',
        instruction: 'Read this conversation, then answer the question.',
        text: 'Journalist: Your housing policy promises 50,000 new homes by 2027. The previous target of 40,000 by 2025 was missed by over 60%. Why should the public believe this commitment is different?\nMinister: We have learned from past mistakes. Our planning reforms will cut approval times significantly.\nJournalist: Those reforms were blocked in committee last year by your own party. Have you actually secured the votes?\nMinister: We are confident we have the support we need.\nJournalist: Confident, or certain?\nMinister: These things are never certain in politics.',
        question: 'What technique does the journalist use in their opening question, and what is its purpose?',
        correct: 'The journalist uses a confrontational technique — citing specific evidence (the missed target and percentage) to challenge the minister\'s credibility and make it hard for them to avoid the question',
        hint: 'Notice the journalist does not just ask "do you believe this target?" — they use specific numbers. Why?'
      },
      {
        id: 'd-c1-2', type: 'dialogue_comprehension',
        instruction: 'Read the same conversation again.',
        text: 'Journalist: Your housing policy promises 50,000 new homes by 2027. The previous target of 40,000 by 2025 was missed by over 60%. Why should the public believe this commitment is different?\nMinister: We have learned from past mistakes. Our planning reforms will cut approval times significantly.\nJournalist: Those reforms were blocked in committee last year by your own party. Have you actually secured the votes?\nMinister: We are confident we have the support we need.\nJournalist: Confident, or certain?\nMinister: These things are never certain in politics.',
        question: 'What does the minister\'s final answer reveal about their actual position?',
        correct: 'They do not have guaranteed support — "confident" was an overstatement, and the journalist forced them to admit they cannot guarantee the votes',
        hint: 'Compare what the minister says at the end with what they said just before. Did the journalist successfully reveal something?'
      }
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

  // Climbing phase (A1, A2): 1 question, go up if correct
  if (levelIndex <= 1) {
    if (atCurrentLevel.length === 0) return { action: 'continue', level: currentLevel };
    const lastAnswer = atCurrentLevel[atCurrentLevel.length - 1];
    if (lastAnswer.correct) {
      if (levelIndex < CEFR_LEVELS.length - 1) return { action: 'up', level: CEFR_LEVELS[levelIndex + 1] };
      return { action: 'confirm', level: currentLevel };
    }
    // Wrong at climb level — confirm one level down
    if (levelIndex === 0) return { action: 'confirm', level: 'A1' };
    return { action: 'down', level: CEFR_LEVELS[levelIndex - 1] };
  }

  // Confirmation phase (B1+): 3 questions to confirm
  if (atCurrentLevel.length < 3) return { action: 'continue', level: currentLevel };

  const last3 = atCurrentLevel.slice(-3);
  const correctCount = last3.filter(a => a.correct).length;

  if (correctCount >= 2) {
    // Passed — go up
    if (levelIndex < CEFR_LEVELS.length - 1) return { action: 'up', level: CEFR_LEVELS[levelIndex + 1] };
    return { action: 'confirm', level: currentLevel };
  }

  // Failed — this is their ceiling
  return { action: 'confirm', level: currentLevel };
}

function isSkillConfirmed(skillAnswers, currentLevel) {
  const atLevel = skillAnswers.filter(a => a.level === currentLevel);
  const levelIndex = CEFR_LEVELS.indexOf(currentLevel);

  // Climbing levels: confirmed when we moved past or hit a wrong answer
  if (levelIndex <= 1) {
    if (levelIndex < CEFR_LEVELS.length - 1) {
      const nextAnswers = skillAnswers.filter(a => a.level === CEFR_LEVELS[levelIndex + 1]);
      if (nextAnswers.length > 0) return true;
    }
    if (atLevel.length > 0 && !atLevel[atLevel.length - 1].correct) return true;
    return false;
  }

  // Confirmation levels: 3+ answers
  if (atLevel.length < 3) return false;

  const last3 = atLevel.slice(-3);
  const correctCount = last3.filter(a => a.correct).length;

  if (correctCount >= 2) {
    // Passed — check if we've already failed at the next level
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

  // Failed — confirmed at this ceiling
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
  let confirmedLevel = 'A1';
  for (const level of CEFR_LEVELS) {
    const s = levelScores[level];
    const idx = CEFR_LEVELS.indexOf(level);
    // Climb levels: 1 correct answer means passed
    if (idx <= 1) {
      if (s.correct >= 1) confirmedLevel = level;
    } else {
      // Confirm levels: 3+ answers with ≥2/3 correct
      if (s.total >= 3 && s.correct >= 2) confirmedLevel = level;
    }
  }
  return confirmedLevel;
}

function getNextQuestion(skill, currentLevel, usedIds, questionType) {
  const bank = QUESTION_BANK[skill];
  if (!bank) return null;
  if (skill === 'writing') return { ...QUESTION_BANK.writing.universal, skill, level: currentLevel };
  const levelBank = bank[currentLevel];
  if (!levelBank) {
    const fallbackLevel = currentLevel === 'C1' ? 'B2' : currentLevel === 'A1' ? 'A2' : 'B1';
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

    // Check retake eligibility
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

    // Special case: writing skill — just return the writing task
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
      const writingQ = QUESTION_BANK.writing.universal;
      return res.json({
        question: { ...writingQ, skill, level: 'universal' },
        progress: { currentSkill: skill, skillIndex: SKILL_ORDER.indexOf(skill), totalSkills: SKILL_ORDER.length, questionsInSkill: skillAnswers.length, showEncouragement: false }
      });
    }

    // Check if this skill is confirmed
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

    const question = getNextQuestion(skill, currentLevel, usedIds, null);
    if (!question) {
      const skillIndex = SKILL_ORDER.indexOf(skill);
      if (skillIndex === SKILL_ORDER.length - 1) return res.json({ skillComplete: true, allComplete: true });
      const nextSkill = SKILL_ORDER[skillIndex + 1];
      await pool.query('UPDATE placement_tests SET current_skill = $1 WHERE id = $2', [nextSkill, req.params.testId]);
      return res.json({ skillComplete: true, completedSkill: skill, completedLevel: getFinalLevel(skillAnswers), nextSkill, allComplete: false });
    }

    const wrongInRow = skillAnswers.length >= 3 && skillAnswers.slice(-3).every(a => !a.correct);
    res.json({ question, progress: { currentSkill: skill, skillIndex: SKILL_ORDER.indexOf(skill), totalSkills: SKILL_ORDER.length, questionsInSkill: skillAnswers.length, showEncouragement: wrongInRow } });
  } catch (err) { console.error('Get question error:', err); res.status(500).json({ error: 'Something went wrong.' }); }
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
      try {
        const prompt = QUESTION_BANK.writing.universal.evaluationPrompt.replace('{writing}', answer);
        const result = await model.generateContent(prompt);
        const rawText = result.response.text().trim();

        // Extract the LEVEL_DATA JSON from the end
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
            // Everything before LEVEL_DATA is the human feedback
            humanFeedback = rawText.split('LEVEL_DATA:')[0].trim();
          } catch { /* keep defaults */ }
        }

        const currentAnswers = testResult.rows[0].answers || [];
        const newAnswer = {
          skill, level: levelData.detectedLevel, questionType,
          answer: answer.substring(0, 500), correct: true,
          questionId: questionData?.id,
          timestamp: new Date().toISOString(),
          writingEvaluation: levelData
        };
        await pool.query(
          'UPDATE placement_tests SET answers = $1 WHERE id = $2',
          [JSON.stringify([...currentAnswers, newAnswer]), req.params.testId]
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

    // ── fill_blank and choose_correct: exact match + AI natural feedback ──
    if (questionType === 'fill_blank' || questionType === 'choose_correct') {
      const correct = (questionData.correct || '').toLowerCase().trim();
      const given = answer.toLowerCase().trim();
      const isCorrect = given === correct;
      let feedback = isCorrect ? 'Correct!' : `Not quite — the answer is "${questionData.correct}"`;
      try {
        const aiPrompt = `You are a warm English teacher. The student answered a ${questionType === 'fill_blank' ? 'fill-in-the-blank' : 'multiple choice'} question.
Question: "${questionData.question || questionData.instruction}"
Correct answer: "${questionData.correct}"
Student's answer: "${answer}"
The student was ${isCorrect ? '' : 'not '}correct.

Write ONE short, friendly sentence explaining why in plain language. If wrong, say what the right answer is simply. No verdict line needed.`;
        const r = await model.generateContent(aiPrompt);
        feedback = r.response.text().trim().split('\n')[0];
      } catch {}
      const currentAnswers = testResult.rows[0].answers || [];
      await pool.query(
        'UPDATE placement_tests SET answers = $1 WHERE id = $2',
        [JSON.stringify([...currentAnswers, { skill, level, questionType, answer, correct: isCorrect, questionId: questionData?.id, timestamp: new Date().toISOString() }]), req.params.testId]
      );
      return res.json({
        correct: isCorrect,
        feedback,
        correction: isCorrect ? null : questionData.correct,
        rule: isCorrect ? null : questionData.rule
      });
    }

    // ── Everything else: AI thinks freely, verdict extracted ─────────────
    // Build a context-aware prompt based on question type
    let prompt = '';

    if (questionType === 'fix_error') {
      prompt = `You are an English teacher checking a student's work.

The student was shown this broken sentence and asked to fix the ONE mistake in it:
BROKEN: "${questionData.text}"
CORRECT: "${questionData.correct}"

The specific thing that was wrong: ${questionData.rule || 'see the difference between broken and correct'}

The student wrote this as their fix: "${answer}"

Think through it like a real teacher:
— What word or phrase is different between BROKEN and CORRECT? That is the mistake.
— Did the student fix that exact thing? Or did they change something else and leave the mistake in?
— Is the mistake still sitting there unchanged in the student's answer?

Respond naturally in 2-3 short sentences like a helpful friend. Tell the student what they did right, or name the specific word they needed to change and why. Then on the very last line write either:
VERDICT: CORRECT
or
VERDICT: WRONG`;

    } else if (questionType === 'write_sentence' || questionType === 'use_in_sentence') {
      prompt = `You are an English teacher checking a student's sentence.

Task the student had: "${questionData.instruction}"
${questionData.word ? `Word they needed to use: "${questionData.word}"` : ''}
What makes a good answer: ${questionData.evaluationCriteria}

The student wrote: "${answer}"

Think like a real teacher:
— Did they actually use the required word correctly?
— Does the sentence demonstrate what the task asked for?
— Is it real English a person would naturally say?
— Be generous with phrasing variations — only mark wrong if the English is genuinely incorrect or the task is clearly not done.

Respond in 1-2 short sentences like a helpful friend. If wrong, name the specific word that slipped. If right, say what they did well. Then on the very last line write either:
VERDICT: CORRECT
or
VERDICT: WRONG`;

    } else if (questionType === 'define_word') {
      prompt = `You are a strict-but-kind English teacher checking if a student knows a word's meaning.

Word: "${questionData.word}"
Acceptable meanings: ${JSON.stringify(questionData.acceptableAnswers)}

The student's definition: "${answer}"

CRITICAL — be strict about wrong answers:
— If the student's answer has nothing to do with the word's actual meaning, mark WRONG.
— "I love" is NOT a definition of "inevitable" — that is WRONG.
— Accept paraphrases and imperfect grammar only if the core definition is recognisable.
— Do NOT give credit for answers that describe a completely different concept.
— If in doubt, lean WRONG rather than incorrectly passing.

Respond in 1-2 short sentences. If wrong, explain what the word actually means in simple terms. Then on the very last line write either:
VERDICT: CORRECT
or
VERDICT: WRONG`;

    } else if (questionType === 'read_comprehension' || questionType === 'dialogue_comprehension') {
      prompt = `You are an English teacher checking a student's comprehension answer.

The question: "${questionData.question}"
The key idea a correct answer needs: "${questionData.correct}"
The student answered: "${answer}"

CRITICAL RULES — read these before deciding:
— Short answers are completely valid. "To find work" is just as correct as "She moved to London to find work." Never penalise for being brief.
— Grammar mistakes do not make a comprehension answer wrong. Only the IDEA matters.
— If the student's answer captures the key idea — even briefly, even differently — CORRECT.
— Only WRONG if the student answered something completely different or missed the key idea entirely.

Does "${answer}" capture the idea from "${questionData.correct}"?

One short sentence response like a friendly teacher. Then on the very last line write either:
VERDICT: CORRECT
or
VERDICT: WRONG`;
    }

    // Run the prompt and extract verdict
    let isCorrect = false;
    let feedback = '';
    let correction = null;

    try {
      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();

      // Extract verdict from last line
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      const lastLine = lines[lines.length - 1];
      isCorrect = lastLine.includes('VERDICT: CORRECT');

      // Everything before the verdict line is the natural feedback
      const feedbackLines = lines.filter(l => !l.startsWith('VERDICT:'));
      feedback = feedbackLines.join(' ').trim();

      if (!isCorrect) correction = questionType === 'define_word' ? questionData.acceptableAnswers?.[0] || questionData.word : (questionData.correct || null);
    } catch (err) {
      console.error('AI evaluation error:', err?.message || err);
      // Fallback: simple keyword matching when AI is unavailable
      const lower = answer.toLowerCase();
      const keywords = (questionType === 'define_word' ? questionData.acceptableAnswers || [] : [questionData.correct || ''])
        .flatMap(k => k.toLowerCase().split(/[\s,./()]+/)).filter(w => w.length > 3);
      const matched = keywords.filter(k => lower.includes(k));
      isCorrect = matched.length >= Math.min(2, keywords.length);
      const fallbackAnswer = questionType === 'define_word' ? (questionData.acceptableAnswers?.[0] || questionData.word) : questionData.correct;
      feedback = isCorrect
        ? 'That captures the key idea — well done.'
        : `Not quite — the key point is: ${fallbackAnswer}`;
      if (!isCorrect) correction = fallbackAnswer;
    }

    // Save answer to database
    const currentAnswers = testResult.rows[0].answers || [];
    const newAnswer = {
      skill, level, questionType,
      answer: answer.substring(0, 300),
      correct: isCorrect,
      questionId: questionData?.id,
      timestamp: new Date().toISOString()
    };
    await pool.query(
      'UPDATE placement_tests SET answers = $1 WHERE id = $2',
      [JSON.stringify([...currentAnswers, newAnswer]), req.params.testId]
    );

    res.json({ correct: isCorrect, feedback, correction, rule: isCorrect ? null : questionData?.rule });

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
