// ============================================================
// proposalSections — Section-level split / merge utilities
// ============================================================
// The generation prompt tags every top-level block with a
// data-section="KEY" attribute. We use that to:
//   1. Split a freshly generated proposal into named sections
//   2. Store those sections as JSON (proposal_sections column)
//   3. When the user asks for a change, regenerate ONLY the
//      affected section(s) and splice the new HTML back in —
//      every other section's HTML stays byte-for-byte identical.
// ============================================================

export function parseSectionsFromHtml(html) {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const sections = [];
  let unknownCount = 0;

  Array.from(doc.body.children).forEach((el) => {
    let key = el.getAttribute('data-section');
    if (!key) {
      key = `unknown-${unknownCount++}`;
    }
    sections.push({ key, html: el.outerHTML });
  });

  return sections;
}

export function sectionsToHtml(sections) {
  if (!sections || !sections.length) return '';
  return sections.map((s) => s.html).join('\n');
}

export function getSectionHtml(sections, key) {
  const found = (sections || []).find((s) => s.key === key);
  return found ? found.html : null;
}

export function replaceSection(sections, key, newHtml) {
  const list = sections || [];
  const idx = list.findIndex((s) => s.key === key);
  if (idx === -1) {
    return [...list, { key, html: newHtml }];
  }
  const copy = [...list];
  copy[idx] = { key, html: newHtml };
  return copy;
}

export const OVERRIDE_TO_SECTION = {
  overviewText: 'overview',
  objectivesList: 'objectives',
  pricingText: 'serviceScope',
  socialMediaExpectedResults: 'serviceScope',
  socialMediaWhatWeDo: 'serviceScope',
  gmbSectionTitle: 'serviceScope',
  gmbWhatWeDo: 'serviceScope',
  gmbExpectedResults: 'serviceScope',
  seoWhatWeDo: 'serviceScope',
  seoExpectedResults: 'serviceScope',
  paidAdsWhatWeDo: 'serviceScope',
  paidAdsExpectedResults: 'serviceScope',
  leadGenWhatWeDo: 'serviceScope',
  leadGenExpectedResults: 'serviceScope',
  lmtWhatWeDo: 'serviceScope',
  lmtExpectedResults: 'serviceScope',
  reportingWhatWeDo: 'serviceScope',
  reportingExpectedResults: 'serviceScope',
  deliverablesList: 'deliverables',
  contentStrategyThemes: 'contentStrategy',
  pricingText: 'pricing', // handled specially below to also touch serviceScope
  whyAtomsList: 'whyAtoms',
  importantNotesList: 'importantNotes',
  conclusionText: 'conclusion',
};

const SECTION_TITLE_SUBKEY_TO_SECTION = {
  clientInfo: 'clientInfo',
  overview: 'overview',
  objectives: 'objectives',
  serviceScope: 'serviceScope',
  socialMedia: 'serviceScope',
  gmb: 'serviceScope',
  seo: 'serviceScope',
  paidAds: 'serviceScope',
  leadGen: 'serviceScope',
  lmt: 'serviceScope',
  reporting: 'serviceScope',
  deliverables: 'deliverables',
  contentStrategy: 'contentStrategy',
  addOns: 'addOns',
  otherStrategies: 'otherStrategies',
  pricing: 'pricing',
  whyAtoms: 'whyAtoms',
  importantNotes: 'importantNotes',
  conclusion: 'conclusion',
};

function shallowDiffKeys(prevObj, nextObj) {
  const prev = prevObj || {};
  const next = nextObj || {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changed = [];
  keys.forEach((k) => {
    if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) changed.push(k);
  });
  return changed;
}

export function getChangedSections(prevOverrides, nextOverrides) {
  const changedOverrideKeys = shallowDiffKeys(prevOverrides, nextOverrides).filter(
    (k) => k !== 'sectionTitles' && k !== 'customSections'
  );

  const sectionKeySet = new Set();
  changedOverrideKeys.forEach((k) => {
    const sectionKey = OVERRIDE_TO_SECTION[k];
    if (sectionKey) sectionKeySet.add(sectionKey);
    if (k === 'pricingText') sectionKeySet.add('serviceScope');
  });

  const prevTitles = prevOverrides?.sectionTitles || {};
  const nextTitles = nextOverrides?.sectionTitles || {};
  shallowDiffKeys(prevTitles, nextTitles).forEach((subKey) => {
    const sectionKey = SECTION_TITLE_SUBKEY_TO_SECTION[subKey];
    if (sectionKey) sectionKeySet.add(sectionKey);
  });

  const hasCustomSectionChange =
    JSON.stringify(prevOverrides?.customSections || null) !==
    JSON.stringify(nextOverrides?.customSections || null);

  return { sectionKeys: Array.from(sectionKeySet), hasCustomSectionChange };
}