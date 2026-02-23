import { useState } from 'react';
import { 
  Bell, 
  Plus, 
  Search, 
  Settings, 
  Users, 
  FolderKanban, 
  LayoutDashboard, 
  ChevronDown,
  LayoutTemplate,
  Calendar,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Database from '@/lib/database';
import { notifications, roleLabels } from '@/data/mockData';

type View = 'dashboard' | 'projects' | 'team' | 'templates' | 'calendar' | 'feedback' | 'analytics';

interface HeaderProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export function Header({ activeView, onViewChange }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const unreadCount = notifications.filter(n => !n.read).length;
  const currentUser = Database.getCurrentUser();

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'projects', label: 'Projets', icon: FolderKanban },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
    { id: 'team', label: 'Équipe', icon: Users },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ] as const;

  const handleNewProject = () => {
    // Log activity for creating new project
    Database.logActivity('view_changed', { view: 'new_project_modal' });
    // In a real app, this would open a modal
    alert('Création d\'un nouveau projet - Fonctionnalité à implémenter');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      Database.logActivity('search_performed', { query });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mr-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 text-lg leading-tight">PrezoTeam</h1>
            <p className="text-xs text-slate-500">Préparation Collaborative</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 mr-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  Database.logActivity('view_changed', { view: item.id });
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeView === item.id
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Search */}
        <div className="relative mr-4 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-48 lg:w-64 pl-10 h-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button 
            size="sm" 
            className="hidden sm:flex bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-md hover:shadow-lg transition-all"
            onClick={handleNewProject}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden lg:inline">Nouveau projet</span>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.map((notif) => (
                <DropdownMenuItem key={notif.id} className="flex flex-col items-start py-3 cursor-pointer">
                  <span className={`text-sm ${notif.read ? 'text-slate-500' : 'text-slate-900 font-medium'}`}>
                    {notif.message}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    {notif.createdAt.toLocaleDateString('fr-FR')}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Settings className="w-5 h-5 text-slate-600" />
          </button>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 pl-3 border-l border-slate-200 hover:bg-slate-50 rounded-lg py-1 transition-colors">
                <Avatar className="w-8 h-8 bg-slate-800">
                  <AvatarFallback className="bg-slate-800 text-white text-sm">
                    {currentUser?.avatar || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">{currentUser?.name || 'Utilisateur'}</p>
                  <p className="text-xs text-slate-500">{currentUser ? roleLabels[currentUser.role].label : ''}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profil</DropdownMenuItem>
              <DropdownMenuItem>Paramètres</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Déconnexion</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
