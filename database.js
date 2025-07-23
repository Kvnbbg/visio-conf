/**
 * Database Service for Visio-Conf v3.0
 * Prisma ORM wrapper with optimizations and duplicate prevention
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
      errorFormat: 'pretty',
    });

    this.setupLogging();
    this.setupMiddleware();
  }

  setupLogging() {
    // Log slow queries
    this.prisma.$on('query', (e) => {
      if (e.duration > 1000) { // Log queries taking more than 1 second
        logger.warn('Slow query detected', {
          query: e.query,
          duration: e.duration,
          params: e.params
        });
      }
    });

    // Log errors
    this.prisma.$on('error', (e) => {
      logger.error('Database error', {
        message: e.message,
        target: e.target
      });
    });

    // Log info and warnings
    this.prisma.$on('info', (e) => {
      logger.info('Database info', { message: e.message });
    });

    this.prisma.$on('warn', (e) => {
      logger.warn('Database warning', { message: e.message });
    });
  }

  setupMiddleware() {
    // Soft delete middleware
    this.prisma.$use(async (params, next) => {
      // Intercept delete operations and convert to soft delete
      if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
      }

      // Intercept deleteMany operations
      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        if (params.args.data !== undefined) {
          params.args.data.deletedAt = new Date();
        } else {
          params.args.data = { deletedAt: new Date() };
        }
      }

      return next(params);
    });

    // Filter out soft deleted records
    this.prisma.$use(async (params, next) => {
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        params.args.where = { ...params.args.where, deletedAt: null };
      }

      if (params.action === 'findMany') {
        if (params.args.where) {
          if (params.args.where.deletedAt === undefined) {
            params.args.where.deletedAt = null;
          }
        } else {
          params.args.where = { deletedAt: null };
        }
      }

      return next(params);
    });
  }

  // User management methods
  async createUser(userData) {
    try {
      // Check for existing user with same email
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: userData.email,
          deletedAt: null
        }
      });

      if (existingUser) {
        throw new Error(`User with email ${userData.email} already exists`);
      }

      // Check for existing France Travail ID if provided
      if (userData.franceTravailId) {
        const existingFTUser = await this.prisma.user.findFirst({
          where: {
            franceTravailId: userData.franceTravailId,
            deletedAt: null
          }
        });

        if (existingFTUser) {
          throw new Error(`User with France Travail ID ${userData.franceTravailId} already exists`);
        }
      }

      const user = await this.prisma.user.create({
        data: userData
      });

      logger.info('User created successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      logger.error('Failed to create user', { error: error.message, userData });
      throw error;
    }
  }

  async getUserByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        sessions: {
          where: { isActive: true },
          orderBy: { lastActivityAt: 'desc' }
        }
      }
    });
  }

  async getUserById(id) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        ownedMeetings: {
          where: { status: { in: ['SCHEDULED', 'ACTIVE'] } },
          orderBy: { startTime: 'asc' },
          take: 10
        },
        participations: {
          where: { status: { in: ['INVITED', 'ACCEPTED', 'JOINED'] } },
          include: { meeting: true },
          orderBy: { meeting: { startTime: 'asc' } },
          take: 10
        }
      }
    });
  }

  async updateUserLastLogin(userId) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 }
      }
    });
  }

  // Meeting management methods
  async createMeeting(meetingData) {
    try {
      // Check for duplicate meeting ID
      const existingMeeting = await this.prisma.meeting.findFirst({
        where: {
          meetingId: meetingData.meetingId,
          deletedAt: null
        }
      });

      if (existingMeeting) {
        throw new Error(`Meeting with ID ${meetingData.meetingId} already exists`);
      }

      // Check for conflicting meetings (same owner, overlapping time)
      const conflictingMeeting = await this.prisma.meeting.findFirst({
        where: {
          ownerId: meetingData.ownerId,
          status: { in: ['SCHEDULED', 'ACTIVE'] },
          OR: [
            {
              AND: [
                { startTime: { lte: meetingData.startTime } },
                { endTime: { gt: meetingData.startTime } }
              ]
            },
            {
              AND: [
                { startTime: { lt: meetingData.endTime } },
                { endTime: { gte: meetingData.endTime } }
              ]
            },
            {
              AND: [
                { startTime: { gte: meetingData.startTime } },
                { endTime: { lte: meetingData.endTime } }
              ]
            }
          ],
          deletedAt: null
        }
      });

      if (conflictingMeeting) {
        throw new Error('Meeting conflicts with existing meeting at the same time');
      }

      const meeting = await this.prisma.meeting.create({
        data: meetingData,
        include: {
          owner: true,
          participants: {
            include: { user: true }
          }
        }
      });

      logger.info('Meeting created successfully', { 
        meetingId: meeting.id, 
        title: meeting.title,
        ownerId: meeting.ownerId 
      });

      return meeting;
    } catch (error) {
      logger.error('Failed to create meeting', { error: error.message, meetingData });
      throw error;
    }
  }

  async addMeetingParticipant(meetingId, participantData) {
    try {
      // Check for existing participation
      const existingParticipant = await this.prisma.meetingParticipant.findFirst({
        where: {
          meetingId,
          OR: [
            { userId: participantData.userId },
            { guestEmail: participantData.guestEmail }
          ]
        }
      });

      if (existingParticipant) {
        throw new Error('Participant already exists in this meeting');
      }

      // Check meeting capacity
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { _count: { select: { participants: true } } }
      });

      if (meeting._count.participants >= meeting.maxParticipants) {
        throw new Error('Meeting has reached maximum capacity');
      }

      const participant = await this.prisma.meetingParticipant.create({
        data: {
          meetingId,
          ...participantData
        },
        include: {
          user: true,
          meeting: true
        }
      });

      logger.info('Participant added to meeting', {
        meetingId,
        participantId: participant.id,
        userId: participant.userId,
        guestEmail: participant.guestEmail
      });

      return participant;
    } catch (error) {
      logger.error('Failed to add meeting participant', { 
        error: error.message, 
        meetingId, 
        participantData 
      });
      throw error;
    }
  }

  async getMeetingsByUser(userId, options = {}) {
    const {
      status = null,
      limit = 50,
      offset = 0,
      includeParticipations = true
    } = options;

    const whereClause = {
      OR: [
        { ownerId: userId },
        ...(includeParticipations ? [{
          participants: {
            some: { userId }
          }
        }] : [])
      ]
    };

    if (status) {
      whereClause.status = status;
    }

    return this.prisma.meeting.findMany({
      where: whereClause,
      include: {
        owner: true,
        participants: {
          include: { user: true }
        },
        _count: {
          select: {
            participants: true,
            recordings: true,
            chatMessages: true
          }
        }
      },
      orderBy: { startTime: 'desc' },
      take: limit,
      skip: offset
    });
  }

  // Session management methods
  async createUserSession(sessionData) {
    try {
      // Clean up expired sessions for the user
      await this.prisma.userSession.updateMany({
        where: {
          userId: sessionData.userId,
          expiresAt: { lt: new Date() }
        },
        data: { isActive: false }
      });

      // Limit active sessions per user (max 5)
      const activeSessions = await this.prisma.userSession.count({
        where: {
          userId: sessionData.userId,
          isActive: true
        }
      });

      if (activeSessions >= 5) {
        // Deactivate oldest session
        const oldestSession = await this.prisma.userSession.findFirst({
          where: {
            userId: sessionData.userId,
            isActive: true
          },
          orderBy: { lastActivityAt: 'asc' }
        });

        if (oldestSession) {
          await this.prisma.userSession.update({
            where: { id: oldestSession.id },
            data: { isActive: false }
          });
        }
      }

      const session = await this.prisma.userSession.create({
        data: sessionData
      });

      logger.info('User session created', { 
        sessionId: session.id, 
        userId: session.userId 
      });

      return session;
    } catch (error) {
      logger.error('Failed to create user session', { 
        error: error.message, 
        sessionData 
      });
      throw error;
    }
  }

  async getActiveSession(sessionToken) {
    return this.prisma.userSession.findFirst({
      where: {
        sessionToken,
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });
  }

  async updateSessionActivity(sessionId) {
    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() }
    });
  }

  // Audit logging methods
  async createAuditLog(auditData) {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: auditData
      });

      return auditLog;
    } catch (error) {
      logger.error('Failed to create audit log', { 
        error: error.message, 
        auditData 
      });
      // Don't throw error for audit logs to avoid breaking main functionality
      return null;
    }
  }

  // Notification methods
  async createNotification(notificationData) {
    try {
      const notification = await this.prisma.notification.create({
        data: notificationData
      });

      logger.info('Notification created', { 
        notificationId: notification.id, 
        userId: notification.userId,
        type: notification.type 
      });

      return notification;
    } catch (error) {
      logger.error('Failed to create notification', { 
        error: error.message, 
        notificationData 
      });
      throw error;
    }
  }

  async getUserNotifications(userId, options = {}) {
    const { limit = 20, offset = 0, unreadOnly = false } = options;

    const whereClause = { userId };
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    return this.prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  async markNotificationAsRead(notificationId, userId) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }

  // System configuration methods
  async getSystemConfig(key) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key }
    });

    if (!config) return null;

    // Parse value based on data type
    switch (config.dataType) {
      case 'number':
        return { ...config, value: parseFloat(config.value) };
      case 'boolean':
        return { ...config, value: config.value === 'true' };
      case 'json':
        return { ...config, value: JSON.parse(config.value) };
      default:
        return config;
    }
  }

  async updateSystemConfig(key, value) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key }
    });

    if (!config) {
      throw new Error(`System config key '${key}' not found`);
    }

    if (!config.isEditable) {
      throw new Error(`System config key '${key}' is not editable`);
    }

    // Convert value to string for storage
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    return this.prisma.systemConfig.update({
      where: { key },
      data: { value: stringValue }
    });
  }

  // Database maintenance methods
  async cleanupExpiredSessions() {
    const result = await this.prisma.userSession.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true
      },
      data: { isActive: false }
    });

    logger.info('Expired sessions cleaned up', { count: result.count });
    return result;
  }

  async cleanupOldAuditLogs(retentionDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    logger.info('Old audit logs cleaned up', { count: result.count, retentionDays });
    return result;
  }

  async getHealthCheck() {
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Get basic stats
      const stats = await Promise.all([
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.meeting.count({ where: { status: 'ACTIVE' } }),
        this.prisma.userSession.count({ where: { isActive: true } })
      ]);

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stats: {
          activeUsers: stats[0],
          activeMeetings: stats[1],
          activeSessions: stats[2]
        }
      };
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Connection management
  async connect() {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database', { error: error.message });
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from database', { error: error.message });
      throw error;
    }
  }
}

// Singleton instance
let databaseService = null;

function getDatabaseService() {
  if (!databaseService) {
    databaseService = new DatabaseService();
  }
  return databaseService;
}

module.exports = {
  DatabaseService,
  getDatabaseService
};

