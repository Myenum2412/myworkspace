const http = require('http');

async function test() {
  const fetch = (await import('node-fetch')).default;
  // We need to fetch with cookies or authenticate first. 
  // Let's just create a script to do it.
}
