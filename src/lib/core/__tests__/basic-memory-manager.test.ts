import { BasicMemoryManager } from '../basic-memory-manager';
import { MemoryTestUtils } from './memory-test-utils';

describe('Basic Memory Manager', () => {
  let manager: BasicMemoryManager;
  let memUtils: MemoryTestUtils;
  const held: number[][] = [];

  beforeEach(async () => {
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    manager = new BasicMemoryManager();
    memUtils = new MemoryTestUtils();
  });

  afterEach(async () => {
    await memUtils.cleanup(held);
    await manager.unloadModel();
    memUtils.printStatus('Cleanup Complete');
  });

  it('should initialize with correct thresholds', () => {
    const baseline = memUtils.takeSnapshot();
    const info = manager.getMemoryInfo();
    
    // Basic threshold checks
    expect(info.baseline).toBeGreaterThan(0);
    expect(info.warning).toBeGreaterThan(info.baseline);
    expect(info.critical).toBeGreaterThan(info.warning);
    expect(info.minimumFree).toBe(30_000_000); // 30MB

    // Should start in safe territory
    expect(info.isWarning).toBe(false);
    expect(info.isCritical).toBe(false);

    memUtils.printStatus('Initial State');
  });

  it('should load and unload models under normal conditions', async () => {
    const beforeLoad = memUtils.takeSnapshot();
    
    const success = await manager.loadModel('test-model');
    expect(success).toBe(true);
    expect(manager.getCurrentModel()).toBe('test-model');
    
    const afterLoad = memUtils.takeSnapshot();
    const loadImpact = memUtils.compareToSnapshot(beforeLoad);
    console.log('Load Impact:', memUtils.formatMB(loadImpact.heapUsedDiff));
    
    await manager.unloadModel();
    expect(manager.getCurrentModel()).toBe(null);

    const afterUnload = memUtils.takeSnapshot();
    const cleanupEffect = memUtils.compareToSnapshot(afterLoad);
    expect(cleanupEffect.heapUsedDiff).toBeLessThan(0); // Should free memory
  });

  it('should detect warning conditions', async () => {
    const baseline = memUtils.takeSnapshot();
    
    // First load should succeed
    const success1 = await manager.loadModel('model-1');
    expect(success1).toBe(true);

    // Allocate memory until we hit warning
    const info = manager.getMemoryInfo();
    const mbToWarning = Math.floor((info.warning - info.used) / (1024 * 1024));
    
    await memUtils.allocateMemory(mbToWarning + 5, held); // Go just past warning
    
    const warningInfo = manager.getMemoryInfo();
    expect(warningInfo.isWarning).toBe(true);
    
    memUtils.printStatus('Warning State');
  });

  it('should recover after memory cleanup', async () => {
    // Create memory pressure
    const baseline = memUtils.takeSnapshot();
    await memUtils.allocateMemory(40, held); // 40MB allocation
    
    const pressured = memUtils.takeSnapshot();
    const pressureImpact = memUtils.compareToSnapshot(baseline);
    console.log('Pressure Impact:', memUtils.formatMB(pressureImpact.heapUsedDiff));
    
    // Clean up
    await memUtils.cleanup(held);
    await manager.unloadModel();
    
    const recovered = memUtils.takeSnapshot();
    const recoveryEffect = memUtils.compareToSnapshot(pressured);
    expect(recoveryEffect.heapUsedDiff).toBeLessThan(0);
    
    const info = manager.getMemoryInfo();
    expect(info.isWarning).toBe(false);
    
    memUtils.printStatus('After Recovery');
  });

  it('should prevent loading under critical memory', async () => {
    const success1 = await manager.loadModel('model-1');
    expect(success1).toBe(true);

    // Create critical memory pressure
    await memUtils.allocateMemory(80, held);
    
    const info = manager.getMemoryInfo();
    expect(info.isCritical).toBe(true);
    
    // Attempt load under pressure
    const success2 = await manager.loadModel('model-2');
    expect(success2).toBe(false);
    
    memUtils.printStatus('Critical State');
  });

  afterAll(() => {
    // Print test summary
    const summary = memUtils.getSummary();
    console.log('\nTest Summary:');
    console.log(`Initial Heap: ${memUtils.formatMB(summary.initialHeap)}`);
    console.log(`Final Heap:   ${memUtils.formatMB(summary.finalHeap)}`);
    console.log(`Max Heap:     ${memUtils.formatMB(summary.maxHeap)}`);
    console.log(`Potential Leak: ${memUtils.formatMB(summary.leakCheck)}`);
    console.log(`Duration: ${summary.duration}ms`);
  });
});