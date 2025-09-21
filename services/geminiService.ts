// src/services/geminiService.ts
import { GoogleGenAI } from "@google/genai";
import { GEMINI_PROMPT } from "../constants";
import type { FilePart, UploadedFiles } from "../types";

// ---------- Env ----------
const PROXY_URL   = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;
const PROXY_TOKEN = import.meta.env.VITE_GEMINI_PROXY_TOKEN as string | undefined;
const API_KEY     = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL_ID    = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || "gemini-2.5-flash";

// Consider the app configured if either proxy or API key is present
export const isGeminiConfigured = (): boolean => !!PROXY_URL || !!API_KEY;

// ---------- Helpers ----------
const detectMime = (file: File) => {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".txt")) return "text/plain";
  return file.type || "application/octet-stream";
};

const fileToGenerativePart = async (file: File): Promise<FilePart> => {
  const base64 = await new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(typeof r.result === "string" ? r.result.split(",")[1] : "");
    r.readAsDataURL(file);
  });
  return { inlineData: { data: base64, mimeType: detectMime(file) } };
};

// Extract text from various response shapes (proxy or client)
const extractText = (json: any): string => {
  // proxy or raw API style
  const c = json?.candidates?.[0];
  const parts = c?.content?.parts ?? [];
  const text = parts.map((p: any) => p?.text).filter(Boolean).join("");
  return text || json?.output_text || json?.text || "";
};

// ---------- Proxy path ----------
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
  return text;
};

// ---------- Client path ----------
const generateViaClient = async (contents: any): Promise<string> => {
  if (!API_KEY) throw new Error("Gemini API Key is not configured. Set VITE_GEMINI_API_KEY.");
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const resp = await ai.models.generateContent({
    model: MODEL_ID,
    contents,
  });

  // Be resilient to different SDK versions
  // @ts-ignore
  const maybeFn = resp?.text;
  const text =
    typeof maybeFn === "function"
      // @ts-ignore
      ? (await resp.text())?.toString?.()
      : (resp?.text as string | undefined);

  if (text && text.trim()) return text.trim();

  // Fallback to raw candidate extraction
  const fallback = extractText(resp as any);
  if (!fallback) throw new Error("The API returned an empty response.");
  return fallback;
};

// ---------- Main ----------
export const generateSaleDeed = async (files: UploadedFiles): Promise<string> => {
  // Only the two deed PDFs are required. Aadhaar is OPTIONAL.
  if (!files.sampleDeed) throw new Error("Sample Sale Deed is required.");
  if (!files.sellerDeed) throw new Error("Seller's Previous Sale Deed is required.");

  // Build the parts list
  const parts: any[] = [
    { text: GEMINI_PROMPT },

    { text: "\n--- START OF SAMPLE DEED ---\n" },
    await fileToGenerativePart(files.sampleDeed),
    { text: "\n--- END OF SAMPLE DEED ---\n" },

    { text: "\n--- START OF SELLER'S PRIOR DEED ---\n" },
    await fileToGenerativePart(files.sellerDeed),
    { text: "\n--- END OF SELLER'S PRIOR DEED ---\n" },
  ];

  // Optional Aadhaar blocks
  if (files.sellerAadhaars?.length) {
    parts.push({ text: "\n--- START OF SELLER AADHAAR(S) ---\n" });
    for (const f of files.sellerAadhaars) parts.push(await fileToGenerativePart(f));
    parts.push({ text: "\n--- END OF SELLER AADHAAR(S) ---\n" });
  } else {
    parts.push({ text: "\n(no seller Aadhaar provided)\n" });
  }

  if (files.buyerAadhaars?.length) {
    parts.push({ text: "\n--- START OF BUYER AADHAAR(S) ---\n" });
    for (const f of files.buyerAadhaars) parts.push(await fileToGenerativePart(f));
    parts.push({ text: "\n--- END OF BUYER AADHAAR(S) ---\n" });
  } else {
    parts.push({ text: "\n(no buyer Aadhaar provided)\n" });
  }

  const contents = [{ role: "user", parts }];

  try {
    // Prefer proxy (bigger payloads, server auth). Otherwise use the client.
    if (PROXY_URL) return await generateViaProxy({ contents });
    return await generateViaClient(contents);
  } catch (err: any) {
    console.error("Error generating content from Gemini API:", err);
    const msg = String(err?.message ?? err ?? "");
    if (/API[_ ]?KEY.*INVALID|not valid/i.test(msg)) {
      throw new Error("Your Gemini API Key is invalid. Check VITE_GEMINI_API_KEY or use the proxy.");
    }
    if (/413|payload too large|content too large/i.test(msg)) {
      throw new Error("Your PDFs are too large for one request. Try smaller files or use the proxy/server upload path.");
    }
    throw new Error("Failed to generate the sale deed. The API returned an error.");
  }
};
