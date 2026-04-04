'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';

interface ScoreBreakdown {
  score: number;
  weight: number;
  weighted: number;
}

interface PDFExportProps {
  modelName: string;
  compositeScore: { score: number; verdict: string; breakdown: Record<string, ScoreBreakdown> } | null;
  verdictInfo: { verdict: string; label: string; description: string } | null;
  analysisData?: Record<string, any>;
  aiSummary?: string | null;
}

export default function PDFExport({ modelName, compositeScore, verdictInfo, analysisData, aiSummary }: PDFExportProps) {
  const [exporting, setExporting] = useState(false);

  function handleExport() {
    if (!compositeScore) return;
    setExporting(true);

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const m = 50; // margin
      const cw = pw - m * 2; // content width
      let y = m;

      const addPage = () => { pdf.addPage(); y = m; };
      const checkPage = (need: number) => { if (y + need > 790) addPage(); };

      // Colors
      const indigo = [99, 102, 241] as [number, number, number];
      const dark = [15, 23, 42] as [number, number, number];
      const mid = [71, 85, 105] as [number, number, number];
      const light = [148, 163, 184] as [number, number, number];
      const green = [5, 150, 105] as [number, number, number];
      const amber = [217, 119, 6] as [number, number, number];
      const red = [220, 38, 38] as [number, number, number];

      const scoreColor = (s: number) => s >= 70 ? green : s >= 40 ? amber : red;

      // ================================================================
      // HEADER
      // ================================================================
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, pw, 120, 'F');

      // Logo bar
      pdf.setFillColor(...indigo);
      pdf.rect(m, m, 4, 50, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(...dark);
      pdf.text('CerebrasLens', m + 14, y + 18);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...light);
      pdf.text('Model Inference Readiness Report', m + 14, y + 32);

      // Date
      pdf.setFontSize(8);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pw - m, y + 10, { align: 'right' });
      pdf.text(`Confidential — For internal use only`, pw - m, y + 22, { align: 'right' });

      // Model name
      y += 55;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(...dark);
      pdf.text(modelName.replace(/\//g, ' / '), m + 14, y);

      // Verdict badge
      const vc = compositeScore.verdict === 'GO' ? green : compositeScore.verdict === 'SKIP' ? red : amber;
      const badgeText = `${compositeScore.verdict} — ${verdictInfo?.label ?? ''}`;
      pdf.setFillColor(...vc);
      const badgeW = pdf.getTextWidth(badgeText) * 0.8 + 16;
      pdf.roundedRect(pw - m - badgeW, y - 12, badgeW, 18, 3, 3, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      pdf.text(badgeText, pw - m - badgeW + 8, y + 1);

      y += 25;

      // ================================================================
      // DIVIDER
      // ================================================================
      pdf.setDrawColor(226, 232, 240);
      pdf.line(m, y, pw - m, y);
      y += 20;

      // ================================================================
      // COMPOSITE SCORE + BREAKDOWN
      // ================================================================
      checkPage(120);

      // Score circle
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(36);
      pdf.setTextColor(...scoreColor(compositeScore.score));
      pdf.text(`${compositeScore.score}`, m + 30, y + 30);
      pdf.setFontSize(10);
      pdf.setTextColor(...light);
      pdf.text('/ 100', m + 75, y + 30);

      pdf.setFontSize(8);
      pdf.setTextColor(...mid);
      pdf.text('COMPOSITE SCORE', m, y - 3);

      // Module scores — 4 columns per row
      const entries = Object.entries(compositeScore.breakdown);
      const scoreColW = cw / 4;

      pdf.setFontSize(8);
      pdf.setTextColor(...mid);
      pdf.text('MODULE BREAKDOWN', m + 130, y - 3);

      entries.forEach(([key, val], i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = m + 130 + col * scoreColW * 0.85;
        const sy = y + row * 28;
        const sc = scoreColor(val.score);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(...sc);
        pdf.text(`${val.score}`, x, sy + 14);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(...light);
        const words = key.replace(/([A-Z])/g, ' $1').trim().split(' ');
        const label = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        pdf.text(label, x, sy + 22);
        pdf.setFontSize(5);
        pdf.text(`Weight: ${Math.round(val.weight * 100)}%`, x, sy + 28);
      });

      y += Math.ceil(entries.length / 4) * 28 + 20;

      // ================================================================
      // SECTION HELPER
      // ================================================================
      const sectionTitle = (title: string, color: [number, number, number]) => {
        checkPage(30);
        pdf.setFillColor(...color);
        pdf.rect(m, y, 3, 14, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(...dark);
        pdf.text(title.toUpperCase(), m + 10, y + 11);
        y += 22;
      };

      const addParagraph = (text: string) => {
        checkPage(40);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...mid);
        const lines = pdf.splitTextToSize(text.replace(/\*\*/g, ''), cw - 10);
        pdf.text(lines, m + 10, y);
        y += lines.length * 13 + 8;
      };

      const addBullet = (text: string) => {
        checkPage(30);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...mid);
        const clean = text.replace(/\*\*/g, '');
        const lines = pdf.splitTextToSize(clean, cw - 22);
        pdf.setFillColor(...indigo);
        pdf.circle(m + 13, y + 3, 2, 'F');
        pdf.text(lines, m + 22, y + 6);
        y += lines.length * 13 + 6;
      };

      // ================================================================
      // ARCHITECTURE SUMMARY
      // ================================================================
      const arch = analysisData?.architecture as Record<string, any> | undefined;
      if (arch) {
        pdf.setDrawColor(226, 232, 240);
        pdf.line(m, y, pw - m, y);
        y += 15;

        sectionTitle('Architecture Summary', indigo);

        const specs = [
          ['Parameters', arch.parameterCount ? `${(arch.parameterCount / 1e9).toFixed(1)}B` : '—'],
          ['Architecture', `${arch.isMoE ? 'MoE' : 'Dense'} (${arch.architectureFamily ?? '?'})`],
          ['Attention', arch.attentionVariant ?? '—'],
          ['Layers', String(arch.numLayers ?? '—')],
          ['Context', arch.contextWindow ? `${(arch.contextWindow / 1000).toFixed(0)}K` : '—'],
          ['Hidden', String(arch.hiddenSize ?? '—')],
        ];

        specs.forEach(([label, value], i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = m + 10 + col * (cw / 3);
          const sy = y + row * 28;

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(...light);
          pdf.text(label.toUpperCase(), x, sy);

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(...dark);
          pdf.text(value, x, sy + 13);
        });

        y += Math.ceil(specs.length / 3) * 28 + 10;
      }

      // ================================================================
      // PERFORMANCE & COMPETITIVE DATA
      // ================================================================
      if (analysisData) {
        const speed = analysisData.speedSensitivity as Record<string, any> | undefined;
        const gap = analysisData.competitiveGap as Record<string, any> | undefined;
        const wseFitData = analysisData.wseFit as Record<string, any> | undefined;

        if (speed || gap || wseFitData) {
          pdf.setDrawColor(226, 232, 240);
          pdf.line(m, y, pw - m, y);
          y += 15;

          sectionTitle('Performance & Deployment', indigo);

          const perfSpecs: [string, string][] = [];
          if (speed?.estimatedTokensPerSecond) perfSpecs.push(['Decode Speed', `${speed.estimatedTokensPerSecond.toLocaleString()} tok/s (Cerebras)`]);
          if (speed?.speedupOverGPU) perfSpecs.push(['GPU Speedup', `${speed.speedupOverGPU.toFixed(1)}x faster than GPU baseline`]);
          if (speed?.primaryUseCases?.[0]) perfSpecs.push(['Primary Use Case', speed.primaryUseCases[0]]);
          if (wseFitData?.fitsInSRAM !== undefined) perfSpecs.push(['WSE-3 Fit', wseFitData.fitsInSRAM ? 'Fits on single wafer (44GB SRAM)' : 'Requires multi-wafer deployment']);
          if (wseFitData?.sramUtilization) perfSpecs.push(['SRAM Utilization', `${(wseFitData.sramUtilization * 100).toFixed(0)}%`]);

          for (const [label, value] of perfSpecs) {
            checkPage(18);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(...mid);
            pdf.text(label + ':', m + 10, y);
            pdf.setFont('helvetica', 'normal');
            pdf.text(value, m + 120, y);
            y += 15;
          }
          y += 5;

          if (gap) {
            sectionTitle('Competitive Landscape', amber);
            const competitors = gap.competitorsOffering as string[] | undefined;
            if (competitors && competitors.length > 0) {
              addParagraph(`Served by ${competitors.length} provider(s): ${competitors.join(', ')}. Market gap: ${gap.marketGapSize ?? 'unknown'}. Risk of not offering: ${gap.riskOfNotOffering ?? 'unknown'}. Timeline pressure: ${gap.timelinePressure ?? 'unknown'}.`);
            } else {
              addParagraph('No competitors currently serve this model — first-mover opportunity for Cerebras.');
            }

            // Provider pricing table
            const providers = gap.providers as Array<{ name: string; serves_model: boolean; estimated_speed: number; input_price: number; output_price: number }> | undefined;
            if (providers && providers.length > 0) {
              checkPage(100);
              const serving = providers.filter(p => p.serves_model);
              if (serving.length > 0) {
                y += 5;
                // Table header
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(7);
                pdf.setTextColor(...mid);
                const cols = [m + 10, m + 100, m + 170, m + 240, m + 320];
                pdf.text('PROVIDER', cols[0], y);
                pdf.text('SPEED', cols[1], y);
                pdf.text('INPUT $/M', cols[2], y);
                pdf.text('OUTPUT $/M', cols[3], y);
                pdf.text('CEREBRAS ADV.', cols[4], y);
                y += 3;
                pdf.setDrawColor(226, 232, 240);
                pdf.line(m + 10, y, pw - m, y);
                y += 10;

                // Cerebras row
                const cSpeed = gap.estimatedCerebrasSpeed as number ?? 2000;
                const cInput = cSpeed > 1500 ? 0.10 : cSpeed > 800 ? 0.25 : 0.60;
                const cOutput = cSpeed > 1500 ? 0.10 : cSpeed > 800 ? 0.25 : 1.00;
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(8);
                pdf.setTextColor(...indigo);
                pdf.text('Cerebras (WSE-3)', cols[0], y);
                pdf.text(`${cSpeed} tok/s`, cols[1], y);
                pdf.text(`$${cInput.toFixed(2)}`, cols[2], y);
                pdf.text(`$${cOutput.toFixed(2)}`, cols[3], y);
                pdf.setTextColor(...green);
                pdf.text('—', cols[4], y);
                y += 12;

                // Other providers
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(7);
                for (const p of serving) {
                  checkPage(15);
                  pdf.setTextColor(...dark);
                  pdf.text(p.name.charAt(0).toUpperCase() + p.name.slice(1), cols[0], y);
                  pdf.setTextColor(...mid);
                  pdf.text(`${p.estimated_speed} tok/s`, cols[1], y);
                  pdf.text(`$${p.input_price.toFixed(2)}`, cols[2], y);
                  pdf.text(`$${p.output_price.toFixed(2)}`, cols[3], y);
                  const speedAdv = cSpeed / Math.max(p.estimated_speed, 1);
                  pdf.setTextColor(...green);
                  pdf.text(`${speedAdv.toFixed(1)}x faster`, cols[4], y);
                  y += 10;
                }
                y += 5;
              }
            }

            if (gap.differentiators) {
              for (const d of gap.differentiators as string[]) {
                addBullet(d);
              }
            }
          }
        }
      }

      // ================================================================
      // AI SUMMARY SECTIONS
      // ================================================================
      if (aiSummary) {
        // First split inline bullets
        const rawLines = aiSummary.split('\n');
        const lines: string[] = [];
        for (const line of rawLines) {
          if (line.includes('• ')) {
            line.split('• ').map(s => s.trim()).filter(Boolean).forEach(p => lines.push('- ' + p.replace(/^[-*]\s*/, '')));
          } else {
            lines.push(line);
          }
        }

        let section = '';

        pdf.setDrawColor(226, 232, 240);
        pdf.line(m, y, pw - m, y);
        y += 15;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === '---') continue;

          // Only detect headings that start with # or **
          const isHeading = trimmed.startsWith('#') || (trimmed.startsWith('**') && trimmed.endsWith('**'));
          if (isHeading) {
            const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim().toLowerCase();
            if (headingText.includes('executive summary')) { sectionTitle('Executive Summary', indigo); section = 'para'; continue; }
            if (headingText.includes('strength')) { sectionTitle('Key Strengths', green); section = 'bullet'; continue; }
            if (headingText.includes('risk') || headingText.includes('concern')) { sectionTitle('Key Risks & Concerns', amber); section = 'bullet'; continue; }
            if (headingText.includes('deployment') || headingText.includes('readiness')) { sectionTitle('WSE Deployment Readiness', indigo); section = 'para'; continue; }
            if (headingText.includes('recommendation')) { sectionTitle('Recommendation', green); section = 'para'; continue; }
            // Unknown heading
            sectionTitle(headingText, mid); section = 'para'; continue;
          }

          const isBullet = trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•');
          const content = trimmed.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '');

          if (!content) continue;

          if (isBullet) {
            addBullet(content);
          } else {
            addParagraph(content);
          }
        }
      }

      // ================================================================
      // FOOTER
      // ================================================================
      const addFooter = (pageNum: number, totalPages: number) => {
        pdf.setPage(pageNum);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(m, 810, pw - m, 810);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(...light);
        pdf.text('CerebrasLens — Powered by Cerebras Inference', m, 825);
        pdf.text(`Page ${pageNum} of ${totalPages}`, pw - m, 825, { align: 'right' });
        pdf.text(`Built by Arun Muralitharan`, pw / 2, 825, { align: 'center' });
      };

      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        addFooter(i, totalPages);
      }

      const safeName = modelName.replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`CerebrasLens_${safeName}_Report.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting || !compositeScore}
      className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {exporting ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
          </svg>
          Generating PDF...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          Download PDF Report
        </>
      )}
    </button>
  );
}
