import { useEffect, useMemo, useState } from 'react';

const TARGET_LANGUAGES = [
  'English',
  'German',
  'Japanese',
  'French',
  'Chinese',
  'Spanish',
  'Italian',
  'Korean',
  'Portuguese',
];

const CAD_TERMS = [
  'Mates',
  'Sketches',
  'Assemblies',
  'Drawings',
  'Simulation',
  'FeatureManager',
  'BOM',
  'Configurations',
];

function ProgressBar({ value, stage }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{stage || 'Waiting'}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('German');
  const [mode, setMode] = useState('preserved');
  const [jobId, setJobId] = useState('');
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);

  const isProcessing = submitting || polling;
  const fileLabel = useMemo(() => {
    if (!file) {
      return 'Drop a .docx or .pdf file here, or click to browse';
    }
    return `${file.name} (${Math.round(file.size / 1024)} KB)`;
  }, [file]);

  useEffect(() => {
    if (!jobId) {
      return undefined;
    }

    let cancelled = false;
    setPolling(true);

    const poll = async () => {
      try {
        const response = await fetch(`/api/translation/jobs/${jobId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to fetch translation job status.');
        }

        if (!cancelled) {
          setJob(data);
          if (data.status === 'failed' && data.error) {
            setError(data.error);
          }
        }

        if (!cancelled && (data.status === 'completed' || data.status === 'failed')) {
          setPolling(false);
          return;
        }

        if (!cancelled) {
          setTimeout(poll, 1500);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || 'Status polling failed.');
          setPolling(false);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const onFileSelect = (selected) => {
    if (!selected) {
      return;
    }
    const extension = selected.name.toLowerCase().split('.').pop();
    if (!['docx', 'pdf'].includes(extension)) {
      setError('Only .docx and .pdf files are supported.');
      return;
    }
    setError('');
    setFile(selected);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    onFileSelect(event.dataTransfer.files?.[0]);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setJob(null);
    setJobId('');

    if (!file) {
      setError('Please upload a .docx or .pdf file.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('targetLanguage', targetLanguage);
      formData.append('mode', mode);

      const response = await fetch('/api/translation/translate', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to queue translation job.');
      }

      setJobId(data.jobId);
      setJob({
        progress: 5,
        stage: 'Job accepted',
        status: 'processing',
      });
    } catch (submitError) {
      setError(submitError.message || 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            CAD Localization Suite
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
            Solidworks & CAD Localization Tool
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            Translate technical .docx and .pdf documentation with CAD-aware
            terminology control and optional structure-preserving output.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-6">
            <label
              htmlFor="file-input"
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
                dragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 bg-slate-50 hover:border-blue-400'
              }`}
            >
              <input
                id="file-input"
                type="file"
                accept=".docx,.pdf"
                className="hidden"
                onChange={(event) => onFileSelect(event.target.files?.[0])}
              />
              <p className="text-sm font-medium">{fileLabel}</p>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Target Language</span>
                <select
                  value={targetLanguage}
                  onChange={(event) => setTargetLanguage(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-400 focus:ring"
                >
                  {TARGET_LANGUAGES.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Output Mode</legend>
                <div className="flex rounded-lg border border-slate-300 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setMode('raw')}
                    className={`flex-1 rounded-md px-3 py-2 text-sm ${
                      mode === 'raw'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Raw Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('preserved')}
                    className={`flex-1 rounded-md px-3 py-2 text-sm ${
                      mode === 'preserved'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Preserved Formatting
                  </button>
                </div>
              </fieldset>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                CAD Glossary Layer
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Domain-aware terminology controls are enforced for key Solidworks
                entities:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CAD_TERMS.map((term) => (
                  <span
                    key={term}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isProcessing ? 'Processing...' : 'Start Localization'}
            </button>
          </form>
        </section>

        {(job || error) && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {job && (
              <div className="space-y-4">
                <ProgressBar value={job.progress ?? 0} stage={job.stage} />
                <div className="text-sm text-slate-700">
                  <p>
                    <strong>Status:</strong> {job.status}
                  </p>
                  {job.result?.sourceLanguage && (
                    <p>
                      <strong>Detected Source Language:</strong>{' '}
                      {job.result.sourceLanguage}
                    </p>
                  )}
                  {job.result?.outputFormat && (
                    <p>
                      <strong>Output Format:</strong> {job.result.outputFormat}
                    </p>
                  )}
                </div>
                {job.status === 'completed' && job.result?.translatedText && (
                  <div>
                    <h2 className="mb-2 text-lg font-semibold">Translated Output</h2>
                    <pre className="max-h-96 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-wrap">
                      {job.result.translatedText}
                    </pre>
                  </div>
                )}
                {job.status === 'failed' && job.error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {job.error}
                  </p>
                )}
              </div>
            )}
            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default App;
