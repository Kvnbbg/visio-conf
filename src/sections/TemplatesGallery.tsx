import { useState } from 'react';
import { 
  LayoutTemplate, 
  Plus, 
  Star, 
  Clock, 
  Users,
  CheckCircle2,
  Search,
  Filter,
  FileText,
  BarChart3,
  Lightbulb,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Template {
  id: string;
  title: string;
  description: string;
  category: 'business' | 'finance' | 'formation' | 'pitch' | 'report';
  slides: number;
  duration: number;
  popularity: number;
  isPremium?: boolean;
  tags: string[];
  color: string;
  icon: React.ElementType;
}

const templates: Template[] = [
  {
    id: '1',
    title: 'Résultats Annuels',
    description: 'Structure professionnelle pour présenter les résultats financiers et stratégiques.',
    category: 'finance',
    slides: 15,
    duration: 45,
    popularity: 98,
    tags: ['financier', 'stratégique', 'annuel'],
    color: 'from-blue-500 to-blue-700',
    icon: BarChart3
  },
  {
    id: '2',
    title: 'Lancement Produit',
    description: 'Captivez votre audience avec une narration persuasive autour de votre nouveau produit.',
    category: 'pitch',
    slides: 12,
    duration: 30,
    popularity: 95,
    tags: ['produit', 'commercial', 'innovation'],
    color: 'from-violet-500 to-violet-700',
    icon: Lightbulb
  },
  {
    id: '3',
    title: 'Formation Équipe',
    description: 'Structure pédagogique pour vos sessions de formation interne.',
    category: 'formation',
    slides: 20,
    duration: 60,
    popularity: 87,
    tags: ['formation', 'interne', 'pédagogie'],
    color: 'from-emerald-500 to-emerald-700',
    icon: GraduationCap
  },
  {
    id: '4',
    title: 'Réunion Hebdomadaire',
    description: 'Suivi d\'activité rapide et efficace pour vos stand-ups.',
    category: 'business',
    slides: 8,
    duration: 15,
    popularity: 92,
    tags: ['réunion', 'agile', 'rapide'],
    color: 'from-amber-500 to-amber-700',
    icon: Clock
  },
  {
    id: '5',
    title: 'Proposition Commerciale',
    description: 'Convainquez vos prospects avec une proposition structurée et impactante.',
    category: 'business',
    slides: 14,
    duration: 40,
    popularity: 89,
    isPremium: true,
    tags: ['commercial', 'proposition', 'vente'],
    color: 'from-rose-500 to-rose-700',
    icon: Briefcase
  },
  {
    id: '6',
    title: 'Rapport Projet',
    description: 'Présentez l\'avancement et les livrables de votre projet.',
    category: 'report',
    slides: 18,
    duration: 35,
    popularity: 84,
    tags: ['projet', 'avancement', 'livraison'],
    color: 'from-cyan-500 to-cyan-700',
    icon: FileText
  }
];

const categoryLabels: Record<string, { label: string; color: string }> = {
  business: { label: 'Business', color: 'bg-amber-100 text-amber-800' },
  finance: { label: 'Finance', color: 'bg-blue-100 text-blue-800' },
  formation: { label: 'Formation', color: 'bg-emerald-100 text-emerald-800' },
  pitch: { label: 'Pitch', color: 'bg-violet-100 text-violet-800' },
  report: { label: 'Rapport', color: 'bg-cyan-100 text-cyan-800' }
};

interface TemplatesGalleryProps {
  onUseTemplate: (templateId: string) => void;
}

export function TemplatesGallery({ onUseTemplate }: TemplatesGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Galerie de Templates</h2>
          <p className="text-slate-500 mt-1">
            Démarrez rapidement avec des structures professionnelles éprouvées
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Star className="w-4 h-4" />
          Mes favoris
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher un template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="formation">Formation</SelectItem>
            <SelectItem value="pitch">Pitch</SelectItem>
            <SelectItem value="report">Rapport</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Categories */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(categoryLabels).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(categoryFilter === key ? 'all' : key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              categoryFilter === key 
                ? 'bg-slate-900 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <TemplateCard 
            key={template.id} 
            template={template}
            onClick={() => setSelectedTemplate(template)}
            onUse={() => onUseTemplate(template.id)}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Aucun template trouvé</h3>
          <p className="text-slate-500 mt-1">Essayez de modifier vos filtres de recherche</p>
        </div>
      )}

      {/* Template Preview Dialog */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Aperçu du template</DialogTitle>
            </DialogHeader>
            <TemplatePreview 
              template={selectedTemplate} 
              onUse={() => {
                onUseTemplate(selectedTemplate.id);
                setSelectedTemplate(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function TemplateCard({ 
  template, 
  onClick,
  onUse 
}: { 
  template: Template; 
  onClick: () => void;
  onUse: () => void;
}) {
  const Icon = template.icon;
  const category = categoryLabels[template.category];

  return (
    <Card className="border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all duration-300 cursor-pointer group overflow-hidden">
      {/* Header with gradient */}
      <div className={`h-24 bg-gradient-to-br ${template.color} relative`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute top-4 left-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        {template.isPremium && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-amber-400 text-amber-900 border-0">
              <Star className="w-3 h-3 mr-1 fill-current" />
              Premium
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <Badge className={`text-xs ${category.color}`}>
            {category.label}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {template.popularity}%
          </div>
        </div>

        <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors">
          {template.title}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 mb-4">
          {template.description}
        </p>

        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
          <div className="flex items-center gap-1">
            <LayoutTemplate className="w-3 h-3" />
            {template.slides} slides
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {template.duration} min
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            2.4k utilisations
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 text-sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Aperçu
          </Button>
          <Button 
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-sm"
            onClick={(e) => {
              e.stopPropagation();
              onUse();
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Utiliser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplatePreview({ template, onUse }: { template: Template; onUse: () => void }) {
  const Icon = template.icon;
  const category = categoryLabels[template.category];

  const slideStructure = [
    { title: 'Titre et introduction', type: 'intro' },
    { title: 'Contexte et enjeux', type: 'content' },
    { title: 'Problématique', type: 'content' },
    { title: 'Solution proposée', type: 'content' },
    { title: 'Données clés', type: 'data' },
    { title: 'Conclusion et appel à l\'action', type: 'conclusion' }
  ];

  return (
    <div className="space-y-6 pt-4">
      {/* Preview Header */}
      <div className={`h-32 rounded-xl bg-gradient-to-br ${template.color} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <Badge className="bg-white/20 text-white border-0 mb-1">
                {category.label}
              </Badge>
              <h3 className="text-xl font-bold text-white">{template.title}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <p className="text-2xl font-bold text-slate-900">{template.slides}</p>
          <p className="text-xs text-slate-500">Slides prédéfinis</p>
        </div>
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <p className="text-2xl font-bold text-slate-900">{template.duration}</p>
          <p className="text-xs text-slate-500">Minutes estimées</p>
        </div>
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <p className="text-2xl font-bold text-slate-900">{template.popularity}%</p>
          <p className="text-xs text-slate-500">Taux de satisfaction</p>
        </div>
      </div>

      {/* Structure */}
      <div>
        <h4 className="font-semibold text-slate-900 mb-3">Structure suggérée</h4>
        <div className="space-y-2">
          {slideStructure.map((slide, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm font-medium text-slate-600 shadow-sm">
                {index + 1}
              </div>
              <p className="text-sm text-slate-700">{slide.title}</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <h4 className="font-semibold text-slate-900 mb-2">Tags associés</h4>
        <div className="flex flex-wrap gap-2">
          {template.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" className="flex-1">
          Ajouter aux favoris
        </Button>
        <Button className="flex-1 bg-slate-900 gap-2" onClick={onUse}>
          <Plus className="w-4 h-4" />
          Utiliser ce template
        </Button>
      </div>
    </div>
  );
}
