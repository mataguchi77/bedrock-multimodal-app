---
inclusion: fileMatch
fileMatchPattern: 'client/**'
---

# Frontend Development Guidelines

This steering document provides specific guidance for React.js frontend development in the AWS Bedrock Multimodal Content Viewer application.

## React Component Standards

### Component Structure and Organization

Follow a consistent component structure with proper TypeScript typing:

```typescript
// Good: Well-structured React component
import { useState, useCallback, useEffect, useRef } from 'react';
import { ComponentProps } from '../types';
import './Component.css';

interface ComponentState {
  loading: boolean;
  error: string | null;
  data: any | null;
}

const Component: React.FC<ComponentProps> = React.memo(({ 
  prop1, 
  prop2, 
  onAction 
}) => {
  const [state, setState] = useState<ComponentState>({
    loading: false,
    error: null,
    data: null
  });
  
  const componentRef = useRef<HTMLDivElement>(null);
  
  // Event handlers with useCallback for performance
  const handleAction = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    // Handle action logic
    onAction?.(/* parameters */);
  }, [onAction]);
  
  // Effects with proper dependencies
  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup logic
    };
  }, [/* dependencies */]);
  
  return (
    <div ref={componentRef} className="component">
      {/* Component JSX */}
    </div>
  );
});

Component.displayName = 'Component';

export default Component;
```

### Props Interface Design

Define comprehensive and well-documented props interfaces:

```typescript
// Good: Comprehensive props interface
interface QueryInterfaceProps {
  /** Callback function called when user submits a query */
  onSubmit: (query: string) => void;
  
  /** Whether the component is in loading state */
  loading: boolean;
  
  /** Optional callback for clearing the input */
  onClear?: () => void;
  
  /** Initial value for the query input */
  initialValue?: string;
  
  /** Maximum character limit for queries */
  maxLength?: number;
  
  /** Whether the component is disabled */
  disabled?: boolean;
  
  /** Custom CSS class name */
  className?: string;
  
  /** Accessibility label for the input */
  'aria-label'?: string;
}
```

## State Management Patterns

### Local State with useState

Use useState for component-local state with proper typing:

```typescript
// Good: Typed state management
interface FormState {
  query: string;
  isValid: boolean;
  characterCount: number;
  validationError: string | null;
}

const [formState, setFormState] = useState<FormState>({
  query: '',
  isValid: false,
  characterCount: 0,
  validationError: null
});

// Update state immutably
const updateQuery = useCallback((newQuery: string) => {
  const validation = validateQueryInput(newQuery);
  
  setFormState(prevState => ({
    ...prevState,
    query: newQuery,
    characterCount: newQuery.length,
    isValid: validation.isValid,
    validationError: validation.error || null
  }));
}, []);
```

### Custom Hooks for Reusable Logic

Extract reusable logic into custom hooks:

```typescript
// Good: Custom hook for form validation
interface UseFormValidationOptions {
  maxLength: number;
  required: boolean;
  validator?: (value: string) => ValidationResult;
}

function useFormValidation(
  initialValue: string = '',
  options: UseFormValidationOptions
) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  
  const validate = useCallback((inputValue: string) => {
    if (options.required && !inputValue.trim()) {
      return { isValid: false, error: 'This field is required' };
    }
    
    if (inputValue.length > options.maxLength) {
      return { 
        isValid: false, 
        error: `Maximum ${options.maxLength} characters allowed` 
      };
    }
    
    if (options.validator) {
      return options.validator(inputValue);
    }
    
    return { isValid: true, error: null };
  }, [options]);
  
  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    const validation = validate(newValue);
    setError(validation.error || null);
  }, [validate]);
  
  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);
  
  const isValid = error === null && (touched || value.length > 0);
  
  return {
    value,
    error: touched ? error : null,
    isValid,
    touched,
    handleChange,
    handleBlur,
    reset: () => {
      setValue(initialValue);
      setError(null);
      setTouched(false);
    }
  };
}
```

## Performance Optimization

### Memoization Strategies

Use React.memo, useMemo, and useCallback strategically:

```typescript
// Good: Strategic memoization
const ExpensiveComponent: React.FC<ExpensiveComponentProps> = React.memo(({ 
  data, 
  onAction 
}) => {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processed: expensiveProcessing(item)
    }));
  }, [data]);
  
  // Memoize event handlers
  const handleItemClick = useCallback((itemId: string) => {
    onAction(itemId);
  }, [onAction]);
  
  return (
    <div className="expensive-component">
      {processedData.map(item => (
        <ItemComponent
          key={item.id}
          item={item}
          onClick={handleItemClick}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.data === nextProps.data &&
    prevProps.onAction === nextProps.onAction
  );
});
```

### Lazy Loading and Code Splitting

Implement lazy loading for performance:

```typescript
// Good: Lazy loading with Suspense
import { lazy, Suspense } from 'react';

const ContentViewer = lazy(() => import('./ContentViewer'));
const QueryInterface = lazy(() => import('./QueryInterface'));

const App: React.FC = () => {
  return (
    <div className="app">
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <QueryInterface onSubmit={handleSubmit} loading={loading} />
      </Suspense>
      
      <Suspense fallback={<div className="loading">Loading content...</div>}>
        <ContentViewer content={content} loading={loading} />
      </Suspense>
    </div>
  );
};
```

## Accessibility Guidelines

### ARIA Labels and Semantic HTML

Ensure proper accessibility with semantic HTML and ARIA attributes:

```typescript
// Good: Accessible form component
const AccessibleForm: React.FC<FormProps> = ({ onSubmit, loading }) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaId = useId();
  const errorId = useId();
  
  return (
    <form onSubmit={handleSubmit} className="accessible-form">
      <div className="form-group">
        <label htmlFor={textareaId} className="form-label">
          Enter your query
        </label>
        
        <textarea
          id={textareaId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`form-textarea ${error ? 'error' : ''}`}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? 'true' : 'false'}
          aria-label="Query input field"
          disabled={loading}
          rows={3}
        />
        
        {error && (
          <div
            id={errorId}
            className="error-message"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}
      </div>
      
      <button
        type="submit"
        className="submit-button"
        disabled={loading || !query.trim()}
        aria-label={loading ? 'Processing query' : 'Submit query'}
      >
        {loading ? (
          <>
            <span className="loading-spinner" aria-hidden="true" />
            Processing...
          </>
        ) : (
          'Submit Query'
        )}
      </button>
    </form>
  );
};
```

### Keyboard Navigation

Implement proper keyboard navigation:

```typescript
// Good: Keyboard navigation support
const KeyboardNavigableList: React.FC<ListProps> = ({ items, onSelect }) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect(items[focusedIndex]);
        break;
        
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
        
      case 'End':
        event.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
    }
  }, [items, focusedIndex, onSelect]);
  
  return (
    <ul
      ref={listRef}
      className="keyboard-navigable-list"
      role="listbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-activedescendant={`item-${focusedIndex}`}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          id={`item-${index}`}
          className={`list-item ${index === focusedIndex ? 'focused' : ''}`}
          role="option"
          aria-selected={index === focusedIndex}
          onClick={() => onSelect(item)}
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
};
```

## Error Handling and Boundaries

### Error Boundaries

Implement comprehensive error boundaries:

```typescript
// Good: Error boundary with recovery
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<
  PropsWithChildren<ErrorBoundaryProps>,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren<ErrorBoundaryProps>) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Report to error tracking service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }
  
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened.</p>
            
            {this.props.showDetails && this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
            
            <div className="error-actions">
              <button onClick={this.handleRetry} className="retry-button">
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="reload-button"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## CSS and Styling Guidelines

### CSS Modules and BEM Methodology

Use consistent CSS naming conventions:

```css
/* Good: BEM methodology with CSS modules */
.query-interface {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--surface-color);
  border-radius: var(--border-radius-lg);
}

.query-interface__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.query-interface__input-group {
  position: relative;
}

.query-interface__textarea {
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-md);
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.query-interface__textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-color-alpha);
}

.query-interface__textarea--error {
  border-color: var(--error-color);
}

.query-interface__character-count {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.query-interface__character-count--warning {
  color: var(--warning-color);
}

.query-interface__character-count--error {
  color: var(--error-color);
}

/* Responsive design */
@media (max-width: 768px) {
  .query-interface {
    padding: 1rem;
  }
  
  .query-interface__textarea {
    min-height: 100px;
  }
}
```

### CSS Custom Properties for Theming

Use CSS custom properties for consistent theming:

```css
/* Good: CSS custom properties for theming */
:root {
  /* Colors */
  --primary-color: #667eea;
  --primary-color-alpha: rgba(102, 126, 234, 0.1);
  --secondary-color: #764ba2;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  
  /* Text colors */
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  
  /* Background colors */
  --background-primary: #ffffff;
  --background-secondary: #f9fafb;
  --surface-color: #ffffff;
  --border-color: #e5e7eb;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Border radius */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  :root {
    --text-primary: #f9fafb;
    --text-secondary: #d1d5db;
    --text-muted: #9ca3af;
    --background-primary: #111827;
    --background-secondary: #1f2937;
    --surface-color: #374151;
    --border-color: #4b5563;
  }
}
```

## Testing Guidelines for Frontend

### Component Testing with React Testing Library

Write comprehensive component tests:

```typescript
// Good: Component testing with React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryInterface } from './QueryInterface';

describe('QueryInterface Component', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClear = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should render with initial state', () => {
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={false}
        onClear={mockOnClear}
      />
    );
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });
  
  it('should enable submit button when query is entered', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={false}
        onClear={mockOnClear}
      />
    );
    
    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });
    
    await user.type(textarea, 'Test query');
    
    expect(submitButton).toBeEnabled();
  });
  
  it('should call onSubmit with trimmed query', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={false}
        onClear={mockOnClear}
      />
    );
    
    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });
    
    await user.type(textarea, '  Test query  ');
    await user.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith('Test query');
  });
  
  it('should show character count and validation', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={false}
        onClear={mockOnClear}
      />
    );
    
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'Test');
    
    expect(screen.getByText(/4.*characters/i)).toBeInTheDocument();
  });
});
```

### Property-Based Testing for Components

Use property-based testing for comprehensive validation:

```typescript
// Good: Property-based testing for components
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryInterface } from './QueryInterface';

describe('QueryInterface Property-Based Tests', () => {
  it('should handle any valid input string', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 2000 }),
      async (inputString) => {
        const mockOnSubmit = jest.fn();
        const user = userEvent.setup();
        
        render(
          <QueryInterface
            onSubmit={mockOnSubmit}
            loading={false}
          />
        );
        
        const textarea = screen.getByRole('textbox');
        await user.clear(textarea);
        await user.type(textarea, inputString);
        
        const submitButton = screen.getByRole('button', { name: /submit/i });
        
        if (inputString.trim().length > 0) {
          expect(submitButton).toBeEnabled();
        } else {
          expect(submitButton).toBeDisabled();
        }
      }
    ), { numRuns: 50 });
  });
});
```

---

These guidelines ensure consistent, accessible, and performant React.js frontend development.