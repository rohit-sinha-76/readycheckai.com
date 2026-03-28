const fs = require('fs');
const path = require('path');

const INPUT = process.argv[2]
  ? path.resolve(__dirname, '..', process.argv[2])
  : path.resolve(__dirname, '..', 'qus.json');
const base = path.basename(INPUT);
const REPORT = path.resolve(__dirname, `validation-report.${base}.json`);

function hasIrrelevantSignals(text) {
  const t = (text || '').trim();
  if (!t) return { flagged: true, reasons: ['empty_text'] };

  const reasons = [];
  // Length-based
  if (t.length > 400) reasons.push('too_long>400');
  if ((t.match(/\./g) || []).length > 4) reasons.push('too_many_sentences');

  // Section headers and artifacts
  const patterns = [
    /\bModule\s+\d+\s*:/i,
    /\bQuestion\s+\d+\b/i,
    /\b\d+\.\d+(?:\.\d+)*\b/, // like 1.2, 2.3.1
    /Comparative Analysis of Leading Generative AI Models/i,
    /FeatureChatGPT|Gemini|Claude \(Anthropic\)/i,
    /Context:\s*General/i,
    /The Generative AI Landscape/i,
    /1\.3 Essential AI Terminology/i,
    /2\.2 The Generative AI Landscape/i,
    /\bREADME\b|\bTable of Contents\b/i
  ];
  if (patterns.some(p => p.test(t))) reasons.push('contains_section_or_header');

  // Citations like trailing single digits or "," then digit
  if (/\b\d+\s*$/.test(t) || /\b\d+\.$/.test(t)) reasons.push('trailing_citation_number');
  if (/\b\d+\)$/.test(t)) reasons.push('trailing_paren_number');

  // URLs or markdown tables (signals of noise)
  if (/https?:\/\//i.test(t)) reasons.push('contains_url');
  if (/\|\s*\w+\s*\|/.test(t)) reasons.push('markdown_table_fragment');

  return { flagged: reasons.length > 0, reasons };
}

function validate() {
  const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const results = [];
  for (const q of data) {
    const qCheck = hasIrrelevantSignals(q.question);
    const eCheck = hasIrrelevantSignals(q.explanation || '');

    const item = {
      id: q.id,
      category: q.category,
      reasons_question: qCheck.flagged ? qCheck.reasons : [],
      reasons_explanation: eCheck.flagged ? eCheck.reasons : [],
      question_preview: (q.question || '').slice(0, 200),
      explanation_preview: (q.explanation || '').slice(0, 200),
    };

    if (qCheck.flagged || (eCheck.flagged && eCheck.reasons.some(r => r !== 'empty_text'))) {
      results.push(item);
    }
  }

  const summary = {
    total: data.length,
    flagged: results.length,
    top_ids: results.slice(0, 20).map(r => r.id),
  };

  fs.writeFileSync(REPORT, JSON.stringify({ summary, results }, null, 2), 'utf8');
  console.log(`Validated ${data.length} items. Flagged ${results.length}. Report -> ${REPORT}`);
}

try {
  validate();
} catch (e) {
  console.error('Validation failed:', e);
  process.exit(1);
}
