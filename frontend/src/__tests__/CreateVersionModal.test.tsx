import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateVersionModal } from '../app/(app)/scripts/_detail/components/CreateVersionModal';
import type { AiResult, ScriptFile } from '../app/(app)/scripts/_detail/types';

jest.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader-icon">LoaderIcon</span>,
  FileCode2: () => <span data-testid="file-code-icon">FileIcon</span>,
  Upload: () => <span data-testid="upload-icon">UploadIcon</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">CheckIcon</span>,
  X: () => <span data-testid="x-icon">XIcon</span>,
  AlertCircle: () => <span data-testid="alert-icon">AlertIcon</span>,
}));

describe('CreateVersionModal Component', () => {
  const mockCurrentFiles: ScriptFile[] = [
    { id: 1, filename: 'Code.js', content: 'function test() {}', file_type: 'server_js' },
    { id: 2, filename: 'HTML.html', content: '<div>test</div>', file_type: 'html' },
  ];

  const mockResult: AiResult = {
    files: [
      { filename: 'Code.js', content: 'function test() { return true; }', file_type: 'server_js' },
      { filename: 'HTML.html', content: '<div>test</div>', file_type: 'html' },
      { filename: 'Manifest.json', content: '{}', file_type: 'json' },
    ],
    version_message: 'Updated code logic',
  };

  const mockOnApply = jest.fn();
  const mockOnApplyAndPush = jest.fn();
  const mockOnDiscard = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title with version text', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    expect(screen.getByRole('heading', { name: /Créer une.*version/i })).toBeInTheDocument();
  });

  it('shows pre-filled version message in input', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const input = screen.getByDisplayValue('Updated code logic') as HTMLInputElement;
    expect(input.value).toBe('Updated code logic');
  });

  it('shows modified file with filename', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    expect(screen.getByText('Code.js')).toBeInTheDocument();
  });

  it('shows new file with nouveau badge', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    expect(screen.getByText('Manifest.json')).toBeInTheDocument();
    expect(screen.getByText('nouveau')).toBeInTheDocument();
  });

  it('does not show file list when no files changed', () => {
    const resultNoChanges: AiResult = {
      files: mockCurrentFiles.map(f => ({ ...f })),
      version_message: 'No changes',
    };
    const { queryByText } = render(
      <CreateVersionModal
        result={resultNoChanges}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    expect(queryByText(/fichier.*modifié/)).not.toBeInTheDocument();
  });

  it('shows singular form for 1 modified file', () => {
    const singleModified: AiResult = {
      files: [
        { filename: 'Code.js', content: 'modified', file_type: 'server_js' },
        { filename: 'HTML.html', content: '<div>test</div>', file_type: 'html' },
      ],
      version_message: 'One change',
    };
    render(
      <CreateVersionModal
        result={singleModified}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    expect(screen.getByText(/1 fichier modifié/)).toBeInTheDocument();
  });

  it('shows plural form for multiple modified files', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    expect(screen.getByText(/2 fichiers modifiés/)).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        error="Something went wrong"
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not show error block when error is null', () => {
    const { queryByTestId } = render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        error={null}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    expect(queryByTestId('alert-icon')).not.toBeInTheDocument();
  });

  it('calls onApply with current message when button clicked', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const applyButton = screen.getByText('Créer la version').closest('button');
    fireEvent.click(applyButton!);
    expect(mockOnApply).toHaveBeenCalledWith('Updated code logic');
  });

  it('calls onApply with edited message after user changes input', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const input = screen.getByDisplayValue('Updated code logic') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New message' } });
    const applyButton = screen.getByText('Créer la version').closest('button');
    fireEvent.click(applyButton!);
    expect(mockOnApply).toHaveBeenCalledWith('New message');
  });

  it('disables create button when message is empty', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const input = screen.getByDisplayValue('Updated code logic') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    const applyButton = screen.getByText('Créer la version').closest('button');
    expect(applyButton).toBeDisabled();
  });

  it('calls onDiscard when X button clicked', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const allButtons = screen.getAllByRole('button');
    const closeButton = allButtons.find(btn => btn.querySelector('[data-testid="x-icon"]'));
    fireEvent.click(closeButton!);
    expect(mockOnDiscard).toHaveBeenCalled();
  });

  it('calls onDiscard when Ignorer button clicked', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const ignoreButton = screen.getByText('Ignorer').closest('button');
    fireEvent.click(ignoreButton!);
    expect(mockOnDiscard).toHaveBeenCalled();
  });

  it('shows Créer + Push button when hasGoogleToken is true', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={true}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    expect(screen.getByText('Créer + Push')).toBeInTheDocument();
  });

  it('does not show Créer + Push button when hasGoogleToken is false', () => {
    const { queryByText } = render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    expect(queryByText('Créer + Push')).not.toBeInTheDocument();
  });

  it('calls onApplyAndPush with current message when clicked', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={true}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const pushButton = screen.getByText('Créer + Push').closest('button');
    fireEvent.click(pushButton!);
    expect(mockOnApplyAndPush).toHaveBeenCalledWith('Updated code logic');
  });

  it('disables all buttons when applying is true', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={true}
        applying={true}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const allButtons = screen.getAllByRole('button');
    allButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('disables X button when applying is true', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={true}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const allButtons = screen.getAllByRole('button');
    allButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('disables input when applying is true', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={true}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const input = screen.getByDisplayValue('Updated code logic') as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it('disables Créer + Push button when message is empty', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={true}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const input = screen.getByDisplayValue('Updated code logic') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    const pushButton = screen.getByText('Créer + Push').closest('button');
    expect(pushButton).toBeDisabled();
  });

  it('does not call onApply when button is disabled and clicked', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const input = screen.getByDisplayValue('Updated code logic') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    const applyButton = screen.getByText('Créer la version').closest('button');
    fireEvent.click(applyButton!);
    expect(mockOnApply).not.toHaveBeenCalled();
  });

  it('shows error icon when error is provided', () => {
    render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        error="Test error"
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });

  it('displays modified files with yellow styling', () => {
    const { container } = render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const modifiedFileElements = container.querySelectorAll('.bg-extia-yellow\\/5');
    expect(modifiedFileElements.length).toBeGreaterThan(0);
  });

  it('displays new files with green styling', () => {
    const { container } = render(
      <CreateVersionModal
        result={mockResult}
        currentFiles={mockCurrentFiles}
        hasGoogleToken={false}
        applying={false}
        onApply={mockOnApply}
        onApplyAndPush={mockOnApplyAndPush}
        onDiscard={mockOnDiscard}
      />
    );
    const newFileElements = container.querySelectorAll('.bg-green-500\\/5');
    expect(newFileElements.length).toBeGreaterThan(0);
  });
});
