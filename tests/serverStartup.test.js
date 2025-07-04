const { spawn } = require('child_process');
const path = require('path');

describe('Server Startup', () => {
  test('should start server when run directly', (done) => {
    const serverPath = path.join(__dirname, '..', 'server.js');
    const serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, PORT: '0' }, // Use port 0 to let OS assign available port
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      
      // Check if server started successfully
      if (output.includes('Serveur démarré sur le port')) {
        serverProcess.kill('SIGTERM');
        done();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });

    serverProcess.on('error', (error) => {
      done(error);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!serverProcess.killed) {
        serverProcess.kill('SIGTERM');
        done(new Error('Server startup timeout'));
      }
    }, 5000);
  }, 10000); // 10 second timeout for this test

  test('should use PORT environment variable', (done) => {
    const serverPath = path.join(__dirname, '..', 'server.js');
    const testPort = '8888';
    const serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, PORT: testPort },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      
      // Check if server started on the specified port
      if (output.includes(`Serveur démarré sur le port ${testPort}`)) {
        serverProcess.kill('SIGTERM');
        done();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });

    serverProcess.on('error', (error) => {
      done(error);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!serverProcess.killed) {
        serverProcess.kill('SIGTERM');
        done(new Error('Server startup timeout'));
      }
    }, 5000);
  }, 10000); // 10 second timeout for this test
});