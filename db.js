// IndexedDB Database Manager
class Database {
  constructor() {
    this.dbName = 'CampStockInventory';
    this.version = 1;
    this.db = null;
  }
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create entries store
        if (!db.objectStoreNames.contains('entries')) {
          const entryStore = db.createObjectStore('entries', {
            keyPath: 'id',
            autoIncrement: true
          });
          entryStore.createIndex('camp', 'camp', { unique: false });
          entryStore.createIndex('inventoryType', 'inventoryType', { unique: false });
          entryStore.createIndex('synced', 'synced', { unique: false });
          entryStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }
  
  async addEntry(entry) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['entries'], 'readwrite');
      const store = transaction.objectStore('entries');
      const request = store.add({
        ...entry,
        synced: false,
        createdAt: new Date().toISOString()
      });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getAllEntries() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['entries'], 'readonly');
      const store = transaction.objectStore('entries');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getEntry(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['entries'], 'readonly');
      const store = transaction.objectStore('entries');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async deleteEntry(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['entries'], 'readwrite');
      const store = transaction.objectStore('entries');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async updateEntry(id, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['entries'], 'readwrite');
      const store = transaction.objectStore('entries');
      const request = store.put({ ...data, id });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async getUnsyncedEntries() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['entries'], 'readonly');
      const store = transaction.objectStore('entries');
      const index = store.index('synced');
      const request = index.getAll(false);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getSyncStats() {
    const entries = await this.getAllEntries();
    return {
      total: entries.length,
      synced: entries.filter(e => e.synced).length,
      unsynced: entries.filter(e => !e.synced).length
    };
  }
}

const db = new Database();