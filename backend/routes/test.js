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

const SKILL_ORDER = ['grammar', 'vocabulary', 'reading', 'writing', 'dialogue', 'listening'];
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Question types that can be checked directly (no AI needed for correctness)
const DIRECT_CHECK_TYPES = ['mc', 'fill', 'sort', 'match', 'error'];

// ─────────────────────────────────────────────
// QUESTION BANK (converted from engrow_test_bank_redesigned.html DATA)
// ─────────────────────────────────────────────
const QUESTION_BANK = require('../../generated_question_bank.json');

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
    const textMatch = answer.trim().toLowerCase() === (questionData.correct || '').toLowerCase();
    if (textMatch) return true;
    // Fallback: check by index (belt-and-suspenders)
    const idx = parseInt(answer, 10);
    if (!isNaN(idx) && questionData.options && questionData.correctIndex !== undefined) {
      return idx === questionData.correctIndex;
    }
    return false;
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
      const feedback = isCorrect ? null : `The correct answer is "${questionData.correct}".`;
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
