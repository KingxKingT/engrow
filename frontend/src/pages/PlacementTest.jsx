import { useState, useEffect, useRef } from "react";

// ─── QUESTION BANK (inline for now, move to API later) ───────────────────────
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const VOCABULARY = [
  { id: "v-a1-1", level: "A1", question: "Which word means a place where you sleep when you travel?", options: ["hotel", "factory", "library", "stadium"], answer: "hotel" },
  { id: "v-a1-2", level: "A1", question: "What do you use to write on paper?", options: ["pen", "cup", "door", "clock"], answer: "pen" },
  { id: "v-a2-1", level: "A2", question: "She felt very _____ after running five kilometers.", options: ["exhausted", "enormous", "elegant", "essential"], answer: "exhausted" },
  { id: "v-a2-2", level: "A2", question: "The store was closed, so we had to come back the next _____.", options: ["morning", "color", "weather", "number"], answer: "morning" },
  { id: "v-b1-1", level: "B1", question: "The new policy will _____ all employees starting next month.", options: ["affect", "afford", "attempt", "admit"], answer: "affect" },
  { id: "v-b1-2", level: "B1", question: "He gave a very _____ speech that made everyone think deeply.", options: ["thought-provoking", "good-looking", "well-known", "easy-going"], answer: "thought-provoking" },
  { id: "v-b2-1", level: "B2", question: "The scientist's findings were _____, challenging everything experts believed.", options: ["groundbreaking", "straightforward", "time-consuming", "well-established"], answer: "groundbreaking" },
  { id: "v-b2-2", level: "B2", question: "Which word best fits: 'The government needs to _____ the issue of rising costs.'", options: ["tackle", "glance", "wander", "whisper"], answer: "tackle" },
  { id: "v-c1-1", level: "C1", question: "The lawyer's argument was so _____ that even the judge seemed convinced.", options: ["compelling", "complying", "compiling", "competing"], answer: "compelling" },
  { id: "v-c1-2", level: "C1", question: "Her _____ approach to management meant she gave staff very little freedom.", options: ["autocratic", "aristocratic", "acrobatic", "automatic"], answer: "autocratic" },
  { id: "v-c2-1", level: "C2", question: "The philosopher's writing was known for its _____ — every sentence carried layers of meaning.", options: ["profundity", "proximity", "prolixity", "proclivity"], answer: "profundity" },
  { id: "v-c2-2", level: "C2", question: "The new law was criticized for its _____ — it could be interpreted in too many ways.", options: ["ambiguity", "animosity", "anonymity", "antiquity"], answer: "ambiguity" },
];

const GRAMMAR = [
  { id: "g-a1-1", level: "A1", question: "_____ name is Maria.", options: ["Her", "She", "Hers", "He"], answer: "Her" },
  { id: "g-a1-2", level: "A1", question: "There _____ two cats in the garden.", options: ["are", "is", "am", "be"], answer: "are" },
  { id: "g-a2-1", level: "A2", question: "I _____ to the market yesterday but it was closed.", options: ["went", "go", "gone", "going"], answer: "went" },
  { id: "g-a2-2", level: "A2", question: "She _____ English for three years now.", options: ["has been studying", "studied", "is studying", "studies"], answer: "has been studying" },
  { id: "g-b1-1", level: "B1", question: "If I _____ more time, I would learn a new language.", options: ["had", "have", "would have", "will have"], answer: "had" },
  { id: "g-b1-2", level: "B1", question: "The report _____ by the team before the deadline.", options: ["was completed", "completed", "has completed", "completing"], answer: "was completed" },
  { id: "g-b2-1", level: "B2", question: "_____ she had studied harder, she might have passed the exam.", options: ["Had", "If", "Were", "Should"], answer: "Had" },
  { id: "g-b2-2", level: "B2", question: "He spoke so quietly that I could barely _____ what he was saying.", options: ["make out", "make up", "make off", "make over"], answer: "make out" },
  { id: "g-c1-1", level: "C1", question: "Not until she arrived _____ we realize how serious the situation was.", options: ["did", "had", "were", "would"], answer: "did" },
  { id: "g-c1-2", level: "C1", question: "The suspect denied _____ at the scene of the crime.", options: ["having been", "to have been", "to be", "being have"], answer: "having been" },
  { id: "g-c2-1", level: "C2", question: "_____ the circumstances been different, the outcome would have surprised us all.", options: ["Had", "Were", "Should", "Would"], answer: "Had" },
  { id: "g-c2-2", level: "C2", question: "She is said _____ the most influential thinker of her generation.", options: ["to have been", "to be having been", "having been", "to have being"], answer: "to have been" },
];

const COMPREHENSION = [
  { id: "c-a1-1", level: "A1", type: "mc", passage: "Tom wakes up at seven every morning. He eats breakfast and then walks to school. He likes school because he has many friends there.", question: "Why does Tom like school?", options: ["Because it is close to his house", "Because he has many friends there", "Because the food is good", "Because he wakes up early"], answer: "Because he has many friends there" },
  { id: "c-a2-1", level: "A2", type: "mc", passage: "Maria moved to a new city last year. At first she felt lonely because she didn't know anyone. But after joining a dance class, she made many new friends and now loves living there.", question: "What helped Maria feel better in the new city?", options: ["Getting a new job", "Moving back to her old city", "Joining a dance class", "Calling her family every day"], answer: "Joining a dance class" },
  { id: "c-b1-1", level: "B1", type: "mc", passage: "Remote work has changed the way people think about their careers. Many employees now value flexibility over salary. Companies that refuse to offer remote options often struggle to hire talented workers, while those that embrace it report higher productivity and lower staff turnover.", question: "What happens to companies that don't offer remote work?", options: ["They save more money on office space", "They struggle to find talented workers", "Their employees become more productive", "They report lower staff turnover"], answer: "They struggle to find talented workers" },
  { id: "c-b2-1", level: "B2", type: "mc", passage: "The paradox of choice suggests that having more options does not necessarily lead to greater satisfaction. In fact, an abundance of choices can cause decision paralysis — a state where individuals become so overwhelmed by possibilities that they fail to make any decision at all. Furthermore, even when a decision is made, the awareness of unchosen alternatives can generate lingering regret.", question: "What does 'decision paralysis' mean in this passage?", options: ["Making quick decisions without thinking", "Being physically unable to move", "Feeling unable to choose because there are too many options", "Regretting a decision after making it"], answer: "Feeling unable to choose because there are too many options" },
];

const LISTENING = [
  // A1
  { id: "l-a1-1", level: "A1", audio: "/audio/voice-a1.mp3", question: "How does the person truly feel about the bus being late?", options: ["They hate it because it makes them late for work", "They don't mind it because it gives them time to rest", "They enjoy it because they can eat breakfast on the bus", "They are confused because the bus is never on time"], answer: 1 },
  { id: "l-a1-2", level: "A1", audio: "/audio/voice-a1.mp3", question: "What does the narrator do during the morning commute?", options: ["Eat a big breakfast and read the news", "Drink coffee, run to the bus, and sleep on the way", "Walk slowly while listening to music", "Take a taxi to avoid being late"], answer: 1 },
  { id: "l-a1-3", level: "A1", audio: "/audio/voice-a1-a2.mp3", question: "Why didn't the person buy any shoes?", options: ["They decided they didn't need new shoes after all", "The store was closed when they arrived", "They only like wearing sneakers", "The nice shoes were too expensive and the cheap ones were uncomfortable"], answer: 3 },
  // A2
  { id: "l-a2-1", level: "A2", audio: "/audio/voice-a2.mp3", question: "What is the real reason the person left the dishes in the sink?", options: ["They wanted to relax and watch their game because it was getting late", "They broke the kitchen light and couldn't see to clean", "They expected someone else to wash them", "They realized they needed to buy soap the next morning"], answer: 0 },
  { id: "l-a2-2", level: "A2", audio: "/audio/voice-a2.mp3", question: "What can be inferred about the narrator's priorities at that moment?", options: ["They felt guilty about not cleaning up", "They valued their own comfort and leisure over the chore", "They planned to wake up early and do the dishes", "They were angry about having to cook dinner"], answer: 1 },
  { id: "l-a2-3", level: "A2", audio: "/audio/voice-a2-b1.mp3", question: "What can be inferred about Sarah's departure from the party?", options: ["She suddenly became very ill and needed medical attention", "She was not enjoying the loud crowded environment", "Her brother had an emergency and forced her to leave", "She was angry because the host played bad music"], answer: 1 },
  // B1
  { id: "l-b1-1", level: "B1", audio: "/audio/voice-b1.mp3", question: "What is the underlying problem the narrator is facing in the new office?", options: ["They are unhappy that the new office is too far from home", "They dislike the taste of the new espresso machine", "The open office design lacks the privacy and quiet needed to concentrate", "They are trying to avoid a specific coworker"], answer: 2 },
  { id: "l-b1-2", level: "B1", audio: "/audio/voice-b1.mp3", question: "Why did the narrator schedule a meeting with their manager?", options: ["To complain about the printer placement", "To request permission to work remotely on certain days", "To ask for a desk relocation away from the hallway", "To discuss getting a promotion"], answer: 1 },
  { id: "l-b1-3", level: "B1", audio: "/audio/voice-b1-b2.mp3", question: "Why did the narrator suggest taking the train instead of driving?", options: ["They wanted to enjoy the snowy scenery without focusing on the road", "They recognized that driving in heavy snow would be dangerous", "They thought the extra bags would be too heavy for the car", "Their partner dislikes driving long distances in winter"], answer: 1 },
  // B2
  { id: "l-b2-1", level: "B2", audio: "/audio/voice-b2.mp3", question: "What do the senior employees anticipate will happen after the merger?", options: ["They expect to be promoted to middle management", "They anticipate that the merger will result in layoffs", "They think the CEO is planning to leave the company", "They believe the rival firm will cancel the merger"], answer: 1 },
  { id: "l-b2-2", level: "B2", audio: "/audio/voice-b2.mp3", question: "Why are the senior employees speaking in hushed tones?", options: ["They don't want the CEO to hear their concerns", "They are discussing a secret project", "They are afraid of being overheard by rival firm spies", "The breakroom has a quiet policy"], answer: 0 },
  { id: "l-b2-3", level: "B2", audio: "/audio/voice-b2.mp3", question: "What does the CEO's enthusiastic email suggest?", options: ["The company is honestly preparing employees for changes", "The company is using positive language to hide potential negative outcomes", "The company wants everyone to celebrate the merger", "The company is excited about new business partnerships"], answer: 1 },
  // C1
  { id: "l-c1-1", level: "C1", audio: "/audio/voice-c1.mp3", question: "What is the implicit message regarding the restaurant's business practices?", options: ["The restaurant is expanding to serve out-of-state customers", "The owner is buying the regional farms to ensure supply", "The restaurant relies on commercial suppliers despite its local branding", "The restaurant's farm-to-table marketing is deceptive"], answer: 3 },
  { id: "l-c1-2", level: "C1", audio: "/audio/voice-c1.mp3", question: "How does the owner's response to the food blogger reveal the truth?", options: ["It demonstrates a genuine commitment to quality ingredients", "The vague justification suggests an attempt to deflect scrutiny", "It shows the restaurant is transparent about its supply chain", "The owner is proud of the seasonal menu variety"], answer: 1 },
  { id: "l-c1-3", level: "C1", audio: "/audio/voice-c1-c2.mp3", question: "What is the author's primary underlying criticism of the new library project?", options: ["It prioritized modern aesthetics over essential community support services", "The glass and steel design is inferior to the historic brick building", "The politicians failed to provide enough books for the library", "The silent atmosphere is too intimidating for local children"], answer: 0 },
  // C2
  { id: "l-c2-1", level: "C2", audio: "/audio/voice-c2.mp3", question: "According to the passage, what was the actual result of the educational reform?", options: ["A truly equal educational system that closed the socioeconomic gap", "Higher levels of critical thinking among students", "The complete abandonment of standardized testing", "A superficial statistical success that stifled genuine learning"], answer: 3 },
  { id: "l-c2-2", level: "C2", audio: "/audio/voice-c2.mp3", question: "What does the author imply about the phrase 'standardize excellence'?", options: ["It accurately describes the reform's successful outcomes", "It is a misleading slogan used to promote a flawed policy", "It represents a breakthrough in educational measurement", "It helped teachers focus on what matters most"], answer: 1 },
  { id: "l-c2-3", level: "C2", audio: "/audio/voice-c2.mp3", question: "What was the 'profound unmeasured casualty' of the reform?", options: ["The loss of funding for arts programs", "The decline in teacher morale and retention", "The sacrifice of intellectual curiosity and deep learning", "The increase in dropout rates among disadvantaged students"], answer: 2 },
];

const FAKE_WORD_QUESTIONS = [
  {
    id: "fw-b2-1", level: "B2", type: "fake_word_hunt", timeLimit: 600,
    instructions: "Read carefully. Find the 4 words that DO NOT exist in real English. They follow English patterns but are invented.",
    passage: "The research team carefully documented their observations over several months. Each member was responsible for a specific area of the study. The lead scientist, known for her meticulous approach, reviewed every report with great thorness. Her colleagues admired her dedicacy to the project, even when the work became repetulous and tiring. Despite the challenges, the team maintained their professionness throughout.",
    fakeWords: ["thorness", "dedicacy", "repetulous", "professionness"],
    wordCount: 4
  },
  {
    id: "fw-c1-1", level: "C1", type: "fake_word_hunt", timeLimit: 600,
    instructions: "Read carefully. Find the 7 words that DO NOT exist in real English.",
    passage: "The philosopher's central argument rested on the notion that human consciousness is fundamentally unresolvable — not merely complex, but resistant to any framework that seeks to overclarify it. Critics argued this position was overly disemphasive of scientific progress, preferring a more rationalistic approach. Yet the philosopher remained unconvinced, insisting that to underlook the subjective dimension of experience was to misrepresent reality entirely. His supporters praised the intricateness of his reasoning, while opponents dismissed it as obfuscation. The debate ultimately remained unsolvated — a testament to the enduring difficultness of questions at the intersection of mind and meaning.",
    fakeWords: ["unresolvable", "overclarify", "disemphasive", "underlook", "intricateness", "unsolvated", "difficultness"],
    wordCount: 7
  },
  {
    id: "fw-c2-1", level: "C2", type: "fake_word_hunt", timeLimit: 600,
    instructions: "Read carefully. Find the 10 words that DO NOT exist in real English. These are extremely difficult — they look and sound completely real.",
    passage: "Contemporary discourse on artificial intelligence has grown increasingly polarific, with commentators either embracing its transformative potential or decrying what they perceive as an existential menace. The most thoughtive analysts, however, resist such binary framings, arguing instead for a more granulistic understanding of how these systems will reshape labor, creativity, and cognition. One must not disregard the epistemic humilitude required when navigating questions of such scope — to speak with unqualified certainness is itself a form of intellectric dishonesty. The technologism of our era demands not passivation but active engagement: a willingness to interrogate assumptions, to sit with ambiguance, and to resist the allure of oversimplistic narratives. Those who cultivate this kind of cogitative discipline will be better positioned to navigate the uncertainties ahead.",
    fakeWords: ["polarific", "thoughtive", "granulistic", "humilitude", "certainness", "intellectric", "passivation", "ambiguance", "cogitative", "technologism"],
    wordCount: 10
  }
];

const DETECTIVE_STAGES = [
  { stage: 1, targetLevel: "A1-A2", line: "Hello. What is your name and where do you work?" },
  { stage: 2, targetLevel: "A2-B1", line: "Were you in the office yesterday afternoon? What were you doing between two and four o'clock?" },
  { stage: 3, targetLevel: "B1-B2", line: "Did you notice anything unusual yesterday? Someone acting strangely, perhaps? Take your time." },
  { stage: 4, targetLevel: "B2-C1", line: "Interesting. You mentioned a colleague behaving oddly. Hypothetically — if you had to guess why someone might take that briefcase, what would your theory be?" },
  { stage: 5, targetLevel: "C1-C2", line: "One final question — in your professional opinion, how could this company's internal security protocols be improved to prevent incidents like this?" },
];

// ─── ADAPTIVE ENGINE ─────────────────────────────────────────────────────────
function getQuestionsForSection(bank, level) {
  const levelIndex = LEVELS.indexOf(level);
  const pool = bank.filter(q => {
    const qIndex = LEVELS.indexOf(q.level);
    return Math.abs(qIndex - levelIndex) <= 1;
  });
  return pool.sort(() => Math.random() - 0.5).slice(0, 2);
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  wrap: { minHeight: "100vh", background: "#0f0f14", color: "#e8e6f0", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 80px" },
  header: { width: "100%", maxWidth: 680, padding: "32px 0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: "#c4b5fd" },
  progressBar: { width: "100%", maxWidth: 680, height: 4, background: "#1e1e2e", borderRadius: 2, marginBottom: 32, overflow: "hidden" },
  progressFill: (pct) => ({ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)", borderRadius: 2, transition: "width 0.4s ease" }),
  card: { width: "100%", maxWidth: 680, background: "#16161f", borderRadius: 20, padding: "32px 28px", border: "1px solid #2a2a3a", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" },
  sectionTag: { display: "inline-block", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#7c3aed", background: "#1e1030", padding: "4px 10px", borderRadius: 6, marginBottom: 20 },
  levelBadge: { display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#a78bfa", background: "#1a1030", padding: "3px 8px", borderRadius: 4, marginLeft: 8 },
  passage: { background: "#1a1a27", borderLeft: "3px solid #7c3aed", borderRadius: "0 12px 12px 0", padding: "16px 20px", marginBottom: 24, fontSize: 15, lineHeight: 1.8, color: "#d4d0e8" },
  question: { fontSize: 18, fontWeight: 600, lineHeight: 1.6, marginBottom: 28, color: "#f0eeff" },
  optionBtn: (selected, correct, wrong, disabled) => ({
    width: "100%", textAlign: "left", padding: "14px 18px", marginBottom: 10,
    borderRadius: 12, border: `2px solid ${correct ? "#22c55e" : wrong ? "#ef4444" : selected ? "#7c3aed" : "#2a2a3a"}`,
    background: correct ? "#052e16" : wrong ? "#2d0a0a" : selected ? "#1e1030" : "#1a1a27",
    color: correct ? "#86efac" : wrong ? "#fca5a5" : "#e8e6f0",
    fontSize: 15, cursor: disabled ? "default" : "pointer",
    transition: "all 0.15s ease", fontFamily: "inherit", fontWeight: selected || correct || wrong ? 600 : 400,
    display: "flex", alignItems: "center", gap: 12
  }),
  optionLetter: (selected, correct, wrong) => ({
    width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
    background: correct ? "#22c55e22" : wrong ? "#ef444422" : selected ? "#7c3aed33" : "#ffffff11",
    color: correct ? "#22c55e" : wrong ? "#ef4444" : selected ? "#a78bfa" : "#888",
    fontSize: 12, fontWeight: 700, flexShrink: 0
  }),
  feedbackBox: (correct) => ({
    marginTop: 16, padding: "14px 18px", borderRadius: 12,
    background: correct ? "#052e16" : "#2d0a0a",
    border: `1px solid ${correct ? "#22c55e33" : "#ef444433"}`,
    fontSize: 14, color: correct ? "#86efac" : "#fca5a5", lineHeight: 1.6
  }),
  nextBtn: { marginTop: 24, width: "100%", padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #7c3aed, #a78bfa)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: 0.3 },
  timerBox: (urgent) => ({ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: urgent ? "#2d0a0a" : "#1a1a27", border: `1px solid ${urgent ? "#ef4444" : "#2a2a3a"}`, color: urgent ? "#ef4444" : "#a78bfa", fontSize: 14, fontWeight: 600, marginBottom: 20 }),
  textArea: { width: "100%", background: "#1a1a27", border: "2px solid #2a2a3a", borderRadius: 12, padding: "14px 16px", color: "#e8e6f0", fontSize: 15, lineHeight: 1.7, resize: "vertical", minHeight: 120, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  detectiveBubble: { background: "#1e1030", border: "1px solid #3a2a5a", borderRadius: "0 16px 16px 16px", padding: "16px 20px", marginBottom: 24, fontSize: 15, lineHeight: 1.7, color: "#d4d0e8", position: "relative" },
  detectiveLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#7c3aed", textTransform: "uppercase", marginBottom: 8 },
  resultCard: { textAlign: "center", padding: "40px 28px" },
  levelDisplay: { fontSize: 72, fontWeight: 900, letterSpacing: -3, background: "linear-gradient(135deg, #7c3aed, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 },
  resultLabel: { fontSize: 14, color: "#888", marginTop: 8, marginBottom: 32 },
  skillGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24 },
  skillBox: { background: "#1a1a27", borderRadius: 12, padding: "14px 16px", border: "1px solid #2a2a3a" },
  skillName: { fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  skillLevel: { fontSize: 20, fontWeight: 800, color: "#a78bfa" },
  startCard: { textAlign: "center", padding: "48px 28px" },
  startTitle: { fontSize: 36, fontWeight: 900, letterSpacing: -1.5, color: "#f0eeff", marginBottom: 12 },
  startSub: { fontSize: 16, color: "#888", lineHeight: 1.6, marginBottom: 40, maxWidth: 400, margin: "0 auto 40px" },
  startBtn: { padding: "16px 48px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #7c3aed, #a78bfa)", color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer", letterSpacing: 0.3 },
  infoRow: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 40, flexWrap: "wrap" },
  infoPill: { padding: "8px 16px", borderRadius: 20, background: "#1e1e2e", border: "1px solid #2a2a3a", fontSize: 13, color: "#a78bfa", fontWeight: 500 },
};

const LETTERS = ["A", "B", "C", "D"];
const SECTIONS = ["vocabulary", "grammar", "comprehension", "listening", "writing"];
const SECTION_LABELS = { vocabulary: "Vocabulary", grammar: "Grammar", comprehension: "Comprehension", listening: "Listening", writing: "Writing" };

// ─── TIMER COMPONENT ─────────────────────────────────────────────────────────
function Timer({ seconds, onExpire }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) { onExpire(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const m = Math.floor(left / 60);
  const s = left % 60;
  const urgent = left < 60;
  return (
    <div style={S.timerBox(urgent)}>
      <span>⏱</span>
      <span>{m}:{s.toString().padStart(2, "0")} left</span>
      {urgent && <span style={{ fontSize: 11 }}>— hurry up</span>}
    </div>
  );
}

// ─── FAKE WORD HUNT COMPONENT ─────────────────────────────────────────────────
function FakeWordHunt({ question, onAnswer }) {
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [expired, setExpired] = useState(false);

  const words = question.passage.split(/(\s+|[.,—\-–])/).filter(w => w.trim().length > 0);
  const cleanWord = (w) => w.replace(/[^a-zA-Z]/g, "");

  const toggle = (word) => {
    if (submitted || expired) return;
    const clean = cleanWord(word);
    if (!clean) return;
    setSelected(prev =>
      prev.includes(clean) ? prev.filter(w => w !== clean) : prev.length < question.wordCount ? [...prev, clean] : prev
    );
  };

  const submit = () => {
    if (selected.length !== question.wordCount) return;
    setSubmitted(true);
    const correct = question.fakeWords.filter(w => selected.map(s => s.toLowerCase()).includes(w.toLowerCase())).length;
    onAnswer({ correct, total: question.wordCount, selected });
  };

  const isSelected = (w) => selected.map(s => s.toLowerCase()).includes(cleanWord(w).toLowerCase());
  const isFake = (w) => question.fakeWords.map(f => f.toLowerCase()).includes(cleanWord(w).toLowerCase());

  return (
    <div>
      <Timer seconds={question.timeLimit} onExpire={() => { setExpired(true); onAnswer({ correct: 0, total: question.wordCount, selected, expired: true }); }} />
      <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
        Select exactly <strong style={{ color: "#a78bfa" }}>{question.wordCount}</strong> fake words. Selected: {selected.length}/{question.wordCount}
      </p>
      <div style={{ lineHeight: 2.2, fontSize: 16, color: "#d4d0e8" }}>
        {question.passage.split(/\s+/).map((rawWord, i) => {
          const clean = cleanWord(rawWord);
          const sel = isSelected(rawWord);
          const fake = submitted && isFake(rawWord);
          const wrongSel = submitted && sel && !isFake(rawWord);
          return (
            <span key={i}>
              <span
                onClick={() => toggle(rawWord)}
                style={{
                  cursor: submitted || expired ? "default" : "pointer",
                  padding: "2px 4px", borderRadius: 4,
                  background: fake ? "#22c55e22" : wrongSel ? "#ef444422" : sel ? "#7c3aed33" : "transparent",
                  border: fake ? "1px solid #22c55e" : wrongSel ? "1px solid #ef4444" : sel ? "1px solid #7c3aed" : "1px solid transparent",
                  color: fake ? "#86efac" : wrongSel ? "#fca5a5" : sel ? "#c4b5fd" : "#d4d0e8",
                  transition: "all 0.1s",
                  textDecoration: sel && !submitted ? "underline" : "none",
                  fontWeight: sel || fake ? 600 : 400,
                }}
              >{rawWord}</span>
              {" "}
            </span>
          );
        })}
      </div>
      {!submitted && !expired && (
        <button
          style={{ ...S.nextBtn, opacity: selected.length === question.wordCount ? 1 : 0.4 }}
          onClick={submit}
          disabled={selected.length !== question.wordCount}
        >
          Submit — {selected.length}/{question.wordCount} selected
        </button>
      )}
    </div>
  );
}

// ─── DETECTIVE WRITING COMPONENT ─────────────────────────────────────────────
function DetectiveWriting({ userLevel, onComplete }) {
  const stagesForLevel = () => {
    const li = LEVELS.indexOf(userLevel);
    if (li <= 1) return DETECTIVE_STAGES.slice(0, 2);
    if (li === 2) return DETECTIVE_STAGES.slice(0, 3);
    if (li === 3) return DETECTIVE_STAGES.slice(0, 4);
    return DETECTIVE_STAGES;
  };

  const stages = stagesForLevel();
  const [stageIndex, setStageIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [current, setCurrent] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const stage = stages[stageIndex];

  const evaluate = async () => {
    if (!current.trim()) return;
    setEvaluating(true);
    // Placeholder evaluation — Groq will replace this
    await new Promise(r => setTimeout(r, 1200));
    const wordCount = current.trim().split(/\s+/).length;
    const hasGoodStructure = current.includes(",") || current.includes(".") || wordCount > 8;
    const verdict = wordCount < 4 ? "BELOW" : hasGoodStructure ? "CORRECT" : "PARTIAL";
    setFeedback({
      verdict,
      message: verdict === "CORRECT"
        ? "Good response. Clear and well-structured."
        : verdict === "PARTIAL"
        ? "You answered but could add more detail."
        : "Try to write a complete sentence.",
    });
    setEvaluating(false);
  };

  const next = () => {
    setResponses(prev => [...prev, { stage: stage.stage, response: current, verdict: feedback?.verdict }]);
    if (stageIndex + 1 >= stages.length) {
      onComplete(responses);
    } else {
      setStageIndex(i => i + 1);
      setCurrent("");
      setFeedback(null);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
        Stage {stageIndex + 1} of {stages.length} — {stage.targetLevel}
      </div>
      <div style={S.detectiveBubble}>
        <div style={S.detectiveLabel}>🕵️ Detective Harris</div>
        <div style={{ fontStyle: "italic" }}>"{stage.line}"</div>
      </div>
      <textarea
        style={S.textArea}
        placeholder="Type your response here..."
        value={current}
        onChange={e => setCurrent(e.target.value)}
        disabled={!!feedback || evaluating}
      />
      {feedback && (
        <div style={S.feedbackBox(feedback.verdict === "CORRECT")}>
          {feedback.verdict === "CORRECT" ? "✓ " : feedback.verdict === "PARTIAL" ? "◐ " : "✗ "}
          {feedback.message}
        </div>
      )}
      {!feedback && (
        <button style={{ ...S.nextBtn, opacity: current.trim() && !evaluating ? 1 : 0.4 }} onClick={evaluate} disabled={!current.trim() || evaluating}>
          {evaluating ? "Evaluating..." : "Submit Response"}
        </button>
      )}
      {feedback && (
        <button style={S.nextBtn} onClick={next}>
          {stageIndex + 1 >= stages.length ? "Finish Test" : "Next Question →"}
        </button>
      )}
    </div>
  );
}

// ─── RESULTS SCREEN ───────────────────────────────────────────────────────────
function Results({ scores, totalScore }) {
  const finalLevel = () => {
    if (totalScore >= 90) return "C2";
    if (totalScore >= 80) return "C1";
    if (totalScore >= 66) return "B2";
    if (totalScore >= 46) return "B1";
    if (totalScore >= 26) return "A2";
    return "A1";
  };

  const level = finalLevel();
  const descriptions = {
    A1: "You're just starting out. Every expert was once a beginner.",
    A2: "You know the basics. Now it's time to build.",
    B1: "You can communicate. Let's sharpen the details.",
    B2: "You're independent. Push toward fluency.",
    C1: "You're advanced. Work on mastery and precision.",
    C2: "Near-native. You think in English."
  };

  return (
    <div style={S.resultCard}>
      <div style={{ fontSize: 13, color: "#666", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Your English Level</div>
      <div style={S.levelDisplay}>{level}</div>
      <div style={S.resultLabel}>{descriptions[level]}</div>

      <div style={S.skillGrid}>
        {Object.entries(scores).map(([section, data]) => (
          <div key={section} style={S.skillBox}>
            <div style={S.skillName}>{SECTION_LABELS[section] || section}</div>
            <div style={S.skillLevel}>{data.level || "—"}</div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{data.correct}/{data.total} correct</div>
          </div>
        ))}
      </div>

      <button style={{ ...S.nextBtn, marginTop: 32 }} onClick={() => window.location.reload()}>
        Take the test again
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PlacementTest() {
  const [phase, setPhase] = useState("start"); // start | test | results
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentLevel, setCurrentLevel] = useState("A2");
  const [streak, setStreak] = useState(0); // positive = correct streak, negative = wrong streak
  const [sectionQuestions, setSectionQuestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [scores, setScores] = useState({});
  const [sectionCorrect, setSectionCorrect] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  const section = SECTIONS[sectionIndex];

  const initSection = (sec, level) => {
    if (sec === "vocabulary") setSectionQuestions(getQuestionsForSection(VOCABULARY, level));
    else if (sec === "grammar") setSectionQuestions(getQuestionsForSection(GRAMMAR, level));
    else if (sec === "comprehension") {
      const li = LEVELS.indexOf(level);
      if (li >= 3) {
        const fw = FAKE_WORD_QUESTIONS.find(q => q.level === level) || FAKE_WORD_QUESTIONS[0];
        const mc = COMPREHENSION.filter(q => LEVELS.indexOf(q.level) <= li).slice(-1);
        setSectionQuestions([...mc, fw]);
      } else {
        setSectionQuestions(getQuestionsForSection(COMPREHENSION, level));
      }
    }
    else if (sec === "listening") setSectionQuestions(getQuestionsForSection(LISTENING, level));
    else if (sec === "writing") setSectionQuestions([{ id: "writing", type: "detective" }]);
  };

  const startTest = () => {
    setPhase("test");
    initSection(SECTIONS[0], "A2");
    setSectionIndex(0);
    setQuestionIndex(0);
    setCurrentLevel("A2");
  };

  const handleMCAnswer = (option) => {
    if (confirmed) return;
    setSelected(option);
  };

  const confirmAnswer = () => {
    if (!selected || confirmed) return;
    setConfirmed(true);
    const q = sectionQuestions[questionIndex];
    const correct = selected === q.answer;

    const points = { A1: 10, A2: 20, B1: 35, B2: 50, C1: 70, C2: 90 }[q.level] || 20;
    if (correct) setTotalScore(s => s + points);

    const newStreak = correct ? (streak >= 0 ? streak + 1 : 1) : (streak <= 0 ? streak - 1 : -1);
    setStreak(newStreak);
    if (correct) setSectionCorrect(s => s + 1);

    // Adaptive level change
    if (newStreak >= 2) {
      const li = LEVELS.indexOf(currentLevel);
      if (li < LEVELS.length - 1) setCurrentLevel(LEVELS[li + 1]);
      setStreak(0);
    } else if (newStreak <= -2) {
      const li = LEVELS.indexOf(currentLevel);
      if (li > 0) setCurrentLevel(LEVELS[li - 1]);
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    const isLastQuestion = questionIndex >= sectionQuestions.length - 1;
    if (isLastQuestion || sectionQuestions.length === 0) {
      // Record section score
      setScores(prev => ({
        ...prev,
        [section]: { correct: sectionCorrect, total: sectionQuestions.length, level: currentLevel }
      }));
      setSectionCorrect(0);

      if (sectionIndex >= SECTIONS.length - 1) {
        setPhase("results");
      } else {
        const nextSection = SECTIONS[sectionIndex + 1];
        setSectionIndex(i => i + 1);
        setQuestionIndex(0);
        setSelected(null);
        setConfirmed(false);
        initSection(nextSection, currentLevel);
      }
    } else {
      setQuestionIndex(i => i + 1);
      setSelected(null);
      setConfirmed(false);
    }
  };

  const progress = phase === "test"
    ? ((sectionIndex * 20) + ((questionIndex / Math.max(sectionQuestions.length, 1)) * 20))
    : phase === "results" ? 100 : 0;

  const currentQ = sectionQuestions[questionIndex];
  const isListening = section === "listening";
  const isWriting = section === "writing";
  const isFakeWord = currentQ?.type === "fake_word_hunt";
  const isDetective = currentQ?.type === "detective";

  if (phase === "start") {
    return (
      <div style={S.wrap}>
        <div style={S.header}>
          <div style={S.logo}>engrow</div>
        </div>
        <div style={{ ...S.card, ...S.startCard }}>
          <div style={S.startTitle}>Find your level.</div>
          <p style={{ ...S.startSub, color: "#888", fontSize: 15, lineHeight: 1.7, maxWidth: 400, margin: "0 auto 32px" }}>
            25 questions across vocabulary, grammar, comprehension, listening, and writing.
            Gets harder as you go. Takes about 15 minutes.
          </p>
          <div style={S.infoRow}>
            {["5 sections", "Adaptive difficulty", "~15 minutes", "A1 → C2"].map(t => (
              <div key={t} style={S.infoPill}>{t}</div>
            ))}
          </div>
          <button style={S.startBtn} onClick={startTest}>Start the test →</button>
        </div>
      </div>
    );
  }

  if (phase === "results") {
    return (
      <div style={S.wrap}>
        <div style={S.header}><div style={S.logo}>engrow</div></div>
        <div style={S.card}>
          <Results scores={scores} totalScore={totalScore} />
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={S.logo}>engrow</div>
        <div style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>
          {sectionIndex + 1} / {SECTIONS.length}
        </div>
      </div>

      <div style={S.progressBar}>
        <div style={S.progressFill(progress)} />
      </div>

      <div style={S.card}>
        <div>
          <span style={S.sectionTag}>{SECTION_LABELS[section]}</span>
          <span style={S.levelBadge}>{currentLevel}</span>
        </div>

        {/* LISTENING */}
        {isListening && currentQ && (
          <div>
            <div style={{ background: "#1a1a27", borderRadius: 14, padding: "20px", marginBottom: 24, border: "1px solid #2a2a3a" }}>
              <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>🎧 Listen carefully</div>
              <audio
                controls
                src={`https://engrow-1.onrender.com${currentQ.audio}`}
                style={{ width: "100%", borderRadius: 8, accentColor: "#7c3aed" }}
              />
              <div style={{ fontSize: 12, color: "#555", marginTop: 10 }}>You can replay the audio as many times as you need.</div>
            </div>
            <div style={S.question}>{currentQ.question}</div>
            {currentQ.options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = confirmed && i === currentQ.answer;
              const isWrong = confirmed && isSelected && i !== currentQ.answer;
              return (
                <button key={i} style={S.optionBtn(isSelected, isCorrect, isWrong, confirmed)} onClick={() => !confirmed && setSelected(i)}>
                  <span style={S.optionLetter(isSelected, isCorrect, isWrong)}>{LETTERS[i]}</span>
                  {opt}
                  {isCorrect && <span style={{ marginLeft: "auto" }}>✓</span>}
                  {isWrong && <span style={{ marginLeft: "auto" }}>✗</span>}
                </button>
              );
            })}
            {confirmed && (
              <div style={S.feedbackBox(selected === currentQ.answer)}>
                {selected === currentQ.answer ? "✓ Correct." : `✗ The correct answer is: "${currentQ.options[currentQ.answer]}"`}
              </div>
            )}
            {!confirmed && (
              <button style={{ ...S.nextBtn, opacity: selected !== null ? 1 : 0.35 }} onClick={() => {
                if (selected === null) return;
                setConfirmed(true);
                const correct = selected === currentQ.answer;
                const points = { A1: 10, A2: 20, B1: 35, B2: 50, C1: 70, C2: 90 }[currentQ.level] || 20;
                if (correct) { setTotalScore(s => s + points); setSectionCorrect(c => c + 1); }
                const newStreak = correct ? (streak >= 0 ? streak + 1 : 1) : (streak <= 0 ? streak - 1 : -1);
                setStreak(newStreak);
                if (newStreak >= 2) { const li = LEVELS.indexOf(currentLevel); if (li < LEVELS.length - 1) setCurrentLevel(LEVELS[li + 1]); setStreak(0); }
                else if (newStreak <= -2) { const li = LEVELS.indexOf(currentLevel); if (li > 0) setCurrentLevel(LEVELS[li - 1]); setStreak(0); }
              }} disabled={selected === null}>
                Confirm answer
              </button>
            )}
            {confirmed && (
              <button style={S.nextBtn} onClick={nextQuestion}>
                {questionIndex >= sectionQuestions.length - 1 ? `Next: ${SECTION_LABELS[SECTIONS[sectionIndex + 1]] || "Results"} →` : "Next question →"}
              </button>
            )}
          </div>
        )}

        {/* DETECTIVE WRITING */}
        {isDetective && (
          <div>
            <div style={S.question}>The Missing Briefcase — Detective Roleplay</div>
            <DetectiveWriting userLevel={currentLevel} onComplete={(responses) => {
              setScores(prev => ({ ...prev, writing: { correct: responses.filter(r => r.verdict === "CORRECT").length, total: responses.length, level: currentLevel } }));
              nextQuestion();
            }} />
          </div>
        )}

        {/* FAKE WORD HUNT */}
        {isFakeWord && !isDetective && (
          <div>
            <div style={S.question}>{currentQ.instructions}</div>
            <FakeWordHunt question={currentQ} onAnswer={({ correct, total }) => {
              const points = { B2: 50, C1: 70, C2: 90 }[currentQ.level] || 50;
              setTotalScore(s => s + Math.round((correct / total) * points));
              setSectionCorrect(c => c + (correct === total ? 1 : 0));
              setConfirmed(true);
            }} />
            {confirmed && <button style={S.nextBtn} onClick={nextQuestion}>Next →</button>}
          </div>
        )}

        {/* STANDARD MC */}
        {!isListening && !isDetective && !isFakeWord && currentQ && (
          <div>
            {currentQ.passage && <div style={S.passage}>{currentQ.passage}</div>}
            <div style={S.question}>{currentQ.question}</div>

            {currentQ.options.map((opt, i) => {
              const isSelected = selected === opt;
              const isCorrect = confirmed && opt === currentQ.answer;
              const isWrong = confirmed && isSelected && opt !== currentQ.answer;
              return (
                <button
                  key={opt}
                  style={S.optionBtn(isSelected, isCorrect, isWrong, confirmed)}
                  onClick={() => handleMCAnswer(opt)}
                >
                  <span style={S.optionLetter(isSelected, isCorrect, isWrong)}>{LETTERS[i]}</span>
                  {opt}
                  {isCorrect && <span style={{ marginLeft: "auto", fontSize: 16 }}>✓</span>}
                  {isWrong && <span style={{ marginLeft: "auto", fontSize: 16 }}>✗</span>}
                </button>
              );
            })}

            {confirmed && (
              <div style={S.feedbackBox(selected === currentQ.answer)}>
                {selected === currentQ.answer
                  ? "✓ Correct."
                  : `✗ The correct answer is: "${currentQ.answer}"`}
              </div>
            )}

            {!confirmed && (
              <button
                style={{ ...S.nextBtn, opacity: selected ? 1 : 0.35 }}
                onClick={confirmAnswer}
                disabled={!selected}
              >
                Confirm answer
              </button>
            )}

            {confirmed && (
              <button style={S.nextBtn} onClick={nextQuestion}>
                {questionIndex >= sectionQuestions.length - 1 ? `Next: ${SECTION_LABELS[SECTIONS[sectionIndex + 1]] || "Results"} →` : "Next question →"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
