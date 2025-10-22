import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Clock, User, AlertTriangle, CheckCircle, Loader2, Play, CheckCircle2, Archive } from 'lucide-react';
import { Ticket, TicketComment } from '../services/ticketsService';
import { TicketsService } from '../services/ticketsService';
import { useAuth } from '../contexts/AuthContext';

interface TicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onTicketUpdate?: () => void;
  onTicketDetailsUpdate?: (updatedTicket: Ticket) => void;
}

export function TicketDetailsModal({ isOpen, onClose, ticket, onTicketUpdate, onTicketDetailsUpdate }: TicketDetailsModalProps) {
  const { user, isAdmin } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fullTicket, setFullTicket] = useState<Ticket | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);

  // Charger les détails complets du ticket quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && ticket) {
      console.log('🔍 [TicketDetailsModal] Chargement des détails complets du ticket:', ticket.id);
      setLoadingTicket(true);
      
      TicketsService.getTicket(ticket.id)
        .then((ticketWithComments) => {
          console.log('✅ [TicketDetailsModal] Ticket avec commentaires chargé:', ticketWithComments);
          setFullTicket(ticketWithComments);
        })
        .catch((error) => {
          console.error('❌ [TicketDetailsModal] Erreur lors du chargement du ticket:', error);
          setError('Erreur lors du chargement des détails du ticket');
          setFullTicket(ticket); // Utiliser le ticket de base en cas d'erreur
        })
        .finally(() => {
          setLoadingTicket(false);
        });
    }
  }, [isOpen, ticket?.id]);

  if (!isOpen || !ticket) return null;

  // Utiliser le ticket complet s'il est chargé, sinon le ticket de base
  const currentTicket = fullTicket || ticket;
  
  console.log('🔍 [TicketDetailsModal] Ticket actuel:', currentTicket);
  console.log('🔍 [TicketDetailsModal] Commentaires du ticket:', currentTicket.comments);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setAddingComment(true);
      setError(null);
      await TicketsService.addComment(currentTicket.id, { comment_text: newComment });
      setNewComment('');
      
      // Recharger les détails du ticket pour afficher le nouveau commentaire
      const updatedTicket = await TicketsService.getTicket(currentTicket.id);
      setFullTicket(updatedTicket);
      if (onTicketDetailsUpdate) {
        onTicketDetailsUpdate(updatedTicket);
      }
      
      if (onTicketUpdate) {
        onTicketUpdate();
      }
    } catch (err: any) {
      console.error('Erreur lors de l\'ajout du commentaire:', err);
      setError(err.message || 'Erreur lors de l\'ajout du commentaire');
    } finally {
      setAddingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setActionLoading(newStatus);
      await TicketsService.updateTicket(currentTicket.id, { status: newStatus as any });
      
      // Recharger les détails du ticket
      const updatedTicket = await TicketsService.getTicket(currentTicket.id);
      setFullTicket(updatedTicket);
      if (onTicketDetailsUpdate) {
        onTicketDetailsUpdate(updatedTicket);
      }
      
      if (onTicketUpdate) {
        onTicketUpdate();
      }
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setError(err.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setActionLoading(null);
    }
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'in_progress': return <Loader2 className="w-4 h-4 text-orange-600" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'closed': return <X className="w-4 h-4 text-gray-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'medium': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* En-tête */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{currentTicket.title}</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">#{currentTicket.id.substring(0, 8)}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${TicketsService.getStatusColor(currentTicket.status)}`}>
                  {TicketsService.getStatusLabel(currentTicket.status)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar max-h-[calc(90vh-100px)]">
          {/* Informations du ticket */}
          <div className="mb-4">
            {/* Informations en ligne */}
            <div className="flex flex-wrap items-center gap-4 mb-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(currentTicket.status)}
                <span className="text-sm font-medium text-slate-600">Statut:</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${TicketsService.getStatusColor(currentTicket.status)}`}>
                  {TicketsService.getStatusLabel(currentTicket.status)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {getPriorityIcon(currentTicket.priority)}
                <span className="text-sm font-medium text-slate-600">Priorité:</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${TicketsService.getPriorityColor(currentTicket.priority)}`}>
                  {TicketsService.getPriorityLabel(currentTicket.priority)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-600">Catégorie:</span>
                <span className="text-sm text-slate-700">{TicketsService.getCategoryLabel(currentTicket.category)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-600">Créé par:</span>
                <span className="text-sm text-slate-700">{currentTicket.created_by_email}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-600">Créé:</span>
                <span className="text-sm text-slate-700">{TicketsService.formatDate(currentTicket.created_at)}</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{currentTicket.description}</p>
            </div>
          </div>

          {/* Actions Admin */}
          {isAdmin && (
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900 mb-3">Actions Admin</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Actions de statut */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-3">Gestion du Statut</h4>
                  <div className="space-y-2">
                    {currentTicket.status !== 'open' && (
                      <button
                        onClick={() => handleStatusChange('open')}
                        disabled={actionLoading === 'open'}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === 'open' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                        Rouvrir
                      </button>
                    )}
                    {currentTicket.status !== 'in_progress' && (
                      <button
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={actionLoading === 'in_progress'}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === 'in_progress' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        En cours
                      </button>
                    )}
                    {currentTicket.status !== 'resolved' && (
                      <button
                        onClick={() => handleStatusChange('resolved')}
                        disabled={actionLoading === 'resolved'}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === 'resolved' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Résoudre
                      </button>
                    )}
                    {currentTicket.status !== 'closed' && (
                      <button
                        onClick={() => handleStatusChange('closed')}
                        disabled={actionLoading === 'closed'}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === 'closed' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                        Fermer
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions rapides */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-3">Réponses Rapides</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const newComment = `[Support Client] Bonjour, nous avons bien reçu votre demande et nous en prenons connaissance. Nous vous recontacterons dans les plus brefs délais.`;
                        setNewComment(newComment);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Accusé de réception
                    </button>
                    <button
                      onClick={() => {
                        const newComment = `[Support Client] Nous travaillons actuellement sur votre demande. Nous vous tiendrons informé de l'avancement.`;
                        setNewComment(newComment);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      En cours de traitement
                    </button>
                    <button
                      onClick={() => {
                        const newComment = `[Support Client] Votre demande a été résolue. N'hésitez pas à nous contacter si vous avez d'autres questions.`;
                        setNewComment(newComment);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Résolution
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Commentaires */}
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-600" />
              Commentaires ({currentTicket.comments?.length || 0})
              {currentTicket.status === 'closed' && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  Ticket fermé
                </span>
              )}
            </h3>
            
            {loadingTicket ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                <Loader2 className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-slate-500">Chargement des commentaires...</p>
              </div>
            ) : currentTicket.comments && Array.isArray(currentTicket.comments) && currentTicket.comments.length > 0 ? (
              <div className="space-y-3">
                {currentTicket.comments.map((comment: TicketComment, index: number) => {
                  const isCurrentUser = comment.user_email === user?.email;
                  const isAdmin = comment.user_email?.includes('admin') || comment.user_email?.includes('@automivy');
                  const isFirstComment = index === 0;
                  
                  console.log('🔍 [TicketDetailsModal] Commentaire:', comment);
                  
                  // Couleurs différentes pour chaque type d'utilisateur
                  const getCommentColors = () => {
                    if (isCurrentUser) {
                      return {
                        container: 'bg-blue-50 border-blue-200',
                        header: 'bg-blue-100',
                        avatar: 'bg-blue-500 text-white',
                        badge: 'bg-blue-600 text-white'
                      };
                    } else if (isAdmin) {
                      return {
                        container: 'bg-green-50 border-green-200',
                        header: 'bg-green-100',
                        avatar: 'bg-green-500 text-white',
                        badge: 'bg-green-600 text-white'
                      };
                    } else {
                      return {
                        container: 'bg-slate-50 border-slate-200',
                        header: 'bg-slate-100',
                        avatar: 'bg-slate-500 text-white',
                        badge: 'bg-slate-600 text-white'
                      };
                    }
                  };

                  const colors = getCommentColors();
                  
                  return (
                    <div key={comment.id} className={`${colors.container} border rounded-lg p-3 shadow-sm`}>
                      <div className={`${colors.header} rounded-lg p-2 mb-2`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`${colors.avatar} w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm`}>
                              {comment.user_email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium text-slate-900">{comment.user_email}</span>
                              <div className="flex items-center gap-2 mt-1">
                                {isCurrentUser && (
                                  <span className={`${colors.badge} px-2 py-1 text-xs rounded-full font-medium`}>
                                    Vous
                                  </span>
                                )}
                                {isAdmin && (
                                  <span className="bg-green-600 text-white px-2 py-1 text-xs rounded-full font-medium">
                                    Support Client
                                  </span>
                                )}
                                {isFirstComment && !isAdmin && (
                                  <span className="bg-purple-100 text-purple-700 px-2 py-1 text-xs rounded-full font-medium">
                                    Client
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">
                            {TicketsService.formatDate(comment.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {comment.comment_text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Aucun commentaire pour ce ticket.</p>
                <p className="text-xs text-slate-400 mt-1">Soyez le premier à commenter !</p>
              </div>
            )}
          </div>

          {/* Formulaire d'ajout de commentaire */}
          {currentTicket.status !== 'closed' || isAdmin ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-white" />
                </div>
                <h4 className="font-semibold text-blue-900">
                  {currentTicket.status === 'closed' && isAdmin 
                    ? 'Ajouter un commentaire (Admin)' 
                    : 'Ajouter un commentaire'
                  }
                </h4>
                {currentTicket.status === 'closed' && isAdmin && (
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                    Ticket fermé
                  </span>
                )}
              </div>
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm mb-3">
                  <AlertTriangle className="inline w-4 h-4 mr-1" />
                  {error}
                </div>
              )}

              <form onSubmit={handleAddComment}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Écrivez votre commentaire..."
                  rows={2}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm mb-3"
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingComment || !newComment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingComment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                    {addingComment ? 'Ajout...' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                <Archive className="w-5 h-5" />
                <span className="font-medium">Ticket fermé</span>
              </div>
              <p className="text-sm text-gray-500">
                Ce ticket est fermé. Vous ne pouvez plus ajouter de commentaires.
              </p>
              {isAdmin && (
                <p className="text-xs text-orange-600 mt-2">
                  En tant qu'admin, vous pouvez toujours ajouter des commentaires pour rouvrir le ticket si nécessaire.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
