import { useState } from 'react';
import { 
  TrendingUp, 
  FolderKanban, 
  CheckCircle2, 
  Clock,
  Activity,
  Calendar,
  MessageSquare,
  Download,
  RefreshCw,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useStats, 
  useActivity, 
  useProjects, 
  useUsers, 
  useDataExport
} from '@/hooks/useDatabase';
import type { ActivityType } from '@/lib/database';

const activityTypeLabels: Record<ActivityType, { label: string; color: string; icon: React.ElementType }> = {
  project_created: { label: 'Projet créé', color: 'bg-blue-100 text-blue-800', icon: FolderKanban },
  project_updated: { label: 'Projet mis à jour', color: 'bg-blue-50 text-blue-700', icon: FolderKanban },
  project_deleted: { label: 'Projet supprimé', color: 'bg-red-100 text-red-800', icon: FolderKanban },
  project_completed: { label: 'Projet terminé', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  task_created: { label: 'Tâche créée', color: 'bg-amber-100 text-amber-800', icon: CheckCircle2 },
  task_updated: { label: 'Tâche mise à jour', color: 'bg-amber-50 text-amber-700', icon: CheckCircle2 },
  task_completed: { label: 'Tâche terminée', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  task_assigned: { label: 'Tâche assignée', color: 'bg-violet-100 text-violet-800', icon: User },
  slide_created: { label: 'Slide créée', color: 'bg-cyan-100 text-cyan-800', icon: FolderKanban },
  slide_updated: { label: 'Slide mise à jour', color: 'bg-cyan-50 text-cyan-700', icon: FolderKanban },
  slide_approved: { label: 'Slide approuvée', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  feedback_created: { label: 'Feedback créé', color: 'bg-pink-100 text-pink-800', icon: MessageSquare },
  feedback_replied: { label: 'Feedback répondu', color: 'bg-pink-50 text-pink-700', icon: MessageSquare },
  feedback_resolved: { label: 'Feedback résolu', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  template_used: { label: 'Template utilisé', color: 'bg-indigo-100 text-indigo-800', icon: FolderKanban },
  event_created: { label: 'Événement créé', color: 'bg-orange-100 text-orange-800', icon: Calendar },
  event_joined: { label: 'Événement rejoint', color: 'bg-orange-50 text-orange-700', icon: Calendar },
  user_login: { label: 'Connexion', color: 'bg-slate-100 text-slate-700', icon: User },
  user_invited: { label: 'Utilisateur invité', color: 'bg-violet-100 text-violet-800', icon: User },
  view_changed: { label: 'Navigation', color: 'bg-gray-100 text-gray-600', icon: Activity },
  search_performed: { label: 'Recherche', color: 'bg-gray-100 text-gray-600', icon: Search },
  export_performed: { label: 'Export', color: 'bg-gray-100 text-gray-600', icon: Download },
};

export function AnalyticsView() {
  const { stats, refreshStats, isLoaded: statsLoaded } = useStats();
  const { activities, getRecentActivities, isLoaded: activitiesLoaded } = useActivity();
  const { projects } = useProjects();
  const { users } = useUsers();
  const { exportData } = useDataExport();
  
  const [timeRange, setTimeRange] = useState('7d');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate trends (mock comparison with previous period)
  const trends = {
    projects: { value: 12, isPositive: true },
    tasks: { value: 8, isPositive: true },
    completion: { value: 5, isPositive: true },
    events: { value: -3, isPositive: false },
  };

  const filteredActivities = getRecentActivities(50).filter(activity => {
    const matchesFilter = activityFilter === 'all' || activity.type === activityFilter;
    const matchesSearch = searchQuery === '' || 
      activity.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activityTypeLabels[activity.type]?.label.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate task completion rate over time
  const taskStats = {
    total: stats?.totalTasks || 0,
    completed: stats?.completedTasks || 0,
    rate: stats?.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0,
  };

  // Get most active users
  const userActivityMap = activities.reduce((acc, activity) => {
    acc[activity.userId] = (acc[activity.userId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostActiveUsers = Object.entries(userActivityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, count]) => {
      const user = users.find(u => u.id === userId);
      return { user, count };
    })
    .filter(item => item.user);

  if (!statsLoaded || !activitiesLoaded) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Chargement des statistiques...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Analytics & Statistiques</h2>
          <p className="text-slate-500 mt-1">
            Suivez l'activité et les performances de votre équipe
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 heures</SelectItem>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="30d">30 jours</SelectItem>
              <SelectItem value="90d">90 jours</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshStats}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={exportData} className="bg-slate-900 gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Projets"
          value={stats?.totalProjects || 0}
          trend={trends.projects}
          icon={FolderKanban}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          title="Tâches"
          value={stats?.totalTasks || 0}
          trend={trends.tasks}
          icon={CheckCircle2}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <MetricCard
          title="Taux de complétion"
          value={`${taskStats.rate}%`}
          trend={trends.completion}
          icon={TrendingUp}
          color="text-violet-600"
          bgColor="bg-violet-50"
        />
        <MetricCard
          title="Événements"
          value={stats?.totalEvents || 0}
          trend={trends.events}
          icon={Calendar}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Activité récente</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input
                    placeholder="Filtrer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-8 w-40 text-sm"
                  />
                </div>
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="h-8 w-32 text-sm">
                    <Filter className="w-3 h-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tout</SelectItem>
                    <SelectItem value="project_created">Projets</SelectItem>
                    <SelectItem value="task_completed">Tâches</SelectItem>
                    <SelectItem value="feedback_created">Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {filteredActivities.map((activity) => {
                const typeInfo = activityTypeLabels[activity.type];
                const Icon = typeInfo?.icon || Activity;
                
                return (
                  <div 
                    key={activity.id} 
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${typeInfo?.color || 'bg-slate-100'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {activity.userName}
                        </span>
                        <span className="text-slate-500">
                          {typeInfo?.label || activity.type}
                        </span>
                      </div>
                      {activity.metadata && (
                        <p className="text-sm text-slate-500 truncate">
                          {(activity.metadata as Record<string, string>).projectTitle || 
                           (activity.metadata as Record<string, string>).taskTitle || 
                           (activity.metadata as Record<string, string>).eventTitle ||
                           JSON.stringify(activity.metadata).slice(0, 50)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(activity.timestamp).toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                );
              })}
              {filteredActivities.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  Aucune activité trouvée
                </p>
              )}
            </CardContent>
          </Card>

          {/* Task Completion Chart */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Progression des tâches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Tâches terminées</span>
                    <span className="font-medium text-slate-900">
                      {taskStats.completed} / {taskStats.total}
                    </span>
                  </div>
                  <Progress value={taskStats.rate} className="h-3" />
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900">
                      {projects.reduce((acc, p) => acc + p.tasks.filter(t => t.status === 'todo').length, 0)}
                    </p>
                    <p className="text-xs text-slate-500">À faire</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-700">
                      {projects.reduce((acc, p) => acc + p.tasks.filter(t => t.status === 'in_progress').length, 0)}
                    </p>
                    <p className="text-xs text-blue-600">En cours</p>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-700">
                      {taskStats.completed}
                    </p>
                    <p className="text-xs text-emerald-600">Terminées</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Most Active Users */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Membres les plus actifs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mostActiveUsers.map(({ user, count }, index) => (
                <div key={user!.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                    {index + 1}
                  </div>
                  <Avatar className="w-10 h-10 bg-slate-200">
                    <AvatarFallback className="bg-slate-200 text-slate-700">
                      {user!.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{user!.name}</p>
                    <p className="text-xs text-slate-500">{count} actions</p>
                  </div>
                </div>
              ))}
              {mostActiveUsers.length === 0 && (
                <p className="text-center text-slate-500 py-4">
                  Aucune activité enregistrée
                </p>
              )}
            </CardContent>
          </Card>

          {/* Activity Types Distribution */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Types d'activité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(
                  activities.reduce((acc, activity) => {
                    acc[activity.type] = (acc[activity.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([type, count]) => {
                    const typeInfo = activityTypeLabels[type as ActivityType];
                    const percentage = Math.round((count / activities.length) * 100);
                    
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${typeInfo?.color.split(' ')[0] || 'bg-slate-300'}`} />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">{typeInfo?.label || type}</span>
                            <span className="font-medium text-slate-900">{count}</span>
                          </div>
                          <Progress value={percentage} className="h-1 mt-1" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-5">
              <h4 className="font-semibold text-slate-900 mb-4">En résumé</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total activités</span>
                  <span className="font-medium text-slate-900">{activities.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Feedbacks</span>
                  <span className="font-medium text-slate-900">{stats?.totalFeedbacks || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Utilisateurs actifs</span>
                  <span className="font-medium text-slate-900">{stats?.activeUsers || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Dernière activité</span>
                  <span className="font-medium text-slate-900">
                    {stats?.lastActivity 
                      ? new Date(stats.lastActivity).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                      : '-'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  trend: { value: number; isPositive: boolean };
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function MetricCard({ title, value, trend, icon: Icon, color, bgColor }: MetricCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl ${bgColor}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend.isPositive ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {Math.abs(trend.value)}%
          </div>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
