// src/components/Dashboard.tsx
import React, { useState, useCallback, useContext, useRef, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { ResultDisplay } from './ResultDisplay';
import { Loader } from './Loader';
import {
  DocumentIcon,
  LogoutIcon,
  UploadIcon,
  SparklesIcon,
  CheckIcon,
  LightBulbIcon,
  FileIcon,
  TrashIcon,
} from './icons';
import type { UploadedFiles, FileKey } from '../types';
import { generateSaleDeed } from '../services/geminiService';
import { UserContext } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';

type DashboardProps = {
  onOpenMOD?: () => void;
  onOpenSaleAgreement?: () => void;
};

type ManualAadhaar = {
  name: string;
  aadhaarNumber: string;
  dob?: string;
  address?: string;
};

type PresenceMeta = { email?: string; online_at?: string };

/* Small UI blocks */
const HowItWorksStep: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white/80 to-violet-50/70 ring-1 ring-slate-200 shadow-lg p-6 text-center">
    <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-100 to-violet-100 border border-indigo-200">
      {icon}
    </div>
    <div className="font-semibold text-slate-900">{title}</div>
    <div className="text-sm text-slate-600">{children}</div>
  </div>
);

const DocumentChecklist: React.FC = () => (
  <div className="rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white/80 to-violet-50/70 ring-1 ring-slate-200 shadow-lg p-6">
    <div className="flex items-center gap-3 mb-3">
      <LightBulbIcon className="h-5 w-5 text-yellow-500" />
      <h3 className="text-base font-semibold text-slate-900">Document Checklist</h3>
    </div>
    <p className="text-sm text-slate-600 mb-3">
      For best results, please ensure your PDF documents are:
    </p>
    <ul className="space-y-2">
      <li className="flex gap-2">
        <CheckIcon className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <span className="text-sm text-slate-700">Clear and legible scans (not photos).</span>
      </li>
      <li className="flex gap-2">
        <CheckIcon className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <span className="text-sm text-slate-700">Upright and correctly oriented.</span>
      </li>
      <li className="flex gap-2">
        <CheckIcon className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <span className="text-sm text-slate-700">Complete, with all pages included.</span>
      </li>
      <li className="flex gap-2">
        <CheckIcon className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <span className="text-sm text-slate-700">Free of handwritten notes over key text.</span>
      </li>
    </ul>
  </div>
);

const MultiFileUpload: React.FC<{
  files: File[];
  onFileAdd: (file: File) => void;
  onFileRemove: (index: number) => void;
  label: string;
  id: string;
}> = ({ files, onFileAdd, onFileRemove, label, id }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') onFileAdd(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => e.preventDefault();
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') onFileAdd(file);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="space-y-2 mb-3">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center justify-between p-2 pl-3 bg-slate-100 border border-slate-300 rounded-lg"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <FileIcon className="h-5 w-5 text-blue-600 shrink-0" />
              <span className="text-sm text-slate-800 truncate" title={file.name}>
                {file.name}
              </span>
            </div>
            <button
              onClick={() => onFileRemove(index)}
              className="p-1 text-slate-500 hover:text-red-600 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      <label
        htmlFor={id}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center w-full h-24 px-4 transition bg-white border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-50"
      >
        <div className="text-center">
          <UploadIcon className="w-7 h-7 mb-2 text-slate-500 mx-auto" />
          <p className="text-sm text-slate-500">
            <span className="font-semibold">Click to add</span> or drag and drop
          </p>
          <p className="text-xs text-slate-400">PDF only</p>
        </div>
        <input
          id={id}
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ onOpenMOD, onOpenSaleAgreement }) => {
  const { user, trials, logout, useTrial } = useContext(UserContext);

  /* Files */
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({
    sampleDeed: null,
    sellerAadhaars: [],
    buyerAadhaars: [],
    sellerDeed: null,
  });

  /* Manual rows (optional) */
  const emptyRow: ManualAadhaar = { name: '', aadhaarNumber: '', dob: '', address: '' };
  const [sellerRows, setSellerRows] = useState<ManualAadhaar[]>([{ ...emptyRow }]);
  const [buyerRows, setBuyerRows] = useState<ManualAadhaar[]>([{ ...emptyRow }]);

  /* Presence */
  const [activeSessions, setActiveSessions] = useState<number>(1);
  const [allSessions, setAllSessions] = useState<
    Array<{ userId: string; email?: string; count: number }>
  >([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDeed, setGeneratedDeed] = useState('');

  /* Remove browser default body margin (fixes thin white strips) */
  useEffect(() => {
    const prev = document.body.style.margin;
    document.body.style.margin = '0';
    return () => {
      document.body.style.margin = prev;
    };
  }, []);

  /* Presence: global channel */
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('presence:global', {
      config: { presence: { key: user.id } },
    });

    const updateFromState = () => {
      const state = channel.presenceState() as Record<string, PresenceMeta[]>;
      const myCount = state[user.id]?.length ?? 0;
      setActiveSessions(Math.max(myCount, 1));
      const rows = Object.entries(state).map(([userId, metas]) => ({
        userId,
        email: metas?.[0]?.email,
        count: metas?.length ?? 0,
      }));
      rows.sort((a, b) => (a.email || a.userId).localeCompare(b.email || b.userId));
      setAllSessions(rows);
    };

    channel.on('presence', { event: 'sync' }, updateFromState).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString(), email: user.email });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  /* File handlers */
  const handleFileChange = useCallback((key: FileKey, file: File | null) => {
    setUploadedFiles((prev) => ({ ...prev, [key]: file }));
  }, []);
  const handleAddSellerAadhaar = (file: File) =>
    setUploadedFiles((p) => ({ ...p, sellerAadhaars: [...p.sellerAadhaars, file] }));
  const handleRemoveSellerAadhaar = (i: number) =>
    setUploadedFiles((p) => ({
      ...p,
      sellerAadhaars: p.sellerAadhaars.filter((_, idx) => idx !== i),
    }));
  const handleAddBuyerAadhaar = (file: File) =>
    setUploadedFiles((p) => ({ ...p, buyerAadhaars: [...p.buyerAadhaars, file] }));
  const handleRemoveBuyerAadhaar = (i: number) =>
    setUploadedFiles((p) => ({
      ...p,
      buyerAadhaars: p.buyerAadhaars.filter((_, idx) => idx !== i),
    }));

  /* Manual rows helpers */
  const isRowFilled = (r: ManualAadhaar) => r.name.trim() && r.aadhaarNumber.trim();
  const updateSellerRow = (i: number, field: keyof ManualAadhaar, value: string) =>
    setSellerRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const updateBuyerRow = (i: number, field: keyof ManualAadhaar, value: string) =>
    setBuyerRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const addSellerRow = () => setSellerRows((rows) => [...rows, { ...emptyRow }]);
  const addBuyerRow = () => setBuyerRows((rows) => [...rows, { ...emptyRow }]);
  const removeSellerRow = (i: number) =>
    setSellerRows((rows) =>
      rows.filter((_, idx) => idx !== i).length ? rows.filter((_, idx) => idx !== i) : [{ ...emptyRow }],
    );
  const removeBuyerRow = (i: number) =>
    setBuyerRows((rows) =>
      rows.filter((_, idx) => idx !== i).length ? rows.filter((_, idx) => idx !== i) : [{ ...emptyRow }],
    );

  /* Manual rows -> File (optional) */
  const manualRowsToFile = (rows: ManualAadhaar[], role: 'seller' | 'buyer'): File | null => {
    const filled = rows
      .map((r) => ({
        name: r.name.trim(),
        aadhaarNumber: r.aadhaarNumber.trim(),
        dob: r.dob?.trim(),
        address: r.address?.trim(),
      }))
      .filter(isRowFilled);

    if (!filled.length) return null;

    const lines = filled.map((e, idx) => {
      const parts: string[] = [];
      parts.push(`Entry ${idx + 1} (${role.toUpperCase()}):`);
      parts.push(`Name: ${e.name}`);
      parts.push(`Aadhaar: ${e.aadhaarNumber}`);
      if (e.dob) parts.push(`DOB: ${e.dob}`);
      if (e.address) parts.push(`Address: ${e.address}`);
      return parts.join('\n');
    });

    const text = `--- ${role.toUpperCase()} AADHAAR (MANUAL) ---\n${lines.join('\n\n')}\n--- END ---\n`;
    return new File([text], `${role}-aadhaar-manual.txt`, { type: 'text/plain' });
  };

  /* Validation (Aadhaar OPTIONAL) */
  const computeValidationErrors = (): string[] => {
    const errs: string[] = [];
    if (!uploadedFiles.sampleDeed) errs.push('Sample Sale Deed is required.');
    if (!uploadedFiles.sellerDeed) errs.push("Seller's Previous Sale Deed is required.");
    return errs;
  };

  /* Submit */
  const handleSubmit = async () => {
    const errs = computeValidationErrors();
    if (errs.length) {
      setError(errs.join(' '));
      return;
    }

    setError(null);
    setIsLoading(true);
    setGeneratedDeed('');

    try {
      if (!user?.isAdmin) await useTrial();

      const sellerManualFile = manualRowsToFile(sellerRows, 'seller');
      const buyerManualFile = manualRowsToFile(buyerRows, 'buyer');

      const filesForService: UploadedFiles = {
        sampleDeed: uploadedFiles.sampleDeed!,
        sellerDeed: uploadedFiles.sellerDeed!,
        sellerAadhaars: sellerManualFile
          ? [...uploadedFiles.sellerAadhaars, sellerManualFile]
          : [...uploadedFiles.sellerAadhaars],
        buyerAadhaars: buyerManualFile
          ? [...uploadedFiles.buyerAadhaars, buyerManualFile]
          : [...uploadedFiles.buyerAadhaars],
      };

      const deed = await generateSaleDeed(filesForService);
      setGeneratedDeed(deed);
    } catch (err: any) {
      setError(err?.message || 'Unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const hasTrials = user?.isAdmin || (trials !== null && trials > 0);
  const readyToGenerate = Boolean(uploadedFiles.sampleDeed && uploadedFiles.sellerDeed);

  /* Header button styles (static, so Tailwind keeps colors) */
  const headerBtnNeutral =
    'inline-flex items-center justify-center h-9 px-3 rounded-xl font-medium border border-slate-300 text-slate-700 bg-white/70 hover:bg-slate-50 transition whitespace-nowrap';
  const headerBtnBlue =
    'inline-flex items-center justify-center h-9 px-3 rounded-xl font-medium border border-blue-300 text-blue-700 bg-white/70 hover:bg-blue-50 transition whitespace-nowrap';
  const headerBtnViolet =
    'inline-flex items-center justify-center h-9 px-3 rounded-xl font-medium border border-violet-300 text-violet-700 bg-white/70 hover:bg-violet-50 transition whitespace-nowrap';

  return (
    // Use fixed inset-0 overflow-y-auto flex flex-col to match Landing.tsx layout
    <div className="fixed inset-0 overflow-y-auto bg-gradient-to-b from-indigo-100 via-indigo-50 to-slate-100 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-slate-200/70 sticky top-0 z-40 w-full">
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 shrink-0">
            <DocumentIcon className="h-6 w-6 text-indigo-600" />
            <span className="text-base font-semibold text-slate-900 whitespace-nowrap">
              Sale Deed Assistant
            </span>
          </div>

          {/* One-line controls */}
          <div className="flex items-center gap-2 sm:gap-3 text-sm flex-nowrap overflow-x-auto scrollbar-none">
            {user?.email && (
              <>
                <span className="font-semibold whitespace-nowrap">{user.email}</span>
                <span className="text-slate-300">|</span>
              </>
            )}

            <span className="whitespace-nowrap">
              Trials:{' '}
              {user?.isAdmin ? (
                <span className="font-bold text-blue-600">Unlimited</span>
              ) : (
                <span className="font-bold">{trials}</span>
              )}
            </span>

            <span className="text-slate-300">|</span>
            <span className="hidden sm:inline text-slate-600 whitespace-nowrap">
              Active sessions: <span className="font-semibold">{activeSessions}</span>
            </span>

            <a href="./sample-sale-deed.pdf" download className={headerBtnNeutral}>
              Sample Deed
            </a>
            <a href="./latha.ttf" download className={headerBtnNeutral}>
              Tamil Font
            </a>
            <a href="./saledeed-website-usermanual.pdf" download className={headerBtnNeutral}>
              User Manual
            </a>

            <button onClick={onOpenSaleAgreement} className={headerBtnBlue}>
              Open Sale Agreement
            </button>
            <button onClick={onOpenMOD} className={headerBtnBlue}>
              Open MOD Generator
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-2 font-medium text-slate-700 hover:text-indigo-600 rounded-md px-3 py-1.5 whitespace-nowrap"
            >
              <LogoutIcon className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Admin presence list */}
      {user?.isAdmin && (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <div className="text-sm font-semibold mb-2">Live Sessions (all users)</div>
            {allSessions.length === 0 ? (
              <div className="text-xs text-slate-500">No active sessions.</div>
            ) : (
              <div className="text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {allSessions.map((r) => (
                  <div key={r.userId} className="flex justify-between bg-slate-50 rounded px-2 py-1">
                    <span className="truncate">{r.email || r.userId}</span>
                    <span className="font-medium">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {/* How it works */}
        <div className="rounded-2xl bg-gradient-to-r from-white/90 to-indigo-50/90 ring-1 ring-slate-200 shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-center text-slate-800 mb-6">
            How It Works in 3 Simple Steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HowItWorksStep icon={<UploadIcon className="h-6 w-6" />} title="1. Upload Documents">
              Provide the sample deed, seller &amp; buyer Aadhaar, and the seller&apos;s prior deed.
            </HowItWorksStep>
            <HowItWorksStep icon={<SparklesIcon className="h-6 w-6" />} title="2. System Generates Draft">
              Our system analyzes the documents, extracts key data, and drafts the new sale deed.
            </HowItWorksStep>
            <HowItWorksStep icon={<CheckIcon className="h-6 w-6" />} title="3. Review &amp; Download">
              Edit the generated text if needed, then copy or download your finalized document.
            </HowItWorksStep>
          </div>
        </div>

        {/* Uploader + checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white/80 to-violet-50/70 ring-1 ring-slate-200 shadow-lg p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Start Generating Your Deed</h3>
            <p className="text-sm text-slate-600 mb-6">Please provide all required data to proceed.</p>

            <div className="space-y-6">
              {/* Required PDFs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileUpload
                  id="sampleDeed"
                  label="Sample Sale Deed (PDF) — Required"
                  onFileChange={(file) => handleFileChange('sampleDeed', file)}
                />
                <FileUpload
                  id="sellerDeed"
                  label="Seller's Previous Sale Deed (PDF) — Required"
                  onFileChange={(file) => handleFileChange('sellerDeed', file)}
                />
              </div>

              {/* Aadhaar PDFs (optional) */}
              <MultiFileUpload
                id="sellerAadhaars"
                label="Seller's Aadhaar PDF(s) — Optional"
                files={uploadedFiles.sellerAadhaars}
                onFileAdd={handleAddSellerAadhaar}
                onFileRemove={handleRemoveSellerAadhaar}
              />
              <MultiFileUpload
                id="buyerAadhaars"
                label="Buyer's Aadhaar PDF(s) — Optional"
                files={uploadedFiles.buyerAadhaars}
                onFileAdd={handleAddBuyerAadhaar}
                onFileRemove={handleRemoveBuyerAadhaar}
              />

              {/* Manual Sellers (optional) */}
              <div className="border rounded-lg p-4 bg-white/70">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900 mb-3">
                    Add Seller Aadhaar (Manual) — Optional
                  </div>
                  <button
                    type="button"
                    onClick={addSellerRow}
                    className="text-sm px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50"
                  >
                    + Add another seller
                  </button>
                </div>

                <div className="space-y-4">
                  {sellerRows.map((row, i) => (
                    <div
                      key={`seller-${i}`}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-md p-3 bg-white/60"
                    >
                      <input
                        type="text"
                        placeholder="Name"
                        className="w-full border rounded-md px-3 py-2"
                        value={row.name}
                        onChange={(e) => updateSellerRow(i, 'name', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Aadhaar Number"
                        className="w-full border rounded-md px-3 py-2"
                        value={row.aadhaarNumber}
                        onChange={(e) => updateSellerRow(i, 'aadhaarNumber', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Date of Birth (optional)"
                        className="w-full border rounded-md px-3 py-2"
                        value={row.dob}
                        onChange={(e) => updateSellerRow(i, 'dob', e.target.value)}
                      />
                      <textarea
                        placeholder="Address (optional)"
                        className="w-full border rounded-md px-3 py-2 md:col-span-1"
                        rows={3}
                        value={row.address}
                        onChange={(e) => updateSellerRow(i, 'address', e.target.value)}
                      />
                      {sellerRows.length > 1 && (
                        <div className="md:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeSellerRow(i)}
                            className="text-red-600 text-sm hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Manual Buyers (optional) */}
              <div className="border rounded-lg p-4 bg-white/70">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900 mb-3">
                    Add Buyer Aadhaar (Manual) — Optional
                  </div>
                  <button
                    type="button"
                    onClick={addBuyerRow}
                    className="text-sm px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50"
                  >
                    + Add another buyer
                  </button>
                </div>

                <div className="space-y-4">
                  {buyerRows.map((row, i) => (
                    <div
                      key={`buyer-${i}`}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-md p-3 bg-white/60"
                    >
                      <input
                        type="text"
                        placeholder="Name"
                        className="w-full border rounded-md px-3 py-2"
                        value={row.name}
                        onChange={(e) => updateBuyerRow(i, 'name', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Aadhaar Number"
                        className="w-full border rounded-md px-3 py-2"
                        value={row.aadhaarNumber}
                        onChange={(e) => updateBuyerRow(i, 'aadhaarNumber', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Date of Birth (optional)"
                        className="w-full border rounded-md px-3 py-2"
                        value={row.dob}
                        onChange={(e) => updateBuyerRow(i, 'dob', e.target.value)}
                      />
                      <textarea
                        placeholder="Address (optional)"
                        className="w-full border rounded-md px-3 py-2 md:col-span-1"
                        rows={3}
                        value={row.address}
                        onChange={(e) => updateBuyerRow(i, 'address', e.target.value)}
                      />
                      {buyerRows.length > 1 && (
                        <div className="md:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeBuyerRow(i)}
                            className="text-red-600 text-sm hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary action */}
            <div className="text-center mt-8">
              <button
                onClick={handleSubmit}
                disabled={isLoading || !hasTrials || !readyToGenerate}
                className={
                  readyToGenerate && hasTrials && !isLoading
                    ? 'inline-flex items-center justify-center gap-2 h-11 px-7 rounded-xl font-semibold shadow-[0_10px_25px_-8px_rgba(79,70,229,0.55)] hover:shadow-[0_16px_30px_-8px_rgba(79,70,229,0.65)] hover:scale-[1.02] active:scale-95 ring-1 ring-indigo-400/40 transition-all bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white'
                    : 'inline-flex items-center justify-center gap-2 h-11 px-7 rounded-xl font-semibold bg-blue-200 text-slate-700 cursor-not-allowed'
                }
              >
                {isLoading ? 'Generating...' : 'Draft Sale Deed'}
              </button>
              {!isLoading && !hasTrials && (
                <p className="text-red-600 text-sm mt-3">You have run out of free trials.</p>
              )}
            </div>

            {error && (
              <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center">
                {error}
              </div>
            )}
          </div>

          {/* Right rail */}
          <div className="lg:col-span-1">
            <DocumentChecklist />
          </div>
        </div>

        {/* Results */}
        {isLoading && <Loader />}
        {generatedDeed && !isLoading && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-slate-800 mb-3 text-center">
              Your Generated Sale Deed Draft
            </h2>
            <ResultDisplay text={generatedDeed} onTextChange={setGeneratedDeed} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 bg-gradient-to-r from-indigo-50 to-violet-50">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-600">
          &copy; {new Date().getFullYear()} Vitalize Ventures. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;