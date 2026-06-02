const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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
        instruction: 'Write ONE sentence about yourself. Use "I am" or "I have".',
        evaluationCriteria: 'correct use of "I am" or "I have", basic subject-verb-object, no major spelling errors',
        hint: 'Example: "I am from Tunisia." or "I have a brother."'
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
        instruction: 'Write ONE sentence about something you did last week. Use the past simple tense.',
        evaluationCriteria: 'correct past simple tense, regular or irregular verb, time expression',
        hint: 'Example: "Last week I ate pizza with my friends." Try writing about something you really did.'
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
        instruction: 'Write ONE sentence using the present perfect to describe something you have done in your life.',
        evaluationCriteria: 'correct present perfect (have/has + past participle), life experience context',
        hint: 'Example: "I have visited three countries." or "She has never eaten sushi."'
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
        instruction: 'Write a third conditional sentence about something that did NOT happen in the past and its imaginary result.',
        evaluationCriteria: 'correct third conditional: if + past perfect, would have + past participle',
        hint: 'Example: "If I had studied harder, I would have passed the exam." Think of a real past moment.'
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
        instruction: 'Rewrite this sentence using passive voice with the correct tense: "The government will announce the new policy tomorrow."',
        evaluationCriteria: 'correct future passive: will be + past participle, no agent needed',
        hint: 'Move "the new policy" to subject position. Use "will be + announced".'
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
        instruction: 'Write a sentence using the word:',
        word: 'happy',
        evaluationCriteria: 'correct use showing understanding of the word as an emotion meaning pleased/joyful',
        hint: 'Example: "I am happy when I see my family." Write your own sentence.'
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
        instruction: 'Write a sentence using the word:',
        word: 'unfortunately',
        evaluationCriteria: 'used as a linking adverb showing a negative or disappointing outcome',
        hint: 'Example: "Unfortunately, I missed the bus and was late." It introduces bad news.'
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
        instruction: 'Write a sentence using the word:',
        word: 'consequently',
        evaluationCriteria: 'used correctly as a linking adverb showing cause and effect',
        hint: '"Consequently" connects a cause to its result. Example: "It rained all day; consequently, the match was cancelled."'
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
        instruction: 'Write a sentence using the word:',
        word: 'albeit',
        evaluationCriteria: 'used correctly as a concessive conjunction meaning "although" or "even though", typically before an adjective or noun phrase',
        hint: '"Albeit" is a formal word meaning "although". Example: "It was a good result, albeit a surprising one."'
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
        instruction: 'Write a sentence using the word:',
        word: 'exacerbate',
        evaluationCriteria: 'used correctly to mean "make something worse" — typically a problem, situation, or condition',
        hint: '"Exacerbate" means to make a bad situation even worse. Example: "Poor sleep can exacerbate anxiety."'
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
      evaluationPrompt: `You are an expert English language examiner with 20 years of experience assessing writing according to CEFR standards.

Read this writing sample carefully.

PROMPT: "Think of an important decision you made in your life. Describe what the decision was, why you made it, and what happened as a result."

STUDENT WRITING:
"{writing}"

Assess the writing on five dimensions:
1. GRAMMAR ACCURACY: What structures are used correctly? What errors appear and how frequently?
2. VOCABULARY RANGE: How wide and accurate is the vocabulary? Is word choice varied or repetitive?
3. SENTENCE COMPLEXITY: Only simple sentences, or does the writer vary structure with clauses and connectors?
4. COHERENCE: Is the writing organised? Do ideas connect logically?
5. TASK COMPLETION: Did they address all three parts of the prompt?

Assign ONE of these CEFR levels:
- A1: Only very basic isolated sentences, severe errors throughout, almost no connectors, vocabulary extremely limited
- A2: Simple connected sentences, frequent errors in basic structures, basic vocabulary (common words only), limited connectors (and, but, because)
- B1: Clear text with some errors, adequate vocabulary, some varied sentence structures, connectors used (however, although, as a result)
- B2: Complex text, occasional errors, good vocabulary range, varied sentence structures, cohesive paragraph structure
- C1: Sophisticated text, rare and minor errors only, wide and precise vocabulary, complex clause structures, nuanced expression
- C2: Near-native accuracy, exceptional vocabulary precision, complex and varied structures, sophisticated ideas

Respond ONLY with valid JSON (no markdown, no text outside the JSON):
{
  "level": "B1",
  "sublevel": "mid",
  "confidence": 0.85,
  "evidence": "Two-sentence explanation of why this level was assigned, citing specific examples from the text",
  "specific_errors": ["exact quote from text: correction", "exact quote: correction"],
  "strengths": ["specific strength 1", "specific strength 2"],
  "priority_improvement": "The single most important thing to work on"
}`
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

function determineStartLevel() { return 'B1'; }

function getNextLevel(skillAnswers, currentLevel) {
  const atCurrentLevel = skillAnswers.filter(a => a.level === currentLevel);
  if (atCurrentLevel.length < 2) return { action: 'continue', level: currentLevel };
  const last3 = atCurrentLevel.slice(-3);
  const correctCount = last3.filter(a => a.correct).length;
  const levelIndex = CEFR_LEVELS.indexOf(currentLevel);
  if (last3.length >= 3) {
    if (correctCount >= 2) {
      if (levelIndex < CEFR_LEVELS.length - 2) return { action: 'up', level: CEFR_LEVELS[levelIndex + 1] };
      return { action: 'confirm', level: currentLevel };
    }
    if (correctCount <= 1) {
      if (levelIndex > 0) return { action: 'down', level: CEFR_LEVELS[levelIndex - 1] };
      return { action: 'confirm', level: 'A1' };
    }
  }
  if (last3.length === 2) {
    if (correctCount === 2 && levelIndex < CEFR_LEVELS.length - 2) return { action: 'up', level: CEFR_LEVELS[levelIndex + 1] };
    if (correctCount === 0 && levelIndex > 0) return { action: 'down', level: CEFR_LEVELS[levelIndex - 1] };
  }
  return { action: 'continue', level: currentLevel };
}

function isSkillConfirmed(skillAnswers, currentLevel) {
  if (skillAnswers.length >= 10) return true;
  const atLevel = skillAnswers.filter(a => a.level === currentLevel);
  if (atLevel.length < 3) return false;
  const last3 = atLevel.slice(-3);
  const correctCount = last3.filter(a => a.correct).length;
  const decision = getNextLevel(skillAnswers, currentLevel);
  if (decision.action === 'confirm') return true;
  if (decision.action === 'up' || decision.action === 'down') {
    const targetAtNewLevel = skillAnswers.filter(a => a.level === decision.level);
    if (targetAtNewLevel.length >= 2) {
      const targetCorrect = targetAtNewLevel.slice(-2).filter(a => a.correct).length;
      if (decision.action === 'up' && targetCorrect <= 1) return true;
      if (decision.action === 'down' && targetCorrect >= 1) return true;
    }
  }
  return false;
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
    if (s.total >= 2 && s.correct / s.total >= 0.5) confirmedLevel = level;
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
    const allUsed = levelBank[levelBank.length - 1];
    return allUsed ? { ...allUsed, skill, level: currentLevel } : null;
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

    if (isSkillConfirmed(skillAnswers, currentLevel) || skillAnswers.length >= 10) {
      const skillIndex = SKILL_ORDER.indexOf(skill);
      if (skillIndex === SKILL_ORDER.length - 1) {
        return res.json({ skillComplete: true, allComplete: true });
      }
      const nextSkill = SKILL_ORDER[skillIndex + 1];
      await pool.query('UPDATE placement_tests SET current_skill = $1, current_question = 0 WHERE id = $2', [nextSkill, req.params.testId]);
      return res.json({ skillComplete: true, completedSkill: skill, completedLevel: getFinalLevel(skillAnswers), nextSkill, allComplete: false });
    }

    const question = getNextQuestion(skill, currentLevel, usedIds, null);
    if (!question) {
      const skillIndex = SKILL_ORDER.indexOf(skill);
      if (skillIndex === SKILL_ORDER.length - 1) return res.json({ skillComplete: true, allComplete: true });
      const nextSkill = SKILL_ORDER[skillIndex + 1];
      await pool.query('UPDATE placement_tests SET current_skill = $1, current_question = 0 WHERE id = $2', [nextSkill, req.params.testId]);
      return res.json({ skillComplete: true, completedSkill: skill, completedLevel: getFinalLevel(skillAnswers), nextSkill, allComplete: false });
    }

    const wrongInRow = skillAnswers.length >= 3 && skillAnswers.slice(-3).every(a => !a.correct);
    res.json({ question, progress: { currentSkill: skill, skillIndex: SKILL_ORDER.indexOf(skill), totalSkills: SKILL_ORDER.length, questionsInSkill: skillAnswers.length, showEncouragement: wrongInRow } });
  } catch (err) { console.error('Get question error:', err); res.status(500).json({ error: 'Something went wrong.' }); }
});

router.post('/:testId/answer', authMiddleware, async (req, res) => {
  try {
    const { answer, skill, level, questionType, questionData } = req.body;
    const testResult = await pool.query('SELECT * FROM placement_tests WHERE id = $1 AND user_id = $2', [req.params.testId, req.user.userId]);
    if (testResult.rows.length === 0) return res.status(404).json({ error: 'Test not found' });

    let isCorrect = false;
    let feedback = '';
    let correction = '';
    let rule = questionData?.rule || null;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    if (questionType === 'free_write') {
      // Writing evaluation
      const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 40) {
        return res.json({ correct: false, feedback: 'Please write more — aim for at least 80 words to show your real level.', correction: null, rule: null, tooShort: true });
      }
      const prompt = QUESTION_BANK.writing.universal.evaluationPrompt.replace('{writing}', answer);
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        const evaluation = JSON.parse(text);
        isCorrect = true;
        feedback = evaluation.evidence;
        const levelData = { detectedLevel: evaluation.level, sublevel: evaluation.sublevel, strengths: evaluation.strengths, improvement: evaluation.priority_improvement, errors: evaluation.specific_errors };
        const currentAnswers = testResult.rows[0].answers || [];
        const newAnswer = { skill, level: evaluation.level, questionType, answer: answer.substring(0, 500), correct: true, questionId: questionData?.id, timestamp: new Date().toISOString(), writingEvaluation: levelData };
        await pool.query('UPDATE placement_tests SET answers = $1 WHERE id = $2', [JSON.stringify([...currentAnswers, newAnswer]), req.params.testId]);
        return res.json({ correct: true, feedback, writingLevel: evaluation.level, writingData: levelData, correction: null, rule: null });
      } catch (e) {
        isCorrect = true; feedback = 'Your writing has been recorded.';
      }
    } else if (questionType === 'write_sentence' || questionType === 'use_in_sentence') {
      const prompt = `You are an English language examiner. Evaluate this student answer strictly.
Question: ${JSON.stringify(questionData)}
Student answer: "${answer}"
Criteria: ${questionData.evaluationCriteria || 'correct English usage at level ' + level}
Respond ONLY in JSON (no markdown):
{"correct": true/false, "feedback": "One sentence starting with Good/Almost/Not quite", "issue": "specific error if wrong or null", "correction": "corrected version or null", "rule": "one-sentence rule or null"}`;
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        const ev = JSON.parse(text);
        isCorrect = ev.correct;
        feedback = ev.feedback;
        correction = ev.correction;
        rule = ev.rule || rule;
      } catch { isCorrect = answer.trim().split(' ').length >= 3; feedback = isCorrect ? 'Good attempt!' : 'Please write a complete sentence.'; }
    } else if (questionType === 'fix_error') {
      // AI evaluation — string comparison is NOT reliable for sentence corrections.
      // The student must fix the CORRECT error, not just change something else.
      const prompt = `You are a strict English language examiner.

The student was asked to fix ONE specific grammatical error in this sentence.

ORIGINAL SENTENCE: "${questionData.text}"
CORRECT VERSION: "${questionData.correct}"
THE GRAMMAR RULE: ${questionData.rule || 'See correct version'}

STUDENT'S ANSWER: "${answer}"

Be STRICT. Ask yourself:
1. Did the student fix the SAME error that was in the original sentence?
2. Is the student's answer grammatically correct for this specific rule?

Mark as WRONG if:
- The student changed a DIFFERENT part of the sentence while leaving the original error
- The student's version still contains the original grammatical error
- The student just copied the original without fixing it
- The student's version introduces a new grammatical error

Mark as CORRECT only if:
- The specific grammatical error from the original has been fixed
- The sentence is now grammatically acceptable

Respond ONLY in JSON (no markdown, no text outside JSON):
{"correct": true/false, "feedback": "One sentence — if wrong, name EXACTLY what the student changed vs what they SHOULD have changed", "correction": "${questionData.correct}", "rule": "${(questionData.rule || '').replace(/"/g, "'")}"}`
      ;
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        const ev = JSON.parse(text);
        isCorrect = ev.correct;
        feedback = ev.feedback;
        correction = ev.correct ? null : questionData.correct;
        rule = ev.rule || rule;
      } catch {
        // Fallback: strict exact match only
        const correct = (questionData.correct || '').toLowerCase().trim();
        const given = answer.toLowerCase().trim();
        isCorrect = given === correct;
        feedback = isCorrect ? 'Correct!' : `Not quite. The correct answer is: "${questionData.correct}"`;
        correction = isCorrect ? null : questionData.correct;
      }
    } else if (questionType === 'fill_blank') {
      // Exact match — fill in blank has one specific correct word
      const correct = (questionData.correct || '').toLowerCase().trim();
      const given = answer.toLowerCase().trim();
      isCorrect = given === correct;
      feedback = isCorrect ? 'Correct!' : `Not quite. The correct answer is: "${questionData.correct}"`;
      correction = isCorrect ? null : questionData.correct;
    } else if (questionType === 'define_word') {
      const prompt = `English examiner: does this student definition show understanding of the word "${questionData.word}"?
Student answer: "${answer}"
Acceptable answers include: ${JSON.stringify(questionData.acceptableAnswers)}
Accept any reasonable paraphrase. Reject blank, random, or completely wrong answers.
Respond ONLY in JSON: {"correct": true/false, "feedback": "one sentence", "correction": "what a good answer would include"}`;
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        const ev = JSON.parse(text);
        isCorrect = ev.correct;
        feedback = ev.feedback;
        correction = ev.correction;
      } catch { isCorrect = false; feedback = 'Please give a clear definition.'; }
    } else if (questionType === 'read_comprehension' || questionType === 'dialogue_comprehension') {
      const prompt = `English examiner: does this student answer correctly address this comprehension question?
Question: "${questionData.question}"
Expected answer includes: "${questionData.correct}"
Student answer: "${answer}"
Accept paraphrases. Require the key idea to be present.
Respond ONLY in JSON: {"correct": true/false, "feedback": "one sentence starting with Good/Almost/Not quite", "correction": "what a complete correct answer would say"}`;
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        const ev = JSON.parse(text);
        isCorrect = ev.correct;
        feedback = ev.feedback;
        correction = ev.correction;
      } catch { isCorrect = false; feedback = 'Please answer in more detail.'; }
    } else if (questionType === 'choose_correct') {
      isCorrect = answer === questionData.correct;
      feedback = isCorrect ? 'Correct!' : `Not quite. The correct answer is: "${questionData.correct}"`;
      correction = isCorrect ? null : questionData.correct;
    }

    const currentAnswers = testResult.rows[0].answers || [];
    const newAnswer = { skill, level, questionType, answer: answer.substring(0, 300), correct: isCorrect, questionId: questionData?.id, timestamp: new Date().toISOString() };
    await pool.query('UPDATE placement_tests SET answers = $1 WHERE id = $2', [JSON.stringify([...currentAnswers, newAnswer]), req.params.testId]);

    res.json({ correct: isCorrect, feedback, correction, rule, hint: !isCorrect ? questionData?.hint : null });
  } catch (err) { console.error('Answer error:', err); res.status(500).json({ error: 'Something went wrong.' }); }
});

router.post('/:testId/complete', authMiddleware, async (req, res) => {
  try {
    const testResult = await pool.query('SELECT * FROM placement_tests WHERE id = $1 AND user_id = $2', [req.params.testId, req.user.userId]);
    if (testResult.rows.length === 0) return res.status(404).json({ error: 'Test not found' });

    const answers = testResult.rows[0].answers || [];
    const results = {};
    const explanations = {};
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
      const prompt = `You are a warm English teacher explaining test results to a student.
Skill: ${skill}
Detected CEFR level: ${detectedLevel}
Questions answered: ${skillAnswers.length}
Incorrect answers: ${wrongAnswers.length}
Write exactly 2 sentences in ${detectedLevel}-level English:
1. What their ${detectedLevel} level means in real, practical terms (not CEFR jargon)
2. One specific area to focus on first
Be honest, warm, and specific. No bullet points. No lists.`;

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
