export const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = Array.isArray(val) ? val.join("; ") : String(val ?? "");
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];

  // The BOM makes Excel read the file as UTF-8, so "₱" and accented names display correctly.
  const blob = new Blob(["﻿" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
