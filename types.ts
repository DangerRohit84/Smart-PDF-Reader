export interface Category {
  id: string;
  name: string;
  createdAt: number;
}

export interface PdfFile {
  id: string;
  name: string;
  categoryId: string | null; // null means 'Uncategorized'
  blob: Blob;
  addedAt: number;
  lastReadAt: number | null;
  currentPage: number;
  totalPages: number;
  size: number;
}

export type PdfMetadata = Omit<PdfFile, 'blob'>;

export interface ViewState {
  view: 'library' | 'reader';
  activePdfId: string | null;
}