interface PhysicsWorld {
  add_field(field: any): Promise<void>;
  add_parameter(parameter: any): Promise<void>;
  step(): Promise<any>;
  get_parameter_count(): number;
  get_field_count(): number;
  clear_fields(): void;
  clear_parameters(): void;
}

interface WasmPhysicsModule {
  PhysicsWorld: {
    new(timeStep: number, gravityConstant: number, damping: number): PhysicsWorld;
  };
  init_panic_hook(): void;
  get_performance_metrics(): Promise<[number, number, number]>;
  generate_field_vertices(fields: any[]): Promise<Float32Array>;
}

declare module './pkg/grym_physics' {
  export const PhysicsWorld: WasmPhysicsModule['PhysicsWorld'];
  export function init_panic_hook(): void;
  export function get_performance_metrics(): Promise<[number, number, number]>;
  export function generate_field_vertices(fields: any[]): Promise<Float32Array>;
  export function init(): Promise<WasmPhysicsModule>;
}

declare global {
  interface WorkerGlobalScope {
    postMessage(message: any): void;
  }

  interface ErrorEvent extends Event {
    readonly message: string;
    readonly filename: string;
    readonly lineno: number;
    readonly colno: number;
    readonly error: any;
  }

  interface ErrorEventInit {
    message?: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    error?: any;
  }
}

export type { PhysicsWorld, WasmPhysicsModule };
