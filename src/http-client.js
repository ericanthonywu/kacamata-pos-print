const axios = require('axios');

/**
 * Lightweight JSON GET fetcher using axios.
 * Compatible with Node.js 14+ on Windows 7.
 *
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.timeout=10000]
 * @returns {Promise<any>}
 */
async function fetchJson(url, options = {}) {
  const response = await axios.get(url, {
    timeout: options.timeout || 10000,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Kacamata-POS-Print/1.0',
      ...(options.headers || {})
    }
  });
  return response.data;
}

module.exports = { fetchJson };
