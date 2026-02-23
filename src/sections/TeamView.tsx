import { useState } from 'react';
import { 
  Users, 
  Plus, 
  Mail, 
  FolderKanban, 
  CheckCircle2, 
  TrendingUp,
  Award,
  MoreHorizontal,
  Search,
  Filter
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { teamMembers, projects, roleLabels, statusLabels } from '@/data/mockData';
import type { User } from '@/types';

export function TeamView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<User | null>(null);

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats for each member
  const getMemberStats = (member: User) => {
    const memberProjects = projects.filter(p => p.team.some(m => m.id === member.id));
    const memberTasks = projects.flatMap(p => 
      p.tasks.filter(t => t.assignee?.id === member.id)
    );
    const completedTasks = memberTasks.filter(t => t.status === 'done');
    
    return {
      projects: memberProjects.length,
      tasks: memberTasks.length,
      completedTasks: completedTasks.length,
      completionRate: memberTasks.length > 0 
        ? Math.round((completedTasks.length / memberTasks.length) * 100) 
        : 0
    };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Équipe</h2>
          <p className="text-slate-500 mt-1">
            Gérez votre équipe et suivez les contributions de chacun
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 gap-2">
              <Plus className="w-4 h-4" />
              Inviter un membre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter un nouveau membre</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input placeholder="collegue@entreprise.fr" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Rôle</label>
                <select className="w-full mt-1 p-2 border rounded-lg text-sm">
                  <option value="presenter">Présentateur</option>
                  <option value="designer">Designer</option>
                  <option value="content">Rédacteur</option>
                  <option value="reviewer">Relecteur</option>
                  <option value="coordinator">Coordinateur</option>
                </select>
              </div>
              <Button className="w-full bg-slate-900">Envoyer l'invitation</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          icon={Users} 
          label="Membres actifs" 
          value={teamMembers.length}
          trend="Équipe complète"
          color="text-violet-600"
          bgColor="bg-violet-50"
        />
        <StatCard 
          icon={FolderKanban} 
          label="Projets en commun" 
          value={projects.length}
          trend="Tous collaborateurs"
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard 
          icon={CheckCircle2} 
          label="Tâches terminées" 
          value={projects.flatMap(p => p.tasks).filter(t => t.status === 'done').length}
          trend="67% de réussite"
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Productivité" 
          value="+12%"
          trend="Ce mois-ci"
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher un membre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filtrer
        </Button>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const stats = getMemberStats(member);
          const role = roleLabels[member.role];
          
          return (
            <Card 
              key={member.id} 
              className="border-slate-200 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setSelectedMember(member)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 bg-slate-200 group-hover:bg-slate-800 transition-colors">
                      <AvatarFallback className="bg-slate-200 text-slate-700 group-hover:bg-slate-800 group-hover:text-white text-lg transition-colors">
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-slate-900">{member.name}</h3>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded hover:bg-slate-100"
                      >
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Voir le profil</DropdownMenuItem>
                      <DropdownMenuItem>Modifier le rôle</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Retirer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Badge className={`${role.color} mb-4`}>{role.label}</Badge>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-900">{stats.projects}</p>
                    <p className="text-xs text-slate-500">Projets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-900">{stats.tasks}</p>
                    <p className="text-xs text-slate-500">Tâches</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-900">{stats.completionRate}%</p>
                    <p className="text-xs text-slate-500">Terminé</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Taux de complétion</span>
                    <span>{stats.completedTasks}/{stats.tasks}</span>
                  </div>
                  <Progress value={stats.completionRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Member Detail Dialog */}
      {selectedMember && (
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Profil de {selectedMember.name}</DialogTitle>
            </DialogHeader>
            <MemberDetail member={selectedMember} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend,
  color,
  bgColor
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  trend: string;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl ${bgColor} ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <Badge variant="secondary" className="text-xs font-normal">
            {trend}
          </Badge>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MemberDetail({ member }: { member: User }) {
  const role = roleLabels[member.role];
  const memberProjects = projects.filter(p => p.team.some(m => m.id === member.id));
  const memberTasks = projects.flatMap(p => 
    p.tasks.filter(t => t.assignee?.id === member.id)
  );
  const completedTasks = memberTasks.filter(t => t.status === 'done');
  const inProgressTasks = memberTasks.filter(t => t.status === 'in_progress');
  const pendingTasks = memberTasks.filter(t => t.status === 'todo');

  return (
    <div className="space-y-6 pt-4">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16 bg-slate-200">
          <AvatarFallback className="bg-slate-200 text-slate-700 text-xl">
            {member.avatar}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-bold text-slate-900">{member.name}</h3>
          <p className="text-slate-500">{member.email}</p>
          <Badge className={`${role.color} mt-2`}>{role.label}</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <p className="text-2xl font-bold text-slate-900">{memberProjects.length}</p>
          <p className="text-xs text-slate-500">Projets</p>
        </div>
        <div className="text-center p-4 bg-emerald-50 rounded-lg">
          <p className="text-2xl font-bold text-emerald-700">{completedTasks.length}</p>
          <p className="text-xs text-emerald-600">Terminés</p>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-700">{inProgressTasks.length}</p>
          <p className="text-xs text-blue-600">En cours</p>
        </div>
        <div className="text-center p-4 bg-slate-100 rounded-lg">
          <p className="text-2xl font-bold text-slate-700">{pendingTasks.length}</p>
          <p className="text-xs text-slate-500">À faire</p>
        </div>
      </div>

      {/* Current Projects */}
      <div>
        <h4 className="font-semibold text-slate-900 mb-3">Projets en cours</h4>
        <div className="space-y-2">
          {memberProjects.slice(0, 3).map((project) => (
            <div key={project.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <span className="text-lg">{statusLabels[project.status].icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{project.title}</p>
                <p className="text-xs text-slate-500">{project.progress}% complété</p>
              </div>
              <Progress value={project.progress} className="w-20 h-1.5" />
            </div>
          ))}
          {memberProjects.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">Aucun projet en cours</p>
          )}
        </div>
      </div>

      {/* Recent Tasks */}
      <div>
        <h4 className="font-semibold text-slate-900 mb-3">Tâches récentes</h4>
        <div className="space-y-2">
          {memberTasks.slice(0, 4).map((task) => (
            <div 
              key={task.id} 
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                task.status === 'done' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                task.status === 'done' ? 'bg-emerald-500' :
                task.status === 'in_progress' ? 'bg-blue-500' :
                task.status === 'review' ? 'bg-amber-500' : 'bg-slate-300'
              }`} />
              <p className={`text-sm flex-1 ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                {task.title}
              </p>
              <Badge variant="outline" className="text-xs">
                {task.status === 'done' ? 'Terminé' : 
                 task.status === 'in_progress' ? 'En cours' :
                 task.status === 'review' ? 'En relecture' : 'À faire'}
              </Badge>
            </div>
          ))}
          {memberTasks.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">Aucune tâche assignée</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" className="flex-1 gap-2">
          <Mail className="w-4 h-4" />
          Contacter
        </Button>
        <Button className="flex-1 bg-slate-900 gap-2">
          <Award className="w-4 h-4" />
          Voir les contributions
        </Button>
      </div>
    </div>
  );
}
