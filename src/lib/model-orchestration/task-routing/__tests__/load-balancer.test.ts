import { LoadBalancer } from '../load-balancer';
import { Task, ModelCapabilities } from '../../types';
import { NodeHealth, LoadDistribution, TaskAllocation } from '../types';

describe('LoadBalancer', () => {
  let loadBalancer: LoadBalancer;
  let mockNodes: NodeHealth[];
  let mockTasks: Task[];

  beforeEach(() => {
    loadBalancer = new LoadBalancer({
      targetLoadVariance: 0.1,
      maxNodeUtilization: 0.8,
      spikeThreshold: 100,
      healthyResponseTime: 200,
      healthySuccessRate: 0.95,
      maxErrorRate: 0.05,
      rebalanceInterval: 60000,
      minRebalanceImprovement: 0.1
    });

    // Setup mock nodes
    mockNodes = [
      {
        nodeId: 'node1',
        status: 'healthy',
        availableResources: {
          memory: 1024,
          cpu: 1.0,
          tokens: 1000
        },
        metrics: {
          responseTime: 100,
          successRate: 0.98,
          efficiency: 0.9,
          errors: 0
        },
        errorRate: 0
      },
      {
        nodeId: 'node2',
        status: 'healthy',
        availableResources: {
          memory: 1024,
          cpu: 1.0,
          tokens: 1000
        },
        metrics: {
          responseTime: 150,
          successRate: 0.97,
          efficiency: 0.85,
          errors: 0
        },
        errorRate: 0
      }
    ];

    // Setup mock tasks
    mockTasks = [
      {
        id: 'task1',
        type: 'test',
        description: 'Test task 1',
        requirements: {
          primaryCapability: 'code',
          secondaryCapabilities: [],
          minCapabilityScores: new Map(),
          contextSize: 1000,
          priority: 'speed',
          resourceConstraints: {
            maxMemory: 512,
            maxCpu: 0.5,
            maxLatency: 200
          }
        },
        input: {}
      },
      {
        id: 'task2',
        type: 'test',
        description: 'Test task 2',
        requirements: {
          primaryCapability: 'reasoning',
          secondaryCapabilities: [],
          minCapabilityScores: new Map(),
          contextSize: 1000,
          priority: 'quality',
          resourceConstraints: {
            maxMemory: 512,
            maxCpu: 0.5,
            maxLatency: 200
          }
        },
        input: {}
      }
    ];
  });

  describe('distributeLoad', () => {
    it('should distribute tasks across available nodes', async () => {
      const distribution = await loadBalancer.distributeLoad(mockTasks, mockNodes);

      expect(distribution.nodeAllocations.size).toBe(mockNodes.length);
      expect(distribution.healthStatus).toHaveLength(mockNodes.length);

      // Check if tasks are distributed
      const totalAllocations = Array.from(distribution.nodeAllocations.values())
        .reduce((sum, allocations) => sum + allocations.length, 0);
      expect(totalAllocations).toBe(mockTasks.length);
    });

    it('should respect node health status', async () => {
      // Make one node unhealthy
      mockNodes[1].status = 'failed';

      const distribution = await loadBalancer.distributeLoad(mockTasks, mockNodes);

      // All tasks should be allocated to the healthy node
      const healthyNodeAllocations = distribution.nodeAllocations.get('node1') || [];
      expect(healthyNodeAllocations).toHaveLength(mockTasks.length);

      const failedNodeAllocations = distribution.nodeAllocations.get('node2') || [];
      expect(failedNodeAllocations).toHaveLength(0);
    });

    it('should respect resource constraints', async () => {
      // Add a task with high resource requirements
      mockTasks.push({
        id: 'task3',
        type: 'test',
        description: 'High resource task',
        requirements: {
          primaryCapability: 'code',
          secondaryCapabilities: [],
          minCapabilityScores: new Map(),
          contextSize: 1000,
          priority: 'speed',
          resourceConstraints: {
            maxMemory: 2048, // More than available
            maxCpu: 1.5,     // More than available
            maxLatency: 200
          }
        },
        input: {}
      });

      const distribution = await loadBalancer.distributeLoad(mockTasks, mockNodes);

      // The high resource task should not be allocated
      const totalAllocations = Array.from(distribution.nodeAllocations.values())
        .reduce((sum, allocations) => sum + allocations.length, 0);
      expect(totalAllocations).toBe(mockTasks.length - 1);
    });
  });

  describe('rebalance', () => {
    it('should rebalance load when variance is high', async () => {
      // Reset lastRebalance to allow rebalancing
      loadBalancer['lastRebalance'] = Date.now() - 120000; // 2 minutes ago
      
      // First distribute tasks unevenly by assigning all tasks to one node
      const distribution = loadBalancer['currentDistribution'];
      distribution.nodeAllocations.set('node1', [
        {
          taskId: 'task1',
          resources: { memory: 512, cpu: 0.5, tokens: 0 },
          priority: 'high',
          startTime: Date.now(),
          expectedDuration: 1000
        },
        {
          taskId: 'task2',
          resources: { memory: 512, cpu: 0.5, tokens: 0 },
          priority: 'normal',
          startTime: Date.now(),
          expectedDuration: 1000
        }
      ]);
      distribution.nodeAllocations.set('node2', []);
      distribution.healthStatus = mockNodes;
      
      // Calculate actual metrics based on current distribution
      const totalLoad = loadBalancer['calculateTotalLoad'](distribution.nodeAllocations.get('node1') || []);
      const avgLoad = totalLoad / 2; // 2 nodes
      const variance = Math.abs(totalLoad - avgLoad) / avgLoad;
      
      // Use actual metrics from distribution
      const metrics = {
        loadVariance: variance,
        maxUtilization: totalLoad,
        averageResponseTime: 150,
        errorRate: 0.01
      };

      const adjustment = await loadBalancer.rebalance(metrics);
      expect(adjustment.requiresChange).toBe(true);
      expect(adjustment.changes).toBeDefined();
      expect(adjustment.changes!.length).toBeGreaterThan(0);
    });

    it('should not rebalance if within variance threshold', async () => {
      const metrics = {
        loadVariance: 0.05, // Below threshold
        maxUtilization: 0.6,
        averageResponseTime: 100,
        errorRate: 0.01
      };

      const adjustment = await loadBalancer.rebalance(metrics);
      expect(adjustment.requiresChange).toBe(false);
      expect(adjustment.changes).toBeUndefined();
    });
  });

  describe('handleSpikes', () => {
    it('should create strategy for traffic spikes', async () => {
      const incoming = 200; // Above threshold
      const strategy = await loadBalancer.handleSpikes(incoming);

      expect(strategy.requiresAction).toBe(true);
      expect(strategy.recommendations).toBeDefined();
      expect(strategy.recommendations![0].action).toBe('scale');
      expect(strategy.recommendations![0].factor).toBe(2); // 200/100
    });

    it('should not create strategy for normal traffic', async () => {
      const incoming = 50; // Below threshold
      const strategy = await loadBalancer.handleSpikes(incoming);

      expect(strategy.requiresAction).toBe(false);
      expect(strategy.recommendations).toBeUndefined();
    });
  });
});