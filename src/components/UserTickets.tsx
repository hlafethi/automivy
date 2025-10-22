import React, { useState, useEffect } from 'react';
import { Ticket as TicketIcon, Plus, Search, Clock, AlertTriangle, CheckCircle, XCircle, MessageSquare, Bell, Loader2, Eye, Edit } from 'lucide-react';
import { TicketsService, Ticket, TicketComment, TicketNotification } from '../services/ticketsService';
import { CreateTicketModal } from './CreateTicketModal';
import { TicketDetailsModal } from './TicketDetailsModal';

export function UserTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<TicketNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    loadTickets();
    // DÉSACTIVÉ pour éviter les boucles de requêtes
    // loadNotifications();
  }, []);

  // Filtrage des tickets
  useEffect(() => {
    let filtered = tickets;

    // Filtre par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(ticket => 
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Filtre par priorité
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    setFilteredTickets(filtered);
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await TicketsService.getAllTickets();
      setTickets(response);
      setError(null);
    } catch (err: any) {
      console.error('Erreur lors du chargement des tickets:', err);
      setError(err.message || 'Erreur lors du chargement des tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await TicketsService.getUnreadNotifications();
      setNotifications(response);
    } catch (err: any) {
      console.error('Erreur lors du chargement des notifications:', err);
    }
  };

  const handleViewDetails = async (ticket: Ticket) => {
    try {
      const ticketDetails = await TicketsService.getTicket(ticket.id);
      setSelectedTicket(ticketDetails);
      setShowTicketDetails(true);
    } catch (err: any) {
      console.error('Erreur lors du chargement des détails:', err);
      setError(err.message || 'Erreur lors du chargement des détails');
    }
  };

  const handleCreateTicket = async (ticketData: any) => {
    try {
      await TicketsService.createTicket(ticketData);
      await loadTickets();
      setShowCreateModal(false);
    } catch (err: any) {
      console.error('Erreur lors de la création du ticket:', err);
      setError(err.message || 'Erreur lors de la création du ticket');
    }
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      await TicketsService.markNotificationAsRead(notificationId);
      await loadNotifications();
    } catch (err: any) {
      console.error('Erreur lors du marquage de la notification:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Chargement des tickets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Erreur</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadTickets}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec notifications */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Mes Tickets de Support</h2>
            <p className="text-slate-600">Créez et suivez vos demandes de support</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    notifications.forEach(notif => handleMarkNotificationAsRead(notif.id));
                  }}
                  className="relative p-2 text-slate-600 hover:text-blue-600 transition-colors"
                >
                  <Bell className="w-6 h-6" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
              </div>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouveau Ticket
            </button>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <TicketIcon className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">Total</p>
                <p className="text-2xl font-bold text-blue-900">{tickets.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">Ouverts</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {tickets.filter(t => t.status === 'open').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-800">En cours</p>
                <p className="text-2xl font-bold text-orange-900">
                  {tickets.filter(t => t.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Résolus</p>
                <p className="text-2xl font-bold text-green-900">
                  {tickets.filter(t => t.status === 'resolved').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Barre de recherche */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par titre, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Filtre par statut */}
          <div className="lg:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="open">Ouvert</option>
              <option value="in_progress">En cours</option>
              <option value="resolved">Résolu</option>
              <option value="closed">Fermé</option>
            </select>
          </div>

          {/* Filtre par priorité */}
          <div className="lg:w-48">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Toutes les priorités</option>
              <option value="low">Faible</option>
              <option value="medium">Moyenne</option>
              <option value="high">Élevée</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          {/* Bouton de réinitialisation */}
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setPriorityFilter('all');
            }}
            className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Réinitialiser
          </button>
        </div>

        {/* Résultats du filtrage */}
        <div className="mt-4 text-sm text-slate-600">
          {filteredTickets.length} ticket{filteredTickets.length > 1 ? 's' : ''} trouvé{filteredTickets.length > 1 ? 's' : ''}
          {searchTerm && ` pour "${searchTerm}"`}
        </div>
      </div>

      {/* Liste des tickets */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h4 className="text-lg font-semibold text-slate-900">Mes Tickets</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Priorité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Créé le
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <TicketIcon className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900 max-w-xs truncate">
                          {ticket.title}
                        </div>
                        <div className="text-sm text-slate-500 max-w-xs truncate">
                          {ticket.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${TicketsService.getStatusColor(ticket.status)}`}>
                      {TicketsService.getStatusLabel(ticket.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${TicketsService.getPriorityColor(ticket.priority)}`}>
                      {TicketsService.getPriorityLabel(ticket.priority)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {TicketsService.getCategoryLabel(ticket.category)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {TicketsService.formatDate(ticket.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(ticket)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bell className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                {notifications.length} notification{notifications.length > 1 ? 's' : ''} non lue{notifications.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => {
                notifications.forEach(notif => handleMarkNotificationAsRead(notif.id));
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Marquer comme lues
            </button>
          </div>
        </div>
      )}

          {/* Modal de création de ticket */}
          {showCreateModal && (
            <CreateTicketModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              onSuccess={(newTicket) => {
                setShowCreateModal(false);
                loadTickets(); // Recharger la liste des tickets
              }}
            />
          )}

          {/* Modal de détails du ticket */}
          {showTicketDetails && selectedTicket && (
            <TicketDetailsModal
              isOpen={showTicketDetails}
              onClose={() => {
                setShowTicketDetails(false);
                setSelectedTicket(null);
              }}
              ticket={selectedTicket}
              onTicketUpdate={() => {
                loadTickets(); // Recharger la liste des tickets
                loadNotifications(); // Recharger les notifications
              }}
              onTicketDetailsUpdate={(updatedTicket) => {
                setSelectedTicket(updatedTicket); // Mettre à jour le ticket sélectionné
              }}
            />
          )}
        </div>
      );
    }
