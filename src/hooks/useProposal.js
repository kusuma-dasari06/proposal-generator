// ============================================================
// useProposal Hook — Prompt 2 logic and Supabase save
// ============================================================

import { useState, useCallback } from 'react';
import { generateProposal } from '../api/aiProvider';
import { getGenerationPrompt } from '../utils/promptManager';
import { saveSession } from '../utils/sessionManager';

export function useProposal() {
  const [proposalHtml, setProposalHtml] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(
    async ({ proposalJson, sessionId, conversationHistory }) => {
      if (!proposalJson) return;
      setIsGenerating(true);
      setError(null);

      try {
        const currentDate = new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });

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

        // Strip any accidental markdown fences
        let cleaned = html
          .replace(/^```html\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        // Fallback: Replace {{DATE}} if AI missed it
        cleaned = cleaned.replace(/\{\{DATE\}\}/g, currentDate);

        setProposalHtml(cleaned);

        // Silent background save
        saveSession({
          sessionId,
          clientName: proposalJson.clientName,
          clientType: proposalJson.clientType,
          conversationHistory,
          finalProposal: cleaned,
          proposalJson,
        });
      } catch (err) {
        console.error('[useProposal] Generation error:', err);
        setError(err.message || 'Failed to generate proposal. Please try again.');
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const clearProposal = useCallback(() => {
    setProposalHtml(null);
    setError(null);
  }, []);

  return {
    proposalHtml,
    isGenerating,
    error,
    generate,
    clearProposal,
  };
}
