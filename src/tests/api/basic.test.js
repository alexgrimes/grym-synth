const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

describe('API Basic Tests', () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  test('GET /health should return system status', async () => {
    const mockResponse = {
      status: 'ok',
      version: '1.0.0',
      timestamp: '2025-03-12T06:28:00Z'
    };

    mock.onGet('/health').reply(200, mockResponse);

    const response = await axios.get('/health');
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('ok');
    expect(response.data.version).toBe('1.0.0');
    expect(response.data.timestamp).toBe('2025-03-12T06:28:00Z');
  });

  test('Error handling - 404 Not Found', async () => {
    mock.onGet('/nonexistent').reply(404, {
      error: 'Not Found',
      message: 'The requested resource does not exist'
    });

    try {
      await axios.get('/nonexistent');
      fail('Expected request to fail');
    } catch (error) {
      expect(error.response.status).toBe(404);
      expect(error.response.data.error).toBe('Not Found');
    }
  });

  test('Error handling - Network Error', async () => {
    mock.onGet('/test').networkError();

    try {
      await axios.get('/test');
      fail('Expected request to fail');
    } catch (error) {
      expect(error.message).toContain('Network Error');
    }
  });
});
