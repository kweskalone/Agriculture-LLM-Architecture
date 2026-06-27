const { parseModelOutput } = require('../src/services/llm/parseResponse');

describe('parseModelOutput', () => {
  test('parses a clean JSON object', () => {
    const raw = JSON.stringify({
      explanation: 'Late blight is a fungal disease.',
      treatment: ['Apply fungicide', 'Remove infected leaves'],
      prevention: ['Rotate crops'],
      severity: 'Severe',
    });
    const out = parseModelOutput(raw);
    expect(out.explanation).toMatch(/fungal disease/);
    expect(out.treatment).toHaveLength(2);
    expect(out.prevention).toEqual(['Rotate crops']);
    expect(out.severity).toBe('Severe');
  });

  test('extracts JSON embedded in surrounding text', () => {
    const raw = `Sure! Here is the advice:\n{"explanation":"x","treatment":["a"],"prevention":["b"],"severity":"mild"}\nHope this helps.`;
    const out = parseModelOutput(raw);
    expect(out.explanation).toBe('x');
    expect(out.severity).toBe('Mild');
  });

  test('falls back tolerantly on non-JSON text', () => {
    const raw = `Explanation: A common leaf disease.\n\nTreatment: spray copper\n\nPrevention: keep leaves dry\n\nSeverity: Moderate`;
    const out = parseModelOutput(raw);
    expect(out.explanation).toMatch(/leaf disease/i);
    expect(out.treatment.length).toBeGreaterThan(0);
    expect(out.severity).toBe('Moderate');
  });

  test('defaults severity to Moderate when missing/unknown', () => {
    const out = parseModelOutput('{"explanation":"x","severity":"banana"}');
    expect(out.severity).toBe('Moderate');
  });

  test('handles empty input without throwing', () => {
    const out = parseModelOutput('');
    expect(out).toEqual({ explanation: '', treatment: [], prevention: [], severity: 'Moderate' });
  });
});
