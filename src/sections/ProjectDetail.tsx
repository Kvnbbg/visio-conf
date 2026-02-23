import { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Target, 
  UserCircle,
  MessageSquare,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  PlayCircle,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { statusLabels, taskStatusLabels, priorityLabels, roleLabels } from '@/data/mockData';
import type { Project, Task } from '@/types';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
}

export function ProjectDetail({ project, onBack }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState<Task[]>(project.tasks);

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const status = statusLabels[project.status];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{project.title}</h2>
              <Badge variant="secondary" className={status.color}>
                {status.icon} {status.label}
              </Badge>
            </div>
            <p className="text-slate-500 mt-1">{project.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Aperçu
          </Button>
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Marquer comme prêt
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InfoCard 
          icon={Target} 
          label="Objectif" 
          value={project.objective} 
        />
        <InfoCard 
          icon={UserCircle} 
          label="Audience" 
          value={project.audience} 
        />
        <InfoCard 
          icon={Clock} 
          label="Durée" 
          value={`${project.duration} minutes`} 
        />
        <InfoCard 
          icon={Calendar} 
          label="Échéance" 
          value={project.deadline?.toLocaleDateString('fr-FR') || 'Non définie'} 
        />
      </div>

      {/* Progress Overview */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Progression globale</h3>
              <p className="text-sm text-slate-500">
                {tasks.filter(t => t.status === 'done').length} / {tasks.length} tâches terminées
              </p>
            </div>
            <span className="text-2xl font-bold text-slate-900">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-3" />
          
          <div className="grid grid-cols-4 gap-4 mt-6">
            <StatusCount label="À faire" count={tasks.filter(t => t.status === 'todo').length} />
            <StatusCount label="En cours" count={tasks.filter(t => t.status === 'in_progress').length} />
            <StatusCount label="En relecture" count={tasks.filter(t => t.status === 'review').length} />
            <StatusCount label="Terminé" count={tasks.filter(t => t.status === 'done').length} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="tasks">Tâches ({tasks.length})</TabsTrigger>
          <TabsTrigger value="slides">Slides ({project.slides.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Tasks */}
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">Tâches récentes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('tasks')}>
                  Voir tout
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {tasks.slice(0, 3).map((task) => (
                  <TaskRow key={task.id} task={task} compact />
                ))}
                {tasks.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">Aucune tâche pour le moment</p>
                )}
              </CardContent>
            </Card>

            {/* Team */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Équipe projet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.team.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <Avatar className="w-10 h-10 bg-slate-200">
                      <AvatarFallback className="bg-slate-200 text-slate-700">
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">{roleLabels[member.role].label}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {tasks.filter(t => t.assignee?.id === member.id).length} tâches
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Toutes les tâches</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle tâche
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter une tâche</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Titre</label>
                    <Input placeholder="Nom de la tâche" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Description</label>
                    <Textarea placeholder="Description détaillée" className="mt-1" />
                  </div>
                  <div className="flex gap-4">
                    <Button className="flex-1 bg-slate-900">Créer</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['todo', 'in_progress', 'review', 'done'] as const).map((status) => (
              <div key={status} className="space-y-3">
                <div className={`flex items-center justify-between p-2 rounded-lg ${taskStatusLabels[status].color} border`}>
                  <span className="text-sm font-medium">{taskStatusLabels[status].label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {tasks.filter(t => t.status === status).length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === status).map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onStatusChange={(newStatus) => updateTaskStatus(task.id, newStatus)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="slides" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Structure des slides</h3>
            <Button size="sm" className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une slide
            </Button>
          </div>

          <div className="space-y-3">
            {project.slides.sort((a, b) => a.order - b.order).map((slide, index) => (
              <SlideRow key={slide.id} slide={slide} index={index} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-slate-100">
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-sm font-medium text-slate-900 mt-0.5 line-clamp-2">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCount({ label, count }: { label: string; count: number }) {
  return (
    <div className="text-center p-3 rounded-lg bg-slate-50">
      <p className="text-2xl font-bold text-slate-900">{count}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function TaskRow({ task, compact = false }: { task: Task; compact?: boolean }) {
  const status = taskStatusLabels[task.status];
  const priority = priorityLabels[task.priority];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-all ${status.color}`}>
      {task.status === 'done' ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
      ) : task.status === 'in_progress' ? (
        <PlayCircle className="w-5 h-5 text-blue-600" />
      ) : (
        <Circle className="w-5 h-5 text-slate-400" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
          {task.title}
        </p>
        {!compact && <p className="text-xs text-slate-500 truncate">{task.description}</p>}
      </div>
      <Badge className={`text-xs ${priority.color}`}>{priority.label}</Badge>
      {task.assignee && (
        <Avatar className="w-6 h-6 bg-slate-200">
          <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
            {task.assignee.avatar}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (status: Task['status']) => void }) {
  const priority = priorityLabels[task.priority];

  return (
    <Card className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-slate-900 line-clamp-2">{task.title}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-slate-100">
                <MoreHorizontal className="w-4 h-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange('todo')}>À faire</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('in_progress')}>En cours</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('review')}>En relecture</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('done')}>Terminé</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
        
        <div className="flex items-center justify-between pt-2">
          <Badge className={`text-xs ${priority.color}`}>{priority.label}</Badge>
          {task.assignee ? (
            <Avatar className="w-6 h-6 bg-slate-200">
              <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                {task.assignee.avatar}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
              <Plus className="w-3 h-3 text-slate-400" />
            </div>
          )}
        </div>
        
        {task.dueDate && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            {task.dueDate.toLocaleDateString('fr-FR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import type { Slide } from '@/types';

function SlideRow({ slide, index }: { slide: Slide; index: number }) {
  const statusColors = {
    draft: 'bg-slate-100 text-slate-600',
    in_review: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700'
  };

  return (
    <Card className="border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
          {index + 1}
        </div>
        
        <div className="flex-1">
          <p className="font-medium text-slate-900">{slide.title}</p>
          {slide.content && (
            <p className="text-sm text-slate-500 line-clamp-1">{slide.content}</p>
          )}
        </div>
        
        <Badge className={`text-xs ${statusColors[slide.status]}`}>
          {slide.status === 'draft' ? 'Brouillon' : slide.status === 'in_review' ? 'En relecture' : 'Approuvé'}
        </Badge>
        
        {slide.assignedTo && (
          <Avatar className="w-8 h-8 bg-slate-200">
            <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
              {slide.assignedTo.avatar}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
