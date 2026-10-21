import { downloadBlob, exportToCSV } from "./csvExport";

export type ExportFormat = "csv" | "excel" | "pdf";

export interface ReportSection {
  title: string;
  rows: Record<string, unknown>[];
}

export interface SystemReport {
  title: string;
  subtitle?: string;
  // Key figures shown at the top of the PDF and as a "Summary" sheet in Excel.
  summary?: [label: string, value: string | number][];
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

  report.sections.forEach((section) => {
    const headers = headersOf(section.rows);
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = margin;
    }

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
