import { ThemeNode, KnowledgeMap, KnowledgeMapNode, KnowledgeMapLink, KnowledgeMapCluster } from './types';

export class ThemeGraph {
  private nodes: Map<string, ThemeNode>;

  constructor() {
    this.nodes = new Map();
  }

  addNode(concept: string): void {
    if (!this.nodes.has(concept)) {
      this.nodes.set(concept, {
        id: concept,
        occurrences: 1,
        relatedConcepts: new Map(),
        firstSeen: new Date(),
        lastSeen: new Date(),
        conversations: new Set(),
        evolution: {
          branches: new Map(),
          depth: 1,
          breadth: 0
        }
      });
    }
  }

  updateNode(concept: string, conversationId: string, related: string[]): void {
    const node = this.nodes.get(concept);
    if (!node) {
      this.addNode(concept);
      return this.updateNode(concept, conversationId, related);
    }

    // Update basic metrics
    node.occurrences++;
    node.lastSeen = new Date();
    node.conversations.add(conversationId);

    // Update related concepts
    related.forEach(rel => {
      const current = node.relatedConcepts.get(rel) || 0;
      node.relatedConcepts.set(rel, current + 1);
    });

    // Update evolution metrics
    node.evolution.breadth = node.relatedConcepts.size;
    node.evolution.depth = Math.max(
      node.evolution.depth,
      Math.ceil(Math.log2(node.occurrences + 1))
    );

    // Add to branches if new relationships found
    const branchKey = new Date().toISOString().split('T')[0];
    node.evolution.branches.set(branchKey, related);
  }

  getNode(concept: string): ThemeNode | undefined {
    return this.nodes.get(concept);
  }

  getAllNodes(): ThemeNode[] {
    return Array.from(this.nodes.values());
  }

  findConnections(): Map<string, string[]> {
    const connections = new Map<string, string[]>();
    
    this.nodes.forEach((node, concept) => {
      const related = Array.from(node.relatedConcepts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([rel]) => rel);
      connections.set(concept, related);
    });

    return connections;
  }

  getEmergingThemes(): string[] {
    const recentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 1 week
    const emerging = Array.from(this.nodes.entries())
      .filter(([_, node]) => {
        const isRecent = node.firstSeen >= recentThreshold;
        const hasConnections = node.relatedConcepts.size >= 2;
        const isGrowing = node.evolution.depth >= 2;
        return isRecent && hasConnections && isGrowing;
      })
      .map(([concept]) => concept);

    return emerging;
  }

  createKnowledgeMap(): KnowledgeMap {
    const nodes: KnowledgeMapNode[] = [];
    const links: KnowledgeMapLink[] = [];
    const clusters: KnowledgeMapCluster[] = [];

    // Create nodes
    this.nodes.forEach((node, id) => {
      nodes.push({
        id,
        size: node.occurrences,
        depth: node.evolution.depth,
        connections: node.relatedConcepts.size
      });

      // Create links
      node.relatedConcepts.forEach((strength, target) => {
        if (this.nodes.has(target)) {
          links.push({
            source: id,
            target,
            strength: strength / Math.max(node.occurrences, 1)
          });
        }
      });
    });

    // Create clusters using simple grouping by connection density
    const grouped = this.groupByConnectivity(nodes, links);
    grouped.forEach((themes, id) => {
      clusters.push({
        id: `cluster-${id}`,
        themes,
        centroid: this.calculateCentroid(themes)
      });
    });

    return { nodes, links, clusters };
  }

  private groupByConnectivity(nodes: KnowledgeMapNode[], links: KnowledgeMapLink[]): Map<number, string[]> {
    const groups = new Map<number, string[]>();
    const visited = new Set<string>();

    const findConnectedNodes = (nodeId: string, groupId: number) => {
      if (visited.has(nodeId)) return;
      
      visited.add(nodeId);
      const group = groups.get(groupId) || [];
      group.push(nodeId);
      groups.set(groupId, group);

      links
        .filter(link => link.source === nodeId || link.target === nodeId)
        .forEach(link => {
          const nextNode = link.source === nodeId ? link.target : link.source;
          findConnectedNodes(nextNode as string, groupId);
        });
    };

    let groupId = 0;
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        findConnectedNodes(node.id, groupId++);
      }
    });

    return groups;
  }

  private calculateCentroid(themes: string[]): { x: number; y: number } {
    // Simple placeholder - in real implementation, would use force-directed layout positions
    return { x: Math.random() * 100, y: Math.random() * 100 };
  }

  pruneInactiveThemes(threshold: number): void {
    const cutoff = new Date(Date.now() - threshold * 24 * 60 * 60 * 1000);
    
    this.nodes.forEach((node, concept) => {
      if (node.lastSeen < cutoff && node.occurrences < 3) {
        this.nodes.delete(concept);
      }
    });
  }
}