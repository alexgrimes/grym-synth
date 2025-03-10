import { 
  ModelLearningProfile,
  LearningInteraction,
  ProfileUpdateResult,
  MasteryLevel,
  CrossDomainConnection,
  DomainKnowledge,
  LearningProfileStorage
} from './types';

export class ModelLearningTracker {
  constructor(private storage: LearningProfileStorage) {}

  private calculateConfidence(
    currentConfidence: number,
    success: boolean,
    complexity: number = 0.5
  ): number {
    const impactFactor = 0.1 * complexity; // Higher complexity = bigger impact
    return success
      ? Math.min(1, currentConfidence + impactFactor)
      : Math.max(0, currentConfidence - impactFactor);
  }

  private calculateMastery(exposures: number, confidence: number): MasteryLevel {
    if (exposures < 5 || confidence < 0.3) return 'novice';
    if (exposures < 20 || confidence < 0.7) return 'competent';
    return 'expert';
  }

  private async findNewConnections(
    profile: ModelLearningProfile,
    interaction: LearningInteraction
  ): Promise<CrossDomainConnection[]> {
    const newConnections: CrossDomainConnection[] = [];
    const currentDomain = interaction.topic;
    const relatedTopics = interaction.metadata?.relatedTopics || [];

    for (const relatedTopic of relatedTopics) {
      if (relatedTopic === currentDomain) continue;

      const existingConnection = profile.learningState.crossDomainConnections.get(
        `${currentDomain}-${relatedTopic}`
      );

      const connectionStrength = this.calculateConnectionStrength(
        profile,
        currentDomain,
        relatedTopic,
        interaction.success
      );

      const connection: CrossDomainConnection = {
        from: currentDomain,
        to: relatedTopic,
        strength: existingConnection 
          ? (existingConnection.strength + connectionStrength) / 2
          : connectionStrength
      };

      profile.learningState.crossDomainConnections.set(
        `${currentDomain}-${relatedTopic}`,
        connection
      );
      newConnections.push(connection);
    }

    return newConnections;
  }

  private calculateConnectionStrength(
    profile: ModelLearningProfile,
    domain1: string,
    domain2: string,
    success: boolean
  ): number {
    const domain1Knowledge = profile.learningState.domains.get(domain1);
    const domain2Knowledge = profile.learningState.domains.get(domain2);

    if (!domain1Knowledge || !domain2Knowledge) return 0.1;

    const baseStrength = (
      domain1Knowledge.confidence + 
      domain2Knowledge.confidence
    ) / 2;

    return success ? baseStrength : baseStrength * 0.8;
  }

  async updateModelLearning(
    modelId: string,
    interaction: LearningInteraction
  ): Promise<ProfileUpdateResult> {
    let profile = await this.storage.loadProfile(modelId);
    
    if (!profile) {
      throw new Error(`No learning profile found for model: ${modelId}`);
    }

    const updates: ProfileUpdateResult = {
      profileId: modelId,
      updates: {
        domainsModified: [],
        connectionsFormed: [],
        masteryChanges: []
      },
      timestamp: new Date()
    };

    // Update domain knowledge
    let domain = profile.learningState.domains.get(interaction.topic);
    const previousMastery = domain?.mastery;

    if (!domain) {
      domain = {
        confidence: 0,
        exposures: 0,
        lastAccessed: new Date(),
        relatedConcepts: new Set(),
        mastery: 'novice'
      };
      profile.learningState.domains.set(interaction.topic, domain);
    }

    domain.exposures++;
    domain.lastAccessed = interaction.timestamp;
    domain.confidence = this.calculateConfidence(
      domain.confidence,
      interaction.success,
      interaction.metadata?.complexity
    );

    // Update mastery level if needed
    const newMastery = this.calculateMastery(domain.exposures, domain.confidence);
    if (previousMastery && previousMastery !== newMastery) {
      updates.updates.masteryChanges.push({
        domain: interaction.topic,
        previousLevel: previousMastery,
        newLevel: newMastery
      });
    }
    domain.mastery = newMastery;

    // Add any new related concepts
    if (interaction.metadata?.relatedTopics) {
      interaction.metadata.relatedTopics.forEach(concept => {
        domain?.relatedConcepts.add(concept);
      });
    }

    updates.updates.domainsModified.push(interaction.topic);

    // Find and update cross-domain connections
    const newConnections = await this.findNewConnections(profile, interaction);
    updates.updates.connectionsFormed = newConnections;

    // Save updated profile
    await this.storage.saveProfile(profile);
    await this.storage.saveInteraction(modelId, interaction);

    return updates;
  }

  async getModelAnalysis(modelId: string, domain: string) {
    const profile = await this.storage.loadProfile(modelId);
    if (!profile) return null;

    const domainKnowledge = profile.learningState.domains.get(domain);
    if (!domainKnowledge) return null;

    const connections = Array.from(profile.learningState.crossDomainConnections.values())
      .filter(conn => conn.from === domain || conn.to === domain);

    return {
      confidence: domainKnowledge.confidence,
      mastery: domainKnowledge.mastery,
      exposures: domainKnowledge.exposures,
      lastAccessed: domainKnowledge.lastAccessed,
      relatedConcepts: Array.from(domainKnowledge.relatedConcepts),
      connections: connections.map(conn => ({
        domain: conn.from === domain ? conn.to : conn.from,
        strength: conn.strength
      }))
    };
  }

  async visualizeProfile(modelId: string) {
    const profile = await this.storage.loadProfile(modelId);
    if (!profile) return null;

    const domains = Array.from(profile.learningState.domains.entries()).map(
      ([name, knowledge]) => ({
        name,
        confidence: knowledge.confidence,
        mastery: knowledge.mastery,
        connections: Array.from(profile.learningState.crossDomainConnections.values())
          .filter(conn => conn.from === name || conn.to === name)
          .map(conn => ({
            to: conn.from === name ? conn.to : conn.from,
            strength: conn.strength
          }))
      })
    );

    const interactions = await this.storage.getInteractions(modelId, 100);
    const timeline = interactions.map(interaction => ({
      timestamp: interaction.timestamp,
      domain: interaction.topic,
      event: 'interaction' as const,
      details: {
        success: interaction.success,
        complexity: interaction.metadata?.complexity
      }
    }));

    return { domains, timeline };
  }
}