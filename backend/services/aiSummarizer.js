const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const { GoogleGenAI } = require('@google/genai');

async function processArticle(url) {
  // Check API key presence
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_actual_gemini_api_key_here') {
    throw new Error('Missing valid GEMINI_API_KEY in backend/.env file.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // 1. Fetch raw HTML
  console.log(`[Scraper] Fetching content from: ${url}`);
  const response = await fetch(url, {
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP fetch failed with status: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // 2. Parse main content
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const pageTitle = (article && article.title) || dom.window.document.title || 'Saved Web Page';
  const rawContent = (article && article.textContent) || dom.window.document.body.textContent || '';

  if (!rawContent.trim()) {
    throw new Error('Could not extract text content from the target URL.');
  }

  const cleanContent = rawContent.slice(0, 7000);
  console.log(`[Scraper] Extracted ${cleanContent.length} characters. Calling Gemini API...`);

  // 3. Prompt Gemini
  const prompt = `
Analyze the following web article text and return ONLY a valid JSON object with NO markdown formatting or code blocks.
JSON Format:
{
  "summary": ["Takeaway bullet 1", "Takeaway bullet 2", "Takeaway bullet 3"],
  "tags": ["tag1", "tag2", "tag3"]
}

Article Title: ${pageTitle}
Article Text:
${cleanContent}
`;

  const aiResult = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
  });

  console.log('[AI] Received response from Gemini.');

  // Clean markdown backticks if present
  let cleanJson = aiResult.text.replace(/```json/gi, '').replace(/```/g, '').trim();

  let parsedData;
  try {
    parsedData = JSON.parse(cleanJson);
  } catch (parseError) {
    console.error('[AI] JSON Parse Error. Raw response was:', aiResult.text);
    parsedData = {
      summary: ['Could not auto-summarize text.', 'Raw content preserved in vault.'],
      tags: ['uncategorized'],
    };
  }

  const domain = new URL(url).hostname.replace('www.', '');

  return {
    title: pageTitle,
    domain,
    summary: parsedData.summary || ['No summary generated.'],
    tags: parsedData.tags || ['uncategorized'],
  };
}

module.exports = { processArticle };