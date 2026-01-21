// Mock for @forge/resolver

class Resolver {
  constructor() {
    this.definitions = {};
  }

  define(name, handler) {
    this.definitions[name] = handler;
  }

  getDefinitions() {
    return this.definitions;
  }
}

export default Resolver;
