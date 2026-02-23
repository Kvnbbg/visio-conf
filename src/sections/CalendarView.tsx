import { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Users, 
  Video,
  MapPin,
  Plus,
  AlertCircle,
  CheckCircle2,
  Bell
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { teamMembers } from '@/data/mockData';

interface CalendarEvent {
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

const events: CalendarEvent[] = [
  {
    id: '1',
    title: 'Révision Présentation Résultats',
    description: 'Relecture finale avant le comité',
    date: new Date('2024-01-25'),
    startTime: '14:00',
    endTime: '15:30',
    type: 'review',
    isOnline: true,
    attendees: ['1', '2', '3'],
    projectId: '1',
    status: 'confirmed'
  },
  {
    id: '2',
    title: 'Comité de Direction',
    description: 'Présentation des résultats annuels',
    date: new Date('2024-02-15'),
    startTime: '09:00',
    endTime: '12:00',
    type: 'presentation',
    location: 'Salle du Conseil',
    isOnline: false,
    attendees: ['1', '2'],
    projectId: '1',
    status: 'confirmed'
  },
  {
    id: '3',
    title: 'Brainstorming Lancement Produit',
    description: 'Idéation sur la storyline',
    date: new Date('2024-01-28'),
    startTime: '10:00',
    endTime: '11:30',
    type: 'meeting',
    isOnline: true,
    attendees: ['1', '3', '4'],
    projectId: '2',
    status: 'confirmed'
  },
  {
    id: '4',
    title: 'Échéance - Graphiques Financiers',
    date: new Date('2024-01-25'),
    startTime: '17:00',
    endTime: '17:00',
    type: 'deadline',
    isOnline: false,
    attendees: ['3'],
    projectId: '1',
    status: 'confirmed'
  },
  {
    id: '5',
    title: 'Point Hebdomadaire Équipe',
    description: 'Suivi des avancements',
    date: new Date('2024-01-29'),
    startTime: '09:30',
    endTime: '10:00',
    type: 'meeting',
    isOnline: true,
    attendees: ['1', '2', '3', '4', '5'],
    status: 'confirmed'
  }
];

const eventTypeLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  meeting: { label: 'Réunion', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Users },
  deadline: { label: 'Échéance', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: AlertCircle },
  review: { label: 'Relecture', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: CheckCircle2 },
  presentation: { label: 'Présentation', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CalendarIcon }
};

const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date('2024-01-28'));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  const upcomingEvents = events
    .filter(e => e.date >= new Date('2024-01-28'))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Calendrier</h2>
          <p className="text-slate-500 mt-1">
            Planifiez vos réunions et suivez vos échéances
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 gap-2">
              <Plus className="w-4 h-4" />
              Nouvel événement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un événement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Titre</label>
                <Input placeholder="Nom de l'événement" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <Textarea placeholder="Description" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Date</label>
                  <Input type="date" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Type</label>
                  <select className="w-full mt-1 p-2 border rounded-lg text-sm">
                    <option value="meeting">Réunion</option>
                    <option value="deadline">Échéance</option>
                    <option value="review">Relecture</option>
                    <option value="presentation">Présentation</option>
                  </select>
                </div>
              </div>
              <Button className="w-full bg-slate-900">Créer l'événement</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-1">
                <button 
                  onClick={() => navigateMonth(-1)}
                  className="p-1 rounded hover:bg-slate-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => navigateMonth(1)}
                  className="p-1 rounded hover:bg-slate-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex border rounded-lg overflow-hidden">
              {(['month', 'week', 'day'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-sm capitalize ${
                    viewMode === mode 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {mode === 'month' ? 'Mois' : mode === 'week' ? 'Semaine' : 'Jour'}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Grid */}
          <Card className="border-slate-200">
            <CardContent className="p-4">
              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for start of month */}
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24 bg-slate-50/50 rounded-lg" />
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dayEvents = getEventsForDate(date);
                  const isToday = day === 28 && currentDate.getMonth() === 0; // Mock today

                  return (
                    <div 
                      key={day}
                      className={`h-24 p-1.5 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                        isToday 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-white border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => {
                          const type = eventTypeLabels[event.type];
                          return (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer ${type.color}`}
                            >
                              {event.startTime} {event.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-slate-400 px-1.5">
                            +{dayEvents.length - 2} autres
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Prochains événements</h3>
                <Bell className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  const type = eventTypeLabels[event.type];
                  const Icon = type.icon;
                  
                  return (
                    <div 
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className={`p-2 rounded-lg ${type.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{event.title}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <Clock className="w-3 h-3" />
                          {event.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {' · '}
                          {event.startTime}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Event Types Legend */}
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Types d'événements</h3>
              <div className="space-y-2">
                {Object.entries(eventTypeLabels).map(([key, { label, color, icon: Icon }]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${color}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-sm text-slate-600">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Ce mois</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {events.filter(e => e.date.getMonth() === currentDate.getMonth()).length}
                  </p>
                  <p className="text-xs text-slate-500">Événements</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-rose-600">
                    {events.filter(e => e.date.getMonth() === currentDate.getMonth() && e.type === 'deadline').length}
                  </p>
                  <p className="text-xs text-slate-500">Échéances</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Détail de l'événement</DialogTitle>
            </DialogHeader>
            <EventDetail event={selectedEvent} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EventDetail({ event }: { event: CalendarEvent }) {
  const type = eventTypeLabels[event.type];
  const Icon = type.icon;

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${type.color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>
          <Badge className={`mt-1 ${type.color}`}>{type.label}</Badge>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">
            {event.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-600">
            {event.startTime} - {event.endTime}
          </span>
        </div>

        {event.location && (
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">{event.location}</span>
          </div>
        )}

        {event.isOnline && (
          <div className="flex items-center gap-3 text-sm">
            <Video className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">En ligne</span>
            <Button variant="link" size="sm" className="h-auto p-0 text-blue-600">
              Rejoindre
            </Button>
          </div>
        )}

        {event.description && (
          <div className="pt-2">
            <p className="text-sm text-slate-600">{event.description}</p>
          </div>
        )}
      </div>

      {/* Attendees */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">Participants</h4>
        <div className="flex flex-wrap gap-2">
          {event.attendees.map((attendeeId) => {
            const member = teamMembers.find(m => m.id === attendeeId);
            if (!member) return null;
            return (
              <div key={attendeeId} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full">
                <Avatar className="w-5 h-5 bg-slate-200">
                  <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                    {member.avatar}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-slate-600">{member.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" className="flex-1">
          Modifier
        </Button>
        <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700">
          Annuler
        </Button>
        <Button className="flex-1 bg-slate-900">
          Confirmer
        </Button>
      </div>
    </div>
  );
}
