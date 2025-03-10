# Learning Profiles System Guide

## Overview

The Learning Profiles system enables tracking and visualization of how models learn and evolve through interactions. It maintains detailed profiles of each model's domain expertise, learning progression, and cross-domain connections.

## Features

- Domain-specific knowledge tracking
- Real-time learning visualization
- Cross-domain connection discovery
- Mastery level progression
- Automated learning state updates
- Interactive knowledge graph visualization

## Installation

1. Install required dependencies:

```bash
npm install react-force-graph-2d idb
```

2. Add the learning profiles system to your project:

```bash
cp -r src/lib/learning-profiles your-project/src/lib/
cp -r src/components/learning-profiles your-project/src/components/
```

## Basic Usage

### 1. Wrap Your LLM Provider

```typescript
import { createLearningEnhancedProvider } from './lib/llm/providers/learning-enhanced-provider';

// Create an enhanced provider that tracks learning
const provider = createLearningEnhancedProvider(
  baseProvider,
  'your-model-id',
  'code' // specialization
);
```

### 2. Add the Visualization Component

```typescript
import { ModelLearningView } from './components/learning-profiles/ModelLearningView';

function YourComponent() {
  return (
    <ModelLearningView 
      modelId="your-model-id"
      width={600}  // optional
      height={400} // optional
    />
  );
}
```

### 3. Use the Demo Component (Optional)

```typescript
import { LearningProfileDemo } from './components/learning-profiles/LearningProfileDemo';

function YourApp() {
  return (
    <LearningProfileDemo />
  );
}
```

## API Reference

### Learning Profile Types

```typescript
interface ModelLearningProfile {
  modelId: string;
  specialization: 'code' | 'visual' | 'audio' | 'general';
  learningState: {
    domains: Map<string, DomainKnowledge>;
    crossDomainConnections: Map<string, CrossDomainConnection>;
  };
  contextPreferences: ContextPreferences;
}

interface DomainKnowledge {
  confidence: number;     // 0-1 scale
  exposures: number;      // Times encountered
  lastAccessed: Date;
  relatedConcepts: Set<string>;
  mastery: 'novice' | 'competent' | 'expert';
}

interface CrossDomainConnection {
  from: string;
  to: string;
  strength: number;  // 0-1 scale
}
```

### Core Functions

```typescript
// Initialize a new learning profile
async function initializeProfile(
  modelId: string,
  specialization: ModelSpecialization
): Promise<ModelLearningProfile>;

// Record a learning interaction
async function recordInteraction(
  modelId: string,
  interaction: LearningInteraction
): Promise<ProfileUpdateResult>;

// Get analysis of model's understanding
async function getModelAnalysis(
  modelId: string,
  domain: string
): Promise<DomainAnalysis | null>;

// Visualize the learning profile
async function visualizeProfile(
  modelId: string
): Promise<ProfileVisualization | null>;
```

## Storage System

The learning profiles system uses IndexedDB for persistent storage:

- Profiles store: Contains model learning profiles
- Interactions store: Records learning interactions
- Automatic data persistence
- Import/export capabilities

```typescript
// Export learning data
const data = await exportLearningData();

// Import learning data
await importLearningData(data);
```

## Customization

### Custom Domain Detection

You can customize how domains are detected from interactions:

```typescript
function analyzeDomainFromPrompt(prompt: string): string {
  // Your custom domain detection logic
  return detectedDomain;
}
```

### Custom Success Analysis

Customize how interaction success is determined:

```typescript
function analyzeSuccess(response: string): boolean {
  // Your custom success analysis logic
  return wasSuccessful;
}
```

### Custom Visualization

The ModelLearningView component can be customized through props:

```typescript
<ModelLearningView
  modelId="your-model-id"
  width={600}
  height={400}
  customNodeColor={(node) => your_color_logic}
  customLinkWidth={(link) => your_width_logic}
/>
```

## Best Practices

1. **Profile Initialization**
   - Initialize profiles early in your application
   - Use meaningful model IDs
   - Choose appropriate specializations

2. **Interaction Recording**
   - Record all meaningful interactions
   - Include relevant metadata
   - Use appropriate complexity measures

3. **Visualization**
   - Place visualizations in appropriate UI contexts
   - Consider responsive sizing
   - Update in real-time when possible

4. **Storage Management**
   - Regularly backup learning data
   - Clean up unused profiles
   - Monitor storage usage

## Integration Examples

### With Chat Interface

```typescript
function ChatComponent() {
  const provider = useLearningEnhancedProvider();
  
  async function handleChat(message: string) {
    const response = await provider.chat({
      messages: [{ role: 'user', content: message }]
    });
    // Learning profile is automatically updated
    return response;
  }

  return (
    <div>
      <ChatInterface onSend={handleChat} />
      <ModelLearningView modelId={provider.modelId} />
    </div>
  );
}
```

### With Multiple Models

```typescript
function MultiModelSystem() {
  const providers = useMultiProviderSetup();
  
  return (
    <div>
      {providers.map(provider => (
        <div key={provider.modelId}>
          <h2>{provider.name}</h2>
          <ModelLearningView modelId={provider.modelId} />
        </div>
      ))}
    </div>
  );
}
```

## Troubleshooting

### Common Issues

1. **Profile Not Updating**
   - Verify provider initialization
   - Check interaction recording
   - Confirm storage permissions

2. **Visualization Not Showing**
   - Check model ID consistency
   - Verify data loading
   - Check browser console for errors

3. **Performance Issues**
   - Reduce visualization size
   - Limit stored interactions
   - Use appropriate batch sizes

### Debug Tools

```typescript
// Debug current profile state
const profile = await storage.loadProfile(modelId);
console.log('Current Profile:', profile);

// Debug interactions
const interactions = await storage.getInteractions(modelId);
console.log('Recent Interactions:', interactions);
```

## Migration Guide

When upgrading the learning profiles system:

1. Export existing data
2. Update system files
3. Run migration scripts if needed
4. Import previous data
5. Verify profile integrity

## Contributing

To contribute to the learning profiles system:

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Submit detailed PRs

## Related Documentation

- [TDR-006-MODEL-LEARNING-PROFILES](./TDR-006-MODEL-LEARNING-PROFILES.md)
- [ARCHITECTURE](./ARCHITECTURE.md)
- [SPECIALIZED-CONTEXT-MANAGEMENT](./TDR-005-SPECIALIZED-CONTEXT-MANAGEMENT.md)
