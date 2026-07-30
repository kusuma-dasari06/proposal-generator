// ============================================================
// useProposal Hook — Prompt 2 logic + section-wise Supabase save
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { generateProposal } from '../api/aiProvider';
import { getGenerationPrompt } from '../utils/promptManager';
import { getSectionEditPrompt } from '../prompts/sectionEditPrompt';
import { saveSession } from '../utils/sessionManager';
import {
  parseSectionsFromHtml,
  sectionsToHtml,
  getSectionHtml,
  replaceSection,
  getChangedSections,
} from '../utils/proposalSections';

function getCurrentDateStr() {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function cleanAiHtml(html, currentDate) {
  let cleaned = html
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  cleaned = cleaned.replace(/\{\{DATE\}\}/g, currentDate);
  return cleaned;
}

// Compare everything in proposalJson EXCEPT the `overrides` key —
// used to decide if the underlying client data itself changed
// (which affects many sections at once, so we fall back to a
// full regenerate in that case).
function coreDataChanged(prevJson, nextJson) {
  if (!prevJson || !nextJson) return true;
  const { overrides: _p, ...prevCore } = prevJson;
  const { overrides: _n, ...nextCore } = nextJson;
  return JSON.stringify(prevCore) !== JSON.stringify(nextCore);
}

export function useProposal() {
  const [proposalHtml, setProposalHtml] = useState(null);
  const [proposalSections, setProposalSections] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Remembers the proposalJson that the CURRENTLY DISPLAYED sections
  // were generated from, so we can diff against the next request.
  const lastProposalJsonRef = useRef(null);

  const persist = useCallback((sections, flatHtml, proposalJson, sessionId, conversationHistory) => {
    saveSession({
      sessionId,
      clientName: proposalJson.clientName,
      clientType: proposalJson.clientType,
      conversationHistory,
      finalProposal: flatHtml,
      proposalJson,
      proposalSections: sections,
    });
  }, []);

  // ── Full generation (first time, or when core data changed) ────
  const generateFull = useCallback(async (proposalJson) => {
    const currentDate = getCurrentDateStr();
    const fullPrompt = `${getGenerationPrompt()}

---
**CRITICAL INSTRUCTION**: The current date is ${currentDate}. You MUST use exactly "${currentDate}" wherever the date is required, especially replacing {{DATE}}.

---
## CLIENT DATA JSON
\`\`\`json
${JSON.stringify(proposalJson, null, 2)}
\`\`\`

Generate the full proposal HTML now. Output ONLY the HTML — no markdown fences, no extra text.`;

    const html = await generateProposal(fullPrompt);
    const cleaned = cleanAiHtml(html, currentDate);
    const sections = parseSectionsFromHtml(cleaned);
    return { sections, flatHtml: sectionsToHtml(sections) || cleaned };
  }, []);

  // ── Regenerate a single section only ────────────────────────
  const regenerateOneSection = useCallback(async (sectionKey, currentSections, proposalJson) => {
    const currentDate = getCurrentDateStr();
    const currentSectionHtml = getSectionHtml(currentSections, sectionKey);
    const prompt = getSectionEditPrompt({
      sectionKey,
      currentSectionHtml,
      proposalJson,
      currentDate,
    });
    const html = await generateProposal(prompt);
    const cleaned = cleanAiHtml(html, currentDate);
    // The AI should return exactly one block — parse defensively anyway.
    const parsed = parseSectionsFromHtml(cleaned);
    const newSectionHtml = parsed.length ? parsed[0].html : cleaned;
    return replaceSection(currentSections, sectionKey, newSectionHtml);
  }, []);

  const generate = useCallback(
    async ({ proposalJson, sessionId, conversationHistory }) => {
      if (!proposalJson) return;
      setIsGenerating(true);
      setError(null);

      try {
        const hasExisting = proposalSections && proposalSections.length > 0;
        const prevJson = lastProposalJsonRef.current;

        let nextSections;

        if (!hasExisting) {
          // First generation only — nothing exists yet to preserve.
          const result = await generateFull(proposalJson);
          nextSections = result.sections;
        } else {
          // Only `overrides` may have changed — figure out exactly
          // which section(s) are affected and touch ONLY those.
          const { sectionKeys, hasCustomSectionChange } = getChangedSections(
            prevJson.overrides,
            proposalJson.overrides
          );

          if (hasCustomSectionChange) {
            // Custom section positions can shift the whole layout —
            // full regenerate is the safe choice here.
            const result = await generateFull(proposalJson);
            nextSections = result.sections;
          } else if (sectionKeys.length > 0) {
            nextSections = proposalSections;
            for (const key of sectionKeys) {
              nextSections = await regenerateOneSection(key, nextSections, proposalJson);
            }
          } else {
            // Nothing detectably changed — keep current sections as-is.
            nextSections = proposalSections;
          }
        }

        const flatHtml = sectionsToHtml(nextSections);
        setProposalSections(nextSections);
        setProposalHtml(flatHtml);
        lastProposalJsonRef.current = proposalJson;

        persist(nextSections, flatHtml, proposalJson, sessionId || 'unknown', conversationHistory);
      } catch (err) {
        console.error('[useProposal] Generation error:', err);
        setError(err.message || 'Failed to generate proposal. Please try again.');
      } finally {
        setIsGenerating(false);
      }
    },
    [proposalSections, generateFull, regenerateOneSection, persist]
  );

  const clearProposal = useCallback(() => {
    setProposalHtml(null);
    setProposalSections([]);
    lastProposalJsonRef.current = null;
    setError(null);
  }, []);

  return {
    proposalHtml,
    proposalSections,
    isGenerating,
    error,
    generate,
    clearProposal,
  };
}