import React, { useState } from 'react';
import { Folder, FolderPlus, Trash2, Library, BookOpen, Download } from 'lucide-react';
import { Category } from '../types';

interface SidebarProps {
  categories: Category[];
  activeCategoryId: string | null; // 'all', 'uncategorized', or UUID
  onSelectCategory: (id: string | null) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
  canInstall?: boolean;
  onInstall?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  onAddCategory,
  onDeleteCategory,
  canInstall,
  onInstall,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAdding(false);
    }
  };

  const NavItem = ({ id, label, icon: Icon, active, count, onDelete }: any) => (
    <div 
        className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors mb-1 ${active ? 'bg-brand-100 text-brand-900 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
        onClick={() => onSelectCategory(id)}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <Icon size={18} className={active ? 'text-brand-600' : 'text-slate-400'} />
        <span className="truncate">{label}</span>
      </div>
      {onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-slate-300 hover:bg-red-100 hover:text-red-600 rounded transition-all"
          title="Delete Collection"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 text-brand-600 font-bold text-xl">
          <BookOpen size={24} />
          <span>ShelfLife</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">Library</h3>
            <NavItem 
                id="all" 
                label="All Books" 
                icon={Library} 
                active={activeCategoryId === 'all'} 
            />
            <NavItem 
                id="uncategorized" 
                label="Uncategorized" 
                icon={Folder} 
                active={activeCategoryId === 'uncategorized'} 
            />
        </div>

        <div>
            <div className="flex items-center justify-between px-3 mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collections</h3>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                >
                    <FolderPlus size={16} />
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAddSubmit} className="px-3 mb-3">
                    <input
                        autoFocus
                        type="text"
                        placeholder="Collection name..."
                        className="w-full text-sm border border-brand-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        onBlur={() => !newCategoryName && setIsAdding(false)}
                    />
                </form>
            )}

            {categories.map(cat => (
                <NavItem 
                    key={cat.id}
                    id={cat.id}
                    label={cat.name}
                    icon={Folder}
                    active={activeCategoryId === cat.id}
                    onDelete={() => onDeleteCategory(cat.id)}
                />
            ))}
            
            {categories.length === 0 && !isAdding && (
                <p className="px-3 text-sm text-slate-400 italic">No collections yet.</p>
            )}
        </div>
      </div>
      
      <div className="p-4 border-t border-slate-100">
        {canInstall && (
            <button 
                onClick={onInstall}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors mb-3 shadow-md"
            >
                <Download size={16} />
                Install App
            </button>
        )}
        <div className="text-xs text-slate-400 text-center">
            Offline Ready • v1.0
        </div>
      </div>
    </div>
  );
};