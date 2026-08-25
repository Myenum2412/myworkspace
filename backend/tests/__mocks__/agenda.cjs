class Agenda {
  constructor(config) {
    this.config = config;
    this._collection = null;
    this.definitions = {};
    this._jobs = [];
  }

  define(name, processor) {
    this.definitions[name] = processor;
  }

  async start() {}
  async stop() {}
  async now(name, data) {
    if (this.definitions[name]) {
      await this.definitions[name]({ attrs: { data } });
    }
  }
  async schedule(when, name, data) {
    this._jobs.push({ when, name, data });
  }
  async every(interval, name, data) {
    this._jobs.push({ interval, name, data });
  }
}

module.exports = { Agenda, define: () => {} };
