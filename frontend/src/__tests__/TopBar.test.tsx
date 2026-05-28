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
    created_at: '2024-01-01T00:00:00Z',
    files: [],
  };

  const mockScript: Script = {
    id: 1,
    name: 'Test Script',
    gas_script_id: 'gas123',
    spreadsheet_id: 'sheet123',
    latest_version: mockVersion,
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
      />
    );
    expect(screen.getByText('Aucune version')).toBeInTheDocument();
  });

  it('shows Aperçu en cours badge when pendingResult is provided', () => {
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
      />
    );
    expect(screen.getByText('Aperçu en cours')).toBeInTheDocument();
  });

  it('does not show Aperçu en cours when pendingResult is null', () => {
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
      />
    );
    expect(queryByText('Aperçu en cours')).not.toBeInTheDocument();
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
      />
    );
    expect(queryByText('Version créée')).not.toBeInTheDocument();
  });

  it('shows Pull and Push buttons when hasGoogleToken is true', () => {
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
      />
    );
    expect(screen.getByText(/Pull/)).toBeInTheDocument();
    expect(screen.getByText(/Push/)).toBeInTheDocument();
  });

  it('does not show Pull and Push buttons when hasGoogleToken is false', () => {
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
      />
    );
    expect(queryByText(/Pull/)).not.toBeInTheDocument();
    expect(queryByText(/Push/)).not.toBeInTheDocument();
  });

  it('disables Pull button when pulling is true', () => {
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
      />
    );
    const pullButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Pull'));
    pullButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('disables Pull button when pushing is true (cross-disable)', () => {
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
      />
    );
    const pullButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Pull'));
    pullButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('hides Push button when script has no latest_version', () => {
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
      />
    );
    // Pull should still exist
    expect(queryByText(/Pull/)).toBeInTheDocument();
    // But Push should not
    const allPushButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Push'));
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
      />
    );
    expect(screen.getByText(/Push : Push failed: network error/)).toBeInTheDocument();
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
      />
    );
    expect(screen.getByText(/Pull : Pull failed: authentication error/)).toBeInTheDocument();
  });

  it('calls onPull when Pull button clicked', () => {
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
      />
    );
    const pullButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Pull'));
    fireEvent.click(pullButtons[0]);
    expect(mockOnPull).toHaveBeenCalled();
  });

  it('calls onPush when Push button clicked', () => {
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
      />
    );
    const pushButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Push'));
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
      />
    );
    expect(screen.getByText('Importé ✓')).toBeInTheDocument();
  });

  it('shows Pull when pulled is false', () => {
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
      />
    );
    const pullButton = screen.getAllByRole('button').find(btn => btn.textContent.includes('Pull') && !btn.textContent.includes('Importé'));
    expect(pullButton?.textContent).toContain('Pull');
  });

  it('shows Envoyé ✓ when pushed is true', () => {
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
      />
    );
    expect(screen.getByText('Envoyé ✓')).toBeInTheDocument();
  });

  it('shows Push when pushed is false', () => {
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
      />
    );
    const pushButton = screen.getAllByRole('button').find(btn => btn.textContent.includes('Push') && !btn.textContent.includes('Envoyé'));
    expect(pushButton?.textContent).toContain('Push');
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
      />
    );
    const backLink = screen.getByTestId('arrow-left-icon').closest('a');
    expect(backLink).toHaveAttribute('href', '/scripts');
  });

  it('disables Push button when pushing is true', () => {
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
      />
    );
    const pushButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Push'));
    pushButtons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('disables Push button when pulling is true (cross-disable)', () => {
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
      />
    );
    const pushButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Push'));
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
      />
    );
    // Alert icon should not be present when no errors
    const alertIcons = queryByTestId('alert-icon');
    expect(alertIcons).not.toBeInTheDocument();
  });
});
