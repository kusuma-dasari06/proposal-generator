// ============================================================
// ProposalViewer — AnimatePresence state transitions
// Old state: fade out + scale down → New state: scale up + fade in
// ============================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveAs } from 'file-saver';
import letterheadWatermark from '../../assets/letterhead-watermark.png';
import letterheadHeaderImg from '../../assets/letterhead-header.png';
import letterheadFooterImg from '../../assets/letterhead-footer.png';

// ── Shared page-transition variants ──────────────────────────
// Exit:  current state shrinks slightly and fades out
// Enter: next state grows from 94% → 100% and fades in
const PAGE_VARIANTS = {
  hidden: {
    opacity: 0,
    scale: 0.94,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 28,
      mass: 0.9,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    filter: 'blur(3px)',
    transition: {
      duration: 0.22,
      ease: 'easeIn',
    },
  },
};

// ── Wrapper shared by every state ─────────────────────────────
// position:absolute + full size so AnimatePresence can overlay
// entering/exiting states in the same layout space.
function StatePanel({ children, motionKey }) {
  return (
    <motion.div
      className="state-panel"
      key={motionKey}
      variants={PAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {children}
    </motion.div>
  );
}

export default function ProposalViewer({ proposalHtml, isGenerating, proposalJson }) {
  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = () => window.print();

  const handleDownloadWord = async () => {
    if (!proposalHtml) return;
    setIsExporting(true);
    try {
      // Strip any leading/trailing whitespace, empty tags, <br>, and legacy agency-name from the AI output
      const cleanHtml = proposalHtml
        .trim()
        .replace(/<div[^>]*class="agency-name"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/^(\s*<br\s*\/?>|\s*<p>\s*<\/p>|\s*<div>\s*<\/div>|\s*\n)+/gi, '');

      // Build Word HTML as a single tight string — NO template literal indentation
      // Word interprets stray whitespace/newlines as empty paragraphs
      const css = [
        '@page { size: 8.5in 11.0in; margin: 0.3in 0.5in; }',
        'body { font-family: Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 0; }',
        '.proposal-header { text-align: center; padding-bottom: 24px; margin-bottom: 24px; border-bottom: 2px solid #1a237e; margin-top: 0; }',
        '.agency-name { font-size: 18pt; font-weight: bold; color: #1a237e; text-transform: uppercase; margin: 0 0 6px 0; }',
        '.agency-tagline { font-size: 11pt; color: #555555; font-style: italic; margin: 0; }',
        '.proposal-meta { margin-top: 10px; }',
        '.proposal-label { font-size: 12pt; font-weight: bold; color: #1a237e; text-transform: uppercase; margin: 0; }',
        '.proposal-date { font-size: 10pt; color: #777777; margin-top: 4px; }',
        '.proposal-section { margin-bottom: 24px; text-align: left; page-break-inside: auto; break-inside: auto; }',
        '.section-title { font-size: 12pt; font-weight: bold; color: #1a237e; margin-bottom: 10px; border-bottom: 1px solid #c5cae9; padding-bottom: 6px; page-break-after: avoid; break-after: avoid; }',
        'h1 { font-size: 16pt; color: #1a237e; font-weight: bold; margin-bottom: 8px; page-break-after: avoid; break-after: avoid; }',
        'h2 { font-size: 14pt; font-weight: bold; color: #1a237e; margin-bottom: 8px; page-break-after: avoid; break-after: avoid; }',
        'h3 { font-size: 12pt; font-weight: bold; color: #283593; margin-bottom: 6px; text-transform: uppercase; page-break-after: avoid; break-after: avoid; }',
        'h4 { font-size: 11pt; font-weight: bold; color: #333333; margin-bottom: 4px; margin-top: 12px; page-break-after: avoid; break-after: avoid; }',
        '.section-subtitle { font-size: 10pt; color: #555555; font-style: italic; margin-bottom: 10px; }',
        'p { font-size: 11pt; line-height: 1.6; color: #333333; margin-bottom: 10px; text-align: left; page-break-inside: avoid; break-inside: avoid; }',
        'ul, ol { padding-left: 20px; margin-bottom: 10px; text-align: left; page-break-inside: auto; break-inside: auto; }',
        'li { font-size: 11pt; line-height: 1.6; color: #333333; margin-bottom: 3px; page-break-inside: avoid; break-inside: avoid; }',
        '.pricing-line { font-size: 14pt; font-weight: bold; color: #1a237e; margin: 20px 0 6px 0; padding: 12px 16px; background-color: #e8eaf6; border-left: 4px solid #1a237e; }',
        '.pricing-note { font-size: 10pt; color: #666666; font-style: italic; }',
        'th { background-color: #1a237e; color: #ffffff; padding: 10px 14px; font-weight: bold; text-transform: uppercase; border: 1px solid #1a237e; }',
        'td { padding: 9px 14px; border: 1px solid #e4e7f0; color: #333333; }',
        'tr:nth-child(even) td { background-color: #f5f6ff; }',
        'tfoot td { font-weight: bold; color: #1a237e; background-color: #e8eaf6; }',
        '.proposal-footer { margin-top: 32px; padding-top: 20px; border-top: 2px solid #1a237e; text-align: center; }',
        '.proposal-footer p { font-size: 9pt; color: #555555; margin-bottom: 3px; text-align: center; }',
        '.footer-note { font-size: 8pt; color: #999999; }',
      ].join(' ');

      const wordHtml =
        "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
        '<head><meta charset="UTF-8"><style>' + css + '</style></head>' +
        '<body>' + cleanHtml + '</body></html>';

      // Natively encode as a Word Document blob in the browser
      const blob = new Blob(['\ufeff', wordHtml], {
        type: 'application/msword'
      });

      const clientName = proposalJson?.clientName || 'Client';
      const fileName = `Proposal_${clientName.replace(/\s+/g, '_')}.doc`;
      saveAs(blob, fileName);
    } catch (err) {
      console.error('Failed to generate Word document', err);
      alert('Failed to generate Word document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Determine which state we're in (drives AnimatePresence key)
  const stateKey = isGenerating ? 'generating' : proposalHtml ? 'ready' : 'empty';

  return (
    // This outer div holds the relative context so absolute children stack
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <AnimatePresence mode="wait">

        {/* ── Empty state ──────────────────────────────────── */}
        {stateKey === 'empty' && (
          <StatePanel motionKey="empty">
            <div className="proposal-panel-header">
              <h2 className="proposal-panel-title">Proposal Preview</h2>
            </div>
            <div className="proposal-placeholder empty">
              {/* Animate the icon separately for a nice staggered entrance */}
              <motion.div
                className="placeholder-icon"
                initial={{ scale: 0.5, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
              >
                📄
              </motion.div>
              <h3 className="placeholder-title">Proposal Preview</h3>
              <p className="placeholder-desc">
                Chat with the AI assistant on the left to provide client details,
                then click <strong>"Generate Proposal Preview"</strong> to create your proposal.
              </p>
              {/* Staggered step badges */}
              <motion.div
                className="placeholder-steps"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } },
                }}
              >
                {['1. Chat', '→', '2. Confirm', '→', '3. Generate'].map((item, i) => (
                  <motion.div
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 22 } },
                    }}
                    className={item === '→' ? 'step-arrow' : 'step-badge'}
                  >
                    {item}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </StatePanel>
        )}

        {/* ── Generating state ─────────────────────────────── */}
        {stateKey === 'generating' && (
          <StatePanel motionKey="generating">
            <div className="proposal-panel-header">
              <h2 className="proposal-panel-title">Proposal Preview</h2>
            </div>
            <div className="proposal-placeholder generating">
              {/* Pulsing outer ring for extra drama */}
              <motion.div
                style={{ position: 'relative', width: 80, height: 80 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <div className="generation-spinner" style={{ position: 'absolute', inset: 0 }}>
                  <div className="spinner-ring" />
                  <div className="spinner-ring" />
                  <div className="spinner-ring" />
                </div>
              </motion.div>

              <motion.p
                className="generation-text"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                Generating your proposal...
              </motion.p>
              <p className="generation-subtext">This usually takes 10–20 seconds</p>
            </div>
          </StatePanel>
        )}

        {/* ── Proposal ready ───────────────────────────────── */}
        {stateKey === 'ready' && (
          <StatePanel motionKey="ready">
            <div className="proposal-viewer" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Toolbar */}
              <div className="proposal-toolbar">
                <div className="toolbar-left">
                  <span className="toolbar-label">
                    📋 <strong>{proposalJson?.clientName || 'Client'}</strong> — Proposal Ready
                  </span>
                </div>
                <div className="toolbar-right">
                  <button className="btn-toolbar btn-print" onClick={handlePrint}>
                    🖨️ Print / PDF
                  </button>
                  <button
                    className="btn-toolbar btn-export"
                    onClick={handleDownloadWord}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <><span className="btn-spinner" /> Generating...</>
                    ) : (
                      <>📄 Download Word Doc</>
                    )}
                  </button>
                </div>
              </div>

            {/* Proposal content */}
              <div className="proposal-scroll-area">
                <div className="proposal-letterhead-paper">
                  <table className="print-layout-table">
                    <thead className="print-layout-header">
                      <tr>
                        <td>
                          <div className="print-only-header">
                            {/* Background Watermark Image - inside thead so it repeats on EVERY printed page */}
                            <img src={letterheadWatermark} alt="" className="watermark-bg-center" />
                            {/* Exact letterhead header strip — pixel-identical to the official letterhead PDF */}
                            {/* <img src={letterheadHeaderImg} alt="Atoms Digital Solutions" className="letterhead-header-img" /> */}
                          </div>
                        </td>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <div
                            className="proposal-content"
                            dangerouslySetInnerHTML={{
                              __html: (proposalHtml || '')
                                .replace(/<div[^>]*class="proposal-footer"[\s\S]*?<\/div>/gi, '')
                                .replace(/<div[^>]*class="agency-name"[^>]*>[\s\S]*?<\/div>/gi, '')
                            }}
                          />
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="print-layout-footer">
                      <tr>
                        <td>
                          <div className="print-only-footer">
                            {/* Exact letterhead footer strip — pixel-identical to the official letterhead PDF */}
                            <img src={letterheadFooterImg} alt="" className="letterhead-footer-img" />
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>                               
            </div>
          </StatePanel>
        )}

      </AnimatePresence>
    </div>
  );
}
