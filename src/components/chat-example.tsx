import { useState } from 'react';
import { DualModelChat, ChatRole } from '../lib/ollama/dual-model-chat';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function ChatExample() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chat = new DualModelChat();

  const handleSubmit = async (role: ChatRole) => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    setResponse('');
    
    try {
      // Example of streaming response
      await chat.getStreamingResponse(
        message,
        role,
        (chunk) => {
          setResponse(prev => prev + chunk);
        },
        { temperature: 0.7 }
      );
    } catch (error) {
      console.error('Chat error:', error);
      setResponse('Error: Failed to get response from the model.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message..."
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit('developer');
            }
          }}
        />
        <Button 
          onClick={() => handleSubmit('architect')}
          disabled={isLoading}
        >
          Ask Architect
        </Button>
        <Button 
          onClick={() => handleSubmit('developer')}
          disabled={isLoading}
        >
          Ask Developer
        </Button>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-500">
          Thinking...
        </div>
      )}

      {response && (
        <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4">
          {response}
        </div>
      )}
    </div>
  );
}
