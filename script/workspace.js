// Global state
let currentDatabase = null;
let currentDatabaseKey = null;
let selectedTable = null;
let tables = [];
let draggedTable = null;
let dragOffset = { x: 0, y: 0 };
let relationships = [];
let currentRelationshipSourceTable = null;
let draggedConnectionPoint = null;
let draggedRelationship = null;
let memos = [];
let currentEditingMemoId = null;

// Canvas panning variables
let isPanning = false;
let panStart = { x: 0, y: 0 };
let scrollStart = { x: 0, y: 0 };

// Auto-scroll variables
let autoScrollInterval = null;
const EDGE_THRESHOLD = 50; // pixels from edge to trigger auto-scroll
const SCROLL_SPEED = 10; // pixels per frame

// Minimap variables
let minimapVisible = true;
let minimapDragging = false;

// Visibility toggles
let tablesVisible = true;
let relationshipsVisible = true;
let memosVisible = true;

// Feedback prompt variables
let feedbackPromptInterval = null;
const FEEDBACK_PROMPT_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
const FEEDBACK_PROMPT_KEY = 'lastFeedbackPrompt';
const INTRO_SHOWN_KEY = 'nexeraIntroShown';

// Check if intro should be shown
const checkAndShowIntro = () => {
    const introShown = localStorage.getItem(INTRO_SHOWN_KEY);
    
    // Show intro if it's the first time
    if (!introShown) {
        // Wait a bit for the page to fully load
        setTimeout(() => {
            startIntroTour();
        }, 500);
    }
};

// Start the intro.js tour
const startIntroTour = () => {
    const intro = introJs();
    
    intro.setOptions({
        steps: [
            {
                element: document.querySelector('.database-info'),
                intro: "Welcome to Nexera! 🎉<br><br>This is your database workspace where you can visually design and organize your database schema. Let's take a quick tour of the features!",
                position: 'bottom'
            },
            {
                element: document.querySelector('[data-step="2"]'),
                intro: "Click here to <strong>add tables</strong> to your database. Each table can have columns with data types, primary keys, and more.",
                position: 'right'
            },
            {
                element: document.querySelector('[data-step="3"]'),
                intro: "Add <strong>sticky memos</strong> to your diagram to document important information, notes, or reminders about your database design.",
                position: 'right'
            },
            {
                element: document.querySelector('[data-step="4"]'),
                intro: "The <strong>Tables tab</strong> shows all your tables. Click on any table to focus on it in the canvas.",
                position: 'right'
            },
            {
                element: document.querySelector('[data-step="5"]'),
                intro: "The <strong>View tab</strong> lets you toggle visibility of tables, relationships, memos, and the minimap.",
                position: 'right'
            },
            {
                element: document.querySelector('[data-step="6"]'),
                intro: "<strong>The Canvas</strong> is your main workspace.<br><br>• Drag tables and memos to arrange them<br>• Drag from a table header to create relationships<br>• Pan around by holding right-click or middle-mouse button<br>• Edit tables by clicking on their content",
                position: 'top'
            },
            {
                element: document.querySelector('[data-step="7"]'),
                intro: "The <strong>minimap</strong> provides a bird's-eye view of your entire diagram. Click and drag to navigate quickly across large diagrams.",
                position: 'left'
            },
            {
                element: document.querySelector('[data-step="8"]'),
                intro: "Don't forget to <strong>save your work</strong>! All data is stored in your browser's local storage, so you can come back anytime.",
                position: 'bottom'
            },
            {
                intro: "That's it! You're ready to start designing your database. 🚀<br><br>Have fun creating your database diagrams!<br><br><small>Tip: You can restart this tour anytime from the help menu.</small>"
            }
        ],
        showProgress: true,
        showBullets: false,
        exitOnOverlayClick: false,
        doneLabel: 'Get Started!',
        nextLabel: 'Next →',
        prevLabel: '← Back',
        skipLabel: 'Skip Tour'
    });
    
    intro.oncomplete(() => {
        localStorage.setItem(INTRO_SHOWN_KEY, 'true');
    });
    
    intro.onexit(() => {
        localStorage.setItem(INTRO_SHOWN_KEY, 'true');
    });
    
    intro.start();
};

// Restart intro tour (can be called from UI)
const restartIntroTour = () => {
    startIntroTour();
};

// Make globally accessible
window.restartIntroTour = restartIntroTour;

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

// Color Picker Utility
const ColorPickerUtility = {
    picker: null,
    trigger: null,
    currentColor: '#3B9797',
    onChangeCallback: null,
    hue: 180,
    saturation: 100,
    lightness: 50,
    isDraggingSL: false,
    isDraggingHue: false,

    init() {
        this.picker = document.getElementById('customColorPicker');
        
        // Initialize gradient picker elements
        const slPicker = document.getElementById('slPicker');
        const hueSlider = document.getElementById('hueSlider');

        if (slPicker) {
            slPicker.addEventListener('mousedown', (e) => this.startDragSL(e));
        }

        if (hueSlider) {
            hueSlider.addEventListener('mousedown', (e) => this.startDragHue(e));
        }

        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.picker && this.picker.style.display === 'block') {
                if (!this.picker.contains(e.target) && this.trigger && !this.trigger.contains(e.target)) {
                    this.close();
                }
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.picker && this.picker.style.display === 'block') {
                this.close();
            }
        });
    },

    open(triggerElement, currentColor, onChange) {
        if (!triggerElement) return;

        this.trigger = triggerElement;
        this.currentColor = currentColor || '#3B9797';
        this.onChangeCallback = onChange;

        // Show picker first (needed for proper positioning)
        this.picker.style.display = 'block';

        // Parse current color to HSL
        this.parseColorToHSL(currentColor);

        // Get trigger position
        const rect = triggerElement.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const pickerHeight = 450;

        // Position the picker
        this.picker.style.position = 'fixed';
        this.picker.style.left = `${rect.left}px`;
        this.picker.style.width = `${Math.max(rect.width, 300)}px`;
        this.picker.style.zIndex = '10000';

        // Position below if there's space, otherwise above
        if (spaceBelow >= pickerHeight || spaceBelow > spaceAbove) {
            this.picker.style.top = `${rect.bottom + 5}px`;
            this.picker.style.bottom = 'auto';
        } else {
            this.picker.style.bottom = `${window.innerHeight - rect.top + 5}px`;
            this.picker.style.top = 'auto';
        }

        // Update gradient picker after positioning
        this.updateGradientPicker();
    },

    close() {
        if (this.picker) {
            this.picker.style.display = 'none';
        }
        this.trigger = null;
    },

    parseColorToHSL(color) {
        let r, g, b;
        
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            r = parseInt(hex.substr(0, 2), 16) / 255;
            g = parseInt(hex.substr(2, 2), 16) / 255;
            b = parseInt(hex.substr(4, 2), 16) / 255;
        } else if (color.startsWith('rgb')) {
            const matches = color.match(/\d+/g);
            r = parseInt(matches[0]) / 255;
            g = parseInt(matches[1]) / 255;
            b = parseInt(matches[2]) / 255;
        } else {
            return;
        }

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        this.hue = Math.round(h * 360);
        this.saturation = Math.round(s * 100);
        this.lightness = Math.round(l * 100);
    },

    hslToHex(h, s, l) {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if (0 <= h && h < 60) {
            r = c; g = x; b = 0;
        } else if (60 <= h && h < 120) {
            r = x; g = c; b = 0;
        } else if (120 <= h && h < 180) {
            r = 0; g = c; b = x;
        } else if (180 <= h && h < 240) {
            r = 0; g = x; b = c;
        } else if (240 <= h && h < 300) {
            r = x; g = 0; b = c;
        } else if (300 <= h && h < 360) {
            r = c; g = 0; b = x;
        }

        const toHex = (n) => {
            const hex = Math.round((n + m) * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    },

    updateGradientPicker() {
        // Update hue gradient background
        const slGradient = document.getElementById('slGradient');
        if (slGradient) {
            slGradient.style.backgroundColor = `hsl(${this.hue}, 100%, 50%)`;
        }

        // Update cursors
        const slCursor = document.getElementById('slCursor');
        const hueCursor = document.getElementById('hueCursor');
        const slPicker = document.getElementById('slPicker');

        if (slCursor && slPicker) {
            const x = (this.saturation / 100) * slPicker.offsetWidth;
            const y = ((100 - this.lightness) / 100) * slPicker.offsetHeight;
            slCursor.style.left = `${x}px`;
            slCursor.style.top = `${y}px`;
        }

        if (hueCursor) {
            const hueSlider = document.getElementById('hueSlider');
            const y = (this.hue / 360) * hueSlider.offsetHeight;
            hueCursor.style.top = `${y}px`;
        }

        // Update color
        const color = this.hslToHex(this.hue, this.saturation, this.lightness);
        this.selectColor(color);
    },

    startDragSL(e) {
        this.isDraggingSL = true;
        this.updateSLFromMouse(e);
        e.preventDefault();
    },

    startDragHue(e) {
        this.isDraggingHue = true;
        this.updateHueFromMouse(e);
        e.preventDefault();
    },

    onDrag(e) {
        if (this.isDraggingSL) {
            this.updateSLFromMouse(e);
        } else if (this.isDraggingHue) {
            this.updateHueFromMouse(e);
        }
    },

    stopDrag() {
        this.isDraggingSL = false;
        this.isDraggingHue = false;
    },

    updateSLFromMouse(e) {
        const slPicker = document.getElementById('slPicker');
        const rect = slPicker.getBoundingClientRect();
        
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        x = Math.max(0, Math.min(x, rect.width));
        y = Math.max(0, Math.min(y, rect.height));
        
        this.saturation = (x / rect.width) * 100;
        this.lightness = 100 - (y / rect.height) * 100;
        
        this.updateGradientPicker();
    },

    updateHueFromMouse(e) {
        const hueSlider = document.getElementById('hueSlider');
        const rect = hueSlider.getBoundingClientRect();
        
        let y = e.clientY - rect.top;
        y = Math.max(0, Math.min(y, rect.height));
        
        this.hue = (y / rect.height) * 360;
        
        this.updateGradientPicker();
    },

    selectColor(color) {
        // Validate hex color
        if (!/^#[0-9A-F]{6}$/i.test(color)) {
            return;
        }

        this.currentColor = color;

        // Update inputs
        document.getElementById('customColorText').value = color.toUpperCase();

        // Call callback
        if (this.onChangeCallback) {
            this.onChangeCallback(color);
        }
    },

    selectPreset(color) {
        this.parseColorToHSL(color);
        this.updateGradientPicker();
        this.close();
    },

    selectCustom(color) {
        this.parseColorToHSL(color);
        this.updateGradientPicker();
    }
};

// Load database on page load
document.addEventListener('DOMContentLoaded', () => {
    ModalUtility.init();
    ColorPickerUtility.init();
    loadCurrentDatabase();
    initializeCanvas();
    initializeFeedbackPrompt();
    checkAndShowIntro();
});

// Initialize feedback prompt system
const initializeFeedbackPrompt = () => {
    // Check if we should show the prompt on load
    checkAndShowFeedbackPrompt();
    
    // Set up interval to check every hour
    feedbackPromptInterval = setInterval(checkAndShowFeedbackPrompt, FEEDBACK_PROMPT_INTERVAL);
};

// Check if it's time to show feedback prompt
const checkAndShowFeedbackPrompt = () => {
    const lastPrompt = localStorage.getItem(FEEDBACK_PROMPT_KEY);
    const now = Date.now();
    
    // Show prompt if never shown or if more than 1 hour has passed
    if (!lastPrompt || (now - parseInt(lastPrompt)) >= FEEDBACK_PROMPT_INTERVAL) {
        showFeedbackPrompt();
        localStorage.setItem(FEEDBACK_PROMPT_KEY, now.toString());
    }
};

// Show feedback prompt modal
const showFeedbackPrompt = () => {
    ModalUtility.confirm(
        'Share Your Feedback',
        `
        <div style="text-align: center; padding: 20px 0;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" style="width: 32px; height: 32px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </div>
            <p style="font-size: 16px; color: var(--text-dark); margin-bottom: 10px; line-height: 1.6;">
                We'd love to hear your thoughts on Nexera!
            </p>
            <p style="font-size: 14px; color: var(--text-muted); margin: 0;">
                Your feedback helps us improve and create a better experience for everyone.
            </p>
        </div>
        `,
        () => {
            // User clicked "Give Feedback"
            window.open('feedback.html', '_blank');
        },
        () => {
            // User clicked "Maybe Later"
            // Do nothing, prompt will show again in an hour
        }
    );
    
    // Customize button text
    const modalFooter = document.getElementById('utilityModalFooter');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button class="btn-secondary" onclick="ModalUtility.handleConfirm(false)" style="flex: 1;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 18px; height: 18px; margin-right: 6px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Maybe Later
            </button>
            <button class="btn-primary" onclick="ModalUtility.handleConfirm(true)" style="flex: 1;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 18px; height: 18px; margin-right: 6px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                Give Feedback
            </button>
        `;
    }
};

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
    memos = currentDatabase.memos || [];
    updateMetaInfo();
    renderTables();
    renderRelationships();
    renderMemos();
};

// Update metadata display
const updateMetaInfo = () => {
    const count = tables.length;
    document.getElementById('databaseMeta').textContent = `${count} ${count === 1 ? 'table' : 'tables'}`;
    renderTablesList();
};

// Render tables list in sidebar
const renderTablesList = () => {
    const tablesList = document.getElementById('tablesList');
    if (!tablesList) return;
    
    if (tables.length === 0) {
        tablesList.innerHTML = `
            <div class="tables-empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p>No tables yet</p>
                <span>Click "Add Table" to get started</span>
            </div>
        `;
        return;
    }
    
 /*    tablesList.innerHTML = tables.map((table, index) => {
        const columnCount = table.columns ? table.columns.length : 0;
        return `
            <div class="table-list-item" data-table-id="${table.id}">
                <div class="table-list-number">${index + 1}</div>
                <div class="table-list-info">
                    <div class="table-list-name">${table.name}</div>
                    <div class="table-list-columns">${columnCount} column${columnCount !== 1 ? 's' : ''}</div>
                </div>
                <button class="table-list-eye" onclick="focusOnTable('${table.id}')" title="Focus on table">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </button>
            </div>
        `;
    }).join('');

        if (tables.length === 0) {
        tablesList.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--text-muted); font-size: 12px;">No tables yet</div>';
        return;
    } */
    
    tablesList.innerHTML = tables.map(table => `
        <div class="table-list-item" onclick="focusOnTable('${table.id}')">
            <div class="table-color-indicator" style="background: ${table.color};"></div>
            <div class="table-list-info">
                <div class="table-list-name">${table.name}</div>
                <div class="table-list-columns">${table.columns.length} ${table.columns.length === 1 ? 'column' : 'columns'}</div>
            </div>
            <button class="table-list-focus-btn" onclick="focusOnTable('${table.id}'); event.stopPropagation();" title="Focus on table">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            </button>
        </div>
    `).join('');
};

// Render memos list in sidebar
const renderMemosList = () => {
    const memosList = document.getElementById('memosList');
    if (!memosList) return;
    
    if (memos.length === 0) {
        memosList.innerHTML = `
            <div class="tables-empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p>No memos yet</p>
                <span>Click "Add Memo" to get started</span>
            </div>
        `;
        return;
    }
    
    memosList.innerHTML = memos.map((memo, index) => {
        const contentPreview = memo.content.replace(/<[^>]*>/g, '').substring(0, 50);
        return `
            <div class="table-list-item" data-memo-id="${memo.id}">
                <div class="table-list-number">${index + 1}</div>
                <div class="table-list-info">
                    <div class="table-list-name">Memo ${index + 1}</div>
                    <div class="table-list-columns">${contentPreview}${contentPreview.length >= 50 ? '...' : ''}</div>
                </div>
                <button class="table-list-eye" onclick="focusOnMemo('${memo.id}')" title="Focus on memo">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </button>
            </div>
        `;
    }).join('');
};

// Focus camera on specific memo
const focusOnMemo = (memoId) => {
    const memo = memos.find(m => m.id === memoId);
    if (!memo) return;
    
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    const memoElement = document.getElementById(`memo-${memoId}`);
    
    if (!memoElement) return;
    
    // Calculate position to center the memo in viewport
    const memoLeft = memo.position.x;
    const memoTop = memo.position.y;
    
    // Calculate center position
    const targetScrollLeft = memoLeft - (container.clientWidth / 2) + (memo.size.width / 2);
    const targetScrollTop = memoTop - (container.clientHeight / 2) + (memo.size.height / 2);
    
    // Smooth scroll to position
    container.scrollTo({
        left: targetScrollLeft,
        top: targetScrollTop,
        behavior: 'smooth'
    });
    
    // Highlight the memo briefly
    memoElement.style.boxShadow = '0 0 0 3px var(--primary-color)';
    setTimeout(() => {
        memoElement.style.boxShadow = '';
    }, 1000);
};

// Switch between tabs in sidebar
const switchTab = (tabName) => {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${tabName}Panel`).classList.add('active');
};

// Focus camera on specific table
const focusOnTable = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    const tableElement = document.getElementById(`table-${tableId}`);
    
    if (!tableElement) return;
    
    // Calculate position to center the table in viewport
    const tableRect = tableElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Get current scroll position
    const currentScrollLeft = container.scrollLeft;
    const currentScrollTop = container.scrollTop;
    
    // Calculate table position relative to canvas
    const tableLeft = table.position.x;
    const tableTop = table.position.y;
    
    // Calculate center position
    const targetScrollLeft = tableLeft - (container.clientWidth / 2) + 150; // 150 is half of table width (approx)
    const targetScrollTop = tableTop - (container.clientHeight / 2) + 100; // 100 is half of table height (approx)
    
    // Smooth scroll to position
    container.scrollTo({
        left: targetScrollLeft,
        top: targetScrollTop,
        behavior: 'smooth'
    });
    
    // Highlight the table briefly
    tableElement.style.boxShadow = '0 0 0 3px var(--primary-color)';
    setTimeout(() => {
        tableElement.style.boxShadow = '';
    }, 1000);
};

// Initialize canvas interactions
const initializeCanvas = () => {
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    
    canvas.addEventListener('click', (e) => {
        if (e.target === canvas) {
            deselectTable();
        }
    });
    
    // Canvas panning with mouse
    canvas.addEventListener('mousedown', (e) => {
        if (e.target === canvas && e.button === 0) {
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY };
            scrollStart = { x: container.scrollLeft, y: container.scrollTop };
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isPanning) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            container.scrollLeft = scrollStart.x - dx;
            container.scrollTop = scrollStart.y - dy;
        }
        onMemoDrag(e);
        onMemoResize(e);
    });
    
    document.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = '';
        }
        stopMemoDrag();
        stopMemoResize();
    });
    
    // Show grab cursor when hovering over empty canvas
    canvas.addEventListener('mouseenter', () => {
        if (!isPanning && !draggedTable) {
            canvas.style.cursor = 'grab';
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        if (!isPanning) {
            canvas.style.cursor = '';
        }
    });
    
    // Re-render relationships on scroll
    container.addEventListener('scroll', () => {
        renderRelationships();
        updateMinimapViewport();
    });
    
    // Initialize minimap
    initializeMinimap();
    
    // Center the canvas view
    centerCanvas();
    
    // Render minimap initially
    setTimeout(() => {
        renderMinimap();
        updateMinimapViewport();
    }, 100);
};

// Center the canvas viewport
const centerCanvas = () => {
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    
    // Calculate center position
    const scrollLeft = (canvas.offsetWidth - container.clientWidth) / 2;
    const scrollTop = (canvas.offsetHeight - container.clientHeight) / 2;
    
    container.scrollLeft = scrollLeft;
    container.scrollTop = scrollTop;
};

// Check if mouse is near edges and auto-scroll
const checkAutoScroll = (e) => {
    // Don't auto-scroll if panning
    if (isPanning) return;
    
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Get mouse position relative to viewport
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if mouse is within container bounds
    if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
        stopAutoScroll();
        return;
    }
    
    // Calculate scroll deltas
    let scrollX = 0;
    let scrollY = 0;
    
    // Left edge
    if (mouseX < EDGE_THRESHOLD) {
        scrollX = -SCROLL_SPEED * (1 - mouseX / EDGE_THRESHOLD);
    }
    // Right edge
    else if (mouseX > rect.width - EDGE_THRESHOLD) {
        scrollX = SCROLL_SPEED * (1 - (rect.width - mouseX) / EDGE_THRESHOLD);
    }
    
    // Top edge
    if (mouseY < EDGE_THRESHOLD) {
        scrollY = -SCROLL_SPEED * (1 - mouseY / EDGE_THRESHOLD);
    }
    // Bottom edge
    else if (mouseY > rect.height - EDGE_THRESHOLD) {
        scrollY = SCROLL_SPEED * (1 - (rect.height - mouseY) / EDGE_THRESHOLD);
    }
    
    // Apply auto-scroll
    if (scrollX !== 0 || scrollY !== 0) {
        startAutoScroll(scrollX, scrollY);
    } else {
        stopAutoScroll();
    }
};

// Start auto-scrolling
const startAutoScroll = (scrollX, scrollY) => {
    if (autoScrollInterval) return; // Already scrolling
    
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    
    autoScrollInterval = setInterval(() => {
        container.scrollLeft += scrollX;
        container.scrollTop += scrollY;
        
        // Update relationships during auto-scroll
        if (draggedTable) {
            renderRelationships();
        }
    }, 16); // ~60fps
};

// Stop auto-scrolling
const stopAutoScroll = () => {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
};

// Add new table
const addTable = () => {
    document.getElementById('tableModalTitle').textContent = 'Add New Table';
    document.getElementById('tableName').value = '';
    document.getElementById('tableModal').classList.add('active');
};



// Save table
const saveTable = (event) => {
    event.preventDefault();
    
    const tableName = document.getElementById('tableName').value.trim();
    
    // Check for duplicate table names (case-insensitive)
    const existingTable = tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());
    if (existingTable) {
        ModalUtility.show('Duplicate Table Name', `A table named "${existingTable.name}" already exists. Please choose a different name.`, 'error');
        return;
    }
    
    // Automatically create an id column with primary key and autoincrement
    const columns = [
        {
            name: 'id',
            type: 'INT',
            length: '10',
            primaryKey: true,
            autoIncrement: true,
            nullable: false,
            defaultType: 'none',
            comment: 'Primary key identifier'
        }
    ];
    
    // Calculate center position of visible viewport
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    const centerX = container.scrollLeft + (container.clientWidth / 2) - 150; // -150 to center the table card
    const centerY = container.scrollTop + (container.clientHeight / 2) - 100; // -100 to center the table card
    
    // Add offset for multiple tables to prevent overlap
    const offset = tables.length * 30;
    
    const newTable = {
        id: Date.now().toString(),
        name: tableName,
        columns: columns,
        color: '#3B9797', // Default teal color
        position: { x: centerX + offset, y: centerY + offset }
    };
    
    tables.push(newTable);
    saveWorkspace();
    renderTables();
    renderMinimap();
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
    renderMemos();
    
    // Update minimap when tables are rendered
    if (minimapVisible) {
        renderMinimap();
    }
};

// Get relationship icon SVG path based on type
const getRelationshipIcon = (type) => {
    switch(type) {
        case '1:1':
            // Two circles connected
            return '<circle cx="-5" cy="0" r="3.5" fill="none" stroke-width="1.5"/><circle cx="5" cy="0" r="3.5" fill="none" stroke-width="1.5"/><line x1="-1.5" y1="0" x2="1.5" y2="0" stroke-width="1.5"/>';
        case '1:N':
            // Circle on left, crow's foot on right
            return '<circle cx="-6" cy="0" r="3.5" fill="none" stroke-width="1.5"/><line x1="-2.5" y1="0" x2="3" y2="0" stroke-width="1.5"/><path d="M3,-4 L7,0 L3,4" fill="none" stroke-width="1.5" stroke-linejoin="round"/>';
        case 'N:1':
            // Crow's foot on left, circle on right
            return '<path d="M-7,0 L-3,-4 M-7,0 L-3,4 M-7,0 L-3,0" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="-3" y1="0" x2="2.5" y2="0" stroke-width="1.5"/><circle cx="6" cy="0" r="3.5" fill="none" stroke-width="1.5"/>';
        case 'M:N':
            // Two crow's feet
            return '<path d="M-9,0 L-5,-4 M-9,0 L-5,4 M-9,0 L-5,0" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="-5" y1="0" x2="5" y2="0" stroke-width="1.5"/><path d="M5,-4 L9,0 L5,4" fill="none" stroke-width="1.5" stroke-linejoin="round"/>';
        default:
            return '<circle cx="0" cy="0" r="4" fill="none" stroke-width="1.5"/>';
    }
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
    
    // First pass: Add all paths (clickable and visible)
    relationships.forEach(rel => {
        const fromTable = tables.find(t => t.id === rel.fromTableId);
        const toTable = tables.find(t => t.id === rel.toTableId);
        
        if (!fromTable || !toTable) return;
        
        const fromCard = document.getElementById(`table-${fromTable.id}`);
        const toCard = document.getElementById(`table-${toTable.id}`);
        
        if (!fromCard || !toCard) return;
        
        // Ensure connection points exist
        if (!rel.fromPoint) {
            rel.fromPoint = { side: 'right', offset: 0.5, disconnected: false };
        }
        if (!rel.toPoint) {
            rel.toPoint = { side: 'left', offset: 0.5, disconnected: false };
        }
        
        // Ensure disconnected property exists
        if (rel.fromPoint.disconnected === undefined) {
            rel.fromPoint.disconnected = false;
        }
        if (rel.toPoint.disconnected === undefined) {
            rel.toPoint.disconnected = false;
        }
        
        // Calculate connection points - use absolute position if disconnected
        const fromPoint = rel.fromPoint.disconnected 
            ? { x: rel.fromPoint.x, y: rel.fromPoint.y }
            : getConnectionPoint(fromCard, rel.fromPoint, canvas);
        const toPoint = rel.toPoint.disconnected 
            ? { x: rel.toPoint.x, y: rel.toPoint.y }
            : getConnectionPoint(toCard, rel.toPoint, canvas);
        
        // Initialize corners if they don't exist (default orthogonal path)
        if (!rel.corners || rel.corners.length === 0) {
            const midX = (fromPoint.x + toPoint.x) / 2;
            rel.corners = [
                { x: midX, y: fromPoint.y },
                { x: midX, y: toPoint.y }
            ];
        }
        
        // Build path with corners
        let pathData = `M ${fromPoint.x} ${fromPoint.y}`;
        
        rel.corners.forEach(corner => {
            pathData += ` L ${corner.x} ${corner.y}`;
        });
        
        pathData += ` L ${toPoint.x} ${toPoint.y}`;
        
        // Create invisible clickable path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', 'transparent');
        path.setAttribute('stroke-width', '10');
        path.setAttribute('fill', 'none');
        path.style.pointerEvents = 'stroke';
        path.setAttribute('data-rel-id', rel.id);
        path.addEventListener('dblclick', (e) => addCornerAtPoint(e, rel.id));
        svg.appendChild(path);
        
        // Create visible path
        const visiblePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        visiblePath.setAttribute('d', pathData);
        visiblePath.setAttribute('stroke', rel.color);
        visiblePath.setAttribute('stroke-width', '3');
        visiblePath.setAttribute('stroke-dasharray', '8,5');
        visiblePath.setAttribute('fill', 'none');
        visiblePath.style.pointerEvents = 'none';
        visiblePath.setAttribute('data-rel-id', rel.id);
        visiblePath.classList.add('relationship-line');
        svg.appendChild(visiblePath);
    });
    
    // Second pass: Add all corner handles, icons, and endpoint handles (on top of paths)
    relationships.forEach(rel => {
        const fromTable = tables.find(t => t.id === rel.fromTableId);
        const toTable = tables.find(t => t.id === rel.toTableId);
        
        if (!fromTable || !toTable) return;
        
        const fromCard = document.getElementById(`table-${fromTable.id}`);
        const toCard = document.getElementById(`table-${toTable.id}`);
        
        if (!fromCard || !toCard) return;
        
        // Get connection points - use absolute position if disconnected
        const fromPoint = rel.fromPoint.disconnected 
            ? { x: rel.fromPoint.x, y: rel.fromPoint.y }
            : getConnectionPoint(fromCard, rel.fromPoint, canvas);
        const toPoint = rel.toPoint.disconnected 
            ? { x: rel.toPoint.x, y: rel.toPoint.y }
            : getConnectionPoint(toCard, rel.toPoint, canvas);
        
        // Add draggable corner handles
        rel.corners.forEach((corner, index) => {
            const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            handle.setAttribute('cx', corner.x);
            handle.setAttribute('cy', corner.y);
            handle.setAttribute('r', '6');
            handle.setAttribute('fill', rel.color);
            handle.setAttribute('stroke', 'white');
            handle.setAttribute('stroke-width', '2');
            handle.style.cursor = 'move';
            handle.style.pointerEvents = 'auto';
            handle.classList.add('corner-handle');
            handle.setAttribute('data-rel-id', rel.id);
            handle.setAttribute('data-corner-index', index);
            handle.setAttribute('title', 'Drag to move, Right-click to delete');
            
            handle.addEventListener('mousedown', (e) => {
                if (e.button === 0) startDragCorner(e, rel.id, index);
            });
            handle.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                deleteCorner(rel.id, index);
            });
            
            svg.appendChild(handle);
        });
        
        // Add relationship type indicator at center of path
        const centerIndex = Math.floor(rel.corners.length / 2);
        let midX, midY;
        
        if (rel.corners.length > 0) {
            if (rel.corners.length === 1) {
                midX = rel.corners[0].x;
                midY = rel.corners[0].y;
            } else {
                midX = (rel.corners[centerIndex - 1].x + rel.corners[centerIndex].x) / 2;
                midY = (rel.corners[centerIndex - 1].y + rel.corners[centerIndex].y) / 2;
            }
        } else {
            midX = (fromPoint.x + toPoint.x) / 2;
            midY = (fromPoint.y + toPoint.y) / 2;
        }
        
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('transform', `translate(${midX}, ${midY})`);
        group.style.pointerEvents = 'none';
        
        // Background circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '18');
        circle.setAttribute('fill', 'white');
        circle.setAttribute('stroke', rel.color);
        circle.setAttribute('stroke-width', '2');
        
        // Get icon SVG based on relationship type
        const iconSvg = getRelationshipIcon(rel.type);
        const iconGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        iconGroup.innerHTML = iconSvg;
        iconGroup.setAttribute('stroke', rel.color);
        iconGroup.setAttribute('fill', 'none');
        
        group.appendChild(circle);
        group.appendChild(iconGroup);
        svg.appendChild(group);
        
        // Add draggable endpoint handles with larger hit areas
        // Invisible larger hit area for FROM endpoint
        const fromHitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        fromHitArea.setAttribute('cx', fromPoint.x);
        fromHitArea.setAttribute('cy', fromPoint.y);
        fromHitArea.setAttribute('r', '20');
        fromHitArea.setAttribute('fill', 'transparent');
        fromHitArea.style.cursor = 'move';
        fromHitArea.style.pointerEvents = 'auto';
        fromHitArea.addEventListener('mousedown', (e) => startDragEndpoint(e, rel.id, 'from'));
        svg.appendChild(fromHitArea);
        
        // Visible FROM endpoint handle
        const fromHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        fromHandle.setAttribute('cx', fromPoint.x);
        fromHandle.setAttribute('cy', fromPoint.y);
        fromHandle.setAttribute('r', '10');
        fromHandle.setAttribute('fill', rel.color);
        fromHandle.setAttribute('stroke', 'white');
        fromHandle.setAttribute('stroke-width', '3');
        fromHandle.style.cursor = 'move';
        fromHandle.style.pointerEvents = 'none';
        fromHandle.classList.add('endpoint-handle');
        fromHandle.setAttribute('data-rel-id', rel.id);
        fromHandle.setAttribute('data-endpoint', 'from');
        svg.appendChild(fromHandle);
        
        // Invisible larger hit area for TO endpoint
        const toHitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        toHitArea.setAttribute('cx', toPoint.x);
        toHitArea.setAttribute('cy', toPoint.y);
        toHitArea.setAttribute('r', '20');
        toHitArea.setAttribute('fill', 'transparent');
        toHitArea.style.cursor = 'move';
        toHitArea.style.pointerEvents = 'auto';
        toHitArea.addEventListener('mousedown', (e) => startDragEndpoint(e, rel.id, 'to'));
        svg.appendChild(toHitArea);
        
        // Visible TO endpoint handle
        const toHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        toHandle.setAttribute('cx', toPoint.x);
        toHandle.setAttribute('cy', toPoint.y);
        toHandle.setAttribute('r', '10');
        toHandle.setAttribute('fill', rel.color);
        toHandle.setAttribute('stroke', 'white');
        toHandle.setAttribute('stroke-width', '3');
        toHandle.style.cursor = 'move';
        toHandle.style.pointerEvents = 'none';
        toHandle.classList.add('endpoint-handle');
        toHandle.setAttribute('data-rel-id', rel.id);
        toHandle.setAttribute('data-endpoint', 'to');
        svg.appendChild(toHandle);
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

// Edit relationship - now uses fancy panel
const editRelationship = (relId) => {
    editRelationshipPanel(relId);
};

// Corner dragging variables
let draggedCorner = null;

// Start dragging corner
const startDragCorner = (e, relId, cornerIndex) => {
    e.stopPropagation();
    draggedCorner = { relId, cornerIndex };
    
    document.addEventListener('mousemove', onDragCorner);
    document.addEventListener('mouseup', stopDragCorner);
    
    e.preventDefault();
};

// Drag corner
const onDragCorner = (e) => {
    if (!draggedCorner) return;
    
    const rel = relationships.find(r => r.id === draggedCorner.relId);
    if (!rel) return;
    
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    // Get mouse position relative to canvas
    const mouseX = e.clientX - canvasRect.left + canvas.scrollLeft;
    const mouseY = e.clientY - canvasRect.top + canvas.scrollTop;
    
    // Get previous and next points to determine orthogonal snapping
    const fromTable = tables.find(t => t.id === rel.fromTableId);
    const toTable = tables.find(t => t.id === rel.toTableId);
    const fromCard = document.getElementById(`table-${fromTable.id}`);
    const toCard = document.getElementById(`table-${toTable.id}`);
    
    let prevPoint, nextPoint;
    
    if (draggedCorner.cornerIndex === 0) {
        // First corner - prev is fromPoint
        const fromConnectionPoint = rel.fromPoint.disconnected 
            ? { x: rel.fromPoint.x, y: rel.fromPoint.y }
            : getConnectionPoint(fromCard, rel.fromPoint, canvas);
        prevPoint = fromConnectionPoint;
        
        if (rel.corners.length > 1) {
            nextPoint = rel.corners[1];
        } else {
            const toConnectionPoint = rel.toPoint.disconnected 
                ? { x: rel.toPoint.x, y: rel.toPoint.y }
                : getConnectionPoint(toCard, rel.toPoint, canvas);
            nextPoint = toConnectionPoint;
        }
    } else if (draggedCorner.cornerIndex === rel.corners.length - 1) {
        // Last corner - next is toPoint
        prevPoint = rel.corners[draggedCorner.cornerIndex - 1];
        
        const toConnectionPoint = rel.toPoint.disconnected 
            ? { x: rel.toPoint.x, y: rel.toPoint.y }
            : getConnectionPoint(toCard, rel.toPoint, canvas);
        nextPoint = toConnectionPoint;
    } else {
        // Middle corner
        prevPoint = rel.corners[draggedCorner.cornerIndex - 1];
        nextPoint = rel.corners[draggedCorner.cornerIndex + 1];
    }
    
    // Determine snapping based on which direction mouse moved more
    const dx = Math.abs(mouseX - prevPoint.x);
    const dy = Math.abs(mouseY - prevPoint.y);
    
    let snappedX, snappedY;
    
    // Snap to create orthogonal corners (right angles)
    if (dx > dy) {
        // Moving more horizontally - snap vertically to previous point, horizontally free
        snappedX = mouseX;
        snappedY = prevPoint.y;
    } else {
        // Moving more vertically - snap horizontally to previous point, vertically free
        snappedX = prevPoint.x;
        snappedY = mouseY;
    }
    
    // Update corner position with snapping
    rel.corners[draggedCorner.cornerIndex] = { x: snappedX, y: snappedY };
    
    // Re-render
    renderRelationships();
};

// Stop dragging corner
const stopDragCorner = () => {
    if (draggedCorner) {
        saveWorkspace();
    }
    
    draggedCorner = null;
    document.removeEventListener('mousemove', onDragCorner);
    document.removeEventListener('mouseup', stopDragCorner);
};

// Add corner at clicked point on line
const addCornerAtPoint = (e, relId) => {
    e.stopPropagation();
    const rel = relationships.find(r => r.id === relId);
    if (!rel) return;
    
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    const svg = document.getElementById('relationshipSvg');
    const svgRect = svg.getBoundingClientRect();
    
    // Get click position relative to canvas
    const mouseX = e.clientX - canvasRect.left + canvas.scrollLeft;
    const mouseY = e.clientY - canvasRect.top + canvas.scrollTop;
    
    // Add new corner at clicked position
    if (!rel.corners) rel.corners = [];
    rel.corners.push({ x: mouseX, y: mouseY });
    
    saveWorkspace();
    renderRelationships();
};

// Delete corner
const deleteCorner = (relId, cornerIndex) => {
    const rel = relationships.find(r => r.id === relId);
    if (!rel || !rel.corners) return;
    
    // Remove the corner
    rel.corners.splice(cornerIndex, 1);
    
    saveWorkspace();
    renderRelationships();
};

// Endpoint dragging variables
let draggedEndpoint = null;
let validConnectionTables = [];

// Start dragging endpoint
const startDragEndpoint = (e, relId, endpoint) => {
    e.stopPropagation();
    const rel = relationships.find(r => r.id === relId);
    if (!rel) return;
    
    draggedEndpoint = { relId, endpoint };
    
    // Mark as disconnected when starting to drag
    const point = endpoint === 'from' ? rel.fromPoint : rel.toPoint;
    point.disconnected = true;
    
    // Store current mouse position for free dragging
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    point.x = e.clientX - canvasRect.left + canvas.scrollLeft;
    point.y = e.clientY - canvasRect.top + canvas.scrollTop;
    
    // Only highlight the valid connection table
    validConnectionTables = endpoint === 'from' 
        ? [rel.fromTableId] 
        : [rel.toTableId];
    
    tables.forEach(table => {
        const tableCard = document.getElementById(`table-${table.id}`);
        if (validConnectionTables.includes(table.id)) {
            tableCard.classList.add('valid-connection');
        }
    });
    
    document.addEventListener('mousemove', onDragEndpoint);
    document.addEventListener('mouseup', stopDragEndpoint);
    
    e.preventDefault();
};

// Drag endpoint
const onDragEndpoint = (e) => {
    if (!draggedEndpoint) return;
    
    const rel = relationships.find(r => r.id === draggedEndpoint.relId);
    if (!rel) return;
    
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    // Get mouse position
    const mouseX = e.clientX - canvasRect.left + canvas.scrollLeft;
    const mouseY = e.clientY - canvasRect.top + canvas.scrollTop;
    
    const point = draggedEndpoint.endpoint === 'from' ? rel.fromPoint : rel.toPoint;
    
    // Update free-floating position
    point.x = mouseX;
    point.y = mouseY;
    point.disconnected = true;
    
    // Check if hovering over valid table for reconnection
    let hoveredTable = null;
    let isNearTable = false;
    
    tables.forEach(table => {
        if (!validConnectionTables.includes(table.id)) return;
        
        const tableCard = document.getElementById(`table-${table.id}`);
        const rect = tableCard.getBoundingClientRect();
        const tableLeft = rect.left - canvasRect.left + canvas.scrollLeft;
        const tableTop = rect.top - canvasRect.top + canvas.scrollTop;
        
        // Expand hit area for easier reconnection
        const expandedLeft = tableLeft - 30;
        const expandedTop = tableTop - 30;
        const expandedRight = tableLeft + rect.width + 30;
        const expandedBottom = tableTop + rect.height + 30;
        
        if (mouseX >= expandedLeft && mouseX <= expandedRight &&
            mouseY >= expandedTop && mouseY <= expandedBottom) {
            hoveredTable = table;
            isNearTable = true;
            tableCard.classList.add('connection-hover');
            
            // Calculate which edge is closest
            const centerX = tableLeft + rect.width / 2;
            const centerY = tableTop + rect.height / 2;
            const dx = mouseX - centerX;
            const dy = mouseY - centerY;
            
            let side, offset;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) {
                    side = 'right';
                    offset = Math.max(0, Math.min(1, (mouseY - tableTop) / rect.height));
                } else {
                    side = 'left';
                    offset = Math.max(0, Math.min(1, (mouseY - tableTop) / rect.height));
                }
            } else {
                if (dy > 0) {
                    side = 'bottom';
                    offset = Math.max(0, Math.min(1, (mouseX - tableLeft) / rect.width));
                } else {
                    side = 'top';
                    offset = Math.max(0, Math.min(1, (mouseX - tableLeft) / rect.width));
                }
            }
            
            // Prepare for reconnection
            point.side = side;
            point.offset = offset;
            point.disconnected = false; // Will reconnect when near table
        } else {
            tableCard.classList.remove('connection-hover');
        }
    });
    
    // If not near any valid table, ensure disconnected state
    if (!isNearTable) {
        point.disconnected = true;
    }
    
    renderRelationships();
};

// Stop dragging endpoint
const stopDragEndpoint = () => {
    if (draggedEndpoint) {
        // Distribute connection points to avoid overlap
        distributeConnectionPoints();
        saveWorkspace();
    }
    
    // Remove highlighting
    tables.forEach(table => {
        const tableCard = document.getElementById(`table-${table.id}`);
        tableCard.classList.remove('valid-connection');
        tableCard.classList.remove('connection-hover');
    });
    
    draggedEndpoint = null;
    validConnectionTables = [];
    document.removeEventListener('mousemove', onDragEndpoint);
    document.removeEventListener('mouseup', stopDragEndpoint);
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
    const colorPreview = document.querySelector('#modalColorTrigger .color-preview');
    const color = colorPreview ? colorPreview.style.background : rel.color;
    
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
            if (rel && rel.fkColumnName && rel.targetTableId) {
                // Remove the foreign key column from target table
                const targetTable = tables.find(t => t.id === rel.targetTableId);
                if (targetTable) {
                    targetTable.columns = targetTable.columns.filter(col => 
                        !(col.name === rel.fkColumnName && col.isForeignKey && col.referencedTableId === rel.referencedTableId)
                    );
                }
            }
            
            relationships = relationships.filter(r => r.id !== relId);
            saveWorkspace();
            renderTables();
            renderRelationships();
            renderMinimap();
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
                <div class="column-icon ${col.primaryKey ? 'primary-key-icon' : ''} ${col.isForeignKey ? 'foreign-key-icon' : ''}" style="${col.isForeignKey ? `background: ${col.foreignKeyColor}15; border: 2px solid ${col.foreignKeyColor};` : ''}">
                    ${col.primaryKey ? `
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9h.01" />
                        </svg>
                    ` : col.isForeignKey ? `
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: ${col.foreignKeyColor};">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    ` : `
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                        <input type="checkbox" ${col.primaryKey ? 'checked' : ''} 
                               onchange="updateColumnProperty('${table.id}', ${index}, 'primaryKey', this.checked)">
                        <span>Primary Key</span>
                    </label>
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
                <button type="button" class="table-color-picker-btn" 
                        id="tableColorPicker-${table.id}" 
                        onclick="openTableColorPicker(event, '${table.id}')"
                        style="background: ${table.color};"
                        title="Change table color">
                </button>
                <h4>${table.name}</h4>
                <span class="column-count-badge">${table.columns.length} ${table.columns.length === 1 ? 'column' : 'columns'}</span>
            </div>
            <div class="table-actions">
                <button class="table-action-btn" onclick="toggleRelationshipView('${table.id}')" title="View Relationships">
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
        <div class="table-body" id="table-body-${table.id}">
            ${columnsHTML}
        </div>
        <div class="relationship-list-view" id="rel-view-${table.id}">

            <div id="rel-list-${table.id}">
                <!-- Relationships will be rendered here -->
            </div>
            <button class="add-relationship-btn" onclick="addNewRelationship('${table.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Relationship
            </button>
        </div>
    `;
    
    // Make draggable from header
    const header = div.querySelector('.table-header');
    header.addEventListener('mousedown', (e) => {
        // Only start drag if not clicking on interactive elements
        if (!e.target.closest('.table-action-btn') && !e.target.closest('.table-color-picker-btn')) {
            startDrag(e, table);
        }
    });
    
    // Select on click (but not while dragging)
    div.addEventListener('click', (e) => {
        if (!draggedTable) {
            e.stopPropagation();
            selectTable(table);
        }
    });
    
    return div;
};

// Drag functionality
const startDrag = (e, table) => {
    // Don't drag if clicking on action buttons or color picker
    if (e.target.closest('.table-action-btn') || e.target.closest('.table-color-picker-btn')) return;
    
    draggedTable = table;
    const tableElement = document.getElementById(`table-${table.id}`);
    
    // Simple offset calculation
    dragOffset.x = e.clientX - table.position.x;
    dragOffset.y = e.clientY - table.position.y;
    
    tableElement.classList.add('dragging');
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    
    e.preventDefault();
};

const onDrag = (e) => {
    if (!draggedTable) return;
    
    // Auto-scroll when dragging table near edges
    checkAutoScroll(e);
    
    // Direct position calculation
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    
    // Keep table within bounds
    draggedTable.position.x = Math.max(0, x);
    draggedTable.position.y = Math.max(0, y);
    
    // Update DOM directly
    const tableElement = document.getElementById(`table-${draggedTable.id}`);
    tableElement.style.left = `${draggedTable.position.x}px`;
    tableElement.style.top = `${draggedTable.position.y}px`;
    
    // Update relationships with smart side detection
    relationships.forEach(rel => {
        if (rel.fromTableId === draggedTable.id || rel.toTableId === draggedTable.id) {
            const canvas = document.getElementById('canvas');
            
            // Update fromPoint if this is the from table
            if (rel.fromTableId === draggedTable.id) {
                const toTable = tables.find(t => t.id === rel.toTableId);
                if (toTable) {
                    const toCard = document.getElementById(`table-${toTable.id}`);
                    updateConnectionSide(rel.fromPoint, tableElement, toCard, rel, 'from', canvas);
                }
            }
            
            // Update toPoint if this is the to table
            if (rel.toTableId === draggedTable.id) {
                const fromTable = tables.find(t => t.id === rel.fromTableId);
                if (fromTable) {
                    const fromCard = document.getElementById(`table-${fromTable.id}`);
                    updateConnectionSide(rel.toPoint, tableElement, fromCard, rel, 'to', canvas);
                }
            }
        }
    });
    
    // Update relationships
    renderRelationships();
};

// Helper function to update connection side based on approach angle
const updateConnectionSide = (point, movingCard, otherCard, rel, endpoint, canvas) => {
    if (point.disconnected) return; // Don't update if disconnected
    
    const canvasRect = canvas.getBoundingClientRect();
    const movingRect = movingCard.getBoundingClientRect();
    const otherRect = otherCard.getBoundingClientRect();
    
    // Convert to canvas coordinates
    const movingLeft = movingRect.left - canvasRect.left + canvas.scrollLeft;
    const movingTop = movingRect.top - canvasRect.top + canvas.scrollTop;
    const movingCenterX = movingLeft + movingRect.width / 2;
    const movingCenterY = movingTop + movingRect.height / 2;
    
    const otherLeft = otherRect.left - canvasRect.left + canvas.scrollLeft;
    const otherTop = otherRect.top - canvasRect.top + canvas.scrollTop;
    const otherCenterX = otherLeft + otherRect.width / 2;
    const otherCenterY = otherTop + otherRect.height / 2;
    
    // Determine approach direction (from other table to moving table)
    let fromX, fromY;
    if (endpoint === 'to') {
        // This is the 'to' endpoint, line comes from 'from' side
        if (rel.corners && rel.corners.length > 0) {
            const lastCorner = rel.corners[rel.corners.length - 1];
            fromX = lastCorner.x;
            fromY = lastCorner.y;
        } else {
            fromX = otherCenterX;
            fromY = otherCenterY;
        }
    } else {
        // This is the 'from' endpoint, line goes to 'to' side
        if (rel.corners && rel.corners.length > 0) {
            const firstCorner = rel.corners[0];
            fromX = firstCorner.x;
            fromY = firstCorner.y;
        } else {
            fromX = otherCenterX;
            fromY = otherCenterY;
        }
    }
    
    // Calculate approach angle relative to moving table
    const dx = fromX - movingCenterX;
    const dy = fromY - movingCenterY;
    
    let side;
    // Determine side based on approach angle
    if (Math.abs(dx) > Math.abs(dy)) {
        // Approaching more from left/right
        if (dx > 0) {
            side = 'right'; // Coming from right, connect to right
        } else {
            side = 'left'; // Coming from left, connect to left
        }
    } else {
        // Approaching more from top/bottom
        if (dy > 0) {
            side = 'bottom'; // Coming from bottom, connect to bottom
        } else {
            side = 'top'; // Coming from top, connect to top
        }
    }
    
    // Only update if side changed
    if (point.side !== side) {
        point.side = side;
        // Keep offset at 0.5 (center) when side changes
        point.offset = 0.5;
    }
};

// Helper function to distribute connection points evenly on table edges
const distributeConnectionPoints = () => {
    // Group connections by table and side
    const connectionsByTableSide = {};
    
    relationships.forEach(rel => {
        // Process fromPoint
        if (!rel.fromPoint.disconnected) {
            const key = `${rel.fromTableId}-${rel.fromPoint.side}`;
            if (!connectionsByTableSide[key]) {
                connectionsByTableSide[key] = [];
            }
            connectionsByTableSide[key].push({ rel, point: rel.fromPoint, endpoint: 'from' });
        }
        
        // Process toPoint
        if (!rel.toPoint.disconnected) {
            const key = `${rel.toTableId}-${rel.toPoint.side}`;
            if (!connectionsByTableSide[key]) {
                connectionsByTableSide[key] = [];
            }
            connectionsByTableSide[key].push({ rel, point: rel.toPoint, endpoint: 'to' });
        }
    });
    
    // Distribute offsets evenly for each group
    Object.values(connectionsByTableSide).forEach(connections => {
        const count = connections.length;
        if (count === 1) {
            // Single connection - center it
            connections[0].point.offset = 0.5;
        } else if (count === 2) {
            // Two connections - place at 0.33 and 0.67 for better visual separation
            connections[0].point.offset = 0.33;
            connections[1].point.offset = 0.67;
        } else {
            // Multiple connections - distribute evenly with smart padding
            // Use larger padding for fewer connections, smaller for many
            const padding = count <= 3 ? 0.15 : 0.08;
            const range = 1 - (2 * padding);
            const spacing = range / (count - 1);
            
            connections.forEach((conn, index) => {
                conn.point.offset = padding + (spacing * index);
            });
        }
    });
};

const stopDrag = () => {
    if (draggedTable) {
        const tableElement = document.getElementById(`table-${draggedTable.id}`);
        if (tableElement) tableElement.classList.remove('dragging');
        
        // Distribute connection points to avoid overlap
        distributeConnectionPoints();
        
        saveWorkspace();
        draggedTable = null;
    }
    
    stopAutoScroll(); // Stop auto-scroll when drag ends
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    
    // Update minimap if visible
    if (minimapVisible) {
        renderMinimap();
    }
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
    
    // If primaryKey changes, re-render to update the icon
    if (property === 'primaryKey') {
        const detailsEl = document.getElementById(`details-${tableId}-${columnIndex}`);
        const wasVisible = detailsEl ? detailsEl.style.display !== 'none' : false;
        
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
    }
    
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
        primaryKey: false,
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

// Memo Functions
const addMemo = () => {
    currentEditingMemoId = null;
    document.getElementById('memoModalTitle').textContent = 'Add Memo';
    document.getElementById('memoContent').innerHTML = '';
    document.getElementById('memoModal').classList.add('active');
    document.getElementById('memoContent').focus();
};

const closeMemoModal = () => {
    document.getElementById('memoModal').classList.remove('active');
    currentEditingMemoId = null;
};

const formatText = (command) => {
    // Handle heading formats specially
    if (command === 'h1' || command === 'h2') {
        document.execCommand('formatBlock', false, `<${command}>`);
    } else {
        document.execCommand(command, false, null);
    }
    document.getElementById('memoContent').focus();
};

const saveMemo = () => {
    const content = document.getElementById('memoContent').innerHTML.trim();
    
    if (!content || content === '<br>') {
        ModalUtility.show('Empty Memo', 'Please add some content to the memo.', 'error');
        return;
    }
    
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    
    if (currentEditingMemoId) {
        // Update existing memo
        const memo = memos.find(m => m.id === currentEditingMemoId);
        if (memo) {
            memo.content = content;
            saveWorkspace();
            renderMemos();
        }
    } else {
        // Create new memo
        const centerX = container.scrollLeft + (container.clientWidth / 2) - 150;
        const centerY = container.scrollTop + (container.clientHeight / 2) - 100;
        const offset = memos.length * 30;
        
        const newMemo = {
            id: Date.now().toString(),
            content: content,
            position: { x: centerX + offset, y: centerY + offset },
            size: { width: 300, height: 200 },
            color: '#FFF9C4'
        };
        
        memos.push(newMemo);
        saveWorkspace();
        renderMemos();
    }
    
    closeMemoModal();
};

const editMemo = (memoId) => {
    const memo = memos.find(m => m.id === memoId);
    if (!memo) return;
    
    currentEditingMemoId = memoId;
    document.getElementById('memoModalTitle').textContent = 'Edit Memo';
    document.getElementById('memoContent').innerHTML = memo.content;
    document.getElementById('memoModal').classList.add('active');
    document.getElementById('memoContent').focus();
};

const deleteMemo = (memoId) => {
    ModalUtility.confirm(
        'Delete Memo',
        'Are you sure you want to delete this memo?',
        () => {
            memos = memos.filter(m => m.id !== memoId);
            saveWorkspace();
            renderMemos();
        }
    );
};

const renderMemos = () => {
    const canvas = document.getElementById('canvas');
    const existingMemos = canvas.querySelectorAll('.memo-card');
    existingMemos.forEach(memo => memo.remove());
    
    memos.forEach(memo => {
        const memoElement = createMemoElement(memo);
        canvas.appendChild(memoElement);
    });
    
    // Update minimap after rendering memos
    if (minimapVisible) {
        renderMinimap();
    }
};

const createMemoElement = (memo) => {
    const memoCard = document.createElement('div');
    memoCard.className = 'memo-card';
    memoCard.id = `memo-${memo.id}`;
    memoCard.style.left = `${memo.position.x}px`;
    memoCard.style.top = `${memo.position.y}px`;
    memoCard.style.width = `${memo.size.width}px`;
    memoCard.style.height = `${memo.size.height}px`;
    memoCard.style.backgroundColor = memo.color;
    
    memoCard.innerHTML = `
        <div class="memo-header" onmousedown="startMemoDrag(event, '${memo.id}')">
            <div class="memo-actions">
                <button class="memo-action-btn" onclick="editMemo('${memo.id}')" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button class="memo-action-btn" onclick="deleteMemo('${memo.id}')" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
        <div class="memo-content">${memo.content}</div>
        <div class="memo-resize-handle" onmousedown="startMemoResize(event, '${memo.id}')"></div>
    `;
    
    return memoCard;
};

let draggedMemo = null;
let memoStartPos = { x: 0, y: 0 };

const startMemoDrag = (e, memoId) => {
    e.stopPropagation();
    const memoElement = document.getElementById(`memo-${memoId}`);
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    
    draggedMemo = memoId;
    memoStartPos = {
        x: e.clientX - memoElement.offsetLeft + container.scrollLeft,
        y: e.clientY - memoElement.offsetTop + container.scrollTop
    };
    
    memoElement.classList.add('dragging');
};

const onMemoDrag = (e) => {
    if (!draggedMemo) return;
    
    const memoElement = document.getElementById(`memo-${draggedMemo}`);
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    
    const newX = e.clientX - memoStartPos.x + container.scrollLeft;
    const newY = e.clientY - memoStartPos.y + container.scrollTop;
    
    memoElement.style.left = `${newX}px`;
    memoElement.style.top = `${newY}px`;
};

const stopMemoDrag = () => {
    if (!draggedMemo) return;
    
    const memoElement = document.getElementById(`memo-${draggedMemo}`);
    memoElement.classList.remove('dragging');
    
    const memo = memos.find(m => m.id === draggedMemo);
    if (memo) {
        memo.position.x = parseInt(memoElement.style.left);
        memo.position.y = parseInt(memoElement.style.top);
        saveWorkspace();
        renderMinimap();
    }
    
    draggedMemo = null;
};

let resizingMemo = null;
let resizeStartSize = { width: 0, height: 0 };
let resizeStartPos = { x: 0, y: 0 };

const startMemoResize = (e, memoId) => {
    e.stopPropagation();
    resizingMemo = memoId;
    const memoElement = document.getElementById(`memo-${memoId}`);
    
    resizeStartSize = {
        width: memoElement.offsetWidth,
        height: memoElement.offsetHeight
    };
    resizeStartPos = { x: e.clientX, y: e.clientY };
};

const onMemoResize = (e) => {
    if (!resizingMemo) return;
    
    const memoElement = document.getElementById(`memo-${resizingMemo}`);
    const deltaX = e.clientX - resizeStartPos.x;
    const deltaY = e.clientY - resizeStartPos.y;
    
    const newWidth = Math.max(200, resizeStartSize.width + deltaX);
    const newHeight = Math.max(150, resizeStartSize.height + deltaY);
    
    memoElement.style.width = `${newWidth}px`;
    memoElement.style.height = `${newHeight}px`;
};

const stopMemoResize = () => {
    if (!resizingMemo) return;
    
    const memoElement = document.getElementById(`memo-${resizingMemo}`);
    const memo = memos.find(m => m.id === resizingMemo);
    
    if (memo) {
        memo.size.width = memoElement.offsetWidth;
        memo.size.height = memoElement.offsetHeight;
        saveWorkspace();
        renderMinimap();
    }
    
    resizingMemo = null;
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
                // Find and remove the relationship using correct property names
                relationships = relationships.filter(r => 
                    !(r.targetTableId === tableId && r.fkColumnName === column.name)
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
            renderMinimap();
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
    
    // Reset color in custom picker trigger
    const colorPreview = document.querySelector('#modalColorTrigger .color-preview');
    const colorText = document.querySelector('#modalColorTrigger .color-text');
    if (colorPreview) colorPreview.style.background = '#3B9797';
    if (colorText) colorText.textContent = '#3B9797';
    
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
    const colorPreview = document.querySelector('#modalColorTrigger .color-preview');
    const color = colorPreview ? colorPreview.style.background : '#3B9797';
    
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
            if (col.isForeignKey && col.referencedTableId === tableId) {
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
    databases[currentDatabaseKey].memos = memos;
    databases[currentDatabaseKey].updatedAt = new Date().toISOString();
    localStorage.setItem('databases', JSON.stringify(databases));
    updateMetaInfo();
};

// Export diagram (placeholder)
const exportDiagram = () => {
    ModalUtility.show('Coming Soon', 'Export functionality will be available in the next update!', 'info');
};

const resetView = () => {
    centerCanvas();
};

// Minimap Functions
const initializeMinimap = () => {
    const minimapViewport = document.getElementById('minimapViewport');
    
    // Minimap viewport dragging
    minimapViewport.addEventListener('mousedown', (e) => {
        minimapDragging = true;
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (minimapDragging) {
            onMinimapDrag(e);
        }
    });
    
    document.addEventListener('mouseup', () => {
        minimapDragging = false;
    });
    
    // Click on minimap to navigate
    const minimapCanvas = document.getElementById('minimapCanvas');
    minimapCanvas.addEventListener('click', (e) => {
        if (!minimapDragging) {
            navigateFromMinimap(e);
        }
    });
};

const toggleMinimap = () => {
    minimapVisible = !minimapVisible;
    const minimap = document.getElementById('minimap');
    const minimapBtn = document.getElementById('minimapToggleBtn');
    
    if (minimapVisible) {
        minimap.style.display = 'block';
        minimapBtn?.classList.add('active');
        renderMinimap();
        updateMinimapViewport();
    } else {
        minimap.style.display = 'none';
        minimapBtn?.classList.remove('active');
    }
};

// Toggle tables visibility
const toggleTablesVisibility = () => {
    tablesVisible = !tablesVisible;
    const canvas = document.getElementById('canvas');
    const tablesBtn = document.getElementById('tablesToggleBtn');
    
    if (tablesVisible) {
        canvas.classList.remove('hide-tables');
        tablesBtn?.classList.add('active');
    } else {
        canvas.classList.add('hide-tables');
        tablesBtn?.classList.remove('active');
    }
};

// Toggle relationships visibility
const toggleRelationshipsVisibility = () => {
    relationshipsVisible = !relationshipsVisible;
    const relationshipsSvg = document.getElementById('relationshipSvg');
    const relationshipsBtn = document.getElementById('relationshipsToggleBtn');
    
    if (relationshipsVisible) {
        if (relationshipsSvg) relationshipsSvg.style.display = 'block';
        relationshipsBtn?.classList.add('active');
    } else {
        if (relationshipsSvg) relationshipsSvg.style.display = 'none';
        relationshipsBtn?.classList.remove('active');
    }
};

// Toggle memos visibility
const toggleMemosVisibility = () => {
    memosVisible = !memosVisible;
    const canvas = document.getElementById('canvas');
    const memosBtn = document.getElementById('memosToggleBtn');
    
    if (memosVisible) {
        canvas.classList.remove('hide-memos');
        memosBtn?.classList.add('active');
    } else {
        canvas.classList.add('hide-memos');
        memosBtn?.classList.remove('active');
    }
};

const renderMinimap = () => {
    const canvas = document.getElementById('canvas');
    const minimapCanvas = document.getElementById('minimapCanvas');
    const ctx = minimapCanvas.getContext('2d');
    
    // Set canvas size
    const minimap = document.getElementById('minimap');
    minimapCanvas.width = minimap.clientWidth;
    minimapCanvas.height = minimap.clientHeight;
    
    // Calculate scale
    const scaleX = minimapCanvas.width / canvas.offsetWidth;
    const scaleY = minimapCanvas.height / canvas.offsetHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Clear canvas
    ctx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // Draw tables
    tables.forEach(table => {
        const x = table.position.x * scale;
        const y = table.position.y * scale;
        const width = 300 * scale; // Approximate table width
        const height = 200 * scale; // Approximate table height
        
        ctx.fillStyle = table.color || '#3B9797';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
    });
    
    // Draw relationships
    relationships.forEach(rel => {
        const fromTable = tables.find(t => t.id === rel.fromTableId);
        const toTable = tables.find(t => t.id === rel.toTableId);
        
        if (fromTable && toTable) {
            ctx.strokeStyle = rel.color || '#3B9797';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(
                (fromTable.position.x + 150) * scale,
                (fromTable.position.y + 100) * scale
            );
            ctx.lineTo(
                (toTable.position.x + 150) * scale,
                (toTable.position.y + 100) * scale
            );
            ctx.stroke();
        }
    });
    
    // Draw memos
    memos.forEach(memo => {
        const x = memo.position.x * scale;
        const y = memo.position.y * scale;
        const width = memo.size.width * scale;
        const height = memo.size.height * scale;
        
        ctx.fillStyle = memo.color || '#FFF9C4';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
    });
};

const updateMinimapViewport = () => {
    if (!minimapVisible) return;
    
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    const minimapCanvas = document.getElementById('minimapCanvas');
    const minimapViewport = document.getElementById('minimapViewport');
    
    // Calculate scale
    const scaleX = minimapCanvas.width / canvas.offsetWidth;
    const scaleY = minimapCanvas.height / canvas.offsetHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate viewport position and size
    const viewportX = container.scrollLeft * scale;
    const viewportY = container.scrollTop * scale;
    const viewportWidth = container.clientWidth * scale;
    const viewportHeight = container.clientHeight * scale;
    
    minimapViewport.style.left = viewportX + 'px';
    minimapViewport.style.top = viewportY + 'px';
    minimapViewport.style.width = viewportWidth + 'px';
    minimapViewport.style.height = viewportHeight + 'px';
};

const onMinimapDrag = (e) => {
    const minimap = document.getElementById('minimap');
    const minimapCanvas = document.getElementById('minimapCanvas');
    const canvas = document.getElementById('canvas');
    const container = canvas.parentElement;
    
    const rect = minimap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate scale
    const scaleX = minimapCanvas.width / canvas.offsetWidth;
    const scaleY = minimapCanvas.height / canvas.offsetHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Convert minimap coordinates to canvas coordinates
    const scrollX = (x / scale) - (container.clientWidth / 2);
    const scrollY = (y / scale) - (container.clientHeight / 2);
    
    container.scrollLeft = scrollX;
    container.scrollTop = scrollY;
};

const navigateFromMinimap = (e) => {
    onMinimapDrag(e);
};

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('tableModal');
    if (e.target === modal) {
        closeTableModal();
    }
});

// Relationship Panel Dragging Variables
let panelDragging = false;
let panelDragOffset = { x: 0, y: 0 };
let currentEditingRelationshipId = null;

// Initialize panel dragging
document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('relationshipPanel');
    const panelHeader = document.getElementById('panelHeader');
    
    if (panelHeader) {
        panelHeader.addEventListener('mousedown', startPanelDrag);
    }
});

// Start dragging panel
const startPanelDrag = (e) => {
    if (e.target.closest('.panel-close-btn')) return;
    
    const panel = document.getElementById('relationshipPanel');
    const rect = panel.getBoundingClientRect();
    
    panelDragging = true;
    panelDragOffset.x = e.clientX - rect.left;
    panelDragOffset.y = e.clientY - rect.top;
    
    document.addEventListener('mousemove', onPanelDrag);
    document.addEventListener('mouseup', stopPanelDrag);
    
    e.preventDefault();
};

// Drag panel
const onPanelDrag = (e) => {
    if (!panelDragging) return;
    
    const panel = document.getElementById('relationshipPanel');
    const container = panel.parentElement;
    const containerRect = container.getBoundingClientRect();
    
    let x = e.clientX - containerRect.left - panelDragOffset.x;
    let y = e.clientY - containerRect.top - panelDragOffset.y;
    
    // Keep panel within bounds
    const panelRect = panel.getBoundingClientRect();
    x = Math.max(0, Math.min(x, containerRect.width - panelRect.width));
    y = Math.max(0, Math.min(y, containerRect.height - panelRect.height));
    
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.transform = 'none';
};

// Stop dragging panel
const stopPanelDrag = () => {
    panelDragging = false;
    document.removeEventListener('mousemove', onPanelDrag);
    document.removeEventListener('mouseup', stopPanelDrag);
};

// Open relationship panel (replaces openRelationshipModal)
const openRelationshipPanel = (fromTableId) => {
    if (tables.length < 2) {
        ModalUtility.show('Insufficient Tables', 'You need at least 2 tables to create relationships.', 'warning');
        return;
    }

     console.log('Adding new relationship for table:', fromTableId);

    currentRelationshipSourceTable = fromTableId;
    currentEditingRelationshipId = null;
    const fromTable = tables.find(t => t.id === fromTableId);
    
    // Update panel title and content
    document.getElementById('panelTitle').textContent = 'Create Relationship';
    document.getElementById('panelSubmitText').textContent = 'Create';
    document.getElementById('panelFromTableName').textContent = fromTable.name;
    
    // Populate target table dropdown (exclude current table)
    const toTableSelect = document.getElementById('panelToTableSelect');
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
    selectRelType(document.querySelector('.rel-type-card[onclick*="1:1"]'), '1:1');
    const colorPicker = document.getElementById('panelRelationshipColor');
    colorPicker.value = '#3B9797';
    updateColorDisplay('#3B9797');
    
    // Reset panel position and show
    const panel = document.getElementById('relationshipPanel');
    panel.style.left = '';
    panel.style.top = '';
    panel.style.transform = '';
    panel.classList.add('active');
};

// Close relationship panel
const closeRelationshipPanel = () => {
    const panel = document.getElementById('relationshipPanel');
    panel.classList.remove('active');
    currentRelationshipSourceTable = null;
    currentEditingRelationshipId = null;
};

// Select relationship type
const selectRelType = (card, value) => {
    // Remove selected class from all cards
    document.querySelectorAll('.rel-type-card').forEach(c => c.classList.remove('selected'));
    
    // Add selected class to clicked card
    card.classList.add('selected');
    
    // Check the radio button
    card.querySelector('input[type="radio"]').checked = true;
};

// Update color display
const updateColorDisplay = (color) => {
    document.getElementById('colorDisplay').textContent = color.toUpperCase();
    const preview = document.getElementById('colorPreview');
    if (preview) {
        preview.style.background = color;
    }
    document.getElementById('panelRelationshipColor').value = color;
};

// Custom Color Picker Functions (using ColorPickerUtility)
const openCustomColorPicker = (event) => {
    event.stopPropagation();
    
    const trigger = document.getElementById('colorPickerTrigger');
    const currentColor = document.getElementById('panelRelationshipColor').value;
    
    ColorPickerUtility.open(trigger, currentColor, (color) => {
        updateColorDisplay(color);
    });
};

const closeCustomColorPicker = () => {
    ColorPickerUtility.close();
};

const selectPresetColor = (color) => {
    ColorPickerUtility.selectPreset(color);
};

const selectCustomColor = (color) => {
    ColorPickerUtility.selectCustom(color);
};

// Open color picker for table header
const openTableColorPicker = (event, tableId) => {
    event.stopPropagation();
    
    const trigger = event.target;
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    ColorPickerUtility.open(trigger, table.color, (color) => {
        updateTableColor(tableId, color);
        trigger.style.background = color;
    });
};

// Open color picker for relationship in list
const openRelColorPicker = (event, relId) => {
    event.stopPropagation();
    
    const trigger = event.target;
    const rel = relationships.find(r => r.id === relId);
    if (!rel) return;
    
    ColorPickerUtility.open(trigger, rel.color, (color) => {
        updateRelationshipColor(relId, color);
        trigger.style.background = color;
    });
};

// Make color picker functions globally accessible
window.openCustomColorPicker = openCustomColorPicker;
window.closeCustomColorPicker = closeCustomColorPicker;
window.selectPresetColor = selectPresetColor;
window.selectCustomColor = selectCustomColor;
window.openTableColorPicker = openTableColorPicker;
window.openRelColorPicker = openRelColorPicker;

// Open color picker for old modal (legacy support)
const openModalColorPicker = (event) => {
    event.stopPropagation();
    
    const trigger = event.currentTarget;
    const preview = trigger.querySelector('.color-preview');
    const currentColor = preview.style.background;
    
    ColorPickerUtility.open(trigger, currentColor, (color) => {
        preview.style.background = color;
        trigger.querySelector('.color-text').textContent = color;
    });
};
window.openModalColorPicker = openModalColorPicker;

// Handle relationship submit
const handleRelationshipSubmit = (e) => {
    if (e) e.preventDefault();
    
    const toTableId = document.getElementById('panelToTableSelect').value;
    
    if (!toTableId) {
        ModalUtility.show('Select Target Table', 'Please select a target table for the relationship.', 'warning');
        return;
    }
    
    const selectedType = document.querySelector('input[name="panelRelType"]:checked').value;
    const color = document.getElementById('panelRelationshipColor').value;
    
    if (currentEditingRelationshipId) {
        // Update existing relationship
        const rel = relationships.find(r => r.id === currentEditingRelationshipId);
        if (rel) {
            rel.toTableId = toTableId;
            rel.type = selectedType;
            rel.color = color;
        }
    } else {
        // Add foreign key column based on relationship type first
        const fromTable = tables.find(t => t.id === currentRelationshipSourceTable);
        const toTable = tables.find(t => t.id === toTableId);
        
        let targetTableId = null;
        let referencedTableId = null;
        let fkColumnName = null;
        
        if (fromTable && toTable) {
            // For 1:N (one-to-many), add FK to the "many" side (toTable)
            // For N:1 (many-to-one), add FK to the "many" side (fromTable)
            // For 1:1, add FK to toTable by convention
            // For M:N, we typically need a junction table (not auto-created here)
            
            let targetTable = null;
            let referencedTable = null;
            
            if (selectedType === '1:N') {
                targetTable = toTable;  // Add FK to the "many" side
                referencedTable = fromTable;
                targetTableId = toTable.id;
                referencedTableId = fromTable.id;
            } else if (selectedType === 'N:1') {
                targetTable = fromTable;  // Add FK to the "many" side
                referencedTable = toTable;
                targetTableId = fromTable.id;
                referencedTableId = toTable.id;
            } else if (selectedType === '1:1') {
                targetTable = toTable;  // Add FK to toTable by convention
                referencedTable = fromTable;
                targetTableId = toTable.id;
                referencedTableId = fromTable.id;
            }
            
            // Add foreign key column if we have a target table (skip for M:N)
            if (targetTable && referencedTable && selectedType !== 'M:N') {
                fkColumnName = `${referencedTable.name.toLowerCase()}_id`;
                
                // Check if FK column already exists
                const existingColumn = targetTable.columns.find(col => col.name === fkColumnName);
                
                if (!existingColumn) {
                    targetTable.columns.push({
                        name: fkColumnName,
                        type: 'INT',
                        length: '10',
                        primaryKey: false,
                        autoIncrement: false,
                        nullable: false,
                        defaultType: 'none',
                        comment: `Foreign key to ${referencedTable.name}`,
                        isForeignKey: true,
                        foreignKeyColor: referencedTable.color,
                        referencedTableId: referencedTable.id
                    });
                }
            }
        }
        
        // Create new relationship with FK info
        const newRelationship = {
            id: Date.now().toString(),
            fromTableId: currentRelationshipSourceTable,
            toTableId: toTableId,
            type: selectedType,
            color: color,
            fromPoint: { side: 'right', offset: 0.5 },
            toPoint: { side: 'left', offset: 0.5 },
            fkColumnName: fkColumnName,
            targetTableId: targetTableId,
            referencedTableId: referencedTableId
        };
        
        relationships.push(newRelationship);
        
        // Distribute connection points to avoid overlap
        distributeConnectionPoints();
    }
    
    saveWorkspace();
    renderTables();  // Re-render tables to show new FK columns
    renderRelationships();
    renderMinimap();
    closeRelationshipPanel();
};

// Update openRelationshipModal to use panel
window.openRelationshipModal = openRelationshipPanel;

// Edit relationship (updated for panel)
const editRelationshipPanel = (relId) => {
    const rel = relationships.find(r => r.id === relId);
    if (!rel) return;
    
    const fromTable = tables.find(t => t.id === rel.fromTableId);
    const toTable = tables.find(t => t.id === rel.toTableId);
    
    currentRelationshipSourceTable = rel.fromTableId;
    currentEditingRelationshipId = relId;
    
    // Update panel title and content
    document.getElementById('panelTitle').textContent = 'Edit Relationship';
    document.getElementById('panelSubmitText').textContent = 'Update';
    document.getElementById('panelFromTableName').textContent = fromTable.name;
    
    // Populate and select target table
    const toTableSelect = document.getElementById('panelToTableSelect');
    toTableSelect.innerHTML = '<option value="">Select a table...</option>';
    
    tables.forEach(table => {
        if (table.id !== rel.fromTableId) {
            const option = document.createElement('option');
            option.value = table.id;
            option.textContent = table.name;
            if (table.id === rel.toTableId) {
                option.selected = true;
            }
            toTableSelect.appendChild(option);
        }
    });
    
    // Set relationship type
    const typeCard = document.querySelector(`.rel-type-card[onclick*="${rel.type}"]`);
    if (typeCard) {
        selectRelType(typeCard, rel.type);
    }
    
    // Set color with custom color picker
    const colorPreview = document.getElementById('colorPreview');
    const colorText = document.getElementById('colorDisplay');
    const colorPicker = document.getElementById('panelRelationshipColor');
    
    if (colorPreview) colorPreview.style.background = rel.color;
    if (colorText) colorText.textContent = rel.color.toUpperCase();
    if (colorPicker) colorPicker.value = rel.color;
    
    // Reset panel position and show with animation
    const panel = document.getElementById('relationshipPanel');
    panel.style.left = '50%';
    panel.style.top = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.classList.add('active');
};

// Make functions globally accessible for inline onclick handlers
window.createRelationshipFromModal = handleRelationshipSubmit;
window.openRelationshipModal = openRelationshipPanel;
window.closeRelationshipModal = closeRelationshipPanel;
window.closeRelationshipPanel = closeRelationshipPanel;
window.selectRelType = selectRelType;
window.updateColorDisplay = updateColorDisplay;
window.handleRelationshipSubmit = handleRelationshipSubmit;
window.editRelationship = editRelationshipPanel;
window.updateRelationship = handleRelationshipSubmit;
// Toggle relationship view
const toggleRelationshipView = (tableId) => {
    const tableBody = document.getElementById(`table-body-${tableId}`);
    const relView = document.getElementById(`rel-view-${tableId}`);
    
    // Toggle views
    if (relView.classList.contains('active')) {
        // Show columns
        tableBody.classList.remove('hide-columns');
        relView.classList.remove('active');
    } else {
        // Show relationships
        tableBody.classList.add('hide-columns');
        relView.classList.add('active');
        renderTableRelationships(tableId);
    }
    
    // Re-render relationship lines after toggle since table dimensions changed
    setTimeout(() => renderRelationships(), 0);
};

// Render relationships for a specific table
const renderTableRelationships = (tableId) => {
    const relListContainer = document.getElementById(`rel-list-${tableId}`);
    const tableRels = relationships.filter(r => r.fromTableId === tableId || r.toTableId === tableId);
    
    if (tableRels.length === 0) {
        relListContainer.innerHTML = '<div class="no-relationships">No relationships yet</div>';
        return;
    }
    
    const relItemsHTML = tableRels.map(rel => {
        const isFrom = rel.fromTableId === tableId;
        const otherTableId = isFrom ? rel.toTableId : rel.fromTableId;
        const otherTable = tables.find(t => t.id === otherTableId);
        const columnName = isFrom ? 'FK to ' + otherTable.name : 'Referenced by ' + otherTable.name;
        
        return `<div class="relationship-item">
            <div class="rel-column">
                <span class="fk-badge">FK</span>
                ${columnName}
            </div>
            <div class="rel-table">${otherTable.name}</div>
            <div>
                <button type="button" class="rel-color-picker-btn" 
                        id="relColorPicker-${rel.id}"
                        onclick="openRelColorPicker(event, '${rel.id}')"
                        style="background: ${rel.color};"
                        title="Change relationship color">
                </button>
            </div>
            <div class="rel-controls">
                <button class="rel-control-btn" onclick="editRelationshipInline('${rel.id}')" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button class="rel-control-btn delete" onclick="deleteRelationshipInline('${rel.id}', '${tableId}')" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>`;
    }).join('');
    
    relListContainer.innerHTML = relItemsHTML;
};

// Add new relationship
const addNewRelationship = (tableId) => {
   
    openRelationshipPanel(tableId);
};

// Update relationship color
const updateRelationshipColor = (relId, color) => {
    const rel = relationships.find(r => r.id === relId);
    if (rel) {
        rel.color = color;
        saveWorkspace();
        renderRelationships();
        renderMinimap();
    }
};

// Edit relationship inline
const editRelationshipInline = (relId) => {
    editRelationshipPanel(relId);
};

// Delete relationship inline
const deleteRelationshipInline = (relId, tableId) => {
    ModalUtility.confirm(
        'Delete Relationship',
        'Are you sure you want to delete this relationship?',
        () => {
            const rel = relationships.find(r => r.id === relId);
            if (rel && rel.fkColumnName && rel.targetTableId) {
                // Remove the foreign key column from target table
                const targetTable = tables.find(t => t.id === rel.targetTableId);
                if (targetTable) {
                    targetTable.columns = targetTable.columns.filter(col => 
                        !(col.name === rel.fkColumnName && col.isForeignKey && col.referencedTableId === rel.referencedTableId)
                    );
                }
            }
            
            relationships = relationships.filter(r => r.id !== relId);
            saveWorkspace();
            renderTables();
            renderRelationships();
            renderTableRelationships(tableId);
        }
    );
};

// Make new functions globally accessible
window.toggleRelationshipView = toggleRelationshipView;
window.renderTableRelationships = renderTableRelationships;
window.addNewRelationship = addNewRelationship;
window.updateRelationshipColor = updateRelationshipColor;
window.editRelationshipInline = editRelationshipInline;
window.deleteRelationshipInline = deleteRelationshipInline;
