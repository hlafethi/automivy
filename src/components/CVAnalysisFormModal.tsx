import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, FileText, Mail, Loader2, CheckCircle, Upload, Briefcase, Sparkles } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec gradient */}
        <div className="px-8 py-6 text-white" style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Analyse et Évaluation de CV</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  {workflowName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2 transition-all duration-200"
              disabled={isSubmitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(95vh-200px)]">
          
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section CVs */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                    <FileText className="w-5 h-5" style={{ color: '#046f78' }} />
                  </div>
                  <div>
                    <label htmlFor="cvFiles" className="text-lg font-semibold text-slate-800 block">
                      CVs des candidats (PDF) <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-slate-600 mt-1">
                      Vous pouvez sélectionner plusieurs CVs PDF. Le nom et l'email de chaque candidat seront automatiquement extraits depuis le CV.
                    </p>
                  </div>
                </div>
                <label 
                  htmlFor="cvFiles"
                  className="relative block w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 group"
                >
                  <input
                    type="file"
                    id="cvFiles"
                    accept=".pdf"
                    multiple
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    required
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors group-hover:bg-slate-100" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                      <Upload className="w-6 h-6" style={{ color: '#046f78' }} />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium text-slate-700 block">
                        Cliquez pour sélectionner des fichiers PDF
                      </span>
                      <span className="text-xs text-slate-500 mt-1 block">
                        ou glissez-déposez vos fichiers ici
                      </span>
                    </div>
                  </div>
                </label>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#046f78' }}>
                      <CheckCircle className="w-4 h-4" />
                      <span>{selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''} sélectionné{selectedFiles.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-slate-400" />
                            <div>
                              <span className="text-sm font-medium text-slate-800 block">{file.name}</span>
                              <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            disabled={isSubmitting}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Section Profil recherché */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                    <Briefcase className="w-5 h-5" style={{ color: '#046f78' }} />
                  </div>
                  <div>
                    <label htmlFor="profileWanted" className="text-lg font-semibold text-slate-800 block">
                      Profil recherché <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-slate-600 mt-1">
                      Décrivez en détail le profil recherché pour ce poste. L'IA évaluera la correspondance de chaque candidat avec ce profil et attribuera un score de 1 à 10.
                    </p>
                  </div>
                </div>
                <textarea
                  id="profileWanted"
                  value={profileWanted}
                  onChange={(e) => setProfileWanted(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Ex: Nous recherchons un assistant administratif avec expérience en gestion d'agenda, accueil client, traitement de courrier et support administratif général. Le candidat doit maîtriser Pack Office et avoir une bonne communication."
                  rows={5}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 resize-vertical"
                  style={{ 
                    '--tw-ring-color': '#046f78',
                  } as React.CSSProperties}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                />
              </div>
              
              {/* Section Email */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                    <Mail className="w-5 h-5" style={{ color: '#046f78' }} />
                  </div>
                  <div>
                    <label htmlFor="notificationEmail" className="text-lg font-semibold text-slate-800 block">
                      Email pour recevoir le rapport d'évaluation <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-slate-600 mt-1">
                      Vous recevrez un email avec un rapport comparatif de tous les CVs, les scores (1-10) et l'identification du meilleur candidat.
                    </p>
                  </div>
                </div>
                <input
                  type="email"
                  id="notificationEmail"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={user?.email || 'votre@email.com'}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{ 
                    '--tw-ring-color': '#046f78',
                  } as React.CSSProperties}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                />
              </div>
              
              {/* Section Informations */}
              <div className="rounded-xl p-6 shadow-sm" style={{ background: 'linear-gradient(to right, #e0f4f6, #d1eef1)', border: '1px solid #75ccd5' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#75ccd5' }}>
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: '#034a52' }}>Ce que fait cette analyse :</h3>
                </div>
                <ul className="space-y-2 text-sm" style={{ color: '#046f78' }}>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">📄</span>
                    <span><strong>Extraction automatique</strong> du nom et de l'email depuis chaque CV</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">🎓</span>
                    <span>Extraction des qualifications académiques</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">💼</span>
                    <span>Analyse de l'historique professionnel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">🛠️</span>
                    <span>Identification des compétences techniques</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">📊</span>
                    <span>Évaluation de la correspondance avec le profil recherché</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">⭐</span>
                    <span>Attribution d'un <strong>score de 1 à 10</strong> pour chaque candidat</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">🏆</span>
                    <span><strong>Identification du meilleur CV</strong> dans le rapport</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">📧</span>
                    <span>Envoi d'un <strong>rapport comparatif détaillé</strong> par email</span>
                  </li>
                </ul>
              </div>
              
              {/* Footer avec boutons */}
              <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200 font-medium"
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedFiles.length === 0 || !profileWanted.trim() || !notificationEmail.trim()}
                  className="px-8 py-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
                  style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.background = 'linear-gradient(to right, #034a52, #023a42)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.background = 'linear-gradient(to right, #046f78, #034a52)';
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Lancer l'Analyse ({selectedFiles.length} CV{selectedFiles.length > 1 ? 's' : ''})
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${
                result.success 
                  ? 'bg-gradient-to-br from-green-100 to-green-200' 
                  : 'bg-gradient-to-br from-red-100 to-red-200'
              }`}>
                {result.success ? (
                  <CheckCircle className="w-10 h-10 text-green-600" />
                ) : (
                  <X className="w-10 h-10 text-red-600" />
                )}
              </div>
              <div className={`rounded-xl p-6 max-w-md mx-auto shadow-sm ${
                result.success
                  ? 'bg-gradient-to-r from-green-50 to-green-100 border border-green-200'
                  : 'bg-gradient-to-r from-red-50 to-red-100 border border-red-200'
              }`}>
                <p className={`text-sm whitespace-pre-line leading-relaxed ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.message}
                </p>
              </div>
              <div className="flex gap-4 justify-center mt-6">
                {result.success && (
                  <button
                    onClick={() => {
                      setResult(null);
                      setSelectedFiles([]);
                      setProfileWanted('');
                      setNotificationEmail(user?.email || '');
                      const fileInput = document.getElementById('cvFiles') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                    className="px-6 py-3 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                    style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}
                  >
                    Analyser d'autres CVs
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200 font-medium"
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

