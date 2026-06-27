const SEVERITIES = ['Mild', 'Moderate', 'Severe'];

function normalizeSeverity(value) {
  if (!value) return 'Moderate';
  const match = SEVERITIES.find(
    (s) => s.toLowerCase() === String(value).trim().toLowerCase()
  );
  return match || 'Moderate';
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|(?:^|\s)\d+[.)]\s|(?:^|\s)[-*]\s/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function extractJsonBlock(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function shape(obj) {
  return {
    explanation: typeof obj.explanation === 'string' ? obj.explanation.trim() : '',
    treatment: toStringArray(obj.treatment),
    prevention: toStringArray(obj.prevention),
    severity: normalizeSeverity(obj.severity),
  };
}

function extractSection(text, label) {
  const re = new RegExp(`${label}\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*\\n|$)`, 'i');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

// Last-resort parser when the model returns free-form text, not JSON.
function tolerantParse(text) {
  return {
    explanation: extractSection(text, 'explanation') || text.trim().slice(0, 500),
    treatment: toStringArray(extractSection(text, 'treatment')),
    prevention: toStringArray(extractSection(text, 'prevention')),
    severity: normalizeSeverity(extractSection(text, 'severity')),
  };
}

function parseModelOutput(rawText) {
  const text = String(rawText || '').trim();
  if (!text) {
    return { explanation: '', treatment: [], prevention: [], severity: 'Moderate' };
  }

  const block = extractJsonBlock(text);
  if (block) {
    try {
      return shape(JSON.parse(block));
    } catch {
      // Fall through to tolerant parsing.
    }
  }
  return tolerantParse(text);
}

module.exports = { parseModelOutput, normalizeSeverity, toStringArray };
