const https = require('https');

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // body may be pre-parsed object or a raw string
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { imageBase64, mimeType } = body || {};

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'imageBase64 and mimeType are required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not set on server' });
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
      "referenceNo": "ref number or null"
    }
  ]
}

Rules:
- Use 0 (not null) when a field has no value
- Parse all date formats to YYYY-MM-DD
- Include every transaction row — do not skip any`;

  try {
    const geminiBody = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }],
      generationConfig: { temperature: 0.1 }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const { status, body: rawBody } = await httpsPost(url, geminiBody);

    if (status !== 200) {
      console.error('Gemini non-200:', status, rawBody.slice(0, 500));
      return res.status(502).json({ error: `Gemini API returned ${status}. Check your API key.` });
    }

    let geminiData;
    try { geminiData = JSON.parse(rawBody); } catch (e) {
      console.error('Gemini parse fail:', rawBody.slice(0, 200));
      return res.status(500).json({ error: 'Failed to parse Gemini response' });
    }

    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('Gemini empty text. Full response:', JSON.stringify(geminiData).slice(0, 500));
      return res.status(500).json({ error: 'Gemini returned no content. The image may be unreadable.' });
    }

    // Strip markdown fences if present
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed;
    try { parsed = JSON.parse(cleaned); } catch (e) {
      console.error('JSON parse fail from Gemini text:', cleaned.slice(0, 300));
      return res.status(500).json({ error: 'Gemini returned invalid JSON. Try a clearer image.' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('OCR handler exception:', err);
    return res.status(500).json({ error: 'Unexpected error: ' + (err.message || String(err)) });
  }
};

