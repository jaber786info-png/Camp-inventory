// Sync Service
class SyncService {
  constructor() {
    this.syncing = false;
    this.syncInterval = null;
    this.init();
  }
  
  init() {
    // Auto sync every 5 minutes
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.syncing) {
        this.syncEntries();
      }
    }, 5 * 60 * 1000);
    
    // Sync when coming online
    window.addEventListener('online', () => {
      if (!this.syncing) {
        this.syncEntries();
      }
    });
  }
  
  async syncEntries() {
    if (this.syncing) return;
    
    this.syncing = true;
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
      syncBtn.textContent = '🔄 Syncing...';
      syncBtn.disabled = true;
    }
    
    try {
      const unsyncedEntries = await db.getUnsyncedEntries();
      
      for (const entry of unsyncedEntries) {
        try {
          await this.uploadToServer(entry);
          await db.updateEntry(entry.id, { ...entry, synced: true });
        } catch (error) {
          console.error(`Failed to sync entry ${entry.id}:`, error);
        }
      }
      
      if (unsyncedEntries.length > 0) {
        showToast(`Synced ${unsyncedEntries.length} entries`);
      }
      
      await updateSyncStatus();
      await loadEntries();
    } catch (error) {
      console.error('Sync error:', error);
      showToast('Sync failed: ' + error.message);
    } finally {
      this.syncing = false;
      if (syncBtn) {
        syncBtn.textContent = '🔄 Sync Now';
        syncBtn.disabled = false;
      }
    }
  }
  
  async uploadToServer(entry) {
    // Simulated server upload - replace with actual API call
    // Example:
    // const response = await fetch('https://your-api.com/entries', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(entry)
    // });
    // if (!response.ok) throw new Error('Upload failed');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Uploaded entry to server:', entry);
    
    // For Firebase Firestore integration:
    // await firebase.firestore().collection('entries').add(entry);
  }
}

const syncService = new SyncService();

async function syncNow() {
  if (!navigator.onLine) {
    showToast('No internet connection');
    return;
  }
  await syncService.syncEntries();
}