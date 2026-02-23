import { useState } from 'react';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Send, 
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Filter,
  Search,
  Clock,
  Reply
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
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
import { teamMembers, currentUser } from '@/data/mockData';

interface Feedback {
  id: string;
  author: typeof teamMembers[0];
  content: string;
  type: 'suggestion' | 'issue' | 'praise' | 'question';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
  likes: number;
  dislikes: number;
  replies: FeedbackReply[];
  projectId?: string;
  slideId?: string;
}

interface FeedbackReply {
  id: string;
  author: typeof teamMembers[0];
  content: string;
  createdAt: Date;
}

const feedbacks: Feedback[] = [
  {
    id: '1',
    author: teamMembers[2],
    content: 'Les graphiques financiers seraient plus impactants avec une palette de couleurs plus contrastée. Je suggère d\'utiliser le bleu corporatif.',
    type: 'suggestion',
    status: 'in_progress',
    createdAt: new Date('2024-01-22'),
    likes: 3,
    dislikes: 0,
    replies: [
      {
        id: 'r1',
        author: teamMembers[0],
        content: 'Bonne idée ! Je vais tester ça et te montrer le résultat.',
        createdAt: new Date('2024-01-22')
      }
    ],
    projectId: '1'
  },
  {
    id: '2',
    author: teamMembers[4],
    content: 'Excellent travail sur l\'introduction ! Le storytelling est vraiment captivant.',
    type: 'praise',
    status: 'resolved',
    createdAt: new Date('2024-01-21'),
    likes: 5,
    dislikes: 0,
    replies: [],
    projectId: '1'
  },
  {
    id: '3',
    author: teamMembers[1],
    content: 'Petit problème sur la slide 3 : le texte déborde sur mobile.',
    type: 'issue',
    status: 'open',
    createdAt: new Date('2024-01-23'),
    likes: 1,
    dislikes: 0,
    replies: [],
    projectId: '1',
    slideId: 's3'
  },
  {
    id: '4',
    author: teamMembers[3],
    content: 'Est-ce qu\'on pourrait ajouter une slide sur les perspectives internationales ?',
    type: 'question',
    status: 'open',
    createdAt: new Date('2024-01-20'),
    likes: 2,
    dislikes: 1,
    replies: [
      {
        id: 'r2',
        author: teamMembers[0],
        content: 'C\'est prévu pour la version 2 !',
        createdAt: new Date('2024-01-20')
      }
    ],
    projectId: '1'
  }
];

const typeLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  suggestion: { label: 'Suggestion', color: 'bg-blue-100 text-blue-800', icon: Lightbulb },
  issue: { label: 'Problème', color: 'bg-rose-100 text-rose-800', icon: AlertCircle },
  praise: { label: 'Félicitations', color: 'bg-emerald-100 text-emerald-800', icon: ThumbsUp },
  question: { label: 'Question', color: 'bg-amber-100 text-amber-800', icon: MessageSquare }
};

const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouvert', color: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Résolu', color: 'bg-emerald-100 text-emerald-700' },
  closed: { label: 'Fermé', color: 'bg-gray-100 text-gray-500' }
};

export function FeedbackSystem() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newFeedback, setNewFeedback] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = feedback.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || feedback.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: feedbacks.length,
    open: feedbacks.filter(f => f.status === 'open').length,
    resolved: feedbacks.filter(f => f.status === 'resolved').length,
    suggestions: feedbacks.filter(f => f.type === 'suggestion').length
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Feedback & Commentaires</h2>
          <p className="text-slate-500 mt-1">
            Collaborez et améliorez ensemble vos présentations
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} icon={MessageSquare} color="text-slate-600" />
        <StatCard label="Ouverts" value={stats.open} icon={AlertCircle} color="text-amber-600" />
        <StatCard label="Résolus" value={stats.resolved} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="Suggestions" value={stats.suggestions} icon={Lightbulb} color="text-blue-600" />
      </div>

      {/* New Feedback */}
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <div className="flex gap-4">
            <Avatar className="w-10 h-10 bg-slate-800">
              <AvatarFallback className="bg-slate-800 text-white">
                {currentUser.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="Partagez votre feedback, suggestion ou question..."
                value={newFeedback}
                onChange={(e) => setNewFeedback(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Select defaultValue="suggestion">
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suggestion">💡 Suggestion</SelectItem>
                      <SelectItem value="issue">⚠️ Problème</SelectItem>
                      <SelectItem value="praise">👏 Félicitations</SelectItem>
                      <SelectItem value="question">❓ Question</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="bg-slate-900 gap-2">
                  <Send className="w-4 h-4" />
                  Envoyer
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher dans les feedbacks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="suggestion">Suggestions</SelectItem>
              <SelectItem value="issue">Problèmes</SelectItem>
              <SelectItem value="praise">Félicitations</SelectItem>
              <SelectItem value="question">Questions</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="open">Ouverts</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="resolved">Résolus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedbacks.map((feedback) => {
          const type = typeLabels[feedback.type];
          const TypeIcon = type.icon;
          const status = statusLabels[feedback.status];

          return (
            <Card key={feedback.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 bg-slate-200">
                      <AvatarFallback className="bg-slate-200 text-slate-700">
                        {feedback.author.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900">{feedback.author.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {feedback.createdAt.toLocaleDateString('fr-FR', { 
                          day: 'numeric', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={type.color}>
                      <TypeIcon className="w-3 h-3 mr-1" />
                      {type.label}
                    </Badge>
                    <Badge className={status.color}>{status.label}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-slate-100">
                          <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Marquer comme résolu</DropdownMenuItem>
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Content */}
                <p className="text-slate-700 mb-4">{feedback.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-4 mb-4">
                  <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                    <ThumbsUp className="w-4 h-4" />
                    {feedback.likes}
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                    <ThumbsDown className="w-4 h-4" />
                    {feedback.dislikes}
                  </button>
                  <button 
                    onClick={() => setReplyingTo(replyingTo === feedback.id ? null : feedback.id)}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
                  >
                    <Reply className="w-4 h-4" />
                    Répondre
                  </button>
                </div>

                {/* Replies */}
                {feedback.replies.length > 0 && (
                  <div className="space-y-3 pl-4 border-l-2 border-slate-100">
                    {feedback.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <Avatar className="w-8 h-8 bg-slate-200">
                          <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                            {reply.author.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-slate-900">{reply.author.name}</span>
                            <span className="text-xs text-slate-400">
                              {reply.createdAt.toLocaleDateString('fr-FR', { 
                                day: 'numeric', 
                                month: 'short' 
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input */}
                {replyingTo === feedback.id && (
                  <div className="mt-4 flex gap-3">
                    <Avatar className="w-8 h-8 bg-slate-800">
                      <AvatarFallback className="bg-slate-800 text-white text-xs">
                        {currentUser.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <Input
                        placeholder="Votre réponse..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="sm" className="bg-slate-900">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filteredFeedbacks.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Aucun feedback</h3>
            <p className="text-slate-500 mt-1">Soyez le premier à partager votre avis !</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon: Icon,
  color
}: { 
  label: string; 
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-slate-100 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
