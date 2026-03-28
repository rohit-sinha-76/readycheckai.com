const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '..', 'quistions.txt');
const OUTPUT = path.resolve(__dirname, '..', 'qus.json');

function detectModule(line) {
  const m = line.match(/^Module\s+(\d+)\s*:\s*(.+)$/i);
  if (!m) return null;
  const idx = parseInt(m[1], 10);
  const name = m[2].trim();
  // Difficulty by module (deterministic mapping)
  const difficultyMap = {
    1: 'Beginner',
    2: 'Intermediate',
    3: 'Intermediate',
    4: 'Intermediate',
    5: 'Advanced',
  };
  const difficulty = difficultyMap[idx] || 'Intermediate';
  return { idx, name, difficulty };
}

function moduleBusinessContext(idx, name) {
  const map = {
    1: 'Foundational AI knowledge to align teams and avoid strategy missteps.',
    2: 'Awareness of current AI applications and tools to drive productivity.',
    3: 'Linking AI use cases to measurable business value and ROI.',
    4: 'Hands-on competency to apply AI tools safely and effectively.',
    5: 'Governance to reduce legal, compliance, and reputational risk.',
  };
  return map[idx] || `Context: ${name}`;
}

function parse() {
  const raw = fs.readFileSync(INPUT, 'utf8');
  // Normalize content: if user pasted without newlines, inject them before known markers
  let norm = raw
    .replace(/\r\n|\r/g, '\n')
    // Ensure a newline before Module headers
    .replace(/\s*(Module\s+\d+\s*:\s*)/gi, (m) => `\n${m.trim()}\n`)
    // Ensure a newline before each question marker like Q12. / Q 12. / Q12)
    .replace(/\s*(Q\s*\d+[\.)])/gi, (m) => `\n${m.trim()} `)
    // Also handle 'Question 12.'
    .replace(/\s*(Question\s*\d+[\.)])/gi, (m) => `\n${m.trim()} `)
    // Ensure newlines before options a) b) c) d) even if stuck to punctuation like '?a)'
    .replace(/\ba\)\s/gi, '\na) ')
    .replace(/\bb\)\s/gi, '\nb) ')
    .replace(/\bc\)\s/gi, '\nc) ')
    .replace(/\bd\)\s/gi, '\nd) ')
    // Also normalize variants like '(a) ', 'a. ', 'A) '
    .replace(/\s*\((a|b|c|d)\)\s/gi, (m, p1) => `\n${p1.toLowerCase()}) `)
    .replace(/\s+([a-dA-D])\.\s/g, (m, p1) => `\n${p1.toLowerCase()}) `)
    // Ensure newlines before Correct Answer and Explanation labels
    .replace(/\s*(Correct\s*Answer\s*:\s*)/gi, (m) => `\n${m.trim()} `)
    .replace(/\s*(Explanation\s*:\s*)/gi, (m) => `\n${m.trim()} `);

  const lines = norm.split(/\n/);

  const items = [];
  let currentModule = { idx: 0, name: 'General', difficulty: 'Intermediate' };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const mod = detectModule(line);
    if (mod) { currentModule = mod; continue; }

    const qMatch = line.match(/^(?:Q|Question)\s*(\d+)[\.)]\s*(.*)$/i);
    if (!qMatch) continue;

    const id = parseInt(qMatch[1], 10);
    let question = qMatch[2].trim();

    // Collect options a)-d)
    const options = [];
    let j = i + 1;
    // Matches: a) text, (a) text, a. text, A) text, etc.
    const optionRegex = /^\(?([a-dA-D])[\)\.\:]\s*(.*)$/;
    while (j < lines.length && options.length < 4) {
      const optLine = lines[j].trim();
      const om = optLine.match(optionRegex);
      if (om) {
        // om[1] is the letter, om[2] is the option text
        options.push(om[2].trim());
        j++;
        continue;
      }
      // If we encounter empty lines, skip
      if (optLine === '') { j++; continue; }
      // Stop if non-option appears and we already started options
      if (options.length > 0) break;
      // If question wraps on next line before options start, append
      if (!/^Q\d+\./.test(optLine)) {
        question += ' ' + optLine;
        j++;
        continue;
      }
      break;
    }

    // Find Correct Answer line
    let correctLetter = null;
    let correctText = null;
    let explanation = '';
    while (j < lines.length) {
      const t = lines[j].trim();
      // Accept letter formats like 'a', 'A', '(a)', 'a)', 'a.'
      let correctM = t.match(/^Correct\s*Answer\s*:\s*\(?\s*([a-dA-D])\s*[\)\.]?\s*$/i);
      if (correctM) {
        correctLetter = correctM[1].toLowerCase();
        j++;
        // Next should be Explanation
        if (j < lines.length) {
          const explStart = lines[j].trim();
          const explM = explStart.match(/^Explanation\s*:\s*(.*)$/i);
          if (explM) {
            explanation = explM[1].trim();
            j++;
            // Consume any continuation lines of explanation that do not start with Q or Module
            while (j < lines.length) {
              const cont = lines[j].trim();
              if (!cont || /^Q\d+\./.test(cont) || /^Module\s+\d+\s*:/i.test(cont)) break;
              // Stop on another meta header like '1.2 ' style? Keep conservative
              if (/^\d+\./.test(cont)) break;
              explanation += (explanation ? ' ' : '') + cont;
              j++;
            }
          }
        }
        break;
      } else {
        // Try full-text answer format
        const correctTextM = t.match(/^Correct\s*Answer\s*:\s*(.+)$/i);
        if (correctTextM) {
          correctText = correctTextM[1].trim();
          j++;
          // Next should be Explanation (optional)
          if (j < lines.length) {
            const explStart = lines[j].trim();
            const explM = explStart.match(/^Explanation\s*:\s*(.*)$/i);
            if (explM) {
              explanation = explM[1].trim();
              j++;
              while (j < lines.length) {
                const cont = lines[j].trim();
                if (!cont || /^Q\d+\./.test(cont) || /^Module\s+\d+\s*:/i.test(cont)) break;
                if (/^\d+(?:\.\d+)*\s/.test(cont)) break; // stop at numbered headings like 1.2, 2.3.1
                explanation += (explanation ? ' ' : '') + cont;
                j++;
              }
            }
          }
          break;
        }
      }
      // If we hit next question or module before Correct Answer, stop
      if (/^Q\d+\./.test(t) || /^Module\s+\d+\s*:/i.test(t)) break;
      j++;
    }

    // Map correct letter to text
    const letterIndex = { a: 0, b: 1, c: 2, d: 3 };
    let correctOption = '';
    if (correctLetter && letterIndex[correctLetter] != null && options[letterIndex[correctLetter]]) {
      correctOption = options[letterIndex[correctLetter]];
    } else if (correctText) {
      // Try to map by matching text to one of the option strings
      const idx = options.findIndex(opt => opt.toLowerCase() === correctText.toLowerCase() || opt.toLowerCase().includes(correctText.toLowerCase()));
      if (idx !== -1) correctOption = options[idx];
    }

    const item = {
      id,
      category: currentModule.name,
      difficulty: currentModule.difficulty,
      question,
      options,
      correctOption,
      explanation,
      businessContext: moduleBusinessContext(currentModule.idx, currentModule.name)
    };

    items.push(item);
    // Advance i to j-1 so the for loop increments to j
    i = j - 1;
  }

  // Keep only well-formed entries with 4 options and a correctOption
  const cleaned = items.filter(q => q.options.length === 4 && q.correctOption);

  // Debug: report drop reasons
  const debug = process.env.DEBUG_PARSE === '1';
  if (debug) {
    const rejected = items.filter(q => !(q.options.length === 4 && q.correctOption));
    const summary = {
      detected_questions: items.length,
      kept_questions: cleaned.length,
      rejected_count: rejected.length,
      rejected_sample: rejected.slice(0, 10).map(r => ({ id: r.id, opts: r.options.length, hasCorrect: !!r.correctOption, question: r.question.slice(0, 120) }))
    };
    try {
      fs.writeFileSync(path.resolve(__dirname, 'parse-debug.json'), JSON.stringify(summary, null, 2), 'utf8');
      fs.writeFileSync(path.resolve(__dirname, 'norm-preview.txt'), norm.slice(0, 50000), 'utf8');
    } catch (_) {}
  }

  // Sort by id ascending
  cleaned.sort((a, b) => a.id - b.id);

  fs.writeFileSync(OUTPUT, JSON.stringify(cleaned, null, 2), 'utf8');
  console.log(`Detected ${items.length} total; kept ${cleaned.length}. Parsed file -> ${OUTPUT}`);
}

try {
  parse();
} catch (e) {
  console.error('Failed to parse questions:', e);
  process.exit(1);
}
