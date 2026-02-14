// Happy path tests for QueryInterface component

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QueryInterface from '../QueryInterface';

describe('QueryInterface - Happy Path', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the component', () => {
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={false}
        onClear={mockOnClear}
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /query agent/i })).toBeInTheDocument();
  });

  it('should accept text input', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={false}
        onClear={mockOnClear}
      />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Test query');

    expect(textarea).toHaveValue('Test query');
  });

  it('should submit query when button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={false}
        onClear={mockOnClear}
      />
    );

    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /query agent/i });

    await user.type(textarea, 'Test query');
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith('Test query');
  });

  it('should clear input when clear button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={false}
        onClear={mockOnClear}
      />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Test query');

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    expect(textarea).toHaveValue('');
  });

  it('should show character count', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={false}
        onClear={mockOnClear}
      />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello');

    expect(screen.getByText(/5.*character/i)).toBeInTheDocument();
  });

  it('should disable submit button when loading', () => {
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={true}
        onClear={mockOnClear}
      />
    );

    const submitButton = screen.getByRole('button', { name: /processing/i });
    expect(submitButton).toBeDisabled();
  });

  it('should show loading state', () => {
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={true}
        onClear={mockOnClear}
      />
    );

    expect(screen.getByText(/processing/i)).toBeInTheDocument();
  });

  it('should submit with Ctrl+Enter keyboard shortcut', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={false}
        onClear={mockOnClear}
      />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Test query');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(mockOnSubmit).toHaveBeenCalledWith('Test query');
  });

  it('should trim whitespace from query', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryInterface
        onSubmit={mockOnSubmit}
        loading={false}
        onClear={mockOnClear}
      />
    );

    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /query agent/i });

    await user.type(textarea, '  Test query  ');
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith('Test query');
  });
});
