/**
 * Database Seed Script for Visio-Conf v3.0
 * Initializes the database with sample data and system configuration
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create system configuration
    await seedSystemConfig();
    
    // Create sample users
    const users = await seedUsers();
    
    // Create sample meetings
    await seedMeetings(users);
    
    // Create notifications
    await seedNotifications(users);
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

async function seedSystemConfig() {
  console.log('📋 Seeding system configuration...');
  
  const configs = [
    {
      key: 'app_version',
      value: '3.0.0',
      description: 'Current application version',
      category: 'system',
      dataType: 'string',
      isPublic: true
    },
    {
      key: 'max_meeting_duration',
      value: '480',
      description: 'Maximum meeting duration in minutes',
      category: 'meetings',
      dataType: 'number',
      isPublic: false
    },
    {
      key: 'max_participants_per_meeting',
      value: '50',
      description: 'Maximum number of participants per meeting',
      category: 'meetings',
      dataType: 'number',
      isPublic: false
    },
    {
      key: 'recording_enabled',
      value: 'true',
      description: 'Enable meeting recording feature',
      category: 'features',
      dataType: 'boolean',
      isPublic: false
    },
    {
      key: 'screen_share_enabled',
      value: 'true',
      description: 'Enable screen sharing feature',
      category: 'features',
      dataType: 'boolean',
      isPublic: false
    },
    {
      key: 'chat_enabled',
      value: 'true',
      description: 'Enable chat feature',
      category: 'features',
      dataType: 'boolean',
      isPublic: false
    },
    {
      key: 'whiteboard_enabled',
      value: 'false',
      description: 'Enable whiteboard feature',
      category: 'features',
      dataType: 'boolean',
      isPublic: false
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      description: 'Enable maintenance mode',
      category: 'system',
      dataType: 'boolean',
      isPublic: true
    },
    {
      key: 'supported_languages',
      value: '["fr", "en", "es", "zh"]',
      description: 'List of supported languages',
      category: 'localization',
      dataType: 'json',
      isPublic: true
    },
    {
      key: 'default_meeting_settings',
      value: JSON.stringify({
        duration: 60,
        maxParticipants: 10,
        requireAuth: true,
        allowScreenShare: true,
        allowChat: true,
        allowWhiteboard: false,
        isRecording: false
      }),
      description: 'Default settings for new meetings',
      category: 'meetings',
      dataType: 'json',
      isPublic: false
    }
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: config,
      create: config
    });
  }

  console.log(`✅ Created ${configs.length} system configuration entries`);
}

async function seedUsers() {
  console.log('👥 Seeding users...');
  
  const users = [];
  
  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@visio-conf.com' },
    update: {},
    create: {
      email: 'admin@visio-conf.com',
      firstName: 'Admin',
      lastName: 'System',
      displayName: 'System Administrator',
      language: 'fr',
      timezone: 'Europe/Paris',
      passwordHash: await bcrypt.hash('admin123!', 12),
      isActive: true,
      isVerified: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
      loginCount: 1
    }
  });
  users.push(adminUser);

  // Demo users
  const demoUsers = [
    {
      email: 'jean.dupont@example.com',
      firstName: 'Jean',
      lastName: 'Dupont',
      displayName: 'Jean Dupont',
      language: 'fr'
    },
    {
      email: 'marie.martin@example.com',
      firstName: 'Marie',
      lastName: 'Martin',
      displayName: 'Marie Martin',
      language: 'fr'
    },
    {
      email: 'john.smith@example.com',
      firstName: 'John',
      lastName: 'Smith',
      displayName: 'John Smith',
      language: 'en'
    },
    {
      email: 'ana.garcia@example.com',
      firstName: 'Ana',
      lastName: 'García',
      displayName: 'Ana García',
      language: 'es'
    }
  ];

  for (const userData of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        timezone: 'Europe/Paris',
        passwordHash: await bcrypt.hash('demo123!', 12),
        isActive: true,
        isVerified: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        franceTravailId: `ft_${userData.email.split('@')[0]}`,
        franceTravailData: {
          sub: `ft_${userData.email.split('@')[0]}`,
          given_name: userData.firstName,
          family_name: userData.lastName,
          email: userData.email
        }
      }
    });
    users.push(user);
  }

  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function seedMeetings(users) {
  console.log('📅 Seeding meetings...');
  
  const meetings = [];
  const now = new Date();
  
  // Past meeting
  const pastMeeting = await prisma.meeting.create({
    data: {
      title: 'Réunion d\'équipe - Bilan mensuel',
      description: 'Bilan des activités du mois et planification des prochaines étapes',
      meetingId: 'meeting_past_001',
      startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      endTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour duration
      duration: 60,
      timezone: 'Europe/Paris',
      status: 'ENDED',
      actualStartTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      actualEndTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      ownerId: users[0].id,
      isRecording: true,
      allowScreenShare: true,
      allowChat: true
    }
  });
  meetings.push(pastMeeting);

  // Current meeting
  const currentMeeting = await prisma.meeting.create({
    data: {
      title: 'Formation Visio-Conf v3.0',
      description: 'Présentation des nouvelles fonctionnalités de la plateforme',
      meetingId: 'meeting_current_001',
      startTime: new Date(now.getTime() - 30 * 60 * 1000), // Started 30 minutes ago
      endTime: new Date(now.getTime() + 30 * 60 * 1000), // Ends in 30 minutes
      duration: 60,
      timezone: 'Europe/Paris',
      status: 'ACTIVE',
      actualStartTime: new Date(now.getTime() - 30 * 60 * 1000),
      ownerId: users[1].id,
      isRecording: false,
      allowScreenShare: true,
      allowChat: true,
      maxParticipants: 20
    }
  });
  meetings.push(currentMeeting);

  // Future meetings
  const futureMeetings = [
    {
      title: 'Entretien client - Projet Alpha',
      description: 'Discussion des besoins et spécifications du projet',
      meetingId: 'meeting_future_001',
      startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      duration: 45,
      ownerId: users[2].id
    },
    {
      title: 'Webinaire - Sécurité informatique',
      description: 'Sensibilisation aux bonnes pratiques de sécurité',
      meetingId: 'meeting_future_002',
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // In 3 days
      duration: 90,
      ownerId: users[3].id,
      isPublic: true,
      maxParticipants: 100
    }
  ];

  for (const meetingData of futureMeetings) {
    const meeting = await prisma.meeting.create({
      data: {
        ...meetingData,
        endTime: new Date(meetingData.startTime.getTime() + meetingData.duration * 60 * 1000),
        timezone: 'Europe/Paris',
        status: 'SCHEDULED',
        allowScreenShare: true,
        allowChat: true
      }
    });
    meetings.push(meeting);
  }

  // Add participants to meetings
  for (const meeting of meetings) {
    // Add owner as host
    await prisma.meetingParticipant.create({
      data: {
        meetingId: meeting.id,
        userId: meeting.ownerId,
        role: 'HOST',
        status: meeting.status === 'ACTIVE' ? 'JOINED' : 
                meeting.status === 'ENDED' ? 'LEFT' : 'ACCEPTED',
        joinedAt: meeting.status === 'ACTIVE' || meeting.status === 'ENDED' ? 
                  meeting.actualStartTime : null,
        leftAt: meeting.status === 'ENDED' ? meeting.actualEndTime : null,
        canShare: true,
        canChat: true,
        canRecord: true
      }
    });

    // Add other participants
    const otherUsers = users.filter(u => u.id !== meeting.ownerId).slice(0, 2);
    for (const user of otherUsers) {
      await prisma.meetingParticipant.create({
        data: {
          meetingId: meeting.id,
          userId: user.id,
          role: 'PARTICIPANT',
          status: meeting.status === 'ACTIVE' ? 'JOINED' : 
                  meeting.status === 'ENDED' ? 'LEFT' : 'INVITED',
          joinedAt: meeting.status === 'ACTIVE' || meeting.status === 'ENDED' ? 
                    new Date(meeting.actualStartTime.getTime() + Math.random() * 10 * 60 * 1000) : null,
          leftAt: meeting.status === 'ENDED' ? 
                  new Date(meeting.actualEndTime.getTime() - Math.random() * 5 * 60 * 1000) : null
        }
      });
    }

    // Add guest participant for public meetings
    if (meeting.isPublic) {
      await prisma.meetingParticipant.create({
        data: {
          meetingId: meeting.id,
          guestName: 'Invité Anonyme',
          guestEmail: 'guest@example.com',
          role: 'OBSERVER',
          status: 'INVITED'
        }
      });
    }
  }

  // Add chat messages for active/past meetings
  const activeMeetings = meetings.filter(m => m.status === 'ACTIVE' || m.status === 'ENDED');
  for (const meeting of activeMeetings) {
    const participants = await prisma.meetingParticipant.findMany({
      where: { meetingId: meeting.id },
      include: { user: true }
    });

    const messages = [
      'Bonjour tout le monde !',
      'Merci pour cette présentation très intéressante.',
      'Avez-vous des questions ?',
      'Pouvez-vous partager votre écran ?',
      'Parfait, merci pour ces informations.',
      'À bientôt pour la prochaine réunion !'
    ];

    for (let i = 0; i < messages.length; i++) {
      const participant = participants[i % participants.length];
      await prisma.chatMessage.create({
        data: {
          meetingId: meeting.id,
          content: messages[i],
          senderId: participant.userId,
          senderName: participant.user?.displayName || participant.guestName || 'Anonyme',
          senderEmail: participant.user?.email || participant.guestEmail,
          sentAt: new Date(meeting.actualStartTime.getTime() + (i + 1) * 5 * 60 * 1000)
        }
      });
    }
  }

  console.log(`✅ Created ${meetings.length} meetings with participants and messages`);
  return meetings;
}

async function seedNotifications(users) {
  console.log('🔔 Seeding notifications...');
  
  const notifications = [];
  
  for (const user of users.slice(1)) { // Skip admin user
    const userNotifications = [
      {
        type: 'MEETING_INVITATION',
        title: 'Nouvelle invitation à une réunion',
        message: 'Vous avez été invité(e) à participer à la réunion "Formation Visio-Conf v3.0"',
        data: { meetingId: 'meeting_current_001' }
      },
      {
        type: 'MEETING_REMINDER',
        title: 'Rappel de réunion',
        message: 'Votre réunion "Entretien client - Projet Alpha" commence dans 15 minutes',
        data: { meetingId: 'meeting_future_001' }
      },
      {
        type: 'SYSTEM_ALERT',
        title: 'Mise à jour système',
        message: 'Visio-Conf v3.0 est maintenant disponible avec de nouvelles fonctionnalités !',
        isRead: Math.random() > 0.5
      }
    ];

    for (const notifData of userNotifications) {
      const notification = await prisma.notification.create({
        data: {
          ...notifData,
          userId: user.id,
          readAt: notifData.isRead ? new Date() : null
        }
      });
      notifications.push(notification);
    }
  }

  console.log(`✅ Created ${notifications.length} notifications`);
  return notifications;
}

// Cleanup function
async function cleanup() {
  console.log('🧹 Cleaning up...');
  await prisma.$disconnect();
}

// Run the seed
main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(cleanup);

module.exports = { main };

