import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TicketNotification } from '../services/ticketsService';
import { TicketsService } from '../services/ticketsService';
import { NotificationPopup } from './NotificationPopup';

interface NotificationManagerProps {
  onViewTicket?: (ticketId: string) => void;
  onNotificationRead?: () => void; // Callback when notification is read
  isAdmin?: boolean;
}

export function NotificationManager({ onViewTicket, onNotificationRead, isAdmin = false }: NotificationManagerProps) {
  const [notifications, setNotifications] = useState<TicketNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<TicketNotification | null>(null);
  const [notificationQueue, setNotificationQueue] = useState<TicketNotification[]>([]);
  
  // Utiliser useRef pour stabiliser les callbacks
  const onViewTicketRef = useRef(onViewTicket);
  const onNotificationReadRef = useRef(onNotificationRead);
  
  // Mettre à jour les refs quand les props changent
  useEffect(() => {
    onViewTicketRef.current = onViewTicket;
    onNotificationReadRef.current = onNotificationRead;
  }, [onViewTicket, onNotificationRead]);

  // Polling pour les nouvelles notifications
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('🔔 [NotificationManager] Initialisation du gestionnaire de notifications');
    
    // Charger les notifications existantes
    loadNotifications();

    // Démarrer le polling pour les nouvelles notifications
    pollingInterval.current = setInterval(() => {
      loadNotifications();
    }, 30000); // Vérifier toutes les 30 secondes

    return () => {
      // Arrêter le polling
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, []);

  const loadNotifications = async () => {
    try {
      console.log('🔔 [NotificationManager] Chargement des notifications...');
      const response = await TicketsService.getUnreadNotifications();
      console.log('🔔 [NotificationManager] Notifications chargées:', response.length);
      setNotifications(response);
      
      // Afficher la première notification non lue si aucune n'est active
      if (response.length > 0 && !activeNotification) {
        // Afficher automatiquement la première notification non lue
        setActiveNotification(response[0]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  const handleCloseNotification = () => {
    setActiveNotification(null);
    
    // Afficher la prochaine notification dans la queue
    if (notificationQueue.length > 0) {
      const nextNotification = notificationQueue[0];
      setNotificationQueue(prev => prev.slice(1));
      setActiveNotification(nextNotification);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await TicketsService.markNotificationAsRead(notificationId);
      
      // Mettre à jour l'état local
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Appeler le callback si fourni
      if (onNotificationReadRef.current) {
        onNotificationReadRef.current();
      }
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error);
    }
  };

  const handleViewTicket = (ticketId: string) => {
    if (onViewTicketRef.current) {
      onViewTicketRef.current(ticketId);
    }
  };

  // N'afficher les notifications que pour les admins
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      {activeNotification && (
        <NotificationPopup
          notification={activeNotification}
          onClose={handleCloseNotification}
          onMarkAsRead={handleMarkAsRead}
          onViewTicket={handleViewTicket}
        />
      )}
    </>
  );
}
