import React, { useState, useEffect } from 'react';
import { X, User, Mail, Calendar, Activity, Workflow, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { UserDetails } from '../../services/userManagementService';
import { UserManagementService } from '../../services/userManagementService';

interface UserDetailsModalProps {
  user: any; // User de base
  isOpen: boolean;
  onClose: () => void;
}

export function UserDetailsModal({ user, isOpen, onClose }: UserDetailsModalProps) {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadUserDetails();
    }
  }, [isOpen, user]);

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      const details = await UserManagementService.getUserDetails(user.id);
      setUserDetails(details);
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement des détails:', err);
      setError('Erreur lors du chargement des détails utilisateur');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-slate-900">Détails de l'utilisateur</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <span className="ml-2 text-slate-600">Chargement des détails...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : userDetails ? (
            <div className="space-y-6">
              {/* Informations de base */}
              <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Informations de base</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium text-slate-900">{userDetails.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Rôle</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userDetails.role === 'admin' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {userDetails.role === 'admin' ? 'Admin' : 'Utilisateur'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Créé le</p>
                      <p className="font-medium text-slate-900">
                        {new Date(userDetails.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Dernière connexion</p>
                      <p className="font-medium text-slate-900">
                        {userDetails.last_login 
                          ? new Date(userDetails.last_login).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Jamais'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informations du profil */}
                {(userDetails.first_name || userDetails.last_name || userDetails.company || userDetails.position) && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-md font-medium text-slate-900 mb-3">Profil</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userDetails.first_name && (
                        <div>
                          <p className="text-sm text-slate-500">Prénom</p>
                          <p className="font-medium text-slate-900">{userDetails.first_name}</p>
                        </div>
                      )}
                      {userDetails.last_name && (
                        <div>
                          <p className="text-sm text-slate-500">Nom</p>
                          <p className="font-medium text-slate-900">{userDetails.last_name}</p>
                        </div>
                      )}
                      {userDetails.company && (
                        <div>
                          <p className="text-sm text-slate-500">Entreprise</p>
                          <p className="font-medium text-slate-900">{userDetails.company}</p>
                        </div>
                      )}
                      {userDetails.position && (
                        <div>
                          <p className="text-sm text-slate-500">Poste</p>
                          <p className="font-medium text-slate-900">{userDetails.position}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Statistiques d'activité */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Statistiques d'activité</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-900">{userDetails.activity.total_workflows}</p>
                    <p className="text-sm text-blue-600">Total Workflows</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-900">{userDetails.activity.active_workflows}</p>
                    <p className="text-sm text-green-600">Workflows Actifs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-900">{userDetails.activity.workflows_this_week}</p>
                    <p className="text-sm text-purple-600">Cette Semaine</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-900">{userDetails.activity.workflows_this_month}</p>
                    <p className="text-sm text-orange-600">Ce Mois</p>
                  </div>
                </div>
              </div>

              {/* Liste des workflows */}
              {userDetails.workflows && userDetails.workflows.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Workflows de l'utilisateur</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Nom
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Statut
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Planification
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Créé le
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {userDetails.workflows.map((workflow) => (
                          <tr key={workflow.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Workflow className="w-5 h-5 text-slate-400 mr-3" />
                                <div>
                                  <div className="text-sm font-medium text-slate-900">{workflow.name}</div>
                                  {workflow.description && (
                                    <div className="text-sm text-slate-500">{workflow.description}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                workflow.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {workflow.is_active ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {workflow.schedule}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {new Date(workflow.created_at).toLocaleDateString('fr-FR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Activité récente */}
              {userDetails.recentActivity && userDetails.recentActivity.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Activité récente</h3>
                  <div className="space-y-3">
                    {userDetails.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                        <Activity className="w-5 h-5 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(activity.login_time).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
