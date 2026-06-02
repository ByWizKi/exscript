import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from '../app/(app)/scripts/_detail/components/TopBar';
import type { Script, ScriptVersion, AiResult } from '../app/(app)/scripts/_detail/types';

jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeftIcon</span>,
  Loader2: () => <span data-testid="loader-icon">LoaderIcon</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">CheckIcon</span>,
  Sparkles: () => <span data-testid="sparkles-icon">SparklesIcon</span>,
  Upload: () => <span data-testid="upload-icon">UploadIcon</span>,
  Download: () => <span data-testid="download-icon">DownloadIcon</span>,
  AlertCircle: () => <span data-testid="alert-icon">AlertIcon</span>,
}));

jest.mock('next/link', () => {
  const MockLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('TopBar Component', () => {
  const mockVersion: ScriptVersion = {
    id: 1,
    version_number: 1,
    message: 'Initial version',
    status: 'completed',
    created_by: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    files: [],
  };

  const mockScript: Script = {
    id: 1,
    name: 'Test Script',
    gas_script_id: 'gas123',
    spreadsheet_id: 'sheet123',
    latest_version: mockVersion,
    versions: [mockVersion],
  };

  const mockOnPush = jest.fn();
  const mockOnPull = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders script name', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={false}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByText('Test Script')).toBeInTheDocument();
  });

  it('shows version info when latest_version exists', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={false}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByText(/v1 · Initial version/)).toBeInTheDocument();
  });

  it('shows Aucune version when latest_version is null', () => {
    const scriptNoVersion: Script = {
      ...mockScript,
      latest_version: null,
    };
    render(
      <TopBar
        script={scriptNoVersion}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={false}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByText('Aucune version')).toBeInTheDocument();
  });

  it('shows Créer la version button when pendingResult is provided', () => {
    const pendingResult: AiResult = {
      files: [],
      version_message: 'Preview',
    };
    render(
      <TopBar
        script={mockScript}
        pendingResult={pendingResult}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={false}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByText('Créer la version')).toBeInTheDocument();
  });

  it('does not show Créer la version when pendingResult is null', () => {
    const { queryByText } = render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={false}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(queryByText('Créer la version')).not.toBeInTheDocument();
  });

  it('shows Version créée when applied is true', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={true}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={false}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByText('Version créée')).toBeInTheDocument();
  });

  it('does not show Version créée when applied is false', () => {
    const { queryByText } = render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={false}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(queryByText('Version créée')).not.toBeInTheDocument();
  });

  it('shows Importer and Publier buttons when hasGoogleToken is true', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByText(/Importer/)).toBeInTheDocument();
    expect(screen.getByText(/Publier/)).toBeInTheDocument();
  });

  it('does not show Importer and Publier buttons when hasGoogleToken is false', () => {
    const { queryByText } = render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={false}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(queryByText(/Importer/)).not.toBeInTheDocument();
    expect(queryByText(/Publier/)).not.toBeInTheDocument();
  });

  it('disables Importer button when pulling is true', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={true}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    const pullButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Importer'));
    pullButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('disables Importer button when pushing is true (cross-disable)', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={true}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    const pullButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Importer'));
    pullButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('hides Publier button when script has no latest_version', () => {
    const scriptNoVersion: Script = {
      ...mockScript,
      latest_version: null,
    };
    const { queryByText } = render(
      <TopBar
        script={scriptNoVersion}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    // Importer should still exist
    expect(queryByText(/Importer/)).toBeInTheDocument();
    // But Publier should not
    const allPushButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Publier'));
    expect(allPushButtons.length).toBe(0);
  });

  it('shows push error banner when pushError is provided', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        pushError="Push failed: network error"
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByText(/Publier : Push failed: network error/)).toBeInTheDocument();
  });

  it('shows pull error banner when pullError is provided', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        pullError="Pull failed: authentication error"
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByText(/Importer : Pull failed: authentication error/)).toBeInTheDocument();
  });

  it('calls onPull when Importer button clicked', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    const pullButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Importer'));
    fireEvent.click(pullButtons[0]);
    expect(mockOnPull).toHaveBeenCalled();
  });

  it('calls onPush when Publier button clicked', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    const pushButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Publier'));
    fireEvent.click(pushButtons[0]);
    expect(mockOnPush).toHaveBeenCalled();
  });

  it('shows Importé ✓ when pulled is true', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={true}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByText('Importé ✓')).toBeInTheDocument();
  });

  it('shows Importer when pulled is false', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    const pullButton = screen.getAllByRole('button').find(btn => btn.textContent.includes('Importer') && !btn.textContent.includes('Importé'));
    expect(pullButton?.textContent).toContain('Importer');
  });

  it('shows Publié ✓ when pushed is true', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={true}
        pulling={false}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByText('Publié ✓')).toBeInTheDocument();
  });

  it('shows Publier when pushed is false', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    const pushButton = screen.getAllByRole('button').find(btn => btn.textContent.includes('Publier') && !btn.textContent.includes('Publié'));
    expect(pushButton?.textContent).toContain('Publier');
  });

  it('renders back link with correct href', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={false}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    const backLink = screen.getByTestId('arrow-left-icon').closest('a');
    expect(backLink).toHaveAttribute('href', '/scripts');
  });

  it('disables Publier button when pushing is true', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={true}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    const pushButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Publier'));
    pushButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('disables Publier button when pulling is true (cross-disable)', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={true}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    const pushButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Publier'));
    pushButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('shows sparkles icon when pendingResult is provided', () => {
    const pendingResult: AiResult = {
      files: [],
      version_message: 'Preview',
    };
    render(
      <TopBar
        script={mockScript}
        pendingResult={pendingResult}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={false}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
  });

  it('shows check circle icon when applied is true', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={true}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={false}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    const checkIcons = screen.getAllByTestId('check-circle-icon');
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it('shows download icon in Pull button', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByTestId('download-icon')).toBeInTheDocument();
  });

  it('shows upload icon in Push button', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByTestId('upload-icon')).toBeInTheDocument();
  });

  it('shows alert icon in error banners', () => {
    render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        pushError="Error"
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });

  it('does not show error banners when errors are null', () => {
    const { queryByTestId } = render(
      <TopBar
        script={mockScript}
        pendingResult={null}
        applied={false}
        pushing={false}
        pushed={false}
        pulling={false}
        pulled={false}
        pushError={null}
        pullError={null}
        hasGoogleToken={true}
        onPush={mockOnPush}
        onPull={mockOnPull}
        onCreateVersion={jest.fn()}
      />
    );
    // Alert icon should not be present when no errors
    const alertIcons = queryByTestId('alert-icon');
    expect(alertIcons).not.toBeInTheDocument();
  });
});
