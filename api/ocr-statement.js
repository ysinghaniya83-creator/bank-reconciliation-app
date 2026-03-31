module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    // Body may be pre-parsed object or raw string
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const { imageBase64, mimeType } = body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).end(JSON.stringify({ error: 'imageBase64 and mimeType are required' }));
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).end(JSON.stringify({ error: 'GEMINI_API_KEY environment variable is not set on the server' }));
    }

    const prompt = `You are an expert bank statement parser. Extract all transactions from this Indian bank statement image.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "bank": "detected bank name",
  "accountHolder": "account holder name as shown",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "full narration text",
      "credit": 0,
      "debit": 0,
      "referenceNo": null
    }
  ]
}

Rules: use 0 not null for amounts, parse all dates to YYYY-MM-DD, include every row.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } }
          ]
        }],
        generationConfig: { temperature: 0.1 }
      })
    });

    const rawText = await geminiRes.text();

    if (!geminiRes.ok) {
      return res.status(502).end(JSON.stringify({
        error: `Gemini API error ${geminiRes.status}: ${rawText.slice(0, 300)}`
      }));
    }

    let geminiData;
    try {
      geminiData = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).end(JSON.stringify({ error: 'Failed to parse Gemini response: ' + rawText.slice(0, 200) }));
    }

    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const finishReason = geminiData?.candidates?.[0]?.finishReason;
      return res.status(500).end(JSON.stringify({
        error: `Gemini returned no text. Finish reason: ${finishReason || 'unknown'}. Check image quality.`
      }));
    }

    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).end(JSON.stringify({ error: 'Gemini JSON parse failed: ' + cleaned.slice(0, 200) }));
    }

    return res.status(200).end(JSON.stringify(parsed));

  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).end(JSON.stringify({ error: 'Unexpected error: ' + msg }));
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};


