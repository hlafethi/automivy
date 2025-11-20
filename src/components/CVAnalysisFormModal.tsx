import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/PDFFormModal.css';

interface CVAnalysisFormModalProps {
  workflowId: string;
  workflowName: string;
  isOpen: boolean;
  onClose: () => void;
}

const CVAnalysisFormModal: React.FC<CVAnalysisFormModalProps> = ({ 
  workflowId, 
  workflowName, 
  isOpen, 
  onClose 
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [profileWanted, setProfileWanted] = useState('');
  const [notificationEmail, setNotificationEmail] = useState(user?.email || '');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(file => {
        if (file.type !== 'application/pdf') {
          alert(`Le fichier ${file.name} n'est pas un PDF. Il sera ignoré.`);
          return false;
        }
        return true;
      });
      setSelectedFiles(files);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<{ name: string; type: string; data: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({
          name: file.name,
          type: file.type,
          data: base64
        });
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      alert('Veuillez sélectionner au moins un CV PDF');
      return;
    }
    
    if (!profileWanted.trim()) {
      alert('Veuillez décrire le profil recherché');
      return;
    }
    
    if (!notificationEmail.trim()) {
      alert('Veuillez renseigner votre email pour recevoir le rapport');
      return;
    }
    
    setIsSubmitting(true);
    setResult(null);
    
    try {
      console.log('🚀 [CVAnalysisFormModal] Soumission des CVs pour workflow:', workflowId);
      console.log('📄 [CVAnalysisFormModal] Nombre de CVs:', selectedFiles.length);
      
      // Convertir tous les fichiers en base64
      const cvFiles = await Promise.all(selectedFiles.map(fileToBase64));
      
      // Préparer les données
      const formData = {
        cvFiles: cvFiles,
        profileWanted: profileWanted.trim(),
        notificationEmail: notificationEmail.trim(),
        workflowId: workflowId,
        userId: user?.id || ''
      };
      
      // Envoyer vers le backend
      const response = await fetch('http://localhost:3004/api/cv-analysis-evaluation/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setResult({
          success: true,
          message: `✅ Analyse terminée avec succès !\n\n📊 ${selectedFiles.length} CV${selectedFiles.length > 1 ? 's ont été analysés' : ' a été analysé'} et évalué${selectedFiles.length > 1 ? 's' : ''}.\n📧 Un email avec le rapport comparatif, les scores (1-10) et l'évaluation détaillée pour chaque candidat a été envoyé à ${formData.notificationEmail}.\n\n🏆 Le meilleur CV a été identifié dans le rapport.`
        });
        
        // Réinitialiser le formulaire
        setSelectedFiles([]);
        setProfileWanted('');
        setNotificationEmail(user?.email || '');
        
        // Réinitialiser l'input file
        const fileInput = document.getElementById('cvFiles') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }
      
    } catch (error: any) {
      console.error('❌ [CVAnalysisFormModal] Erreur lors de la soumission:', error);
      setResult({
        success: false,
        message: `❌ Erreur: ${error.message || 'Une erreur est survenue lors de l\'analyse du CV'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>📄 Analyse et Évaluation de CV</h3>
          <button 
            onClick={onClose}
            className="close-button"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="workflow-info" style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
            <p style={{ margin: '0', fontWeight: '600', color: '#046f78' }}><strong>Workflow:</strong> {workflowName}</p>
          </div>
          
          {!result ? (
            <form onSubmit={handleSubmit} className="cv-analysis-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="cvFiles" style={{ fontWeight: '600', color: '#23272f' }}>
                  📄 CVs des candidats (PDF) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="file"
                  id="cvFiles"
                  accept=".pdf"
                  multiple
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  required
                  style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Vous pouvez sélectionner plusieurs CVs PDF. Le nom et l'email de chaque candidat seront automatiquement extraits depuis le CV.
                </small>
                {selectedFiles.length > 0 && (
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '14px' }}>
                      ✅ {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''} sélectionné{selectedFiles.length > 1 ? 's' : ''} :
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedFiles.map((file, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                          <span style={{ fontSize: '13px', color: '#374151' }}>
                            📄 {file.name} ({(file.size / 1024).toFixed(2)} KB)
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            disabled={isSubmitting}
                            style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="profileWanted" style={{ fontWeight: '600', color: '#23272f' }}>
                  💼 Profil recherché <span style={{ color: 'red' }}>*</span>
                </label>
                <textarea
                  id="profileWanted"
                  value={profileWanted}
                  onChange={(e) => setProfileWanted(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Ex: Nous recherchons un assistant administratif avec expérience en gestion d'agenda, accueil client, traitement de courrier et support administratif général. Le candidat doit maîtriser Pack Office et avoir une bonne communication."
                  rows={5}
                  required
                  style={{ padding: '12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Décrivez en détail le profil recherché pour ce poste. L'IA évaluera la correspondance de chaque candidat avec ce profil et attribuera un score de 1 à 10.
                </small>
              </div>
              
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="notificationEmail" style={{ fontWeight: '600', color: '#23272f' }}>
                  📧 Email pour recevoir le rapport d'évaluation <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="email"
                  id="notificationEmail"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={user?.email || 'votre@email.com'}
                  required
                  style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Vous recevrez un email avec un rapport comparatif de tous les CVs, les scores (1-10) et l'identification du meilleur candidat.
                </small>
              </div>
              
              <div className="form-description" style={{ marginTop: '10px', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: '#166534', fontSize: '15px' }}>📋 Ce que fait cette analyse :</p>
                <ul style={{ margin: '0', paddingLeft: '20px', color: '#166534', fontSize: '14px', lineHeight: '1.8' }}>
                  <li>📄 <strong>Extraction automatique</strong> du nom et de l'email depuis chaque CV</li>
                  <li>🎓 Extraction des qualifications académiques</li>
                  <li>💼 Analyse de l'historique professionnel</li>
                  <li>🛠️ Identification des compétences techniques</li>
                  <li>📊 Évaluation de la correspondance avec le profil recherché</li>
                  <li>⭐ Attribution d'un <strong>score de 1 à 10</strong> pour chaque candidat</li>
                  <li>🏆 <strong>Identification du meilleur CV</strong> dans le rapport</li>
                  <li>📧 Envoi d'un <strong>rapport comparatif détaillé</strong> par email</li>
                </ul>
              </div>
              
              <div className="modal-footer" style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="close-btn"
                  disabled={isSubmitting}
                  style={{ padding: '10px 20px', fontSize: '14px' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`launch-form-btn ${isSubmitting ? 'loading' : ''}`}
                  disabled={isSubmitting || selectedFiles.length === 0 || !profileWanted.trim() || !notificationEmail.trim()}
                  style={{ padding: '10px 24px', fontSize: '14px', fontWeight: '600' }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner"></span>
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      🚀 Lancer l'Analyse ({selectedFiles.length} CV{selectedFiles.length > 1 ? 's' : ''})
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="result-container" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: result.success ? '#d1fae5' : '#fee2e2',
                color: result.success ? '#065f46' : '#991b1b',
                whiteSpace: 'pre-line',
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                {result.message}
              </div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setResult(null);
                    setSelectedFiles([]);
                    setProfileWanted('');
                    setNotificationEmail(user?.email || '');
                    const fileInput = document.getElementById('cvFiles') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                  className="launch-form-btn"
                  style={{ padding: '10px 20px', fontSize: '14px' }}
                >
                  Analyser d'autres CVs
                </button>
                <button
                  onClick={onClose}
                  className="close-btn"
                  style={{ padding: '10px 20px', fontSize: '14px' }}
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CVAnalysisFormModal;

