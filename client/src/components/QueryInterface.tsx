// Feature: multimodal-content-viewer
// Enhanced QueryInterface Component with TypeScript, validation, and UX improvements

import { useState, useCallback, useEffect, useRef } from 'react';
import { QueryInterfaceProps } from '../types';
import { validateQueryInput, getCharacterCountStatus } from '../utils/validation';
import './QueryInterface.css';

const QueryInterface: React.FC<QueryInterfaceProps> = ({ 
  onSubmit, 
  loading, 
  onClear 
}) => {
  const [query, setQuery] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Real-time validation
  const validateInput = useCallback((input: string) => {
    const validation = validateQueryInput(input);
    setValidationError(validation.isValid ? null : validation.error || null);
    return validation.isValid;
  }, []);

  // Handle input change with real-time validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    
    // Only show validation errors after user has tried to submit
    if (isSubmitted) {
      validateInput(newValue);
    }
  }, [isSubmitted, validateInput]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    
    const trimmedQuery = query.trim();
    const isValid = validateInput(trimmedQuery);
    
    if (isValid && !loading && trimmedQuery) {
      onSubmit(trimmedQuery);
      // Clear input after successful submission
      setQuery('');
      setValidationError(null);
      setIsSubmitted(false);
    }
  }, [query, loading, onSubmit, validateInput]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }
    
    // Escape to clear
    if (e.key === 'Escape') {
      setQuery('');
      setValidationError(null);
      setIsSubmitted(false);
      onClear?.();
    }
  }, [handleSubmit, onClear]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [query]);

  // Focus textarea on component mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const characterCount = query.length;
  const characterStatus = getCharacterCountStatus(characterCount);
  const isSubmitDisabled = !query.trim() || loading || !!validationError;

  return (
    <div className="query-interface">
      <form onSubmit={handleSubmit} className="query-form">
        <div className="input-group">
          <div className="textarea-container">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask your Bedrock Agent about multimodal content... (Ctrl+Enter to submit, Esc to clear)"
              className={`query-input ${validationError ? 'error' : ''} ${loading ? 'loading' : ''}`}
              rows={3}
              disabled={loading}
              aria-label="Query input"
              aria-describedby="character-count validation-error"
              maxLength={2100} // Allow slight overflow for better UX
            />
            
            {/* Character count indicator */}
            <div 
              id="character-count"
              className={`character-count ${characterStatus.status}`}
              aria-live="polite"
            >
              {characterStatus.message}
            </div>
          </div>

          {/* Validation error display */}
          {validationError && (
            <div 
              id="validation-error"
              className="validation-error"
              role="alert"
              aria-live="assertive"
            >
              {validationError}
            </div>
          )}

          {/* Action buttons */}
          <div className="button-group">
            {query && !loading && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setValidationError(null);
                  setIsSubmitted(false);
                  onClear?.();
                  textareaRef.current?.focus();
                }}
                className="clear-button"
                aria-label="Clear input"
              >
                Clear
              </button>
            )}
            
            <button
              type="submit"
              className={`submit-button ${loading ? 'loading' : ''} ${isSubmitDisabled ? 'disabled' : ''}`}
              disabled={isSubmitDisabled}
              aria-label={loading ? 'Processing query' : 'Submit query'}
            >
              {loading ? (
                <>
                  <span className="loading-spinner" aria-hidden="true"></span>
                  Processing...
                </>
              ) : (
                'Query Agent'
              )}
            </button>
          </div>

          {/* Keyboard shortcuts help */}
          <div className="keyboard-shortcuts" aria-label="Keyboard shortcuts">
            <small>
              <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to submit • <kbd>Esc</kbd> to clear
            </small>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QueryInterface;