import { DynamicThemeDiscovery } from './dynamic-theme-discovery';

async function testThemeDiscovery() {
  // Initialize the theme discovery system
  const themeDiscovery = new DynamicThemeDiscovery('llama2');

  // Example conversations about audio production
  const conversations = [
    {
      id: 'conv1',
      content: `
        User: I'm trying to understand compression in audio production.
        Assistant: Compression is a key concept in audio processing. It helps control dynamic range by reducing the volume of loud sounds and amplifying quiet ones. This is crucial for achieving consistent levels in your mix.
        User: How does that relate to limiting?
        Assistant: Limiting is actually an extreme form of compression. While compressors gradually reduce volume above a threshold, limiters create a "ceiling" that the audio cannot exceed. This is often used in mastering to prevent clipping.
      `
    },
    {
      id: 'conv2',
      content: `
        User: What's the difference between reverb and delay?
        Assistant: Reverb simulates the natural reflections of sound in a space, creating a sense of environment. Delay, on the other hand, creates distinct repetitions of the sound. While both are time-based effects, they serve different purposes in creating space in your mix.
        User: Can you combine them?
        Assistant: Yes! Many producers use both reverb and delay together. For example, you might use a short delay to create width, then add reverb to place the sound in a space. This technique is especially popular in electronic and ambient music.
      `
    },
    {
      id: 'conv3',
      content: `
        User: How do I approach EQ in mixing?
        Assistant: EQ (equalization) is about balancing frequencies in your mix. Start by identifying problem frequencies - areas where instruments mask each other. You might cut competing frequencies in less important elements to make room for key elements.
        User: What about the low end?
        Assistant: The low end is crucial in mixing. It's important to manage bass frequencies carefully as they contain a lot of energy. Usually, you'll want to high-pass filter non-bass elements to prevent low-end buildup, and carefully shape the bass and kick to work together.
      `
    }
  ];

  try {
    // Analyze each conversation individually
    console.log('\nAnalyzing conversations individually:');
    for (const conv of conversations) {
      const result = await themeDiscovery.analyzeConversation(conv.content, conv.id);
      console.log(`\nResults for conversation ${conv.id}:`);
      console.log('New themes:', result.newThemes);
      console.log('Evolved themes:', Array.from(result.evolvedThemes.entries()));
      console.log('Connections:', Array.from(result.connections.entries()));
    }

    // Analyze all conversations in batch
    console.log('\nAnalyzing all conversations in batch:');
    const batchResult = await themeDiscovery.batchAnalyzeConversations(conversations);
    console.log('\nBatch analysis results:');
    console.log('New themes:', batchResult.newThemes);
    console.log('Evolved themes:', Array.from(batchResult.evolvedThemes.entries()));
    console.log('Connections:', Array.from(batchResult.connections.entries()));

    // Get patterns over time
    const patterns = themeDiscovery.findPatterns();
    console.log('\nIdentified patterns:');
    patterns.forEach(pattern => {
      console.log(`\nTheme: ${pattern.theme}`);
      console.log(`Confidence: ${pattern.confidence}`);
      console.log(`Related themes: ${pattern.relatedThemes.join(', ')}`);
      console.log('Metrics:', pattern.metrics);
    });

    // Get overall discovery status
    const status = themeDiscovery.getDiscoveryStatus();
    console.log('\nOverall discovery status:');
    console.log(`Total themes: ${status.totalThemes}`);
    console.log(`Active themes: ${status.activeThemes.join(', ')}`);
    console.log('\nTop connections:');
    status.topConnections.forEach(([theme, related]) => {
      console.log(`${theme} -> ${related.join(', ')}`);
    });

  } catch (error) {
    console.error('Error in theme discovery test:', error);
  }
}

// Run the test
testThemeDiscovery().catch(console.error);