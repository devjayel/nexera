// Global state
let currentDatabase = null;
let currentDatabaseKey = null;
let selectedTable = null;
let currentTool = 'select';
let tables = [];
let draggedTable = null;
let dragOffset = { x: 0, y: 0 };
let relationships = [];
let currentRelationshipSourceTable = null;
let draggedConnectionPoint = null;
let draggedRelationship = null;

// Modal Utility for alerts and confirms
const ModalUtility = {
    modal: null,
    title: null,
    body: null,
    footer: null,
    resolveCallback: null,

    init() {
        this.modal = document.getElementById('utilityModal');
        this.title = document.getElementById('utilityModalTitle');
        this.body = document.getElementById('utilityModalBody');
        this.footer = document.getElementById('utilityModalFooter');

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close(false);
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close(false);
            }
        });
    },

    show(title, content, type = 'info') {
        this.title.textContent = title;
        
        // Add icon based on type
        let iconHTML = '';
        if (type === 'warning') {
            iconHTML = `
                <div class="warning-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
            `;
        } else if (type === 'error') {
            iconHTML = `
                <div class="error-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            `;
        } else {
            iconHTML = `
                <div class="info-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            `;
        }
        
        this.body.innerHTML = iconHTML + (typeof content === 'string' ? `<p style="text-align: center;">${content}</p>` : content);
        
        // Default OK button
        this.footer.innerHTML = '<button class="btn-primary" onclick="ModalUtility.close(true)">OK</button>';
        
        this.modal.classList.add('active');
    },

    confirm(title, content, onConfirm, onCancel) {
        this.title.textContent = title;
        
        const iconHTML = `
            <div class="warning-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
        `;
        
        this.body.innerHTML = iconHTML + `<p style="text-align: center;">${content}</p>`;
        
        // Confirm/Cancel buttons
        this.footer.innerHTML = `
            <button class="btn-secondary" onclick="ModalUtility.handleConfirm(false)">Cancel</button>
            <button class="btn-danger" onclick="ModalUtility.handleConfirm(true)">Confirm</button>
        `;
        
        // Store callbacks
        this.resolveCallback = (result) => {
            if (result && onConfirm) onConfirm();
            if (!result && onCancel) onCancel();
        };
        
        this.modal.classList.add('active');
    },

    prompt(title, content, defaultValue = '', onConfirm) {
        this.title.textContent = title;
        
        this.body.innerHTML = `
            <p style="margin-bottom: 15px;">${content}</p>
            <input type="text" id="promptInput" value="${defaultValue}" 
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
        `;
        
        this.footer.innerHTML = `
            <button class="btn-secondary" onclick="ModalUtility.handlePrompt(false)">Cancel</button>
            <button class="btn-primary" onclick="ModalUtility.handlePrompt(true)">OK</button>
        `;
        
        this.resolveCallback = (result) => {
            if (result && onConfirm) {
                const input = document.getElementById('promptInput');
                onConfirm(input.value);
            }
        };
        
        this.modal.classList.add('active');
        
        // Focus and select input
        setTimeout(() => {
            const input = document.getElementById('promptInput');
            if (input) {
                input.focus();
                input.select();
                
                // Submit on Enter
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handlePrompt(true);
                    }
                });
            }
        }, 100);
    },

    handleConfirm(result) {
        if (this.resolveCallback) {
            this.resolveCallback(result);
        }
        this.close(result);
    },

    handlePrompt(result) {
        if (this.resolveCallback) {
            this.resolveCallback(result);
        }
        this.close(result);
    },

    close(result) {
        this.modal.classList.remove('active');
        this.resolveCallback = null;
        return result;
    }
};

// Load database on page load
document.addEventListener('DOMContentLoaded', () => {
    ModalUtility.init();
    loadCurrentDatabase();
    initializeCanvas();
});

// Load the current database from localStorage
const loadCurrentDatabase = () => {
    currentDatabaseKey = localStorage.getItem('currentDatabase');
    
    if (!currentDatabaseKey) {
        ModalUtility.show('No Database Selected', 'Please select a database from the home page.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    const databases = JSON.parse(localStorage.getItem('databases') || '{}');
    currentDatabase = databases[currentDatabaseKey];
    
    if (!currentDatabase) {
        ModalUtility.show('Database Not Found', 'The selected database could not be found.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // Update UI
    document.getElementById('databaseName').textContent = currentDatabase.name || currentDatabaseKey;
    
    // Load tables
    tables = currentDatabase.tables || [];
    relationships = currentDatabase.relationships || [];
    updateMetaInfo();
    renderTables();
    renderRelationships();
};

// Update metadata display
const updateMetaInfo = () => {
    const count = tables.length;
    document.getElementById('databaseMeta').textContent = `${count} ${count === 1 ? 'table' : 'tables'}`;
};

// Initialize canvas interactions
const initializeCanvas = () => {
    const canvas = document.getElementById('canvas');
    
    canvas.addEventListener('click', (e) => {
        if (e.target === canvas) {
            deselectTable();
        }
    });
    
    // Re-render relationships on scroll
    canvas.addEventListener('scroll', () => {
        renderRelationships();
    });
};

// Set current tool
const setTool = (tool) => {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.tool-btn').classList.add('active');
};

// Add new table
const addTable = () => {
    document.getElementById('tableModalTitle').textContent = 'Add New Table';
    document.getElementById('tableName').value = '';
    document.getElementById('columnsContainer').innerHTML = '';
    addColumn(); // Add one default column
    document.getElementById('tableModal').classList.add('active');
};

// Add column input
const addColumn = () => {
    const container = document.getElementById('columnsContainer');
    const columnDiv = document.createElement('div');
    columnDiv.className = 'column-input-group';
    columnDiv.innerHTML = `
        <input type="text" placeholder="Column name" class="column-name-input" required>
        <select class="column-type-input">
            <option value="INT">INT</option>
            <option value="VARCHAR">VARCHAR</option>
            <option value="TEXT">TEXT</option>
            <option value="DATE">DATE</option>
            <option value="BOOLEAN">BOOLEAN</option>
            <option value="FLOAT">FLOAT</option>
        </select>
        <button type="button" class="btn-remove-column" onclick="removeColumn(this)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    `;
    container.appendChild(columnDiv);
};

// Remove column input
const removeColumn = (btn) => {
    btn.closest('.column-input-group').remove();
};

// Save table
const saveTable = (event) => {
    event.preventDefault();
    
    const tableName = document.getElementById('tableName').value.trim();
    const columnInputs = document.querySelectorAll('.column-input-group');
    
    const columns = [];
    columnInputs.forEach(input => {
        const name = input.querySelector('.column-name-input').value.trim();
        const type = input.querySelector('.column-type-input').value;
        if (name) {
            columns.push({ 
                name, 
                type,
                length: '',
                nullable: true,
                autoIncrement: false,
                defaultType: 'none',
                comment: ''
            });
        }
    });
    
    if (columns.length === 0) {
        ModalUtility.show('Missing Columns', 'Please add at least one column to the table.', 'warning');
        return;
    }
    
    const newTable = {
        id: Date.now().toString(),
        name: tableName,
        columns: columns,
        color: '#3B9797', // Default teal color
        position: { x: 100 + (tables.length * 50), y: 100 + (tables.length * 50) }
    };
    
    tables.push(newTable);
    saveWorkspace();
    renderTables();
    closeTableModal();
};

// Close table modal
const closeTableModal = () => {
    document.getElementById('tableModal').classList.remove('active');
};

// Render all tables on canvas
const renderTables = () => {
    const canvas = document.getElementById('canvas');
    canvas.innerHTML = '';
    
    tables.forEach(table => {
        const tableElement = createTableElement(table);
        canvas.appendChild(tableElement);
    });
    
    renderRelationships();
};

// Render relationships
const renderRelationships = () => {
    // Remove existing SVG if any
    const existingSvg = document.getElementById('relationshipSvg');
    if (existingSvg) {
        existingSvg.remove();
    }
    
    if (relationships.length === 0) return;
    
    // Create SVG overlay
    const canvas = document.getElementById('canvas');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'relationshipSvg';
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1';
    
    relationships.forEach(rel => {
        const fromTable = tables.find(t => t.id === rel.fromTableId);
        const toTable = tables.find(t => t.id === rel.toTableId);
        
        if (!fromTable || !toTable) return;
        
        const fromCard = document.getElementById(`table-${fromTable.id}`);
        const toCard = document.getElementById(`table-${toTable.id}`);
        
        if (!fromCard || !toCard) return;
        
        // Ensure connection points exist
        if (!rel.fromPoint) {
            rel.fromPoint = { side: 'right', offset: 0.5 };
        }
        if (!rel.toPoint) {
            rel.toPoint = { side: 'left', offset: 0.5 };
        }
        
        // Calculate connection points on table edges
        const fromPoint = getConnectionPoint(fromCard, rel.fromPoint, canvas);
        const toPoint = getConnectionPoint(toCard, rel.toPoint, canvas);
        
        // Create line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromPoint.x);
        line.setAttribute('y1', fromPoint.y);
        line.setAttribute('x2', toPoint.x);
        line.setAttribute('y2', toPoint.y);
        line.setAttribute('stroke', rel.color);
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-dasharray', '8,5');
        line.style.pointerEvents = 'auto';
        line.style.cursor = 'pointer';
        line.setAttribute('data-rel-id', rel.id);
        line.classList.add('relationship-line');
        
        // Add context menu for line options
        line.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showRelationshipContextMenu(e, rel.id);
        });
        
        svg.appendChild(line);
        
        // Create draggable connection points
        const fromHandle = createConnectionHandle(fromPoint.x, fromPoint.y, rel.id, 'from', rel.color);
        const toHandle = createConnectionHandle(toPoint.x, toPoint.y, rel.id, 'to', rel.color);
        
        svg.appendChild(fromHandle);
        svg.appendChild(toHandle);
        
        // Add relationship type indicator at midpoint
        const midX = (fromPoint.x + toPoint.x) / 2;
        const midY = (fromPoint.y + toPoint.y) / 2;
        
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('transform', `translate(${midX}, ${midY})`);
        group.style.pointerEvents = 'auto';
        group.style.cursor = 'pointer';
        
        // Background circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '18');
        circle.setAttribute('fill', 'white');
        circle.setAttribute('stroke', rel.color);
        circle.setAttribute('stroke-width', '2');
        
        // Text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', rel.color);
        text.setAttribute('font-size', '11');
        text.setAttribute('font-weight', 'bold');
        text.textContent = rel.type;
        
        // Add click to edit relationship
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            editRelationship(rel.id);
        });
        
        group.appendChild(circle);
        group.appendChild(text);
        svg.appendChild(group);
    });
    
    canvas.appendChild(svg);
};

// Get connection point coordinates on table edge
const getConnectionPoint = (tableCard, point, canvas) => {
    const rect = tableCard.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    let x, y;
    
    switch (point.side) {
        case 'top':
            x = rect.left - canvasRect.left + rect.width * point.offset + canvas.scrollLeft;
            y = rect.top - canvasRect.top + canvas.scrollTop;
            break;
        case 'right':
            x = rect.right - canvasRect.left + canvas.scrollLeft;
            y = rect.top - canvasRect.top + rect.height * point.offset + canvas.scrollTop;
            break;
        case 'bottom':
            x = rect.left - canvasRect.left + rect.width * point.offset + canvas.scrollLeft;
            y = rect.bottom - canvasRect.top + canvas.scrollTop;
            break;
        case 'left':
            x = rect.left - canvasRect.left + canvas.scrollLeft;
            y = rect.top - canvasRect.top + rect.height * point.offset + canvas.scrollTop;
            break;
    }
    
    return { x, y };
};

// Create draggable connection handle
const createConnectionHandle = (x, y, relId, endpoint, color) => {
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle.setAttribute('cx', x);
    handle.setAttribute('cy', y);
    handle.setAttribute('r', '6');
    handle.setAttribute('fill', color);
    handle.setAttribute('stroke', 'white');
    handle.setAttribute('stroke-width', '2');
    handle.style.cursor = 'move';
    handle.style.pointerEvents = 'auto';
    handle.classList.add('connection-handle');
    handle.setAttribute('data-rel-id', relId);
    handle.setAttribute('data-endpoint', endpoint);
    
    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startDragConnection(e, relId, endpoint);
    });
    
    return handle;
};

// Start dragging connection point
const startDragConnection = (e, relId, endpoint) => {
    draggedConnectionPoint = { relId, endpoint };
    draggedRelationship = relationships.find(r => r.id === relId);
    
    document.addEventListener('mousemove', onDragConnection);
    document.addEventListener('mouseup', stopDragConnection);
    
    e.preventDefault();
};

// Drag connection point
const onDragConnection = (e) => {
    if (!draggedConnectionPoint || !draggedRelationship) return;
    
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    const svg = document.getElementById('relationshipSvg');
    
    // Get mouse position relative to canvas
    const mouseX = e.clientX - canvasRect.left + canvas.scrollLeft;
    const mouseY = e.clientY - canvasRect.top + canvas.scrollTop;
    
    // Get the table we're connecting from/to
    const tableId = draggedConnectionPoint.endpoint === 'from' 
        ? draggedRelationship.fromTableId 
        : draggedRelationship.toTableId;
    
    const table = tables.find(t => t.id === tableId);
    const tableCard = document.getElementById(`table-${table.id}`);
    const tableRect = tableCard.getBoundingClientRect();
    
    // Convert to canvas coordinates
    const tableLeft = tableRect.left - canvasRect.left + canvas.scrollLeft;
    const tableTop = tableRect.top - canvasRect.top + canvas.scrollTop;
    const tableRight = tableLeft + tableRect.width;
    const tableBottom = tableTop + tableRect.height;
    
    // Determine which edge is closest
    const distToTop = Math.abs(mouseY - tableTop);
    const distToRight = Math.abs(mouseX - tableRight);
    const distToBottom = Math.abs(mouseY - tableBottom);
    const distToLeft = Math.abs(mouseX - tableLeft);
    
    const minDist = Math.min(distToTop, distToRight, distToBottom, distToLeft);
    
    let side, offset;
    
    if (minDist === distToTop) {
        side = 'top';
        offset = Math.max(0, Math.min(1, (mouseX - tableLeft) / tableRect.width));
    } else if (minDist === distToRight) {
        side = 'right';
        offset = Math.max(0, Math.min(1, (mouseY - tableTop) / tableRect.height));
    } else if (minDist === distToBottom) {
        side = 'bottom';
        offset = Math.max(0, Math.min(1, (mouseX - tableLeft) / tableRect.width));
    } else {
        side = 'left';
        offset = Math.max(0, Math.min(1, (mouseY - tableTop) / tableRect.height));
    }
    
    // Update connection point
    const point = draggedConnectionPoint.endpoint === 'from' 
        ? draggedRelationship.fromPoint 
        : draggedRelationship.toPoint;
    
    point.side = side;
    point.offset = offset;
    
    // Re-render
    renderRelationships();
};

// Stop dragging connection point
const stopDragConnection = () => {
    if (draggedConnectionPoint) {
        saveWorkspace();
    }
    
    draggedConnectionPoint = null;
    draggedRelationship = null;
    document.removeEventListener('mousemove', onDragConnection);
    document.removeEventListener('mouseup', stopDragConnection);
};

// Show context menu for relationship
const showRelationshipContextMenu = (e, relId) => {
    const rel = relationships.find(r => r.id === relId);
    if (!rel) return;
    
    const content = `
        <div style="text-align: left;">
            <p>Relationship Options:</p>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
                <button class="btn-secondary" onclick="editRelationship(${relId}); ModalUtility.close();" style="width: 100%;">
                    Edit Type & Color
                </button>
                <button class="btn-secondary" onclick="deleteRelationship(${relId}); ModalUtility.close();" style="width: 100%; background: #ff4444; color: white;">
                    Delete Relationship
                </button>
            </div>
        </div>
    `;
    
    ModalUtility.show('Relationship Options', content, 'info');
};

// Edit relationship
const editRelationship = (relId) => {
    const rel = relationships.find(r => r.id === relId);
    if (!rel) return;
    
    const fromTable = tables.find(t => t.id === rel.fromTableId);
    const toTable = tables.find(t => t.id === rel.toTableId);
    
    // Populate modal with current values
    document.getElementById('fromTableName').textContent = fromTable.name;
    
    const toTableSelect = document.getElementById('toTableSelect');
    toTableSelect.innerHTML = '<option value="">Select a table...</option>';
    
    tables.forEach(table => {
        if (table.id !== rel.fromTableId) {
            const option = document.createElement('option');
            option.value = table.id;
            option.textContent = table.name;
            option.selected = table.id === rel.toTableId;
            toTableSelect.appendChild(option);
        }
    });
    
    // Set current type
    document.querySelector(`input[name="relType"][value="${rel.type}"]`).checked = true;
    document.getElementById('relationshipColor').value = rel.color;
    
    currentRelationshipSourceTable = rel.fromTableId;
    
    // Change modal title and button
    document.querySelector('#relationshipModal .modal-header h2').textContent = 'Edit Relationship';
    const createBtn = document.querySelector('#relationshipModal .btn-primary');
    createBtn.textContent = 'Update';
    createBtn.onclick = () => updateRelationship(relId);
    
    document.getElementById('relationshipModal').classList.add('active');
};

// Update existing relationship
const updateRelationship = (relId) => {
    const rel = relationships.find(r => r.id === relId);
    if (!rel) return;
    
    const toTableId = document.getElementById('toTableSelect').value;
    
    if (!toTableId) {
        ModalUtility.show('Select Target Table', 'Please select a target table for the relationship.', 'warning');
        return;
    }
    
    const selectedType = document.querySelector('input[name="relType"]:checked').value;
    const color = document.getElementById('relationshipColor').value;
    
    rel.toTableId = toTableId;
    rel.type = selectedType;
    rel.color = color;
    
    saveWorkspace();
    renderRelationships();
    
    // Reset modal for next use
    document.querySelector('#relationshipModal .modal-header h2').textContent = 'Create Relationship';
    const createBtn = document.querySelector('#relationshipModal .btn-primary');
    createBtn.textContent = 'Create';
    createBtn.onclick = createRelationshipFromModal;
    
    closeRelationshipModal();
};

// Delete relationship
const deleteRelationship = (relId) => {
    ModalUtility.confirm(
        'Delete Relationship',
        'Are you sure you want to delete this relationship?',
        () => {
            const rel = relationships.find(r => r.id === relId);
            if (rel && rel.foreignKeyColumn) {
                // Remove the foreign key column from target table
                const toTable = tables.find(t => t.id === rel.toTableId);
                if (toTable) {
                    toTable.columns = toTable.columns.filter(col => 
                        !(col.name === rel.foreignKeyColumn && col.isForeignKey && col.referencesTable === rel.fromTableId)
                    );
                }
            }
            
            relationships = relationships.filter(r => r.id !== relId);
            saveWorkspace();
            renderTables();
            renderRelationships();
        }
    );
};

// Create table DOM element
const createTableElement = (table) => {
    const div = document.createElement('div');
    div.className = 'table-card';
    div.id = `table-${table.id}`;
    div.style.left = `${table.position.x}px`;
    div.style.top = `${table.position.y}px`;
    
    // Ensure table has a color property
    if (!table.color) {
        table.color = '#3B9797';
    }
    
    const columnsHTML = table.columns.map((col, index) => `
        <div class="column-item-editable" data-column-index="${index}">
            <div class="column-main-row">
                <div class="column-icon ${col.isForeignKey ? 'foreign-key-icon' : ''}" style="${col.isForeignKey ? `background: ${col.foreignKeyColor}15; border: 2px solid ${col.foreignKeyColor};` : ''}">
                    ${col.isForeignKey ? `
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: ${col.foreignKeyColor};">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    ` : `
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    `}
                </div>
                <div class="column-info">
                    <input type="text" class="column-name-edit" value="${col.name}" 
                           onchange="updateColumnProperty('${table.id}', ${index}, 'name', this.value)"
                           placeholder="Column name">
                    <select class="column-type-edit" 
                            onchange="updateColumnProperty('${table.id}', ${index}, 'type', this.value)">
                        <option value="INT" ${col.type === 'INT' ? 'selected' : ''}>INT</option>
                        <option value="VARCHAR" ${col.type === 'VARCHAR' ? 'selected' : ''}>VARCHAR</option>
                        <option value="TEXT" ${col.type === 'TEXT' ? 'selected' : ''}>TEXT</option>
                        <option value="DATE" ${col.type === 'DATE' ? 'selected' : ''}>DATE</option>
                        <option value="DATETIME" ${col.type === 'DATETIME' ? 'selected' : ''}>DATETIME</option>
                        <option value="BOOLEAN" ${col.type === 'BOOLEAN' ? 'selected' : ''}>BOOLEAN</option>
                        <option value="FLOAT" ${col.type === 'FLOAT' ? 'selected' : ''}>FLOAT</option>
                        <option value="DECIMAL" ${col.type === 'DECIMAL' ? 'selected' : ''}>DECIMAL</option>
                    </select>
                </div>
                <div class="column-order-btns">
                    <button class="order-btn" onclick="moveColumnUp('${table.id}', ${index})" 
                            title="Move up" ${index === 0 ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                    <button class="order-btn" onclick="moveColumnDown('${table.id}', ${index})" 
                            title="Move down" ${index === table.columns.length - 1 ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
                <button class="toggle-details-btn" onclick="toggleColumnDetails('${table.id}', ${index})" title="More options">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                <button class="delete-column-btn" onclick="deleteColumn('${table.id}', ${index})" title="Delete column">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="column-details" id="details-${table.id}-${index}" style="display: none;">
                <div class="detail-row">
                    <label>Length:</label>
                    <input type="text" class="length-input" value="${col.length || ''}" 
                           placeholder="e.g., 255"
                           onchange="updateColumnProperty('${table.id}', ${index}, 'length', this.value)">
                </div>
                <div class="detail-row">
                    <label class="checkbox-label">
                        <input type="checkbox" ${col.autoIncrement ? 'checked' : ''} 
                               onchange="updateColumnProperty('${table.id}', ${index}, 'autoIncrement', this.checked)">
                        <span>Auto Increment</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" ${col.nullable ? 'checked' : ''} 
                               onchange="updateColumnProperty('${table.id}', ${index}, 'nullable', this.checked)">
                        <span>Nullable</span>
                    </label>
                </div>
                <div class="detail-row">
                    <label>Default:</label>
                    <select class="default-select" 
                            onchange="updateColumnProperty('${table.id}', ${index}, 'defaultType', this.value)">
                        <option value="none" ${!col.defaultType || col.defaultType === 'none' ? 'selected' : ''}>None</option>
                        <option value="defined" ${col.defaultType === 'defined' ? 'selected' : ''}>As Defined</option>
                        <option value="NULL" ${col.defaultType === 'NULL' ? 'selected' : ''}>NULL</option>
                        <option value="CURRENT_TIMESTAMP" ${col.defaultType === 'CURRENT_TIMESTAMP' ? 'selected' : ''}>CURRENT_TIMESTAMP</option>
                    </select>
                </div>
                ${col.defaultType === 'defined' ? `
                    <div class="detail-row">
                        <input type="text" class="default-value-input" value="${col.defaultValue || ''}" 
                               placeholder="Default value"
                               onchange="updateColumnProperty('${table.id}', ${index}, 'defaultValue', this.value)">
                    </div>
                ` : ''}
                <div class="detail-row">
                    <label>Comment:</label>
                    <textarea class="comment-input" rows="2" 
                              placeholder="Add column comment"
                              onchange="updateColumnProperty('${table.id}', ${index}, 'comment', this.value)">${col.comment || ''}</textarea>
                </div>
            </div>
        </div>
    `).join('');
    
    div.innerHTML = `
        <div class="table-header" style="background: linear-gradient(135deg, ${table.color} 0%, ${adjustColor(table.color, -20)} 100%);">
            <div class="table-header-left">
                <input type="color" class="color-picker" value="${table.color}" 
                       onchange="updateTableColor('${table.id}', this.value)" 
                       title="Change table color">
                <h4>${table.name}</h4>
                <span class="column-count-badge">${table.columns.length} ${table.columns.length === 1 ? 'column' : 'columns'}</span>
            </div>
            <div class="table-actions">
                <button class="table-action-btn" onclick="openRelationshipModal('${table.id}')" title="Add Relationship">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                </button>
                <button class="table-action-btn" onclick="addColumnToTable('${table.id}')" title="Add Column">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
                <button class="table-action-btn" onclick="editTableName('${table.id}')" title="Edit Name">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button class="table-action-btn" onclick="deleteTable('${table.id}')" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
        <div class="table-body">
            ${columnsHTML}
        </div>
    `;
    
    // Make draggable
    const header = div.querySelector('.table-header');
    header.addEventListener('mousedown', (e) => startDrag(e, table));
    
    // Select on click
    div.addEventListener('click', (e) => {
        e.stopPropagation();
        selectTable(table);
    });
    
    return div;
};

// Drag functionality
const startDrag = (e, table) => {
    if (e.target.closest('.table-action-btn')) return;
    
    draggedTable = table;
    const tableElement = document.getElementById(`table-${table.id}`);
    const rect = tableElement.getBoundingClientRect();
    const canvas = document.getElementById('canvas').getBoundingClientRect();
    
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    
    e.preventDefault();
};

const onDrag = (e) => {
    if (!draggedTable) return;
    
    const canvasElement = document.getElementById('canvas');
    const canvas = canvasElement.getBoundingClientRect();
    const x = e.clientX - canvas.left - dragOffset.x;
    const y = e.clientY - canvas.top - dragOffset.y;
    
    draggedTable.position.x = Math.max(0, x);
    draggedTable.position.y = Math.max(0, y);
    
    const tableElement = document.getElementById(`table-${draggedTable.id}`);
    tableElement.style.left = `${draggedTable.position.x}px`;
    tableElement.style.top = `${draggedTable.position.y}px`;
    
    // Update relationship lines while dragging
    renderRelationships();
    
    // Auto-scroll canvas to follow the table
    const tableRect = tableElement.getBoundingClientRect();
    const scrollMargin = 50; // Start scrolling when within 50px of edge
    
    // Scroll right
    if (tableRect.right > canvas.right - scrollMargin) {
        canvasElement.scrollLeft += 10;
    }
    // Scroll left
    if (tableRect.left < canvas.left + scrollMargin) {
        canvasElement.scrollLeft -= 10;
    }
    // Scroll down
    if (tableRect.bottom > canvas.bottom - scrollMargin) {
        canvasElement.scrollTop += 10;
    }
    // Scroll up
    if (tableRect.top < canvas.top + scrollMargin) {
        canvasElement.scrollTop -= 10;
    }
};

const stopDrag = () => {
    draggedTable = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    saveWorkspace();
};

// Select table
const selectTable = (table) => {
    selectedTable = table;
    
    document.querySelectorAll('.table-card').forEach(el => el.classList.remove('selected'));
    document.getElementById(`table-${table.id}`).classList.add('selected');
};

// Deselect table
const deselectTable = () => {
    selectedTable = null;
    document.querySelectorAll('.table-card').forEach(el => el.classList.remove('selected'));
};

// Toggle column details
const toggleColumnDetails = (tableId, columnIndex) => {
    const detailsEl = document.getElementById(`details-${tableId}-${columnIndex}`);
    const isVisible = detailsEl.style.display !== 'none';
    detailsEl.style.display = isVisible ? 'none' : 'block';
    
    // Update button icon
    event.target.closest('.toggle-details-btn').classList.toggle('active');
};

// Update column property
const updateColumnProperty = (tableId, columnIndex, property, value) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    table.columns[columnIndex][property] = value;
    
    // If defaultType changes, handle the default value input visibility
    if (property === 'defaultType') {
        if (value === 'defined') {
            if (!table.columns[columnIndex].defaultValue) {
                table.columns[columnIndex].defaultValue = '';
            }
        }
        // Re-render the specific column details to update the UI
        const detailsEl = document.getElementById(`details-${tableId}-${columnIndex}`);
        const wasVisible = detailsEl.style.display !== 'none';
        
        renderTables();
        
        // Restore the details visibility state
        if (wasVisible) {
            const newDetailsEl = document.getElementById(`details-${tableId}-${columnIndex}`);
            if (newDetailsEl) {
                newDetailsEl.style.display = 'block';
                // Also restore the active state on the toggle button
                const columnItem = newDetailsEl.closest('.column-item-editable');
                const toggleBtn = columnItem.querySelector('.toggle-details-btn');
                if (toggleBtn) {
                    toggleBtn.classList.add('active');
                }
            }
        }
        
        if (selectedTable && selectedTable.id === tableId) {
            selectTable(table);
        }
    }
    
    saveWorkspace();
    
    // Update properties panel if this table is selected
    if (selectedTable && selectedTable.id === tableId) {
        selectTable(table);
    }
};

// Add column to existing table
const addColumnToTable = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    const newColumn = {
        name: 'new_column',
        type: 'VARCHAR',
        length: '',
        nullable: true,
        autoIncrement: false,
        defaultType: 'none',
        comment: ''
    };
    
    table.columns.push(newColumn);
    saveWorkspace();
    renderTables();
    
    if (selectedTable && selectedTable.id === tableId) {
        selectTable(table);
    }
};

// Delete column
const deleteColumn = (tableId, columnIndex) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    if (table.columns.length === 1) {
        ModalUtility.show('Cannot Delete Column', 'A table must have at least one column.', 'warning');
        return;
    }
    
    const column = table.columns[columnIndex];
    
    // Check if this is a foreign key column
    if (column.isForeignKey) {
        ModalUtility.confirm(
            'Delete Foreign Key Column',
            `This column "${column.name}" is a foreign key. Deleting it will also remove the relationship. Continue?`,
            () => {
                // Find and remove the relationship
                relationships = relationships.filter(r => 
                    !(r.toTableId === tableId && r.foreignKeyColumn === column.name)
                );
                
                table.columns.splice(columnIndex, 1);
                saveWorkspace();
                renderTables();
                renderRelationships();
            }
        );
    } else {
        ModalUtility.confirm(
            'Delete Column',
            `Are you sure you want to delete the column "${column.name}"?`,
            () => {
                table.columns.splice(columnIndex, 1);
                saveWorkspace();
                renderTables();
            }
        );
    }
};

// Edit table name
const editTableName = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    ModalUtility.prompt(
        'Edit Table Name',
        'Enter new table name:',
        table.name,
        (newName) => {
            if (newName && newName.trim()) {
                table.name = newName.trim();
                saveWorkspace();
                renderTables();
                
                if (selectedTable && selectedTable.id === tableId) {
                    selectTable(table);
                }
            }
        }
    );
};

// Delete table
const deleteTable = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    ModalUtility.confirm(
        'Delete Table',
        `Are you sure you want to delete the table "${table.name}"? This action cannot be undone.`,
        () => {
            tables = tables.filter(t => t.id !== tableId);
            // Also delete relationships involving this table
            relationships = relationships.filter(r => r.fromTableId !== tableId && r.toTableId !== tableId);
            
            // Remove foreign key columns from other tables that reference this table
            tables.forEach(t => {
                t.columns = t.columns.filter(col => !(col.isForeignKey && col.referencesTable === tableId));
            });
            
            saveWorkspace();
            renderTables();
            renderRelationships();
            deselectTable();
        }
    );
};

// Open relationship modal
const openRelationshipModal = (fromTableId) => {
    if (tables.length < 2) {
        ModalUtility.show('Insufficient Tables', 'You need at least 2 tables to create relationships.', 'warning');
        return;
    }

    currentRelationshipSourceTable = fromTableId;
    const fromTable = tables.find(t => t.id === fromTableId);
    
    // Populate modal
    document.getElementById('fromTableName').textContent = fromTable.name;
    
    // Populate target table dropdown (exclude current table)
    const toTableSelect = document.getElementById('toTableSelect');
    toTableSelect.innerHTML = '<option value="">Select a table...</option>';
    
    tables.forEach(table => {
        if (table.id !== fromTableId) {
            const option = document.createElement('option');
            option.value = table.id;
            option.textContent = table.name;
            toTableSelect.appendChild(option);
        }
    });
    
    // Reset form
    document.querySelector('input[name="relType"][value="1:1"]').checked = true;
    document.getElementById('relationshipColor').value = '#3B9797';
    
    // Show modal
    document.getElementById('relationshipModal').classList.add('active');
};

// Close relationship modal
const closeRelationshipModal = () => {
    document.getElementById('relationshipModal').classList.remove('active');
    currentRelationshipSourceTable = null;
};

// Create relationship from modal
const createRelationshipFromModal = () => {
    const toTableId = document.getElementById('toTableSelect').value;
    
    if (!toTableId) {
        ModalUtility.show('Select Target Table', 'Please select a target table for the relationship.', 'warning');
        return;
    }
    
    // Check if relationship already exists
    const existingRel = relationships.find(r => 
        (r.fromTableId === currentRelationshipSourceTable && r.toTableId === toTableId) ||
        (r.fromTableId === toTableId && r.toTableId === currentRelationshipSourceTable)
    );
    
    if (existingRel) {
        ModalUtility.show('Relationship Exists', 'A relationship already exists between these tables.', 'warning');
        return;
    }
    
    const selectedType = document.querySelector('input[name="relType"]:checked').value;
    const color = document.getElementById('relationshipColor').value;
    
    const fromTable = tables.find(t => t.id === currentRelationshipSourceTable);
    const toTable = tables.find(t => t.id === toTableId);
    
    // Generate foreign key column name
    const foreignKeyName = `${fromTable.name.toLowerCase()}_id`;
    
    // Check if foreign key already exists
    const fkExists = toTable.columns.some(col => col.name === foreignKeyName);
    
    if (!fkExists) {
        // Add foreign key column to target table
        const foreignKeyColumn = {
            name: foreignKeyName,
            type: 'INT',
            length: '',
            nullable: false,
            autoIncrement: false,
            defaultType: 'none',
            defaultValue: '',
            comment: `Foreign key to ${fromTable.name}`,
            isForeignKey: true,
            foreignKeyColor: fromTable.color,
            referencesTable: currentRelationshipSourceTable
        };
        
        toTable.columns.push(foreignKeyColumn);
    }
    
    const relationship = {
        id: Date.now(),
        fromTableId: currentRelationshipSourceTable,
        toTableId: toTableId,
        type: selectedType,
        color: color,
        foreignKeyColumn: foreignKeyName,
        // Connection points on table edges (percentage-based: 0-1)
        fromPoint: { side: 'right', offset: 0.5 }, // right side, middle
        toPoint: { side: 'left', offset: 0.5 } // left side, middle
    };
    
    relationships.push(relationship);
    saveWorkspace();
    renderTables();
    renderRelationships();
    closeRelationshipModal();
};

// Move column up
const moveColumnUp = (tableId, columnIndex) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || columnIndex === 0) return;
    
    // Swap columns
    [table.columns[columnIndex - 1], table.columns[columnIndex]] = 
    [table.columns[columnIndex], table.columns[columnIndex - 1]];
    
    saveWorkspace();
    renderTables();
    
    if (selectedTable && selectedTable.id === tableId) {
        selectTable(table);
    }
};

// Move column down
const moveColumnDown = (tableId, columnIndex) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || columnIndex === table.columns.length - 1) return;
    
    // Swap columns
    [table.columns[columnIndex], table.columns[columnIndex + 1]] = 
    [table.columns[columnIndex + 1], table.columns[columnIndex]];
    
    saveWorkspace();
    renderTables();
    
    if (selectedTable && selectedTable.id === tableId) {
        selectTable(table);
    }
};

// Update table color
const updateTableColor = (tableId, color) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    table.color = color;
    
    // Update foreign key colors in other tables that reference this table
    tables.forEach(t => {
        t.columns.forEach(col => {
            if (col.isForeignKey && col.referencesTable === tableId) {
                col.foreignKeyColor = color;
            }
        });
    });
    
    saveWorkspace();
    renderTables();
    
    if (selectedTable && selectedTable.id === tableId) {
        selectTable(table);
    }
};

// Adjust color brightness (for gradient effect)
const adjustColor = (color, percent) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
};

// Save workspace
const saveWorkspace = () => {
    const databases = JSON.parse(localStorage.getItem('databases') || '{}');
    databases[currentDatabaseKey].tables = tables;
    databases[currentDatabaseKey].relationships = relationships;
    databases[currentDatabaseKey].updatedAt = new Date().toISOString();
    localStorage.setItem('databases', JSON.stringify(databases));
    updateMetaInfo();
};

// Export diagram (placeholder)
const exportDiagram = () => {
    ModalUtility.show('Coming Soon', 'Export functionality will be available in the next update!', 'info');
};

// Zoom functions (placeholders)
const zoomIn = () => {
    ModalUtility.show('Coming Soon', 'Zoom in functionality will be available in the next update!', 'info');
};

const zoomOut = () => {
    ModalUtility.show('Coming Soon', 'Zoom out functionality will be available in the next update!', 'info');
};

const resetView = () => {
    ModalUtility.show('Coming Soon', 'Reset view functionality will be available in the next update!', 'info');
};

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('tableModal');
    if (e.target === modal) {
        closeTableModal();
    }
});

// Make functions globally accessible for inline onclick handlers
window.createRelationshipFromModal = createRelationshipFromModal;
window.openRelationshipModal = openRelationshipModal;
window.closeRelationshipModal = closeRelationshipModal;
window.editRelationship = editRelationship;
window.updateRelationship = updateRelationship;