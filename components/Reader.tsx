import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ZoomIn, ZoomOut, Maximize, Minimize, Trash2 } from 'lucide-react';
import { PdfFile } from '../types';
import { updatePdfProgress } from '../services/db';

// Worker setup
const pdfjsVersion = pdfjs.version || '4.8.69';
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

interface ReaderProps {
  file: PdfFile;
  onClose: () => void;
  onDelete: () => void;
}

export const Reader: React.FC<ReaderProps> = ({ file, onClose, onDelete }) => {
  const [numPages, setNumPages] = useState<number>(file.totalPages || 0);
  const [scale, setScale] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // We use this to track the "active" page for progress saving
  const [activePage, setActivePage] = useState<number>(file.currentPage || 1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Setup Intersection Observer to track reading progress
  useEffect(() => {
    if (!numPages) return;

    const options = {
      root: containerRef.current,
      rootMargin: '-50% 0px -50% 0px', // Trigger when page is in middle of viewport
      threshold: 0
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '1', 10);
          setActivePage(pageNum);
        }
      });
    }, options);

    // Observe all page elements
    pageRefs.current.forEach((el) => {
      if (el) observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [numPages, scale]); // Re-run if scale changes as layout shifts

  // Sync progress to DB
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activePage > 0) {
        updatePdfProgress(file.id, activePage, numPages);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [activePage, numPages, file.id]);

  // Scroll to saved page on initial load
  useEffect(() => {
    if (numPages > 0 && file.currentPage > 1) {
        const el = pageRefs.current.get(file.currentPage);
        if (el) {
            el.scrollIntoView({ block: 'start' });
        }
    }
  }, [numPages]); // Run once when pages are ready

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setErrorMsg(null);
    if (file.totalPages !== numPages) {
       updatePdfProgress(file.id, activePage, numPages);
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setErrorMsg(error.message);
  }

  const handleDelete = () => {
      if (confirm(`Delete "${file.name}"?`)) {
          onDelete();
      }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
        setIsFullscreen(true);
    } else {
        document.exitFullscreen();
        setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-white h-full w-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 shadow-md shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors" title="Close Reader">
            <X size={20} />
          </button>
          <div className="flex flex-col">
              <h2 className="text-sm font-medium truncate max-w-[150px] sm:max-w-md">{file.name}</h2>
              <span className="text-xs text-slate-400">Page {activePage} of {numPages || '--'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
             onClick={handleDelete}
             className="p-2 text-red-400 hover:bg-red-900/30 rounded-full transition-colors mr-2"
             title="Delete PDF"
          >
             <Trash2 size={18} />
          </button>

          <div className="flex items-center bg-slate-700 rounded-lg px-2 py-1">
             <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1 hover:text-brand-400">
               <ZoomOut size={18} />
             </button>
             <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
             <button onClick={() => setScale(s => Math.min(3.0, s + 0.25))} className="p-1 hover:text-brand-400">
               <ZoomIn size={18} />
             </button>
          </div>
          
          <button onClick={toggleFullscreen} className="p-2 hover:bg-slate-700 rounded-full hidden sm:block">
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>

      {/* Main Content - Continuous Scroll */}
      <div className="flex-1 overflow-y-auto bg-slate-900/95 scroll-smooth">
        <Document
          file={file.blob}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex flex-col items-center justify-center h-screen w-full text-slate-400 gap-4 mt-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
                <p>Loading document...</p>
            </div>
          }
          error={
             <div className="flex flex-col items-center justify-center h-64 text-red-400 px-4 text-center mt-20">
                <p className="font-bold mb-2">Failed to load PDF.</p>
                <p className="text-sm text-slate-400 mb-2">Error: {errorMsg || 'Unknown error'}</p>
             </div>
          }
          className="flex flex-col items-center py-8 min-h-full"
        >
          {numPages > 0 && Array.from(new Array(numPages), (_, index) => {
            const pageNum = index + 1;
            return (
                <div 
                    key={pageNum}
                    data-page-number={pageNum}
                    ref={(el) => {
                        if (el) pageRefs.current.set(pageNum, el);
                        else pageRefs.current.delete(pageNum);
                    }}
                    className="mb-4 relative"
                    style={{ minHeight: '200px' }} // placeholder height
                >
                    <Page 
                        pageNumber={pageNum} 
                        scale={scale} 
                        renderTextLayer={false} 
                        renderAnnotationLayer={false}
                        className="shadow-xl"
                        loading={
                            <div 
                                className="bg-white/5 animate-pulse rounded" 
                                style={{ width: 600 * scale, height: 800 * scale }} 
                            />
                        }
                    />
                    {/* Page number watermark for quick reference */}
                    <div className="absolute -right-12 top-0 text-xs text-slate-600 font-mono hidden xl:block">
                        {pageNum}
                    </div>
                </div>
            );
          })}
        </Document>
      </div>
    </div>
  );
};