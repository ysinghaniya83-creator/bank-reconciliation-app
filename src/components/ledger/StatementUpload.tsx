import { useState, useRef, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useEntities } from '../../contexts/EntitiesContext';
import { useAuth } from '../../contexts/AuthContext';
import { CATEGORIES } from '../../lib/utils';
import { Transaction, Entity } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OcrTransaction {
  date: string;
  description: string;
  credit: number;
  debit: number;
  referenceNo: string | null;
}

interface ReviewRow {
  tempId: string;
  date: string;
  description: string;
  credit: string;
  debit: string;
  category: string;
  entityName: string;
  isDuplicate: boolean;
  selected: boolean;
}

type Step = 'upload' | 'loading' | 'review' | 'success';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 1600;
      const ratio = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.88).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

function matchEntity(accountHolder: string, entities: Entity[]): string {
  if (!accountHolder || entities.length === 0) return entities[0]?.name || '';
  const norm = accountHolder.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const e of entities) {
    // Check each word segment of entity name (split by " | ")
    const segments = e.name.toLowerCase().split('|').map(s => s.trim().replace(/[^a-z0-9]/g, ''));
    for (const seg of segments) {
      if (norm.includes(seg) || seg.includes(norm)) return e.name;
    }
  }
  return entities[0]?.name || '';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StatementUpload() {
  const { entities } = useEntities();
  const { appUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [ocrBank, setOcrBank] = useState('');
  const [ocrAccountHolder, setOcrAccountHolder] = useState('');
  const [globalEntity, setGlobalEntity] = useState('');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canEdit = appUser?.role === 'admin' || appUser?.role === 'editor';

  // ── File handling ────────────────────────────────────────────────────────

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG or JPG screenshot of the bank statement)');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── OCR extraction ───────────────────────────────────────────────────────

  const handleExtract = async () => {
    if (!selectedFile) return;
    setStep('loading');
    setError('');

    try {
      const base64 = await compressImage(selectedFile);

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to Vercel environment variables.');

      const prompt = 'You are an expert bank statement parser. Extract all transactions from this Indian bank statement image. ' +
        'Return ONLY a valid JSON object: { "bank": "bank name", "accountHolder": "holder name", ' +
        '"transactions": [ { "date": "YYYY-MM-DD", "description": "narration", "credit": 0, "debit": 0, "referenceNo": null } ] }. ' +
        'Rules: use 0 not null for amounts, parse all dates to YYYY-MM-DD, include every row, return only raw JSON no markdown.';

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: base64 } }] }],
            generationConfig: { temperature: 0.1 },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        let detail = `Gemini API error (${geminiRes.status})`;
        try { detail = JSON.parse(errText)?.error?.message || detail; } catch {}
        throw new Error(detail);
      }

      const geminiJson = await geminiRes.json();
      const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        const reason = geminiJson?.candidates?.[0]?.finishReason || 'unknown';
        throw new Error(`Gemini returned no text. finishReason: ${reason}. Try a clearer image.`);
      }
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      let parsedResult: { bank: string; accountHolder: string; transactions: OcrTransaction[] };
      try { parsedResult = JSON.parse(cleaned); } catch {
        throw new Error('Gemini returned invalid JSON. Try a clearer image.');
      }
      const data = parsedResult;
      const ocrTxns: OcrTransaction[] = data.transactions || [];

      if (ocrTxns.length === 0) {
        throw new Error('No transactions found in the image. Make sure the image shows a bank statement table clearly.');
      }

      setOcrBank(data.bank || '');
      setOcrAccountHolder(data.accountHolder || '');

      const matched = matchEntity(data.accountHolder || '', entities);
      setGlobalEntity(matched);

      // Fetch existing transactions for duplicate detection
      const snap = await getDocs(collection(db, 'transactions'));
      const existing: Transaction[] = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Transaction);

      // Build review rows with duplicate detection
      const reviewRows: ReviewRow[] = ocrTxns.map((t, i) => {
        const txDate = new Date(t.date);
        const isDuplicate = existing.some(ex => {
          if (ex.entityName !== matched) return false;
          const exDate = ex.date.toDate();
          const sameDay =
            exDate.getFullYear() === txDate.getFullYear() &&
            exDate.getMonth() === txDate.getMonth() &&
            exDate.getDate() === txDate.getDate();
          if (!sameDay) return false;
          const sameCredit = t.credit > 0 && Math.abs((ex.credit || 0) - t.credit) < 1;
          const sameDebit = t.debit > 0 && Math.abs((ex.debit || 0) - t.debit) < 1;
          return sameCredit || sameDebit;
        });

        return {
          tempId: `row-${i}`,
          date: t.date,
          description: t.description,
          credit: t.credit > 0 ? String(t.credit) : '',
          debit: t.debit > 0 ? String(t.debit) : '',
          category: '',
          entityName: matched,
          isDuplicate,
          selected: !isDuplicate,
        };
      });

      setRows(reviewRows);
      setStep('review');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
      setStep('upload');
    }
  };

  // ── Row editing ──────────────────────────────────────────────────────────

  const updateRow = (tempId: string, field: keyof ReviewRow, value: string | boolean) => {
    setRows(prev => prev.map(r => r.tempId === tempId ? { ...r, [field]: value } : r));
  };

  // When global entity changes, update all rows
  const handleGlobalEntityChange = (entityName: string) => {
    setGlobalEntity(entityName);
    setRows(prev => prev.map(r => ({ ...r, entityName })));
  };

  const selectedCount = rows.filter(r => r.selected && !r.isDuplicate).length;
  const duplicateCount = rows.filter(r => r.isDuplicate).length;

  // ── Save to Firestore ────────────────────────────────────────────────────

  const handleSave = async () => {
    const toSave = rows.filter(r => r.selected && !r.isDuplicate);
    if (toSave.length === 0) return;

    setSaving(true);
    setError('');
    try {
      for (const row of toSave) {
        const [year, month, day] = row.date.split('-').map(Number);
        const date = new Date(year, month - 1, day, 12, 0, 0);

        const docRef = await addDoc(collection(db, 'transactions'), {
          date: Timestamp.fromDate(date),
          entityName: row.entityName,
          description: row.description,
          category: row.category || 'Other',
          credit: row.credit !== '' ? parseFloat(row.credit) : null,
          debit: row.debit !== '' ? parseFloat(row.debit) : null,
          createdBy: appUser?.email || '',
          createdAt: Timestamp.now(),
          updatedBy: null,
          updatedAt: null,
        });
        await updateDoc(doc(db, 'transactions', docRef.id), { id: docRef.id });
      }
      setImportedCount(toSave.length);
      setStep('success');
    } catch (err: unknown) {
      setError('Failed to save: ' + (err instanceof Error ? err.message : 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRows([]);
    setError('');
    setOcrBank('');
    setOcrAccountHolder('');
    setGlobalEntity('');
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!canEdit) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500 dark:text-gray-400">You don't have permission to import transactions.</p>
      </div>
    );
  }

  // ── Step: Success ────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Import Successful!</h2>
        <p className="text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-green-600 dark:text-green-400">{importedCount}</span> transactions have been saved to the ledger.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            Upload Another
          </button>
          <button
            onClick={() => navigate('/ledger')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Go to Ledger
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Loading ────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-gray-800 dark:text-gray-200 font-medium">Analysing bank statement…</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Detecting transactions with Gemini AI</p>
        </div>
      </div>
    );
  }

  // ── Step: Review ─────────────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Review Transactions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {ocrBank && <span className="font-medium">{ocrBank}</span>}
              {ocrAccountHolder && <span> · {ocrAccountHolder}</span>}
            </p>
          </div>
          <button
            onClick={reset}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Upload different file
          </button>
        </div>

        {/* Entity selector */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Bank Account:</span>
          <select
            value={globalEntity}
            onChange={e => handleGlobalEntityChange(e.target.value)}
            className="text-sm border border-blue-300 dark:border-blue-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {entities.map(e => (
              <option key={e.id} value={e.name}>{e.name}</option>
            ))}
          </select>
          {duplicateCount > 0 && (
            <span className="text-sm text-amber-700 dark:text-amber-300 ml-auto">
              {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''} detected — will be skipped
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Review table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={rows.filter(r => !r.isDuplicate).every(r => r.selected)}
                      onChange={e => setRows(prev => prev.map(r => r.isDuplicate ? r : { ...r, selected: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Date</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-300">Description</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Credit (₹)</th>
                  <th className="px-3 py-2.5 text-right font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Debit (₹)</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-300">Category</th>
                  <th className="px-3 py-2.5 text-center font-medium text-gray-600 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map(row => (
                  <tr
                    key={row.tempId}
                    className={`${row.isDuplicate ? 'opacity-40' : ''} ${row.selected && !row.isDuplicate ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/30'}`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={row.selected && !row.isDuplicate}
                        disabled={row.isDuplicate}
                        onChange={e => updateRow(row.tempId, 'selected', e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 disabled:opacity-40"
                      />
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={row.date}
                        disabled={row.isDuplicate}
                        onChange={e => updateRow(row.tempId, 'date', e.target.value)}
                        className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 w-32"
                      />
                    </td>

                    {/* Description */}
                    <td className="px-3 py-2 max-w-xs">
                      <input
                        type="text"
                        value={row.description}
                        disabled={row.isDuplicate}
                        onChange={e => updateRow(row.tempId, 'description', e.target.value)}
                        className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 w-full min-w-[200px]"
                      />
                    </td>

                    {/* Credit */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.credit}
                        disabled={row.isDuplicate}
                        onChange={e => updateRow(row.tempId, 'credit', e.target.value)}
                        placeholder="0"
                        className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs text-right bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 w-28"
                      />
                    </td>

                    {/* Debit */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.debit}
                        disabled={row.isDuplicate}
                        onChange={e => updateRow(row.tempId, 'debit', e.target.value)}
                        placeholder="0"
                        className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs text-right bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 w-28"
                      />
                    </td>

                    {/* Category */}
                    <td className="px-3 py-2">
                      <select
                        value={row.category}
                        disabled={row.isDuplicate}
                        onChange={e => updateRow(row.tempId, 'category', e.target.value)}
                        className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 w-40"
                      >
                        <option value="">— Select —</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 text-center">
                      {row.isDuplicate ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          Duplicate
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          New
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selectedCount} transaction{selectedCount !== 1 ? 's' : ''} selected to import
            {duplicateCount > 0 && ` · ${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''} skipped`}
          </p>
          <button
            onClick={handleSave}
            disabled={selectedCount === 0 || saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Import {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Upload ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Import Bank Statement</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload a screenshot of your bank statement — AI will detect all transactions automatically.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {previewUrl ? (
          <div className="space-y-3">
            <img
              src={previewUrl}
              alt="Statement preview"
              className="max-h-64 mx-auto rounded-lg shadow object-contain"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">{selectedFile?.name}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Click or drop to change</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">Drop bank statement screenshot here</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to browse · PNG, JPG</p>
            </div>
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: '🔍', title: 'AI Detection', desc: 'Gemini AI reads all rows automatically' },
          { icon: '✏️', title: 'Review & Edit', desc: 'Correct any OCR errors before saving' },
          { icon: '🛡️', title: 'Duplicate Safe', desc: 'Already-entered transactions are skipped' },
        ].map(card => (
          <div key={card.title} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-1">{card.icon}</div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{card.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={handleExtract}
        disabled={!selectedFile}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Extract Transactions with AI
      </button>
    </div>
  );
}
