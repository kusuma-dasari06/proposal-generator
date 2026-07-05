// ============================================================
// PromptAdminPage — Hidden admin page for editing system prompts
// Access via: /#/atom-admin
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PromptAdminPage.css';
import {
  fetchPromptData,
  savePrompt,
  resetPrompt,
  getDefaultPrompt,
} from '../../utils/promptManager';
import PromptAssistantChat from './PromptAssistantChat';

const TABS = [
  { key: 'collection', label: 'Collection Prompt', description: 'Controls how the AI collects client data and builds the proposal JSON.' },
  { key: 'generation', label: 'Generation Prompt', description: 'Controls how the AI converts JSON data into the final HTML proposal.' },
];

export default function PromptAdminPage() {
  const [activeTab, setActiveTab] = useState('collection');
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [saveError, setSaveError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const textareaRef = useRef(null);
  const searchInputRef = useRef(null);

  // ── Load prompt data when tab changes ─────────────────────
  const loadData = useCallback(async (key) => {
    setIsLoading(true);
    setSaveStatus(null);
    const data = await fetchPromptData(key);
    setContent(data.content);
    setOriginalContent(data.content);
    setIsCustom(data.isCustom);
    setUpdatedAt(data.updatedAt);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab, loadData]);

  // ── Keyboard shortcut: Ctrl+S to save, Ctrl+F to search ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(prev => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const hasChanges = content !== originalContent;

  // ── Save handler ──────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    const result = await savePrompt(activeTab, content);
    if (result.success) {
      setSaveStatus('success');
      setOriginalContent(content);
      setIsCustom(true);
      setUpdatedAt(new Date().toISOString());
    } else {
      setSaveStatus('error');
      setSaveError(result.error || 'Unknown error');
    }
    setIsSaving(false);
    setTimeout(() => setSaveStatus(null), 4000);
  };

  // ── Reset handler ─────────────────────────────────────────
  const handleReset = async () => {
    if (!window.confirm('Reset this prompt to the hardcoded default? Any saved customisation will be removed.')) return;
    setIsSaving(true);
    const result = await resetPrompt(activeTab);
    if (result.success) {
      const defaultContent = getDefaultPrompt(activeTab);
      setContent(defaultContent);
      setOriginalContent(defaultContent);
      setIsCustom(false);
      setUpdatedAt(null);
      setSaveStatus('success');
    } else {
      setSaveStatus('error');
      setSaveError(result.error || 'Reset failed');
    }
    setIsSaving(false);
    setTimeout(() => setSaveStatus(null), 4000);
  };

  // ── Copy handler ──────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setSaveStatus('copied');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch {
      // Fallback
      textareaRef.current?.select();
      document.execCommand('copy');
    }
  };

  // ── Stats ─────────────────────────────────────────────────
  const lineCount = content.split('\n').length;
  const charCount = content.length;
  const activeTabInfo = TABS.find(t => t.key === activeTab);

  // ── Back to main app ──────────────────────────────────────
  const goBack = () => {
    window.location.hash = '';
  };

  return (
    <div className="admin-root">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <button className="admin-back-btn" onClick={goBack} title="Back to main app">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="admin-title">System Prompt Editor</h1>
            <p className="admin-subtitle">Atoms Digital Solutions — Prompt Management</p>
          </div>
        </div>
        <div className="admin-header-right">
          {isCustom && (
            <span className="admin-badge admin-badge-custom">Custom</span>
          )}
          {!isCustom && (
            <span className="admin-badge admin-badge-default">Default</span>
          )}
          {hasChanges && (
            <span className="admin-badge admin-badge-unsaved">Unsaved Changes</span>
          )}
          <button
            className={`admin-btn ${showCopilot ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
            onClick={() => setShowCopilot(prev => !prev)}
            style={{ marginLeft: '8px', padding: '6px 14px' }}
            title="Toggle Prompt Co-pilot Assistant"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>support_agent</span>
            {showCopilot ? 'Close Co-pilot' : '🤖 Prompt Co-pilot'}
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="admin-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'admin-tab-active' : ''}`}
            onClick={() => {
              if (hasChanges && !window.confirm('You have unsaved changes. Switch tab anyway?')) return;
              setActiveTab(tab.key);
            }}
          >
            <span className="admin-tab-icon">
              {tab.key === 'collection' ? '📋' : '🏗️'}
            </span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Info bar */}
      <div className="admin-info-bar">
        <p className="admin-info-desc">{activeTabInfo?.description}</p>
        {updatedAt && (
          <p className="admin-info-updated">
            Last saved: {new Date(updatedAt).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: true,
            })}
          </p>
        )}
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="admin-search-bar">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', opacity: 0.5 }}>search</span>
          <input
            ref={searchInputRef}
            type="text"
            className="admin-search-input"
            placeholder="Search in prompt... (Ctrl+F)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="admin-search-close" onClick={() => { setShowSearch(false); setSearchQuery(''); }}>✕</button>
        </div>
      )}

      {/* Editor & Co-pilot Split Area */}
      <div className="admin-body-split">
        <div className="admin-editor-container">
          {isLoading ? (
            <div className="admin-loading">
              <div className="admin-spinner" />
              <p>Loading prompt...</p>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              className="admin-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              wrap="off"
            />
          )}
        </div>

        <PromptAssistantChat
          isOpen={showCopilot}
          onClose={() => setShowCopilot(false)}
          activeTab={activeTab}
          promptContent={content}
        />
      </div>

      {/* Footer: stats + actions */}
      <footer className="admin-footer">
        <div className="admin-stats">
          <span>{lineCount.toLocaleString()} lines</span>
          <span className="admin-stat-divider">•</span>
          <span>{charCount.toLocaleString()} chars</span>
        </div>

        <div className="admin-actions">
          {/* Status message */}
          {saveStatus === 'success' && (
            <span className="admin-status admin-status-success">Saved successfully</span>
          )}
          {saveStatus === 'error' && (
            <span className="admin-status admin-status-error">Error: {saveError}</span>
          )}
          {saveStatus === 'copied' && (
            <span className="admin-status admin-status-success">Copied to clipboard</span>
          )}

          <button
            className="admin-btn admin-btn-secondary"
            onClick={handleCopy}
            title="Copy prompt to clipboard"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
            Copy
          </button>

          {isCustom && (
            <button
              className="admin-btn admin-btn-danger"
              onClick={handleReset}
              disabled={isSaving}
              title="Reset to hardcoded default"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restart_alt</span>
              Reset Default
            </button>
          )}

          <button
            className="admin-btn admin-btn-primary"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            title="Save prompt to Supabase (Ctrl+S)"
          >
            {isSaving ? (
              <>
                <div className="admin-btn-spinner" />
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span>
                Save Prompt
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
