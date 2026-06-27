function humanizeDisease(disease) {
  return String(disease)
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPrompt({ disease, crop, confidence, language = 'en' }) {
  const readableDisease = humanizeDisease(disease);
  const cropLine = crop ? `Crop: ${crop}\n` : '';
  const confidenceLine =
    typeof confidence === 'number'
      ? `Detection confidence: ${(confidence * 100).toFixed(1)}%\n`
      : '';

  return `You are an expert agricultural advisor helping smallholder farmers.
A computer-vision system detected the following plant disease.

Disease: ${readableDisease}
${cropLine}${confidenceLine}
Provide practical, actionable advice for this disease.

Respond with a SINGLE valid JSON object and nothing else, using exactly these keys:
{
  "explanation": "a short, clear explanation of the disease in 2-3 sentences",
  "treatment": ["actionable treatment step", "another step"],
  "prevention": ["actionable prevention step", "another step"],
  "severity": "one of: Mild, Moderate, Severe"
}

Use simple language a farmer can follow. Keep each list item short.
Write the response in language code: ${language}.`;
}

module.exports = { buildPrompt, humanizeDisease };
