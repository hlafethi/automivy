// Modal pour générer une newsletter via webhook
// Permet de saisir email, thème et autres paramètres

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/PDFFormModal.css';

interface NewsletterFormModalProps {
  workflowId: string;
  workflowName: string;
  webhookUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

const NewsletterFormModal: React.FC<NewsletterFormModalProps> = ({
  workflowId,
  workflowName,
  webhookUrl,
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: user?.email || '',
    theme: '',
    language: 'fr',
    includeStats: false,
    context: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      console.log('🚀 [NewsletterFormModal] Génération newsletter pour workflow:', workflowId);
      console.log('📧 [NewsletterFormModal] Email destinataire:', formData.email);
      console.log('📌 [NewsletterFormModal] Thème:', formData.theme);
      console.log('🔗 [NewsletterFormModal] Webhook URL:', webhookUrl);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          theme: formData.theme,
          language: formData.language,
          includeStats: formData.includeStats,
          context: formData.context || undefined,
          preferences: {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [NewsletterFormModal] Newsletter générée avec succès:', data);

      setSuccess(true);
      
      // Fermer le modal après 2 secondes
      setTimeout(() => {
        onClose();
        setSuccess(false);
        // Réinitialiser le formulaire
        setFormData({
          email: user?.email || '',
          theme: '',
          language: 'fr',
          includeStats: false,
          context: ''
        });
      }, 2000);

    } catch (error: any) {
      console.error('❌ [NewsletterFormModal] Erreur lors de la génération:', error);
      setError(error.message || 'Erreur lors de la génération de la newsletter');
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📬 Générer une Newsletter</h3>
          <button
            onClick={onClose}
            className="close-button"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="workflow-info">
            <p><strong>Workflow:</strong> {workflowName}</p>
          </div>

          {success ? (
            <div className="success-message" style={{
              padding: '20px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '8px',
              color: '#155724',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>✅ Newsletter générée avec succès !</h4>
              <p style={{ margin: 0 }}>La newsletter a été envoyée à {formData.email}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && (
                <div className="error-message" style={{
                  padding: '15px',
                  backgroundColor: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  borderRadius: '8px',
                  color: '#721c24'
                }}>
                  <strong>Erreur:</strong> {error}
                </div>
              )}

              <div>
                <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  📧 Email du destinataire <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="destinataire@example.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label htmlFor="theme" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  📌 Thème de la newsletter <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  id="theme"
                  name="theme"
                  value={formData.theme}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Intelligence Artificielle, Marketing Digital, etc."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label htmlFor="language" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  🌍 Langue
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="includeStats"
                    checked={formData.includeStats}
                    onChange={handleChange}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '600' }}>📊 Inclure des statistiques et données chiffrées</span>
                </label>
                <p style={{ margin: '5px 0 0 30px', fontSize: '14px', color: '#666' }}>
                  L'agent IA utilisera la calculatrice pour inclure des statistiques précises
                </p>
              </div>

              <div>
                <label htmlFor="context" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  📝 Contexte supplémentaire (optionnel)
                </label>
                <textarea
                  id="context"
                  name="context"
                  value={formData.context}
                  onChange={handleChange}
                  placeholder="Ajoutez des informations supplémentaires pour personnaliser la newsletter..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div className="form-description" style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#666'
              }}>
                <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>ℹ️ Comment ça fonctionne :</p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>🤖 L'agent IA génère une newsletter complète sur le thème choisi</li>
                  <li>📊 Des statistiques peuvent être incluses si demandé</li>
                  <li>📧 La newsletter est envoyée directement à l'adresse email indiquée</li>
                  <li>⏱️ Génération en quelques secondes</li>
                </ul>
              </div>

              <button
                type="submit"
                className={`launch-form-btn ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting || !formData.email || !formData.theme}
                style={{
                  marginTop: '10px',
                  padding: '15px 30px',
                  fontSize: '16px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmitting || !formData.email || !formData.theme ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || !formData.email || !formData.theme ? 0.6 : 1,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  transition: 'all 0.3s ease'
                }}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Génération en cours...
                  </>
                ) : (
                  <>
                    🚀 Générer la Newsletter
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            className="close-btn"
            disabled={isSubmitting}
          >
            {success ? 'Fermer' : 'Annuler'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsletterFormModal;

