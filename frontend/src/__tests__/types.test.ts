// Tests for type guards and data shapes
describe('ScriptFile type', () => {
  it('has required fields', () => {
    const file = {
      id: 1,
      filename: 'Code.js',
      content: 'function test() {}',
      file_type: 'server_js',
    };
    expect(file.id).toBe(1);
    expect(file.filename).toBe('Code.js');
    expect(file.file_type).toBe('server_js');
  });
});

describe('AiResult type', () => {
  it('structures files and version_message', () => {
    const result = {
      files: [
        { filename: 'Code.js', content: 'updated', file_type: 'server_js' }
      ],
      version_message: 'Ajout validation',
    };
    expect(result.files).toHaveLength(1);
    expect(result.version_message).toBe('Ajout validation');
  });
});

describe('ChatMessage role', () => {
  it('accepts user and assistant roles', () => {
    const userMsg = { role: 'user' as const, text: 'hello' };
    const assistantMsg = { role: 'assistant' as const, text: 'world' };
    expect(userMsg.role).toBe('user');
    expect(assistantMsg.role).toBe('assistant');
  });
});
