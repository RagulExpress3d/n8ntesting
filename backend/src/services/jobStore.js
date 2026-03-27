import crypto from 'node:crypto';

const jobs = new Map();

export function createJob(fileName) {
  const id = crypto.randomUUID();
  const job = {
    id,
    fileName,
    stage: "queued",
    progress: 5,
    status: "processing",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    result: null,
    error: null,
  };

  jobs.set(id, job);
  return job;
}

export function updateJob(id, patch) {
  const existing = jobs.get(id);
  if (!existing) {
    return null;
  }

  const updated = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  jobs.set(id, updated);
  return updated;
}

export function getJob(id) {
  return jobs.get(id) ?? null;
}

export function updateJobProgress(id, progress, stage) {
  return updateJob(id, {
    progress,
    stage,
    status: 'processing',
    error: null,
  });
}

export function completeJob(id, result) {
  return updateJob(id, {
    progress: 100,
    stage: 'complete',
    status: 'completed',
    result,
    error: null,
  });
}

export function failJob(id, errorMessage) {
  return updateJob(id, {
    progress: 100,
    stage: 'failed',
    status: 'failed',
    error: errorMessage,
  });
}
