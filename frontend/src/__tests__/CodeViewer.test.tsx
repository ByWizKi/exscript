import React from 'react';
import { render, screen } from '@testing-library/react';
import { CodeViewer } from '../app/(app)/scripts/[id]/components/CodeViewer';
import type { ScriptFile, AiResult } from '../app/(app)/scripts/[id]/types';

describe('CodeViewer Component', () => {
  const mockFile: ScriptFile = {
    id: 1,
    filename: 'Code.js',
    content: 'function test() {\n  return true;\n}',
    file_type: 'server_js',
  };

  it('renders placeholder when no file is selected', () => {
    render(
      <CodeViewer
        selectedFile={null}
        previewContent={null}
        pendingResult={null}
      />
    );
    expect(screen.getByText('Sélectionne un fichier')).toBeInTheDocument();
  });

  it('displays selected file content', () => {
    render(
      <CodeViewer
        selectedFile={mockFile}
        previewContent={null}
        pendingResult={null}
      />
    );
    expect(screen.getByText('Code.js')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.tagName === 'PRE' && content.includes('function test()');
    })).toBeInTheDocument();
  });

  it('shows modification preview when pendingResult is provided', () => {
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
    expect(screen.getByText('Aperçu des modifications')).toBeInTheDocument();
    expect(screen.getByText('Avant')).toBeInTheDocument();
    expect(screen.getByText('Après')).toBeInTheDocument();
  });

  it('displays both before and after content in diff view', () => {
    const previewContent = 'function modified() {\n  return true;\n}';
    const pendingResult: AiResult = {
      files: [{ filename: 'Code.js', content: previewContent, file_type: 'server_js' }],
      version_message: 'Updated',
    };
    render(
      <CodeViewer
        selectedFile={mockFile}
        previewContent={previewContent}
        pendingResult={pendingResult}
      />
    );
    // Before section shows original content
    expect(screen.getByText((content, element) => {
      return element?.tagName === 'PRE' && content.includes('function test()');
    })).toBeInTheDocument();
    // After section shows new content
    expect(screen.getByText((content, element) => {
      return element?.tagName === 'PRE' && content.includes('function modified()');
    })).toBeInTheDocument();
  });

  it('does not show diff label when previewContent is null', () => {
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
    expect(queryByText('Aperçu des modifications')).not.toBeInTheDocument();
  });

  it('displays filename in header', () => {
    render(
      <CodeViewer
        selectedFile={mockFile}
        previewContent={null}
        pendingResult={null}
      />
    );
    expect(screen.getByText('Code.js')).toBeInTheDocument();
  });

  it('renders two-column layout with divider in diff mode', () => {
    const previewContent = 'modified code';
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
    // Check for grid-cols-2 class indicating two-column layout
    const gridContainer = container.querySelector('.grid-cols-2');
    expect(gridContainer).toBeInTheDocument();
  });
});
