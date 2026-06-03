import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiChat } from '../app/(app)/scripts/_detail/components/AiChat';
import type { ChatMessage, ScriptFile, AiResult } from '../app/(app)/scripts/_detail/types';

jest.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader-icon">LoaderIcon</span>,
  Bot: () => <span data-testid="bot-icon">BotIcon</span>,
  Send: () => <span data-testid="send-icon">SendIcon</span>,
  AlertCircle: () => <span data-testid="alert-icon">AlertIcon</span>,
  Check: () => <span data-testid="check-icon">CheckIcon</span>,
  X: () => <span data-testid="x-icon">XIcon</span>,
  BookOpen: () => <span data-testid="bookopen-icon">BookOpenIcon</span>,
}));

describe('AiChat Component', () => {
  const mockFiles: ScriptFile[] = [
    { id: 1, filename: 'Code.js', content: 'function test() {}', file_type: 'server_js' },
    { id: 2, filename: 'HTML.html', content: '<div>test</div>', file_type: 'html' },
  ];

  const mockOnSend = jest.fn();
  const mockOnSelectFile = jest.fn();
  const mockOnPromptChange = jest.fn();

  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state with suggestion buttons when no messages', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getByText(/Décris une modification/)).toBeInTheDocument();
    expect(screen.getByText('Ajoute une validation des données avant traitement')).toBeInTheDocument();
  });

  it('renders user message bubble', () => {
    const messages: ChatMessage[] = [
      { role: 'user', text: 'Add validation' },
    ];
    render(
      <AiChat
        messages={messages}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getByText('Add validation')).toBeInTheDocument();
  });

  it('renders assistant message bubble', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', text: 'I have made the changes' },
    ];
    render(
      <AiChat
        messages={messages}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getByText('Modifications prêtes')).toBeInTheDocument();
    expect(screen.getByText('I have made the changes')).toBeInTheDocument();
  });

  it('renders assistant error message with error styling', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', text: '', error: 'Failed to process request' },
    ];
    render(
      <AiChat
        messages={messages}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getByText('Failed to process request')).toBeInTheDocument();
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });

  it('shows AI loading spinner when aiLoading is true', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={true}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getByText('Traitement en cours…')).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('calls onSend with the prompt text when send button clicked', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt="Add logging"
        onPromptChange={mockOnPromptChange}
      />
    );
    const sendButton = screen.getByText('Envoyer').closest('button');
    fireEvent.click(sendButton!);
    expect(mockOnSend).toHaveBeenCalledWith('Add logging');
  });

  it('calls onSend when pressing Cmd+Enter in textarea', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt="Add feature"
        onPromptChange={mockOnPromptChange}
      />
    );
    const textarea = screen.getByPlaceholderText(/Ex: Ajoute une colonne/) as HTMLTextAreaElement;
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
    expect(mockOnSend).toHaveBeenCalledWith('Add feature');
  });

  it('calls onSend when pressing Ctrl+Enter in textarea', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt="Optimize code"
        onPromptChange={mockOnPromptChange}
      />
    );
    const textarea = screen.getByPlaceholderText(/Ex: Ajoute une colonne/) as HTMLTextAreaElement;
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(mockOnSend).toHaveBeenCalledWith('Optimize code');
  });

  it('updates textarea via onPromptChange when user types', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    const textarea = screen.getByPlaceholderText(/Ex: Ajoute une colonne/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    expect(mockOnPromptChange).toHaveBeenCalledWith('Test message');
  });

  it('disables send button when prompt is empty', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    const sendButton = screen.getByText('Envoyer').closest('button');
    expect(sendButton).toBeDisabled();
  });

  it('disables send button when prompt is only whitespace', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt="   "
        onPromptChange={mockOnPromptChange}
      />
    );
    const sendButton = screen.getByText('Envoyer').closest('button');
    expect(sendButton).toBeDisabled();
  });

  it('disables send button when aiLoading is true', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={true}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt="Add validation"
        onPromptChange={mockOnPromptChange}
      />
    );
    const sendButton = screen.getByText('Envoyer').closest('button');
    expect(sendButton).toBeDisabled();
  });

  it('shows file modification links in assistant message', () => {
    const result: AiResult = {
      files: [
        { filename: 'Code.js', content: 'modified', file_type: 'server_js' },
        { filename: 'HTML.html', content: '<div>test</div>', file_type: 'html' },
      ],
      version_message: 'Updates done',
    };
    const messages: ChatMessage[] = [
      { role: 'assistant', text: 'Code updated', result },
    ];
    render(
      <AiChat
        messages={messages}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getByText('Code.js')).toBeInTheDocument();
    expect(screen.getByText('HTML.html')).toBeInTheDocument();
  });

  it('shows modifié label for changed files', () => {
    const result: AiResult = {
      files: [
        { filename: 'Code.js', content: 'modified', file_type: 'server_js' },
        { filename: 'HTML.html', content: '<div>test</div>', file_type: 'html' },
      ],
      version_message: 'Updates',
    };
    const messages: ChatMessage[] = [
      { role: 'assistant', text: 'Done', result },
    ];
    render(
      <AiChat
        messages={messages}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    const modifiedLabels = screen.getAllByText('modifié');
    expect(modifiedLabels.length).toBeGreaterThan(0);
  });

  it('does not show modifié label for unchanged files', () => {
    const result: AiResult = {
      files: [
        { filename: 'Code.js', content: 'function test() {}', file_type: 'server_js' },
        { filename: 'HTML.html', content: '<div>test</div>', file_type: 'html' },
      ],
      version_message: 'No changes',
    };
    const messages: ChatMessage[] = [
      { role: 'assistant', text: 'No mods', result },
    ];
    const { queryAllByText } = render(
      <AiChat
        messages={messages}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    const modifiedLabels = queryAllByText('modifié');
    expect(modifiedLabels.length).toBe(0);
  });

  it('calls onSelectFile when file link clicked', () => {
    const result: AiResult = {
      files: [
        { filename: 'Code.js', content: 'modified', file_type: 'server_js' },
      ],
      version_message: 'Updates',
    };
    const messages: ChatMessage[] = [
      { role: 'assistant', text: 'Done', result },
    ];
    render(
      <AiChat
        messages={messages}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    const fileLink = screen.getByText('Code.js').closest('button');
    fireEvent.click(fileLink!);
    expect(mockOnSelectFile).toHaveBeenCalledWith('Code.js', result);
  });

  it('calls onSend when suggestion button clicked', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    const suggestionButton = screen.getByText('Ajoute une validation des données avant traitement').closest('button');
    fireEvent.click(suggestionButton!);
    expect(mockOnSend).toHaveBeenCalledWith('Ajoute une validation des données avant traitement');
  });

  it('does not show empty state when messages exist', () => {
    const messages: ChatMessage[] = [
      { role: 'user', text: 'Add feature' },
    ];
    const { queryByText } = render(
      <AiChat
        messages={messages}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(queryByText(/Décris une modification/)).not.toBeInTheDocument();
  });

  it('shows textarea with correct placeholder', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    const textarea = screen.getByPlaceholderText(/Ex: Ajoute une colonne Statut/) as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
  });

  it('disables textarea when aiLoading is true', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={true}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt="Test"
        onPromptChange={mockOnPromptChange}
      />
    );
    const textarea = screen.getByPlaceholderText(/Ex: Ajoute une colonne/) as HTMLTextAreaElement;
    expect(textarea).toBeDisabled();
  });

  it('renders multiple messages in order', () => {
    const messages: ChatMessage[] = [
      { role: 'user', text: 'First message' },
      { role: 'assistant', text: 'Response' },
      { role: 'user', text: 'Second message' },
    ];
    render(
      <AiChat
        messages={messages}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Response')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });

  it('renders all suggestion buttons in empty state', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getByText('Ajoute une validation des données avant traitement')).toBeInTheDocument();
    expect(screen.getByText('Optimise les performances de la boucle principale')).toBeInTheDocument();
    expect(screen.getByText('Ajoute des logs pour faciliter le débogage')).toBeInTheDocument();
    expect(screen.getByText('Explique ce que fait ce script')).toBeInTheDocument();
  });

  it('shows bot icon in header', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getAllByTestId('bot-icon').length).toBeGreaterThan(0);
  });

  it('shows send icon in send button', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt="Test"
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getByTestId('send-icon')).toBeInTheDocument();
  });

  it('does not call onSend when Enter pressed without modifier key', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt="Test message"
        onPromptChange={mockOnPromptChange}
      />
    );
    const textarea = screen.getByPlaceholderText(/Ex: Ajoute une colonne/) as HTMLTextAreaElement;
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('shows keyboard shortcut hint', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getByText('⌘ + Entrée')).toBeInTheDocument();
  });

  it('renders Assistant IA header title', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getByText('Assistant IA')).toBeInTheDocument();
  });

  it('handles message with no result property', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', text: 'Message without result' },
    ];
    render(
      <AiChat
        messages={messages}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    expect(screen.getByText('Message without result')).toBeInTheDocument();
  });

  it('displays file indicator with correct styling for modified files', () => {
    const result: AiResult = {
      files: [
        { filename: 'Code.js', content: 'modified', file_type: 'server_js' },
      ],
      version_message: 'Updated',
    };
    const messages: ChatMessage[] = [
      { role: 'assistant', text: 'Done', result },
    ];
    const { container } = render(
      <AiChat
        messages={messages}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    const nightIndicators = container.querySelectorAll('.bg-extia-night');
    expect(nightIndicators.length).toBeGreaterThan(0);
  });

  it('does not show send button as loading when aiLoading is false', () => {
    render(
      <AiChat
        messages={[]}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt="Test"
        onPromptChange={mockOnPromptChange}
      />
    );
    const sendIcon = screen.getByTestId('send-icon');
    expect(sendIcon).toBeInTheDocument();
  });

  it('calls onSelectFile with correct parameters when multiple files present', () => {
    const result: AiResult = {
      files: [
        { filename: 'Code.js', content: 'modified', file_type: 'server_js' },
        { filename: 'HTML.html', content: 'also modified', file_type: 'html' },
      ],
      version_message: 'Updates',
    };
    const messages: ChatMessage[] = [
      { role: 'assistant', text: 'Done', result },
    ];
    render(
      <AiChat
        messages={messages}
        aiLoading={false}
        currentFiles={mockFiles}
        onSend={mockOnSend}
        onSelectFile={mockOnSelectFile}
        prompt=""
        onPromptChange={mockOnPromptChange}
      />
    );
    const htmlLink = screen.getByText('HTML.html').closest('button');
    fireEvent.click(htmlLink!);
    expect(mockOnSelectFile).toHaveBeenCalledWith('HTML.html', result);
  });
});
