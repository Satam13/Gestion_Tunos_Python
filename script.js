// Variables globales
let currentDate = new Date();
let events = [];
let savedConfigs = [];
let operators = [];
let holidays = []; // Array to store holiday dates as 'YYYY-MM-DD' strings
let activeConfig = null;
let editingConfigId = null;
let selectedCells = [];
let draggingEvent = null;
let colorPickr;
let clipboard = {
    events: [],
    width: 0,
    height: 0
};
let currentOperatorId = null; // For editing operator
let contextCell = null; // Celda para el menú contextual

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos guardados
    loadDataFromStorage();
    
    // Generar calendario inicial
    generateCalendar();
    initColorPicker();

    // Init context menu
    initContextMenu();
    initDayContextMenu();
    initCollapsiblePanels();
    
    // Event listeners
    document.getElementById('saveConfigBtn').addEventListener('click', saveConfig);
    document.getElementById('updateConfigBtn').addEventListener('click', updateConfig);
    document.getElementById('addOperatorBtn').addEventListener('click', showAddOperatorModal);
    document.getElementById('saveOperatorBtn').addEventListener('click', saveOperator);
    
    // Navegación por meses
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    
    // Permitir añadir operario con Enter
    document.getElementById('newOperator').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            showAddOperatorModal();
        }
    });
    
    // Modal close button
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    document.getElementById('closeEmailModal').addEventListener('click', closeEmailModal);
    
    // Selection actions
    document.getElementById('copySelection').addEventListener('click', copySelectedCells);
    document.getElementById('deleteSelection').addEventListener('click', deleteSelectedCells);
    document.getElementById('moveSelection').addEventListener('click', moveSelectedCells);
    
    // Export actions
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    document.getElementById('emailScheduleBtn').addEventListener('click', sendEmailSchedule);
    document.getElementById('clearMonthBtn').addEventListener('click', clearCurrentMonth);
    
    // Click outside modal to close
    window.addEventListener('click', function(e) {
        const operatorModal = document.getElementById('operatorModal');
        const emailModal = document.getElementById('emailModal');
        if (e.target === operatorModal) {
            closeModal();
        }
        if (e.target === emailModal) {
            closeEmailModal();
        }
    });

    // Email confirm button
    document.getElementById('sendEmailConfirmBtn').addEventListener('click', handleSendEmail);

    // UI listeners
    document.getElementById('toggleSidebarBtn').addEventListener('click', toggleSidebar);

    // Draft management listeners
    document.getElementById('manageDraftsBtn').addEventListener('click', openDraftsModal);
    document.getElementById('closeDraftsModal').addEventListener('click', closeDraftsModal);
    document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);

    // Statistics listeners
    document.getElementById('showStatsBtn').addEventListener('click', showStatsModal);
    document.getElementById('closeStatsModal').addEventListener('click', hideStatsModal);

    // Global click listener to close any open context menu
    window.addEventListener('click', (e) => {
        const dayMenu = document.getElementById('dayContextMenu');
        const cellMenu = document.getElementById('customContextMenu');

        // Hide day menu if it's visible and the click is outside
        if (dayMenu.style.display === 'block' && !dayMenu.contains(e.target)) {
            hideDayContextMenu();
        }

        // Hide cell menu if it's visible and the click is outside
        if (cellMenu.style.display === 'block' && !cellMenu.contains(e.target)) {
            hideContextMenu();
        }
    });
    
    // Add default configurations if none exist
    if (savedConfigs.length === 0) {
        savedConfigs = [
            {id: '1', title: 'Mañana', startTime: '06:00', endTime: '14:00', color: '#4ECDC4'},
            {id: '2', title: 'Tarde', startTime: '14:00', endTime: '22:00', color: '#FF6B6B'},
            {id: '3', title: 'Noche', startTime: '22:00', endTime: '06:00', color: '#9B5DE5'}
        ];
        saveDataToStorage();
    }
    
    renderSavedConfigs();
    
    // Establecer primera configuración como activa si hay alguna
    if (savedConfigs.length > 0) {
        setActiveConfig(savedConfigs[0].id);
    }
});


// Inicializar el selector de color
function initColorPicker() {
    colorPickr = Pickr.create({
        el: '#shiftColorPicker',
        theme: 'classic',
        default: '#4ECDC4',
        swatches: [
            '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0',
            '#118AB2', '#9B5DE5', '#FF9E6D', '#A78BFA'
        ],
        components: {
            preview: true,
            opacity: true,
            hue: true,
            interaction: {
                hex: true,
                rgba: true,
                input: true,
                save: true
            }
        }
    });
    
    colorPickr.on('save', (color) => {
        const selectedColor = color.toHEXA().toString();
        document.getElementById('colorPreview').style.backgroundColor = selectedColor;
        colorPickr.hide();
    });
    
    colorPickr.on('change', (color) => {
        document.getElementById('colorPreview').style.backgroundColor = color.toHEXA().toString();
    });
    
    // Set initial color
    document.getElementById('colorPreview').style.backgroundColor = '#4ECDC4';
}

// Persistencia de datos
function saveDataToStorage() {
    const data = {
        events,
        savedConfigs,
        operators,
        holidays
    };
    localStorage.setItem('calendarData', JSON.stringify(data));
}

function loadDataFromStorage() {
    const storedData = localStorage.getItem('calendarData');
    if (storedData) {
        const data = JSON.parse(storedData);
        events = data.events || [];
        savedConfigs = data.savedConfigs || [];
        operators = data.operators || [];
        holidays = data.holidays || [];
    }
}

// Generar calendario con operarios y días
function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Actualizar el título del mes
    document.getElementById('currentMonth').textContent =
        currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    // Obtener último día del mes
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Set CSS variable for grid columns based on days in month
    document.documentElement.style.setProperty('--days-in-month', daysInMonth);
    
    // Crear la estructura de la cuadrícula
    
    // Celda vacía (esquina superior izquierda)
    const cornerCell = document.createElement('div');
    cornerCell.className = 'operator-header';
    calendarGrid.appendChild(cornerCell);
    
    // Encabezados de los días
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'short' });
        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
        const isToday = new Date().toDateString() === dayDate.toDateString();
        const isHoliday = holidays.includes(formatDate(dayDate));
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        if (isToday) dayHeader.classList.add('today');
        if (isWeekend) dayHeader.classList.add('weekend');
        if (isHoliday) dayHeader.classList.add('holiday');
        dayHeader.innerHTML = `${day}<br><small>${dayName}</small>`;
        dayHeader.dataset.day = day;
        dayHeader.addEventListener('contextmenu', showDayContextMenu);
        calendarGrid.appendChild(dayHeader);
    }
    
    // Header for hours column
    const hoursHeader = document.createElement('div');
    hoursHeader.className = 'hours-header';
    hoursHeader.innerHTML = 'Horas<br><small>Totales</small>';
    calendarGrid.appendChild(hoursHeader);
    
    // Filas para cada operario
    operators.forEach((operator, rowIndex) => {
        // Encabezado del operario
        const operatorHeader = document.createElement('div');
        operatorHeader.className = 'operator-header';
        operatorHeader.textContent = operator.name;
        operatorHeader.dataset.operatorId = operator.id;
        calendarGrid.appendChild(operatorHeader);
        
        // Celdas para cada día para este operario
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(year, month, day);
            const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
            const isToday = new Date().toDateString() === dayDate.toDateString();
            const isHoliday = holidays.includes(formatDate(dayDate));
            
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            if (isToday) cell.classList.add('today');
            if (isWeekend) cell.classList.add('weekend');
            if (isHoliday) cell.classList.add('holiday');
            cell.dataset.day = day;
            cell.dataset.operatorId = operator.id;
            cell.dataset.row = rowIndex;
            cell.dataset.col = day - 1;
            cell.dataset.cellId = `cell-${operator.id}-${day}`;
            
            // Contenedor para eventos
            const eventContainer = document.createElement('div');
            eventContainer.className = 'event-container';
            eventContainer.id = `cell-${operator.id}-${day}`;
            cell.appendChild(eventContainer);
            
            // Event listeners for cells
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('contextmenu', showContextMenu);
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('dragleave', handleDragLeave);
            cell.addEventListener('drop', handleDrop);
            
            // Mouse events for multi-select are now handled by the grid container
            
            calendarGrid.appendChild(cell);
        }
        
        // Hours cell for this operator
        const hoursCell = document.createElement('div');
        hoursCell.className = 'hours-cell';
        hoursCell.dataset.operatorId = operator.id;
        hoursCell.id = `hours-${operator.id}`;
        calendarGrid.appendChild(hoursCell);
    });
    
    // Render events and update hours
    renderEvents();
    updateOperatorHours();
    renderOperatorsList();
    
    // Reset selection
    selectedCells = [];
    updateSelectionButtons();

    // Add grid-level listeners for rectangular selection
    calendarGrid.addEventListener('mousedown', startRectangularSelection);
}


// Handle cell click (single click)
function handleCellClick(e) {
    // If shift is pressed, let the rectangular selection handle it.
    if (e.shiftKey) return;

    if (e.ctrlKey || e.metaKey) {
        // Toggle cell selection with Ctrl/Cmd key
        toggleCellSelection(this);
    } else if (activeConfig) {
        // Clear previous selections if not using modifier keys
        clearCellSelection();

        // Add event with active config
        const day = this.dataset.day;
        const operatorId = this.dataset.operatorId;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Create shift with active config
        const shift = {
            id: Date.now().toString(),
            title: activeConfig.title,
            day: parseInt(day),
            operatorId: operatorId,
            startTime: activeConfig.startTime,
            endTime: activeConfig.endTime,
            color: activeConfig.color,
            month: month,
            year: year
        };
        
        // Add shift and render
        events.push(shift);
        saveDataToStorage();
        renderEvents();
        updateOperatorHours();
        
        // Show notification
        showNotification(`Turno asignado a ${getOperatorName(operatorId)} el día ${day}`, "success");
    } else {
        // If no active config, show message
        showNotification("Selecciona una configuración guardada primero", "warning");
    }
}

// Selection functionality
let isSelecting = false;
let selectionStartCell = null;

function startRectangularSelection(e) {
    if (!e.shiftKey) return;
    
    const cell = e.target.closest('.calendar-cell');
    if (!cell) return;

    e.preventDefault();
    isSelecting = true;
    selectionStartCell = cell;

    document.addEventListener('mousemove', handleRectangularSelection);
    document.addEventListener('mouseup', stopRectangularSelection, { once: true });

    updateRectangleSelection(cell);
}

function handleRectangularSelection(e) {
    if (!isSelecting) return;
    
    const cell = e.target.closest('.calendar-cell');
    if (!cell) return;

    updateRectangleSelection(cell);
}

function stopRectangularSelection() {
    isSelecting = false;
    document.removeEventListener('mousemove', handleRectangularSelection);
    
    // Finalize selected cells array
    selectedCells = Array.from(document.querySelectorAll('.calendar-cell.selected'));
    updateSelectionButtons();
}

function updateRectangleSelection(endCell) {
    // Clear previous selection
    document.querySelectorAll('.calendar-cell.selected').forEach(c => c.classList.remove('selected'));

    const startRow = parseInt(selectionStartCell.dataset.row);
    const startCol = parseInt(selectionStartCell.dataset.col);
    const endRow = parseInt(endCell.dataset.row);
    const endCol = parseInt(endCell.dataset.col);

    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    const allCells = document.querySelectorAll('.calendar-cell');
    allCells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        if (row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
            cell.classList.add('selected');
        }
    });
}

// --- COLLAPSIBLE PANEL FUNCTIONS ---

function initCollapsiblePanels() {
    const triggers = document.querySelectorAll('.collapsible-trigger');
    const panelStates = JSON.parse(localStorage.getItem('collapsiblePanelStates')) || {};

    triggers.forEach((trigger, index) => {
        const content = trigger.nextElementSibling;
        const panelId = `panel-${index}`;

        // Set initial state from localStorage
        if (panelStates[panelId] === 'open') {
            trigger.classList.add('active');
            content.style.maxHeight = content.scrollHeight + 'px';
        } else {
            // Default to closed
            content.style.maxHeight = '0px';
        }

        trigger.addEventListener('click', function() {
            this.classList.toggle('active');
            const isActive = this.classList.contains('active');

            if (isActive) {
                content.style.maxHeight = content.scrollHeight + 'px';
                panelStates[panelId] = 'open';
            } else {
                content.style.maxHeight = '0px';
                panelStates[panelId] = 'closed';
            }

            // Save state to localStorage
            localStorage.setItem('collapsiblePanelStates', JSON.stringify(panelStates));
        });
    });
}


// --- STATISTICS FUNCTIONS ---

function hideStatsModal() {
    document.getElementById('statsModal').style.display = 'none';
}

function showStatsModal() {
    const statsContent = document.getElementById('statsContent');
    statsContent.innerHTML = ''; // Clear previous stats

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthEvents = events.filter(e => e.month === month && e.year === year);

    if (operators.length === 0) {
        statsContent.innerHTML = '<p>No hay operarios para mostrar estadísticas.</p>';
        document.getElementById('statsModal').style.display = 'block';
        return;
    }

    // --- Operator Stats ---
    let operatorStatsHtml = '<h4>Estadísticas por Operario</h4><table class="stats-table"><thead><tr><th>Operario</th><th>Horas Totales</th><th>Días Fin de Semana</th><th>Días Festivos</th></tr></thead><tbody>';
    operators.forEach(op => {
        const opEvents = monthEvents.filter(e => e.operatorId === op.id);
        const totalHours = calculateOperatorHours(op.id);

        // Create a set of all days the operator is considered to have worked
        const workedDays = new Set();
        opEvents.forEach(event => {
            workedDays.add(event.day);
            // If it's an overnight shift, add the next day as well
            if (event.endTime < event.startTime) {
                // Make sure the next day is still within the current month
                if (event.day + 1 <= daysInMonth) {
                    workedDays.add(event.day + 1);
                }
            }
        });

        let weekendsWorked = 0;
        let holidaysWorked = 0;

        // Now, iterate through the set of worked days to count weekends and holidays
        workedDays.forEach(day => {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            // Count if it's a Saturday (6) or Sunday (0)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                weekendsWorked++;
            }
            // Count if the day is in the holidays list
            if (holidays.includes(formatDate(date))) {
                holidaysWorked++;
            }
        });

        operatorStatsHtml += `
            <tr>
                <td>${op.name}</td>
                <td>${totalHours.toFixed(1)}</td>
                <td>${weekendsWorked}</td>
                <td>${holidaysWorked}</td>
            </tr>
        `;
    });
    operatorStatsHtml += '</tbody></table>';

    // --- Shift Stats ---
    let shiftStatsHtml = '<h4 style="margin-top: 20px;">Estadísticas por Turno</h4><table class="stats-table"><thead><tr><th>Tipo de Turno</th><th>Cantidad Total</th></tr></thead><tbody>';
    const shiftCounts = {};
    monthEvents.forEach(event => {
        shiftCounts[event.title] = (shiftCounts[event.title] || 0) + 1;
    });

    for (const shiftTitle in shiftCounts) {
        shiftStatsHtml += `
            <tr>
                <td>${shiftTitle}</td>
                <td>${shiftCounts[shiftTitle]}</td>
            </tr>
        `;
    }
    shiftStatsHtml += '</tbody></table>';

    // --- General Stats ---
    const totalMonthHours = operators.reduce((acc, op) => acc + calculateOperatorHours(op.id), 0);
    let generalStatsHtml = `
        <h4 style="margin-top: 20px;">Estadísticas Generales</h4>
        <p><strong>Horas totales en el mes:</strong> ${totalMonthHours.toFixed(1)}</p>
        <p><strong>Total de turnos asignados:</strong> ${monthEvents.length}</p>
        <p><strong>Días festivos en el mes:</strong> ${holidays.filter(h => new Date(h).getMonth() === month).length}</p>
    `;

    statsContent.innerHTML = operatorStatsHtml + shiftStatsHtml + generalStatsHtml;
    document.getElementById('statsModal').style.display = 'block';
}

function toggleCellSelection(cell) {
    const index = selectedCells.indexOf(cell);
    if (index === -1) {
        // Add to selection
        selectedCells.push(cell);
        cell.classList.add('selected');
    } else {
        // Remove from selection
        selectedCells.splice(index, 1);
        cell.classList.remove('selected');
    }
    updateSelectionButtons();
}

function updateSelectionButtons() {
    const copyBtn = document.getElementById('copySelection');
    const moveBtn = document.getElementById('moveSelection');
    const deleteBtn = document.getElementById('deleteSelection');
    
    copyBtn.disabled = selectedCells.length === 0;
    moveBtn.disabled = selectedCells.length === 0;
    deleteBtn.disabled = selectedCells.length === 0;
}

function copySelectedCells() {
    if (selectedCells.length === 0) return;
    
    tempCopyEvents = [];
    
    // Get all events in selected cells
    selectedCells.forEach(cell => {
        const cellId = cell.dataset.cellId;
        const day = parseInt(cell.dataset.day);
        const operatorId = cell.dataset.operatorId;
        
        const cellEvents = events.filter(event => 
            event.day === day && event.operatorId === operatorId
        );
        
        tempCopyEvents.push(...cellEvents);
    });
    
    if (tempCopyEvents.length > 0) {
        showNotification(`${tempCopyEvents.length} turnos copiados. Haga clic en una celda para pegar.`, "success");
        
        // Change cursor to indicate copy mode
        document.body.style.cursor = 'copy';
        
        // Add one-time click listener to paste
        document.addEventListener('click', pasteEvents, { once: true });
    } else {
        showNotification("No hay turnos para copiar en las celdas seleccionadas", "warning");
    }
    
    // Clear selection
    clearCellSelection();
}


function pasteEvents(e) {
    // Reset cursor
    document.body.style.cursor = '';
    
    // Check if click target is a calendar cell or within grid
    const calendarGrid = document.getElementById('calendarGrid');
    const cell = e.target.closest('.calendar-cell');
    
    // Check if the click is inside the calendar grid even if not directly on a cell
    if (!cell && !calendarGrid.contains(e.target)) {
        showNotification("Clic fuera de la cuadrícula. Operación cancelada.", "warning");
        return;
    }
    
    // If clicked on calendar but not on a cell, try to find the closest cell
    const targetCell = cell || document.elementFromPoint(e.clientX, e.clientY).closest('.calendar-cell');
    if (!targetCell) {
        showNotification("No se pudo determinar la celda destino. Operación cancelada.", "warning");
        return;
    }
    
    const targetDay = parseInt(targetCell.dataset.day);
    const targetOperatorId = targetCell.dataset.operatorId;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // For each copied event, create a new one at target position
    let addedEvents = 0;
    tempCopyEvents.forEach(originalEvent => {
        const newEvent = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            title: originalEvent.title,
            day: targetDay,
            operatorId: targetOperatorId,
            startTime: originalEvent.startTime,
            endTime: originalEvent.endTime,
            color: originalEvent.color,
            month: month,
            year: year
        };
        
        events.push(newEvent);
        addedEvents++;
    });
    
    if (addedEvents > 0) {
        saveDataToStorage();
        renderEvents();
        showNotification(`${addedEvents} turnos pegados correctamente`, "success");
    }
    
    // Clear the copied events
    tempCopyEvents = [];
}

function clearCellSelection() {
    selectedCells.forEach(cell => cell.classList.remove('selected'));
    selectedCells = [];
    updateSelectionButtons();
}

function moveSelectedCells() {
    if (selectedCells.length === 0) return;
    
    tempCopyEvents = [];
    
    // Get all events in selected cells
    selectedCells.forEach(cell => {
        const cellId = cell.dataset.cellId;
        const day = parseInt(cell.dataset.day);
        const operatorId = cell.dataset.operatorId;
        
        const cellEvents = events.filter(event => 
            event.day === day && event.operatorId === operatorId
        );
        
        tempCopyEvents.push(...cellEvents.map(e => ({ ...e, originalId: e.id })));
    });
    
    if (tempCopyEvents.length > 0) {
        showNotification(`${tempCopyEvents.length} turnos listos para mover. Haga clic en una celda destino.`, "success");
        
        // Change cursor to indicate move mode
        document.body.style.cursor = 'move';
        
        // Add one-time click listener to paste and delete originals
        document.addEventListener('click', moveEvents, { once: true });
    } else {
        showNotification("No hay turnos para mover en las celdas seleccionadas", "warning");
    }
    
    // Clear selection
    clearCellSelection();
}

function moveEvents(e) {
    // Reset cursor
    document.body.style.cursor = '';
    
    // Check if click target is a calendar cell or within grid
    const calendarGrid = document.getElementById('calendarGrid');
    const cell = e.target.closest('.calendar-cell');
    
    // Check if the click is inside the calendar grid even if not directly on a cell
    if (!cell && !calendarGrid.contains(e.target)) {
        showNotification("Clic fuera de la cuadrícula. Operación cancelada.", "warning");
        return;
    }
    
    // If clicked on calendar but not on a cell, try to find the closest cell
    const targetCell = cell || document.elementFromPoint(e.clientX, e.clientY).closest('.calendar-cell');
    if (!targetCell) {
        showNotification("No se pudo determinar la celda destino. Operación cancelada.", "warning");
        return;
    }
    
    const targetDay = parseInt(targetCell.dataset.day);
    const targetOperatorId = targetCell.dataset.operatorId;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First, remove original events
    const originalIds = tempCopyEvents.map(e => e.originalId);
    events = events.filter(event => !originalIds.includes(event.id));
    
    // Then, add events to new position
    let addedEvents = 0;
    tempCopyEvents.forEach(originalEvent => {
        const newEvent = {
            id: originalEvent.originalId, // Keep same ID for tracking
            title: originalEvent.title,
            day: targetDay,
            operatorId: targetOperatorId,
            startTime: originalEvent.startTime,
            endTime: originalEvent.endTime,
            color: originalEvent.color,
            month: month,
            year: year
        };
        
        events.push(newEvent);
        addedEvents++;
    });
    
    if (addedEvents > 0) {
        saveDataToStorage();
        renderEvents();
        showNotification(`${addedEvents} turnos movidos correctamente`, "success");
    }
    
    // Clear the copied events
    tempCopyEvents = [];
}

function deleteSelectedCells() {
    if (selectedCells.length === 0) return;
    
    if (!confirm(`¿Eliminar todos los turnos de las ${selectedCells.length} celdas seleccionadas?`)) {
        return;
    }
    
    let deletedCount = 0;
    
    // Delete events in all selected cells
    selectedCells.forEach(cell => {
        const day = parseInt(cell.dataset.day);
        const operatorId = cell.dataset.operatorId;
        
        const initialCount = events.length;
        events = events.filter(event => !(event.day === day && event.operatorId === operatorId));
        deletedCount += initialCount - events.length;
    });
    
    saveDataToStorage();
    renderEvents();
    showNotification(`${deletedCount} turnos eliminados`, "success");
    
    // Clear selection
    clearCellSelection();
}

// Drag and drop functionality
function setupDragAndDrop() {
    document.querySelectorAll('.event').forEach(event => {
        event.setAttribute('draggable', true);
        event.addEventListener('dragstart', handleDragStart);
        event.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    draggingEvent = events.find(event => event.id === this.dataset.id);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
    
    // Clear any existing selection
    clearCellSelection();
}

function handleDragOver(e) {
    if (draggingEvent) {
        e.preventDefault();
        this.classList.add('drag-over');
    }
}

function handleDragLeave() {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    if (!draggingEvent) return;

    const targetCell = this;
    const targetDay = parseInt(targetCell.dataset.day);
    const targetOperatorId = targetCell.dataset.operatorId;

    const draggedEvent = draggingEvent; // draggingEvent is global
    const sourceDay = draggedEvent.day;
    const sourceOperatorId = draggedEvent.operatorId;

    // Find events in the target cell
    const targetEvents = events.filter(event => 
        event.day === targetDay && event.operatorId === targetOperatorId
    );

    // Case 1: Target cell is empty -> Just move the event
    if (targetEvents.length === 0) {
        draggedEvent.day = targetDay;
        draggedEvent.operatorId = targetOperatorId;
        showNotification("Turno movido correctamente.", "success");
    } 
    // Case 2: Target cell is occupied -> Swap the events
    else {
        // Move the dragged event to the target cell
        draggedEvent.day = targetDay;
        draggedEvent.operatorId = targetOperatorId;

        // Move the events from the target cell to the source cell
        targetEvents.forEach(event => {
            event.day = sourceDay;
            event.operatorId = sourceOperatorId;
        });
        showNotification("Turnos intercambiados.", "success");
    }
    
    // Save, re-render, and finish
    saveDataToStorage();
    renderEvents();
    draggingEvent = null; // Clear the dragging event
}

function handleDragEnd() {
    this.classList.remove('dragging');
    draggingEvent = null;
    document.querySelectorAll('.drag-over').forEach(cell => cell.classList.remove('drag-over'));
}

// Obtener nombre de operario por ID
function getOperatorName(operatorId) {
    const operator = operators.find(op => op.id === operatorId);
    return operator ? operator.name : 'Operario desconocido';
}


// Renderizar lista de operarios
function renderOperatorsList() {
    const operatorsList = document.getElementById('operatorsList');
    operatorsList.innerHTML = '';
    
    if (operators.length === 0) {
        operatorsList.innerHTML = '<p style="text-align: center; padding: 10px;">No hay operarios registrados</p>';
        return;
    }
    
    operators.forEach(operator => {
        const operatorItem = document.createElement('div');
        operatorItem.className = 'operator-item';
        operatorItem.innerHTML = `
            <div>${operator.name}</div>
            <div class="operator-actions">
                <button class="config-btn edit-btn" data-id="${operator.id}">Editar</button>
                <button class="config-btn delete-config-btn" data-id="${operator.id}">Eliminar</button>
            </div>
        `;
        
        // Event for edit operator
        operatorItem.querySelector('.edit-btn').addEventListener('click', function() {
            editOperator(operator.id);
        });
        
        // Event for delete operator
        operatorItem.querySelector('.delete-config-btn').addEventListener('click', function() {
            deleteOperator(operator.id);
        });
        
        operatorsList.appendChild(operatorItem);
    });
}

// Show add operator modal
function showAddOperatorModal() {
    const nameInput = document.getElementById('newOperator');
    const name = nameInput.value.trim();
    
    // Reset form
    document.getElementById('operatorName').value = name || '';
    document.getElementById('operatorLastName').value = '';
    document.getElementById('operatorEmail').value = '';
    document.getElementById('operatorPhone').value = '';
    
    // Set modal title
    document.getElementById('modalTitle').textContent = 'Añadir Operario';
    currentOperatorId = null;
    
    // Display modal
    document.getElementById('operatorModal').style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('operatorModal').style.display = 'none';
}

// Save operator
function saveOperator() {
    const name = document.getElementById('operatorName').value.trim();
    const lastName = document.getElementById('operatorLastName').value.trim();
    const email = document.getElementById('operatorEmail').value.trim();
    const phone = document.getElementById('operatorPhone').value.trim();
    
    if (!name) {
        showNotification("Por favor introduce un nombre para el operario", "error");
        return;
    }
    
    // Validate email format if provided
    if (email && !validateEmail(email)) {
        showNotification("Por favor introduce un email válido", "error");
        return;
    }
    
    if (currentOperatorId) {
        // Update existing operator
        const index = operators.findIndex(op => op.id === currentOperatorId);
        if (index !== -1) {
            operators[index] = {
                ...operators[index],
                name,
                lastName,
                email,
                phone
            };
            showNotification(`Operario ${name} actualizado`, "success");
        }
    } else {
        // Create new operator
        const newOperator = {
            id: Date.now().toString(),
            name,
            lastName,
            email,
            phone
        };
        
        operators.push(newOperator);
        showNotification(`Operario ${name} añadido`, "success");
        document.getElementById('newOperator').value = '';
    }
    
    saveDataToStorage();
    closeModal();
    renderOperatorsList();
    generateCalendar();
}

// Email validation utility
function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// Edit operator
function editOperator(operatorId) {
    const operator = operators.find(op => op.id === operatorId);
    if (!operator) return;
    
    currentOperatorId = operatorId;
    
    document.getElementById('operatorName').value = operator.name || '';
    document.getElementById('operatorLastName').value = operator.lastName || '';
    document.getElementById('operatorEmail').value = operator.email || '';
    document.getElementById('operatorPhone').value = operator.phone || '';
    
    document.getElementById('modalTitle').textContent = 'Editar Operario';
    document.getElementById('operatorModal').style.display = 'block';
}

// Delete operator
function deleteOperator(operatorId) {
    if (!confirm("¿Eliminar este operario? También se eliminarán sus turnos asignados.")) return;
    
    // Remove operator
    operators = operators.filter(op => op.id !== operatorId);
    
    // Remove associated events
    events = events.filter(event => event.operatorId !== operatorId);
    
    saveDataToStorage();
    renderOperatorsList();
    generateCalendar();
    showNotification("Operario eliminado", "success");
}


// Renderizar eventos en el calendario
function renderEvents() {
    // Limpiar todos los contenedores de eventos
    document.querySelectorAll('.event-container').forEach(container => {
        container.innerHTML = '';
    });
    
    // Render current month's events
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Renderizar cada evento
    events.forEach(event => {
        // Check if the event belongs to the current month/year
        if (event.month === currentMonth && event.year === currentYear) {
            const cellId = `cell-${event.operatorId}-${event.day}`;
            const cellContainer = document.getElementById(cellId);
            
            if (cellContainer) {
                const eventElement = document.createElement('div');
                eventElement.className = 'event';
                eventElement.style.backgroundColor = event.color;
                eventElement.innerHTML = `
                    <div class="event-title">${event.title}</div>
                    <small>${event.startTime} - ${event.endTime}</small>
                `;
                eventElement.dataset.id = event.id;
                
                cellContainer.appendChild(eventElement);
            }
        }
    });
    
    // Setup drag and drop after rendering events
    setupDragAndDrop();
    
    // Update operator hours after rendering events
    updateOperatorHours();
    updateMultipleShiftsIndicator();
}

function updateMultipleShiftsIndicator() {
    const allCells = document.querySelectorAll('.calendar-cell');
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    allCells.forEach(cell => {
        const day = parseInt(cell.dataset.day);
        const operatorId = cell.dataset.operatorId;

        const eventsInCell = events.filter(event => 
            event.day === day && 
            event.operatorId === operatorId &&
            event.month === currentMonth &&
            event.year === currentYear
        );

        if (eventsInCell.length > 1) {
            cell.classList.add('multiple-shifts');
        } else {
            cell.classList.remove('multiple-shifts');
        }
    });
}

// Eliminar evento
function removeEvent(eventId) {
    events = events.filter(event => event.id !== eventId);
    saveDataToStorage();
    renderEvents();
}

// Cambiar de mes
function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    generateCalendar();
}

// Guardar configuración
function saveConfig() {
    const title = document.getElementById('shiftTitle').value.trim();
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const color = document.getElementById('colorPreview').style.backgroundColor;
    
    if (!title) {
        showNotification("Por favor introduce un nombre para el turno", "error");
        return;
    }
    
    // Remove time validation to allow overnight shifts
    
    // Get hex color from RGB
    const hexColor = rgbToHex(color);
    
    // Create config object
    const config = {
        id: Date.now().toString(),
        title,
        startTime,
        endTime,
        color: hexColor
    };
    
    // Add config
    savedConfigs.push(config);
    saveDataToStorage();
    renderSavedConfigs();
    
    // Set as active
    setActiveConfig(config.id);
    
    // Clear form
    document.getElementById('shiftTitle').value = '';
    document.getElementById('startTime').value = '06:00';
    document.getElementById('endTime').value = '18:00';
    
    // Show notification
    showNotification(`Configuración "${title}" guardada`, "success");
}

// Update configuration
function updateConfig() {
    if (!editingConfigId) return;
    
    const title = document.getElementById('shiftTitle').value.trim();
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const color = document.getElementById('colorPreview').style.backgroundColor;
    
    if (!title) {
        showNotification("Por favor introduce un nombre para el turno", "error");
        return;
    }
    
    // Remove time validation to allow overnight shifts
    
    // Get hex color
    const hexColor = rgbToHex(color);
    
    // Find and update configuration
    const configIndex = savedConfigs.findIndex(config => config.id === editingConfigId);
    if (configIndex !== -1) {
        savedConfigs[configIndex] = {
            ...savedConfigs[configIndex],
            title,
            startTime,
            endTime,
            color: hexColor
        };
        
        // Update active config if this was active
        if (activeConfig && activeConfig.id === editingConfigId) {
            activeConfig = savedConfigs[configIndex];
        }
        
        saveDataToStorage();
        renderSavedConfigs();
        
        // Show notification
        showNotification(`Configuración "${title}" actualizada`, "success");
        
        // Exit edit mode
        cancelEdit();
    }
}

// Render saved configurations
function renderSavedConfigs() {
    const configsList = document.getElementById('savedConfigs');
    configsList.innerHTML = '';
    
    savedConfigs.forEach(config => {
        const configElement = document.createElement('div');
        configElement.className = 'saved-config';
        if (activeConfig && activeConfig.id === config.id) {
            configElement.classList.add('active');
        }
        
        configElement.dataset.id = config.id;
        configElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 15px; height: 15px; background-color: ${config.color}; border-radius: 50%;"></div>
                <div>
                    <strong>${config.title}</strong> 
                    <small>${config.startTime} - ${config.endTime}</small>
                </div>
            </div>
            <div class="config-actions">
                <button class="config-btn edit-btn">Editar</button>
                <button class="config-btn delete-config-btn">Borrar</button>
            </div>
        `;
        
        // Click to set as active
        configElement.addEventListener('click', function(e) {
            if (!e.target.classList.contains('config-btn')) {
                setActiveConfig(config.id);
            }
        });
        
        // Edit button
        configElement.querySelector('.edit-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            editConfig(config.id);
        });
        
        // Delete button
        configElement.querySelector('.delete-config-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            deleteConfig(config.id);
        });
        
        configsList.appendChild(configElement);
    });
}

// Set active configuration
function setActiveConfig(configId) {
    const config = savedConfigs.find(c => c.id === configId);
    if (!config) return;
    
    activeConfig = config;
    
    // Update UI
    document.querySelectorAll('.saved-config').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.id === configId) {
            el.classList.add('active');
        }
    });
    
    showNotification(`Configuración "${config.title}" activada`, "success");
}

// Cancel config editing
function cancelEdit() {
    editingConfigId = null;
    document.getElementById('saveConfigBtn').style.display = 'block';
    document.getElementById('updateConfigBtn').style.display = 'none';
    
    // Clear form
    document.getElementById('shiftTitle').value = '';
    document.getElementById('startTime').value = '06:00';
    document.getElementById('endTime').value = '18:00';
    document.getElementById('colorPreview').style.backgroundColor = '#4ECDC4';
    colorPickr.setColor('#4ECDC4');
}

// RGB to Hex conversion
function rgbToHex(rgb) {
    // Check if already hex
    if (rgb.startsWith('#')) {
        return rgb;
    }
    
    const rgbMatch = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        return `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
    }
    
    return '#4ECDC4'; // Default color if conversion fails
}

// Function to clear all shifts in the current month
function clearCurrentMonth() {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long' });
    
    // Show confirmation dialog
    if (confirm(`¿Estás seguro de que quieres eliminar TODOS los turnos del mes ${monthName} ${currentYear}?`)) {
        // Filter out events from the current month and year
        const initialCount = events.length;
        events = events.filter(event => !(event.month === currentMonth && event.year === currentYear));
        const deletedCount = initialCount - events.length;
        
        // Save and render
        saveDataToStorage();
        renderEvents();
        showNotification(`Se han eliminado ${deletedCount} turnos de ${monthName} ${currentYear}`, "success");
    }
}

// Export to Excel
function exportToExcel() {
    if (operators.length === 0) {
        showNotification("No hay operarios para exportar", "warning");
        return;
    }
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    wb.Props = {
        Title: `Cuadrantes ${monthName} ${year}`,
        Subject: "Horarios",
        Author: "Sistema de Cuadrantes",
        CreatedDate: new Date()
    };
    
    // 1. GENERAL PLANNING SHEET (existing functionality)
    const generalData = [];
    
    // Header row with days
    const headerRow = ["Operario"];
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
        headerRow.push(`${day} ${dayName}`);
    }
    generalData.push(headerRow);
    
    // Data rows for each operator
    operators.forEach(operator => {
        const row = [operator.name];
        
        // For each day
        for (let day = 1; day <= daysInMonth; day++) {
            // Find events for this operator and day
            const dayEvents = events.filter(event => 
                event.operatorId === operator.id && event.day === day && 
                event.month === month && event.year === year
            );
            
            // Format cell data
            if (dayEvents.length > 0) {
                row.push(dayEvents.map(e => `${e.title} (${e.startTime}-${e.endTime})`).join('\n'));
            } else {
                row.push("");
            }
        }
        
        generalData.push(row);
    });
    
    // Create general worksheet
    const generalWs = XLSX.utils.aoa_to_sheet(generalData);
    XLSX.utils.book_append_sheet(wb, generalWs, `Resumen ${monthName}`);
    
    // 2. INDIVIDUAL OPERATOR SHEETS
    operators.forEach(operator => {
        const operatorData = [];
        
        // Header for individual operator sheet
        operatorData.push([`PLANNING INDIVIDUAL - ${operator.name.toUpperCase()}`]);
        operatorData.push([`Mes: ${monthName} ${year}`]);
        operatorData.push([]); // Empty row
        
        // Column headers
        operatorData.push(["Día", "Fecha", "Turno", "Horario", "Horas"]);
        
        let totalHours = 0;
        
        // For each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
            const dateString = `${day} ${dayName}`;
            
            // Find events for this operator and day
            const dayEvents = events.filter(event => 
                event.operatorId === operator.id && event.day === day &&
                event.month === month && event.year === year
            );
            
            if (dayEvents.length > 0) {
                dayEvents.forEach(event => {
                    // Calculate hours for this shift
                    const startHour = parseInt(event.startTime.split(':')[0]);
                    const startMinute = parseInt(event.startTime.split(':')[1]);
                    const endHour = parseInt(event.endTime.split(':')[0]);
                    const endMinute = parseInt(event.endTime.split(':')[1]);
                    
                    let shiftHours = (endHour + endMinute/60) - (startHour + startMinute/60);
                    if (shiftHours < 0) shiftHours += 24; // Handle overnight shifts
                    
                    totalHours += shiftHours;
                    
                    operatorData.push([
                        day,
                        dateString,
                        event.title,
                        `${event.startTime} - ${event.endTime}`,
                        shiftHours.toFixed(1)
                    ]);
                });
            } else {
                operatorData.push([day, dateString, "-", "-", "0"]);
            }
        }
        
        // Add total hours summary
        operatorData.push([]);
        operatorData.push(["", "", "", "TOTAL HORAS:", totalHours.toFixed(1)]);
        
        // Create individual operator worksheet
        const operatorWs = XLSX.utils.aoa_to_sheet(operatorData);
        
        // Clean operator name for sheet name (Excel sheet names have restrictions)
        const cleanOperatorName = operator.name.replace(/[\\\/\?\*\[\]]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(wb, operatorWs, cleanOperatorName);
    });
    
    // 3. SHIFT TYPE SHEETS
    // Get all unique shift configurations
    const uniqueShifts = [...new Set(events
        .filter(e => e.month === month && e.year === year)
        .map(e => e.title))];
    
    uniqueShifts.forEach(shiftTitle => {
        const shiftData = [];
        
        // Header for shift sheet
        shiftData.push([`TURNO: ${shiftTitle.toUpperCase()}`]);
        shiftData.push([`Mes: ${monthName} ${year}`]);
        shiftData.push([]); // Empty row
        
        // Column headers
        shiftData.push(["Día", "Fecha", "Operario", "Horario"]);
        
        // Get all events for this shift type
        const shiftEvents = events.filter(event => 
            event.title === shiftTitle && event.month === month && event.year === year
        ).sort((a, b) => {
            if (a.day !== b.day) return a.day - b.day;
            return operators.findIndex(op => op.id === a.operatorId) - 
                   operators.findIndex(op => op.id === b.operatorId);
        });
        
        shiftEvents.forEach(event => {
            const date = new Date(year, month, event.day);
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
            const dateString = `${event.day} ${dayName}`;
            const operatorName = operators.find(op => op.id === event.operatorId)?.name || 'N/A';
            
            shiftData.push([
                event.day,
                dateString,
                operatorName,
                `${event.startTime} - ${event.endTime}`
            ]);
        });
        
        // Add summary
        const uniqueOperators = [...new Set(shiftEvents.map(e => e.operatorId))];
        shiftData.push([]);
        shiftData.push(["Total días trabajados:", shiftEvents.length]);
        shiftData.push(["Operarios asignados:", uniqueOperators.length]);
        
        // Create shift worksheet
        const shiftWs = XLSX.utils.aoa_to_sheet(shiftData);
        
        // Clean shift name for sheet name
        const cleanShiftName = `Turno ${shiftTitle}`.replace(/[\\\/\?\*\[\]]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(wb, shiftWs, cleanShiftName);
    });
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `Cuadrantes_Completo_${monthName}_${year}.xlsx`);
    showNotification(`Exportado a Excel con ${wb.SheetNames.length} hojas: resumen general, ${operators.length} operarios individuales y ${uniqueShifts.length} tipos de turno`, "success");
}

// Utility function to show notifications
function showNotification(message, type = "info") {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Send email with schedule
function sendEmailSchedule() {
    const emailModal = document.getElementById('emailModal');
    const operatorSelect = document.getElementById('operatorSelect');
    
    // Filter operators who have an email
    const operatorsWithEmail = operators.filter(op => op.email && op.email.trim() !== '');
    
    if (operatorsWithEmail.length === 0) {
        showNotification("No hay operarios con emails registrados.", "warning");
        return;
    }
    
    // Populate dropdown
    operatorSelect.innerHTML = '';
    operatorsWithEmail.forEach(op => {
        const option = document.createElement('option');
        option.value = op.id;
        option.textContent = op.name;
        operatorSelect.appendChild(option);
    });
    
    emailModal.style.display = 'block';
}

function closeEmailModal() {
    const emailModal = document.getElementById('emailModal');
    emailModal.style.display = 'none';
}

function handleSendEmail() {
    const operatorSelect = document.getElementById('operatorSelect');
    const operatorId = operatorSelect.value;
    const operator = operators.find(op => op.id === operatorId);

    if (!operator || !operator.email) {
        showNotification("Operario no válido o sin email.", "error");
        return;
    }

    const monthName = document.getElementById('currentMonth').textContent;
    const subject = `Cuadrante de ${monthName}`;
    const body = generateHtmlScheduleForOperator(operatorId);

    const mailtoLink = `mailto:${operator.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Use window.open to be more robust
    const emailWindow = window.open(mailtoLink, '_blank');
    if (!emailWindow) {
        // If popup was blocked, fall back to changing location
        window.location.href = mailtoLink;
    }


    closeEmailModal();
    showNotification(`Preparando email para ${operator.name}...`, "success");
}

function generateHtmlScheduleForOperator(operatorId) {
    const operator = operators.find(op => op.id === operatorId);
    if (!operator) return "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let totalHours = 0;
    let schedule = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
        
        const dayEvents = events.filter(event => 
            event.operatorId === operator.id && event.day === day &&
            event.month === month && event.year === year
        );

        if (dayEvents.length > 0) {
            dayEvents.forEach(event => {
                const startHour = parseInt(event.startTime.split(':')[0]);
                const startMinute = parseInt(event.startTime.split(':')[1]);
                const endHour = parseInt(event.endTime.split(':')[0]);
                const endMinute = parseInt(event.endTime.split(':')[1]);
                
                let shiftHours = (endHour + endMinute/60) - (startHour + startMinute/60);
                if (shiftHours < 0) shiftHours += 24;
                totalHours += shiftHours;

                schedule.push({
                    day: `${day} (${dayName})`,
                    shift: event.title,
                    time: `${event.startTime} - ${event.endTime}`,
                    hours: shiftHours.toFixed(1)
                });
            });
        } else {
            schedule.push({ day: `${day} (${dayName})`, shift: "Libre", time: "-", hours: "0" });
        }
    }

    // Basic styling for the HTML email
    const styles = `
        <style>
            body { font-family: sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #dddddd; text-align: left; padding: 8px; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            h2, h3 { color: #333; }
        </style>
    `;

    const tableBody = schedule.map(row => `
        <tr>
            <td>${row.day}</td>
            <td>${row.shift}</td>
            <td>${row.time}</td>
            <td>${row.hours}</td>
        </tr>
    `).join('');

    const html = `
        <html>
            <head>${styles}</head>
            <body>
                <h2>Cuadrante Individual para ${operator.name}</h2>
                <h3>Mes: ${monthName}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Día</th>
                            <th>Turno</th>
                            <th>Horario</th>
                            <th>Horas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableBody}
                    </tbody>
                </table>
                <h3>Total de Horas: ${totalHours.toFixed(1)}</h3>
            </body>
        </html>
    `;

    return html;
}

// Calculate total hours for an operator in current month
function calculateOperatorHours(operatorId) {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    const operatorEvents = events.filter(event => 
        event.operatorId === operatorId && 
        event.month === currentMonth && 
        event.year === currentYear
    );
    
    let totalHours = 0;
    
    operatorEvents.forEach(event => {
        // Calculate hours for this shift
        const startHour = parseInt(event.startTime.split(':')[0]);
        const startMinute = parseInt(event.startTime.split(':')[1]);
        const endHour = parseInt(event.endTime.split(':')[0]);
        const endMinute = parseInt(event.endTime.split(':')[1]);
        
        let shiftHours = (endHour + endMinute/60) - (startHour + startMinute/60);
        if (shiftHours < 0) shiftHours += 24; // Handle overnight shifts
        
        totalHours += shiftHours;
    });
    
    return totalHours;
}

// Update operator hours display with color coding
function updateOperatorHours() {
    if (operators.length === 0) return;
    
    // Calculate hours for all operators
    const operatorHours = operators.map(operator => ({
        id: operator.id,
        name: operator.name,
        hours: calculateOperatorHours(operator.id)
    }));
    
    // Calculate statistics for color coding
    const allHours = operatorHours.map(op => op.hours);
    const totalHours = allHours.reduce((sum, hours) => sum + hours, 0);
    const averageHours = totalHours / operators.length;
    const maxHours = Math.max(...allHours);
    const minHours = Math.min(...allHours);
    
    // Define thresholds for color coding
    const highThreshold = averageHours + (maxHours - averageHours) * 0.5;
    const lowThreshold = averageHours - (averageHours - minHours) * 0.5;
    
    // Update each operator's hours display
    operatorHours.forEach(operator => {
        const hoursCell = document.getElementById(`hours-${operator.id}`);
        if (hoursCell) {
            // Clear previous color classes
            hoursCell.classList.remove('high-hours', 'low-hours', 'average-hours');
            
            // Set hours text
            hoursCell.innerHTML = `${operator.hours.toFixed(1)}<br><small>hrs</small>`;
            
            // Apply color coding
            if (operator.hours >= highThreshold && maxHours > 0) {
                hoursCell.classList.add('high-hours');
            } else if (operator.hours <= lowThreshold && operator.hours < averageHours) {
                hoursCell.classList.add('low-hours');
            } else {
                hoursCell.classList.add('average-hours');
            }
            
            // Add tooltip with details
            hoursCell.title = `${operator.name}: ${operator.hours.toFixed(1)} horas\nPromedio: ${averageHours.toFixed(1)} horas`;
        }
    });
}

// Initialize the app when the DOM is ready

// --- DRAFT MANAGEMENT FUNCTIONS ---

function openDraftsModal() {
    displayDrafts(); 
    document.getElementById('draftsModal').style.display = 'block';
}

function closeDraftsModal() {
    document.getElementById('draftsModal').style.display = 'none';
}

function saveDraft() {
    const draftNameInput = document.getElementById('draftName');
    const draftName = draftNameInput.value.trim();

    if (!draftName) {
        showNotification('Por favor, introduce un nombre para el borrador.', 'error');
        return;
    }

    if (localStorage.getItem(`draft_${draftName}`)) {
        if (!confirm(`Ya existe un borrador con el nombre '${draftName}'. ¿Deseas sobrescribirlo?`)) {
            return;
        }
    }

    const data = {
        events,
        savedConfigs,
        operators,
        currentDate: currentDate.toISOString()
    };

    const draftKey = `draft_${draftName}`;
    localStorage.setItem(draftKey, JSON.stringify(data));

    showNotification(`Borrador '${draftName}' guardado correctamente.`, 'success');
    draftNameInput.value = '';
    
    displayDrafts();
}

function displayDrafts() {
    const draftsList = document.getElementById('draftsList');
    draftsList.innerHTML = '';

    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('draft_')) {
            drafts.push(key.substring(6));
        }
    }

    if (drafts.length === 0) {
        draftsList.innerHTML = '<p style="color: #ccc; text-align: center;">No hay borradores guardados.</p>';
        return;
    }

    drafts.sort().forEach(draftName => {
        const draftItem = document.createElement('div');
        draftItem.className = 'draft-item';
        
        draftItem.innerHTML = `
            <span>${draftName}</span>
            <div class="draft-actions">
                <button class="config-btn load-draft-btn">Cargar</button>
                <button class="config-btn delete-config-btn delete-draft-btn">Eliminar</button>
            </div>
        `;

        draftItem.querySelector('.load-draft-btn').addEventListener('click', () => loadDraft(draftName));
        draftItem.querySelector('.delete-draft-btn').addEventListener('click', () => deleteDraft(draftName));

        draftsList.appendChild(draftItem);
    });
}

function loadDraft(draftName) {
    if (!confirm(`¿Cargar el borrador '${draftName}'? Se sobrescribirán todos los datos no guardados.`)) {
        return;
    }

    const draftKey = `draft_${draftName}`;
    const storedData = localStorage.getItem(draftKey);

    if (storedData) {
        try {
            const data = JSON.parse(storedData);

            if (data && Array.isArray(data.events) && Array.isArray(data.savedConfigs) && Array.isArray(data.operators)) {
                events = data.events;
                savedConfigs = data.savedConfigs;
                operators = data.operators;
                currentDate = data.currentDate ? new Date(data.currentDate) : new Date();

                saveDataToStorage();

                generateCalendar();
                renderSavedConfigs();
                
                if (savedConfigs.length > 0) {
                    setActiveConfig(savedConfigs[0].id);
                } else {
                    activeConfig = null;
                }
                
                closeDraftsModal();
                showNotification(`Borrador '${draftName}' cargado correctamente.`, 'success');
            } else {
                showNotification('El borrador está dañado o no tiene el formato correcto.', 'error');
            }
        } catch (error) {
            showNotification('Error al procesar el archivo del borrador.', 'error');
            console.error("Error parsing draft file:", error);
        }
    } else {
        showNotification(`No se encontró el borrador '${draftName}'.`, 'error');
    }
}

function deleteDraft(draftName) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el borrador '${draftName}'? Esta acción no se puede deshacer.`)) {
        return;
    }

    const draftKey = `draft_${draftName}`;
    localStorage.removeItem(draftKey);

    showNotification(`Borrador '${draftName}' eliminado.`, 'success');
    
    displayDrafts();
}

// --- UI FUNCTIONS ---
function toggleSidebar() {
    const mainContent = document.querySelector('.main-content');
    mainContent.classList.toggle('sidebar-hidden');
    
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    if (mainContent.classList.contains('sidebar-hidden')) {
        toggleBtn.title = 'Mostrar Panel';
    } else {
        toggleBtn.title = 'Ocultar Panel';
    }
}

// --- CONTEXT MENU FUNCTIONS ---

function initContextMenu() {
    const contextMenu = document.getElementById('customContextMenu');

    // Handle actions
    contextMenu.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action) {
            handleContextMenuAction(action);
            hideContextMenu();
        }
    });
}

function hideContextMenu() {
    const contextMenu = document.getElementById('customContextMenu');
    contextMenu.style.display = 'none';
    contextCell = null;
}

function showContextMenu(e) {
    e.preventDefault();
    hideDayContextMenu(); // Close day menu if open

    const clickedCell = e.target.closest('.calendar-cell');
    if (!clickedCell) return;

    // If the clicked cell is NOT part of an existing selection,
    // clear the old selection and make this cell the new selection.
    if (!selectedCells.includes(clickedCell)) {
        clearCellSelection();
        clickedCell.classList.add('selected');
        selectedCells = [clickedCell];
    }
    
    // The context menu now ALWAYS acts on the current selection (selectedCells array).
    contextCell = clickedCell; // Still useful for paste destination

    const contextMenu = document.getElementById('customContextMenu');
    
    // Enable/disable options based on whether ANY selected cell has events
    const eventsInSelection = selectedCells.some(cell => {
        const day = parseInt(cell.dataset.day);
        const operatorId = cell.dataset.operatorId;
        return events.some(event => event.day === day && event.operatorId === operatorId);
    });

    const copyItem = contextMenu.querySelector('[data-action="copy"]');
    const cutItem = contextMenu.querySelector('[data-action="cut"]');
    const deleteItem = contextMenu.querySelector('[data-action="delete"]');
    const pasteItem = contextMenu.querySelector('[data-action="paste"]');

    if (!eventsInSelection) {
        copyItem.classList.add('disabled');
        cutItem.classList.add('disabled');
        deleteItem.classList.add('disabled');
    } else {
        copyItem.classList.remove('disabled');
        cutItem.classList.remove('disabled');
        deleteItem.classList.remove('disabled');
    }

    if (clipboard.events.length === 0) {
        pasteItem.classList.add('disabled');
    } else {
        pasteItem.classList.remove('disabled');
    }
    
    // Position and show menu
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.display = 'block';
}

let contextDay = null; // To store the day for the day context menu

function showDayContextMenu(e) {
    e.preventDefault();
    hideContextMenu(); // Close cell menu if open

    const dayHeader = e.target.closest('.day-header');
    if (!dayHeader) return;

    contextDay = parseInt(dayHeader.dataset.day);

    const contextMenu = document.getElementById('dayContextMenu');

    // Position and show menu
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.display = 'block';
}

// Helper to format a date as YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toggleHoliday() {
    if (contextDay === null) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const holidayDate = new Date(year, month, contextDay);
    const dateString = formatDate(holidayDate);

    const holidayIndex = holidays.indexOf(dateString);

    if (holidayIndex > -1) {
        // It's already a holiday, so unmark it
        holidays.splice(holidayIndex, 1);
        showNotification(`Día ${contextDay} desmarcado como festivo.`, "success");
    } else {
        // It's not a holiday, so mark it
        holidays.push(dateString);
        showNotification(`Día ${contextDay} marcado como festivo.`, "success");
    }

    saveDataToStorage();
    generateCalendar(); // Re-render to show the style change
}

function initDayContextMenu() {
    const contextMenu = document.getElementById('dayContextMenu');

    contextMenu.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'toggle-holiday') {
            toggleHoliday();
        }
        hideDayContextMenu();
    });
}

function hideDayContextMenu() {
    document.getElementById('dayContextMenu').style.display = 'none';
    contextDay = null;
}

function handleContextMenuAction(action) {
    if (!contextCell) return;
    
    switch (action) {
        case 'copy':
            menuCopy();
            break;
        case 'cut':
            menuCut();
            break;
        case 'paste':
            menuPaste();
            break;
        case 'delete':
            menuDelete();
            break;
    }
}

function menuCopy() {
    if (selectedCells.length === 0) return;

    const rows = selectedCells.map(c => parseInt(c.dataset.row));
    const cols = selectedCells.map(c => parseInt(c.dataset.col));

    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    clipboard.width = maxCol - minCol + 1;
    clipboard.height = maxRow - minRow + 1;
    clipboard.events = [];

    selectedCells.forEach(cell => {
        const day = parseInt(cell.dataset.day);
        const operatorId = cell.dataset.operatorId;
        const cellEvents = events.filter(event => event.day === day && event.operatorId === operatorId);

        if (cellEvents.length > 0) {
            const rowOffset = parseInt(cell.dataset.row) - minRow;
            const colOffset = parseInt(cell.dataset.col) - minCol;
            
            cellEvents.forEach(event => {
                clipboard.events.push({
                    event: JSON.parse(JSON.stringify(event)), // Deep copy
                    rowOffset,
                    colOffset
                });
            });
        }
    });

    if (clipboard.events.length > 0) {
        showNotification(`${clipboard.events.length} turno(s) copiado(s) de un bloque de ${clipboard.width}x${clipboard.height}.`, 'success');
    } else {
        showNotification('No hay turnos para copiar en la selección.', 'warning');
    }
}

function menuCut() {
    menuCopy(); // This now populates the new clipboard structure
    if (clipboard.events.length > 0) {
        menuDelete(); // This deletes from the original selection
        showNotification(`${clipboard.events.length} turno(s) cortado(s).`, 'success');
    }
}

function menuPaste() {
    if (clipboard.events.length === 0) {
        showNotification('No hay nada que pegar en el portapapeles.', 'warning');
        return;
    }

    const startRow = parseInt(contextCell.dataset.row);
    const startCol = parseInt(contextCell.dataset.col);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 1. Clear the destination area first (destructive paste)
    for (let r = 0; r < clipboard.height; r++) {
        for (let c = 0; c < clipboard.width; c++) {
            const targetRow = startRow + r;
            const targetCol = startCol + c;
            const targetCell = document.querySelector(`.calendar-cell[data-row='${targetRow}'][data-col='${targetCol}']`);
            
            if (targetCell) {
                const day = parseInt(targetCell.dataset.day);
                const operatorId = targetCell.dataset.operatorId;
                events = events.filter(event => !(event.day === day && event.operatorId === operatorId));
            }
        }
    }

    // 2. Paste the new events
    let addedCount = 0;
    clipboard.events.forEach(item => {
        const targetRow = startRow + item.rowOffset;
        const targetCol = startCol + item.colOffset;
        const targetCell = document.querySelector(`.calendar-cell[data-row='${targetRow}'][data-col='${targetCol}']`);

        if (targetCell) {
            const newEvent = {
                ...item.event,
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                day: parseInt(targetCell.dataset.day),
                operatorId: targetCell.dataset.operatorId,
                month: month,
                year: year
            };
            events.push(newEvent);
            addedCount++;
        }
    });

    // 3. Save and re-render
    saveDataToStorage();
    renderEvents();
    updateOperatorHours();
    showNotification(`${addedCount} turno(s) pegado(s) en el nuevo rango.`, 'success');
}

function menuDelete() {
    if (selectedCells.length === 0) return;

    let deletedCount = 0;
    selectedCells.forEach(cell => {
        const day = parseInt(cell.dataset.day);
        const operatorId = cell.dataset.operatorId;
        
        const initialCount = events.length;
        events = events.filter(event => !(event.day === day && event.operatorId === operatorId));
        deletedCount += initialCount - events.length;
    });

    if (deletedCount > 0) {
        saveDataToStorage();
        renderEvents();
        updateOperatorHours();
        showNotification(`${deletedCount} turno(s) eliminado(s) de ${selectedCells.length} celdas.`, 'success');
    }
    clearCellSelection();
}


// Edit configuration
function editConfig(configId) {
    const config = savedConfigs.find(c => c.id === configId);
    if (!config) return;
    
    // Fill form with config data
    document.getElementById('shiftTitle').value = config.title;
    document.getElementById('startTime').value = config.startTime;
    document.getElementById('endTime').value = config.endTime;
    
    // Update color picker
    document.getElementById('colorPreview').style.backgroundColor = config.color;
    colorPickr.setColor(config.color);
    
    // Switch to edit mode
    editingConfigId = configId;
    document.getElementById('saveConfigBtn').style.display = 'none';
    document.getElementById('updateConfigBtn').style.display = 'block';
}

// Delete configuration
function deleteConfig(configId) {
    if (!confirm('¿Eliminar esta configuración?')) return;
    
    // Remove from saved configs
    savedConfigs = savedConfigs.filter(config => config.id !== configId);
    
    // If active config was deleted, set active to null
    if (activeConfig && activeConfig.id === configId) {
        activeConfig = null;
    }
    
    saveDataToStorage();
    renderSavedConfigs();
    showNotification('Configuración eliminada', 'success');
}

function updateMultipleShiftsIndicator() {
    const allCells = document.querySelectorAll('.calendar-cell');
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    allCells.forEach(cell => {
        const day = parseInt(cell.dataset.day);
        const operatorId = cell.dataset.operatorId;

        const eventsInCell = events.filter(event => 
            event.day === day && 
            event.operatorId === operatorId &&
            event.month === currentMonth &&
            event.year === currentYear
        );

        if (eventsInCell.length > 1) {
            cell.classList.add('multiple-shifts');
        } else {
            cell.classList.remove('multiple-shifts');
        }
    });
}

