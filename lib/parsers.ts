import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { DocumentChunk } from "./types";

/**
 * Clean up OCR, PDF kerning glitches, and formatting artifacts.
 */
export function cleanText(text: string): string {
  if (!text) return "";

  let cleaned = text
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .replace(/\/H\d+/g, "")
    .replace(/■\s*\d+/g, "")
    .replace(/P\.T\.O\s*\d*/gi, "");

  const glitches: Record<string, string> = {
    "r ainw ater": "rainwater",
    "rainw ater": "rainwater",
    "collec tion": "collection",
    "s ystem": "system",
    "t ypically": "typically",
    "suppor ts": "supports",
    "sanitar y": "sanitary",
    "inspec tion": "inspection",
    "r un-of f": "run-off",
    "coef ficient": "coefficient",
    "over flow": "overflow",
    "ver min": "vermin",
    "ventil ation": "ventilation",
    "ac tivit y": "activity",
    "oper ation": "operation",
    "distr ic t": "district",
    "prov ince": "province",
    "v ill age": "village",
    "descr ibe": "describe",
    "af fec ted": "affected",
    "r ainfall": "rainfall",
    "gut ter": "gutter",
    "gut ter ing": "guttering"
  };

  for (const [glitch, fix] of Object.entries(glitches)) {
    const reg = new RegExp(glitch, "gi");
    cleaned = cleaned.replace(reg, fix);
  }

  // Remove footnote superscript artifacts e.g. "term.a" -> "term."
  cleaned = cleaned.replace(/([a-z0-9])\.([a-d1-9])\b/g, "$1.");

  // Normalize excessive spacing
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n\s*\n+/g, "\n\n");

  return cleaned.trim();
}

/**
 * Chunk text into overlapping segments preserving sentence boundaries.
 */
export function chunkText(
  fullText: string,
  sourceName: string,
  chunkSize = 1000,
  overlap = 150
): DocumentChunk[] {
  const cleaned = cleanText(fullText);
  if (!cleaned) return [];

  const chunks: DocumentChunk[] = [];
  const paragraphs = cleaned.split("\n\n");

  let currentBuffer: string[] = [];
  let currentLength = 0;
  let chunkIndex = 1;

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if (currentLength + trimmedPara.length + 2 > chunkSize && currentBuffer.length > 0) {
      const chunkString = currentBuffer.join("\n\n").trim();
      if (chunkString.length > 30) {
        chunks.push({
          id: `${sourceName}-chunk-${chunkIndex}`,
          source: sourceName,
          page: chunkIndex,
          text: chunkString
        });
        chunkIndex++;
      }

      // Compute overlap from end of current buffer
      const lastText = currentBuffer[currentBuffer.length - 1];
      if (lastText && lastText.length > overlap) {
        currentBuffer = [lastText.slice(-overlap), trimmedPara];
        currentLength = overlap + trimmedPara.length + 2;
      } else {
        currentBuffer = [trimmedPara];
        currentLength = trimmedPara.length;
      }
    } else {
      currentBuffer.push(trimmedPara);
      currentLength += trimmedPara.length + 2;
    }
  }

  if (currentBuffer.length > 0) {
    const chunkString = currentBuffer.join("\n\n").trim();
    if (chunkString.length > 20) {
      chunks.push({
        id: `${sourceName}-chunk-${chunkIndex}`,
        source: sourceName,
        page: chunkIndex,
        text: chunkString
      });
    }
  }

  return chunks;
}

/**
 * Multi-format document parser.
 */
export async function parseDocument(
  fileName: string,
  buffer: Buffer
): Promise<{ text: string; chunks: DocumentChunk[] }> {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  let extractedText = "";

  if (ext === ".pdf") {
    try {
      const data = await pdfParse(buffer);
      extractedText = data.text || "";
    } catch (err) {
      console.warn(`PDF parse error for ${fileName}:`, err);
      // Fallback binary string extraction
      extractedText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
    }
  } else if (ext === ".docx" || ext === ".doc") {
    try {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || "";
    } catch (err) {
      console.warn(`DOCX parse error for ${fileName}:`, err);
      extractedText = buffer.toString("utf-8");
    }
  } else {
    // Plain text, Markdown, CSV, JSON, etc.
    extractedText = buffer.toString("utf-8");
  }

  const chunks = chunkText(extractedText, fileName);
  return {
    text: extractedText,
    chunks
  };
}
