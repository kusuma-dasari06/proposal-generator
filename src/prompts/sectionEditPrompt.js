// ============================================================
// Section Edit Prompt — regenerate ONE section only
// Reuses the exact same rules as the full generation prompt so
// formatting/classes/overrides logic stays identical, but
// constrains the AI's output to a single data-section block.
// ============================================================

import { GENERATION_SYSTEM_PROMPT } from './generationPrompt';

export function getSectionEditPrompt({ sectionKey, currentSectionHtml, proposalJson, currentDate }) {
  return `${GENERATION_SYSTEM_PROMPT}

---
**PARTIAL-UPDATE MODE — READ CAREFULLY**

You are NOT generating the full proposal this time. You must regenerate **ONLY** the section identified by \`data-section="${sectionKey}"\`, using the rules above for that section, the CLIENT DATA JSON below (which already reflects the user's latest requested change), and the CURRENT DATE.

Rules for this mode:
1. Output ONLY that one section's HTML — the single \`<div class="proposal-section" data-section="${sectionKey}">...</div>\` block (or the header/footer block if that's the key). No other sections, no markdown fences, no commentary.
2. Keep the exact same \`data-section="${sectionKey}"\` attribute on the outer div.
3. Follow the override rules and defaults for this section exactly as instructed above.
4. Do not shorten, rephrase, or "improve" any part of this section that wasn't asked to change — only apply the specific requested change, keep everything else in this section as close to the CURRENT VERSION below as possible.
5. The current date is ${currentDate}. Use it wherever {{DATE}} would apply.
6. IMPORTANT — this section must remain COMPLETE. If this is the serviceScope section, it MUST still include the package name and monthly investment line at the top, and ALL numbered service sub-sections (Social Media, GMB, SEO, Ads, etc. — whichever were present in the CURRENT VERSION) — do not drop any part of the section structure just because only one piece of it was asked to change.

**CURRENT VERSION OF THIS SECTION** (for structural reference only — update it per the JSON below, don't blindly copy stale content):
\`\`\`html
${currentSectionHtml || '(none yet — generate it fresh for this client)'}
\`\`\`

---
## CLIENT DATA JSON
\`\`\`json
${JSON.stringify(proposalJson, null, 2)}
\`\`\`

Output ONLY the single HTML block for data-section="${sectionKey}". Nothing else.`;
}