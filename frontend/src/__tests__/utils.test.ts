describe('Script ID extraction', () => {
  const extractScriptId = (input: string): string => {
    const match = input.match(/\/projects\/([a-zA-Z0-9_-]{20,})/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return input.trim();
    return '';
  };

  it('extracts script ID from a full URL', () => {
    const url = 'https://script.google.com/home/projects/AbCdEfGhIjKlMnOpQrSt/edit';
    expect(extractScriptId(url)).toBe('AbCdEfGhIjKlMnOpQrSt');
  });

  it('returns raw ID if already an ID', () => {
    expect(extractScriptId('AbCdEfGhIjKlMnOpQrSt')).toBe('AbCdEfGhIjKlMnOpQrSt');
  });

  it('returns empty string for short/invalid input', () => {
    expect(extractScriptId('short')).toBe('');
    expect(extractScriptId('')).toBe('');
  });
});

describe('File type inference', () => {
  const inferFileType = (filename: string): string => {
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.json')) return 'json';
    return 'server_js';
  };

  it('returns html for .html files', () => {
    expect(inferFileType('index.html')).toBe('html');
  });

  it('returns json for .json files', () => {
    expect(inferFileType('appsscript.json')).toBe('json');
  });

  it('returns server_js for .js and .gs files', () => {
    expect(inferFileType('Code.js')).toBe('server_js');
    expect(inferFileType('Utils.gs')).toBe('server_js');
  });
});
