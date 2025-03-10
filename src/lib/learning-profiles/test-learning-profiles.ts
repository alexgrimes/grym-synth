import {
  initializeProfile,
  recordInteraction,
  getModelAnalysis,
  visualizeProfile,
  deleteProfile
} from './index';

describe('Learning Profiles System', () => {
  const TEST_MODEL_ID = 'test-model-1';

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      await deleteProfile(TEST_MODEL_ID);
    } catch (e) {
      // Ignore if profile doesn't exist
    }
  });

  test('initializes a new model profile', async () => {
    const profile = await initializeProfile(TEST_MODEL_ID, 'code');
    expect(profile.modelId).toBe(TEST_MODEL_ID);
    expect(profile.specialization).toBe('code');
    expect(profile.learningState.domains.size).toBe(0);
  });

  test('records learning interactions and updates domain knowledge', async () => {
    await initializeProfile(TEST_MODEL_ID, 'code');

    const interaction = {
      topic: 'typescript',
      context: 'Type system fundamentals',
      response: 'Detailed explanation of TypeScript types',
      success: true,
      metadata: {
        relatedTopics: ['javascript', 'type-safety'],
        complexity: 0.7
      }
    };

    const result = await recordInteraction(TEST_MODEL_ID, interaction);
    
    expect(result.profileId).toBe(TEST_MODEL_ID);
    expect(result.updates.domainsModified).toContain('typescript');
    expect(result.updates.connectionsFormed.length).toBeGreaterThan(0);
  });

  test('tracks domain mastery progression', async () => {
    await initializeProfile(TEST_MODEL_ID, 'code');

    // Simulate multiple successful interactions
    for (let i = 0; i < 10; i++) {
      await recordInteraction(TEST_MODEL_ID, {
        topic: 'typescript',
        context: `Interaction ${i}`,
        response: 'Successful response',
        success: true,
        metadata: {
          complexity: 0.5 + (i * 0.05) // Gradually increase complexity
        }
      });
    }

    const analysis = await getModelAnalysis(TEST_MODEL_ID, 'typescript');
    expect(analysis).toBeTruthy();
    expect(analysis?.confidence).toBeGreaterThan(0.5);
    expect(['competent', 'expert']).toContain(analysis?.mastery);
  });

  test('forms cross-domain connections', async () => {
    await initializeProfile(TEST_MODEL_ID, 'code');

    // Record interactions with related topics
    await recordInteraction(TEST_MODEL_ID, {
      topic: 'react',
      context: 'Component development',
      response: 'React component explanation',
      success: true,
      metadata: {
        relatedTopics: ['typescript', 'jsx']
      }
    });

    await recordInteraction(TEST_MODEL_ID, {
      topic: 'typescript',
      context: 'Type-safe components',
      response: 'TypeScript in React',
      success: true,
      metadata: {
        relatedTopics: ['react', 'type-safety']
      }
    });

    const visualization = await visualizeProfile(TEST_MODEL_ID);
    expect(visualization).toBeTruthy();
    
    const reactDomain = visualization?.domains.find(d => d.name === 'react');
    expect(reactDomain).toBeTruthy();
    expect(reactDomain?.connections.some(c => c.to === 'typescript')).toBe(true);
  });

  test('adjusts confidence based on success/failure', async () => {
    await initializeProfile(TEST_MODEL_ID, 'code');

    // Successful interaction
    await recordInteraction(TEST_MODEL_ID, {
      topic: 'algorithms',
      context: 'Sorting algorithms',
      response: 'Correct explanation',
      success: true,
      metadata: { complexity: 0.6 }
    });

    let analysis = await getModelAnalysis(TEST_MODEL_ID, 'algorithms');
    const initialConfidence = analysis?.confidence || 0;

    // Failed interaction
    await recordInteraction(TEST_MODEL_ID, {
      topic: 'algorithms',
      context: 'Complex graph algorithms',
      response: 'Incorrect explanation',
      success: false,
      metadata: { complexity: 0.8 }
    });

    analysis = await getModelAnalysis(TEST_MODEL_ID, 'algorithms');
    expect(analysis?.confidence).toBeLessThan(initialConfidence);
  });

  test('maintains learning timeline', async () => {
    await initializeProfile(TEST_MODEL_ID, 'code');

    const interactions = [
      {
        topic: 'javascript',
        context: 'Basic concepts',
        response: 'Good explanation',
        success: true
      },
      {
        topic: 'javascript',
        context: 'Advanced patterns',
        response: 'Detailed response',
        success: true
      }
    ];

    for (const interaction of interactions) {
      await recordInteraction(TEST_MODEL_ID, interaction);
    }

    const visualization = await visualizeProfile(TEST_MODEL_ID);
    expect(visualization?.timeline.length).toBe(2);
    expect(visualization?.timeline[0].domain).toBe('javascript');
    expect(visualization?.timeline[0].event).toBe('interaction');
  });
});