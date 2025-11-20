import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/PDFFormModal.css';

interface CVScreeningFormModalProps {
  workflowId: string;
  workflowName: string;
  isOpen: boolean;
  onClose: () => void;
}

const CVScreeningFormModal: React.FC<CVScreeningFormModalProps> = ({ 
  workflowId, 
  workflowName, 
  isOpen, 
  onClose 
}) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const { user } = useAuth();

  const launchCVForm = async () => {
    setIsLaunching(true);
    
    try {
      console.log('🚀 [CVScreeningFormModal] Lancement du formulaire CV pour workflow:', workflowId);
      
      // Appeler l'API pour générer le lien personnalisé
      const response = await fetch('http://localhost:3004/api/deploy-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user?.id || '8c210030-7d0a-48ee-97d2-b74564b1efef',
          templateId: workflowId,
          userEmail: user?.email || 'user@heleam.com',
          formType: 'cv-screening' // Indiquer que c'est pour CV Screening
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du lien');
      }
      
      const data = await response.json();
      console.log('✅ [CVScreeningFormModal] Lien généré:', data.formUrl);
      
      // Ouvrir le formulaire dans un nouvel onglet
      window.open(data.formUrl, '_blank');
      
      // Fermer le modal après un court délai
      setTimeout(() => {
        onClose();
        setIsLaunching(false);
      }, 1000);
      
    } catch (error) {
      console.error('❌ [CVScreeningFormModal] Erreur lors du lancement du formulaire:', error);
      alert('Erreur lors de l\'ouverture du formulaire. Veuillez réessayer.');
      setIsLaunching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📄 Analyse de CV - Formulaire</h3>
          <button 
            onClick={onClose}
            className="close-button"
            disabled={isLaunching}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <div className="workflow-info">
            <p><strong>Workflow:</strong> {workflowName}</p>
            <p><strong>ID:</strong> {workflowId}</p>
          </div>
          
          <div className="form-description">
            <p>Cliquez sur le bouton ci-dessous pour ouvrir le formulaire d'analyse de CV :</p>
            <ul>
              <li>📄 Upload de <strong>plusieurs CV</strong> des candidats reçus (format PDF)</li>
              <li>💼 Définition des critères du poste à pourvoir</li>
              <li>🤖 Analyse automatique par IA de <strong>chaque CV</strong></li>
              <li>📊 <strong>Rapport complet</strong> avec score de qualification et évaluation détaillée pour chaque candidat</li>
              <li>💾 Stockage de <strong>tous les résultats</strong> dans votre système choisi (Google Sheets, Airtable, Notion, PostgreSQL)</li>
              <li>📧 Réception d'un <strong>email récapitulatif</strong> avec le rapport complet et tous les scores</li>
            </ul>
          </div>
          
          <button 
            onClick={launchCVForm}
            className={`launch-form-btn ${isLaunching ? 'loading' : ''}`}
            disabled={isLaunching}
          >
            {isLaunching ? (
              <>
                <span className="spinner"></span>
                Ouverture en cours...
              </>
            ) : (
              <>
                🚀 Ouvrir le Formulaire d'Analyse de CV
              </>
            )}
          </button>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="close-btn"
            disabled={isLaunching}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default CVScreeningFormModal;

