import React, { useState } from 'react';
import { Folder, FolderPlus, Trash2, Library, BookOpen, Download } from 'lucide-react';
import { Category } from '../types';

interface SidebarProps {
  theme: 'light' | 'dark';
  categories: Category[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
  canInstall?: boolean;
  onInstall?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  theme,
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

  const NavItem = ({ id, label, icon: Icon, active, onDelete }: any) => (
    <div 
        className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors mb-1 
          ${active 
            ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-900 dark:text-brand-400 font-medium' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        onClick={() => onSelectCategory(id)}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <Icon size={18} className={active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'} />
        <span className="truncate">{label}</span>
      </div>
      {onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-slate-300 dark:text-slate-600 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded transition-all"
          title="Delete Collection"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );

  return (
    <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full flex flex-col flex-shrink-0 transition-colors duration-300">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-xl">
          <BookOpen size={24} />
          <span>ShelfLife</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider mb-2 px-3">Library</h3>
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
                <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Collections</h3>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 transition-colors"
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
                        className="w-full text-sm border border-brand-200 dark:border-brand-800 rounded px-2 py-1 bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                <p className="px-3 text-sm text-slate-400 dark:text-slate-600 italic">No collections yet.</p>
            )}
        </div>
      </div>
      
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        {canInstall && (
            <button 
                onClick={onInstall}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-brand-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-slate-800 dark:hover:bg-brand-500 transition-colors mb-3 shadow-md"
            >
                <Download size={16} />
                Install App
            </button>
        )}
        <div className="text-xs text-slate-400 dark:text-slate-600 text-center">
            Offline Ready • v1.2
        </div>
      </div>
    </div>
  );
};
