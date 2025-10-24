import React, { useState, useEffect } from 'react';
import { Bell, Mail, Send, CheckCircle, AlertCircle, Clock, X, Settings } from 'lucide-react';
import { notificationService, Notification } from '../../services/notificationService';

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    setupRealtimeNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // TODO: Charger depuis l'API
      console.log('Chargement des notifications...');
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeNotifications = () => {
    // Écouter les nouvelles notifications
    const disconnect = notificationService.connectToNotifications((notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Afficher notification du navigateur si permission accordée
      if (notification.type === 'push') {
        notificationService.showBrowserNotification(notification.title, {
          body: notification.message,
          tag: notification.id
        });
      }
    });

    return disconnect;
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => n.status === 'pending');
      
      await Promise.all(
        unreadNotifications.map(n => markAsRead(n.id))
      );
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'push': return <Bell className="w-4 h-4" />;
      case 'webhook': return <Send className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-slate-100 rounded"></div>
            <div className="h-16 bg-slate-100 rounded"></div>
            <div className="h-16 bg-slate-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Centre de Notifications</h3>
            <p className="text-sm text-slate-600">
              {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : 'Aucune nouvelle notification'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              Tout marquer comme lu
            </button>
          )}
          <button className="p-2 text-slate-500 hover:text-slate-700">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucune notification pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition-colors ${
                notification.status === 'pending'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-900 truncate">
                      {notification.title}
                    </h4>
                    {getStatusIcon(notification.status)}
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-2">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                    <span className="capitalize">
                      {notification.type}
                    </span>
                    {notification.data && Object.keys(notification.data).length > 0 && (
                      <span className="text-blue-600">
                        Données disponibles
                      </span>
                    )}
                  </div>
                </div>
                
                {notification.status === 'pending' && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600"
                    title="Marquer comme lu"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
