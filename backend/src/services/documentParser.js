import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

const MAX_EXTRACTION_CHARS = 50000;

function clampText(input) {
  if (!input) {
    return '';
  }

  if (input.length <= MAX_EXTRACTION_CHARS) {
    return input;
  }

  return `${input.slice(0, MAX_EXTRACTION_CHARS)}\n\n[Content truncated for processing.]`;
}

function normalizeWhitespace(text) {
  return text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

export async function extractDocument(file) {
  const extension = file.originalname.toLowerCase().split('.').pop();
  const mimeType = file.mimetype;
  let rawText = '';
  let sourceFormat = '';
  let structuredContent = '';

  if (extension === 'docx' || mimeType.includes('wordprocessingml')) {
    const { value } = await mammoth.extractRawText({ buffer: file.buffer });
    rawText = value;
    sourceFormat = 'docx';
    const html = await mammoth.convertToHtml({ buffer: file.buffer });
    structuredContent = html.value || '';
  } else if (extension === 'pdf' || mimeType.includes('pdf')) {
    const parser = new PDFParse({ data: file.buffer });
    const parsed = await parser.getText();
    rawText = parsed.text || '';
    await parser.destroy();
    sourceFormat = 'pdf';
    structuredContent = rawText;
  } else {
    throw new Error('Unsupported file type. Please upload .docx or .pdf.');
  }

  return {
    sourceFormat,
    extractedText: clampText(normalizeWhitespace(rawText)),
    structuredContent: clampText(normalizeWhitespace(structuredContent)),
  };
}
