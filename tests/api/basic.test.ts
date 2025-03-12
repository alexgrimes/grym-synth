import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('API Basic Tests', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  test('GET /health should return system status', async () => {
    const expectedResponse = {
      status: 'ok',
      version: '1.0.0',
      timestamp: expect.any(String)
    };

    mock.onGet('/health').reply(200, expectedResponse);

    const response = await axios.get('/health');
    expect(response.status).toBe(200);
    expect(response.data).toMatchObject(expectedResponse);
  });

  test('Error handling - 404 Not Found', async () => {
    mock.onGet('/nonexistent').reply(404, {
      error: 'Not Found',
      message: 'The requested resource does not exist'
    });

    try {
      await axios.get('/nonexistent');
      fail('Expected request to fail');
    } catch (error: any) {
      expect(error.response.status).toBe(404);
      expect(error.response.data.error).toBe('Not Found');
    }
  });

  test('Error handling - Network Error', async () => {
    mock.onGet('/test').networkError();

    try {
      await axios.get('/test');
      fail('Expected request to fail');
    } catch (error: any) {
      expect(error.message).toContain('Network Error');
    }
  });
});
