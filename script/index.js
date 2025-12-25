// Load all databases from localStorage
const loadAllDatabases = () => {
    const databases = localStorage.getItem('databases');
    return databases ? JSON.parse(databases) : {};
}

// Save all databases to localStorage
const saveAllDatabases = (databases) => {
    localStorage.setItem('databases', JSON.stringify(databases));
}

// Display all databases on the page
const displayDatabases = () => {
    const databases = loadAllDatabases();
    const databaseGrid = document.getElementById('databaseGrid');
    const emptyState = document.getElementById('emptyState');
    
    databaseGrid.innerHTML = '';
    
    const databaseKeys = Object.keys(databases);
    
    if (databaseKeys.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    databaseKeys.forEach(key => {
        const db = databases[key];
        const createdDate = db.createdAt ? new Date(db.createdAt).toLocaleDateString() : 'N/A';
        const tableCount = db.tables ? db.tables.length : 0;
        
        const card = document.createElement('div');
        card.className = 'database-card';
        card.innerHTML = `
            <div class="database-card-header">
                <div class="database-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                </div>
                <div class="database-info">
                    <h4>
                        ${db.name || key}
                        ${tableCount > 0 ? `<span class="database-badge">${tableCount} ${tableCount === 1 ? 'Table' : 'Tables'}</span>` : ''}
                    </h4>
                    <div class="database-meta">
                        <span class="meta-item">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            ${createdDate}
                        </span>
                    </div>
                </div>
            </div>
            <div class="database-card-body">
                <p>${db.description || 'No description provided'}</p>
            </div>
            <div class="database-card-footer">
                <div class="database-card-actions">
                    <button class="btn-small btn-open" onclick="openDatabase('${key}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open
                    </button>
                    <button class="btn-small btn-edit" onclick="editDatabase('${key}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteDatabase('${key}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
        databaseGrid.appendChild(card);
    });
}

// Modal management
let currentEditingDatabase = null;

const openCreateModal = () => {
    currentEditingDatabase = null;
    document.getElementById('modalTitle').textContent = 'Create New Database';
    document.getElementById('dbName').value = '';
    document.getElementById('dbDescription').value = '';
    document.getElementById('databaseModal').classList.add('active');
}

const editDatabase = (dbKey) => {
    const databases = loadAllDatabases();
    const db = databases[dbKey];
    
    if (!db) return;
    
    currentEditingDatabase = dbKey;
    document.getElementById('modalTitle').textContent = 'Edit Database';
    document.getElementById('dbName').value = db.name || dbKey;
    document.getElementById('dbDescription').value = db.description || '';
    document.getElementById('databaseModal').classList.add('active');
}

const closeModal = () => {
    document.getElementById('databaseModal').classList.remove('active');
    currentEditingDatabase = null;
}

// Save database (create or update)
const saveDatabase = (event) => {
    event.preventDefault();
    
    const name = document.getElementById('dbName').value.trim();
    const description = document.getElementById('dbDescription').value.trim();
    
    if (!name) {
        alert('Please enter a database name');
        return;
    }
    
    const databases = loadAllDatabases();
    
    // Generate a key from the name if creating new
    const dbKey = currentEditingDatabase || generateDatabaseKey(name);
    
    databases[dbKey] = {
        name: name,
        description: description,
        createdAt: databases[dbKey]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tables: databases[dbKey]?.tables || []
    };
    
    saveAllDatabases(databases);
    closeModal();
    displayDatabases();
}

// Generate a unique key for the database
const generateDatabaseKey = (name) => {
    const baseKey = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const databases = loadAllDatabases();
    
    let key = baseKey;
    let counter = 1;
    
    while (databases[key]) {
        key = `${baseKey}_${counter}`;
        counter++;
    }
    
    return key;
}

// Delete database
let pendingDeleteKey = null;

const deleteDatabase = (dbKey) => {
    const databases = loadAllDatabases();
    const db = databases[dbKey];
    
    if (!db) return;
    
    pendingDeleteKey = dbKey;
    document.getElementById('deleteDbName').textContent = db.name || dbKey;
    document.getElementById('deleteModal').classList.add('active');
}

const closeDeleteModal = () => {
    document.getElementById('deleteModal').classList.remove('active');
    pendingDeleteKey = null;
}

const confirmDelete = () => {
    if (!pendingDeleteKey) return;
    
    const databases = loadAllDatabases();
    delete databases[pendingDeleteKey];
    saveAllDatabases(databases);
    closeDeleteModal();
    displayDatabases();
}

// Open database in workspace
const openDatabase = (dbKey) => {
    // Store the current database key for the workspace page
    localStorage.setItem('currentDatabase', dbKey);
    window.location.href = 'workspace.html';
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', () => {
    displayDatabases();
    
    const databaseModal = document.getElementById('databaseModal');
    databaseModal.addEventListener('click', (e) => {
        if (e.target === databaseModal) {
            closeModal();
        }
    });
    
    const deleteModal = document.getElementById('deleteModal');
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
    });
});
