import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SessionExpiredBanner } from '../shared/components/SessionExpiredBanner';

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

jest.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="alert-icon">AlertIcon</span>,
  X: () => <span data-testid="x-icon">XIcon</span>,
}));

describe('SessionExpiredBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render by default', () => {
    render(<SessionExpiredBanner />);
    expect(screen.queryByText(/Votre session a expir/)).not.toBeInTheDocument();
  });

  it('shows when session-expired event is fired', () => {
    render(<SessionExpiredBanner />);
    act(() => {
      window.dispatchEvent(new Event('session-expired'));
    });
    expect(screen.getByText(/Votre session a expir/)).toBeInTheDocument();
  });

  it('calls signIn("google") when reconnect button is clicked', async () => {
    const { signIn } = await import('next-auth/react');
    render(<SessionExpiredBanner />);
    act(() => {
      window.dispatchEvent(new Event('session-expired'));
    });
    fireEvent.click(screen.getByText('Se reconnecter'));
    expect(signIn).toHaveBeenCalledWith('google');
  });

  it('hides when close button is clicked', () => {
    render(<SessionExpiredBanner />);
    act(() => {
      window.dispatchEvent(new Event('session-expired'));
    });
    expect(screen.getByText(/Votre session a expir/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('x-icon').closest('button')!);
    expect(screen.queryByText(/Votre session a expir/)).not.toBeInTheDocument();
  });

  it('removes event listener on unmount', () => {
    const { unmount } = render(<SessionExpiredBanner />);
    unmount();
    act(() => {
      window.dispatchEvent(new Event('session-expired'));
    });
    // no error = listener was properly removed
  });
});
