// src/services/modService.ts
import { GoogleGenAI, Type } from "@google/genai";

/** ---------------- Env (match geminiService.ts) ---------------- */
const PROXY_URL   = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;
const PROXY_TOKEN = import.meta.env.VITE_GEMINI_PROXY_TOKEN as string | undefined;
const API_KEY     = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL_ID    = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || "gemini-2.5-flash";

// Consider the feature configured if either proxy or API key is present
export const isMODConfigured = (): boolean => !!PROXY_URL || !!API_KEY;

/** ---------------- Types (as your UI expects) ------------------ */
export interface MODInput {
  aadhaarFile: File;           // FIRST PDF
  saleDeedFile: File;          // SECOND PDF
  sampleModFile: File;         // THIRD PDF (master template)
  bankName: string;
  bankRegisteredOffice: string;
  branchAddress: string;
  loanAmount: number;
}

export type MODRun = {
  text: string;
  isBold: boolean;
  isUnderlined: boolean;
  fontSize: number;
};

export type MODParagraph = {
  alignment: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFY";
  indentFirstLineInches: number;
  runs: MODRun[];
};

export type MODBlock = {
  type: "PARAGRAPH";
  content: MODParagraph;
};

/** ---------------- Helpers ------------------ */
const ensurePdf = (file: File | null | undefined, name: string) => {
  if (!file) throw new Error(`${name} is required.`);
  const mt = file.type?.toLowerCase();
  if (mt && !mt.includes("pdf")) {
    console.warn(`${name} is not a PDF (mime: ${file.type}). Proceeding anyway.`);
  }
};

const detectMime = (file: File) => {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".txt")) return "text/plain";
  return file.type || "application/octet-stream";
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = typeof reader.result === "string" ? reader.result : "";
      resolve(s.split(",")[1] || "");
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

/** Legal-style date: “this the 21st day of September 2025” */
const legalDate = (): string => {
  const suffix = (d: number) =>
    d > 3 && d < 21 ? "th" : (["th", "st", "nd", "rd"] as const)[Math.min(d % 10, 3)];
  const t = new Date();
  const day = t.getDate();
  const month = t.toLocaleString("en-US", { month: "long" });
  const year = t.getFullYear();
  return `this the ${day}${suffix(day)} day of ${month} ${year}`;
};

/** ---------------- JSON Schemas ------------------ */
const runSchema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    isBold: { type: Type.BOOLEAN },
    isUnderlined: { type: Type.BOOLEAN },
    fontSize: { type: Type.NUMBER, description: "Font size in points, e.g., 12." },
  },
  required: ["text", "isBold", "isUnderlined", "fontSize"],
};

const paragraphSchema = {
  type: Type.OBJECT,
  properties: {
    alignment: { type: Type.STRING, enum: ["LEFT", "CENTER", "RIGHT", "JUSTIFY"] },
    indentFirstLineInches: {
      type: Type.NUMBER,
      description: "First line indentation in inches, e.g., 0.5. Use 0 for no indent.",
    },
    runs: { type: Type.ARRAY, items: runSchema },
  },
  required: ["alignment", "runs", "indentFirstLineInches"],
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    document: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["PARAGRAPH"] },
          content: paragraphSchema,
        },
        required: ["type", "content"],
      },
    },
  },
  required: ["document"],
};

/** ---------------- Prompt ------------------ */
const generatePrompt = (input: {
  bankName: string;
  bankRegisteredOffice: string;
  branchAddress: string;
  loanAmount: number;
  currentDate: string;
}) => {
  const formattedLoanAmount = new Intl.NumberFormat("en-IN").format(input.loanAmount);
  return `
**OBJECTIVE: Perform a high-fidelity 'Virtual Mail Merge' to generate a structured JSON representation of a legal document, perfectly preserving the exact layout of a master template.**

**CORE TASK (Sequential Steps):**
1.  **IDENTIFY PLACEHOLDERS:** Mentally scan the THIRD PDF (Master Template) and identify all placeholders like [Borrower Name], [Property Schedule], etc.
2.  **EXTRACT DATA:** Extract the required information from the FIRST PDF (Aadhaar), SECOND PDF (Sale Deed), and user inputs.
3.  **FILL TEMPLATE:** In your memory, create a "filled" version of the master template by replacing all placeholders with the extracted data.
4.  **DECONSTRUCT TO JSON:** Deconstruct this "filled" version into a structured JSON format containing a sequence of PARAGRAPH blocks, preserving every single formatting detail with absolute precision. Any deviation is a failure.

**FILE ROLES (CRITICAL):**
*   **FIRST PDF:** Aadhaar Card. Data source for borrower's full name, full address, and Aadhaar number.
*   **SECOND PDF:** Property Sale Deed. Data source for all property details (address, boundaries, survey info, etc.).
*   **THIRD PDF:** The Sample MOD Master Template. This is the **unchangeable**, definitive source for ALL layout, structure, formatting, and styling.

**HIGH-FIDELITY STRUCTURAL RULES:**
-   **Paragraphs Only:** Every single piece of content, including lists, addresses, and schedules, MUST be represented as a sequence of \`PARAGRAPH\` blocks. **DO NOT GENERATE TABLES.**
-   **Styling (Per Run):** Capture \`isBold\`, \`isUnderlined\`, and exact \`fontSize\` (in points) for every run.
-   **Layout (Per Paragraph):** Capture \`alignment\` and precise \`indentFirstLineInches\`. Use \`0\` if there is no indent.
-   **Empty Lines for Spacing:** Represent them as a PARAGRAPH with empty "runs":
  { "type": "PARAGRAPH", "content": { "alignment": "LEFT", "indentFirstLineInches": 0, "runs": [] } }

**DATA EXTRACTION & INSERTION RULES:**
1.  **Date:** Replace date placeholders with: **${input.currentDate}**
2.  **Borrower (from Aadhaar - FIRST PDF):** Extract Full Name, Full Address, and full Aadhaar number (do not mask).
3.  **Lender (from User Input):**
    * Bank Name: **${input.bankName}**
    * Registered Office: **${input.bankRegisteredOffice}**
    * Branch Address: **${input.branchAddress}**
4.  **Loan:**
    * [Loan Amount in Figures]: Rs. ${formattedLoanAmount}/-
    * [Loan Amount in Words]: Use words for the raw number **${input.loanAmount}**
5.  **Property (from Sale Deed - SECOND PDF):**
    * Replace [Property Schedule], [Property Address], [Property Boundaries], etc.
    * Extract **Original Sale Deed Document Number**, **Date of Registration**, and **Sub-Registrar Office (S.R.O.) location** and fill.
    * Translate to English if needed.

**CRITICAL FINAL REVIEW:** Ensure 1:1 layout fidelity with the THIRD PDF template.

**FINAL INSTRUCTION:** Respond with ONLY the raw JSON object adhering to the schema—no markdown, no comments.
`.trim();
};

/** ---------------- Response extraction (proxy/client resilient) ------------------ */
const extractText = (json: any): string => {
  const c = json?.candidates?.[0];
  const parts = c?.content?.parts ?? [];
  const text = parts.map((p: any) => p?.text).filter(Boolean).join("");
  return text || json?.output_text || json?.text || "";
};

/** ---------------- Proxy path ------------------ */
const generateViaProxy = async (body: any): Promise<string> => {
  if (!PROXY_URL) throw new Error("Proxy not configured.");
  const base = PROXY_URL.replace(/\/+$/, "");
  const url = `${base}/v1beta/models/${MODEL_ID}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(PROXY_TOKEN ? { "x-proxy-token": PROXY_TOKEN } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini proxy error (${res.status}): ${text || res.statusText}`);
  }

  const json = await res.json();
  const text = extractText(json);
  if (!text) throw new Error("The API returned an empty response.");
  return text.trim();
};

/** ---------------- Client path ------------------ */
const generateViaClient = async (contents: any): Promise<string> => {
  if (!API_KEY) throw new Error("Gemini API Key is not configured. Set VITE_GEMINI_API_KEY.");
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // Try to request JSON directly (SDK versions differ, keep both keys)
  const resp = await ai.models.generateContent({
    model: MODEL_ID,
    contents,
    // @ts-ignore
    config: { responseMimeType: "application/json", responseSchema },
    // @ts-ignore
    generationConfig: { responseMimeType: "application/json", responseSchema },
  });

  // Some SDKs expose text() as a function; others give .text string
  // @ts-ignore
  const maybeFn = resp?.text;
  const text =
    typeof maybeFn === "function"
      ? String(await resp.text?.() ?? "").trim()
      : String((resp as any)?.text ?? "").trim();

  if (text) return text;

  const fallback = extractText(resp as any);
  if (!fallback) throw new Error("The API returned an empty response.");
  return fallback.trim();
};

/** ---------------- Public API ------------------ */
export const generateMODDocument = async (input: MODInput): Promise<MODBlock[]> => {
  if (!isMODConfigured()) {
    throw new Error("API is not configured.");
  }

  // Validate required inputs
  ensurePdf(input.aadhaarFile, "Aadhaar PDF");
  ensurePdf(input.saleDeedFile, "Sale Deed PDF");
  ensurePdf(input.sampleModFile, "Sample MOD Template PDF");

  if (!input.bankName?.trim()) throw new Error("Bank name is required.");
  if (!input.bankRegisteredOffice?.trim()) throw new Error("Bank registered office is required.");
  if (!input.branchAddress?.trim()) throw new Error("Bank branch address is required.");
  if (input.loanAmount == null || Number.isNaN(input.loanAmount)) throw new Error("Loan amount is invalid.");

  // Convert PDFs to base64 (inlineData)
  const [b64Aadhaar, b64SaleDeed, b64SampleMod] = await Promise.all([
    fileToBase64(input.aadhaarFile),
    fileToBase64(input.saleDeedFile),
    fileToBase64(input.sampleModFile),
  ]);

  // Build prompt
  const prompt = generatePrompt({
    bankName: input.bankName,
    bankRegisteredOffice: input.bankRegisteredOffice,
    branchAddress: input.branchAddress,
    loanAmount: input.loanAmount,
    currentDate: legalDate(),
  });

  // Build parts (text + three PDFs)
  const parts: any[] = [
    { text: prompt },
    { inlineData: { data: b64Aadhaar,   mimeType: detectMime(input.aadhaarFile) } },
    { inlineData: { data: b64SaleDeed,  mimeType: detectMime(input.saleDeedFile) } },
    { inlineData: { data: b64SampleMod, mimeType: detectMime(input.sampleModFile) } },
  ];

  const contents = [{ role: "user", parts }];

  // Prefer proxy (bigger payload/headless auth), otherwise client SDK
  let jsonText: string;
  try {
    if (PROXY_URL) {
      jsonText = await generateViaProxy({
        contents,
        // try to hint JSON on the server too
        generationConfig: { responseMimeType: "application/json", responseSchema },
      });
    } else {
      jsonText = await generateViaClient(contents);
    }
  } catch (err: any) {
    console.error("Error generating MOD via Gemini:", err);
    const msg = String(err?.message ?? err ?? "");
    if (/API[_ ]?KEY.*INVALID|not valid/i.test(msg)) {
      throw new Error("Your Gemini API Key is invalid. Check VITE_GEMINI_API_KEY or use the proxy.");
    }
    if (/413|payload too large|content too large/i.test(msg)) {
      throw new Error("Your PDFs are too large for one request. Try smaller files or use the proxy/server upload path.");
    }
    throw new Error("Failed to generate the MOD document. The API returned an error.");
  }

  if (!jsonText) {
    throw new Error("The AI model returned an empty response.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error("AI returned non-JSON output:", jsonText);
    throw new Error("The AI returned invalid JSON. Please try again.");
  }

  if (!parsed?.document || !Array.isArray(parsed.document)) {
    console.error("Parsed AI JSON missing 'document' array:", parsed);
    throw new Error("AI response is missing 'document' array.");
  }

  return parsed.document as MODBlock[];
};

/** Reusable client-side validator */
export const computeMODValidationErrors = (input: Partial<MODInput>): string[] => {
  const errs: string[] = [];
  if (!input.sampleModFile) errs.push("Sample MOD Template (PDF) is required.");
  if (!input.aadhaarFile) errs.push("Borrower Aadhaar (PDF) is required.");
  if (!input.saleDeedFile) errs.push("Property Sale Deed (PDF) is required.");
  if (!input.bankName?.trim()) errs.push("Bank Name is required.");
  if (!input.bankRegisteredOffice?.trim()) errs.push("Bank Registered Office is required.");
  if (!input.branchAddress?.trim()) errs.push("Branch Address is required.");
  if (input.loanAmount == null || Number.isNaN(input.loanAmount)) errs.push("Loan Amount is required.");
  return errs;
};
