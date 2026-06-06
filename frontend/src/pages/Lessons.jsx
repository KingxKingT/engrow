import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SKILLS = ['all','grammar','vocabulary','reading','writing','dialogue','listening'];
const SKILL_LABELS = { all:'All skills', grammar:'Grammar', vocabulary:'Vocabulary', reading:'Reading', writing:'Writing', dialogue:'Dialogue', listening:'Listening' };
const CEFR_ORDER = ['A1','A2','B1','B2','C1','C2'];

const CURRICULUM = {
  grammar: {
    A1: ['To be','Basic grammar','Verb forms, Objective pronouns','Negative, questions and question words','There is/are; articles; plural','Revision and imperative','The verb CAN, Prepositions of time','Past simple (TO BE)','Past simple','Past simple – negative and questions','Future tense','Revision','Comparative and superlative adjectives','Would like','Present continuous','Prepositions','Expressing future using GOING TO','Revision','Modal verbs','Passive','Present simple and continuous','Past continuous','Making questions','Revision','Countability','Some, any, no','Present perfect','Relative pronouns','Linking words','Revision'],
    A2: ['Past simple','Present perfect simple','GOING TO vs WILL','Conditional 1','Past simple vs past continuous','Revision','Adjectives','Articles','Passive','Gerund and infinitive','Infinitive of purpose','Revision','Countability','Some, any, no, every','Conditional 2','Modal verbs 1','Reported speech','Revision','Present perfect continuous','Questions','Relative pronouns','Prepositions','Question tags','Revision','Modal verbs 2','Phrasal verbs 1','Tenses review','Word order and linking words','Phrasal verbs 2','Revision'],
    B1: ['Present simple vs present continuous','Past simple vs past continuous','Present perfect simple and past simple','Present perfect simple / continuous','Expressing the future','Revision of tenses','Passive','First and second conditional','Third conditional','Used to vs be used to','Wish clauses','Revision','Passive 2','Direct speech vs reported speech','Modal verbs','Countability / uncountability','Articles','Revision','Verb patterns 1','Verb patterns 2','Relative clauses','-ed or -ing','Linking words','Revision','Prepositions','Adjective prepositions','Noun prepositions','Verb prepositions','Phrasal verbs','Revision'],
    B2: ['Present tenses','Past tenses','Future tenses','Conditional sentences','Wish clauses and mixed conditionals','Revision','Verb + ing','Verbs plus infinitives','Verb + ing or verb + to','Prepositions + ing','See somebody do/doing','Revision','Countability','Articles','Quantifiers','Adjectives ending -ing/-ed','Word formation','Revision','Modal verbs','Passive 1','Passive 2','Reported speech','Relative clauses','Revision','Prepositions','Linking words','Word order','Commas, semicolons and colons','The subjunctive','Revision'],
    C1: ['Easily confused words 1','Roots 1','Prefixes 1','GQ – tenses 1','Funny animal groups','Revision','Easily confused words 2','Roots 2','Prefixes 2','GQ – tenses 2','One or two words','Revision','Easily confused words 3','Prefixes 3','False friends','GQ – verb patterns','The comma','Revision','Easily confused words 4','Prefixes 4','Abbreviations','GQ – conditionals','More abbreviations','Revision','Suffixes','Collective nouns','Strange countables','GQ – articles','Onomatopoeia','Revision']
  }
};

export default function Lessons() {
  const { skills } = useAuth();
  const navigate = useNavigate();
  const [activeSkill, setActiveSkill] = useState('all');

  const skillMap = {};
  (skills || []).forEach(s => { skillMap[s.skill] = s; });

  const getLevelForSkill = (skill) => skillMap[skill]?.cefr_level || 'A1';
  const getStartLevel = (cefrLevel) => {
    const map = { A1:'A1', A2:'A1', B1:'A2', B2:'B1', C1:'B2', C2:'C1' };
    return map[cefrLevel] || 'A1';
  };

  const buildLessons = (skill) => {
    const userLevel = getLevelForSkill(skill);
    const startLevel = getStartLevel(userLevel);
    const curriculum = CURRICULUM[skill] || CURRICULUM.grammar;
    const levelLessons = curriculum[startLevel] || curriculum['A1'];
    return levelLessons.map((title, i) => ({
      id: `${skill}-${startLevel}-${i}`,
      skill, title,
      level: startLevel,
      number: i + 1,
      status: i === 0 ? 'available' : i < 3 ? 'available' : 'locked'
    }));
  };

  const allSkills = ['grammar','vocabulary','reading','writing','dialogue','listening'];
  const lessons = activeSkill === 'all'
    ? allSkills.flatMap(s => buildLessons(s).slice(0, 6))
    : buildLessons(activeSkill);

  return (
    <div className="app-layout">
      <Sidebar />
      <main id="main-content" className="app-main">
        <div style={{ padding:'2rem 2.5rem', maxWidth:'900px', margin:'0 auto' }}>
          <div style={{ marginBottom:'1.5rem' }}>
            <h1 style={{ fontSize:'20px', marginBottom:'4px' }}>My lessons</h1>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>Lessons unlock based on your skill level. Complete them in order.</p>
          </div>

          {/* Skill filter tabs */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'1.5rem', flexWrap:'wrap' }}>
            {SKILLS.map(s => (
              <button key={s} onClick={() => setActiveSkill(s)} style={{
                padding:'0.4rem 0.9rem', borderRadius:'var(--radius-full)', fontSize:'13px',
                fontWeight: activeSkill === s ? 500 : 400, border:'1.5px solid',
                borderColor: activeSkill === s ? 'var(--blue-primary)' : 'var(--border)',
                background: activeSkill === s ? 'var(--blue-light)' : 'var(--surface)',
                color: activeSkill === s ? 'var(--blue-primary)' : 'var(--text-secondary)',
                cursor:'pointer', fontFamily:'var(--font-sans)', transition:'all var(--transition)'
              }}>
                {SKILL_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Lessons grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'10px' }}>
            {lessons.map(lesson => (
              <button key={lesson.id} onClick={() => lesson.status !== 'locked' && navigate(`/lesson/${lesson.id}`)}
                style={{
                  background:'var(--surface)', border:'1px solid', textAlign:'left', fontFamily:'var(--font-sans)',
                  borderColor: lesson.status === 'available' ? 'var(--border)' : 'var(--border)',
                  borderRadius:'var(--radius-lg)', padding:'1rem 1.125rem', cursor: lesson.status === 'locked' ? 'default' : 'pointer',
                  opacity: lesson.status === 'locked' ? 0.5 : 1, transition:'all var(--transition)'
                }}
                onMouseEnter={e => { if(lesson.status !== 'locked') e.currentTarget.style.borderColor='var(--blue-primary)'; }}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
                aria-label={`${SKILL_LABELS[lesson.skill]} lesson ${lesson.number}: ${lesson.title}${lesson.status === 'locked' ? ' — locked' : ''}`}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'5px' }}>
                  <span style={{ fontSize:'11px', color:'var(--text-tertiary)', fontWeight:500 }}>
                    {SKILL_LABELS[lesson.skill]} · {lesson.level} · #{lesson.number}
                  </span>
                  {lesson.status === 'locked' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  )}
                  {lesson.status === 'completed' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green-accent)" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
                <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text)', lineHeight:1.4 }}>{lesson.title}</div>
                <div style={{ fontSize:'12px', color:'var(--text-tertiary)', marginTop:'3px' }}>5–7 min</div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
