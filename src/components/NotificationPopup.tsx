import React, { useState, useEffect } from 'react';
import { X, Bell, MessageSquare, Ticket, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';
import { TicketNotification } from '../services/ticketsService';

interface NotificationPopupProps {
  notification: TicketNotification;
  onClose: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onViewTicket?: (ticketId: string) => void;
}

export function NotificationPopup({ notification, onClose, onMarkAsRead, onViewTicket }: NotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animation d'entrée
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Attendre la fin de l'animation
  };

  const handleMarkAsRead = () => {
    onMarkAsRead(notification.id);
    handleClose();
  };

  const handleViewTicket = () => {
    if (onViewTicket) {
      onViewTicket(notification.ticket_id);
    }
    handleMarkAsRead();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Ticket className="w-5 h-5 text-blue-600" />;
      case 'commented':
        return <MessageSquare className="w-5 h-5 text-green-600" />;
      case 'updated':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'closed':
        return <X className="w-5 h-5 text-gray-600" />;
      case 'assigned':
        return <User className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'created':
        return 'border-blue-200 bg-blue-50';
      case 'commented':
        return 'border-green-200 bg-green-50';
      case 'updated':
        return 'border-orange-200 bg-orange-50';
      case 'resolved':
        return 'border-green-200 bg-green-50';
      case 'closed':
        return 'border-gray-200 bg-gray-50';
      case 'assigned':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'created':
        return 'Nouveau ticket';
      case 'commented':
        return 'Nouveau commentaire';
      case 'updated':
        return 'Ticket mis à jour';
      case 'resolved':
        return 'Ticket résolu';
      case 'closed':
        return 'Ticket fermé';
      case 'assigned':
        return 'Ticket assigné';
      default:
        return 'Notification';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'À l\'instant';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`${getNotificationColor(notification.type)} border rounded-lg shadow-lg p-4`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getNotificationIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-slate-900">
                {getNotificationTitle(notification.type)}
              </h4>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-slate-700 mb-2 line-clamp-2">
              {notification.message}
            </p>
            
            {notification.ticket_title && (
              <p className="text-xs text-slate-600 font-medium mb-2">
                Ticket: {notification.ticket_title}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {formatTime(notification.created_at)}
              </span>
              
              <div className="flex items-center gap-2">
                {onViewTicket && (
                  <button
                    onClick={handleViewTicket}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Voir
                  </button>
                )}
                <button
                  onClick={handleMarkAsRead}
                  className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                >
                  Marquer lu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
