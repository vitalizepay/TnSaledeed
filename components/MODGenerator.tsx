import React, { useCallback, useContext, useState } from 'react';
import { UserContext } from '../contexts/UserContext';
import { FileUpload } from './FileUpload';
import { ResultDisplay } from './ResultDisplay';
import { Loader } from './Loader';
import {
  DownloadIcon,
  CheckIcon,
  DocumentIcon,
  UploadIcon,
  FileIcon,
  LogoutIcon,
  SparklesIcon,
  CheckIcon as BigCheckIcon,
} from './icons';
import { generateMODDocument } from '../services/modService';

// Types that match modService
type Run = { text: string; isBold: boolean; isUnderlined: boolean; fontSize: number };
type ParagraphJSON = {
  alignment: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY';
  indentFirstLineInches: number;
  runs: Run[];
};
type Block = { type: 'PARAGRAPH'; content: ParagraphJSON };

// Inline icons
const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" {...props}>
    <path strokeWidth={1.8} d="M9 3h6a2 2 0 0 1 2 2v1h-3.5a1.5 1.5 0 0 0-3 0H7V5a2 2 0 0 1 2-2Z" />
    <rect x="5" y="6" width="14" height="14" rx="2" strokeWidth={1.8} />
  </svg>
);
const RupeeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" {...props}>
    <path strokeWidth={1.8} d="M7 5h10M7 9h10M7 9a5 5 0 0 0 5 5H9l6 5" />
  </svg>
);
const BankIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" {...props}>
    <path strokeWidth={1.8} d="M3 10h18M5 10v7m4-7v7m4-7v7m4-7v7M2 21h20M12 3l9 5H3l9-5Z" />
  </svg>
);

// Small field components
const InputField = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon?: React.ReactNode;
  type?: string;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <div className="relative">
      {icon && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">{icon}</div>}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
      />
    </div>
  </div>
);

const TextAreaField = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  icon?: React.ReactNode;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <div className="relative">
      {icon && <div className="pointer-events-none absolute top-2 left-0 flex items-center pl-3 text-slate-500">{icon}</div>}
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}
      />
    </div>
  </div>
);

// Reusable "How it works" step
const HowItWorksStep: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <div className="rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white/80 to-violet-50/70 ring-1 ring-slate-200 shadow-lg p-6 text-center">
    <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-100 to-violet-100 border border-indigo-200">
      {icon}
    </div>
    <div className="font-semibold text-slate-900">{title}</div>
    <div className="text-sm text-slate-600">{children}</div>
  </div>
);

const MODGenerator: React.FC<{
  onOpenSaleDeed?: () => void;
  onOpenSaleAgreement?: () => void;
}> = ({ onOpenSaleDeed, onOpenSaleAgreement }) => {
  const { user, trials, useTrial, logout } = useContext(UserContext);

  // Inputs
  const [bankName, setBankName] = useState('');
  const [bankRegisteredOffice, setBankRegisteredOffice] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [loanAmount, setLoanAmount] = useState('');

  // Files
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [saleDeedFile, setSaleDeedFile] = useState<File | null>(null);
  const [sampleModFile, setSampleModFile] = useState<File | null>(null);

  // State
  const [generated, setGenerated] = useState<Block[] | null>(null);
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const formatINR = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    const last3 = digits.slice(-3);
    const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return head ? `${head},${last3}` : last3;
  };
  const onLoanChange = (e: React.ChangeEvent<HTMLInputElement>) => setLoanAmount(formatINR(e.target.value));

  const formValid =
    !!(aadhaarFile && saleDeedFile && sampleModFile && bankName && bankRegisteredOffice && branchAddress && loanAmount);

  const handleSubmit = useCallback(async () => {
    if (!formValid) {
      setError('Please fill all fields and upload all three PDFs.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGenerated(null);
    setGeneratedText('');
    setCopied(false);

    try {
      if (!user?.isAdmin) await useTrial();

      const amount = Number(loanAmount.replace(/,/g, ''));
      if (Number.isNaN(amount)) throw new Error('Invalid loan amount.');

      if (!aadhaarFile || !saleDeedFile || !sampleModFile) throw new Error('Missing files.');

      const doc = await generateMODDocument({
        aadhaarFile,
        saleDeedFile,
        sampleModFile,
        bankName,
        bankRegisteredOffice,
        branchAddress,
        loanAmount: amount,
      });

      setGenerated(doc);
      const text = doc.map(b => (b.content.runs || []).map(r => r.text).join('')).join('\n');
      setGeneratedText(text);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate document.');
    } finally {
      setIsLoading(false);
    }
  }, [formValid, loanAmount, aadhaarFile, saleDeedFile, sampleModFile, bankName, bankRegisteredOffice, branchAddress, user, useTrial]);

  const copyPlain = async () => {
    if (!generatedText) return;
    await navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadDocx = async () => {
    if (!generated) return;
    try {
      const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import('docx');

      const alignMap: Record<ParagraphJSON['alignment'], any> = {
        LEFT: AlignmentType.LEFT,
        CENTER: AlignmentType.CENTER,
        RIGHT: AlignmentType.RIGHT,
        JUSTIFY: AlignmentType.JUSTIFIED,
      };

      const children = generated.map((b) => {
        const p = b.content;
        const runs = (p.runs?.length ? p.runs : [{ text: '' } as Run]).map((r) =>
          new TextRun({
            text: r.text,
            bold: r.isBold,
            underline: r.isUnderlined ? {} : undefined,
            size: r.fontSize ? r.fontSize * 2 : 24,
          })
        );
        const props: any = { children: runs, alignment: alignMap[p.alignment || 'LEFT'] };
        if (p.indentFirstLineInches && p.indentFirstLineInches > 0) {
          props.indent = { firstLine: Math.round(p.indentFirstLineInches * 1440) };
        }
        return new Paragraph(props);
      });

      const doc = new Document({
        sections: [{ children }],
        styles: { default: { document: { run: { font: 'Times New Roman' } } } },
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Memorandum_of_Deposit.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('DOCX export needs the "docx" package. Install with: npm i docx');
    }
  };

  // Header button styles (static, so Tailwind keeps colors)
  const headerBtnNeutral =
    'inline-flex items-center justify-center h-9 px-3 rounded-xl font-medium border border-slate-300 text-slate-700 bg-white/70 hover:bg-slate-50 transition whitespace-nowrap';
  const headerBtnBlue =
    'inline-flex items-center justify-center h-9 px-3 rounded-xl font-medium border border-blue-300 text-blue-700 bg-white/70 hover:bg-blue-50 transition whitespace-nowrap';

  return (
    <div className="fixed inset-0 overflow-y-auto bg-gradient-to-b from-indigo-100 via-indigo-50 to-slate-100 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-slate-200/70 sticky top-0 z-40 w-full">
        <div className="w-full max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 shrink-0">
            <DocumentIcon className="h-6 w-6 text-indigo-600" />
            <span className="text-base font-semibold text-slate-900 whitespace-nowrap">MOD Generator</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-sm flex-nowrap overflow-x-auto scrollbar-none">
            <button
              onClick={onOpenSaleDeed}
              className={headerBtnBlue}
              title="Go to Sale Deed"
            >
              Sale Deed
            </button>
            <button
              onClick={onOpenSaleAgreement}
              className={headerBtnBlue}
              title="Go to Sale Agreement"
            >
              Sale Agreement
            </button>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="hidden sm:inline text-slate-600 whitespace-nowrap">
              Trials:{' '}
              {user?.isAdmin ? (
                <span className="font-bold text-blue-600">Unlimited</span>
              ) : (
                <span className="font-bold">{trials}</span>
              )}
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <button
              onClick={logout}
              className="flex items-center gap-2 font-medium text-slate-700 hover:text-indigo-600 rounded-md px-3 py-1.5 whitespace-nowrap"
              title="Logout"
            >
              <LogoutIcon className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {/* How it works */}
        <div className="rounded-2xl bg-gradient-to-r from-white/90 to-indigo-50/90 ring-1 ring-slate-200 shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-center text-slate-800 mb-6">How It Works in 3 Simple Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HowItWorksStep icon={<UploadIcon className="h-6 w-6" />} title="1. Upload PDFs">
              Provide the sample MOD template, borrower Aadhaar and the property sale deed PDFs.
            </HowItWorksStep>
            <HowItWorksStep icon={<SparklesIcon className="h-6 w-6" />} title="2. System Drafts MOD">
              We extract borrower, loan and property particulars and fill your MOD in the template’s exact layout.
            </HowItWorksStep>
            <HowItWorksStep icon={<BigCheckIcon className="h-6 w-6" />} title="3. Review & Download">
              Preview the generated text, copy it, or export a DOCX to finalize and print.
            </HowItWorksStep>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Inputs */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white/80 to-violet-50/70 ring-1 ring-slate-200 shadow-lg p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Upload Documents</h2>
            <p className="text-sm text-slate-600 mb-6">Provide the master template and source PDFs.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <FileUpload id="sampleMod" label="Sample MOD Template (PDF) — Required" onFileChange={setSampleModFile} />
              <FileUpload id="aadhaarPdf" label="Borrower's Aadhaar (PDF) — Required" onFileChange={setAadhaarFile} />
              <div className="md:col-span-2">
                <FileUpload id="saleDeedPdf" label="Property Sale Deed (PDF) — Required" onFileChange={setSaleDeedFile} />
              </div>
            </div>

            <h2 className="text-lg font-semibold text-slate-900 mb-2">Lender & Loan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                id="bankName"
                label="Bank Name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g., State Bank of India"
                icon={<BankIcon />}
              />
              <InputField
                id="loanAmt"
                label="Sanctioned Loan Amount"
                value={loanAmount}
                onChange={onLoanChange}
                placeholder="e.g., 25,00,000"
                icon={<RupeeIcon />}
              />
              <TextAreaField
                id="regOffice"
                label="Bank Registered Office"
                value={bankRegisteredOffice}
                onChange={(e) => setBankRegisteredOffice(e.target.value)}
                placeholder="Full registered office address"
                icon={<BankIcon />}
              />
              <TextAreaField
                id="branchAddr"
                label="Branch Address (Place of Deposit)"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                placeholder="Full branch address"
                icon={<BankIcon />}
              />
            </div>

            <div className="text-center mt-8">
              <button
                onClick={handleSubmit}
                disabled={isLoading || !formValid}
                className={
                  formValid && !isLoading
                    ? 'inline-flex items-center justify-center gap-2 h-11 px-7 rounded-xl font-semibold shadow-[0_10px_25px_-8px_rgba(79,70,229,0.55)] hover:shadow-[0_16px_30px_-8px_rgba(79,70,229,0.65)] hover:scale-[1.02] active:scale-95 ring-1 ring-indigo-400/40 transition-all bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white'
                    : 'inline-flex items-center justify-center gap-2 h-11 px-7 rounded-xl font-semibold bg-blue-200 text-slate-700 cursor-not-allowed'
                }
              >
                {isLoading ? 'Drafting new MOD' : 'Generate MOD'}
              </button>
              {error && <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center">{error}</div>}
            </div>
          </div>

          {/* Right: Output */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white/80 to-violet-50/70 ring-1 ring-slate-200 shadow-lg p-6 lg:col-span-1 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <FileIcon className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-semibold text-slate-900">Output</h3>
            </div>

            {generatedText && !isLoading ? (
              <div className="mt-10 flex-1">
                <h2 className="text-xl font-semibold text-slate-800 mb-3 text-center">Your Generated MOD Draft</h2>
                <ResultDisplay text={generatedText} onTextChange={setGeneratedText} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <UploadIcon className="h-7 w-7 mb-2" />
                <p className="text-sm">Your generated document will appear here after processing.</p>
              </div>
            )}
            <div className="mt-10 flex justify-center gap-4">
              <button
                onClick={copyPlain}
                className="inline-flex items-center gap-1.5 rounded-xl border font-medium shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-200 ease-in-out border-indigo-200 bg-gradient-to-r from-white via-slate-50 to-indigo-50 text-slate-800 px-4 py-2"
              >
                {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={downloadDocx}
                className="inline-flex items-center gap-1.5 rounded-xl border font-medium shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-200 ease-in-out border-indigo-200 bg-gradient-to-r from-white via-slate-50 to-indigo-50 text-slate-800 px-4 py-2"
              >
                <DownloadIcon className="h-4 w-4" />
                Download DOCX
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && <Loader />}
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

export default MODGenerator;