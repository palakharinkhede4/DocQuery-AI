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
 * Chunk text into overlapping segments preserving sentence & heading boundaries.
 */
export function chunkText(
  fullText: string,
  sourceName: string,
  chunkSize = 1000,
  overlap = 150,
  basePage = 1
): DocumentChunk[] {
  const cleaned = cleanText(fullText);
  if (!cleaned) return [];

  const chunks: DocumentChunk[] = [];
  const paragraphs = cleaned.split("\n\n");

  let currentBuffer: string[] = [];
  let currentLength = 0;
  let chunkIndex = basePage;
  let activeHeading = "";

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    // Detect section or lecture headings
    const headingMatch = trimmedPara.match(/^(?:LECTURE\s*[-–—:]?\s*\d+|Module\s*[-–—:]?\s*\w+|[A-Z][A-Za-z\s]{3,35}:)/);
    if (headingMatch && trimmedPara.length < 80) {
      activeHeading = headingMatch[0].replace(/:$/, "").trim();
    }

    if (currentLength + trimmedPara.length + 2 > chunkSize && currentBuffer.length > 0) {
      let chunkString = currentBuffer.join("\n\n").trim();
      
      // If the chunk doesn't have the active heading at the start, prepend context breadcrumb
      if (activeHeading && !chunkString.toLowerCase().includes(activeHeading.toLowerCase())) {
        chunkString = `[Section: ${activeHeading}]\n${chunkString}`;
      }

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
    let chunkString = currentBuffer.join("\n\n").trim();
    if (activeHeading && !chunkString.toLowerCase().includes(activeHeading.toLowerCase())) {
      chunkString = `[Section: ${activeHeading}]\n${chunkString}`;
    }
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
  const chunks: DocumentChunk[] = [];

  if (ext === ".pdf") {
    try {
      const pageTexts: { page: number; text: string }[] = [];
      const pagerender = function (pageData: any) {
        return pageData.getTextContent().then((textContent: any) => {
          let text = "";
          let lastY = 0;
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += "\n" + item.str;
            }
            lastY = item.transform[5];
          }
          pageTexts.push({ page: pageData.pageIndex + 1, text: cleanText(text) });
          return text;
        });
      };

      const data = await pdfParse(buffer, { pagerender });
      extractedText = data.text || "";

      // If page-by-page texts were extracted, chunk per page
      if (pageTexts.length > 0) {
        for (const pt of pageTexts) {
          if (pt.text && pt.text.length > 20) {
            const pageChunks = chunkText(pt.text, fileName, 1200, 150, pt.page);
            chunks.push(...pageChunks);
          }
        }
      }
    } catch (err) {
      console.warn(`PDF parse error for ${fileName}:`, err);
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

  // If page-by-page didn't produce chunks, chunk full text
  if (chunks.length === 0) {
    const defaultChunks = chunkText(extractedText, fileName);
    chunks.push(...defaultChunks);
  }

  return {
    text: extractedText,
    chunks
  };
}
