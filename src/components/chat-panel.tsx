import React, { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { storage } from '../lib/storage/db';
import { ollamaClient } from '../lib/ollama/client';
import type { Message } from '../lib/storage/types';
import { ContextManager } from '../lib/context/context-manager';
import { errorHandler } from '../lib/error-handler';
import type { RecoveryStatus } from '../lib/error-handler';

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const contextManager = useRef<ContextManager>(new ContextManager());

  // Initialize conversation if needed
  useEffect(() => {
    async function init() {
      if (!conversationId) {
        const newId = await storage.createConversation('New Chat', {
          responder: 'deepseek-r1:14b',
          listener: 'qwen2.5-coder'
        });
        setConversationId(newId);
      }
      
      // Load existing messages
      if (conversationId) {
        const existingMessages = await storage.getMessages(conversationId);
        setMessages(existingMessages);
        
        // Initialize context with existing messages
        for (const message of existingMessages) {
          await contextManager.current.updateContext(
            message,
            message.role === 'assistant' ? message.content : ''
          );
        }
      }
    }
    init();
  }, [conversationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading || !conversationId) return;

    setIsLoading(true);
    try {
      // Save user message
      const userMessage: Message = {
        id: nanoid(),
        content: input,
        role: 'user',
        timestamp: Date.now(),
        conversationId
      };
      await storage.saveMessage(userMessage);
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      // Get current context for the chat
      const context = contextManager.current.getContext();
      const contextMessages = [
        // Add summaries as system messages
        ...context.summaries.map(summary => ({
          role: 'system' as const,
          content: `Previous conversation summary: ${summary}`
        })),
        // Add recent messages
        ...context.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        // Add current message
        { role: 'user' as const, content: input }
      ];

      // Get model response with context
      const response = await ollamaClient.chat({
        messages: contextMessages,
        model: 'deepseek-r1:14b'
      });
      
      // Save model response
      const assistantMessage: Message = {
        id: nanoid(),
        content: response.content,
        role: 'assistant',
        timestamp: Date.now(),
        conversationId,
        model: 'deepseek-r1:14b'
      };
      await storage.saveMessage(assistantMessage);
      setMessages(prev => [...prev, assistantMessage]);

      // Update context with new messages
      const updatedContext = await contextManager.current.updateContext(
        userMessage,
        response.content
      );

      // Update model context in storage
      await storage.updateModelContext(conversationId, 'deepseek-r1:14b', {
        understanding: updatedContext.summaries.join('\n'),
        messagesSeen: messages.map(m => parseInt(m.id)).filter(id => !isNaN(id))
      });
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4">
        {messages.map(message => (
          <div key={message.id} className={`mb-4 ${
            message.role === 'user' ? 'text-right' : 'text-left'
          }`}>
            <div className={`inline-block p-3 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100'
            }`}>
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
}
