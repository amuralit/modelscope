'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PDFExportProps {
  contentRef: React.RefObject<HTMLDivElement | null>;
  modelName: string;
}

export default function PDFExport({ contentRef, modelName }: PDFExportProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!contentRef.current) return;

    setExporting(true);

    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#F8FAFC',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // A4 dimensions in points (72 dpi)
      const pdfWidth = 595.28;
      const pdfHeight = 841.89;
      const margin = 40;

      const contentWidth = pdfWidth - margin * 2;
      const scaleFactor = contentWidth / imgWidth;
      const scaledHeight = imgHeight * scaleFactor;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      // If content fits on one page
      if (scaledHeight <= pdfHeight - margin * 2) {
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, scaledHeight);
      } else {
        // Multi-page: slice the canvas into page-sized chunks
        const pageContentHeight = pdfHeight - margin * 2;
        const sourcePageHeight = pageContentHeight / scaleFactor;
        const totalPages = Math.ceil(imgHeight / sourcePageHeight);

        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }

          // Create a temporary canvas for this page slice
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = imgWidth;
          const sliceHeight = Math.min(
            sourcePageHeight,
            imgHeight - page * sourcePageHeight,
          );
          pageCanvas.height = sliceHeight;

          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(
              canvas,
              0,
              page * sourcePageHeight,
              imgWidth,
              sliceHeight,
              0,
              0,
              imgWidth,
              sliceHeight,
            );
          }

          const pageImgData = pageCanvas.toDataURL('image/png');
          const pageScaledHeight = sliceHeight * scaleFactor;
          pdf.addImage(
            pageImgData,
            'PNG',
            margin,
            margin,
            contentWidth,
            pageScaledHeight,
          );
        }
      }

      const safeName = modelName.replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`ModelScope-${safeName}-report.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-sm font-medium text-[#475569] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {exporting ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-25"
            />
            <path
              d="M4 12a8 8 0 018-8"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="opacity-75"
            />
          </svg>
          Exporting...
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          Export as PDF
        </>
      )}
    </button>
  );
}
