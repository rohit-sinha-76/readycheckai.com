const fs = require('fs');
const path = require('path');

// Usage: node scripts/clean-questions.js [inputJson]
// Defaults to ../qus.json and writes ../qus.cleaned.json
const INPUT = process.argv[2]
  ? path.resolve(__dirname, '..', process.argv[2])
  : path.resolve(__dirname, '..', 'qus.json');
const base = path.basename(INPUT);
const OUTPUT = path.resolve(__dirname, `..`, base.replace(/\.json$/i, '.cleaned.json'));

function stripUrls(text) {
  return text.replace(/https?:\/\/\S+/gi, '').trim();
}

function removeMarkdownTable(text) {
  // Remove lines that look like markdown tables or contain many pipes
  return text
    .split(/\n+/)
    .filter((ln) => !/\|\s*\w+\s*\|/.test(ln) && (ln.match(/\|/g) || []).length < 2)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function removeSectionHeaders(text) {
  const patterns = [
    /\bModule\s+\d+\s*:/gi,
    /\bQuestion\s+\d+\b/gi,
    /\b\d+\.\d+(?:\.\d+)*\b/g, // numbered headings like 1.2, 2.3.1
    /Comparative Analysis of Leading Generative AI Models/gi,
    /FeatureChatGPT|Gemini|Claude \(Anthropic\)/gi,
    /Context:\s*General/gi,
    /The Generative AI Landscape/gi,
    /1\.3 Essential AI Terminology/gi,
    /2\.2 The Generative AI Landscape/gi,
    /\bREADME\b|\bTable of Contents\b/gi
  ];
  let t = text;
  for (const p of patterns) t = t.replace(p, '');
  // Remove standalone heading-like lines
  t = t
    .split(/\n+/)
    .filter((ln) => !/^\s*\d+(?:\.\d+)*\s+\S+/.test(ln))
    .join(' ');
  return t.replace(/\s{2,}/g, ' ').trim();
}

function removeTrailingCitations(text) {
  let t = text
    .replace(/\s*\(\d+\)\s*$/g, '') // trailing paren number
    .replace(/\s*\b\d+[\.)]?\s*$/g, '') // trailing number or number.
    .trim();
  return t;
}

function limitSentencesAndLength(text, maxSentences = 4, maxChars = 400) {
  let t = text.replace(/\s+/g, ' ').trim();
  // Sentence limit: split on period/question/exclamation followed by space
  const parts = t.split(/(?<=[.!?])\s+/);
  if (parts.length > maxSentences) t = parts.slice(0, maxSentences).join(' ');
  if (t.length > maxChars) t = t.slice(0, maxChars).trim();
  return t;
}

function normalizeWhitespace(text) {
  return text.replace(/[\u00A0\t\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function cleanText(text) {
  if (!text) return '';
  let t = String(text);
  t = stripUrls(t);
  t = removeMarkdownTable(t);
  t = removeSectionHeaders(t);
  t = removeTrailingCitations(t);
  t = normalizeWhitespace(t);
  t = limitSentencesAndLength(t, 4, 400);
  // Final pass: if everything removed, return empty string
  return t;
}

function clean() {
  const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const cleaned = data.map((q) => {
    const question = cleanText(q.question || '');
    const explanation = cleanText(q.explanation || '');
    return { ...q, question, explanation };
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(cleaned, null, 2), 'utf8');
  console.log(`Cleaned ${cleaned.length} items. Output -> ${OUTPUT}`);
}

try {
  clean();
} catch (e) {
  console.error('Cleaning failed:', e);
  process.exit(1);
}
