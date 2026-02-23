import { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  Users, 
  ArrowRight,
  MoreHorizontal,
  FolderKanban,
  Grid3X3,
  List
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { projects } from '@/data/mockData';
import { statusLabels } from '@/data/mockData';
import type { Project } from '@/types';

interface ProjectsListProps {
  onProjectClick: (projectId: string) => void;
}

export function ProjectsList({ onProjectClick }: ProjectsListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Projets</h2>
          <p className="text-slate-500 mt-1">
            Gérez et suivez tous vos projets de présentation
          </p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-800 gap-2">
          <Plus className="w-4 h-4" />
          Nouveau projet
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher un projet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="planning">Planification</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="review">En relecture</SelectItem>
              <SelectItem value="ready">Prêt</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="flex flex-wrap gap-4">
        <StatBadge icon={FolderKanban} label="Total" value={projects.length} />
        <StatBadge icon={Calendar} label="En cours" value={projects.filter(p => p.status === 'in_progress').length} color="text-blue-600" />
        <StatBadge icon={Users} label="En relecture" value={projects.filter(p => p.status === 'review').length} color="text-amber-600" />
        <StatBadge icon={Calendar} label="Terminés" value={projects.filter(p => p.status === 'ready').length} color="text-emerald-600" />
      </div>

      {/* Projects Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectGridCard 
              key={project.id} 
              project={project} 
              onClick={() => onProjectClick(project.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <ProjectListCard 
              key={project.id} 
              project={project} 
              onClick={() => onProjectClick(project.id)}
            />
          ))}
        </div>
      )}

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Aucun projet trouvé</h3>
          <p className="text-slate-500 mt-1">Essayez de modifier vos filtres ou créez un nouveau projet</p>
        </div>
      )}
    </div>
  );
}

function StatBadge({ 
  icon: Icon, 
  label, 
  value, 
  color = 'text-slate-600' 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function ProjectGridCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const status = statusLabels[project.status];
  const daysLeft = project.deadline 
    ? Math.ceil((project.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card 
      className="border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <Badge variant="secondary" className={status.color}>
            {status.icon} {status.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Modifier</DropdownMenuItem>
              <DropdownMenuItem>Dupliquer</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Archiver</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-semibold text-slate-900 mb-2 line-clamp-1 group-hover:text-slate-700 transition-colors">
          {project.title}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 mb-4">{project.description}</p>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Progression</span>
              <span>{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
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

            {daysLeft !== null && (
              <span className={`text-xs ${daysLeft < 7 ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                {daysLeft > 0 ? `${daysLeft}j restants` : 'En retard'}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectListCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const status = statusLabels[project.status];
  const daysLeft = project.deadline 
    ? Math.ceil((project.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card 
      className="border-slate-200 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <span className="text-2xl">{status.icon}</span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-slate-900 truncate">{project.title}</h3>
            <Badge variant="secondary" className={`text-xs ${status.color}`}>
              {status.label}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 truncate">{project.description}</p>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <div className="w-32">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Avancement</span>
              <span>{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-1.5" />
          </div>

          <div className="flex -space-x-2">
            {project.team.slice(0, 2).map((member) => (
              <Avatar key={member.id} className="w-7 h-7 border-2 border-white bg-slate-200">
                <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                  {member.avatar}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>

          {daysLeft !== null && (
            <span className={`text-xs w-20 text-right ${daysLeft < 7 ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
              {daysLeft > 0 ? `${daysLeft} jours` : 'En retard'}
            </span>
          )}
        </div>

        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
      </CardContent>
    </Card>
  );
}
