// Database system using localStorage for persistence
// Tracks all user actions and maintains application state

import type { User, Project, Task, CalendarEvent, Feedback } from '@/types';

// Database keys
const DB_KEYS = {
  PROJECTS: 'prezoteam_projects',
  USERS: 'prezoteam_users',
  EVENTS: 'prezoteam_events',
  FEEDBACKS: 'prezoteam_feedbacks',
  ACTIVITY_LOG: 'prezoteam_activity_log',
  CURRENT_USER: 'prezoteam_current_user',
  SETTINGS: 'prezoteam_settings',
  TEMPLATES_USAGE: 'prezoteam_templates_usage',
} as const;

// Activity/Event types
export type ActivityType = 
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'project_completed'
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'task_assigned'
  | 'slide_created'
  | 'slide_updated'
  | 'slide_approved'
  | 'feedback_created'
  | 'feedback_replied'
  | 'feedback_resolved'
  | 'template_used'
  | 'event_created'
  | 'event_joined'
  | 'user_login'
  | 'user_invited'
  | 'view_changed'
  | 'search_performed'
  | 'export_performed';

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  projectId?: string;
  taskId?: string;
}

export interface DatabaseStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalEvents: number;
  totalFeedbacks: number;
  activeUsers: number;
  lastActivity: number;
}

// Generic database operations
class Database {
  // Initialize database with default data
  static init(): void {
    if (typeof window === 'undefined') return;
    
    // Check if already initialized
    if (localStorage.getItem(DB_KEYS.PROJECTS)) return;
    
    // Set initial data
    this.setProjects([]);
    this.setUsers([]);
    this.setEvents([]);
    this.setFeedbacks([]);
    this.setActivityLog([]);
    this.setSettings({ theme: 'light', language: 'fr' });
    this.setTemplatesUsage({});
  }

  // Projects
  static getProjects(): Project[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(DB_KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  }

  static setProjects(projects: Project[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_KEYS.PROJECTS, JSON.stringify(projects));
  }

  static addProject(project: Project): void {
    const projects = this.getProjects();
    projects.push(project);
    this.setProjects(projects);
    this.logActivity('project_created', { projectId: project.id, projectTitle: project.title });
  }

  static updateProject(projectId: string, updates: Partial<Project>): void {
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...updates };
      this.setProjects(projects);
      this.logActivity('project_updated', { projectId, updates: Object.keys(updates) });
    }
  }

  static deleteProject(projectId: string): void {
    const projects = this.getProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    this.setProjects(filtered);
    this.logActivity('project_deleted', { projectId });
  }

  // Tasks
  static addTask(projectId: string, task: Task): void {
    const projects = this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      project.tasks.push(task);
      this.setProjects(projects);
      this.logActivity('task_created', { projectId, taskId: task.id, taskTitle: task.title });
    }
  }

  static updateTask(projectId: string, taskId: string, updates: Partial<Task>): void {
    const projects = this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const task = project.tasks.find(t => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
        this.setProjects(projects);
        
        if (updates.status === 'done') {
          this.logActivity('task_completed', { projectId, taskId, taskTitle: task.title });
        } else {
          this.logActivity('task_updated', { projectId, taskId, updates: Object.keys(updates) });
        }
      }
    }
  }

  // Users
  static getUsers(): User[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(DB_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  static setUsers(users: User[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  }

  static addUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    this.setUsers(users);
    this.logActivity('user_invited', { userId: user.id, userName: user.name, userEmail: user.email });
  }

  // Calendar Events
  static getEvents(): CalendarEvent[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(DB_KEYS.EVENTS);
    return data ? JSON.parse(data) : [];
  }

  static setEvents(events: CalendarEvent[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_KEYS.EVENTS, JSON.stringify(events));
  }

  static addEvent(event: CalendarEvent): void {
    const events = this.getEvents();
    events.push(event);
    this.setEvents(events);
    this.logActivity('event_created', { 
      eventId: event.id, 
      eventTitle: event.title,
      eventType: event.type,
      eventDate: event.date 
    });
  }

  // Feedbacks
  static getFeedbacks(): Feedback[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(DB_KEYS.FEEDBACKS);
    return data ? JSON.parse(data) : [];
  }

  static setFeedbacks(feedbacks: Feedback[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_KEYS.FEEDBACKS, JSON.stringify(feedbacks));
  }

  static addFeedback(feedback: Feedback): void {
    const feedbacks = this.getFeedbacks();
    feedbacks.push(feedback);
    this.setFeedbacks(feedbacks);
    this.logActivity('feedback_created', { 
      feedbackId: feedback.id, 
      feedbackType: feedback.type,
      projectId: feedback.projectId 
    });
  }

  // Activity Log
  static getActivityLog(): Activity[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(DB_KEYS.ACTIVITY_LOG);
    return data ? JSON.parse(data) : [];
  }

  static setActivityLog(activities: Activity[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_KEYS.ACTIVITY_LOG, JSON.stringify(activities));
  }

  static logActivity(type: ActivityType, metadata?: Record<string, unknown>): Activity {
    const currentUser = this.getCurrentUser();
    const activity: Activity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId: currentUser?.id || 'anonymous',
      userName: currentUser?.name || 'Anonymous',
      timestamp: Date.now(),
      metadata,
    };

    const activities = this.getActivityLog();
    activities.unshift(activity); // Add to beginning
    
    // Keep only last 1000 activities
    if (activities.length > 1000) {
      activities.length = 1000;
    }
    
    this.setActivityLog(activities);
    return activity;
  }

  // Current User
  static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(DB_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  }

  static setCurrentUser(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
    this.logActivity('user_login', { userId: user.id, userName: user.name });
  }

  // Settings
  static getSettings(): Record<string, unknown> {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(DB_KEYS.SETTINGS);
    return data ? JSON.parse(data) : {};
  }

  static setSettings(settings: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Template Usage Tracking
  static getTemplatesUsage(): Record<string, number> {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(DB_KEYS.TEMPLATES_USAGE);
    return data ? JSON.parse(data) : {};
  }

  static trackTemplateUsage(templateId: string): void {
    const usage = this.getTemplatesUsage();
    usage[templateId] = (usage[templateId] || 0) + 1;
    localStorage.setItem(DB_KEYS.TEMPLATES_USAGE, JSON.stringify(usage));
    this.logActivity('template_used', { templateId, usageCount: usage[templateId] });
  }

  static setTemplatesUsage(usage: Record<string, number>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DB_KEYS.TEMPLATES_USAGE, JSON.stringify(usage));
  }

  // Statistics
  static getStats(): DatabaseStats {
    const projects = this.getProjects();
    const events = this.getEvents();
    const feedbacks = this.getFeedbacks();
    const activities = this.getActivityLog();
    const users = this.getUsers();

    const allTasks = projects.flatMap(p => p.tasks);
    const completedTasks = allTasks.filter(t => t.status === 'done');

    return {
      totalProjects: projects.length,
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      totalEvents: events.length,
      totalFeedbacks: feedbacks.length,
      activeUsers: users.length,
      lastActivity: activities[0]?.timestamp || 0,
    };
  }

  // Search functionality
  static search(query: string): {
    projects: Project[];
    tasks: (Task & { projectId: string; projectTitle: string })[];
    users: User[];
  } {
    const projects = this.getProjects();
    const users = this.getUsers();
    const lowerQuery = query.toLowerCase();

    const matchedProjects = projects.filter(p =>
      p.title.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery)
    );

    const matchedTasks: (Task & { projectId: string; projectTitle: string })[] = [];
    projects.forEach(p => {
      p.tasks.forEach(t => {
        if (t.title.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery)) {
          matchedTasks.push({ ...t, projectId: p.id, projectTitle: p.title });
        }
      });
    });

    const matchedUsers = users.filter(u =>
      u.name.toLowerCase().includes(lowerQuery) ||
      u.email.toLowerCase().includes(lowerQuery)
    );

    return { projects: matchedProjects, tasks: matchedTasks, users: matchedUsers };
  }

  // Export data
  static exportAll(): string {
    const data = {
      projects: this.getProjects(),
      users: this.getUsers(),
      events: this.getEvents(),
      feedbacks: this.getFeedbacks(),
      activities: this.getActivityLog(),
      stats: this.getStats(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  // Reset database
  static reset(): void {
    if (typeof window === 'undefined') return;
    Object.values(DB_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    this.init();
  }
}

export default Database;
