# Model Orchestration System

A flexible and extensible system for orchestrating multiple language models, optimizing their usage based on capabilities, and combining their results effectively.

## Features

- **Model Orchestration**: Coordinate multiple models for complex tasks
- **Task Analysis**: Automatically analyze tasks and determine optimal model combinations
- **Result Synthesis**: Combine and format results from multiple models
- **Provider Support**: Built-in support for Ollama and LM Studio
- **Extensible Design**: Easy to add new model providers and capabilities

## Components

### ModelOrchestrator

The main orchestrator that coordinates model interactions:

```typescript
const orchestrator = new ModelOrchestrator({
  models: ModelProviderFactory.createModelChain()
});

const result = await orchestrator.handleTask({
  type: 'code_generation',
  description: 'Create a React component',
  requirements: { language: 'typescript' }
});
```

### TaskAnalyzer

Analyzes tasks to determine requirements and optimal model combinations:

```typescript
const analyzer = new TaskAnalyzer(modelRegistry);
const requirements = await analyzer.analyze(task);
const modelChain = await analyzer.suggestModelChain(requirements);
```

### ResultSynthesizer

Combines and formats results from multiple models:

```typescript
const synthesizer = new ResultSynthesizer({
  validateResults: true,
  requireAllPhases: false,
  formatOptions: {
    indentSize: 2,
    maxLineLength: 80,
    includeMetadata: true
  }
});

const combinedResult = await synthesizer.combine(results);
const formattedResult = synthesizer.format(combinedResult);
```

## Model Providers

### OllamaProvider

Provider for Ollama models:

```typescript
const ollamaProvider = ModelProviderFactory.createDefaultProvider(
  'ollama',
  'deepseek-coder',
  'DeepSeek Coder',
  'deepseek-coder'
);
```

### LMStudioProvider

Provider for LM Studio models:

```typescript
const lmStudioProvider = ModelProviderFactory.createDefaultProvider(
  'lm-studio',
  'wizardcoder',
  'WizardCoder',
  'wizardcoder'
);
```

## Model Chains

### Default Chain

```typescript
const defaultChain = ModelProviderFactory.createModelChain();
// {
//   planner: DeepSeek R-1 (reasoning)
//   executor: DeepSeek Coder (code)
//   reviewer: Mistral (analysis)
//   context: Qwen (context management)
// }
```

### Specialized Chains

```typescript
// For code tasks
const codeChain = ModelProviderFactory.createSpecializedChain('code');
// {
//   planner: DeepSeek R-1
//   executor: CodeLlama
//   reviewer: WizardCoder
// }

// For planning tasks
const planningChain = ModelProviderFactory.createSpecializedChain('planning');
// {
//   planner: Neural Chat
//   executor: DeepSeek R-1
//   context: Qwen
// }

// For analysis tasks
const analysisChain = ModelProviderFactory.createSpecializedChain('analysis');
// {
//   planner: DeepSeek R-1
//   executor: Mistral
//   reviewer: Qwen
// }
```

## Configuration

### Provider Configuration

```typescript
const config: ModelProviderConfig = {
  type: 'ollama', // or 'lm-studio'
  id: 'my-model',
  name: 'My Model',
  modelName: 'model-name',
  endpoint: 'http://localhost:11434',
  contextWindow: 32768,
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048
};

const provider = ModelProviderFactory.createProvider(config);
```

### Default Configurations

```typescript
// Get default config for a provider type
const ollamaDefaults = ModelProviderFactory.getDefaultConfig('ollama');
const lmStudioDefaults = ModelProviderFactory.getDefaultConfig('lm-studio');
```

## Error Handling

The system uses the `ModelOrchestratorError` class for error handling:

```typescript
try {
  const result = await orchestrator.handleTask(task);
} catch (error) {
  if (error instanceof ModelOrchestratorError) {
    console.error(`Error type: ${error.code}`);
    console.error(`Error details: ${error.details}`);
  }
}
```

## Best Practices

1. **Task Analysis**: Always analyze tasks first to determine optimal model combinations
2. **Model Selection**: Use specialized chains for specific task types
3. **Result Validation**: Enable result validation in the synthesizer
4. **Error Handling**: Always handle potential errors using try/catch blocks
5. **Resource Management**: Consider context window sizes and resource constraints

## Examples

### Complete Task Flow

```typescript
// Create orchestrator with specialized chain
const orchestrator = new ModelOrchestrator({
  models: ModelProviderFactory.createSpecializedChain('code')
});

// Define task
const task = {
  type: 'code_generation',
  description: 'Create a TypeScript React component for a data table',
  requirements: {
    language: 'typescript',
    framework: 'react',
    features: ['sorting', 'filtering']
  }
};

try {
  // Handle task
  const result = await orchestrator.handleTask(task);
  
  // Format result
  const synthesizer = new ResultSynthesizer();
  const formatted = synthesizer.format(result);
  
  console.log(formatted.data);
} catch (error) {
  if (error instanceof ModelOrchestratorError) {
    console.error(`Task failed: ${error.message}`);
    console.error(`Error type: ${error.code}`);
    console.error(`Details:`, error.details);
  }
}
```

### Custom Model Chain

```typescript
// Create custom model chain
const customChain = {
  planner: ModelProviderFactory.createDefaultProvider(
    'ollama',
    'planner',
    'Planning Model',
    'deepseek-1b'
  ),
  executor: ModelProviderFactory.createDefaultProvider(
    'lm-studio',
    'executor',
    'Execution Model',
    'wizardcoder'
  ),
  reviewer: ModelProviderFactory.createDefaultProvider(
    'ollama',
    'reviewer',
    'Review Model',
    'mistral'
  )
};

// Create orchestrator with custom chain
const orchestrator = new ModelOrchestrator({ models: customChain });
```

## Testing

The system includes comprehensive tests for all components:

```bash
# Run all tests
npm test

# Run specific component tests
npm test -- model-orchestrator
npm test -- task-analyzer
npm test -- result-synthesizer
npm test -- providers
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License