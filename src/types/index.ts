// Types pour l'outil de préparation collaborative de présentations

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'presenter' | 'designer' | 'content' | 'reviewer' | 'coordinator';
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: User;
  dueDate?: Date;
  createdAt: Date;
  comments: Comment[];
  tags: string[];
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  createdAt: Date;
}

export interface Slide {
  id: string;
  title: string;
  content?: string;
  status: 'draft' | 'in_review' | 'approved';
  assignedTo?: User;
  order: number;
  notes: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  objective: string;
  audience: string;
  duration: number; // en minutes
  status: 'planning' | 'in_progress' | 'review' | 'ready';
  progress: number;
  createdAt: Date;
  deadline?: Date;
  team: User[];
  tasks: Task[];
  slides: Slide[];
  tags: string[];
}

export interface TeamStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  teamMembers: number;
}

export interface Notification {
  id: string;
  type: 'task_assigned' | 'task_completed' | 'comment_added' | 'deadline_approaching' | 'slide_approved';
  message: string;
  projectId: string;
  read: boolean;
  createdAt: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'meeting' | 'deadline' | 'review' | 'presentation';
  location?: string;
  isOnline: boolean;
  attendees: string[];
  projectId?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

export interface FeedbackReply {
  id: string;
  author: User;
  content: string;
  createdAt: Date;
}

export interface Feedback {
  id: string;
  author: User;
  content: string;
  type: 'suggestion' | 'issue' | 'praise' | 'question';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
  likes: number;
  dislikes: number;
  replies: FeedbackReply[];
  projectId?: string;
  slideId?: string;
}
