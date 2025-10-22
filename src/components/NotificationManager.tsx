import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TicketNotification } from '../services/ticketsService';
import { TicketsService } from '../services/ticketsService';
import { notificationService, NotificationListener } from '../services/notificationService';
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

  // Listener pour les nouvelles notifications - stable
  const notificationListener = useRef<NotificationListener>({
    onNewNotification: (notification: TicketNotification) => {
      console.log('🔔 [NotificationManager] Nouvelle notification reçue:', notification);
      
      // Ajouter à la queue si aucune notification active
      setActiveNotification(prev => {
        if (!prev) {
          return notification;
        } else {
          setNotificationQueue(prevQueue => [...prevQueue, notification]);
          return prev;
        }
      });
    },

    onNotificationRead: (notificationId: string) => {
      console.log('🔔 [NotificationManager] Notification marquée comme lue:', notificationId);
      // Mettre à jour la liste des notifications
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  }).current;

  useEffect(() => {
    console.log('🔔 [NotificationManager] Initialisation du gestionnaire de notifications');
    
    // Charger les notifications existantes
    loadNotifications();

    // S'abonner au service de notifications
    notificationService.addListener(notificationListener);
    console.log('🔔 [NotificationManager] Abonné au service de notifications');

    return () => {
      // Se désabonner du service
      notificationService.removeListener(notificationListener);
      console.log('🔔 [NotificationManager] Désabonné du service de notifications');
    };
  }, []); // Supprimer notificationListener des dépendances

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
      notificationService.notifyNotificationRead(notificationId);
      
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
