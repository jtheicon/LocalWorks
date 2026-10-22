import { downloadBlob, exportToCSV } from "./csvExport";

export type ExportFormat = "csv" | "excel" | "pdf";

export interface ReportSection {
  title: string;
  rows: Record<string, unknown>[];
}

export interface ReportChart {
  title: string;
  subtitle?: string;
  // "bar" = horizontal bars (grouped when there are several series), "line" = one line per series
  type: "bar" | "line";
  categories: string[];
  series: { name: string; color: string; values: number[] }[];
}

export interface SystemReport {
  title: string;
  subtitle?: string;
  // Key figures shown at the top of the PDF and as a "Summary" sheet in Excel.
  summary?: [label: string, value: string | number][];
  // Drawn on their own page of the PDF, two per row (PDF only).
  charts?: { title: string; items: ReportChart[] };
  // The first section is the primary table; CSV can only hold one table, so it uses this one.
  sections: ReportSection[];
}

const BRAND_ORANGE: [number, number, number] = [236, 106, 19]; // hsl(24 85% 50%)

const stamp = () => new Date().toISOString().slice(0, 10);

const toCell = (val: unknown) =>
  Array.isArray(val) ? val.join("; ") : val == null ? "" : String(val);

// "createdAt" -> "Created At", "posted" -> "Posted"
const humanize = (key: string) =>
  key
    .replace(/^_id$/, "ID")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const headersOf = (rows: Record<string, unknown>[]) => (rows.length ? Object.keys(rows[0]) : []);

export const hasReportData = (report: SystemReport) =>
  report.sections.some((s) => s.rows.length > 0);

export async function exportReport(report: SystemReport, filename: string, format: ExportFormat) {
  if (format === "csv") return exportToCSV(report.sections[0]?.rows ?? [], filename);
  if (format === "excel") return exportReportExcel(report, filename);
  return exportReportPDF(report, filename);
}

async function exportReportExcel(report: SystemReport, filename: string) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LocalWorks";
  workbook.created = new Date();

  if (report.summary?.length) {
    const sheet = workbook.addWorksheet("Summary");
    sheet.addRow([report.title]).font = { bold: true, size: 14 };
    if (report.subtitle) sheet.addRow([report.subtitle]);
    sheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
    sheet.addRow([]);
    report.summary.forEach(([label, value]) => sheet.addRow([label, value]));
    sheet.getColumn(1).width = 32;
    sheet.getColumn(2).width = 18;
  }

  // Excel sheet names: max 31 chars, no []:*?/\ and must be unique.
  const used = new Set<string>();
  report.sections.forEach((section) => {
    let name = section.title.replace(/[[\]:*?/\\]/g, " ").slice(0, 31) || "Sheet";
    for (let i = 2; used.has(name); i++) name = `${name.slice(0, 28)} ${i}`;
    used.add(name);

    const sheet = workbook.addWorksheet(name);
    const headers = headersOf(section.rows);
    if (!headers.length) {
      sheet.addRow(["No data"]);
      return;
    }

    const header = sheet.addRow(headers.map(humanize));
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEC6A13" } };
    });
    section.rows.forEach((row) =>
      sheet.addRow(headers.map((h) => (typeof row[h] === "number" ? row[h] : toCell(row[h]))))
    );

    headers.forEach((h, i) => {
      const longest = Math.max(
        humanize(h).length,
        ...section.rows.map((r) => toCell(r[h]).length)
      );
      sheet.getColumn(i + 1).width = Math.min(Math.max(longest + 2, 10), 50);
    });
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${filename}_${stamp()}.xlsx`
  );
}

async function exportReportPDF(report: SystemReport, filename: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header band
  doc.setFillColor(...BRAND_ORANGE);
  doc.rect(0, 0, pageWidth, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("LocalWorks", margin, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(report.title, margin, 48);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, pageWidth - margin, 48, { align: "right" });

  doc.setTextColor(40, 40, 40);
  let y = 88;

  if (report.subtitle) {
    doc.setFontSize(10);
    doc.text(report.subtitle, margin, y);
    y += 16;
  }

  if (report.summary?.length) {
    autoTable(doc, {
      startY: y,
      head: [["Summary", "Value"]],
      body: report.summary.map(([label, value]) => [label, String(value)]),
      theme: "grid",
      tableWidth: 280,
      margin: { left: margin },
      headStyles: { fillColor: BRAND_ORANGE },
      styles: { fontSize: 9 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  }

  if (report.charts?.items.length) {
    doc.addPage();
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(report.charts.title, margin, margin + 4);
    doc.setFont("helvetica", "normal");

    // Two charts per row, two rows per page.
    const gap = 16;
    const top = margin + 20;
    const chartW = (pageWidth - margin * 2 - gap) / 2;
    const chartH = (doc.internal.pageSize.getHeight() - top - margin - gap) / 2;
    report.charts.items.forEach((chart, i) => {
      if (i > 0 && i % 4 === 0) doc.addPage();
      const slot = i % 4;
      drawChart(doc, chart, margin + (slot % 2) * (chartW + gap), top + Math.floor(slot / 2) * (chartH + gap), chartW, chartH);
    });

    doc.addPage();
    y = margin;
  }

  report.sections.forEach((section) => {
    const headers = headersOf(section.rows);
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = margin;
    }

    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${section.title} (${section.rows.length})`, margin, y);
    doc.setFont("helvetica", "normal");

    autoTable(doc, {
      startY: y + 8,
      head: [headers.length ? headers.map(humanize) : ["No data"]],
      // jsPDF's built-in fonts have no "₱" glyph, so it is spelled out as "PHP".
      body: section.rows.map((row) => headers.map((h) => toCell(row[h]).replace(/₱/g, "PHP "))),
      theme: "striped",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: BRAND_ORANGE, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28;
  });

  // Page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Page ${i} of ${pages}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
  }

  doc.save(`${filename}_${stamp()}.pdf`);
}

/* -------------------------------------------------------------------------- */
/*                               PDF chart drawing                            */
/* -------------------------------------------------------------------------- */

type PDF = import("jspdf").jsPDF;

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Whole-number axis (the charts show counts): 0 .. max in 1/2/5 x 10^n steps.
const axisTicks = (max: number) => {
  if (max <= 0) return [0, 1];
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? pow * 10);
  const ticks: number[] = [];
  for (let t = 0; t <= max + step - 1e-9; t += step) ticks.push(t);
  return ticks;
};

// Shortens text with "..." until it fits the given width at the current font size.
const fit = (doc: PDF, text: string, width: number) => {
  if (doc.getTextWidth(text) <= width) return text;
  let s = text;
  while (s.length > 1 && doc.getTextWidth(`${s}...`) > width) s = s.slice(0, -1);
  return `${s}...`;
};

function drawChart(doc: PDF, chart: ReportChart, x: number, y: number, w: number, h: number) {
  // Card
  doc.setDrawColor(225, 225, 225);
  doc.setLineWidth(0.75);
  doc.roundedRect(x, y, w, h, 6, 6, "S");

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(chart.title, x + 12, y + 18);
  doc.setFont("helvetica", "normal");
  if (chart.subtitle) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(fit(doc, chart.subtitle, w - 24), x + 12, y + 30);
  }

  // Legend (top right) when there is more than one series
  if (chart.series.length > 1) {
    doc.setFontSize(8);
    let lx = x + w - 12;
    [...chart.series].reverse().forEach((s) => {
      lx -= doc.getTextWidth(s.name);
      doc.setTextColor(90, 90, 90);
      doc.text(s.name, lx, y + 46);
      doc.setFillColor(...hexToRgb(s.color));
      doc.circle(lx - 6, y + 43.5, 3, "F");
      lx -= 18;
    });
  }

  const values = chart.series.flatMap((s) => s.values);
  const plotTop = y + (chart.series.length > 1 ? 58 : 44);
  const plotBottom = y + h - 24;

  if (!chart.categories.length || !values.length) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("No data yet.", x + w / 2, (plotTop + plotBottom) / 2, { align: "center" });
    return;
  }

  const ticks = axisTicks(Math.max(...values));
  const axisMax = ticks[ticks.length - 1];
  doc.setLineWidth(0.5);
  doc.setFontSize(7);

  if (chart.type === "bar") {
    const labelWidth = Math.min(110, w * 0.3);
    const plotLeft = x + 12 + labelWidth;
    const plotRight = x + w - 24;
    const scale = (v: number) => ((plotRight - plotLeft) * v) / axisMax;

    // Vertical gridlines + value axis
    ticks.forEach((t) => {
      const gx = plotLeft + scale(t);
      doc.setDrawColor(232, 232, 232);
      doc.line(gx, plotTop, gx, plotBottom);
      doc.setTextColor(120, 120, 120);
      doc.text(String(t), gx, plotBottom + 11, { align: "center" });
    });

    const band = (plotBottom - plotTop) / chart.categories.length;
    const barH = Math.min(12, (band * 0.7) / chart.series.length);
    chart.categories.forEach((cat, ci) => {
      const groupTop = plotTop + ci * band + (band - barH * chart.series.length) / 2;
      doc.setTextColor(90, 90, 90);
      doc.text(fit(doc, cat, labelWidth - 8), plotLeft - 6, plotTop + ci * band + band / 2 + 2.5, { align: "right" });

      chart.series.forEach((s, si) => {
        const value = s.values[ci] ?? 0;
        const by = groupTop + si * barH;
        doc.setFillColor(...hexToRgb(s.color));
        if (value > 0) doc.rect(plotLeft, by, scale(value), barH - 1, "F");
        doc.setTextColor(90, 90, 90);
        doc.text(String(value), plotLeft + scale(value) + 3, by + barH / 2 + 2);
      });
    });
    return;
  }

  // Line chart
  const plotLeft = x + 36;
  const plotRight = x + w - 20;
  const yOf = (v: number) => plotBottom - ((plotBottom - plotTop) * v) / axisMax;
  const n = chart.categories.length;
  const xOf = (i: number) => (n === 1 ? (plotLeft + plotRight) / 2 : plotLeft + ((plotRight - plotLeft) * i) / (n - 1));

  // Horizontal gridlines + value axis
  ticks.forEach((t) => {
    const gy = yOf(t);
    doc.setDrawColor(232, 232, 232);
    doc.line(plotLeft, gy, plotRight, gy);
    doc.setTextColor(120, 120, 120);
    doc.text(String(t), plotLeft - 6, gy + 2.5, { align: "right" });
  });
  chart.categories.forEach((cat, i) => {
    doc.setTextColor(90, 90, 90);
    doc.text(cat, xOf(i), plotBottom + 11, { align: "center" });
  });

  chart.series.forEach((s) => {
    const rgb = hexToRgb(s.color);
    doc.setDrawColor(...rgb);
    doc.setFillColor(...rgb);
    doc.setLineWidth(1.5);
    s.values.forEach((v, i) => {
      if (i > 0) doc.line(xOf(i - 1), yOf(s.values[i - 1]), xOf(i), yOf(v));
    });
    s.values.forEach((v, i) => doc.circle(xOf(i), yOf(v), 2.5, "F"));
  });
  doc.setLineWidth(0.5);
}
