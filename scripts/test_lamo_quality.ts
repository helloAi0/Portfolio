import './_testDb';
/** LAMO answer quality: typo repair, intents, concept answers, honesty about unrecorded skills, model output sections, mock Gemini end-to-end. */
import http from 'node:http';
import { fixTypos, classify } from '../src/lib/lamo/understand';
import { findConcept } from '../src/lib/lamo/concepts';
import { competenceAnswer, explainAnswer, splitSections, validateGeneral, hiringAnswer } from '../src/lib/lamo/compose';
import type { RetrievedKnowledgeChunk } from '../src/lib/lamo/types';

let passed = 0, failed = 0;
const t = (n: string, ok: boolean, x?: unknown) => { if (ok) { passed++; console.log(`[PASS] ${n}`); } else { failed++; console.error(`[FAIL] ${n}`, x ?? ''); } };
const chunk = (id: string, title: string, content: string, st: RetrievedKnowledgeChunk['verificationStatus'] = 'VERIFIED'): RetrievedKnowledgeChunk => ({ id, source: id, category: 'Project', title, content, verificationStatus: st, confidenceScore: 1, visibility: 'PUBLIC', lastUpdated: '2026-01-01' });
const KB = [
  chunk('project:pinnflow', 'PinnFlow', 'Physics-informed neural network research on fluid flow using PyTorch.'),
  chunk('skill:python', 'Python', 'Skill: Python for machine learning and backend work.', 'OWNER_CONFIRMED'),
];

// typos
t('heir -> hire', fixTypos('can I heir him') === 'can I hire him');
t('here untouched', fixTypos('is he here') === 'is he here');
t('quantam fixed', fixTypos('does he know quantam computing').includes('quantum'));
t('R language not rewritten', fixTypos('does he know R') === 'does he know R');

// intents
t('hire intent (typo)', classify('can I heir him').kind === 'hire');
t('hire intent (recruiter)', classify('I am a recruiter at Acme').kind === 'hire');
t('thanks', classify('thanks!').kind === 'smalltalk');
const c = classify('does he know about quantum computing');
t('competence topic', c.kind === 'competence' && /quantum computing/i.test((c as any).topic), c);
const e = classify('what is quantum computing');
t('explain topic', e.kind === 'explain' && /quantum computing/i.test((e as any).topic), e);
t('owner question not explain', classify('what is Taha studying').kind !== 'explain');

// concepts
t('concept found', !!findConcept('quantum computing') && !!findConcept('transformers'));

// competence honesty
const unk = competenceAnswer('quantum computing', KB);
t('unrecorded skill is not claimed', !unk.known && /not on .* verified record/i.test(unk.answer) && !/Yes,/.test(unk.answer), unk.answer);
t('unrecorded skill still explains the idea', /qubit/i.test(unk.answer), unk.answer);
t('never claims he told me', !/he told me|he said/i.test(unk.answer));
const kn = competenceAnswer('Python', KB);
t('recorded skill is a yes', kn.known && /^Yes/.test(kn.answer), kn.answer);
const ex = explainAnswer('quantum computing', KB);
t('explain answer exists', !!ex && /qubit/i.test(ex.answer));
t('hiring answer has email', /@/.test(hiringAnswer('a@b.co')) && /internship/i.test(hiringAnswer('a@b.co')));

// sections
const sec = splitSections('<about_taha>He has PinnFlow.</about_taha><general>Quantum computing uses qubits that can be in superposition, which suits some problems.</general>');
t('sections split', sec.about === 'He has PinnFlow.' && /qubits/.test(sec.general));
t('general may not mention him', !validateGeneral('Quantum computing is great and he knows it very well indeed, truly.').ok);
t('general may not carry links', !validateGeneral('Read more at https://example.com about qubits and superposition here.').ok);
t('general ok', validateGeneral('Quantum computing uses qubits, which can hold superpositions of 0 and 1.').ok);

// mock Gemini end-to-end
async function main() {
  const srv = http.createServer((req, res) => {
    let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      if (process.env.MOCK_MODE === 'fail') { res.statusCode = 403; return res.end('{}'); }
      const text = process.env.MOCK_MODE === 'bad'
        ? '<general>Quantum computing is described at https://evil.example and he is an expert at it.</general>'
        : '<general>Quantum computing uses qubits, which can be in superposition, so some problems can be solved faster than on classical machines.</general>';
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
    });
  });
  await new Promise<void>((r) => srv.listen(0, r));
  const port = (srv.address() as any).port;
  process.env.GEMINI_API_BASE = `http://127.0.0.1:${port}`; process.env.GEMINI_API_KEY = 'test';
  const { runAgent } = await import('../src/lib/lamo/agent');
  const { engineStatus } = await import('../src/lib/lamo/engineStatus');

  process.env.MOCK_MODE = 'good';
  const a = await runAgent({ question: 'what is quantam computing' });
  t('mock: concept answered via model', /qubits/i.test(a.answer) && !a.isUnanswered, a.answer);
  process.env.MOCK_MODE = 'bad';
  const b = await runAgent({ question: 'does he know about quantum computing' });
  t('mock: bad model output rejected, honest fallback', !/evil\.example/.test(b.answer) && !/Yes, quantum/i.test(b.answer), b.answer);
  process.env.MOCK_MODE = 'fail';
  const f = await runAgent({ question: 'can I heir him' });
  t('hire answered without model', /internship/i.test(f.answer), f.answer);
  const s = engineStatus();
  t('status tracks calls and rejections', s.calls >= 2 && s.rejected >= 1 && s.keyConfigured, s);
  srv.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
