import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const tempPackage = path.join(os.tmpdir(), "meatlens-docx-node-deps", "package.json");
const requireFromTemp = createRequire(tempPackage);
const JSZip = requireFromTemp("jszip");

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/audit_manual.mjs <docx> <json-output>");
  process.exit(2);
}

const zip = await JSZip.loadAsync(fs.readFileSync(inputPath));
const documentXml = await zip.file("word/document.xml").async("string");
const stylesXml = await zip.file("word/styles.xml").async("string");
const text = documentXml.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const report = {
  input: path.resolve(inputPath),
  paragraphCount: (documentXml.match(/<w:p[ >]/g) || []).length,
  heading1Count: (documentXml.match(/w:pStyle[^>]+w:val="ManualHeading1"/g) || []).length,
  heading2Count: (documentXml.match(/w:pStyle[^>]+w:val="ManualHeading2"/g) || []).length,
  heading3Count: (documentXml.match(/w:pStyle[^>]+w:val="ManualHeading3"/g) || []).length,
  tableCount: (documentXml.match(/<w:tbl[ >]/g) || []).length,
  tableHeaderRowCount: (documentXml.match(/<w:tblHeader/g) || []).length,
  imageCount: (documentXml.match(/<wp:docPr /g) || []).length,
  imageDescriptionCount: (documentXml.match(/descr="[^"]+"/g) || []).length,
  internalHyperlinkCount: (documentXml.match(/<w:hyperlink[^>]+w:anchor=/g) || []).length,
  bookmarkCount: (documentXml.match(/<w:bookmarkStart /g) || []).length,
  hasPlaceholderMarkers: /\b(TBD|TODO|FIXME|lorem ipsum|placeholder)\b/i.test(text),
  hasInternalToolTokens: /turn\d+(search|fetch|view)|codex-file-citation/i.test(text),
  containsSecretsByPattern: /(SUPABASE_SERVICE_KEY\s*=\s*(?!your-|<|REPLACE)[^\s`]+|APP_SESSION_SECRET\s*=\s*(?!use-|<|REPLACE)[^\s`]+|AUDIT_LOG_KEY\s*=\s*(?!64-hex|<|REPLACE)[^\s`]+)/i.test(text),
  styleNamesPresent: ["ManualBody", "ManualHeading1", "ManualHeading2", "ManualHeading3", "ManualList", "ManualCallout", "FigureCaption", "ManualTableText", "CodeBlock"].filter((name) => stylesXml.includes(`w:styleId="${name}"`)),
  textSample: text.replace(/\s+/g, " ").trim().slice(0, 400),
};
report.highSeverityIssues = [];
if (report.heading1Count === 0 || report.heading2Count === 0) report.highSeverityIssues.push("Expected heading styles are missing.");
if (report.imageCount > report.imageDescriptionCount) report.highSeverityIssues.push("At least one image is missing a description.");
if (report.tableCount > report.tableHeaderRowCount) report.highSeverityIssues.push("At least one table is missing a header-row flag.");
if (report.hasPlaceholderMarkers) report.highSeverityIssues.push("Placeholder marker detected.");
if (report.hasInternalToolTokens) report.highSeverityIssues.push("Internal tool token detected.");
if (report.containsSecretsByPattern) report.highSeverityIssues.push("Secret-like environment assignment detected.");
report.status = report.highSeverityIssues.length === 0 ? "pass" : "fail";
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.status === "fail") process.exit(1);
