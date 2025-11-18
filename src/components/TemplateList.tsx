import { useState, useEffect, useMemo } from 'react';
import { Trash2, Eye, EyeOff, FileJson, Loader2, Rocket, Edit, Search, Filter, X } from 'lucide-react';
import { templateService } from '../services';
import { Template } from '../types';
import { WorkflowDeployModal } from './WorkflowDeployModal';
import { TemplateEditModal } from './TemplateEditModal';
import { useAuth } from '../contexts/AuthContext';
import { MAIN_CATEGORIES, getSubcategories } from '../constants/categories';

export function TemplateList() {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [deployTemplate, setDeployTemplate] = useState<Template | null>(null);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'nodes'>('created_at');
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
      const data = await templateService.getAllTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await templateService.deleteTemplate(id);
      loadTemplates();
    } catch (error) {
      alert('Failed to delete template');
    }
  };

  const handleEdit = (template: Template) => {
    setEditTemplate(template);
  };

  const handleToggleVisibility = async (templateId: string, currentVisible: boolean) => {
    try {
      await templateService.updateTemplateVisibility(templateId, !currentVisible);
      loadTemplates();
    } catch (error: any) {
      console.error('Error updating template visibility:', error);
      alert('Failed to update template visibility');
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

    // Filtre par visibilité
    if (visibilityFilter !== 'all') {
      filtered = filtered.filter(template => {
        const isVisible = (template as any).visible !== false;
        return visibilityFilter === 'visible' ? isVisible : !isVisible;
      });
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
        case 'nodes':
          const aNodes = a.json?.nodes?.length || 0;
          const bNodes = b.json?.nodes?.length || 0;
          comparison = aNodes - bNodes;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [templates, searchTerm, visibilityFilter, categoryFilter, subcategoryFilter, sortBy, sortOrder]);

  const resetFilters = () => {
    setSearchTerm('');
    setVisibilityFilter('all');
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
        <FileJson className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Please log in</h3>
        <p className="text-slate-600">
          You need to be logged in to view templates
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
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          All Templates ({filteredTemplates.length})
        </h3>
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

          {/* Visibilité */}
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:outline-none transition"
            style={{ 
              '--tw-ring-color': '#046f78',
            } as React.CSSProperties & { '--tw-ring-color'?: string }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
          >
            <option value="all">Tous</option>
            <option value="visible">Visibles</option>
            <option value="hidden">Masqués</option>
          </select>

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
              <option value="nodes">Nœuds</option>
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
          {(searchTerm || visibilityFilter !== 'all' || categoryFilter !== 'all' || subcategoryFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition"
            >
              <X className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Compteur de résultats */}
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-600">
            {filteredTemplates.length} template(s) trouvé(s) sur {templates.length}
          </div>
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <FileJson className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {templates.length === 0 ? 'No Templates Yet' : 'No templates match your filters'}
          </h3>
          <p className="text-slate-600">
            {templates.length === 0 
              ? 'Upload or generate your first template to get started'
              : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200"
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#75ccd5'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                  <FileJson className="w-6 h-6" style={{ color: '#046f78' }} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 text-lg mb-1">
                    {template.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Template ID: {template.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                {template.description || 'No description available'}
              </p>
            </div>

            {/* Badges catégorie et sous-catégorie */}
            {(template.category || template.subcategory) && (
              <div className="flex flex-wrap gap-2 mb-4">
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

            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-slate-500">
                Created: {new Date(template.created_at).toLocaleDateString()}
              </div>
              <div className="text-xs text-slate-500">
                Nodes: {template.json?.nodes?.length || 0}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  title="View JSON"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="p-2 rounded-lg transition"
                  style={{ color: '#046f78' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Edit template"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleVisibility(template.id, template.visible)}
                  className={`p-2 rounded-lg transition ${
                    template.visible
                      ? ''
                      : 'text-slate-400 hover:bg-slate-50'
                  }`}
                  style={template.visible ? { color: '#046f78' } : {}}
                  onMouseEnter={template.visible ? (e) => e.currentTarget.style.backgroundColor = '#e0f4f6' : undefined}
                  onMouseLeave={template.visible ? (e) => e.currentTarget.style.backgroundColor = 'transparent' : undefined}
                  title={template.visible ? 'Hide from users' : 'Show to users'}
                >
                  {template.visible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Delete template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => {
                  console.log('Deploy button clicked in TemplateList for:', template.name);
                  setDeployTemplate(template);
                }}
                className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-md"
                style={{ backgroundColor: '#046f78' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#034a52'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#046f78'}
                title="Deploy to n8n"
              >
                <Rocket className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {selectedTemplate && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedTemplate(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {selectedTemplate.name}
              </h3>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <pre className="bg-slate-50 p-4 rounded-lg overflow-auto text-xs text-slate-700">
                {JSON.stringify(selectedTemplate.json, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {deployTemplate && (
        <WorkflowDeployModal
          template={deployTemplate}
          onClose={() => setDeployTemplate(null)}
          onSuccess={() => {
            setDeployTemplate(null);
            loadTemplates();
          }}
        />
      )}

      {editTemplate && (
        <TemplateEditModal
          template={editTemplate}
          onClose={() => setEditTemplate(null)}
          onSuccess={() => {
            setEditTemplate(null);
            loadTemplates();
          }}
        />
      )}
    </div>
  );
}