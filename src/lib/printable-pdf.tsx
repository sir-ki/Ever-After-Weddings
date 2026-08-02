import "server-only";
import { ImageResponse } from "next/og";
import { PDFDocument } from "pdf-lib";
import { COLORS, loadFonts } from "./print-theme";
import type { ReactElement } from "react";

// A4 at 150dpi, portrait — print-ready per the launch-readiness spec's
// own requirement ("A4 is the Philippine default, not Letter"). Every
// printable page, image-based or table-based, renders at this pixel size
// and gets embedded full-bleed into an A4-point PDF page below.
export const PAGE_WIDTH = 1240;
export const PAGE_HEIGHT = 1754;
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

export async function renderPagePng(jsx: ReactElement): Promise<Buffer> {
  const { serif, sans } = await loadFonts();
  const image = new ImageResponse(jsx, {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    fonts: [
      { name: "serif", data: serif, weight: 400, style: "normal" },
      { name: "sans", data: sans, weight: 400, style: "normal" },
    ],
  });
  const arrayBuffer = await image.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Multi-page printables are PDF, single images stay PNG — the opposite
// of Part 3's card, which is one image sent over Messenger rather than
// printed with page breaks.
export async function assemblePdf(pngPages: Buffer[]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  for (const png of pngPages) {
    const image = await pdfDoc.embedPng(png);
    const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    page.drawImage(image, { x: 0, y: 0, width: A4_WIDTH_PT, height: A4_HEIGHT_PT });
  }
  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

export type TableColumn = { key: string; label: string; flex: number };

// Shared by the attendee sheet and the processional running order — both
// are "paginate a list of rows into an A4 table," just with different
// columns and row sources.
export async function renderTablePdf({
  title,
  subtitle,
  columns,
  rows,
  rowsPerPage,
}: {
  title: string;
  subtitle?: string | null;
  columns: TableColumn[];
  rows: Record<string, string>[];
  rowsPerPage: number;
}): Promise<Buffer> {
  const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const pages: Buffer[] = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const pageRows = rows.slice(
      pageIndex * rowsPerPage,
      pageIndex * rowsPerPage + rowsPerPage,
    );

    const png = await renderPagePng(
      <div
        style={{
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          display: "flex",
          flexDirection: "column",
          backgroundColor: COLORS.canvas,
          padding: 64,
          fontFamily: "sans",
        }}
      >
        {pageIndex === 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 24 }}>
            <div style={{ fontFamily: "serif", fontSize: 40, color: COLORS.ink }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 18, color: COLORS.inkSecondary, marginTop: 6 }}>
                {subtitle}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            borderBottom: `2px solid ${COLORS.ink}`,
            paddingBottom: 10,
            marginBottom: 4,
          }}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              style={{
                display: "flex",
                flex: col.flex,
                fontSize: 16,
                fontWeight: 700,
                color: COLORS.ink,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {col.label}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {pageRows.map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                borderBottom: `1px solid ${COLORS.border}`,
                paddingTop: 12,
                paddingBottom: 12,
              }}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  style={{ display: "flex", flex: col.flex, fontSize: 18, color: COLORS.ink }}
                >
                  {row[col.key] || ""}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            fontSize: 14,
            color: COLORS.inkSecondary,
          }}
        >
          {`Page ${pageIndex + 1} of ${pageCount}`}
        </div>
      </div>,
    );

    pages.push(png);
  }

  return assemblePdf(pages);
}
