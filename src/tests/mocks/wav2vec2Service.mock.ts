/**
 * Mock implementation of Wav2Vec2Service for testing
 */
export const Wav2Vec2Service = jest.fn().mockImplementation(() => ({
  // Mock methods that might be called
  initialize: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
  checkHealth: jest.fn().mockReturnValue({ status: 'healthy' }),
  process: jest.fn().mockResolvedValue({
    success: true,
    data: { processed: true },
    metadata: {
      duration: 0,
      timestamp: Date.now()
    }
  })
}));

export const Wav2Vec2ServiceError = jest.fn().mockImplementation((message: string, code: string) => {
  const error = new Error(message);
  error.name = code;
  return error;
});
