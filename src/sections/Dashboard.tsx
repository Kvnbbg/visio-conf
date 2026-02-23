import { useEffect, useState } from 'react';
import { 
  FolderKanban, 
  CheckCircle2, 
  Users, 
  Calendar,
  ArrowRight,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Database from '@/lib/database';
import { roleLabels, statusLabels } from '@/data/mockData';
import type { Project, User } from '@/types';

interface DashboardProps {
  onProjectClick: (projectId: string) => void;
}

export function Dashboard({ onProjectClick }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedTasks: 0,
    totalTasks: 0,
    teamMembers: 0,
  });

  useEffect(() => {
    // Load data from database
    const loadedProjects = Database.getProjects();
    const loadedUsers = Database.getUsers();
    const dbStats = Database.getStats();
    
    setProjects(loadedProjects);
    setUsers(loadedUsers);
    setStats({
      totalProjects: dbStats.totalProjects,
      activeProjects: dbStats.totalProjects, // Simplified
      completedTasks: dbStats.completedTasks,
      totalTasks: dbStats.totalTasks,
      teamMembers: dbStats.activeUsers,
    });

    // Log view activity
    Database.logActivity('view_changed', { view: 'dashboard' });
  }, []);

  const activeProjects = projects.filter(p => p.status !== 'ready');
  const completedProjects = projects.filter(p => p.status === 'ready');

  const dashboardStats = [
    { 
      label: 'Projets actifs', 
      value: stats.totalProjects, 
      total: stats.totalProjects + 5,
      icon: FolderKanban, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50',
      trend: '+2 ce mois'
    },
    { 
      label: 'Tâches terminées', 
      value: stats.completedTasks, 
      total: stats.totalTasks,
      icon: CheckCircle2, 
      color: 'text-emerald-600', 
      bgColor: 'bg-emerald-50',
      trend: stats.totalTasks > 0 ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}% de réussite` : '0%'
    },
    { 
      label: 'Membres équipe', 
      value: stats.teamMembers || 5, 
      icon: Users, 
      color: 'text-violet-600', 
      bgColor: 'bg-violet-50',
      trend: 'Tous actifs'
    },
    { 
      label: 'Productivité', 
      value: stats.totalTasks > 0 ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%` : '0%', 
      icon: TrendingUp, 
      color: 'text-amber-600', 
      bgColor: 'bg-amber-50',
      trend: 'Ce mois'
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Bonjour, {Database.getCurrentUser()?.name || 'Utilisateur'} !
          </h2>
          <p className="text-slate-500 mt-1">
            Voici l'aperçu de l'activité de votre équipe. Tout semble bien avancer.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar className="w-4 h-4" />
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className="border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color} transition-transform group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {stat.trend}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-slate-900">
                    {typeof stat.value === 'number' ? stat.value : stat.value}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
                  {stat.total && typeof stat.value === 'number' && stat.total > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Progression</span>
                        <span>{Math.round((stat.value / stat.total) * 100)}%</span>
                      </div>
                      <Progress value={(stat.value / stat.total) * 100} className="h-1.5" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Projets en cours</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-600"
              onClick={() => Database.logActivity('view_changed', { view: 'projects' })}
            >
              Voir tous <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {activeProjects.slice(0, 5).map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onClick={() => {
                  Database.logActivity('view_changed', { view: 'project_detail', projectId: project.id });
                  onProjectClick(project.id);
                }}
              />
            ))}
            {activeProjects.length === 0 && (
              <Card className="border-slate-200">
                <CardContent className="p-8 text-center">
                  <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Aucun projet en cours</p>
                  <Button 
                    className="mt-4 bg-slate-900"
                    onClick={() => Database.logActivity('project_created', { source: 'dashboard_empty' })}
                  >
                    Créer un projet
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Team Members */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-900">Équipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(users.length > 0 ? users : [
                { id: '1', name: 'Marie Dubois', avatar: 'MD', role: 'coordinator', email: '' },
                { id: '2', name: 'Thomas Laurent', avatar: 'TL', role: 'presenter', email: '' },
                { id: '3', name: 'Sophie Martin', avatar: 'SM', role: 'designer', email: '' },
              ] as User[]).map((member) => (
                <div key={member.id} className="flex items-center gap-3 group">
                  <Avatar className="w-10 h-10 bg-slate-200 group-hover:bg-slate-800 transition-colors">
                    <AvatarFallback className="bg-slate-200 text-slate-700 group-hover:bg-slate-800 group-hover:text-white text-sm transition-colors">
                      {member.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{member.name}</p>
                    <p className="text-xs text-slate-500">{roleLabels[member.role].label}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${member.id === '1' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Completed Projects */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-900">Projets terminés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {completedProjects.slice(0, 3).map((project) => (
                <div 
                  key={project.id} 
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => onProjectClick(project.id)}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{project.title}</p>
                    <p className="text-xs text-slate-500">
                      Terminé le {project.deadline?.toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
              {completedProjects.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  Aucun projet terminé
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Astuce du jour</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Assignez des rôles clairs à chaque membre pour une collaboration plus fluide et efficace.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const status = statusLabels[project.status];
  const daysLeft = project.deadline 
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card 
      className="border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{status.icon}</span>
            <div>
              <h4 className="font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
                {project.title}
              </h4>
              <p className="text-sm text-slate-500 line-clamp-1">{project.description}</p>
            </div>
          </div>
          <Badge variant="secondary" className={status.color}>
            {status.label}
          </Badge>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Progression</span>
              <span>{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>
          
          {daysLeft !== null && (
            <div className={`text-xs font-medium ${daysLeft < 7 ? 'text-amber-600' : 'text-slate-500'}`}>
              {daysLeft > 0 ? `${daysLeft} jours restants` : 'En retard'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <div className="flex -space-x-2">
            {project.team.slice(0, 3).map((member) => (
              <Avatar key={member.id} className="w-7 h-7 border-2 border-white bg-slate-200">
                <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                  {member.avatar}
                </AvatarFallback>
              </Avatar>
            ))}
            {project.team.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs text-slate-600">
                +{project.team.length - 3}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            {project.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
