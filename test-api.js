#!/usr/bin/env node

const http = require('http');

// Test data
const testData = JSON.stringify({
  roomID: 'test-room-123',
  userID: 'test-user-456'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/generate-token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('Testing API endpoint...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Response:', response);
      
      if (response.token && response.token.startsWith('04')) {
        console.log('✅ API test passed! Token generated successfully.');
      } else {
        console.log('❌ API test failed! Invalid token format.');
      }
    } catch (error) {
      console.log('❌ API test failed! Invalid JSON response.');
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ API test failed! Connection error:', error.message);
});

req.write(testData);
req.end();