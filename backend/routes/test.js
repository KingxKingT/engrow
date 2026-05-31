const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SKILL_ORDER = ['grammar', 'vocabulary', 'reading', 'writing', 'dialogue'];

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Questions bank - adaptive per skill and level
const QUESTION_BANK = {
  grammar: {
    A1: [
      {
        type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'She don\'t like coffee.',
        correct: 'She doesn\'t like coffee.',
        rule: 'Third person singular uses "doesn\'t" not "don\'t"',
        hint: 'Think about the subject "She" — what form of "do" matches it?'
      },
      {
        type: 'fill_blank',
        instruction: 'Fill in the blank with the correct word.',
        text: 'I ___ a student.',
        options: ['am', 'is', 'are'],
        correct: 'am',
        rule: 'Use "am" with "I"',
        hint: 'The verb "to be" changes depending on who we talk about.'
      },
      {
        type: 'write_sentence',
        instruction: 'Write a sentence using the word: "have"',
        evaluationCriteria: 'basic subject-verb agreement, correct use of "have"',
        hint: 'Example: "I have a dog." Try writing your own.'
      }
    ],
    A2: [
      {
        type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'Yesterday I go to the market.',
        correct: 'Yesterday I went to the market.',
        rule: '"Yesterday" means past — use past simple tense',
        hint: 'The word "yesterday" tells you when this happened.'
      },
      {
        type: 'fill_blank',
        instruction: 'Fill in the blank.',
        text: 'She ___ working when I called.',
        options: ['was', 'were', 'is'],
        correct: 'was',
        rule: 'Past continuous: was/were + verb-ing',
        hint: 'This happened in the past. Which form of "be" matches "she"?'
      },
      {
        type: 'write_sentence',
        instruction: 'Write a sentence using the past simple tense about something you did last week.',
        evaluationCriteria: 'correct past simple formation, regular or irregular verb',
        hint: 'Think about what you did. Use verbs like: went, ate, saw, talked.'
      }
    ],
    B1: [
      {
        type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'I have seen that film last night.',
        correct: 'I saw that film last night.',
        rule: '"Last night" is a specific past time — use past simple, not present perfect',
        hint: 'When we say exactly when something happened, which tense do we use?'
      },
      {
        type: 'fill_blank',
        instruction: 'Fill in the blank.',
        text: 'If I ___ more time, I would study abroad.',
        options: ['had', 'have', 'will have'],
        correct: 'had',
        rule: 'Second conditional: If + past simple, would + infinitive',
        hint: 'This is an imaginary situation. The second conditional uses past tense in the "if" part.'
      },
      {
        type: 'write_sentence',
        instruction: 'Write a sentence using the present perfect to talk about an experience you have had.',
        evaluationCriteria: 'correct present perfect formation (have/has + past participle)',
        hint: 'Example: "I have visited Paris." Write about your own experience.'
      }
    ],
    B2: [
      {
        type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'The report must be submitted until Friday.',
        correct: 'The report must be submitted by Friday.',
        rule: '"By" means no later than. "Until" means up to that point continuously.',
        hint: 'Think about the difference: "until" vs "by" for deadlines.'
      },
      {
        type: 'fill_blank',
        instruction: 'Fill in the blank.',
        text: 'She ___ have taken the job — she seems much happier now.',
        options: ['must', 'should', 'could'],
        correct: 'must',
        rule: '"Must have" expresses logical deduction about the past',
        hint: 'We are making a logical conclusion about a past decision.'
      },
      {
        type: 'write_sentence',
        instruction: 'Write a sentence using a third conditional to describe a regret or different outcome.',
        evaluationCriteria: 'correct third conditional (if + past perfect, would have + past participle)',
        hint: 'Example: "If I had studied harder, I would have passed the exam."'
      }
    ],
    C1: [
      {
        type: 'fix_error',
        instruction: 'Fix the mistake in this sentence.',
        text: 'He suggested that she goes to the doctor immediately.',
        correct: 'He suggested that she go to the doctor immediately.',
        rule: 'The subjunctive mood is used after "suggest" in formal English',
        hint: 'After verbs like "suggest", "recommend", "insist" — what form of the verb follows?'
      },
      {
        type: 'fill_blank',
        instruction: 'Fill in the blank.',
        text: 'No sooner ___ he left than it started raining.',
        options: ['had', 'has', 'have'],
        correct: 'had',
        rule: '"No sooner...than" requires past perfect and inverted word order',
        hint: 'This is an inverted structure — the auxiliary verb comes before the subject.'
      },
      {
        type: 'write_sentence',
        instruction: 'Rewrite this sentence using a passive construction: "The committee will announce the results next week."',
        evaluationCriteria: 'correct passive voice, future passive (will be + past participle)',
        hint: 'Move "the results" to the subject position.'
      }
    ]
  },
  vocabulary: {
    A1: [
      {
        type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'hungry',
        acceptableAnswers: ['want to eat', 'need food', 'empty stomach', 'feeling like eating'],
        hint: 'Think about how you feel when you have not eaten for a long time.'
      },
      {
        type: 'use_in_sentence',
        instruction: 'Write a sentence using the word: "happy"',
        word: 'happy',
        evaluationCriteria: 'correct usage of the word showing understanding of its meaning',
        hint: 'Example: "I am happy when I see my friends." Write your own sentence.'
      }
    ],
    A2: [
      {
        type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'exhausted',
        acceptableAnswers: ['very tired', 'extremely tired', 'no energy', 'very sleepy'],
        hint: 'It means more than just "tired" — think about an extreme level of tiredness.'
      },
      {
        type: 'choose_correct',
        instruction: 'Choose the correct word to complete the sentence.',
        text: 'The weather was ___. We couldn\'t see anything through the fog.',
        options: ['misty', 'sunny', 'windy', 'hot'],
        correct: 'misty',
        hint: 'Which word is connected to fog and low visibility?'
      }
    ],
    B1: [
      {
        type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'reluctant',
        acceptableAnswers: ['not wanting to', 'unwilling', 'hesitant', 'not eager'],
        hint: 'If someone is reluctant to do something, how do they feel about doing it?'
      },
      {
        type: 'use_in_sentence',
        instruction: 'Write a sentence using the word: "consequently"',
        word: 'consequently',
        evaluationCriteria: 'correct usage as a linking word showing cause and effect',
        hint: '"Consequently" connects a cause to a result. Example: "It rained all day; consequently, the match was cancelled."'
      }
    ],
    B2: [
      {
        type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'ambiguous',
        acceptableAnswers: ['unclear', 'having two meanings', 'not clear', 'can be understood in different ways'],
        hint: 'If a statement is ambiguous, how many ways can people understand it?'
      },
      {
        type: 'use_in_sentence',
        instruction: 'Write a sentence using the word: "albeit"',
        word: 'albeit',
        evaluationCriteria: 'correct usage as a concessive conjunction',
        hint: '"Albeit" means "although" or "even though". It introduces a contrast.'
      }
    ],
    C1: [
      {
        type: 'define_word',
        instruction: 'In your own words, what does this word mean?',
        word: 'sycophantic',
        acceptableAnswers: ['too eager to please', 'flattering in a fake way', 'excessively complimentary', 'servile'],
        hint: 'Think about someone who always agrees with their boss even when the boss is wrong.'
      },
      {
        type: 'use_in_sentence',
        instruction: 'Write a sentence using the word: "mitigate"',
        word: 'mitigate',
        evaluationCriteria: 'correct usage — to reduce the severity of something',
        hint: '"Mitigate" means to make something less severe or serious.'
      }
    ]
  },
  reading: {
    A1: [
      {
        type: 'read_comprehension',
        instruction: 'Read this text and answer the question.',
        text: 'Tom has a dog. His dog is called Max. Max is big and brown. Tom walks Max every morning before school.',
        question: 'What colour is Max?',
        correct: 'brown',
        inferenceLevel: 'literal',
        hint: 'Look for the describing words used about Max.'
      }
    ],
    A2: [
      {
        type: 'read_comprehension',
        instruction: 'Read this text and answer the question.',
        text: 'Maria moved to London three years ago. At first, she found the weather cold and the city very busy. Now she loves it. She has made many friends and found a good job as a teacher.',
        question: 'How did Maria feel when she first arrived in London?',
        correct: 'She found it cold and very busy / she did not like it at first',
        inferenceLevel: 'literal',
        hint: 'Find the sentence that describes her first impression.'
      }
    ],
    B1: [
      {
        type: 'read_comprehension',
        instruction: 'Read this text and answer the question.',
        text: 'Despite the company\'s strong profits last year, the board has decided to reduce the workforce by fifteen percent. The CEO stated that this decision was necessary to "remain competitive in a changing market," though many employees and union representatives have questioned this reasoning.',
        question: 'What does the phrase "remain competitive" suggest about the company\'s situation?',
        correct: 'The company feels pressure from competitors and needs to reduce costs to keep up with them',
        inferenceLevel: 'inference',
        hint: 'Think about why a profitable company would still need to cut jobs. What does "competitive" mean?'
      }
    ],
    B2: [
      {
        type: 'read_comprehension',
        instruction: 'Read this text and answer the question.',
        text: 'The paradox of choice suggests that while having options is generally desirable, an excess of choices can lead to decision paralysis and, ultimately, dissatisfaction. Psychologist Barry Schwartz argues that the abundance of choices in modern consumer culture has not liberated people but has instead made them miserable, burdened by the fear of making the wrong choice and the nagging sense that a better option always exists.',
        question: 'What is the central argument of this passage, and what evidence is used to support it?',
        correct: 'Too many choices makes people unhappy rather than free. Schwartz provides psychological evidence that excessive options cause paralysis and dissatisfaction.',
        inferenceLevel: 'analysis',
        hint: 'Identify the main claim (what the author argues) and then find what they use to prove it.'
      }
    ],
    C1: [
      {
        type: 'read_comprehension',
        instruction: 'Read this text and answer the question.',
        text: 'Critics of artificial intelligence have long warned of the technology\'s potential for misuse, yet their concerns have often been dismissed as alarmist. Now, as deepfakes proliferate and algorithmic bias becomes statistically undeniable, the question is no longer whether harm is possible, but whether society has the institutional architecture to respond to it. Regulatory frameworks, if they exist at all, lag years behind the technology they purport to govern.',
        question: 'What does the author imply about the relationship between technology and regulation?',
        correct: 'Regulation cannot keep pace with technology, and existing frameworks are inadequate to address current AI harms.',
        inferenceLevel: 'critical',
        hint: 'The author never states this directly — look at the tone and the specific word "purport".'
      }
    ]
  },
  writing: {
    A1: {
      type: 'free_write',
      instruction: 'Write 4 to 6 sentences about yourself. Include your name, where you are from, and what you like to do.',
      minWords: 20,
      maxWords: 80,
      evaluationCriteria: 'basic sentences, subject-verb agreement, simple vocabulary, "to be" and "to have"',
      hint: 'Start with: "My name is..." Then write about your country and your hobbies.'
    },
    A2: {
      type: 'free_write',
      instruction: 'Write 5 to 8 sentences about what you did last weekend. Use the past tense.',
      minWords: 40,
      maxWords: 120,
      evaluationCriteria: 'past simple tense, time expressions, basic connectors (and, but, then)',
      hint: 'Use words like: went, had, saw, ate, talked. Use "first", "then", "after that" to connect ideas.'
    },
    B1: {
      type: 'free_write',
      instruction: 'Write a short paragraph (6 to 10 sentences) giving your opinion about social media. Include reasons and examples.',
      minWords: 80,
      maxWords: 200,
      evaluationCriteria: 'opinion language, linking words, present tenses, basic argument structure',
      hint: 'Use phrases like: "In my opinion...", "For example...", "However...", "On the other hand..."'
    },
    B2: {
      type: 'free_write',
      instruction: 'Write a short essay (8 to 12 sentences) discussing the advantages and disadvantages of working from home. Conclude with your own view.',
      minWords: 150,
      maxWords: 300,
      evaluationCriteria: 'balanced argument, complex sentences, varied vocabulary, clear conclusion',
      hint: 'Organise your ideas: introduction → advantages → disadvantages → your conclusion.'
    },
    C1: {
      type: 'free_write',
      instruction: 'Write a structured argument (10 to 15 sentences) on this topic: "Economic growth should not come at the expense of environmental protection." You may agree or disagree.',
      minWords: 200,
      maxWords: 400,
      evaluationCriteria: 'sophisticated vocabulary, complex clause structures, cohesive devices, persuasive register',
      hint: 'Use formal vocabulary. Structure: claim → evidence → counterargument → rebuttal → conclusion.'
    }
  },
  dialogue: {
    A1: {
      type: 'dialogue_comprehension',
      instruction: 'Read this conversation and answer the question.',
      text: 'Sara: Hi! Are you new here?\nJack: Yes, I started today. I\'m Jack.\nSara: Nice to meet you, Jack. I\'m Sara. Do you need help finding anything?\nJack: Yes, please! Where is the cafeteria?\nSara: It\'s on the second floor, next to the library.',
      question: 'Why does Jack need Sara\'s help?',
      correct: 'He does not know where the cafeteria is / He is new and needs directions',
      hint: 'Read what Jack says after Sara offers to help.'
    },
    B1: {
      type: 'dialogue_comprehension',
      instruction: 'Read this conversation and answer the question.',
      text: 'Manager: I noticed you\'ve been coming in late this week.\nEmployee: I know, and I apologise. My commute has been much longer since the roadworks started.\nManager: I understand, but we need to find a solution. Could you start earlier or work from home on some days?\nEmployee: Working from home on Mondays and Wednesdays would actually solve the problem completely.\nManager: Let\'s try that for a month and see how it goes.',
      question: 'What does the manager\'s final response suggest about their approach to the problem?',
      correct: 'The manager is flexible and willing to try a compromise, but wants to evaluate the solution before committing permanently.',
      hint: 'Focus on the words "try" and "see how it goes" — what do they imply about the manager\'s attitude?'
    },
    B2: {
      type: 'dialogue_comprehension',
      instruction: 'Read this conversation and answer the question.',
      text: 'Journalist: Your report claims emissions fell by 12%. Critics say the methodology was flawed.\nOfficial: Our methodology was peer-reviewed and entirely transparent.\nJournalist: But the comparison period your team selected was unusually high — which would make any reduction look larger.\nOfficial: We selected that period because it represents standard baseline practice in the industry.\nJournalist: Or because it was convenient for the narrative you wanted to tell?',
      question: 'What technique is the journalist using, and what does it reveal about their view of the official?',
      correct: 'The journalist uses questioning and implication to suggest the official is being misleading. The journalist clearly does not trust the official\'s explanation.',
      hint: 'Look at the journalist\'s final line — it is not a real question. What is it really doing?'
    }
  }
};

// GET /api/test/status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, status, current_skill, current_question, answers, results, retake_eligible_at
       FROM placement_tests WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ hasTest: false, canTake: true });
    }

    const test = result.rows[0];

    if (test.status === 'in_progress') {
      return res.json({ hasTest: true, status: 'in_progress', testId: test.id, currentSkill: test.current_skill });
    }

    const canRetake = !test.retake_eligible_at || new Date() > new Date(test.retake_eligible_at);

    return res.json({
      hasTest: true,
      status: 'completed',
      results: test.results,
      canRetake,
      retakeEligibleAt: test.retake_eligible_at
    });
  } catch (err) {
    console.error('Test status error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/test/start
router.post('/start', authMiddleware, async (req, res) => {
  try {
    // Check for existing in-progress test
    const existing = await pool.query(
      `SELECT id FROM placement_tests WHERE user_id = $1 AND status = 'in_progress'`,
      [req.user.userId]
    );

    if (existing.rows.length > 0) {
      return res.json({ testId: existing.rows[0].id, resumed: true });
    }

    const result = await pool.query(
      `INSERT INTO placement_tests (user_id, status, current_skill, current_question)
       VALUES ($1, 'in_progress', 'grammar', 0) RETURNING id`,
      [req.user.userId]
    );

    res.json({ testId: result.rows[0].id, resumed: false });
  } catch (err) {
    console.error('Start test error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/test/:testId/question
router.get('/:testId/question', authMiddleware, async (req, res) => {
  try {
    const testResult = await pool.query(
      'SELECT * FROM placement_tests WHERE id = $1 AND user_id = $2',
      [req.params.testId, req.user.userId]
    );

    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const test = testResult.rows[0];

    if (test.status === 'completed') {
      return res.json({ completed: true, results: test.results });
    }

    const skill = test.current_skill;
    const answers = test.answers || [];
    const skillAnswers = answers.filter(a => a.skill === skill);

    // Adaptive logic — determine current level based on recent answers
    let currentLevel = 'A2';

    if (skillAnswers.length >= 2) {
      const recent = skillAnswers.slice(-3);
      const correct = recent.filter(a => a.correct).length;
      const lastLevel = recent[recent.length - 1]?.level || 'A2';
      const levelIndex = CEFR_LEVELS.indexOf(lastLevel);

      if (correct === recent.length && levelIndex < CEFR_LEVELS.length - 1) {
        currentLevel = CEFR_LEVELS[levelIndex + 1];
      } else if (correct === 0 && levelIndex > 0) {
        currentLevel = CEFR_LEVELS[levelIndex - 1];
      } else {
        currentLevel = lastLevel;
      }
    }

    // Check if skill is resolved (same level 3 times in a row)
    if (skillAnswers.length >= 3) {
      const lastThree = skillAnswers.slice(-3);
      const allSameLevel = lastThree.every(a => a.level === lastThree[0].level);
      const confirmedLevel = lastThree[0].level;

      if (allSameLevel) {
        // Move to next skill
        const skillIndex = SKILL_ORDER.indexOf(skill);

        if (skillIndex === SKILL_ORDER.length - 1) {
          // All skills done - complete the test
          return res.json({ skillComplete: true, allComplete: true });
        }

        const nextSkill = SKILL_ORDER[skillIndex + 1];

        await pool.query(
          'UPDATE placement_tests SET current_skill = $1, current_question = 0 WHERE id = $2',
          [nextSkill, req.params.testId]
        );

        return res.json({
          skillComplete: true,
          completedSkill: skill,
          completedLevel: confirmedLevel,
          nextSkill,
          allComplete: false
        });
      }
    }

    // Get question for current level and skill
    const bankForSkill = QUESTION_BANK[skill];
    let question;

    if (skill === 'writing') {
      question = bankForSkill[currentLevel] || bankForSkill['A2'];
      question = { ...question, skill, level: currentLevel };
    } else if (skill === 'dialogue') {
      const levels = ['A1', 'B1', 'B2'];
      const dialogueLevel = levels.includes(currentLevel) ? currentLevel : 'B1';
      question = bankForSkill[dialogueLevel] || bankForSkill['B1'];
      question = { ...question, skill, level: currentLevel };
    } else {
      const levelQuestions = bankForSkill[currentLevel] || bankForSkill['A2'];
      const usedIndices = skillAnswers.filter(a => a.level === currentLevel).map(a => a.questionIndex);
      const availableIndices = levelQuestions.map((_, i) => i).filter(i => !usedIndices.includes(i));
      const questionIndex = availableIndices.length > 0
        ? availableIndices[0]
        : Math.floor(Math.random() * levelQuestions.length);
      question = { ...levelQuestions[questionIndex], skill, level: currentLevel, questionIndex };
    }

    const totalSkillAnswers = skillAnswers.length;
    const wrongInRow = skillAnswers.slice(-3).every(a => !a.correct) && skillAnswers.length >= 3;

    res.json({
      question,
      progress: {
        currentSkill: skill,
        skillIndex: SKILL_ORDER.indexOf(skill),
        totalSkills: SKILL_ORDER.length,
        questionsInSkill: totalSkillAnswers,
        showEncouragement: wrongInRow
      }
    });
  } catch (err) {
    console.error('Get question error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/test/:testId/answer
router.post('/:testId/answer', authMiddleware, async (req, res) => {
  try {
    const { answer, skill, level, questionType, questionData } = req.body;

    const testResult = await pool.query(
      'SELECT * FROM placement_tests WHERE id = $1 AND user_id = $2',
      [req.params.testId, req.user.userId]
    );

    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Use Gemini to evaluate the answer
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let isCorrect = false;
    let feedback = '';
    let correction = '';

    if (questionType === 'write_sentence' || questionType === 'free_write' || questionType === 'use_in_sentence') {
      const prompt = `You are an English language evaluator. Evaluate this answer strictly for CEFR level ${level}.

Question type: ${questionType}
Question: ${JSON.stringify(questionData)}
Student answer: "${answer}"
Evaluation criteria: ${questionData.evaluationCriteria || 'correct English usage'}

Respond in JSON only. No markdown. Format:
{
  "correct": true or false,
  "feedback": "One sentence acknowledging the attempt",
  "issue": "Specific grammar or vocabulary mistake if wrong, or null if correct",
  "correction": "The corrected version if wrong, or null if correct",
  "rule": "One-sentence grammar rule that applies"
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, '').trim();

      try {
        const evaluation = JSON.parse(text);
        isCorrect = evaluation.correct;
        feedback = evaluation.feedback;
        correction = evaluation.correction;
      } catch {
        isCorrect = answer.trim().length > 10;
        feedback = 'Good attempt.';
      }
    } else if (questionType === 'fix_error' || questionType === 'fill_blank') {
      const correct = questionData.correct;
      isCorrect = answer.trim().toLowerCase() === correct.toLowerCase() ||
        answer.trim().toLowerCase().includes(correct.toLowerCase().split(' ')[0]);
      feedback = isCorrect ? 'Correct!' : `Not quite. The correct answer is: "${correct}"`;
      correction = correct;
    } else if (questionType === 'define_word' || questionType === 'read_comprehension' ||
      questionType === 'dialogue_comprehension') {
      const prompt = `You are an English language evaluator. 

Question: ${JSON.stringify(questionData)}
Student answer: "${answer}"

Is this answer essentially correct? Accept paraphrases and partial answers if they show understanding.

Respond in JSON only. No markdown:
{
  "correct": true or false,
  "feedback": "One sentence. Start with 'Good' or 'Almost' or 'Not quite'",
  "issue": "What was missing or wrong, if anything",
  "correction": "What a complete answer would include"
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, '').trim();

      try {
        const evaluation = JSON.parse(text);
        isCorrect = evaluation.correct;
        feedback = evaluation.feedback;
        correction = evaluation.correction;
      } catch {
        isCorrect = false;
        feedback = 'Please try to answer in more detail.';
      }
    } else if (questionType === 'choose_correct') {
      isCorrect = answer === questionData.correct;
      feedback = isCorrect ? 'Correct!' : `Not quite. The correct answer is: "${questionData.correct}"`;
      correction = questionData.correct;
    }

    // Save answer to test
    const currentAnswers = testResult.rows[0].answers || [];
    const newAnswer = {
      skill,
      level,
      questionType,
      answer,
      correct: isCorrect,
      timestamp: new Date().toISOString(),
      questionIndex: questionData.questionIndex
    };

    await pool.query(
      'UPDATE placement_tests SET answers = $1 WHERE id = $2',
      [JSON.stringify([...currentAnswers, newAnswer]), req.params.testId]
    );

    res.json({
      correct: isCorrect,
      feedback,
      correction,
      rule: questionData.rule || null,
      hint: !isCorrect ? questionData.hint : null
    });
  } catch (err) {
    console.error('Submit answer error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/test/:testId/complete
router.post('/:testId/complete', authMiddleware, async (req, res) => {
  try {
    const testResult = await pool.query(
      'SELECT * FROM placement_tests WHERE id = $1 AND user_id = $2',
      [req.params.testId, req.user.userId]
    );

    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const answers = testResult.rows[0].answers || [];
    const results = {};
    const explanations = {};

    for (const skill of SKILL_ORDER) {
      const skillAnswers = answers.filter(a => a.skill === skill);

      if (skillAnswers.length === 0) {
        results[skill] = 'A1';
        explanations[skill] = 'No answers recorded for this skill.';
        continue;
      }

      // Find confirmed level (last 3 same level)
      const lastThree = skillAnswers.slice(-3);
      let detectedLevel = 'A1';

      if (lastThree.length >= 2) {
        const correctCount = lastThree.filter(a => a.correct).length;
        const lastLevel = lastThree[lastThree.length - 1]?.level || 'A1';

        if (correctCount >= 2) {
          detectedLevel = lastLevel;
        } else {
          const levelIndex = CEFR_LEVELS.indexOf(lastLevel);
          detectedLevel = levelIndex > 0 ? CEFR_LEVELS[levelIndex - 1] : 'A1';
        }
      }

      results[skill] = detectedLevel;

      // Generate explanation using Gemini
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const wrongAnswers = skillAnswers.filter(a => !a.correct);

      const prompt = `You are an English teacher explaining test results to a student.

Skill tested: ${skill}
Detected CEFR level: ${detectedLevel}
Number of questions: ${skillAnswers.length}
Wrong answers: ${wrongAnswers.length}
Correct answers: ${skillAnswers.length - wrongAnswers.length}

Write a 2-sentence explanation in ${detectedLevel} level English explaining:
1. What their level means in practical terms
2. What specific area needs the most work based on their skill

Be warm, specific, and encouraging. Do not use CEFR jargon without explaining it.`;

      try {
        const explanationResult = await model.generateContent(prompt);
        explanations[skill] = explanationResult.response.text().trim();
      } catch {
        explanations[skill] = `Your ${skill} level is ${detectedLevel}.`;
      }

      // Update user skill level in database
      await pool.query(
        `INSERT INTO user_skill_levels (user_id, skill, cefr_level)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, skill) DO UPDATE SET cefr_level = $3, last_updated = NOW()`,
        [req.user.userId, skill, detectedLevel]
      );
    }

    // Mark test as complete
    const retakeDate = new Date();
    retakeDate.setDate(retakeDate.getDate() + 30);

    await pool.query(
      `UPDATE placement_tests SET status = 'completed', results = $1, completed_at = NOW(), retake_eligible_at = $2
       WHERE id = $3`,
      [JSON.stringify({ levels: results, explanations }), retakeDate, req.params.testId]
    );

    // Unlock first lessons for each skill
    await unlockFirstLessons(req.user.userId, results);

    res.json({ results, explanations });
  } catch (err) {
    console.error('Complete test error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

async function unlockFirstLessons(userId, results) {
  try {
    for (const [skill, level] of Object.entries(results)) {
      const levelMap = { A1: 'A1', A2: 'A1', B1: 'A2', B2: 'B1', C1: 'B2', C2: 'C1' };
      const startLevel = levelMap[level] || 'A1';

      const firstLesson = await pool.query(
        'SELECT id FROM lessons WHERE skill = $1 AND level_from = $2 ORDER BY lesson_number ASC LIMIT 1',
        [skill, startLevel]
      );

      if (firstLesson.rows.length > 0) {
        await pool.query(
          `INSERT INTO user_lessons (user_id, lesson_id, status)
           VALUES ($1, $2, 'available')
           ON CONFLICT (user_id, lesson_id) DO NOTHING`,
          [userId, firstLesson.rows[0].id]
        );
      }
    }
  } catch (err) {
    console.error('Unlock lessons error:', err);
  }
}

module.exports = router;
