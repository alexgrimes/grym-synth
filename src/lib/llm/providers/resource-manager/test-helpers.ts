import { Message } from '../types';

export const createTestMessage = (content: string): Message => ({
  content,
  role: 'user',
  timestamp: Date.now()
});