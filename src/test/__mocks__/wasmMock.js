// Mock WebAssembly module for tests
module.exports = {
  memory: new WebAssembly.Memory({ initial: 256 }),
  __wbg_set_panic_hook: () => {},
  init: () => {
    return Promise.resolve({
      PhysicsWorld: class {
        constructor() {
          this.parameters = new Map();
          this.fields = new Map();
        }
        add_field(field) {
          const id = Math.random().toString(36).substring(7);
          this.fields.set(id, field);
          return Promise.resolve();
        }
        add_parameter(parameter) {
          this.parameters.set(parameter.id, parameter);
          return Promise.resolve();
        }
        step() {
          // Simple mock physics update
          return Promise.resolve(
            Array.from(this.parameters.entries()).reduce((acc, [id, param]) => {
              acc[id] = param.value;
              return acc;
            }, {})
          );
        }
        get_parameter_count() {
          return this.parameters.size;
        }
        get_field_count() {
          return this.fields.size;
        }
        clear_fields() {
          this.fields.clear();
        }
        clear_parameters() {
          this.parameters.clear();
        }
      },
      init_panic_hook: () => {},
      get_performance_metrics: () => Promise.resolve([0, 0, 0]),
      generate_field_vertices: (fields) => Promise.resolve(new Float32Array(fields.length * 3))
    });
  }
};

// Mock other WebAssembly-related functions
global.WebAssembly = {
  ...global.WebAssembly,
  instantiateStreaming: () => Promise.resolve({
    instance: { exports: {} },
    module: {}
  }),
  instantiate: () => Promise.resolve({
    instance: { exports: {} },
    module: {}
  })
};
