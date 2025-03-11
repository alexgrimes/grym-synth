import React, { useState, useRef, useEffect } from 'react';
import { LLMOrchestrator, LLMResponse, LLMType } from '../../services/llm/LLMOrchestrator';
import './EnhancedChatPanel.css';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'system' | 'llm';
  llmType?: LLMType;
  confidence?: number;
  relatedParameters?: string[];
  suggestedParameters?: Record<string, number>;
  timestamp: number;
}

interface EnhancedChatPanelProps {
  mode: string;
  audioEngine: any;
  onParameterSuggestion: (params: Record<string, number>) => void;
  onParameterHighlight?: (paramIds: string[]) => void;
}

export const EnhancedChatPanel: React.FC<EnhancedChatPanelProps> = ({
  mode,
  audioEngine,
  onParameterSuggestion,
  onParameterHighlight
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      content: `Welcome to GrymSynth! You're in ${mode} mode. How can I help you today?`,
      sender: 'system',
      timestamp: Date.now()
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeLLM, setActiveLLM] = useState<LLMType | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const orchestrator = useRef<LLMOrchestrator>(new LLMOrchestrator());

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Update welcome message when mode changes
  useEffect(() => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages[0]?.sender === 'system') {
        newMessages[0] = {
          ...newMessages[0],
          content: `Welcome to GrymSynth! You're in ${mode} mode. How can I help you today?`,
          timestamp: Date.now()
        };
      }
      return newMessages;
    });
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);
    setActiveLLM('reasoning');

    try {
      // Determine if user is targeting a specific LLM
      const targetLLM = extractTargetLLM(inputValue);
      const response = await orchestrator.current.processUserMessage(inputValue, targetLLM);

      // Create LLM response message
      const llmMessage: Message = {
        id: response.id,
        content: response.content,
        sender: 'llm',
        llmType: response.llmType,
        confidence: response.confidence,
        relatedParameters: response.relatedParameters,
        suggestedParameters: response.suggestedParameters,
        timestamp: response.timestamp
      };

      setMessages(prev => [...prev, llmMessage]);
      setActiveLLM(null);

      // Handle parameter suggestions
      if (response.suggestedParameters && Object.keys(response.suggestedParameters).length > 0) {
        onParameterSuggestion(response.suggestedParameters);
      }

      // Highlight related parameters
      if (response.relatedParameters && response.relatedParameters.length > 0 && onParameterHighlight) {
        onParameterHighlight(response.relatedParameters);
      }

    } catch (error) {
      console.error('Error processing message:', error);

      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        sender: 'system',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleClearConversation = () => {
    setMessages([
      {
        id: Date.now().toString(),
        content: `Starting a new conversation. You're in ${mode} mode.`,
        sender: 'system',
        timestamp: Date.now()
      }
    ]);
    orchestrator.current.clearHistory();
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const renderMessage = (message: Message) => {
    return (
      <div
        key={message.id}
        className={`chat-message ${message.sender} ${message.llmType || ''}`}
      >
        {message.sender === 'llm' && message.llmType && (
          <div className="llm-indicator">
            <div className={`llm-badge ${message.llmType}`}>
              {getLLMDisplayName(message.llmType)}
            </div>
            {message.confidence !== undefined && (
              <div
                className="confidence-meter"
                style={{
                  '--confidence': `${message.confidence * 100}%`,
                  '--confidence-color': getConfidenceColor(message.confidence)
                } as React.CSSProperties}
              >
                <div className="confidence-bar"></div>
                <div className="confidence-text">{Math.round(message.confidence * 100)}%</div>
              </div>
            )}
          </div>
        )}

        <div className="message-content">{message.content}</div>

        {message.relatedParameters && message.relatedParameters.length > 0 && (
          <div className="related-parameters">
            <span className="related-label">Related parameters:</span>
            {message.relatedParameters.map(param => (
              <span
                key={param}
                className="parameter-tag"
                onClick={() => onParameterHighlight?.([param])}
              >
                {formatParameterName(param)}
              </span>
            ))}
          </div>
        )}

        {message.suggestedParameters && Object.keys(message.suggestedParameters).length > 0 && (
          <div className="suggested-parameters">
            <div className="suggestion-header">
              <span>Suggested Parameters:</span>
              <button
                className="apply-all-button"
                onClick={() => onParameterSuggestion(message.suggestedParameters!)}
              >
                Apply All
              </button>
            </div>
            <div className="parameter-suggestions">
              {Object.entries(message.suggestedParameters).map(([param, value]) => (
                <div key={param} className="parameter-suggestion">
                  <span className="param-name">{formatParameterName(param)}</span>
                  <div className="param-value-container">
                    <div
                      className="param-value-bar"
                      style={{ width: `${value * 100}%` }}
                    ></div>
                    <span className="param-value">{value.toFixed(2)}</span>
                  </div>
                  <button
                    className="apply-param-button"
                    onClick={() => onParameterSuggestion({ [param]: value })}
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="message-timestamp">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    );
  };

  return (
    <div className={`enhanced-chat-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="chat-header" onClick={toggleExpanded}>
        <div className="chat-title">
          <span>Conversation</span>
          {activeLLM && (
            <div className="processing-indicator">
              <div className="processing-spinner"></div>
              <span>Processing with {getLLMDisplayName(activeLLM)}</span>
            </div>
          )}
        </div>
        <div className="chat-controls">
          <button className="clear-chat-button" onClick={handleClearConversation}>
            Clear
          </button>
          <button className="toggle-chat-button">
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="messages-container">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef}></div>
          </div>

          <form className="chat-input-form" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about sound in ${mode} mode...`}
              disabled={isProcessing}
              rows={1}
              className="chat-input"
            />
            <button
              type="submit"
              className="send-button"
              disabled={isProcessing || !inputValue.trim()}
            >
              {isProcessing ? '...' : 'Send'}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

// Helper functions
function getLLMDisplayName(llmType: LLMType): string {
  switch (llmType) {
    case 'reasoning': return 'Reasoning LLM';
    case 'audio': return 'Audio LDM';
    case 'parameter': return 'Parameter LLM';
    case 'visual': return 'Visual LLM';
    default: return 'LLM';
  }
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatParameterName(param: string): string {
  return param
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return '#4CAF50';
  if (confidence >= 0.5) return '#FFC107';
  return '#F44336';
}

function extractTargetLLM(message: string): LLMType | undefined {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.startsWith('@audio') || lowerMessage.includes('hey audio')) {
    return 'audio';
  } else if (lowerMessage.startsWith('@parameter') || lowerMessage.includes('hey parameter')) {
    return 'parameter';
  } else if (lowerMessage.startsWith('@visual') || lowerMessage.includes('hey visual')) {
    return 'visual';
  } else if (lowerMessage.startsWith('@reasoning') || lowerMessage.includes('hey reasoning')) {
    return 'reasoning';
  }

  return undefined;
}
