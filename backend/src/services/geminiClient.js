import { GoogleGenerativeAI } from '@google/generative-ai';

import { CAD_GLOSSARY } from '../config/cadGlossary.js';

const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

let cachedModel = null;

export function getGeminiModel() {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  if (!cachedModel) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    cachedModel = genAI.getGenerativeModel({ model: modelName });
  }

  return cachedModel;
}

function sanitizeResponseText(text) {
  if (!text) {
    return '';
  }

  return text
    .trim()
    .replace(/^```(?:json|markdown|md|text)?\n?/i, '')
    .replace(/```$/g, '')
    .trim();
}

function glossaryInstructions() {
  return CAD_GLOSSARY.map((entry) => `- ${entry.source}: ${entry.targetHint}`).join('\n');
}

function fallbackDetectLanguage(text) {
  const sample = text.slice(0, 2000);
  if (/[\u3040-\u30ff]/.test(sample)) {
    return 'Japanese';
  }
  if (/[\u4e00-\u9fff]/.test(sample)) {
    return 'Chinese';
  }
  if (/[äöüß]/i.test(sample)) {
    return 'German';
  }
  if (/[àâçéèêëîïôûùüÿœ]/i.test(sample)) {
    return 'French';
  }
  return 'English';
}

export async function detectLanguage(text) {
  const model = getGeminiModel();
  if (!model) {
    return fallbackDetectLanguage(text);
  }

  const prompt = `
You are a language detector for technical CAD documentation.
Return ONLY the most likely natural language name (for example: English, German, Japanese, French, Chinese).

Document snippet:
${text.slice(0, 8000)}
`.trim();

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  return sanitizeResponseText(responseText) || fallbackDetectLanguage(text);
}

function buildRawPrompt({ sourceText, sourceLanguage, targetLanguage }) {
  return `
You are a professional localization engineer specialized in Solidworks and CAD technical documentation.

Task:
- Translate from ${sourceLanguage} to ${targetLanguage}.
- Output plain translated text only.
- Keep engineering numbers, units, variable names, and product identifiers accurate.
- Apply this CAD glossary preference while preserving technical meaning:
${glossaryInstructions()}

Constraints:
- Do not summarize or omit sections.
- Do not include explanatory notes.
- Keep line breaks where practical for readability.

Source document:
${sourceText}
`.trim();
}

function buildPreservedPrompt({ sourceText, sourceLanguage, targetLanguage }) {
  return `
You are a professional localization engineer specialized in Solidworks and CAD technical documentation.

Task:
- Translate from ${sourceLanguage} to ${targetLanguage}.
- Produce a STRUCTURED MARKDOWN representation that preserves document structure.
- Preserve and translate headers, bullet lists, numbered lists, and tables.
- For tables, emit valid markdown table syntax.
- Keep engineering numbers, units, variable names, and product identifiers accurate.
- Apply this CAD glossary preference while preserving technical meaning:
${glossaryInstructions()}

Output format rules:
- Return only markdown content.
- No surrounding code fences.
- Keep source ordering intact.

Source document:
${sourceText}
`.trim();
}

function fallbackTranslate({
  sourceText,
  sourceLanguage,
  targetLanguage,
  mode,
}) {
  const structured = mode === 'preserved';
  const heading = structured
    ? `# Translation Placeholder (${sourceLanguage} -> ${targetLanguage})`
    : `[Translation Placeholder: ${sourceLanguage} -> ${targetLanguage}]`;

  return `${heading}

Gemini API key is not configured. Set GEMINI_API_KEY in backend/.env to enable model translation.

--- Source Content ---
${sourceText}`;
}

export async function translateDocument({
  sourceText,
  sourceLanguage,
  targetLanguage,
  mode,
}) {
  const model = getGeminiModel();
  if (!model) {
    return fallbackTranslate({ sourceText, sourceLanguage, targetLanguage, mode });
  }

  const prompt =
    mode === 'preserved'
      ? buildPreservedPrompt({ sourceText, sourceLanguage, targetLanguage })
      : buildRawPrompt({ sourceText, sourceLanguage, targetLanguage });

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  return sanitizeResponseText(responseText);
}
