import express from 'express';
import multer from 'multer';

import {
  detectLanguage,
  translateDocument,
} from '../services/geminiClient.js';
import { extractDocument } from '../services/documentParser.js';
import {
  completeJob,
  createJob,
  failJob,
  getJob,
  updateJobProgress,
} from '../services/jobStore.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

const SUPPORTED_EXTENSIONS = ['docx', 'pdf'];

function getExtension(filename = '') {
  const segments = filename.toLowerCase().split('.');
  return segments.length > 1 ? segments.pop() : '';
}

function validateTargetLanguage(targetLanguage) {
  return Boolean(targetLanguage && targetLanguage.trim().length > 0);
}

async function processTranslationJob({ jobId, file, mode, targetLanguage }) {
  try {
    updateJobProgress(jobId, 12, 'Extracting document content...');
    const parsed = await extractDocument(file);

    if (!parsed.extractedText || parsed.extractedText.trim().length < 3) {
      throw new Error('The uploaded file appears to be empty or unreadable.');
    }

    updateJobProgress(jobId, 35, 'Detecting source language...');
    const sourceLanguage = await detectLanguage(parsed.extractedText);

    const sourceForTranslation =
      mode === 'preserved' && parsed.structuredContent
        ? parsed.structuredContent
        : parsed.extractedText;

    updateJobProgress(jobId, 62, 'Applying CAD glossary and translating...');
    const translation = await translateDocument({
      sourceText: sourceForTranslation,
      sourceLanguage,
      targetLanguage,
      mode,
    });

    updateJobProgress(jobId, 92, 'Finalizing response...');
    completeJob(jobId, {
      filename: file.originalname,
      extension: parsed.sourceFormat || getExtension(file.originalname),
      sourceLanguage,
      targetLanguage,
      mode,
      extractedCharacters: parsed.extractedText.length,
      outputFormat: mode === 'preserved' ? 'structured-markdown' : 'plain-text',
      translatedText: translation,
    });
  } catch (error) {
    failJob(jobId, error.message || 'Translation failed.');
  }
}

router.post(
  '/translate',
  upload.single('document'),
  async (request, response) => {
    const { file } = request;
    const mode = request.body.mode === 'preserved' ? 'preserved' : 'raw';
    const targetLanguage = request.body.targetLanguage;

    try {
      if (!file) {
        throw new Error('A .docx or .pdf file is required.');
      }

      const extension = getExtension(file.originalname);
      if (!SUPPORTED_EXTENSIONS.includes(extension)) {
        throw new Error('Unsupported file type. Please upload .docx or .pdf.');
      }

      if (!validateTargetLanguage(targetLanguage)) {
        throw new Error('A target language must be selected.');
      }

      const job = createJob(file.originalname);
      response.status(202).json({
        jobId: job.id,
      });

      void processTranslationJob({
        jobId: job.id,
        file,
        mode,
        targetLanguage,
      });
    } catch (error) {
      response.status(400).json({
        error: error.message || 'Translation failed.',
      });
    }
  },
);

router.get('/jobs/:id', (request, response) => {
  const job = getJob(request.params.id);
  if (!job) {
    return response.status(404).json({
      error: 'Job not found.',
    });
  }

  return response.json(job);
});

export { router as translationRouter };
