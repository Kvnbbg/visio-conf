#!/usr/bin/env node

/**
 * Security Validation Script for Visio-Conf
 * Tests security implementations and validates configurations
 */

const axios = require('axios');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

class SecurityValidator {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const color = type === 'pass' ? colors.green : 
                     type === 'fail' ? colors.red : 
                     type === 'warn' ? colors.yellow : colors.blue;
        
        console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
    }

    async test(name, testFn) {
        this.log(`Testing: ${name}`, 'info');
        const startTime = performance.now();
        
        try {
            const result = await testFn();
            const duration = Math.round(performance.now() - startTime);
            
            if (result.passed) {
                this.results.passed++;
                this.log(`✓ ${name} (${duration}ms)`, 'pass');
            } else {
                this.results.failed++;
                this.log(`✗ ${name}: ${result.message} (${duration}ms)`, 'fail');
            }
            
            this.results.tests.push({
                name,
                passed: result.passed,
                message: result.message,
                duration
            });
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            this.results.failed++;
            this.log(`✗ ${name}: ${error.message} (${duration}ms)`, 'fail');
            
            this.results.tests.push({
                name,
                passed: false,
                message: error.message,
                duration
            });
        }
    }

    async testHealthEndpoint() {
        return this.test('Health Endpoint', async () => {
            const response = await axios.get(`${BASE_URL}/api/health`);
            
            if (response.status !== 200) {
                return { passed: false, message: `Expected 200, got ${response.status}` };
            }
            
            const requiredFields = ['status', 'timestamp', 'uptime', 'version'];
            const missingFields = requiredFields.filter(field => !response.data[field]);
            
            if (missingFields.length > 0) {
                return { passed: false, message: `Missing fields: ${missingFields.join(', ')}` };
            }
            
            return { passed: true, message: 'Health endpoint working correctly' };
        });
    }

    async testSecurityHeaders() {
        return this.test('Security Headers', async () => {
            const response = await axios.get(`${BASE_URL}/api/health`);
            const headers = response.headers;
            
            const requiredHeaders = [
                'x-content-type-options',
                'x-frame-options',
                'x-xss-protection',
                'referrer-policy',
                'content-security-policy'
            ];
            
            const missingHeaders = requiredHeaders.filter(header => !headers[header]);
            
            if (missingHeaders.length > 0) {
                return { passed: false, message: `Missing headers: ${missingHeaders.join(', ')}` };
            }
            
            // Check specific header values
            if (headers['x-frame-options'] !== 'DENY') {
                return { passed: false, message: 'X-Frame-Options should be DENY' };
            }
            
            if (headers['x-content-type-options'] !== 'nosniff') {
                return { passed: false, message: 'X-Content-Type-Options should be nosniff' };
            }
            
            return { passed: true, message: 'All security headers present and correct' };
        });
    }

    async testRateLimiting() {
        return this.test('Rate Limiting', async () => {
            const requests = [];
            const maxRequests = 105; // Slightly above the limit
            
            // Send requests rapidly
            for (let i = 0; i < maxRequests; i++) {
                requests.push(
                    axios.get(`${BASE_URL}/api/health`, {
                        validateStatus: () => true // Don't throw on 429
                    })
                );
            }
            
            const responses = await Promise.all(requests);
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            
            if (rateLimitedResponses.length === 0) {
                return { passed: false, message: 'Rate limiting not working - no 429 responses' };
            }
            
            return { passed: true, message: `Rate limiting working - ${rateLimitedResponses.length} requests blocked` };
        });
    }

    async testCSRFProtection() {
        return this.test('CSRF Protection', async () => {
            try {
                // Try to access CSRF token endpoint
                const tokenResponse = await axios.get(`${BASE_URL}/api/csrf-token`);
                
                if (!tokenResponse.data.csrfToken) {
                    return { passed: false, message: 'CSRF token not provided' };
                }
                
                // Try to make a POST request without CSRF token (should fail)
                const postResponse = await axios.post(`${BASE_URL}/auth/logout`, {}, {
                    validateStatus: () => true
                });
                
                if (postResponse.status !== 403) {
                    return { passed: false, message: `Expected 403 for missing CSRF token, got ${postResponse.status}` };
                }
                
                return { passed: true, message: 'CSRF protection working correctly' };
            } catch (error) {
                if (error.response && error.response.status === 403) {
                    return { passed: true, message: 'CSRF protection working correctly' };
                }
                throw error;
            }
        });
    }

    async testInputValidation() {
        return this.test('Input Validation', async () => {
            // Test with malicious input
            const maliciousPayload = {
                title: '<script>alert("xss")</script>',
                description: 'javascript:alert("xss")',
                startTime: 'invalid-date',
                duration: -1
            };
            
            const response = await axios.post(`${BASE_URL}/api/protected/zego-token`, maliciousPayload, {
                validateStatus: () => true
            });
            
            // Should be rejected due to validation
            if (response.status === 200) {
                return { passed: false, message: 'Malicious input was accepted' };
            }
            
            if (response.status === 400 && response.data.error === 'Validation failed') {
                return { passed: true, message: 'Input validation working correctly' };
            }
            
            return { passed: false, message: `Unexpected response: ${response.status}` };
        });
    }

    async testSQLInjectionPrevention() {
        return this.test('SQL Injection Prevention', async () => {
            const sqlPayloads = [
                "'; DROP TABLE users; --",
                "1' OR '1'='1",
                "admin'/*",
                "' UNION SELECT * FROM users --"
            ];
            
            for (const payload of sqlPayloads) {
                const response = await axios.get(`${BASE_URL}/api/health?test=${encodeURIComponent(payload)}`, {
                    validateStatus: () => true
                });
                
                // Should not cause server errors
                if (response.status === 500) {
                    return { passed: false, message: `SQL injection payload caused server error: ${payload}` };
                }
            }
            
            return { passed: true, message: 'SQL injection prevention working' };
        });
    }

    async testXSSPrevention() {
        return this.test('XSS Prevention', async () => {
            const xssPayloads = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '<img src="x" onerror="alert(1)">',
                '<svg onload="alert(1)">'
            ];
            
            for (const payload of xssPayloads) {
                const response = await axios.get(`${BASE_URL}/api/health?test=${encodeURIComponent(payload)}`, {
                    validateStatus: () => true
                });
                
                // Check if payload is reflected unsanitized
                if (response.data && typeof response.data === 'string' && response.data.includes(payload)) {
                    return { passed: false, message: `XSS payload reflected: ${payload}` };
                }
            }
            
            return { passed: true, message: 'XSS prevention working correctly' };
        });
    }

    async testHTTPSRedirection() {
        return this.test('HTTPS Configuration', async () => {
            if (process.env.NODE_ENV !== 'production') {
                this.results.warnings++;
                this.log('⚠ HTTPS test skipped in non-production environment', 'warn');
                return { passed: true, message: 'Skipped in development' };
            }
            
            // In production, test HTTPS redirection
            try {
                const httpUrl = BASE_URL.replace('https://', 'http://');
                const response = await axios.get(httpUrl, {
                    maxRedirects: 0,
                    validateStatus: () => true
                });
                
                if (response.status === 301 || response.status === 302) {
                    const location = response.headers.location;
                    if (location && location.startsWith('https://')) {
                        return { passed: true, message: 'HTTPS redirection working' };
                    }
                }
                
                return { passed: false, message: 'HTTPS redirection not configured' };
            } catch (error) {
                return { passed: false, message: `HTTPS test failed: ${error.message}` };
            }
        });
    }

    async testDependencyVulnerabilities() {
        return this.test('Dependency Vulnerabilities', async () => {
            const { execSync } = require('child_process');
            
            try {
                const auditOutput = execSync('npm audit --json', { 
                    encoding: 'utf8',
                    cwd: process.cwd()
                });
                
                const audit = JSON.parse(auditOutput);
                
                if (audit.metadata.vulnerabilities.total === 0) {
                    return { passed: true, message: 'No vulnerabilities found' };
                }
                
                const critical = audit.metadata.vulnerabilities.critical || 0;
                const high = audit.metadata.vulnerabilities.high || 0;
                
                if (critical > 0) {
                    return { passed: false, message: `${critical} critical vulnerabilities found` };
                }
                
                if (high > 0) {
                    this.results.warnings++;
                    this.log(`⚠ ${high} high severity vulnerabilities found`, 'warn');
                }
                
                return { passed: true, message: `${audit.metadata.vulnerabilities.total} non-critical vulnerabilities` };
            } catch (error) {
                // npm audit returns non-zero exit code when vulnerabilities are found
                if (error.stdout) {
                    const audit = JSON.parse(error.stdout);
                    const critical = audit.metadata.vulnerabilities.critical || 0;
                    
                    if (critical > 0) {
                        return { passed: false, message: `${critical} critical vulnerabilities found` };
                    }
                }
                
                return { passed: false, message: `Audit failed: ${error.message}` };
            }
        });
    }

    async runAllTests() {
        this.log('🔒 Starting Security Validation Tests', 'info');
        this.log(`Testing against: ${BASE_URL}`, 'info');
        
        await this.testHealthEndpoint();
        await this.testSecurityHeaders();
        await this.testRateLimiting();
        await this.testCSRFProtection();
        await this.testInputValidation();
        await this.testSQLInjectionPrevention();
        await this.testXSSPrevention();
        await this.testHTTPSRedirection();
        await this.testDependencyVulnerabilities();
        
        this.printSummary();
    }

    printSummary() {
        this.log('\n📊 Security Validation Summary', 'info');
        this.log(`✓ Passed: ${this.results.passed}`, 'pass');
        this.log(`✗ Failed: ${this.results.failed}`, 'fail');
        this.log(`⚠ Warnings: ${this.results.warnings}`, 'warn');
        
        if (this.results.failed > 0) {
            this.log('\n❌ Security validation FAILED', 'fail');
            this.log('Please address the failed tests before deploying to production.', 'fail');
            process.exit(1);
        } else {
            this.log('\n✅ Security validation PASSED', 'pass');
            this.log('Application meets security requirements.', 'pass');
        }
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new SecurityValidator();
    validator.runAllTests().catch(error => {
        console.error('Validation failed:', error);
        process.exit(1);
    });
}

module.exports = SecurityValidator;

