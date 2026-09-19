import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const docxRoot = path.join(os.tmpdir(), "meatlens-docx-node-deps", "node_modules", "docx", "dist", "index.mjs");
const {
  AlignmentType,
  Bookmark,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  InternalHyperlink,
  PageBreak,
  Packer,
  Paragraph,
  ShadingType,
  SimpleField,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} = await import(pathToFileURL(docxRoot).href);

const COLORS = {
  ink: "16302B",
  heading: "166534",
  headingDark: "14532D",
  muted: "4F635B",
  teal: "15803D",
  mint: "DCFCE7",
  navySoft: "14532D",
  lightBlue: "DCFCE7",
  lightGray: "F3F4F6",
  callout: "F0FDF4",
  gold: "7A5A00",
  red: "9B1C1C",
  white: "FFFFFF",
};

const TWIPS = { pageWidth: 12240, pageHeight: 15840, margin: 1440, header: 708, footer: 708, contentWidth: 9360 };
const SPACING = { bodyAfter: 120, bodyLine: 300, h1Before: 360, h1After: 200, h2Before: 280, h2After: 140, h3Before: 200, h3After: 100 };

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    args[key] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return args;
}

function usage() {
  console.log("Usage: node scripts/build_manual.mjs --source <markdown> --assets <asset-dir> --output <docx>");
}

function anchorFor(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function richRuns(text, options = {}) {
  const runs = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) runs.push(new TextRun({ text: text.slice(last, match.index), ...options }));
    const token = match[0];
    if (token.startsWith("**")) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true, ...options }));
    } else {
      runs.push(new TextRun({ text: token.slice(1, -1), font: "Courier New", shading: { type: ShadingType.CLEAR, fill: COLORS.lightGray }, ...options }));
    }
    last = match.index + token.length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), ...options }));
  return runs;
}

function baseBorders() {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
  return { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
}

function makeCell(text, width, header = false) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: header ? { type: ShadingType.CLEAR, fill: COLORS.lightBlue } : undefined,
    margins: { top: 80, bottom: 80, start: 120, end: 120 },
    children: [new Paragraph({
      style: "ManualTableText",
      children: richRuns(text, { bold: header, color: header ? COLORS.ink : "1F2937", size: 19 }),
    })],
  });
}

function makeTable(rows) {
  const colCount = rows[0].length;
  const widths = colCount === 2
    ? [2700, 6660]
    : colCount === 3
      ? [1800, 2900, 4660]
      : colCount === 4
        ? [1550, 2350, 2350, 3110]
        : Array.from({ length: colCount }, () => Math.floor(TWIPS.contentWidth / colCount));
  const tableRows = rows.map((row, rowIndex) => new TableRow({
    tableHeader: rowIndex === 0,
    cantSplit: true,
    children: row.map((cell, index) => makeCell(cell, widths[index], rowIndex === 0)),
  }));
  return new Table({
    width: { size: TWIPS.contentWidth, type: WidthType.DXA },
    indent: { size: 120, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders: baseBorders(),
    margins: { top: 80, bottom: 80, start: 120, end: 120 },
    rows: tableRows,
  });
}

function parseTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function makeHeader() {
  return new Header({ children: [new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 0 },
    children: [new TextRun({ text: "MeatLens User Manual", font: "Calibri", size: 17, color: COLORS.muted, smallCaps: true })],
  })] });
}

function makeFooter() {
  return new Footer({ children: [new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: "Official controlled document  |  ", font: "Calibri", size: 16, color: COLORS.muted }), new SimpleField("PAGE")],
  })] });
}

function makeFigure(assetDir, filename, caption, altText) {
  const imagePath = path.join(assetDir, filename);
  if (!fs.existsSync(imagePath)) {
    return [new Paragraph({ style: "ManualCallout", children: richRuns(`Source-verified interface; local capture unavailable for ${filename}.`, { color: COLORS.muted, size: 19 }) })];
  }
  const imageData = fs.readFileSync(imagePath);
  const isTall = filename.includes("endpoint-index");
  const isMobile = filename.startsWith("mobile-");
  const width = isTall ? 3100 : isMobile ? 3300 : 8600;
  const height = isTall ? 5600 : isMobile ? 7150 : 3700;
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 80 }, children: [new ImageRun({ data: imageData, type: "png", transformation: { width, height }, altText: { name: filename, title: caption, description: altText } })] }),
    new Paragraph({ style: "FigureCaption", alignment: AlignmentType.CENTER, children: [new TextRun({ text: caption, italic: true, color: COLORS.muted, size: 18 })] }),
  ];
}

function makeCover(assetDir) {
  const logoPath = path.join(assetDir, "meatlens-logo-cover.png");
  const logoChildren = fs.existsSync(logoPath)
    ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 260 }, children: [new ImageRun({ data: fs.readFileSync(logoPath), type: "png", transformation: { width: 1700, height: 1700 }, altText: { name: "meatlens-logo-cover.png", title: "MeatLens logo", description: "MeatLens camera-aperture logo in forest green on a pale mint background." } })] })]
    : [];
  const coverCell = new TableCell({
    width: { size: TWIPS.contentWidth, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.CLEAR, fill: COLORS.ink },
    margins: { top: 620, bottom: 620, start: 620, end: 620 },
    children: [
      ...logoChildren,
      new Paragraph({ style: "CoverKicker", alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MEATLENS  /  FRESHNESS INSPECTION SYSTEM", bold: true, color: COLORS.mint, allCaps: true })] }),
      new Paragraph({ style: "CoverTitle", alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Official User Manual", bold: true, color: COLORS.white })] }),
      new Paragraph({ style: "CoverSubtitle", alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Operate, administer, and maintain MeatLens with confidence.", color: COLORS.white })] }),
      new Paragraph({ style: "CoverRule", alignment: AlignmentType.CENTER, children: [new TextRun({ text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━", color: COLORS.teal })] }),
      new Paragraph({ style: "CoverMeta", alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Version 1.1  |  Approved for production  |  Effective 31 August 2026", color: COLORS.white })] }),
      new Paragraph({ style: "CoverMeta", alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Applies to MeatLens web and Capacitor client workflows", color: COLORS.mint })] }),
    ],
  });
  return [
    new Table({
      width: { size: TWIPS.contentWidth, type: WidthType.DXA },
      columnWidths: [TWIPS.contentWidth],
      layout: TableLayoutType.FIXED,
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
      rows: [new TableRow({ cantSplit: true, tableHeader: true, children: [coverCell] })],
    }),
    new Paragraph({ style: "CoverNote", alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Official controlled document  •  MeatLens project team", bold: true, color: COLORS.teal })] }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function makeHeading(level, title) {
  const style = level === 1 ? "ManualHeading1" : level === 2 ? "ManualHeading2" : "ManualHeading3";
  const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
  return new Paragraph({ style, heading: headingLevel, keepNext: true, children: [new Bookmark({ id: anchorFor(title), children: [new TextRun({ text: title, bold: true })] })] });
}

function makeTocItem(text) {
  return new Paragraph({ style: "ManualList", numbering: { reference: "manual-bullet", level: 0 }, children: [new InternalHyperlink({ anchor: anchorFor(text), children: [new TextRun({ text, color: COLORS.heading, underline: {} })] })] });
}

function buildChildren(markdown, assetDir) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const children = [];
  let inCode = false;
  let tableBuffer = [];
  let inContents = false;

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      children.push(makeTable(tableBuffer));
      children.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
      tableBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trimEnd();
    if (line.trim() === "```" || line.trim() === "```powershell" || line.trim() === "```env" || line.trim() === "```text" || line.trim() === "```json") {
      flushTable();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      children.push(new Paragraph({ style: "CodeBlock", children: [new TextRun({ text: line || " ", font: "Courier New", size: 18, color: COLORS.ink })] }));
      continue;
    }
    if (line.trim() === "") { flushTable(); continue; }
    if (line.trim() === "[[PAGEBREAK]]") { flushTable(); children.push(new Paragraph({ children: [new PageBreak()] })); continue; }
    const figureMatch = line.trim().match(/^\[\[FIG:([^|]+)\|([^|]+)\|(.+)\]\]$/);
    if (figureMatch) { flushTable(); children.push(...makeFigure(assetDir, figureMatch[1], figureMatch[2], figureMatch[3])); continue; }
    if (line.startsWith("|") && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])) {
      flushTable();
      tableBuffer.push(parseTableRow(line));
      i += 1;
      continue;
    }
    if (tableBuffer.length > 0 && line.startsWith("|")) { tableBuffer.push(parseTableRow(line)); continue; }
    flushTable();
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const title = headingMatch[2].trim();
      if (title === "Contents") inContents = true;
      else if (headingMatch[1].length <= 2) inContents = false;
      children.push(makeHeading(headingMatch[1].length, title));
      continue;
    }
    if (line.startsWith("> ")) {
      children.push(new Paragraph({ style: "ManualCallout", children: richRuns(line.slice(2), { color: COLORS.ink, size: 20 }) }));
      continue;
    }
    const bullet = line.match(/^\s*-\s+(.+)$/);
    if (bullet) {
      if (inContents) children.push(makeTocItem(bullet[1]));
      else children.push(new Paragraph({ style: "ManualList", numbering: { reference: "manual-bullet", level: 0 }, children: richRuns(bullet[1], { size: 20 }) }));
      continue;
    }
    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numbered) {
      children.push(new Paragraph({ style: "ManualList", numbering: { reference: "manual-number", level: 0 }, children: richRuns(numbered[1], { size: 20 }) }));
      continue;
    }
    children.push(new Paragraph({ style: "ManualBody", children: richRuns(line, { size: 20 }) }));
  }
  flushTable();
  return children;
}

function buildManual(sourcePath, assetDir, outputPath) {
  const markdown = fs.readFileSync(sourcePath, "utf8");
  const bodyMarkdown = markdown.includes("[[PAGEBREAK]]") ? markdown.split("[[PAGEBREAK]]").slice(1).join("[[PAGEBREAK]]") : markdown;
  const children = [...makeCover(assetDir), ...buildChildren(bodyMarkdown, assetDir)];
  const doc = new Document({
    creator: "MeatLens project team",
    title: "MeatLens User Manual",
    subject: "Official user manual for the MeatLens freshness inspection system",
    description: "Official controlled document covering inspector, administrator, and developer workflows.",
    styles: {
      default: { document: { run: { font: "Calibri", size: 20, color: "1F2937" }, paragraph: { spacing: { after: SPACING.bodyAfter, line: SPACING.bodyLine, lineRule: "auto" } } } },
      paragraphStyles: [
        { id: "ManualBody", name: "Manual Body", basedOn: "Normal", next: "ManualBody", run: { font: "Calibri", size: 20, color: "1F2937" }, paragraph: { spacing: { after: SPACING.bodyAfter, line: SPACING.bodyLine, lineRule: "auto" } } },
        { id: "ManualHeading1", name: "Manual Heading 1", basedOn: "Heading1", next: "ManualBody", run: { font: "Calibri", size: 32, bold: true, color: COLORS.heading }, paragraph: { spacing: { before: SPACING.h1Before, after: SPACING.h1After }, keepNext: true } },
        { id: "ManualHeading2", name: "Manual Heading 2", basedOn: "Heading2", next: "ManualBody", run: { font: "Calibri", size: 26, bold: true, color: COLORS.heading }, paragraph: { spacing: { before: SPACING.h2Before, after: SPACING.h2After }, keepNext: true } },
        { id: "ManualHeading3", name: "Manual Heading 3", basedOn: "Heading3", next: "ManualBody", run: { font: "Calibri", size: 24, bold: true, color: COLORS.headingDark }, paragraph: { spacing: { before: SPACING.h3Before, after: SPACING.h3After }, keepNext: true } },
        { id: "ManualList", name: "Manual List", basedOn: "ManualBody", run: { font: "Calibri", size: 20, color: "1F2937" }, paragraph: { spacing: { after: 80, line: SPACING.bodyLine, lineRule: "auto" }, indent: { left: 540, hanging: 270 } } },
        { id: "ManualCallout", name: "Manual Callout", basedOn: "ManualBody", run: { font: "Calibri", size: 20, color: COLORS.ink }, paragraph: { spacing: { before: 120, after: 180, line: 300, lineRule: "auto" }, indent: { left: 180, right: 180 }, shading: { type: ShadingType.CLEAR, fill: COLORS.callout }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: COLORS.teal } } } },
        { id: "CoverKicker", name: "Cover Kicker", basedOn: "ManualBody", run: { font: "Calibri", size: 18, bold: true, color: COLORS.mint }, paragraph: { spacing: { before: 0, after: 180 } } },
        { id: "CoverTitle", name: "Cover Title", basedOn: "ManualBody", run: { font: "Calibri", size: 42, bold: true, color: COLORS.white }, paragraph: { spacing: { before: 0, after: 180 } } },
        { id: "CoverSubtitle", name: "Cover Subtitle", basedOn: "ManualBody", run: { font: "Calibri", size: 23, color: COLORS.white }, paragraph: { spacing: { before: 0, after: 220 } } },
        { id: "CoverRule", name: "Cover Rule", basedOn: "ManualBody", run: { font: "Calibri", size: 18, color: COLORS.teal }, paragraph: { spacing: { before: 0, after: 220 } } },
        { id: "CoverMeta", name: "Cover Meta", basedOn: "ManualBody", run: { font: "Calibri", size: 18, color: COLORS.white }, paragraph: { spacing: { before: 0, after: 100 } } },
        { id: "CoverNote", name: "Cover Note", basedOn: "ManualBody", run: { font: "Calibri", size: 19, color: COLORS.teal }, paragraph: { spacing: { before: 180, after: 260 } } },
        { id: "FigureCaption", name: "Figure Caption", basedOn: "ManualBody", run: { font: "Calibri", size: 18, italic: true, color: COLORS.muted }, paragraph: { spacing: { before: 80, after: 180 }, alignment: AlignmentType.CENTER } },
        { id: "ManualTableText", name: "Manual Table Text", basedOn: "ManualBody", run: { font: "Calibri", size: 19, color: "1F2937" }, paragraph: { spacing: { after: 0, line: 260, lineRule: "auto" } } },
        { id: "CodeBlock", name: "Code Block", basedOn: "ManualBody", run: { font: "Courier New", size: 18, color: COLORS.ink }, paragraph: { spacing: { before: 40, after: 40 }, indent: { left: 240, right: 240 }, shading: { type: ShadingType.CLEAR, fill: COLORS.lightGray } } },
      ],
    },
    numbering: {
      config: [
        { reference: "manual-bullet", levels: [{ level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 }, spacing: { after: 80, line: SPACING.bodyLine, lineRule: "auto" } } } }] },
        { reference: "manual-number", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 }, spacing: { after: 80, line: SPACING.bodyLine, lineRule: "auto" } } } }] },
      ],
    },
    sections: [{
      properties: {
        page: { size: { width: TWIPS.pageWidth, height: TWIPS.pageHeight }, margin: { top: TWIPS.margin, right: TWIPS.margin, bottom: TWIPS.margin, left: TWIPS.margin, header: TWIPS.header, footer: TWIPS.footer } },
      },
      headers: { default: makeHeader() },
      footers: { default: makeFooter() },
      children,
    }],
  });
  return Packer.toBuffer(doc).then((buffer) => {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);
  });
}

const args = parseArgs(process.argv);
if (args.help || args.h) { usage(); process.exit(0); }
if (!args.source || !args.assets || !args.output) { usage(); process.exit(2); }
await buildManual(path.resolve(args.source), path.resolve(args.assets), path.resolve(args.output));
console.log(`Created ${path.resolve(args.output)}`);
