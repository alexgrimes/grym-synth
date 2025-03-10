/**
 * Mock service implementations for testing
 */
export const createMockServices = () => {
  return {
    configService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      getConfig: jest.fn().mockReturnValue({})
    },
    loggingService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    },
    errorHandlingService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      handleError: jest.fn().mockResolvedValue(undefined),
      registerErrorHandler: jest.fn()
    },
    stateManager: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      getState: jest.fn().mockReturnValue({}),
      setState: jest.fn().mockResolvedValue(undefined)
    },
    featureMemoryService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      storeFeature: jest.fn().mockResolvedValue(undefined),
      retrieveFeature: jest.fn().mockResolvedValue({})
    },
    resourceManager: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      allocateResource: jest.fn().mockResolvedValue({}),
      releaseResource: jest.fn().mockResolvedValue(undefined)
    },
    memoryManager: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      getMemoryUsage: jest.fn().mockReturnValue({
        heapUsed: 100000000,
        heapTotal: 200000000,
        external: 50000000
      })
    },
    processingPoolManager: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      getPool: jest.fn().mockReturnValue({}),
      submitTask: jest.fn().mockResolvedValue({})
    },
    priorityManager: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      getPriority: jest.fn().mockReturnValue(1),
      setPriority: jest.fn().mockResolvedValue(undefined)
    },
    loadBalancer: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      getNextService: jest.fn().mockReturnValue('mockService'),
      registerService: jest.fn()
    },
    audioProcessingService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      processAudio: jest.fn().mockResolvedValue({ success: true, data: {} }),
      getMetrics: jest.fn().mockReturnValue({
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        memoryUsage: {
          heapUsed: 0,
          heapTotal: 0,
          external: 0
        },
        resourceUsage: {
          memory: 0,
          cpu: 0
        }
      }),
      executeTask: jest.fn().mockResolvedValue({
        success: true,
        data: {},
        metadata: {
          duration: 100,
          timestamp: Date.now()
        }
      }),
      isInitialized: jest.fn().mockReturnValue(true)
    },
    patternRecognitionService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      recognizePatterns: jest.fn().mockResolvedValue({ patterns: [] }),
      getMetrics: jest.fn().mockReturnValue({
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        memoryUsage: {
          heapUsed: 0,
          heapTotal: 0,
          external: 0
        },
        resourceUsage: {
          memory: 0,
          cpu: 0
        }
      }),
      executeTask: jest.fn().mockResolvedValue({
        success: true,
        data: {},
        metadata: {
          duration: 100,
          timestamp: Date.now()
        }
      }),
      isInitialized: jest.fn().mockReturnValue(true)
    },
    audioLDMService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      generateAudio: jest.fn().mockResolvedValue({ audioBuffer: new ArrayBuffer(1000) }),
      getMetrics: jest.fn().mockReturnValue({
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        memoryUsage: {
          heapUsed: 0,
          heapTotal: 0,
          external: 0
        },
        resourceUsage: {
          memory: 0,
          cpu: 0
        }
      }),
      executeTask: jest.fn().mockResolvedValue({
        success: true,
        data: {},
        metadata: {
          duration: 100,
          timestamp: Date.now()
        }
      }),
      isInitialized: jest.fn().mockReturnValue(true)
    },
    gamaService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      processAudio: jest.fn().mockResolvedValue({ success: true, data: {} }),
      getMetrics: jest.fn().mockReturnValue({
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        memoryUsage: {
          heapUsed: 0,
          heapTotal: 0,
          external: 0
        },
        resourceUsage: {
          memory: 0,
          cpu: 0
        }
      }),
      executeTask: jest.fn().mockResolvedValue({
        success: true,
        data: {},
        metadata: {
          duration: 100,
          timestamp: Date.now()
        }
      }),
      isInitialized: jest.fn().mockReturnValue(true)
    },
    visualizationService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      visualize: jest.fn().mockResolvedValue({ visualizationData: {} }),
      getMetrics: jest.fn().mockReturnValue({
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        memoryUsage: {
          heapUsed: 0,
          heapTotal: 0,
          external: 0
        },
        resourceUsage: {
          memory: 0,
          cpu: 0
        }
      }),
      executeTask: jest.fn().mockResolvedValue({
        success: true,
        data: {},
        metadata: {
          duration: 100,
          timestamp: Date.now()
        }
      }),
      isInitialized: jest.fn().mockReturnValue(true)
    },
    feedbackSystem: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      provideFeedback: jest.fn().mockResolvedValue(undefined),
      getFeedback: jest.fn().mockResolvedValue([])
    },
    renderingEngine: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      render: jest.fn().mockResolvedValue({ renderedData: {} })
    },
    metricsCollector: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      collectMetrics: jest.fn().mockResolvedValue({}),
      getMetricsHistory: jest.fn().mockReturnValue([])
    },
    performanceAnalyzer: {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue('online'),
      analyzePerformance: jest.fn().mockResolvedValue({ analysis: {} }),
      getPerformanceReport: jest.fn().mockReturnValue({})
    }
  };
};
