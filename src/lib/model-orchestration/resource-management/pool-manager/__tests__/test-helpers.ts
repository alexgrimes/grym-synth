import { ResourceDetector } from '../../resource-detection';
import { ResourceAvailability, ResourceUpdateCallback, ResourceAlertCallback, SystemResources } from '../../resource-detection/types';

interface MockResourceAvailability {
    status: 'healthy' | 'warning' | 'critical';
    memory: {
        isAvailable: boolean;
        availableAmount: number;
        utilizationPercent: number;
    };
    cpu: {
        isAvailable: boolean;
        availableCores: number;
        utilizationPercent: number;
    };
    disk: {
        isAvailable: boolean;
        availableSpace: number;
        utilizationPercent: number;
    };
}

export class TestResourceDetector extends ResourceDetector {
    private memory = { total: 10000, available: 8000, used: 2000 };
    private cpu = { cores: 8, available: 6, utilization: 25, loadAverage: [1.0, 1.0, 1.0] };
    private disk = { total: 100000, available: 80000, used: 20000 };
    private currentMock: ResourceAvailability | null = null;
    
    constructor(
        onUpdate?: ResourceUpdateCallback,
        onAlert?: ResourceAlertCallback
    ) {
        super({
            updateIntervalMs: 1000,
            thresholds: {
                memory: { warning: 80, critical: 90 },
                cpu: { warning: 70, critical: 85 },
                disk: { warning: 80, critical: 90 }
            },
            constraints: {
                memory: { maxAllocation: 1024 * 1024, warningThreshold: 80, criticalThreshold: 90 },
                cpu: { maxUtilization: 90, warningThreshold: 70, criticalThreshold: 85 },
                disk: { minAvailable: 1024, warningThreshold: 80, criticalThreshold: 90 }
            }
        }, onUpdate, onAlert);
    }

    public setAvailableMemory(amount: number): void {
        this.memory.available = amount;
        this.memory.used = this.memory.total - amount;
    }

    public setAvailableCores(cores: number): void {
        this.cpu.available = cores;
        this.cpu.cores = cores;
    }

    public override getAvailability(): ResourceAvailability {
        if (this.currentMock) {
            return this.currentMock;
        }
        return super.getAvailability();
    }

    public mockAvailability(availability: MockResourceAvailability): void {
        this.currentMock = {
            ...availability,
            timestamp: new Date()
        };
        
        // Update underlying system resources to match the mock
        this.memory.available = availability.memory.availableAmount;
        this.memory.used = this.memory.total - availability.memory.availableAmount;
        
        this.cpu.cores = availability.cpu.availableCores;
        this.cpu.utilization = availability.cpu.utilizationPercent;
        
        this.disk.available = availability.disk.availableSpace;
        this.disk.used = this.disk.total - availability.disk.availableSpace;
    }

    protected override detectResources(): SystemResources {
        return {
            memory: {
                total: this.memory.total,
                used: this.memory.used,
                available: this.memory.available
            },
            cpu: {
                cores: this.cpu.cores,
                utilization: this.cpu.utilization,
                loadAverage: this.cpu.loadAverage
            },
            disk: {
                total: this.disk.total,
                used: this.disk.used,
                available: this.disk.available
            }
        };
    }

    protected override detectMemoryResources() {
        const resources = this.detectResources();
        return resources.memory;
    }

    protected override detectCpuResources() {
        const resources = this.detectResources();
        return resources.cpu;
    }

    protected override detectDiskResources() {
        const resources = this.detectResources();
        return resources.disk;
    }
}