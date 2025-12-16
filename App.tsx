import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Upload, Search, Filter, Book, Clock, Menu, Download, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Reader } from './components/Reader';
import * as db from './services/db';
import { Category, PdfFile, PdfMetadata } from './types';

export default function App() {
  // Data State
  const [files, setFiles] = useState<PdfMetadata[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // UI State
  const [viewState, setViewState] = useState<'library' | 'reader'>('library');
  const [activePdfId, setActivePdfId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed on mobile, logic handles desktop
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  // Active Reader File
  const [readerFile, setReaderFile] = useState<PdfFile | null>(null);

  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (!mobile) setIsSidebarOpen(true);
        else setIsSidebarOpen(false);
    };
    
    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for PWA install event
  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    // Show the install prompt
    installPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    // Optionally, send analytics event with outcome of user choice
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
  };

  // Initial Load
  useEffect(() => {
    const init = async () => {
      try {
        const [loadedFiles, loadedCats] = await Promise.all([
            db.getAllPdfMetadata(),
            db.getCategories()
        ]);
        setFiles(loadedFiles);
        setCategories(loadedCats);
      } catch (error) {
        console.error("Failed to load DB", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Filtered Files Logic
  const filteredFiles = useMemo(() => {
    let result = files;

    // Category Filter
    if (activeCategoryId === 'uncategorized') {
        result = result.filter(f => !f.categoryId);
    } else if (activeCategoryId && activeCategoryId !== 'all') {
        result = result.filter(f => f.categoryId === activeCategoryId);
    }

    // Search Filter
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(f => f.name.toLowerCase().includes(q));
    }

    return result;
  }, [files, activeCategoryId, searchQuery]);

  // Actions
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setUploading(true);
    const newFiles: File[] = Array.from(e.target.files);
    
    // Process sequentially to avoid memory spikes with large batches
    for (const file of newFiles) {
        if (file.type !== 'application/pdf') continue;

        const newPdf: PdfFile = {
            id: uuidv4(),
            name: file.name,
            categoryId: (activeCategoryId !== 'all' && activeCategoryId !== 'uncategorized') ? activeCategoryId : null,
            blob: file, // Store the Blob directly
            addedAt: Date.now(),
            lastReadAt: null,
            currentPage: 1,
            totalPages: 0,
            size: file.size
        };

        await db.addPdf(newPdf);
        // Update local list (metadata only)
        const { blob, ...metadata } = newPdf;
        setFiles(prev => [metadata, ...prev]);
    }
    setUploading(false);
    // Reset input
    e.target.value = '';
  };

  const handleOpenPdf = async (id: string) => {
    try {
        const fullPdf = await db.getPdfById(id);
        if (fullPdf) {
            setReaderFile(fullPdf);
            setActivePdfId(id);
            setViewState('reader');
        }
    } catch (err) {
        console.error("Error opening PDF", err);
        alert("Could not open PDF. It might be missing from storage.");
    }
  };

  const handleCloseReader = async () => {
     setViewState('library');
     setReaderFile(null);
     setActivePdfId(null);
     // Refresh metadata to update progress bars
     const freshFiles = await db.getAllPdfMetadata();
     setFiles(freshFiles);
  };

  const deletePdfById = async (id: string) => {
     await db.deletePdf(id);
     setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDeletePdf = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this book?")) {
          await deletePdfById(id);
      }
  };

  // Called from within Reader
  const handleReaderDelete = async () => {
     if (readerFile) {
        await deletePdfById(readerFile.id);
        handleCloseReader();
     }
  };

  const handleAddCategory = async (name: string) => {
      const newCat: Category = {
          id: uuidv4(),
          name,
          createdAt: Date.now()
      };
      await db.addCategory(newCat);
      setCategories(prev => [...prev, newCat]);
  };

  const handleDeleteCategory = async (id: string) => {
      if (confirm("Delete this collection? Books inside will move to Uncategorized.")) {
        await db.deleteCategory(id);
        setCategories(prev => prev.filter(c => c.id !== id));
        // Refresh files to reflect uncategorization
        const freshFiles = await db.getAllPdfMetadata();
        setFiles(freshFiles);
        if (activeCategoryId === id) setActiveCategoryId('all');
      }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.items) {
         // Logic similar to file upload input
      }
  };

  // Move file to category
  const handleMoveToCategory = async (e: React.MouseEvent, pdfId: string, catId: string | null) => {
      e.stopPropagation();
      await db.updatePdfCategory(pdfId, catId);
      setFiles(prev => prev.map(f => f.id === pdfId ? { ...f, categoryId: catId } : f));
  };

  if (loading) {
      return (
          <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-50 text-slate-400">
              <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                  <p>Loading Library...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-slate-50 relative" onDragOver={handleDragOver} onDrop={handleDrop}>
      
      {/* Mobile Sidebar Toggle - Visible only when sidebar is closed on mobile */}
      {isMobile && !isSidebarOpen && viewState === 'library' && (
         <button 
           onClick={() => setIsSidebarOpen(true)}
           className="absolute top-4 left-4 z-20 p-2 bg-white shadow-md rounded-md text-slate-600 md:hidden active:bg-slate-100"
         >
           <Menu size={20} />
         </button>
      )}

      {/* Sidebar - Conditional Render on Mobile */}
      <div 
        className={`fixed md:relative z-30 h-full transition-transform duration-300 ease-in-out bg-white shadow-xl md:shadow-none
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:translate-x-0 md:block
        `}
      >
         <Sidebar 
            categories={categories}
            activeCategoryId={activeCategoryId}
            onSelectCategory={(id) => { setActiveCategoryId(id); if(isMobile) setIsSidebarOpen(false); }}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            canInstall={!!installPrompt}
            onInstall={handleInstallClick}
         />
         {/* Close sidebar overlay for mobile */}
         {isMobile && isSidebarOpen && (
            <button 
                className="absolute -right-12 top-2 p-2 text-white/80 bg-slate-900/50 rounded backdrop-blur-sm"
                onClick={() => setIsSidebarOpen(false)}
            >
                <Menu size={20} />
            </button>
         )}
      </div>

      {/* Backdrop for mobile sidebar */}
      {isMobile && isSidebarOpen && (
          <div 
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
      )}

      {/* Install App Banner (Mobile Only) */}
      {isMobile && installPrompt && showInstallBanner && viewState === 'library' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white p-4 shadow-xl border-t border-slate-700 flex items-center justify-between animate-[slideUp_0.3s_ease-out]">
            <div className="flex flex-col">
                <span className="font-bold text-sm">Install App</span>
                <span className="text-xs text-slate-400">Add to home screen for offline use</span>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setShowInstallBanner(false)}
                    className="text-slate-400 hover:text-white"
                >
                    <X size={20} />
                </button>
                <button 
                    onClick={handleInstallClick}
                    className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                    <Download size={16} />
                    Install
                </button>
            </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        
        {viewState === 'library' && (
            <>
                {/* Header */}
                <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-6 shrink-0 gap-2">
                    <div className="flex items-center gap-4 flex-1 ml-10 md:ml-0">
                        <div className="relative max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search books..." 
                                className="w-full pl-10 pr-4 py-2 text-sm rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className={`flex items-center gap-2 px-3 py-2 sm:px-4 rounded-full font-medium cursor-pointer transition-all ${uploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-200 active:scale-95'}`}>
                            {uploading ? (
                                <div className="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full"></div>
                            ) : (
                                <Upload size={18} />
                            )}
                            <span className="hidden sm:inline text-sm">{uploading ? 'Importing...' : 'Upload'}</span>
                            <input 
                                type="file" 
                                multiple 
                                accept="application/pdf" 
                                className="hidden" 
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </header>

                {/* Library Grid */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 pb-20">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">
                            {activeCategoryId === 'all' ? 'All Books' : 
                             activeCategoryId === 'uncategorized' ? 'Uncategorized' : 
                             categories.find(c => c.id === activeCategoryId)?.name || 'Collection'}
                             <span className="ml-2 text-sm font-normal text-slate-400">({filteredFiles.length})</span>
                        </h2>
                    </div>

                    {filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl mx-auto max-w-lg">
                            <Book size={48} className="mb-4 opacity-50" />
                            <p className="text-lg">No books found here.</p>
                            <p className="text-sm">Upload some PDFs to get started!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                            {filteredFiles.map((file) => {
                                const progress = file.totalPages > 0 ? (file.currentPage / file.totalPages) * 100 : 0;
                                return (
                                    <div 
                                        key={file.id} 
                                        className="group relative flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-xl hover:border-brand-200 transition-all cursor-pointer overflow-hidden active:scale-95 sm:active:scale-100"
                                        onClick={() => handleOpenPdf(file.id)}
                                    >
                                        {/* Cover / Placeholder */}
                                        <div className="aspect-[1/1.4] bg-slate-100 relative flex items-center justify-center overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 to-slate-50 opacity-50"></div>
                                            <Book size={32} className="text-slate-300 sm:w-12 sm:h-12" />
                                            {/* Progress Bar Overlay */}
                                            {progress > 0 && (
                                                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-200">
                                                    <div className="h-full bg-brand-500" style={{ width: `${progress}%` }}></div>
                                                </div>
                                            )}
                                            
                                            {/* Mobile Delete Button (Always visible on mobile usually better, but keeping generic) */}
                                            <button 
                                                onClick={(e) => handleDeletePdf(e, file.id)}
                                                className="absolute top-1 right-1 p-1.5 bg-white/90 text-red-500 rounded-full hover:bg-red-50 transition-all z-10 shadow-sm"
                                                title="Delete"
                                            >
                                                <Filter size={14} className="rotate-45" />
                                            </button>
                                        </div>

                                        {/* Info */}
                                        <div className="p-2 sm:p-3">
                                            <h3 className="font-medium text-slate-800 text-xs sm:text-sm truncate mb-1" title={file.name}>
                                                {file.name.replace('.pdf', '')}
                                            </h3>
                                            <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {file.totalPages > 0 ? `${Math.round(progress)}%` : 'New'}
                                                </span>
                                                <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </>
        )}

        {viewState === 'reader' && readerFile && (
            <Reader file={readerFile} onClose={handleCloseReader} onDelete={handleReaderDelete} />
        )}

      </div>
    </div>
  );
}