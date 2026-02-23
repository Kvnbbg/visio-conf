import type { User, Project, TeamStats, Notification } from '@/types';

export const currentUser: User = {
  id: '1',
  name: 'Marie Dubois',
  avatar: 'MD',
  role: 'coordinator',
  email: 'marie.dubois@entreprise.fr'
};

export const teamMembers: User[] = [
  currentUser,
  {
    id: '2',
    name: 'Thomas Laurent',
    avatar: 'TL',
    role: 'presenter',
    email: 'thomas.laurent@entreprise.fr'
  },
  {
    id: '3',
    name: 'Sophie Martin',
    avatar: 'SM',
    role: 'designer',
    email: 'sophie.martin@entreprise.fr'
  },
  {
    id: '4',
    name: 'Pierre Bernard',
    avatar: 'PB',
    role: 'content',
    email: 'pierre.bernard@entreprise.fr'
  },
  {
    id: '5',
    name: 'Claire Petit',
    avatar: 'CP',
    role: 'reviewer',
    email: 'claire.petit@entreprise.fr'
  }
];

export const projects: Project[] = [
  {
    id: '1',
    title: 'Présentation Résultats Annuels 2024',
    description: 'Présentation des résultats financiers et stratégiques de l\'année 2024 au comité de direction.',
    objective: 'Démontrer la croissance et valider la stratégie 2025',
    audience: 'Comité de direction et actionnaires',
    duration: 45,
    status: 'in_progress',
    progress: 65,
    createdAt: new Date('2024-01-15'),
    deadline: new Date('2024-02-15'),
    team: [teamMembers[0], teamMembers[1], teamMembers[2]],
    tags: ['stratégique', 'financier', 'annuel'],
    slides: [
      { id: 's1', title: 'Introduction', status: 'approved', order: 1, notes: [] },
      { id: 's2', title: 'Résultats Financiers', status: 'in_review', order: 2, notes: [] },
      { id: 's3', title: 'Analyse Marché', status: 'draft', order: 3, notes: [] },
      { id: 's4', title: 'Perspectives 2025', status: 'draft', order: 4, notes: [] }
    ],
    tasks: [
      {
        id: 't1',
        title: 'Rédiger l\'introduction',
        description: 'Rédiger le texte d\'introduction avec les points clés',
        status: 'done',
        priority: 'high',
        assignee: teamMembers[3],
        dueDate: new Date('2024-01-20'),
        createdAt: new Date('2024-01-15'),
        comments: [],
        tags: ['rédaction', 'introduction']
      },
      {
        id: 't2',
        title: 'Créer les graphiques financiers',
        description: 'Concevoir les visualisations des données financières',
        status: 'in_progress',
        priority: 'high',
        assignee: teamMembers[2],
        dueDate: new Date('2024-01-25'),
        createdAt: new Date('2024-01-16'),
        comments: [],
        tags: ['design', 'dataviz']
      },
      {
        id: 't3',
        title: 'Relecture et validation',
        description: 'Relecture complète de la présentation',
        status: 'todo',
        priority: 'medium',
        assignee: teamMembers[4],
        dueDate: new Date('2024-02-10'),
        createdAt: new Date('2024-01-17'),
        comments: [],
        tags: ['relecture', 'validation']
      }
    ]
  },
  {
    id: '2',
    title: 'Lancement Nouveau Produit',
    description: 'Présentation du lancement de notre nouvelle solution digitale.',
    objective: 'Convaincre les équipes commerciales et générer l\'enthousiasme',
    audience: 'Équipes commerciales et marketing',
    duration: 30,
    status: 'planning',
    progress: 25,
    createdAt: new Date('2024-01-20'),
    deadline: new Date('2024-03-01'),
    team: [teamMembers[0], teamMembers[1], teamMembers[2], teamMembers[3]],
    tags: ['produit', 'lancement', 'commercial'],
    slides: [
      { id: 's5', title: 'Accroche', status: 'draft', order: 1, notes: [] },
      { id: 's6', title: 'Problématique', status: 'draft', order: 2, notes: [] }
    ],
    tasks: [
      {
        id: 't4',
        title: 'Définir la storyline',
        description: 'Établir la structure narrative de la présentation',
        status: 'in_progress',
        priority: 'high',
        assignee: teamMembers[0],
        dueDate: new Date('2024-01-30'),
        createdAt: new Date('2024-01-20'),
        comments: [],
        tags: ['stratégie', 'storyline']
      },
      {
        id: 't5',
        title: 'Benchmark concurrentiel',
        description: 'Analyser les présentations de la concurrence',
        status: 'todo',
        priority: 'medium',
        assignee: teamMembers[3],
        dueDate: new Date('2024-02-05'),
        createdAt: new Date('2024-01-21'),
        comments: [],
        tags: ['analyse', 'benchmark']
      }
    ]
  },
  {
    id: '3',
    title: 'Formation Équipe - Protocolaire',
    description: 'Présentation interne sur les bonnes pratiques du service protocolaire.',
    objective: 'Harmoniser les pratiques et monter en compétences',
    audience: 'Toute l\'équipe',
    duration: 60,
    status: 'ready',
    progress: 100,
    createdAt: new Date('2024-01-10'),
    deadline: new Date('2024-01-25'),
    team: [teamMembers[0], teamMembers[4]],
    tags: ['formation', 'interne', 'protocolaire'],
    slides: [
      { id: 's7', title: 'Bienvenue', status: 'approved', order: 1, notes: [] },
      { id: 's8', title: 'Standards', status: 'approved', order: 2, notes: [] },
      { id: 's9', title: 'Cas Pratiques', status: 'approved', order: 3, notes: [] }
    ],
    tasks: [
      {
        id: 't6',
        title: 'Préparer les supports',
        description: 'Finaliser tous les supports de formation',
        status: 'done',
        priority: 'high',
        assignee: teamMembers[4],
        dueDate: new Date('2024-01-20'),
        createdAt: new Date('2024-01-10'),
        comments: [],
        tags: ['préparation', 'support']
      }
    ]
  }
];

export const teamStats: TeamStats = {
  totalProjects: 12,
  activeProjects: 5,
  completedProjects: 7,
  totalTasks: 48,
  completedTasks: 32,
  teamMembers: 5
};

export const notifications: Notification[] = [
  {
    id: 'n1',
    type: 'task_completed',
    message: 'Thomas a terminé la rédaction de l\'introduction',
    projectId: '1',
    read: false,
    createdAt: new Date('2024-01-20')
  },
  {
    id: 'n2',
    type: 'comment_added',
    message: 'Nouveau commentaire sur "Créer les graphiques financiers"',
    projectId: '1',
    read: false,
    createdAt: new Date('2024-01-21')
  },
  {
    id: 'n3',
    type: 'deadline_approaching',
    message: 'Échéance dans 3 jours : Présentation Résultats Annuels',
    projectId: '1',
    read: true,
    createdAt: new Date('2024-01-22')
  }
];

export const roleLabels: Record<string, { label: string; color: string }> = {
  presenter: { label: 'Présentateur', color: 'bg-blue-100 text-blue-800' },
  designer: { label: 'Designer', color: 'bg-purple-100 text-purple-800' },
  content: { label: 'Rédacteur', color: 'bg-green-100 text-green-800' },
  reviewer: { label: 'Relecteur', color: 'bg-orange-100 text-orange-800' },
  coordinator: { label: 'Coordinateur', color: 'bg-red-100 text-red-800' }
};

export const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
  planning: { label: 'Planification', color: 'bg-gray-100 text-gray-800', icon: '📋' },
  in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: '🔄' },
  review: { label: 'En relecture', color: 'bg-yellow-100 text-yellow-800', icon: '👀' },
  ready: { label: 'Prêt', color: 'bg-green-100 text-green-800', icon: '✅' }
};

export const taskStatusLabels: Record<string, { label: string; color: string }> = {
  todo: { label: 'À faire', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  in_progress: { label: 'En cours', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  review: { label: 'En relecture', color: 'bg-amber-50 text-amber-700 border-amber-300' },
  done: { label: 'Terminé', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' }
};

export const priorityLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Moyenne', color: 'bg-amber-100 text-amber-700' },
  high: { label: 'Haute', color: 'bg-rose-100 text-rose-700' }
};
