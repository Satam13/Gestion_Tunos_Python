// Variables globales
let currentDate = new Date();
let events = [];
let savedConfigs = [];
let operators = [];
let activeConfig = null;
let editingConfigId = null;
let selectedCells = [];
let draggingEvent = null;
let colorPickr;
let tempCopyEvents = [];
let currentOperatorId = null; // For editing operator

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos guardados
    loadDataFromStorage();
    
    // Generar calendario inicial
    generateCalendar();
    initColorPicker();
    
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
        const modal = document.getElementById('operatorModal');
        if (e.target === modal) {
            closeModal();
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
        operators
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
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        if (isToday) dayHeader.classList.add('today');
        if (isWeekend) dayHeader.classList.add('weekend');
        dayHeader.innerHTML = `${day}<br><small>${dayName}</small>`;
        dayHeader.dataset.day = day;
        calendarGrid.appendChild(dayHeader);
    }
    
    // Header for hours column
    const hoursHeader = document.createElement('div');
    hoursHeader.className = 'hours-header';
    hoursHeader.innerHTML = 'Horas<br><small>Totales</small>';
    calendarGrid.appendChild(hoursHeader);
    
    // Filas para cada operario
    operators.forEach(operator => {
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
            
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            if (isToday) cell.classList.add('today');
            if (isWeekend) cell.classList.add('weekend');
            cell.dataset.day = day;
            cell.dataset.operatorId = operator.id;
            cell.dataset.cellId = `cell-${operator.id}-${day}`;
            
            // Contenedor para eventos
            const eventContainer = document.createElement('div');
            eventContainer.className = 'event-container';
            eventContainer.id = `cell-${operator.id}-${day}`;
            cell.appendChild(eventContainer);
            
            // Event listeners for cells
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('dragleave', handleDragLeave);
            cell.addEventListener('drop', handleDrop);
            
            // Mouse events for multi-select
            cell.addEventListener('mousedown', startCellSelection);
            cell.addEventListener('mouseover', continueCellSelection);
            
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
}


// Handle cell click (single click)
function handleCellClick(e) {
    if (e.ctrlKey || e.metaKey) {
        // Toggle cell selection with Ctrl/Cmd key
        toggleCellSelection(this);
    } else if (activeConfig) {
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

function startCellSelection(e) {
    // Only start selection with Shift key
    if (!e.shiftKey) return;
    
    e.preventDefault();
    isSelecting = true;
    selectionStartCell = this;
    selectedCells = [this];
    this.classList.add('selected');
    updateSelectionButtons();
}

function continueCellSelection(e) {
    if (!isSelecting) return;
    
    if (!selectedCells.includes(this)) {
        selectedCells.push(this);
        this.classList.add('selected');
        updateSelectionButtons();
    }
}

function stopCellSelection() {
    isSelecting = false;
    selectionStartCell = null;
}

// Add event listener to stop selection
document.addEventListener('mouseup', stopCellSelection);

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
    
    const eventId = e.dataTransfer.getData('text/plain');
    const targetDay = parseInt(this.dataset.day);
    const targetOperatorId = this.dataset.operatorId;
    
    // Update event with new position
    const eventIndex = events.findIndex(event => event.id === eventId);
    if (eventIndex !== -1) {
        events[eventIndex].day = targetDay;
        events[eventIndex].operatorId = targetOperatorId;
        // Month and year stay the same to prevent shifts from moving between months
        
        saveDataToStorage();
        renderEvents();
        showNotification("Turno movido correctamente", "success");
    }
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
                
                // Right-click for delete
                eventElement.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`¿Eliminar turno "${event.title}"?`)) {
                        removeEvent(event.id);
                    }
                });
                
                cellContainer.appendChild(eventElement);
            }
        }
    });
    
    // Setup drag and drop after rendering events
    setupDragAndDrop();
    
    // Update operator hours after rendering events
    updateOperatorHours();
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
    const emailInput = document.getElementById('emailInput').value.trim();
    
    if (!emailInput || !validateEmail(emailInput)) {
        showNotification("Por favor introduce un email válido", "error");
        return;
    }
    
    document.getElementById('emailStatus').textContent = "Enviando email...";
    
    // Simulate email sending
    setTimeout(() => {
        document.getElementById('emailStatus').textContent = "Email enviado correctamente";
        showNotification(`Cuadrantes enviados a ${emailInput}`, "success");
    }, 2000);
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
