import React from 'react';

interface IconSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const iconOptions = [
  { value: '⚡', label: '⚡ Éclair', emoji: '⚡' },
  { value: '📖', label: '📖 Livre', emoji: '📖' },
  { value: '📊', label: '📊 Graphique', emoji: '📊' },
  { value: '👥', label: '👥 Utilisateurs', emoji: '👥' },
  { value: '🔗', label: '🔗 Lien', emoji: '🔗' },
  { value: '🛡️', label: '🛡️ Bouclier', emoji: '🛡️' },
  { value: '⚙️', label: '⚙️ Paramètres', emoji: '⚙️' },
  { value: '🗄️', label: '🗄️ Base de données', emoji: '🗄️' },
  { value: '☁️', label: '☁️ Cloud', emoji: '☁️' },
  { value: '🔒', label: '🔒 Cadenas', emoji: '🔒' },
  { value: '✅', label: '✅ Validation', emoji: '✅' },
  { value: '⭐', label: '⭐ Étoile', emoji: '⭐' },
  { value: '🚀', label: '🚀 Fusée', emoji: '🚀' },
  { value: '❤️', label: '❤️ Cœur', emoji: '❤️' },
  { value: '🎯', label: '🎯 Cible', emoji: '🎯' },
  { value: '💡', label: '💡 Ampoule', emoji: '💡' },
  { value: '🌍', label: '🌍 Monde', emoji: '🌍' },
  { value: '📧', label: '📧 Email', emoji: '📧' },
  { value: '📞', label: '📞 Téléphone', emoji: '📞' },
  { value: '📅', label: '📅 Calendrier', emoji: '📅' },
  { value: '🕐', label: '🕐 Horloge', emoji: '🕐' },
  { value: '📍', label: '📍 Localisation', emoji: '📍' },
  { value: '⬇️', label: '⬇️ Téléchargement', emoji: '⬇️' },
  { value: '⬆️', label: '⬆️ Upload', emoji: '⬆️' },
  { value: '🔄', label: '🔄 Actualiser', emoji: '🔄' },
  { value: '🔍', label: '🔍 Recherche', emoji: '🔍' },
  { value: '🔽', label: '🔽 Filtre', emoji: '🔽' },
  { value: '☰', label: '☰ Menu', emoji: '☰' },
  { value: '❌', label: '❌ Fermer', emoji: '❌' },
  { value: '➕', label: '➕ Ajouter', emoji: '➕' },
  { value: '➖', label: '➖ Soustraire', emoji: '➖' },
  { value: '✏️', label: '✏️ Modifier', emoji: '✏️' },
  { value: '🗑️', label: '🗑️ Supprimer', emoji: '🗑️' },
  { value: '💾', label: '💾 Sauvegarder', emoji: '💾' },
  { value: '📋', label: '📋 Copier', emoji: '📋' },
  { value: '📤', label: '📤 Partager', emoji: '📤' },
  { value: '👁️', label: '👁️ Voir', emoji: '👁️' },
  { value: '👁️‍🗨️', label: '👁️‍🗨️ Masquer', emoji: '👁️‍🗨️' },
  { value: '⚠️', label: '⚠️ Alerte', emoji: '⚠️' },
  { value: 'ℹ️', label: 'ℹ️ Information', emoji: 'ℹ️' },
  { value: '❓', label: '❓ Aide', emoji: '❓' },
  { value: '👍', label: '👍 J\'aime', emoji: '👍' },
  { value: '👎', label: '👎 Je n\'aime pas', emoji: '👎' },
  { value: '😊', label: '😊 Sourire', emoji: '😊' },
  { value: '😞', label: '😞 Triste', emoji: '😞' },
  { value: '😐', label: '😐 Neutre', emoji: '😐' }
];

export function IconSelect({ value, onChange, label, className = '' }: IconSelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <select
        value={value || 'Zap'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none transition"
      >
        {iconOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
