const axios = require('axios');

class CircuitBreaker {
  constructor() {
    this.states = {};
    this.failureThreshold = 5;
    this.cooldownPeriod = 10;
    this.requestTimeout = 1;

  }

  initState(endpoint) {
    this.states[endpoint] = {
      failures: 0,
      cooldownPeriod: this.cooldownPeriod,
      circuit: 'CLOSED',
      nextTry: 0,
    };
  }

  onSuccess(endpoint) {
    this.initState(endpoint);
  }

  onFailure(endpoint) {
    const state = this.states[endpoint];
    state.failures += 1;
    if (state.failures > this.failureThreshold) {
      state.circuit = 'OPEN';
      state.nextTry = new Date() / 1000 + state.cooldownPeriod;
      console.log(`ALERT! Circuit for ${endpoint} is in 'OPEN' state.`);
    }
  }

  canRequest(endpoint) {
    if (!this.states[endpoint]) this.initState(endpoint);
    const state = this.states[endpoint];
    if (state.circuit === 'CLOSED') return true;
    const now = new Date() / 1000;
    if (state.nextTry <= now) {
      state.circuit = 'HALF';
      return true;
    }
    return false;
  }

  async callService(requestOptions) {
    const endpoint = `${requestOptions.method}:${requestOptions.url}`;

    if (!this.canRequest(endpoint)) return false;

    // eslint-disable-next-line no-param-reassign
    requestOptions.timeout = this.requestTimeout * 1000;

    try {
      const response = await axios(requestOptions); 
      this.onSuccess(endpoint);
      return response.data;
    } catch (error) {
      this.onFailure(endpoint);
      return false;
    }
  }
}

module.exports = CircuitBreaker;