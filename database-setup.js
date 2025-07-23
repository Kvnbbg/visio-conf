#!/usr/bin/env node

/**
 * Database Setup Script for Visio-Conf v3.0
 * Handles database initialization, migrations, and maintenance
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getDatabaseService } = require('../lib/database');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const color = type === 'success' ? colors.green : 
               type === 'error' ? colors.red : 
               type === 'warn' ? colors.yellow : colors.blue;
  
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

class DatabaseSetup {
  constructor() {
    this.db = getDatabaseService();
  }

  async checkDatabaseConnection() {
    log('🔍 Checking database connection...', 'info');
    
    try {
      await this.db.connect();
      const healthCheck = await this.db.getHealthCheck();
      
      if (healthCheck.status === 'healthy') {
        log('✅ Database connection successful', 'success');
        return true;
      } else {
        log(`❌ Database health check failed: ${healthCheck.error}`, 'error');
        return false;
      }
    } catch (error) {
      log(`❌ Database connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runMigrations() {
    log('🔄 Running database migrations...', 'info');
    
    try {
      // Generate Prisma client
      log('📦 Generating Prisma client...', 'info');
      execSync('npx prisma generate', { stdio: 'inherit' });
      
      // Run migrations
      log('🗃️ Applying database migrations...', 'info');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      
      log('✅ Database migrations completed successfully', 'success');
      return true;
    } catch (error) {
      log(`❌ Migration failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runSeed() {
    log('🌱 Seeding database with initial data...', 'info');
    
    try {
      execSync('npx prisma db seed', { stdio: 'inherit' });
      log('✅ Database seeding completed successfully', 'success');
      return true;
    } catch (error) {
      log(`❌ Seeding failed: ${error.message}`, 'error');
      return false;
    }
  }

  async createMigration(name) {
    if (!name) {
      log('❌ Migration name is required', 'error');
      return false;
    }

    log(`📝 Creating new migration: ${name}`, 'info');
    
    try {
      execSync(`npx prisma migrate dev --name ${name}`, { stdio: 'inherit' });
      log('✅ Migration created successfully', 'success');
      return true;
    } catch (error) {
      log(`❌ Migration creation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async resetDatabase() {
    log('⚠️ Resetting database (this will delete all data)...', 'warn');
    
    try {
      execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
      log('✅ Database reset completed successfully', 'success');
      return true;
    } catch (error) {
      log(`❌ Database reset failed: ${error.message}`, 'error');
      return false;
    }
  }

  async introspectDatabase() {
    log('🔍 Introspecting existing database...', 'info');
    
    try {
      execSync('npx prisma db pull', { stdio: 'inherit' });
      log('✅ Database introspection completed successfully', 'success');
      return true;
    } catch (error) {
      log(`❌ Database introspection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async validateSchema() {
    log('✅ Validating Prisma schema...', 'info');
    
    try {
      execSync('npx prisma validate', { stdio: 'inherit' });
      log('✅ Schema validation passed', 'success');
      return true;
    } catch (error) {
      log(`❌ Schema validation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async formatSchema() {
    log('🎨 Formatting Prisma schema...', 'info');
    
    try {
      execSync('npx prisma format', { stdio: 'inherit' });
      log('✅ Schema formatting completed', 'success');
      return true;
    } catch (error) {
      log(`❌ Schema formatting failed: ${error.message}`, 'error');
      return false;
    }
  }

  async openStudio() {
    log('🎯 Opening Prisma Studio...', 'info');
    
    try {
      execSync('npx prisma studio', { stdio: 'inherit' });
      return true;
    } catch (error) {
      log(`❌ Failed to open Prisma Studio: ${error.message}`, 'error');
      return false;
    }
  }

  async backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-${timestamp}.sql`;
    const backupPath = path.join(process.cwd(), 'backups', backupFile);
    
    log(`💾 Creating database backup: ${backupFile}`, 'info');
    
    try {
      // Ensure backup directory exists
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Extract database URL components
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }

      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || 5432;
      const database = url.pathname.slice(1);
      const username = url.username;
      const password = url.password;

      // Set PGPASSWORD environment variable
      const env = { ...process.env, PGPASSWORD: password };

      // Run pg_dump
      execSync(
        `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f ${backupPath}`,
        { env, stdio: 'inherit' }
      );

      log(`✅ Database backup created: ${backupPath}`, 'success');
      return backupPath;
    } catch (error) {
      log(`❌ Database backup failed: ${error.message}`, 'error');
      return false;
    }
  }

  async restoreDatabase(backupPath) {
    if (!fs.existsSync(backupPath)) {
      log(`❌ Backup file not found: ${backupPath}`, 'error');
      return false;
    }

    log(`📥 Restoring database from: ${backupPath}`, 'info');
    
    try {
      // Extract database URL components
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }

      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || 5432;
      const database = url.pathname.slice(1);
      const username = url.username;
      const password = url.password;

      // Set PGPASSWORD environment variable
      const env = { ...process.env, PGPASSWORD: password };

      // Run psql to restore
      execSync(
        `psql -h ${host} -p ${port} -U ${username} -d ${database} -f ${backupPath}`,
        { env, stdio: 'inherit' }
      );

      log('✅ Database restore completed successfully', 'success');
      return true;
    } catch (error) {
      log(`❌ Database restore failed: ${error.message}`, 'error');
      return false;
    }
  }

  async cleanupOldData() {
    log('🧹 Cleaning up old data...', 'info');
    
    try {
      await this.db.connect();
      
      // Clean up expired sessions
      await this.db.cleanupExpiredSessions();
      
      // Clean up old audit logs (keep 90 days)
      await this.db.cleanupOldAuditLogs(90);
      
      log('✅ Data cleanup completed successfully', 'success');
      return true;
    } catch (error) {
      log(`❌ Data cleanup failed: ${error.message}`, 'error');
      return false;
    } finally {
      await this.db.disconnect();
    }
  }

  async showStatus() {
    log('📊 Database Status', 'info');
    
    try {
      await this.db.connect();
      const healthCheck = await this.db.getHealthCheck();
      
      console.log('\n📈 Database Statistics:');
      console.log(`  Status: ${healthCheck.status}`);
      console.log(`  Active Users: ${healthCheck.stats.activeUsers}`);
      console.log(`  Active Meetings: ${healthCheck.stats.activeMeetings}`);
      console.log(`  Active Sessions: ${healthCheck.stats.activeSessions}`);
      console.log(`  Timestamp: ${healthCheck.timestamp}\n`);
      
      return true;
    } catch (error) {
      log(`❌ Failed to get database status: ${error.message}`, 'error');
      return false;
    } finally {
      await this.db.disconnect();
    }
  }

  async fullSetup() {
    log('🚀 Starting full database setup...', 'info');
    
    const steps = [
      { name: 'Check Connection', fn: () => this.checkDatabaseConnection() },
      { name: 'Validate Schema', fn: () => this.validateSchema() },
      { name: 'Run Migrations', fn: () => this.runMigrations() },
      { name: 'Seed Database', fn: () => this.runSeed() },
      { name: 'Show Status', fn: () => this.showStatus() }
    ];

    for (const step of steps) {
      log(`\n▶️ ${step.name}...`, 'info');
      const success = await step.fn();
      
      if (!success) {
        log(`❌ Setup failed at step: ${step.name}`, 'error');
        return false;
      }
    }

    log('\n🎉 Database setup completed successfully!', 'success');
    return true;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  const setup = new DatabaseSetup();

  try {
    switch (command) {
      case 'setup':
        await setup.fullSetup();
        break;
      case 'migrate':
        await setup.runMigrations();
        break;
      case 'seed':
        await setup.runSeed();
        break;
      case 'create-migration':
        await setup.createMigration(arg);
        break;
      case 'reset':
        await setup.resetDatabase();
        break;
      case 'introspect':
        await setup.introspectDatabase();
        break;
      case 'validate':
        await setup.validateSchema();
        break;
      case 'format':
        await setup.formatSchema();
        break;
      case 'studio':
        await setup.openStudio();
        break;
      case 'backup':
        await setup.backupDatabase();
        break;
      case 'restore':
        await setup.restoreDatabase(arg);
        break;
      case 'cleanup':
        await setup.cleanupOldData();
        break;
      case 'status':
        await setup.showStatus();
        break;
      default:
        console.log(`
🗃️ Database Setup Tool for Visio-Conf v3.0

Usage: node scripts/database-setup.js <command> [args]

Commands:
  setup              - Full database setup (migrate + seed)
  migrate            - Run database migrations
  seed               - Seed database with initial data
  create-migration   - Create new migration (requires name)
  reset              - Reset database (WARNING: deletes all data)
  introspect         - Introspect existing database
  validate           - Validate Prisma schema
  format             - Format Prisma schema
  studio             - Open Prisma Studio
  backup             - Create database backup
  restore <file>     - Restore database from backup
  cleanup            - Clean up old data
  status             - Show database status

Examples:
  node scripts/database-setup.js setup
  node scripts/database-setup.js create-migration add_user_preferences
  node scripts/database-setup.js backup
  node scripts/database-setup.js restore backups/backup-2025-07-22.sql
        `);
        break;
    }
  } catch (error) {
    log(`❌ Command failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseSetup;

