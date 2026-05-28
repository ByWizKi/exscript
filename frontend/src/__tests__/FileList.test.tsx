import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileList } from '../app/(app)/scripts/_detail/components/FileList';
import type { ScriptFile, AiResult } from '../app/(app)/scripts/_detail/types';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  FileCode2: () => <span data-testid="file-code-icon">FileIcon</span>,
  ChevronRight: () => <span data-testid="chevron-icon">ChevronIcon</span>,
}));

describe('FileList Component', () => {
  const mockFiles: ScriptFile[] = [
    { id: 1, filename: 'Code.js', content: 'function test() {}', file_type: 'server_js' },
    { id: 2, filename: 'HTML.html', content: '<div>test</div>', file_type: 'html' },
  ];

  it('renders no files message when files array is empty', () => {
    const mockOnSelect = jest.fn();
    render(
      <FileList
        files={[]}
        selectedFilename={null}
        pendingResult={null}
        onSelect={mockOnSelect}
      />
    );
    expect(screen.getByText('Aucun fichier')).toBeInTheDocument();
  });

  it('renders all files when provided', () => {
    const mockOnSelect = jest.fn();
    render(
      <FileList
        files={mockFiles}
        selectedFilename={null}
        pendingResult={null}
        onSelect={mockOnSelect}
      />
    );
    expect(screen.getByText('Code.js')).toBeInTheDocument();
    expect(screen.getByText('HTML.html')).toBeInTheDocument();
  });

  it('highlights selected file', () => {
    const mockOnSelect = jest.fn();
    render(
      <FileList
        files={mockFiles}
        selectedFilename="Code.js"
        pendingResult={null}
        onSelect={mockOnSelect}
      />
    );
    const codeJsButton = screen.getByText('Code.js').closest('button');
    expect(codeJsButton).toHaveClass('bg-extia-yellow/15', 'text-extia-yellow');
  });

  it('calls onSelect when a file is clicked', () => {
    const mockOnSelect = jest.fn();
    render(
      <FileList
        files={mockFiles}
        selectedFilename={null}
        pendingResult={null}
        onSelect={mockOnSelect}
      />
    );
    const codeJsButton = screen.getByText('Code.js').closest('button');
    fireEvent.click(codeJsButton!);
    expect(mockOnSelect).toHaveBeenCalledWith('Code.js');
  });

  it('shows modification indicator when file is modified', () => {
    const mockOnSelect = jest.fn();
    const pendingResult: AiResult = {
      files: [{ filename: 'Code.js', content: 'function updated() {}', file_type: 'server_js' }],
      version_message: 'Updated version',
    };
    render(
      <FileList
        files={mockFiles}
        selectedFilename={null}
        pendingResult={pendingResult}
        onSelect={mockOnSelect}
      />
    );
    const modifiedIndicators = screen.getAllByTitle('Modifié');
    expect(modifiedIndicators.length).toBeGreaterThan(0);
    expect(modifiedIndicators[0]).toBeInTheDocument();
  });

  it('does not show modification indicator when file content matches', () => {
    const mockOnSelect = jest.fn();
    const pendingResult: AiResult = {
      files: [
        { filename: 'Code.js', content: 'function test() {}', file_type: 'server_js' },
        { filename: 'HTML.html', content: '<div>test</div>', file_type: 'html' },
      ],
      version_message: 'No changes',
    };
    const { queryAllByTitle } = render(
      <FileList
        files={mockFiles}
        selectedFilename={null}
        pendingResult={pendingResult}
        onSelect={mockOnSelect}
      />
    );
    const modifiedIndicators = queryAllByTitle('Modifié');
    // When all files match, no modified indicators should appear
    expect(modifiedIndicators.length).toBe(0);
  });

  it('shows chevron icon for selected file', () => {
    const mockOnSelect = jest.fn();
    const { rerender } = render(
      <FileList
        files={mockFiles}
        selectedFilename={null}
        pendingResult={null}
        onSelect={mockOnSelect}
      />
    );
    expect(screen.queryByTestId('chevron-icon')).not.toBeInTheDocument();

    rerender(
      <FileList
        files={mockFiles}
        selectedFilename="Code.js"
        pendingResult={null}
        onSelect={mockOnSelect}
      />
    );
    expect(screen.getByTestId('chevron-icon')).toBeInTheDocument();
  });
});
