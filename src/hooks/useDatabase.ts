import { useState, useEffect, useCallback } from 'react';
import Database, { type Activity, type DatabaseStats } from '@/lib/database';
import type { ActivityType } from '@/lib/database';
import type { Project, User, Task, CalendarEvent, Feedback } from '@/types';

// Hook for managing projects
export function useProjects() {
  const [projects, setProjectsState] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Database.init();
    setProjectsState(Database.getProjects());
    setIsLoaded(true);
  }, []);

  const setProjects = useCallback((newProjects: Project[]) => {
    Database.setProjects(newProjects);
    setProjectsState(newProjects);
  }, []);

  const addProject = useCallback((project: Project) => {
    Database.addProject(project);
    setProjectsState(Database.getProjects());
  }, []);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    Database.updateProject(projectId, updates);
    setProjectsState(Database.getProjects());
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    Database.deleteProject(projectId);
    setProjectsState(Database.getProjects());
  }, []);

  // Task operations
  const addTask = useCallback((projectId: string, task: Task) => {
    Database.addTask(projectId, task);
    setProjectsState(Database.getProjects());
  }, []);

  const updateTask = useCallback((projectId: string, taskId: string, updates: Partial<Task>) => {
    Database.updateTask(projectId, taskId, updates);
    setProjectsState(Database.getProjects());
  }, []);

  const getProjectById = useCallback((projectId: string) => {
    return projects.find(p => p.id === projectId);
  }, [projects]);

  return {
    projects,
    isLoaded,
    setProjects,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    getProjectById,
  };
}

// Hook for managing users
export function useUsers() {
  const [users, setUsersState] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Database.init();
    setUsersState(Database.getUsers());
    setIsLoaded(true);
  }, []);

  const addUser = useCallback((user: User) => {
    Database.addUser(user);
    setUsersState(Database.getUsers());
  }, []);

  const getUserById = useCallback((userId: string) => {
    return users.find(u => u.id === userId);
  }, [users]);

  return {
    users,
    isLoaded,
    addUser,
    getUserById,
  };
}

// Hook for managing calendar events
export function useEvents() {
  const [events, setEventsState] = useState<CalendarEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Database.init();
    setEventsState(Database.getEvents());
    setIsLoaded(true);
  }, []);

  const addEvent = useCallback((event: CalendarEvent) => {
    Database.addEvent(event);
    setEventsState(Database.getEvents());
  }, []);

  const getEventsForDate = useCallback((date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  }, [events]);

  const getUpcomingEvents = useCallback((limit: number = 5) => {
    const now = new Date();
    return events
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, limit);
  }, [events]);

  return {
    events,
    isLoaded,
    addEvent,
    getEventsForDate,
    getUpcomingEvents,
  };
}

// Hook for managing feedbacks
export function useFeedbacks() {
  const [feedbacks, setFeedbacksState] = useState<Feedback[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Database.init();
    setFeedbacksState(Database.getFeedbacks());
    setIsLoaded(true);
  }, []);

  const addFeedback = useCallback((feedback: Feedback) => {
    Database.addFeedback(feedback);
    setFeedbacksState(Database.getFeedbacks());
  }, []);

  const getFeedbacksByProject = useCallback((projectId: string) => {
    return feedbacks.filter(f => f.projectId === projectId);
  }, [feedbacks]);

  return {
    feedbacks,
    isLoaded,
    addFeedback,
    getFeedbacksByProject,
  };
}

// Hook for activity tracking
export function useActivity() {
  const [activities, setActivitiesState] = useState<Activity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Database.init();
    setActivitiesState(Database.getActivityLog());
    setIsLoaded(true);
  }, []);

  const logActivity = useCallback((type: ActivityType, metadata?: Record<string, unknown>) => {
    const activity = Database.logActivity(type, metadata);
    setActivitiesState(Database.getActivityLog());
    return activity;
  }, []);

  const getRecentActivities = useCallback((limit: number = 20) => {
    return activities.slice(0, limit);
  }, [activities]);

  const getActivitiesByUser = useCallback((userId: string) => {
    return activities.filter(a => a.userId === userId);
  }, [activities]);

  const getActivitiesByType = useCallback((type: ActivityType) => {
    return activities.filter(a => a.type === type);
  }, [activities]);

  return {
    activities,
    isLoaded,
    logActivity,
    getRecentActivities,
    getActivitiesByUser,
    getActivitiesByType,
  };
}

// Hook for statistics
export function useStats() {
  const [stats, setStatsState] = useState<DatabaseStats | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Database.init();
    setStatsState(Database.getStats());
    setIsLoaded(true);
  }, []);

  const refreshStats = useCallback(() => {
    setStatsState(Database.getStats());
  }, []);

  return {
    stats,
    isLoaded,
    refreshStats,
  };
}

// Hook for search
export function useSearch() {
  const search = useCallback((query: string) => {
    return Database.search(query);
  }, []);

  return { search };
}

// Hook for current user
export function useCurrentUser() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Database.init();
    setCurrentUserState(Database.getCurrentUser());
    setIsLoaded(true);
  }, []);

  const setCurrentUser = useCallback((user: User) => {
    Database.setCurrentUser(user);
    setCurrentUserState(user);
  }, []);

  return {
    currentUser,
    isLoaded,
    setCurrentUser,
  };
}

// Hook for template usage
export function useTemplateTracking() {
  const trackTemplateUsage = useCallback((templateId: string) => {
    Database.trackTemplateUsage(templateId);
  }, []);

  const getTemplateUsage = useCallback(() => {
    return Database.getTemplatesUsage();
  }, []);

  return {
    trackTemplateUsage,
    getTemplateUsage,
  };
}

// Hook for data export
export function useDataExport() {
  const exportData = useCallback(() => {
    const data = Database.exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prezoteam_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return { exportData };
}

// Combined hook for all database operations
export function useDatabase() {
  const projects = useProjects();
  const users = useUsers();
  const events = useEvents();
  const feedbacks = useFeedbacks();
  const activity = useActivity();
  const stats = useStats();
  const search = useSearch();
  const currentUser = useCurrentUser();
  const templateTracking = useTemplateTracking();
  const dataExport = useDataExport();

  return {
    projects,
    users,
    events,
    feedbacks,
    activity,
    stats,
    search,
    currentUser,
    templateTracking,
    dataExport,
  };
}
