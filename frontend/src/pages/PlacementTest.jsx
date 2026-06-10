import { useState, useRef } from "react";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const GRAMMAR = [
  { id:"gr-a1-1", level:"A1", question:"I ___ from Tunisia, but I live in Paris now.", options:["am","is","are","be"], answer:"am" },
  { id:"gr-a1-2", level:"A1", question:"My brother ___ like to eat fish.", options:["don't","doesn't","isn't","aren't"], answer:"doesn't" },
  { id:"gr-a1-3", level:"A1", question:"There ___ three apples on the table.", options:["is","are","am","be"], answer:"are" },
  { id:"gr-a1-4", level:"A1", question:"Whose jacket is this? It is ___.", options:["my","me","mine","I"], answer:"mine" },
  { id:"gr-a1-5", level:"A1", question:"We have English class ___ Tuesday mornings.", options:["on","in","at","by"], answer:"on" },
  { id:"gr-a1-6", level:"A1", question:"She ___ in a bank near the city center.", options:["work","works","working","worked"], answer:"works" },
  { id:"gr-a2-1", level:"A2", question:"This phone is ___ than my old one.", options:["more expensive","expensiver","most expensive","the most expensive"], answer:"more expensive" },
  { id:"gr-a2-2", level:"A2", question:"I was reading when the phone suddenly ___.", options:["ring","rang","was ringing","has rung"], answer:"rang" },
  { id:"gr-a2-3", level:"A2", question:"You ___ park here — it is an emergency exit.", options:["don't have to","mustn't","needn't","shouldn't have to"], answer:"mustn't" },
  { id:"gr-a2-4", level:"A2", question:"She hasn't seen her friend ___ three years.", options:["since","for","in","during"], answer:"for" },
  { id:"gr-a2-5", level:"A2", question:"If it rains tomorrow, we ___ inside and watch a movie.", options:["stay","will stay","would stay","stayed"], answer:"will stay" },
  { id:"gr-a2-6", level:"A2", question:"While we ___ in the park, we saw a rare bird.", options:["walked","were walking","are walking","walk"], answer:"were walking" },
  { id:"gr-b1-1", level:"B1", question:"By the time we arrived, the film ___ already.", options:["started","has already started","had already started","was starting already"], answer:"had already started" },
  { id:"gr-b1-2", level:"B1", question:"You won't pass the exam ___ you study harder.", options:["if","unless","incase","although"], answer:"unless" },
  { id:"gr-b1-3", level:"B1", question:"She asked me where ___.", options:["was the station","the station was","is the station","the station is being"], answer:"the station was" },
  { id:"gr-b1-4", level:"B1", question:"I am really looking forward ___ you at the conference.", options:["to see","to seeing","seeing","for seeing"], answer:"to seeing" },
  { id:"gr-b1-5", level:"B1", question:"The bridge ___ by the Romans two thousand years ago.", options:["built","was built","has been built","is built"], answer:"was built" },
  { id:"gr-b1-6", level:"B1", question:"If I ___ you, I would tell her the truth immediately.", options:["am","was","were","had been"], answer:"were" },
  { id:"gr-b2-1", level:"B2", question:"He is believed ___ the country under a false name last week.", options:["to leave","to be leaving","to have left","having left"], answer:"to have left" },
  { id:"gr-b2-2", level:"B2", question:"The company, ___ headquarters are in Geneva, announced a layoff.", options:["which","that","whose","who"], answer:"whose" },
  { id:"gr-b2-3", level:"B2", question:"I'd rather we ___ this privately rather than in front of the team.", options:["discuss","discussed","have discussed","will discuss"], answer:"discussed" },
  { id:"gr-b2-4", level:"B2", question:"Despite ___ overtime every day, she still couldn't meet the deadline.", options:["to work","working","worked","having to work"], answer:"working" },
  { id:"gr-b2-5", level:"B2", question:"The manager insisted that all employees ___ formal attire to the gala.", options:["wear","wore","wearing","to wear"], answer:"wear" },
  { id:"gr-b2-6", level:"B2", question:"It's high time you ___ your career more seriously.", options:["start","started","will start","have started"], answer:"started" },
  { id:"gr-b2-7", level:"B2", question:"The project would have succeeded if the team ___ the error earlier.", options:["caught","would catch","had caught","has caught"], answer:"had caught" },
  { id:"gr-c1-1", level:"C1", question:"Scarcely ___ down to dinner when the phone rang urgently.", options:["had she sat","she had sat","did she sit","she sat"], answer:"had she sat" },
  { id:"gr-c1-2", level:"C1", question:"I was at a disadvantage ___ that I lacked the software training required.", options:["for","in","by","at"], answer:"in" },
  { id:"gr-c1-3", level:"C1", question:"If you ___ happen to see Marco, tell him the meeting is canceled.", options:["will","should","would","could"], answer:"should" },
  { id:"gr-c1-4", level:"C1", question:"Not only ___ to deliver on time, but they also exceeded the budget.", options:["did they fail","they failed","had they failed","they did fail"], answer:"did they fail" },
  { id:"gr-c1-5", level:"C1", question:"But for your intervention, our startup ___ bankrupt months ago.", options:["would go","would have gone","had gone","was going"], answer:"would have gone" },
  { id:"gr-c1-6", level:"C1", question:"The suspect denied ___ in the robbery, claiming he was out of town.", options:["to involve","being involved","having involve","to be involved"], answer:"being involved" },
  { id:"gr-c2-1", level:"C2", question:"Her calm demeanor ___ the intense panic she was actually feeling.", options:["belied","exacerbated","bolstered","concealed"], answer:"belied" },
  { id:"gr-c2-2", level:"C2", question:"Be that as it ___, we still have a contractual obligation to fulfill.", options:["can","may","will","might"], answer:"may" },
  { id:"gr-c2-3", level:"C2", question:"The committee requires that the building ___ using sustainable materials.", options:["is","be","will be","has been"], answer:"be" },
  { id:"gr-c2-4", level:"C2", question:"He took umbrage ___ the implication that he had misled the shareholders.", options:["to","at","with","for"], answer:"at" },
  { id:"gr-c2-5", level:"C2", question:"___ it not for the capital injection, the firm would be in liquidation.", options:["Were","Had","Should","Would"], answer:"Were" },
  { id:"gr-c2-6", level:"C2", question:"She prides herself on ___ the same administrative mistake twice.", options:["never making","never make","not to make","never made"], answer:"never making" },
];

const VOCABULARY = [
  { id:"vo-a1-1", level:"A1", question:"I eat eggs and toast for ___ every morning.", options:["breakfast","dinner","supper","brunch"], answer:"breakfast" },
  { id:"vo-a1-2", level:"A1", question:"Please take your ___ because it is raining outside.", options:["umbrella","coat","hat","gloves"], answer:"umbrella" },
  { id:"vo-a1-3", level:"A1", question:"The train leaves from the central ___ in ten minutes.", options:["station","airport","port","terminal"], answer:"station" },
  { id:"vo-a2-1", level:"A2", question:"I can't find my keys ___; I have looked in every room.", options:["anywhere","everywhere","nowhere","somewhere"], answer:"anywhere" },
  { id:"vo-a2-2", level:"A2", question:"The flight attendant asked all the ___ to fasten their seatbelts.", options:["passengers","customers","clients","travellers"], answer:"passengers" },
  { id:"vo-a2-3", level:"A2", question:"Taking the bus is much ___ than taking a taxi to the airport.", options:["cheaper","less costly","affordable","economical"], answer:"cheaper" },
  { id:"vo-b1-1", level:"B1", question:"I didn't ___ how late it was until my alarm went off.", options:["realize","recognize","remind","recall"], answer:"realize" },
  { id:"vo-b1-2", level:"B1", question:"This is only a ___ solution; we need to fix it properly next week.", options:["temporary","short","brief","quick"], answer:"temporary" },
  { id:"vo-b1-3", level:"B1", question:"I can't ___ the ticket price for that concert right now.", options:["afford","spend","pay","manage"], answer:"afford" },
  { id:"vo-b2-1", level:"B2", question:"The outdoor festival had to be ___ due to the severe weather warnings.", options:["postponed","cancelled","suspended","delayed"], answer:"postponed" },
  { id:"vo-b2-2", level:"B2", question:"Having lived in Berlin for a decade, she now speaks German ___.", options:["fluently","perfectly","accurately","precisely"], answer:"fluently" },
  { id:"vo-b2-3", level:"B2", question:"If something is ___, it is open to more than one interpretation.", options:["ambiguous","vague","unclear","equivocal"], answer:"ambiguous" },
  { id:"vo-c1-1", level:"C1", question:"The con artist ___ the elderly couple out of their entire life savings.", options:["swindled","robbed","stole","cheated"], answer:"swindled" },
  { id:"vo-c1-2", level:"C1", question:"Despite our best efforts, he ___ arrives at least twenty minutes late.", options:["invariably","always","constantly","typically"], answer:"invariably" },
  { id:"vo-c1-3", level:"C1", question:"It is difficult to ___ the exact moment when public trust collapsed.", options:["pinpoint","identify","locate","determine"], answer:"pinpoint" },
  { id:"vo-c2-1", level:"C2", question:"In modern cities, surveillance cameras have become nearly ___.", options:["ubiquitous","prevalent","common","widespread"], answer:"ubiquitous" },
  { id:"vo-c2-2", level:"C2", question:"Refusing to sign the NDA is ___ to resigning from the firm.", options:["tantamount","equivalent","similar","comparable"], answer:"tantamount" },
  { id:"vo-c2-3", level:"C2", question:"Pouring water on a grease fire will only ___ the danger.", options:["exacerbate","worsen","increase","amplify"], answer:"exacerbate" },
];

const READING = [
  { id:"rd-a1-1", level:"A1", passage:"Anna works in a hospital from Monday to Friday. She usually wakes up at 6 AM, but on weekends she sleeps until 10 AM. She loves cooking Italian food. Last Saturday, she made pizza for her friends, but she didn't have any tomatoes, so she used extra cheese instead.", questions:[{ q:"What time does Anna wake up on Sunday?", options:["At 6 AM exactly","Before 6 AM","At 10 AM","Around noon"], answer:2 },{ q:"Why was Anna's pizza different last Saturday?", options:["She cooked Italian food","She missed an ingredient","She invited her friends","She worked all weekend"], answer:1 }] },
  { id:"rd-a2-1", level:"A2", passage:"When Mark started learning Spanish, he translated every word in his head. This made speaking very slow and stressful. His teacher suggested watching Spanish TV shows with subtitles and guessing the meaning of words from context. After three months, Mark still makes mistakes, but he feels much more comfortable talking to locals.", questions:[{ q:"What was Mark's initial problem with learning Spanish?", options:["He hated watching TV","He translated every word in his head","He couldn't find a good teacher","He had no time to practice"], answer:1 },{ q:"What is the result of following his teacher's advice?", options:["He never makes mistakes","He speaks faster but worse","He feels more confident speaking","He watches TV all day"], answer:2 }] },
  { id:"rd-b1-1", level:"B1", passage:"The shift towards remote work has altered how employees view productivity. Historically, managers equated time at the desk with actual work done. However, recent surveys show workers feel 30% more productive when they control their own schedules. Despite this data, many executives want to mandate a return to the office, citing a loss of company culture. Critics argue these executives are simply uncomfortable losing visible control over their staff.", questions:[{ q:"How did managers traditionally measure productivity?", options:["By quality of output","By time spent at their desk","By communication skills","By survey responses"], answer:1 },{ q:"What do critics believe is the real reason executives want staff back in the office?", options:["They miss company culture","They want to monitor employees directly","They want to increase workflow","They believe remote data is unreliable"], answer:1 }] },
  { id:"rd-b2-1", level:"B2", passage:"The integration of AI into creative industries has sparked fierce debate. Technologists champion these tools as democratising art, while professional artists warn that AI models are trained on copyrighted works without permission. Critics further suggest that overreliance on algorithmic generation will lead to a homogenisation of style — raw human creativity replaced by mathematically averaged, derivative content.", questions:[{ q:"Why do professional artists object to AI creative tools?", options:["The software is too difficult","AI exploits their work without permission","The art lacks emotion","They want everyone to paint manually"], answer:1 },{ q:"What does 'homogenisation of style' imply?", options:["Art becomes visually boring and uniform","Art becomes more diverse","AI perfectly replicates emotion","Artists will all use the same software"], answer:0 }] },
  { id:"rd-c1-1", level:"C1", passage:"The pervasive narrative that automation replaces only routine tasks while leaving cognitive work untouched is increasingly untenable. Advanced machine learning is encroaching on domains such as legal analysis, medical diagnostics, and creative writing. If an algorithmic tool can perform 80% of a junior associate's workload at a fraction of the cost, the structural incentive is not to upskill the associate, but to eliminate the role — thereby hollowing out the pipeline for future expertise.", questions:[{ q:"What is the primary argument against the optimists?", options:["They underestimate AI software costs","They fail to grasp corporate financial motives","They believe cognitive work is entirely safe","They assume professionals want to be upskilled"], answer:1 },{ q:"What does 'hollowing out the pipeline' suggest?", options:["Senior professionals will work harder","Office infrastructure will decline","Entry-level opportunities needed to develop experts will vanish","Companies will lose data"], answer:2 }] },
  { id:"rd-c2-1", level:"C2", passage:"The epistemological crisis of the digital age is not merely that falsehoods proliferate, but that the mechanisms by which a society arbitrates truth have been systematically undermined. When information is subject to algorithmic amplification based on engagement metrics rather than veracity, expertise itself is recast as partisan elitism. Attempting to counter misinformation with empirical fact-checking is practically futile — the opposing faction does not merely dispute the facts, but rejects the underlying institutional framework that generated them.", questions:[{ q:"What is the core issue of the epistemological crisis?", options:["Algorithms are too intelligent to control","Society no longer has a shared method for determining truth","Fact-checkers are biased and partisan","There is too much information on the internet"], answer:1 },{ q:"Why is fact-checking 'practically futile'?", options:["People are too distracted to read data","Algorithms hide fact-checked content","The opposing side rejects the authority of the sources themselves","Fact-checkers frequently make errors"], answer:2 }] },
];

const DIALOGUE = [
  { id:"dl-a1-1", level:"A1", passage:"Waiter: Are you ready to order, sir?\nCustomer: Yes. I would like the chicken soup and a black coffee, please.\nWaiter: I'm sorry, we don't have chicken soup today. We only have tomato soup.\nCustomer: Oh, I don't like tomatoes. I'll just have the coffee, then.", questions:[{ q:"What will the customer actually have?", options:["Chicken soup and coffee","Tomato soup and coffee","Only a black coffee","Nothing at all"], answer:2 },{ q:"Why didn't the customer order food?", options:["He wasn't hungry","He forgot his money","He disliked the available option","He only ever drinks coffee"], answer:2 }] },
  { id:"dl-a2-1", level:"A2", passage:"Clerk: Hello, how can I help you?\nCustomer: Hi, I bought this printer yesterday, but it keeps jamming. Can I return it?\nClerk: I can process a return, but only if you have the original receipt and the box.\nCustomer: I have the receipt, but I threw the box away this morning.\nClerk: Unfortunately, company policy requires the packaging for a full refund. I can offer you a repair instead.", questions:[{ q:"Why won't the customer receive a refund?", options:["The printer works perfectly","They lost the receipt","They discarded the packaging","They bought it too long ago"], answer:2 },{ q:"What does the clerk offer instead?", options:["A brand new box","To fix the printer","To call the manager","A partial refund"], answer:1 }] },
  { id:"dl-b1-1", level:"B1", passage:"Emma: Did you see the memo about the new software update?\nDavid: I did. To be honest, I'm dreading it. Last time IT updated our systems, we lost half our client database for two days.\nEmma: True, but they assure us they've backed everything up to the cloud this time.\nDavid: They said that last time too. I'm going to manually export my files to a hard drive before I leave today, just in case.", questions:[{ q:"What is David's attitude toward the upcoming update?", options:["Excited for new features","Confused by the process","Suspicious and worried based on past experience","Completely trusts the IT team"], answer:2 },{ q:"Why is David backing up his files manually?", options:["He doesn't trust the cloud backup","He wants to work from home","His manager ordered him to","He is leaving the company"], answer:0 }] },
  { id:"dl-b2-1", level:"B2", passage:"Interviewer: Your CV notes a six-month employment gap last year. Could you walk me through that?\nCandidate: Certainly. My department was made redundant during a major restructuring. However, I immediately enrolled in an intensive data analytics bootcamp and earned my certification.\nInterviewer: That's quite a pivot from marketing. What prompted that specific choice?\nCandidate: I'd noticed that marketing decisions were becoming entirely data-driven. Without quantitative skills, my strategic value would eventually plateau.", questions:[{ q:"Why did the candidate leave their previous job?", options:["They quit to study","They were fired for poor performance","Their position was eliminated in a restructuring","They wanted a new career"], answer:2 },{ q:"What does 'my strategic value would eventually plateau' mean?", options:["They would eventually be promoted","Their career growth would stall","They would need to switch companies","Their salary would increase rapidly"], answer:1 }] },
  { id:"dl-c1-1", level:"C1", passage:"Investigator: You signed off on the safety report stating the bridge was structurally sound. Yet, within six months, critical stress fractures appeared.\nEngineer: I signed off on data provided by the primary contractor. My mandate was to verify their mathematical models, not to conduct secondary field testing.\nInvestigator: So your assessment was purely theoretical? Your mandate didn't require you to verify if materials matched the models?\nEngineer: Standard industry practice dictates that material compliance is the purview of the site inspector. I was acting strictly as a consulting analyst.", questions:[{ q:"What is the engineer's primary defense?", options:["The fractures are not dangerous","He was given fabricated data","His responsibilities did not include physical site checks","He explicitly warned them about the materials"], answer:2 },{ q:"What is the investigator trying to establish?", options:["That the engineer is poorly qualified","That the engineer's interpretation of his role is too narrow","That the contractor lied to the government","That standard practice is illegal"], answer:1 }] },
  { id:"dl-c2-1", level:"C2", passage:"Moderator: Professor, your paper asserts the correlation is spurious. Yet, the Oxford longitudinal study controls for the exact confounds you mentioned.\nProfessor: They controlled for baseline socio-economic status, yes, but their methodology relied on self-reported retrospective data, which introduces massive recall bias.\nModerator: Even conceding a margin of recall bias, the effect size was highly robust across three different cohorts.\nProfessor: A robust effect size derived from systematically flawed data merely gives you a highly precise measurement of the wrong thing.", questions:[{ q:"What is the professor's primary critique of the Oxford study?", options:["They failed to control for socio-economic status","The cohorts were too small","The data collection method was inherently flawed","They misinterpreted the effect size"], answer:2 },{ q:"What does 'a highly precise measurement of the wrong thing' mean?", options:["Large effect sizes are automatically suspicious","The researchers used advanced methods but started with bad data","The researchers manipulated outcomes deliberately","Statistical precision is useless in sociology"], answer:1 }] },
];

const LISTENING = [
  { id:"ls-a1-1", level:"A1", audio:"/audio/voice-a1.mp3", question:"How does the person truly feel about the bus being late?", options:["They hate it because it makes them late","They don't mind — it gives them time to rest","They enjoy it because they eat on the bus","They are confused because the bus is never on time"], answer:1 },
  { id:"ls-a1-2", level:"A1", audio:"/audio/voice-a1-a2.mp3", question:"Why didn't the person buy any shoes?", options:["They decided they didn't need new ones","The store was closed","They only wear sneakers","The nice shoes were too expensive and the cheap ones were uncomfortable"], answer:3 },
  { id:"ls-a2-1", level:"A2", audio:"/audio/voice-a2.mp3", question:"What is the real reason the person left the dishes in the sink?", options:["They wanted to watch their game because it was late","They broke the kitchen light","They expected someone else to clean","They needed to buy soap"], answer:0 },
  { id:"ls-a2-2", level:"A2", audio:"/audio/voice-a2-b1.mp3", question:"What can be inferred about Sarah's departure from the party?", options:["She suddenly became very ill","She was not enjoying the loud crowded environment","Her brother had an emergency","She was angry about the music"], answer:1 },
  { id:"ls-b1-1", level:"B1", audio:"/audio/voice-b1.mp3", question:"What is the underlying problem the narrator faces in the new office?", options:["The office is too far from home","They dislike the espresso machine","The open design lacks privacy needed to concentrate","They are avoiding a specific coworker"], answer:2 },
  { id:"ls-b1-2", level:"B1", audio:"/audio/voice-b1-b2.mp3", question:"Why did the narrator suggest taking the train instead of driving?", options:["To enjoy the scenery","Driving in heavy snow would be dangerous","The bags would be too heavy for the car","Their partner dislikes driving in winter"], answer:1 },
  { id:"ls-b2-1", level:"B2", audio:"/audio/voice-b2.mp3", question:"What do the senior employees anticipate will happen after the merger?", options:["Promotions to management","Layoffs and job losses","The CEO is leaving","The rival firm will cancel the merger"], answer:1 },
  { id:"ls-b2-2", level:"B2", audio:"/audio/voice-b2.mp3", question:"What does the CEO's enthusiastic email suggest about the company's communication style?", options:["Honest and transparent preparation","Positive language used to obscure negative outcomes","Genuine excitement about new partnerships","A desire for all staff to celebrate"], answer:1 },
  { id:"ls-c1-1", level:"C1", audio:"/audio/voice-c1.mp3", question:"What is the implicit message about the restaurant's business practices?", options:["It is expanding to serve more customers","The owner is buying regional farms","It relies on commercial suppliers despite its local branding","Its farm-to-table marketing is completely honest"], answer:2 },
  { id:"ls-c1-2", level:"C1", audio:"/audio/voice-c1-c2.mp3", question:"What is the author's primary underlying criticism of the new library project?", options:["It prioritized aesthetics over essential community services","The modern design is architecturally inferior","Politicians failed to provide enough books","The silent atmosphere intimidates local children"], answer:0 },
  { id:"ls-c2-1", level:"C2", audio:"/audio/voice-c2.mp3", question:"According to the passage, what was the actual result of the educational reform?", options:["A genuinely equal educational system","Higher critical thinking among students","Abandonment of standardized testing","A superficial statistical success that stifled genuine learning"], answer:3 },
  { id:"ls-c2-2", level:"C2", audio:"/audio/voice-c2.mp3", question:"What was the 'profound unmeasured casualty' of the reform?", options:["Loss of arts funding","Decline in teacher morale","The sacrifice of intellectual curiosity and deep learning","Increase in dropout rates"], answer:2 },
];

// Fake word hunt — each uses a DIFFERENT trick so users can't spot a pattern
const FAKE_WORD_HUNT = [
  {
    id:"fw-b2-1", level:"B2", timeLimit:600, wordCount:5,
    instructions:"Read carefully. Find exactly 5 words that do NOT exist in real English. They follow English spelling rules but are invented. Tip: they all use a wrong suffix ending.",
    passage:"The research team carefully documented their observations over several months. Each member was responsible for a specific area of study, ensuring no detail went unnoticed. The lead scientist, known for her meticulous approach, reviewed every report with remarkable thoroughtion. Her colleagues admired her dedicateness to the project, even when the work became repetitional and tiring. Despite the challenges, the team maintained their professiontion throughout the entire process. Their findings were later published in a respected journal, where they received widespread recognization from the broader academic community. The study was praised for its clarition of a previously misunderstood phenomenon in environmental science.",
    fakeWords:["thoroughtion","dedicateness","repetitional","professiontion","recognization","clarition"],
    wordCount:6,
  },
  {
    id:"fw-c1-1", level:"C1", timeLimit:600, wordCount:7,
    instructions:"Read carefully. Find exactly 7 words that do NOT exist in real English. These are harder — they look almost completely real. The trick changes in this paragraph.",
    passage:"The philosopher's central argument rested on the notion that human consciousness carries an inherent vaguety that resists systematic analysis. Critics argued this position showed a fundamental simplisty, preferring instead a rationalistic framework built on observable data. Yet the philosopher remained unconvinced, insisting that to overlook the subjectiveness of lived experience was to misrepresent reality with dangerousity. His supporters praised the intricatety of his reasoning, while opponents dismissed it as deliberate obfuscation designed to mask a core emptiness. The debate ultimately remained unsolvated — a testament to the enduring difficultness of questions that lie at the intersection of mind, meaning, and the human conditionality of thought itself.",
    fakeWords:["vaguety","simplisty","dangerousity","intricatety","unsolvated","difficultness","conditionality"],
  },
  {
    id:"fw-c2-1", level:"C2", timeLimit:600, wordCount:10,
    instructions:"Read carefully. Find exactly 10 words that do NOT exist in real English. These are extremely difficult — they look and sound completely real at C2 level. Every fake word uses a different trick.",
    passage:"Contemporary discourse on artificial intelligence has grown increasingly polarific, with commentators either embracing its transformative potential or decrying what they perceive as an existential menace to human cognition. The most thoughtive analysts, however, resist such binary framings, arguing instead for a more granulistic understanding of how these systems will reshape labor and creativity. One must not disregard the epistemic humilitude required when navigating questions of such scope — to speak with unqualified certainness is itself a form of intellectric dishonesty. The technologism of our era demands not passivation but active engagement: a willingness to interrogate assumptions, to sit with ambiguance, and to resist the allure of oversimplistic narratives. Those who cultivate this kind of cogitative discipline will, the argument goes, be better equippened to navigate the profound uncertainties of the decades ahead.",
    fakeWords:["polarific","thoughtive","granulistic","humilitude","certainness","intellectric","passivation","ambiguance","cogitative","equippened"],
  },
];

const DETECTIVE_STAGES = [
  { stage:1, targetLevel:"A1-A2", line:"Hello. What is your name and where do you work?" },
  { stage:2, targetLevel:"A2-B1", line:"Were you in the office yesterday afternoon? What were you doing between two and four o'clock?" },
  { stage:3, targetLevel:"B1-B2", line:"Did you notice anything unusual yesterday? Someone acting strangely, perhaps? Take your time." },
  { stage:4, targetLevel:"B2-C1", line:"Hypothetically — if you had to guess why someone might take that briefcase, what would your theory be?" },
  { stage:5, targetLevel:"C1-C2", line:"In your professional opinion, how could this company's internal security protocols be improved to prevent incidents like this in the future?" },
];

function pickQuestions(bank, currentLevel) {
  const li = LEVELS.indexOf(currentLevel);
  const pool = bank.filter(q => Math.abs(LEVELS.indexOf(q.level) - li) <= 1);
  return pool.sort(() => Math.random() - 0.5).slice(0, 3);
}

function pickPassage(bank, currentLevel) {
  const li = LEVELS.indexOf(currentLevel);
  const pool = bank.filter(q => Math.abs(LEVELS.indexOf(q.level) - li) <= 1);
  return pool.sort(() => Math.random() - 0.5).slice(0, 1);
}

const C = { bg:"#0d0d12", surface:"#141420", border:"#252535", accent:"#7c3aed", accentLight:"#a78bfa", accentBg:"#1a0f35", text:"#e8e6f0", muted:"#6b6b8a", faint:"#1e1e2e", green:"#22c55e", greenBg:"#052e16", greenText:"#86efac", red:"#ef4444", redBg:"#2d0a0a", redText:"#fca5a5" };
const S = {
  wrap:{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Inter',system-ui,sans-serif", display:"flex", flexDirection:"column", alignItems:"center", padding:"0 16px 80px" },
  header:{ width:"100%", maxWidth:700, padding:"28px 0 20px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  logo:{ fontSize:20, fontWeight:800, letterSpacing:"-0.5px", color:C.accentLight },
  bar:{ width:"100%", maxWidth:700, height:3, background:C.faint, borderRadius:2, marginBottom:28, overflow:"hidden" },
  barFill:(p)=>({ height:"100%", width:`${p}%`, background:`linear-gradient(90deg,${C.accent},${C.accentLight})`, borderRadius:2, transition:"width 0.4s ease" }),
  card:{ width:"100%", maxWidth:700, background:C.surface, borderRadius:18, padding:"28px 24px", border:`1px solid ${C.border}`, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" },
  tag:{ display:"inline-block", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:C.accent, background:C.accentBg, padding:"4px 10px", borderRadius:6, marginBottom:18 },
  lvl:{ display:"inline-block", fontSize:10, fontWeight:700, color:C.accentLight, background:C.faint, padding:"3px 8px", borderRadius:4, marginLeft:8 },
  passage:{ background:C.faint, borderLeft:`3px solid ${C.accent}`, borderRadius:"0 10px 10px 0", padding:"14px 18px", marginBottom:22, fontSize:14, lineHeight:1.85, color:"#c8c5e0", whiteSpace:"pre-wrap" },
  question:{ fontSize:17, fontWeight:600, lineHeight:1.6, marginBottom:24, color:"#f0eeff" },
  opt:(sel,ok,bad,dis)=>({ width:"100%", textAlign:"left", padding:"13px 16px", marginBottom:9, borderRadius:11, border:`2px solid ${ok?C.green:bad?C.red:sel?C.accent:C.border}`, background:ok?C.greenBg:bad?C.redBg:sel?C.accentBg:C.faint, color:ok?C.greenText:bad?C.redText:C.text, fontSize:14, cursor:dis?"default":"pointer", transition:"all 0.15s", fontFamily:"inherit", fontWeight:sel||ok||bad?600:400, display:"flex", alignItems:"center", gap:10 }),
  optLetter:(sel,ok,bad)=>({ width:26, height:26, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", background:ok?"#22c55e22":bad?"#ef444422":sel?`${C.accent}33`:"#ffffff11", color:ok?C.green:bad?C.red:sel?C.accentLight:"#666", fontSize:11, fontWeight:700, flexShrink:0 }),
  fb:(ok)=>({ marginTop:14, padding:"12px 16px", borderRadius:10, background:ok?C.greenBg:C.redBg, border:`1px solid ${ok?"#22c55e33":"#ef444433"}`, fontSize:13, color:ok?C.greenText:C.redText, lineHeight:1.6 }),
  btn:{ marginTop:22, width:"100%", padding:"15px", borderRadius:12, border:"none", background:`linear-gradient(135deg,${C.accent},${C.accentLight})`, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer" },
  btnDim:{ opacity:0.35, pointerEvents:"none" },
  textarea:{ width:"100%", background:C.faint, border:`2px solid ${C.border}`, borderRadius:11, padding:"13px 15px", color:C.text, fontSize:14, lineHeight:1.7, resize:"vertical", minHeight:110, fontFamily:"inherit", outline:"none", boxSizing:"border-box" },
  bubble:{ background:C.accentBg, border:`1px solid #3a2a5a`, borderRadius:"0 14px 14px 14px", padding:"14px 18px", marginBottom:22, fontSize:14, lineHeight:1.7, color:"#d4d0e8" },
  bubbleLabel:{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.accent, textTransform:"uppercase", marginBottom:8 },
  timer:(urg)=>({ display:"flex", alignItems:"center", gap:8, padding:"7px 13px", borderRadius:9, background:urg?C.redBg:C.faint, border:`1px solid ${urg?C.red:C.border}`, color:urg?C.red:C.accentLight, fontSize:13, fontWeight:600, marginBottom:18 }),
  pill:{ padding:"8px 16px", borderRadius:20, background:C.faint, border:`1px solid ${C.border}`, fontSize:12, color:C.accentLight, fontWeight:500 },
  resultLevel:{ fontSize:80, fontWeight:900, letterSpacing:-4, background:`linear-gradient(135deg,${C.accent},${C.accentLight})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1, textAlign:"center" },
  skillBox:{ background:C.faint, borderRadius:11, padding:"13px 15px", border:`1px solid ${C.border}` },
};
const LETTERS = ["A","B","C","D"];
const SECTION_ORDER = ["grammar","vocabulary","reading","dialogue","listening","writing"];
const SECTION_LABELS = { grammar:"Grammar", vocabulary:"Vocabulary", reading:"Reading", dialogue:"Dialogue", listening:"Listening", writing:"Writing" };

function Timer({ seconds, onExpire }) {
  const [left, setLeft] = useState(seconds);
  useState(() => {
    const t = setInterval(() => setLeft(l => { if(l<=1){clearInterval(t);onExpire();return 0;}return l-1;}),1000);
    return ()=>clearInterval(t);
  },[]);
  const m=Math.floor(left/60),s=left%60,urg=left<60;
  return <div style={S.timer(urg)}>⏱ {m}:{s.toString().padStart(2,"0")} remaining{urg?" — hurry":""}</div>;
}

function FakeWordHunt({ q, onDone }) {
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const clean = w=>w.replace(/[^a-zA-Z]/g,"");
  const toggle = raw=>{
    if(submitted)return;
    const w=clean(raw);if(!w)return;
    setSelected(p=>p.map(x=>x.toLowerCase()).includes(w.toLowerCase())?p.filter(x=>x.toLowerCase()!==w.toLowerCase()):p.length<q.wordCount?[...p,w]:p);
  };
  const isSelected=raw=>selected.map(x=>x.toLowerCase()).includes(clean(raw).toLowerCase());
  const isFake=raw=>q.fakeWords.map(f=>f.toLowerCase()).includes(clean(raw).toLowerCase());
  const submit=()=>{
    if(selected.length!==q.wordCount)return;
    setSubmitted(true);
    const hits=q.fakeWords.filter(f=>selected.map(x=>x.toLowerCase()).includes(f.toLowerCase())).length;
    setTimeout(()=>onDone(hits,q.wordCount),1800);
  };
  return (
    <div>
      <Timer seconds={q.timeLimit} onExpire={()=>{setSubmitted(true);onDone(0,q.wordCount);}}/>
      <p style={{fontSize:12,color:C.muted,marginBottom:14}}>Select exactly <strong style={{color:C.accentLight}}>{q.wordCount}</strong> fake words — {selected.length}/{q.wordCount} selected</p>
      <div style={{lineHeight:2.4,fontSize:15,color:"#d4d0e8"}}>
        {q.passage.split(/\s+/).map((raw,i)=>{
          const sel=isSelected(raw),fake=submitted&&isFake(raw),wrong=submitted&&sel&&!isFake(raw);
          return <span key={i}><span onClick={()=>toggle(raw)} style={{cursor:submitted?"default":"pointer",padding:"2px 4px",borderRadius:4,background:fake?"#22c55e22":wrong?"#ef444422":sel?`${C.accent}33`:"transparent",border:fake?`1px solid ${C.green}`:wrong?`1px solid ${C.red}`:sel?`1px solid ${C.accent}`:"1px solid transparent",color:fake?C.greenText:wrong?C.redText:sel?C.accentLight:"#d4d0e8",fontWeight:sel||fake?700:400,transition:"all 0.1s"}}>{raw}</span>{" "}</span>;
        })}
      </div>
      {!submitted&&<button style={{...S.btn,...(selected.length!==q.wordCount?S.btnDim:{})}} onClick={submit}>Submit — {selected.length}/{q.wordCount} selected</button>}
    </div>
  );
}

function DetectiveWriting({ userLevel, onComplete }) {
  const stageCount=LEVELS.indexOf(userLevel)<=1?2:LEVELS.indexOf(userLevel)===2?3:LEVELS.indexOf(userLevel)===3?4:5;
  const stages=DETECTIVE_STAGES.slice(0,stageCount);
  const [idx,setIdx]=useState(0);
  const [text,setText]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const [responses,setResponses]=useState([]);
  const next=()=>{
    const nr=[...responses,{stage:stages[idx].stage,response:text}];
    setResponses(nr);
    if(idx+1>=stages.length){onComplete(nr);}
    else{setIdx(i=>i+1);setText("");setSubmitted(false);}
  };
  return (
    <div>
      <div style={{fontSize:12,color:C.muted,marginBottom:18}}>Stage {idx+1} of {stages.length} — Target: {stages[idx].targetLevel}</div>
      <div style={S.bubble}><div style={S.bubbleLabel}>🕵️ Detective Harris</div><div style={{fontStyle:"italic"}}>"{stages[idx].line}"</div></div>
      <textarea style={S.textarea} placeholder="Type your response here..." value={text} onChange={e=>setText(e.target.value)} disabled={submitted}/>
      {submitted&&<div style={S.fb(true)}>✓ Response recorded.{idx+1<stages.length?" Continue to next question.":" Writing complete."}</div>}
      {!submitted&&<button style={{...S.btn,...(!text.trim()?S.btnDim:{})}} onClick={()=>setSubmitted(true)} disabled={!text.trim()}>Submit Response</button>}
      {submitted&&<button style={S.btn} onClick={next}>{idx+1>=stages.length?"See Results →":"Next Question →"}</button>}
    </div>
  );
}

function Results({ scores }) {
  const vals=Object.values(scores);
  const avg=vals.length?Math.round(vals.reduce((a,b)=>a+(b.pct||0),0)/vals.length):0;
  const level=avg>=90?"C2":avg>=78?"C1":avg>=62?"B2":avg>=46?"B1":avg>=28?"A2":"A1";
  const desc={A1:"Just starting out. Every expert was once a beginner.",A2:"You know the basics. Now it's time to build.",B1:"You can communicate. Let's sharpen the details.",B2:"You're independent. Push toward fluency.",C1:"You're advanced. Work on mastery and precision.",C2:"Near-native. You think in English."};
  return (
    <div style={{textAlign:"center",padding:"36px 24px"}}>
      <div style={{fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>Your English Level</div>
      <div style={S.resultLevel}>{level}</div>
      <div style={{fontSize:14,color:C.muted,marginTop:10,marginBottom:36}}>{desc[level]}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:28}}>
        {Object.entries(scores).map(([sec,data])=>(
          <div key={sec} style={S.skillBox}>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{SECTION_LABELS[sec]||sec}</div>
            <div style={{fontSize:18,fontWeight:800,color:C.accentLight}}>{data.level||"—"}</div>
            <div style={{fontSize:11,color:"#555",marginTop:2}}>{data.correct||0}/{data.total||0}</div>
          </div>
        ))}
      </div>
      <button style={S.btn} onClick={()=>window.location.reload()}>Take the test again</button>
    </div>
  );
}

// Passage subquestion component to avoid hooks-in-conditionals
function PassageSection({ q, onNext, onScore, currentLevel }) {
  const [subIdx, setSubIdx] = useState(0);
  const [subSel, setSubSel] = useState(null);
  const [subConf, setSubConf] = useState(false);
  const subQ = q.questions[subIdx];
  const last = subIdx >= q.questions.length - 1;
  return (
    <div>
      <div style={S.passage}>{q.passage}</div>
      <div style={S.question}>{subQ.q}</div>
      {subQ.options.map((opt,i)=>{
        const sel=subSel===i,ok=subConf&&i===subQ.answer,bad=subConf&&sel&&i!==subQ.answer;
        return <button key={i} style={S.opt(sel,ok,bad,subConf)} onClick={()=>!subConf&&setSubSel(i)}><span style={S.optLetter(sel,ok,bad)}>{LETTERS[i]}</span>{opt}{ok&&<span style={{marginLeft:"auto"}}>✓</span>}{bad&&<span style={{marginLeft:"auto"}}>✗</span>}</button>;
      })}
      {subConf&&<div style={S.fb(subSel===subQ.answer)}>{subSel===subQ.answer?"✓ Correct.":`✗ Correct answer: "${subQ.options[subQ.answer]}"`}</div>}
      {!subConf&&<button style={{...S.btn,...(subSel===null?S.btnDim:{})}} onClick={()=>{if(subSel===null)return;setSubConf(true);const ok=subSel===subQ.answer;onScore(ok,q.level);}}>Confirm answer</button>}
      {subConf&&<button style={S.btn} onClick={()=>{if(last){onNext();}else{setSubIdx(i=>i+1);setSubSel(null);setSubConf(false);}}}>{last?"Next section →":"Next question →"}</button>}
    </div>
  );
}

export default function PlacementTest() {
  const [phase, setPhase] = useState("start");
  const [secIdx, setSecIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [currentLevel, setCurrentLevel] = useState("A2");
  const [streak, setStreak] = useState(0);
  const [secQs, setSecQs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [scores, setScores] = useState({});
  const [secCorrect, setSecCorrect] = useState(0);
  const [secTotal, setSecTotal] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  const section = SECTION_ORDER[secIdx];

  const initSection = (sec, lvl) => {
    if(sec==="grammar") setSecQs(pickQuestions(GRAMMAR,lvl));
    else if(sec==="vocabulary") setSecQs(pickQuestions(VOCABULARY,lvl));
    else if(sec==="reading") setSecQs(pickPassage(READING,lvl));
    else if(sec==="dialogue") setSecQs(pickPassage(DIALOGUE,lvl));
    else if(sec==="listening") setSecQs(pickQuestions(LISTENING,lvl));
    else if(sec==="writing"){
      const li=LEVELS.indexOf(lvl);
      const qs=[];
      if(li>=3){const fw=FAKE_WORD_HUNT.find(q=>q.level===lvl)||FAKE_WORD_HUNT[FAKE_WORD_HUNT.length-1];qs.push(fw);}
      qs.push({id:"detective",type:"detective"});
      setSecQs(qs);
    }
  };

  const updateAdaptive = (correct) => {
    // CONSECUTIVE only — break resets streak to 1 or -1
    let ns;
    if(correct){ ns = streak>0 ? streak+1 : 1; }
    else { ns = streak<0 ? streak-1 : -1; }
    let nl = currentLevel;
    if(ns>=2){ const li=LEVELS.indexOf(currentLevel); if(li<LEVELS.length-1)nl=LEVELS[li+1]; ns=0; }
    else if(ns<=-2){ const li=LEVELS.indexOf(currentLevel); if(li>0)nl=LEVELS[li-1]; ns=0; }
    setStreak(ns);
    setCurrentLevel(nl);
    return nl;
  };

  const recordScore = (correct, level) => {
    if(correct){ const pts={A1:10,A2:20,B1:35,B2:50,C1:70,C2:90}[level]||20; setTotalScore(s=>s+pts); setSecCorrect(c=>c+1); }
    setSecTotal(t=>t+1);
    return updateAdaptive(correct);
  };

  const nextQuestion = (overrideLevel) => {
    const lvl = overrideLevel||currentLevel;
    const last = qIdx >= secQs.length-1;
    if(last){
      setScores(p=>({...p,[section]:{correct:secCorrect,total:secTotal,pct:secTotal>0?Math.round((secCorrect/secTotal)*100):0,level:currentLevel}}));
      setSecCorrect(0); setSecTotal(0);
      if(secIdx>=SECTION_ORDER.length-1){ setPhase("results"); }
      else{
        const ns=SECTION_ORDER[secIdx+1];
        setSecIdx(i=>i+1); setQIdx(0); setSelected(null); setConfirmed(false);
        initSection(ns,lvl);
      }
    } else {
      setQIdx(i=>i+1); setSelected(null); setConfirmed(false);
    }
  };

  const start = () => {
    setPhase("test");
    initSection(SECTION_ORDER[0],"A2");
  };

  const progress = phase==="test"?(secIdx/SECTION_ORDER.length)*100+(qIdx/Math.max(secQs.length,1))*(100/SECTION_ORDER.length):phase==="results"?100:0;
  const q = secQs[qIdx];
  const isPassage = q && q.questions;
  const isFakeWord = q && q.type==="fake_word_hunt";
  const isDetective = q && q.type==="detective";
  const isListening = section==="listening" && q && q.audio;
  const isMC = q && !isPassage && !isFakeWord && !isDetective && !isListening;

  if(phase==="start") return (
    <div style={S.wrap}>
      <div style={S.header}><div style={S.logo}>engrow</div></div>
      <div style={{...S.card,textAlign:"center",padding:"44px 28px"}}>
        <div style={{fontSize:32,fontWeight:900,letterSpacing:-1.5,color:"#f0eeff",marginBottom:12}}>Find your level.</div>
        <p style={{fontSize:14,color:C.muted,lineHeight:1.8,maxWidth:380,margin:"0 auto 32px"}}>6 sections. Grammar, vocabulary, reading, dialogue, listening, and writing. Gets harder as you answer correctly. Takes about 20 minutes.</p>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:36}}>
          {["6 sections","Fully adaptive","~20 minutes","A1 → C2"].map(t=><div key={t} style={S.pill}>{t}</div>)}
        </div>
        <button style={S.btn} onClick={start}>Start the test →</button>
      </div>
    </div>
  );

  if(phase==="results") return (
    <div style={S.wrap}>
      <div style={S.header}><div style={S.logo}>engrow</div></div>
      <div style={S.card}><Results scores={scores}/></div>
    </div>
  );

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={S.logo}>engrow</div>
        <div style={{fontSize:12,color:C.muted}}>{secIdx+1} / {SECTION_ORDER.length} — {SECTION_LABELS[section]}</div>
      </div>
      <div style={S.bar}><div style={S.barFill(progress)}/></div>
      <div style={S.card}>
        <div style={{marginBottom:4}}><span style={S.tag}>{SECTION_LABELS[section]}</span><span style={S.lvl}>{currentLevel}</span></div>

        {isPassage && q && (
          <PassageSection q={q} currentLevel={currentLevel}
            onScore={(ok,level)=>recordScore(ok,level)}
            onNext={()=>nextQuestion()}
          />
        )}

        {isListening && (
          <div>
            <div style={{background:C.faint,borderRadius:12,padding:"18px",marginBottom:22,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>🎧 Listen carefully — replay as many times as you need</div>
              <audio controls src={`https://engrow-1.onrender.com${q.audio}`} style={{width:"100%",accentColor:C.accent}}/>
            </div>
            <div style={S.question}>{q.question}</div>
            {q.options.map((opt,i)=>{
              const sel=selected===i,ok=confirmed&&i===q.answer,bad=confirmed&&sel&&i!==q.answer;
              return <button key={i} style={S.opt(sel,ok,bad,confirmed)} onClick={()=>!confirmed&&setSelected(i)}><span style={S.optLetter(sel,ok,bad)}>{LETTERS[i]}</span>{opt}{ok&&<span style={{marginLeft:"auto"}}>✓</span>}{bad&&<span style={{marginLeft:"auto"}}>✗</span>}</button>;
            })}
            {confirmed&&<div style={S.fb(selected===q.answer)}>{selected===q.answer?"✓ Correct.":`✗ Correct answer: "${q.options[q.answer]}"`}</div>}
            {!confirmed&&<button style={{...S.btn,...(selected===null?S.btnDim:{})}} onClick={()=>{if(selected===null)return;setConfirmed(true);recordScore(selected===q.answer,q.level);}}>Confirm answer</button>}
            {confirmed&&<button style={S.btn} onClick={()=>nextQuestion()}>{qIdx>=secQs.length-1?"Next section →":"Next question →"}</button>}
          </div>
        )}

        {isFakeWord && (
          <div>
            <div style={S.question}>{q.instructions}</div>
            <FakeWordHunt q={q} onDone={(hits,total)=>{
              const pts={B2:50,C1:70,C2:90}[q.level]||50;
              setTotalScore(s=>s+Math.round((hits/total)*pts));
              setSecCorrect(c=>c+(hits===total?1:0));
              setSecTotal(t=>t+1);
              nextQuestion();
            }}/>
          </div>
        )}

        {isDetective && (
          <div>
            <div style={S.question}>The Missing Briefcase — Answer Detective Harris's questions.</div>
            <DetectiveWriting userLevel={currentLevel} onComplete={responses=>{
              setScores(p=>({...p,writing:{correct:responses.length,total:responses.length,pct:80,level:currentLevel}}));
              nextQuestion();
            }}/>
          </div>
        )}

        {isMC && (
          <div>
            <div style={S.question}>{q.question}</div>
            {q.options.map((opt,i)=>{
              const sel=selected===opt,ok=confirmed&&opt===q.answer,bad=confirmed&&sel&&opt!==q.answer;
              return <button key={opt} style={S.opt(sel,ok,bad,confirmed)} onClick={()=>!confirmed&&setSelected(opt)}><span style={S.optLetter(sel,ok,bad)}>{LETTERS[i]}</span>{opt}{ok&&<span style={{marginLeft:"auto"}}>✓</span>}{bad&&<span style={{marginLeft:"auto"}}>✗</span>}</button>;
            })}
            {confirmed&&<div style={S.fb(selected===q.answer)}>{selected===q.answer?"✓ Correct.":`✗ Correct answer: "${q.answer}"`}</div>}
            {!confirmed&&<button style={{...S.btn,...(!selected?S.btnDim:{})}} onClick={()=>{if(!selected)return;setConfirmed(true);recordScore(selected===q.answer,q.level);}}>Confirm answer</button>}
            {confirmed&&<button style={S.btn} onClick={()=>nextQuestion()}>{qIdx>=secQs.length-1?`Next: ${SECTION_LABELS[SECTION_ORDER[secIdx+1]]||"Results"} →`:"Next question →"}</button>}
          </div>
        )}
      </div>
    </div>
  );
}
