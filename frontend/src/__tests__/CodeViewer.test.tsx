import React from 'react';
import { render, screen } from '@testing-library/react';
import { CodeViewer } from '../app/(app)/scripts/_detail/components/CodeViewer';
import type { ScriptFile, AiResult } from '../app/(app)/scripts/_detail/types';

describe('CodeViewer Component', () => {
  const mockFile: ScriptFile = {
    id: 1,
    filename: 'Code.js',
    content: 'function test() {\n  return true;\n}',
    file_type: 'server_js',
  };

  it('renders placeholder when no file is selected', () => {
    render(
      <CodeViewer selectedFile={null} previewContent={null} pendingResult={null} />
    );
    expect(screen.getByText('Sélectionne un fichier')).toBeInTheDocument();
  });

  it('displays filename in header', () => {
    render(
      <CodeViewer selectedFile={mockFile} previewContent={null} pendingResult={null} />
    );
    expect(screen.getByText('Code.js')).toBeInTheDocument();
  });

  it('displays file content in normal view', () => {
    render(
      <CodeViewer selectedFile={mockFile} previewContent={null} pendingResult={null} />
    );
    expect(screen.getByText(/function test/)).toBeInTheDocument();
  });

  it('shows diff badge when pendingResult is provided', () => {
    const pendingResult: AiResult = {
      files: [{ filename: 'Code.js', content: 'function test() {\n  return false;\n}', file_type: 'server_js' }],
      version_message: 'Modified version',
    };
    render(
      <CodeViewer
        selectedFile={mockFile}
        previewContent="function test() {\n  return false;\n}"
        pendingResult={pendingResult}
      />
    );
    expect(screen.getByText('Diff IA')).toBeInTheDocument();
  });

  it('shows diff view with added and removed lines', () => {
    const previewContent = 'function test() {\n  return false;\n}';
    const pendingResult: AiResult = {
      files: [{ filename: 'Code.js', content: previewContent, file_type: 'server_js' }],
      version_message: 'Updated',
    };
    const { container } = render(
      <CodeViewer
        selectedFile={mockFile}
        previewContent={previewContent}
        pendingResult={pendingResult}
      />
    );
    // DiffViewer renders a table
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('does not show diff badge when previewContent is null', () => {
    const pendingResult: AiResult = {
      files: [{ filename: 'Code.js', content: 'modified', file_type: 'server_js' }],
      version_message: 'Updated',
    };
    const { queryByText } = render(
      <CodeViewer
        selectedFile={mockFile}
        previewContent={null}
        pendingResult={pendingResult}
      />
    );
    expect(queryByText('Diff IA')).not.toBeInTheDocument();
  });

  it('shows no-changes message when content is identical', () => {
    const pendingResult: AiResult = {
      files: [{ filename: 'Code.js', content: mockFile.content, file_type: 'server_js' }],
      version_message: 'No changes',
    };
    render(
      <CodeViewer
        selectedFile={mockFile}
        previewContent={mockFile.content}
        pendingResult={pendingResult}
      />
    );
    expect(screen.getByText('Aucune modification dans ce fichier')).toBeInTheDocument();
  });
});
