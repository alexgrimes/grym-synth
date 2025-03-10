# Research Assistant Implementation Guide

This guide demonstrates how to implement and use the Research Assistant system in your application.

## Basic Implementation

1. First, set up your LLM provider:

```typescript
import { LLMProvider } from '@/lib/llm/types';
import { OllamaProvider } from '@/lib/llm/providers/ollama-provider';

const llmProvider = new OllamaProvider({
  endpoint: 'http://localhost:11434',
  modelName: 'deepseek-coder'
});
```

2. Wrap your application with the Research Provider:

```typescript
// pages/_app.tsx
import { ResearchProvider } from '@/contexts/research-context';

function MyApp({ Component, pageProps }) {
  return (
    <ResearchProvider llmProvider={llmProvider}>
      <Component {...pageProps} />
    </ResearchProvider>
  );
}
```

3. Create a research page:

```typescript
// pages/research.tsx
import { useResearch } from '@/contexts/research-context';
import { ResearchPanel } from '@/components/research/research-panel';
import { useState } from 'react';

export default function ResearchPage() {
  const { analyzeConversation } = useResearch();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async (content: string) => {
    setIsAnalyzing(true);
    try {
      await analyzeConversation(content, 'conversation-' + Date.now());
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Research Assistant</h1>
      
      {/* Input for new content */}
      <div className="mb-4">
        <textarea
          className="w-full p-2 border rounded"
          placeholder="Enter conversation content..."
          onChange={(e) => handleAnalyze(e.target.value)}
        />
      </div>

      {/* Research visualization and insights */}
      <ResearchPanel 
        width={900} 
        height={600}
        onNodeClick={(node) => {
          console.log('Selected theme:', node.id);
        }}
      />
    </div>
  );
}
```

## Advanced Usage

### Custom Theme Visualization

You can customize the appearance of the knowledge map:

```typescript
import { KnowledgeMapView } from '@/components/research/knowledge-map';
import { KnowledgeMapNode } from '@/lib/research-assistant/types';

// Custom color scheme based on theme depth
const getNodeColor = (node: KnowledgeMapNode) => {
  const colors = [
    '#60A5FA', // blue-400
    '#34D399', // emerald-400
    '#F472B6', // pink-400
    '#A78BFA', // violet-400
    '#FBBF24', // amber-400
  ];
  return colors[Math.min(node.depth - 1, colors.length - 1)];
};

// Custom node size based on connections
const getNodeSize = (node: KnowledgeMapNode) => {
  return Math.sqrt(node.connections) * 10;
};

function CustomResearchView() {
  return (
    <KnowledgeMapView
      data={visualizationData}
      width={900}
      height={600}
      nodeColor={getNodeColor}
      nodeSize={getNodeSize}
      onNodeClick={(node) => {
        // Handle node selection
      }}
    />
  );
}
```

### Handling Feedback

Implement feedback handling to improve theme detection:

```typescript
function ResearchFeedback() {
  const { incorporateFeedback } = useResearch();

  const handleFeedback = (insightId: string, isAccurate: boolean) => {
    incorporateFeedback({
      themeAccuracy: isAccurate,
      missingConnections: [],
      userInsights: `Feedback for insight: ${insightId}`
    });
  };

  return (
    <div>
      {insights.map((insight) => (
        <div key={insight.title} className="p-4 border rounded mb-2">
          <h3>{insight.title}</h3>
          <p>{insight.description}</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleFeedback(insight.title, true)}
              className="px-2 py-1 bg-green-100 text-green-800 rounded"
            >
              Accurate
            </button>
            <button
              onClick={() => handleFeedback(insight.title, false)}
              className="px-2 py-1 bg-red-100 text-red-800 rounded"
            >
              Inaccurate
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Integration with Chat

Integrate the Research Assistant with chat functionality:

```typescript
function ChatWithResearch() {
  const { analyzeConversation } = useResearch();
  const [messages, setMessages] = useState<Message[]>([]);

  const handleNewMessage = async (content: string) => {
    // Add message to chat
    const newMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now()
    };
    setMessages([...messages, newMessage]);

    // Analyze conversation
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    await analyzeConversation(conversationText, 'chat-' + Date.now());
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        {/* Chat interface */}
        <ChatPanel
          messages={messages}
          onSendMessage={handleNewMessage}
        />
      </div>
      <div>
        {/* Research visualization */}
        <ResearchPanel
          width={450}
          height={600}
        />
      </div>
    </div>
  );
}
```

## Testing

The Research Assistant includes comprehensive tests. Here's how to test your implementations:

```typescript
import { ResearchAssistant } from '@/lib/research-assistant/research-assistant';
import { MockLLMProvider } from '@/lib/research-assistant/test-research-assistant';

describe('Your Research Implementation', () => {
  let assistant: ResearchAssistant;
  let mockProvider: MockLLMProvider;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    assistant = new ResearchAssistant(mockProvider);
  });

  it('should analyze conversations', async () => {
    const result = await assistant.analyzeConversation(
      'Your test conversation',
      'test-convo-1'
    );

    expect(result.analysis).toBeDefined();
    expect(result.visualization.nodes.length).toBeGreaterThan(0);
  });
});
```

## Best Practices

1. **Performance**
   - Use debouncing for real-time analysis
   - Implement pagination for large datasets
   - Cache visualization data when possible

2. **User Experience**
   - Show loading states during analysis
   - Provide clear feedback mechanisms
   - Implement smooth transitions for visualization updates

3. **Error Handling**
   - Handle LLM provider errors gracefully
   - Provide fallback visualizations
   - Log errors for debugging

4. **Accessibility**
   - Add ARIA labels to interactive elements
   - Provide keyboard navigation
   - Include alternative text for visualizations
