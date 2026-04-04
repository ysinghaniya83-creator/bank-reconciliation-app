const https = require('https');

function readBody(req) {
  return new Promise(function (resolve, reject) {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        return resolve(req.body);
      }
      var raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
      try { return resolve(JSON.parse(raw)); } catch (e) { return resolve({}); }
    }
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      var raw = Buffer.concat(chunks).toString('utf8');
      try { resolve(JSON.parse(raw)); } catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function geminiPost(apiKey, payload) {
  return new Promise(function (resolve, reject) {
    var data = JSON.stringify(payload);
    var options = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    var req = https.request(options, function (response) {
      var chunks = [];
      response.on('data', function (c) { chunks.push(c); });
      response.on('end', function () {
        resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString('utf8') });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    var body = await readBody(req);
    var imageBase64 = body && body.imageBase64;
    var mimeType = body && body.mimeType;

    if (!imageBase64 || !mimeType) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'imageBase64 and mimeType are required' }));
    }

    var apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'GEMINI_API_KEY not set on server' }));
    }

    var prompt = 'You are an expert bank statement parser. Extract all transactions from this Indian bank statement image. ' +
      'Return ONLY a valid JSON object: { "bank": "bank name", "accountHolder": "holder name", ' +
      '"transactions": [ { "date": "YYYY-MM-DD", "description": "narration", "credit": 0, "debit": 0, "referenceNo": null } ] }. ' +
      'Rules: use 0 not null for amounts, parse all dates to YYYY-MM-DD, include every row, return only raw JSON no markdown.';

    var payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }],
      generationConfig: { temperature: 0.1 }
    };

    var geminiResult;
    try {
      geminiResult = await geminiPost(apiKey, payload);
    } catch (networkErr) {
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'Network error: ' + networkErr.message }));
    }

    if (geminiResult.status !== 200) {
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'Gemini error ' + geminiResult.status + ': ' + geminiResult.body.slice(0, 300) }));
    }

    var geminiData;
    try {
      geminiData = JSON.parse(geminiResult.body);
    } catch (e) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Cannot parse Gemini response: ' + geminiResult.body.slice(0, 200) }));
    }

    var candidates = geminiData && geminiData.candidates;
    var text = candidates && candidates[0] && candidates[0].content &&
      candidates[0].content.parts && candidates[0].content.parts[0] &&
      candidates[0].content.parts[0].text;

    if (!text) {
      var reason = (candidates && candidates[0] && candidates[0].finishReason) || 'unknown';
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Gemini returned no text. finishReason: ' + reason }));
    }

    var cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    var parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Gemini JSON invalid: ' + cleaned.slice(0, 300) }));
    }

    res.statusCode = 200;
    return res.end(JSON.stringify(parsed));

  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Unexpected: ' + (err && err.message ? err.message : String(err)) }));
  }
};


