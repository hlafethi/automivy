import { useState, useEffect, useMemo } from 'react';
import { FileCode, Loader2, Info, Search, Filter, X } from 'lucide-react';
import { Template } from '../types';
import { templateService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { TemplateDetailsModal } from './TemplateDetailsModal';
import { MAIN_CATEGORIES, getSubcategories } from '../constants/categories';

export function TemplateCatalog() {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'setup_time' | 'execution_time'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      loadTemplates();
    }
  }, [user, authLoading]);

  // Réinitialiser la sous-catégorie quand la catégorie change
  useEffect(() => {
    if (categoryFilter === 'all') {
      setSubcategoryFilter('all');
    }
  }, [categoryFilter]);

  const loadTemplates = async () => {
    try {
      const data = await templateService.getVisibleTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer et trier les templates
  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    // Filtre par recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchLower) ||
        (template.description || '').toLowerCase().includes(searchLower)
      );
    }

    // Filtre par catégorie
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(template => template.category === categoryFilter);
    }

    // Filtre par sous-catégorie
    if (subcategoryFilter !== 'all') {
      filtered = filtered.filter(template => template.subcategory === subcategoryFilter);
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'setup_time':
          const aSetup = a.setup_time ?? 0;
          const bSetup = b.setup_time ?? 0;
          comparison = aSetup - bSetup;
          break;
        case 'execution_time':
          const aExec = a.execution_time ?? 0;
          const bExec = b.execution_time ?? 0;
          comparison = aExec - bExec;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [templates, searchTerm, categoryFilter, subcategoryFilter, sortBy, sortOrder]);

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const availableSubcategories = categoryFilter !== 'all' ? getSubcategories(categoryFilter) : [];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#046f78' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <FileCode className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Please log in</h3>
        <p className="text-slate-600">
          You need to be logged in to view the template catalog
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#046f78' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Template Catalog</h2>
        <p className="text-slate-600 mt-1">
          Browse available workflow templates
        </p>
      </div>

      {/* Barre de recherche et filtres - Design compact harmonisé */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:outline-none transition"
              style={{ 
                '--tw-ring-color': '#046f78',
              } as React.CSSProperties & { '--tw-ring-color'?: string }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#046f78';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Catégorie */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSubcategoryFilter('all');
            }}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:outline-none transition"
            style={{ 
              '--tw-ring-color': '#046f78',
            } as React.CSSProperties & { '--tw-ring-color'?: string }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
          >
            <option value="all">Toutes catégories</option>
            {MAIN_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Sous-catégorie */}
          {categoryFilter !== 'all' && (
            <select
              value={subcategoryFilter}
              onChange={(e) => setSubcategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:outline-none transition"
              style={{ 
                '--tw-ring-color': '#046f78',
              } as React.CSSProperties & { '--tw-ring-color'?: string }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
            >
              <option value="all">Toutes sous-catégories</option>
              {availableSubcategories.map(subcat => (
                <option key={subcat} value={subcat}>{subcat}</option>
              ))}
            </select>
          )}

          {/* Tri */}
          <div className="flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:outline-none transition"
              style={{ 
                '--tw-ring-color': '#046f78',
              } as React.CSSProperties & { '--tw-ring-color'?: string }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
            >
              <option value="created_at">Date</option>
              <option value="name">Nom</option>
              <option value="setup_time">Paramétrage</option>
              <option value="execution_time">Exécution</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2.5 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 transition text-sm"
              title={`Tri ${sortOrder === 'asc' ? 'décroissant' : 'croissant'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Réinitialiser */}
          {(searchTerm || categoryFilter !== 'all' || subcategoryFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition"
            >
              <X className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <FileCode className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No templates available yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Contact an admin to add workflow templates
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 relative"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#75ccd5'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                    <FileCode className="w-6 h-6" style={{ color: '#046f78' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 text-lg">{template.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Template ID: {template.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="p-2 rounded-lg transition-colors ml-2 flex-shrink-0"
                  style={{ color: '#046f78' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  aria-label="Voir les détails"
                  title="Voir les détails"
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                  {template.description || 'No description available'}
                </p>
              </div>

              {/* Badges catégorie et sous-catégorie */}
              {(template.category || template.subcategory) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {template.category && (
                    <span 
                      className="px-2 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: '#e0f4f6',
                        color: '#046f78',
                        border: '1px solid #75ccd5'
                      }}
                    >
                      {template.category}
                    </span>
                  )}
                  {template.subcategory && (
                    <span 
                      className="px-2 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: '#f0f9fa',
                        color: '#034a52',
                        border: '1px solid #b8e0e5'
                      }}
                    >
                      {template.subcategory}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-slate-500">
                  Created: {new Date(template.created_at).toLocaleDateString()}
                </div>
              </div>

              {(template.setup_time !== null && template.setup_time !== undefined) ||
              (template.execution_time !== null && template.execution_time !== undefined) ? (
                <div className="flex gap-3 pt-3 border-t border-slate-200">
                  {template.setup_time !== null && template.setup_time !== undefined && (
                    <div className="flex-1 bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-600 mb-1">Paramétrage</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {template.setup_time} min
                      </p>
                    </div>
                  )}
                  {template.execution_time !== null && template.execution_time !== undefined && (
                    <div className="flex-1 bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-600 mb-1">Exécution</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {template.execution_time} min
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {selectedTemplate && (
        <TemplateDetailsModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}
