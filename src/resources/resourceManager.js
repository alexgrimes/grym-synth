// JavaScript implementation of ResourceManager for testing
class ResourceManager {
  constructor(dbPath = ':memory:') {
    this.dbPath = dbPath;
    this.initialized = false;
    this.resources = new Map();
    this.nextId = 1;
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
  }

  async addResource(resource) {
    if (!this.initialized) await this.initialize();

    const id = `res-${this.nextId++}`;
    this.resources.set(id, {
      id,
      ...resource
    });

    return id;
  }

  async getResource(id) {
    if (!this.initialized) await this.initialize();

    if (!this.resources.has(id)) {
      return null;
    }

    return this.resources.get(id);
  }

  async listResources(type) {
    if (!this.initialized) await this.initialize();

    const resources = Array.from(this.resources.values());

    if (type) {
      return resources.filter(res => res.type === type);
    }

    return resources;
  }

  async updateResource(id, updates) {
    if (!this.initialized) await this.initialize();

    if (!this.resources.has(id)) {
      return false;
    }

    const resource = this.resources.get(id);

    if (updates.type) {
      resource.type = updates.type;
    }

    if (updates.path) {
      resource.path = updates.path;
    }

    if (updates.metadata) {
      resource.metadata = updates.metadata;
    }

    return true;
  }

  async deleteResource(id) {
    if (!this.initialized) await this.initialize();

    if (!this.resources.has(id)) {
      return false;
    }

    this.resources.delete(id);
    return true;
  }

  async close() {
    this.initialized = false;
  }
}

// Export for CommonJS
module.exports = {
  default: ResourceManager,
  ResourceManager
};
