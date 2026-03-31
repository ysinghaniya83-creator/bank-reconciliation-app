module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mimeType } = req.body || {};

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'imageBase64 and mimeType are required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured on server' });
  }

  const prompt = `You are an expert bank statement parser. Extract all transactions from this Indian bank statement image.

Return ONLY a valid JSON object with this exact structure:
{
  "bank": "detected bank name (e.g. ICICI Bank, HDFC Bank)",
  "accountHolder": "account holder name exactly as shown in the statement",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "full transaction narration or remarks text",
      "credit": 0,
      "debit": 0,
      "referenceNo": "cheque/ref number if present, otherwise null"
    }
  ]
}

Rules:
- Use 0 (not null) for credit when the transaction is a debit, and vice versa
- Parse ALL date formats correctly (26/03/2026, 26-Mar-2026, 26 Mar 2026) to YYYY-MM-DD
- Include EVERY transaction row visible in the image — do not skip any
- For description, use the full narration/remarks text as shown
- Return ONLY the JSON object, no explanation, no markdown`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      return res.status(502).json({ error: 'Failed to call Gemini API. Check your API key.' });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({ error: 'Gemini returned no content' });
    }

    // Strip markdown code fences if present (safety net)
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('OCR handler error:', err);
    return res.status(500).json({ error: 'Failed to process image: ' + (err.message || 'unknown error') });
  }
};
