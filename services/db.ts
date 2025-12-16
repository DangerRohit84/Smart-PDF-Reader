import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Category, PdfFile, PdfMetadata } from '../types';

interface ShelfLifeDB extends DBSchema {
  files: {
    key: string;
    value: PdfFile;
    indexes: { 'by-category': string; 'by-last-read': number };
  };
  categories: {
    key: string;
    value: Category;
  };
}

const DB_NAME = 'shelf-life-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ShelfLifeDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<ShelfLifeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const fileStore = db.createObjectStore('files', { keyPath: 'id' });
        fileStore.createIndex('by-category', 'categoryId');
        fileStore.createIndex('by-last-read', 'lastReadAt');
        
        db.createObjectStore('categories', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
};

// Files
export const addPdf = async (file: PdfFile): Promise<void> => {
  const db = await getDB();
  await db.put('files', file);
};

export const getAllPdfMetadata = async (): Promise<PdfMetadata[]> => {
  const db = await getDB();
  // We only fetch keys and metadata if possible, but IDB usually fetches the whole object.
  // Ideally, we'd separate blobs to a different store for performance with 1000+ items,
  // but for simplicity in this demo, we'll fetch all and strip blob in memory or just use getAll.
  // Optimization: use a cursor to only map what we need.
  const tx = db.transaction('files', 'readonly');
  const store = tx.objectStore('files');
  let cursor = await store.openCursor();
  
  const results: PdfMetadata[] = [];
  
  while (cursor) {
    const { blob, ...metadata } = cursor.value;
    results.push(metadata);
    cursor = await cursor.continue();
  }
  
  // Sort by addedAt desc by default
  return results.sort((a, b) => b.addedAt - a.addedAt);
};

export const getPdfById = async (id: string): Promise<PdfFile | undefined> => {
  const db = await getDB();
  return db.get('files', id);
};

export const updatePdfProgress = async (id: string, page: number, totalPages?: number): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction('files', 'readwrite');
  const store = tx.objectStore('files');
  const file = await store.get(id);
  
  if (file) {
    file.currentPage = page;
    file.lastReadAt = Date.now();
    if (totalPages) file.totalPages = totalPages;
    await store.put(file);
  }
  await tx.done;
};

export const updatePdfCategory = async (id: string, categoryId: string | null): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction('files', 'readwrite');
  const store = tx.objectStore('files');
  const file = await store.get(id);
  
  if (file) {
    file.categoryId = categoryId;
    await store.put(file);
  }
  await tx.done;
};

export const deletePdf = async (id: string): Promise<void> => {
    const db = await getDB();
    await db.delete('files', id);
};

// Categories
export const addCategory = async (category: Category): Promise<void> => {
  const db = await getDB();
  await db.put('categories', category);
};

export const getCategories = async (): Promise<Category[]> => {
  const db = await getDB();
  return db.getAll('categories');
};

export const deleteCategory = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('categories', id);
  // Also uncategorize files in this category
  const tx = db.transaction('files', 'readwrite');
  const index = tx.objectStore('files').index('by-category');
  let cursor = await index.openCursor(IDBKeyRange.only(id));
  
  while (cursor) {
    const update = cursor.value;
    update.categoryId = null;
    await cursor.update(update);
    cursor = await cursor.continue();
  }
  await tx.done;
};
