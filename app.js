let currentItems = [];
let allEntries = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  await db.init();
  initTabs();
  initForm();
  initSearch();
  loadEntries();
  updateSyncStatus();
  checkConnectivity();
  
  // Set default date
  document.getElementById('entryDate').valueAsDate = new Date();
  
  // Add first item by default
  addItem();
});

// Tab Navigation
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
      
      if (tabName === 'list') {
        loadEntries();
      } else if (tabName === 'sync') {
        updateSyncStatus();
      }
    });
  });
}

// Form Handling
function initForm() {
  const form = document.getElementById('entryForm');
  const inventoryType = document.getElementById('inventoryType');
  const addItemBtn = document.getElementById('addItemBtn');
  
  inventoryType.addEventListener('change', updateConditionalFields);
  addItemBtn.addEventListener('click', addItem);
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveEntry();
  });
  
  updateConditionalFields();
}

function updateConditionalFields() {
  const type = document.getElementById('inventoryType').value;
  const container = document.getElementById('conditionalFields');
  container.innerHTML = '';
  
  if (type === 'Purchase' || type === 'Transfer') {
    container.innerHTML += `
            <div class="form-group">
                <label for="warehouse">Warehouse</label>
                <input type="text" id="warehouse">
            </div>
        `;
  }
  
  if (type === 'Purchase') {
    container.innerHTML += `
            <div class="form-group">
                <label for="supplier">Supplier</label>
                <input type="text" id="supplier">
            </div>
            <div class="form-group">
                <label for="po">PO Number</label>
                <input type="text" id="po">
            </div>
            <div class="form-group">
                <label for="grn">GRN Number</label>
                <input type="text" id="grn">
            </div>
        `;
  }
}

function addItem() {
  const itemId = Date.now();
  currentItems.push(itemId);
  
  const itemsList = document.getElementById('itemsList');
  const itemCard = document.createElement('div');
  itemCard.className = 'item-card';
  itemCard.id = `item-${itemId}`;
  itemCard.innerHTML = `
        <div class="item-card-header">
            <h4>Item ${currentItems.length}</h4>
            ${currentItems.length > 1 ? `<button type="button" class="remove-item-btn" onclick="removeItem(${itemId})">Remove</button>` : ''}
        </div>
        <div class="form-group">
            <label>Category *</label>
            <input type="text" class="item-category" required>
        </div>
        <div class="form-group">
            <label>Name *</label>
            <input type="text" class="item-name" required>
        </div>
        <div class="item-row">
            <div class="form-group">
                <label>Unit *</label>
                <input type="text" class="item-unit" required>
            </div>
            <div class="form-group">
                <label>Code *</label>
                <input type="text" class="item-code" required>
            </div>
        </div>
        <div class="form-group">
            <label>Quantity *</label>
            <input type="number" class="item-quantity" step="0.01" required>
        </div>
        <div class="form-group">
            <label>Description</label>
            <input type="text" class="item-description">
        </div>
    `;
  itemsList.appendChild(itemCard);
}

function removeItem(itemId) {
  currentItems = currentItems.filter(id => id !== itemId);
  document.getElementById(`item-${itemId}`).remove();
  
  // Renumber items
  document.querySelectorAll('.item-card h4').forEach((h4, index) => {
    h4.textContent = `Item ${index + 1}`;
  });
}

async function saveEntry() {
  const entry = {
    camp: document.getElementById('camp').value,
    entryBy: document.getElementById('entryBy').value,
    entryDate: document.getElementById('entryDate').value,
    inventoryType: document.getElementById('inventoryType').value,
    warehouse: document.getElementById('warehouse')?.value || null,
    supplier: document.getElementById('supplier')?.value || null,
    po: document.getElementById('po')?.value || null,
    grn: document.getElementById('grn')?.value || null,
    items: []
  };
  
  // Collect items
  const itemCards = document.querySelectorAll('.item-card');
  itemCards.forEach(card => {
    entry.items.push({
      category: card.querySelector('.item-category').value,
      name: card.querySelector('.item-name').value,
      unit: card.querySelector('.item-unit').value,
      code: card.querySelector('.item-code').value,
      quantity: parseFloat(card.querySelector('.item-quantity').value),
      description: card.querySelector('.item-description').value || null
    });
  });
  
  try {
    await db.addEntry(entry);
    showToast('Entry saved successfully!');
    document.getElementById('entryForm').reset();
    document.getElementById('itemsList').innerHTML = '';
    currentItems = [];
    addItem();
    document.getElementById('entryDate').valueAsDate = new Date();
  } catch (error) {
    showToast('Error saving entry: ' + error.message);
  }
}

// Entries List
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  const filterType = document.getElementById('filterType');
  
  searchInput.addEventListener('input', filterEntries);
  filterType.addEventListener('change', filterEntries);
}

async function loadEntries() {
  allEntries = await db.getAllEntries();
  allEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  filterEntries();
}

function filterEntries() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const filter = document.getElementById('filterType').value;
  
  let filtered = allEntries;
  
  if (search) {
    filtered = filtered.filter(entry =>
      entry.camp.toLowerCase().includes(search) ||
      entry.entryBy.toLowerCase().includes(search) ||
      entry.inventoryType.toLowerCase().includes(search)
    );
  }
  
  if (filter) {
    filtered = filtered.filter(entry => entry.inventoryType === filter);
  }
  
  displayEntries(filtered);
}

function displayEntries(entries) {
  const container = document.getElementById('entriesList');
  
  if (entries.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#666;">No entries found</p>';
    return;
  }
  
  container.innerHTML = entries.map(entry => `
        <div class="entry-card" onclick="showEntryDetail(${entry.id})">
            <div class="entry-card-header">
                <h3>${entry.camp}</h3>
                <span class="sync-badge ${entry.synced ? 'synced' : 'pending'}">
                    ${entry.synced ? '✓ Synced' : '⏳ Pending'}
                </span>
            </div>
            <div class="entry-card-info">
                <p><strong>Type:</strong> ${entry.inventoryType}</p>
                <p><strong>By:</strong> ${entry.entryBy}</p>
                <p><strong>Date:</strong> ${new Date(entry.entryDate).toLocaleDateString()}</p>
                <p><strong>Items:</strong> ${entry.items.length}</p>
            </div>
            <div class="entry-actions" onclick="event.stopPropagation()">
                <button class="delete-btn" onclick="deleteEntry(${entry.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

async function showEntryDetail(id) {
  const entry = await db.getEntry(id);
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('detailContent');
  
  content.innerHTML = `
        <h2>${entry.camp}</h2>
        <div class="sync-badge ${entry.synced ? 'synced' : 'pending'}" style="display:inline-block;margin-bottom:1rem;">
            ${entry.synced ? '✓ Synced' : '⏳ Pending'}
        </div>
        <div style="margin:1rem 0;">
            <p><strong>Entry By:</strong> ${entry.entryBy}</p>
            <p><strong>Date:</strong> ${new Date(entry.entryDate).toLocaleDateString()}</p>
            <p><strong>Type:</strong> ${entry.inventoryType}</p>
            ${entry.warehouse ? `<p><strong>Warehouse:</strong> ${entry.warehouse}</p>` : ''}
            ${entry.supplier ? `<p><strong>Supplier:</strong> ${entry.supplier}</p>` : ''}
            ${entry.po ? `<p><strong>PO:</strong> ${entry.po}</p>` : ''}
            ${entry.grn ? `<p><strong>GRN:</strong> ${entry.grn}</p>` : ''}
        </div>
        <h3>Items</h3>
        ${entry.items.map(item => `
            <div class="item-card">
                <h4>${item.name}</h4>
                <p><strong>Category:</strong> ${item.category}</p>
                <p><strong>Code:</strong> ${item.code}</p>
                <p><strong>Quantity:</strong> ${item.quantity} ${item.unit}</p>
                ${item.description ? `<p><strong>Description:</strong> ${item.description}</p>` : ''}
            </div>
        `).join('')}
    `;
  
  modal.classList.add('show');
}

// Close modal
document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('detailModal').classList.remove('show');
});

async function deleteEntry(id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await db.deleteEntry(id);
      showToast('Entry deleted');
      loadEntries();
    } catch (error) {
  showToast('Error deleting entry: ' + error.message);
}
}

// Export CSV
document.getElementById('exportBtn').addEventListener('click', exportToCSV);

async function exportToCSV() {
  const entries = await db.getAllEntries();
  
  if (entries.length === 0) {
    showToast('No entries to export');
    return;
  }
  
  let csv = 'Entry ID,Camp,Entry By,Entry Date,Inventory Type,Warehouse,Supplier,PO,GRN,Item Category,Item Name,Unit,Code,Quantity,Description,Synced\n';
  
  entries.forEach(entry => {
    entry.items.forEach(item => {
      csv += [
        entry.id,
        escapeCsv(entry.camp),
        escapeCsv(entry.entryBy),
        entry.entryDate,
        escapeCsv(entry.inventoryType),
        escapeCsv(entry.warehouse || ''),
        escapeCsv(entry.supplier || ''),
        escapeCsv(entry.po || ''),
        escapeCsv(entry.grn || ''),
        escapeCsv(item.category),
        escapeCsv(item.name),
        escapeCsv(item.unit),
        escapeCsv(item.code),
        item.quantity,
        escapeCsv(item.description || ''),
        entry.synced ? 'Yes' : 'No'
      ].join(',') + '\n';
    });
  });
  
  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  
  showToast('CSV exported successfully!');
}

function escapeCsv(value) {
  if (!value) return '';
  value = String(value);
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

// Toast notification
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Sync Status
async function updateSyncStatus() {
  const stats = await db.getSyncStats();
  document.getElementById('totalEntries').textContent = stats.total;
  document.getElementById('syncedEntries').textContent = stats.synced;
  document.getElementById('unsyncedEntries').textContent = stats.unsynced;
}

function checkConnectivity() {
  const statusEl = document.getElementById('connectivityStatus');
  
  function updateStatus() {
    if (navigator.onLine) {
      statusEl.textContent = '✓ Connected to Internet';
      statusEl.style.color = '#4CAF50';
    } else {
      statusEl.textContent = '✗ Offline';
      statusEl.style.color = '#f44336';
    }
  }
  
  updateStatus();
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
}

// Sync functionality
document.getElementById('syncBtn').addEventListener('click', syncNow);