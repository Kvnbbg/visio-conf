import { useState, useEffect } from 'react';
import { Header } from '@/sections/Header';
import { Dashboard } from '@/sections/Dashboard';
import { ProjectsList } from '@/sections/ProjectsList';
import { ProjectDetail } from '@/sections/ProjectDetail';
import { TeamView } from '@/sections/TeamView';
import { TemplatesGallery } from '@/sections/TemplatesGallery';
import { CalendarView } from '@/sections/CalendarView';
import { FeedbackSystem } from '@/sections/FeedbackSystem';
import { AnalyticsView } from '@/sections/AnalyticsView';
import { projects as mockProjects, currentUser as mockUser } from '@/data/mockData';
import Database from '@/lib/database';
import './App.css';

type View = 'dashboard' | 'projects' | 'team' | 'templates' | 'calendar' | 'feedback' | 'analytics';

function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize database with mock data on first load
  useEffect(() => {
    Database.init();
    
    // Set current user if not already set
    if (!Database.getCurrentUser()) {
      Database.setCurrentUser(mockUser);
    }
    
    // Add mock projects if none exist
    const existingProjects = Database.getProjects();
    if (existingProjects.length === 0) {
      mockProjects.forEach(project => {
        Database.addProject(project);
      });
    }
    
    setIsInitialized(true);
  }, []);

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
  };

  const handleUseTemplate = (templateId: string) => {
    Database.trackTemplateUsage(templateId);
    setActiveView('projects');
  };

  const selectedProject = selectedProjectId 
    ? Database.getProjects().find(p => p.id === selectedProjectId) 
    : null;

  const renderContent = () => {
    if (!isInitialized) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
            Chargement...
          </div>
        </div>
      );
    }

    if (selectedProject) {
      return (
        <ProjectDetail 
          project={selectedProject} 
          onBack={handleBackToProjects} 
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <Dashboard onProjectClick={handleProjectClick} />;
      case 'projects':
        return <ProjectsList onProjectClick={handleProjectClick} />;
      case 'team':
        return <TeamView />;
      case 'templates':
        return <TemplatesGallery onUseTemplate={handleUseTemplate} />;
      case 'calendar':
        return <CalendarView />;
      case 'feedback':
        return <FeedbackSystem />;
      case 'analytics':
        return <AnalyticsView />;
      default:
        return <Dashboard onProjectClick={handleProjectClick} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header 
        activeView={selectedProject ? 'projects' : activeView} 
        onViewChange={(view) => {
          setActiveView(view);
          setSelectedProjectId(null);
        }} 
      />
      <main className="pb-12">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
