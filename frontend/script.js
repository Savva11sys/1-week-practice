// Глобальные переменные
let currentPage = 1;
const itemsPerPage = 10;
let allProducts = [];
let allWorkshops = [];
let productTypes = [];
let materials = [];
let selectedProducts = new Set(); // Для массового удаления

// API базовый URL
const API_URL = 'http://localhost:8000';

// Вспомогательные функции
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Загрузка данных
async function loadData() {
    try {
        // Загружаем продукцию
        const productsResponse = await fetch(`${API_URL}/products`);
        if (productsResponse.ok) {
            allProducts = await productsResponse.json();
            renderProductsTable();
            updatePagination();
            updateReports();
            updateDashboard();
        }
        
        // Загружаем цехи
        const workshopsResponse = await fetch(`${API_URL}/workshops`);
        if (workshopsResponse.ok) {
            allWorkshops = await workshopsResponse.json();
            renderWorkshopsTable();
        }
        
        // Загружаем типы продукции
        const typesResponse = await fetch(`${API_URL}/product-types`);
        if (typesResponse.ok) {
            productTypes = await typesResponse.json();
            populateProductTypes();
        }
        
        // Загружаем материалы
        const materialsResponse = await fetch(`${API_URL}/materials`);
        if (materialsResponse.ok) {
            materials = await materialsResponse.json();
            populateMaterials();
        }
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных. Проверьте подключение к серверу.', 'error');
    }
}

// Отображение таблицы продукции с чекбоксами
function renderProductsTable() {
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const displayedProducts = allProducts.slice(startIndex, endIndex);
    
    displayedProducts.forEach(product => {
        const row = document.createElement('tr');
        row.id = `product-row-${product.id}`;
        
        // Рассчитываем общее время производства
        const totalTime = product.workshops ? 
            product.workshops.reduce((sum, w) => sum + w.processing_time, 0) : 0;
        
        const isSelected = selectedProducts.has(product.id);
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="product-checkbox" value="${product.id}" 
                       ${isSelected ? 'checked' : ''} onchange="toggleProductSelection(${product.id})">
            </td>
            <td><strong>${product.article}</strong></td>
            <td>
                <div class="product-name">${product.product_name}</div>
                <small class="text-muted">ID: ${product.id}</small>
            </td>
            <td>${product.product_type?.type_name || 'Не указан'}</td>
            <td>${product.main_material?.material_name || 'Не указан'}</td>
            <td>${parseFloat(product.min_partner_price).toFixed(2)} ₽</td>
            <td>
                <div class="time-badge">${totalTime} ч</div>
                <small>${product.workshops?.length || 0} цехов</small>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn" title="Редактировать" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" title="Просмотреть цехи" onclick="viewWorkshops(${product.id})">
                        <i class="fas fa-industry"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Удалить" onclick="confirmDelete(${product.id}, '${product.product_name.replace(/'/g, "\\'")}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Обновляем информацию о записях
    document.getElementById('total-records').textContent = allProducts.length;
    updatePageInfo();
    updateSelectedCount();
}

// Управление выбором товаров
function toggleProductSelection(productId) {
    const checkbox = document.querySelector(`.product-checkbox[value="${productId}"]`);
    if (checkbox.checked) {
        selectedProducts.add(productId);
    } else {
        selectedProducts.delete(productId);
    }
    updateSelectedCount();
}

function selectAllProducts() {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
        const productId = parseInt(checkbox.value);
        if (!allChecked) {
            selectedProducts.add(productId);
        } else {
            selectedProducts.delete(productId);
        }
    });
    updateSelectedCount();
}

function clearSelection() {
    selectedProducts.clear();
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelectedCount();
}

function updateSelectedCount() {
    const count = selectedProducts.size;
    document.getElementById('selected-count').textContent = count;
    
    // Показываем/скрываем панель массовых действий
    const bulkActions = document.getElementById('bulk-actions');
    if (bulkActions) {
        bulkActions.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Подтверждение удаления
function confirmDelete(productId, productName) {
    const modal = document.getElementById('delete-confirm-modal');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const productNameSpan = document.getElementById('delete-product-name');
    
    productNameSpan.textContent = productName;
    
    // Устанавливаем обработчик для кнопки подтверждения
    confirmBtn.onclick = () => deleteProduct(productId);
    
    // Показываем модальное окно
    modal.classList.add('active');
}

// Удаление продукта
async function deleteProduct(productId) {
    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Удаляем строку из таблицы с анимацией
            const row = document.getElementById(`product-row-${productId}`);
            if (row) {
                row.classList.add('slide-out');
                setTimeout(() => {
                    row.remove();
                    // Удаляем из глобального массива
                    allProducts = allProducts.filter(p => p.id !== productId);
                    // Удаляем из выбранных
                    selectedProducts.delete(productId);
                    // Обновляем данные
                    updateReports();
                    updateDashboard();
                    updateSelectedCount();
                }, 300);
            }
            
            showNotification('Продукт успешно удален', 'success');
            
            // Закрываем модальное окно
            closeDeleteConfirm();
            
        } else {
            const error = await response.json();
            showNotification(`Ошибка: ${error.detail || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления продукта:', error);
        showNotification('Ошибка удаления продукта', 'error');
    }
}

// Массовое удаление
async function deleteSelectedProducts() {
    if (selectedProducts.size === 0) {
        showNotification('Выберите товары для удаления', 'warning');
        return;
    }
    
    if (!confirm(`Вы уверены, что хотите удалить ${selectedProducts.size} товаров? Это действие нельзя отменить.`)) {
        return;
    }
    
    try {
        const productIds = Array.from(selectedProducts);
        const response = await fetch(`${API_URL}/products/batch`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productIds)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Удаляем строки из таблицы
            productIds.forEach(productId => {
                const row = document.getElementById(`product-row-${productId}`);
                if (row) {
                    row.classList.add('slide-out');
                    setTimeout(() => row.remove(), 300);
                }
            });
            
            // Обновляем глобальный массив
            allProducts = allProducts.filter(p => !productIds.includes(p.id));
            
            // Очищаем выбранные
            selectedProducts.clear();
            
            // Обновляем данные
            updateReports();
            updateDashboard();
            updateSelectedCount();
            
            showNotification(result.message || `Удалено ${productIds.length} товаров`, 'success');
            
        } else {
            const error = await response.json();
            showNotification(`Ошибка: ${error.detail || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка массового удаления:', error);
        showNotification('Ошибка удаления товаров', 'error');
    }
}

// Закрытие модального окна подтверждения
function closeDeleteConfirm() {
    document.getElementById('delete-confirm-modal').classList.remove('active');
}

// Отображение таблицы цехов
function renderWorkshopsTable() {
    const tbody = document.getElementById('workshops-tbody');
    tbody.innerHTML = '';
    
    allWorkshops.forEach(workshop => {
        const row = document.createElement('tr');
        
        // Считаем загрузку (условно)
        const load = Math.min(100, Math.floor(Math.random() * 70) + 30);
        const loadColor = load > 80 ? 'var(--error-color)' : 
                         load > 60 ? 'var(--warning-color)' : 'var(--success-color)';
        
        row.innerHTML = `
            <td>
                <div class="workshop-name">
                    <i class="fas fa-industry"></i>
                    ${workshop.workshop_name}
                </div>
            </td>
            <td>${workshop.worker_count} чел.</td>
            <td>${workshop.processing_time} ч</td>
            <td>
                <div class="load-indicator">
                    <div class="load-bar" style="width: ${load}%; background-color: ${loadColor};"></div>
                    <span>${load}%</span>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Заполнение выпадающих списков
function populateProductTypes() {
    const typeSelects = [
        document.getElementById('product-type'),
        document.getElementById('calc-product-type'),
        document.getElementById('filter-type'),
        document.getElementById('report-product-type')
    ];
    
    typeSelects.forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">Выберите тип</option>' +
                productTypes.map(type => 
                    `<option value="${type.id}">${type.type_name}</option>`
                ).join('');
        }
    });
}

function populateMaterials() {
    const materialSelects = [
        document.getElementById('main-material'),
        document.getElementById('calc-material-type'),
        document.getElementById('filter-material'),
        document.getElementById('report-material')
    ];
    
    materialSelects.forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">Выберите материал</option>' +
                materials.map(material => 
                    `<option value="${material.id}">${material.material_name}</option>`
                ).join('');
        }
    });
}

// Пагинация
function updatePagination() {
    const totalPages = Math.ceil(allProducts.length / itemsPerPage);
    document.getElementById('page-info').textContent = `Страница ${currentPage} из ${totalPages}`;
}

function nextPage() {
    const totalPages = Math.ceil(allProducts.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderProductsTable();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderProductsTable();
    }
}

function updatePageInfo() {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, allProducts.length);
    document.getElementById('page-info').textContent = 
        `Показано ${start}-${end} из ${allProducts.length} записей`;
}

// Фильтрация продукции
function filterProducts() {
    const searchTerm = document.getElementById('search-products').value.toLowerCase();
    const typeFilter = document.getElementById('filter-type').value;
    const materialFilter = document.getElementById('filter-material').value;
    const priceMin = parseFloat(document.getElementById('filter-price-min').value) || 0;
    const priceMax = parseFloat(document.getElementById('filter-price-max').value) || Infinity;
    
    let filtered = allProducts;
    
    if (searchTerm) {
        filtered = filtered.filter(product => 
            product.product_name.toLowerCase().includes(searchTerm) ||
            product.article.toLowerCase().includes(searchTerm)
        );
    }
    
    if (typeFilter) {
        filtered = filtered.filter(product => 
            product.product_type_id == typeFilter
        );
    }
    
    if (materialFilter) {
        filtered = filtered.filter(product => 
            product.main_material_id == materialFilter
        );
    }
    
    // Фильтр по цене
    filtered = filtered.filter(product => {
        const price = parseFloat(product.min_partner_price);
        return price >= priceMin && price <= priceMax;
    });
    
    currentPage = 1;
    allProducts = filtered;
    renderProductsTable();
}

function resetFilters() {
    document.getElementById('search-products').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-material').value = '';
    document.getElementById('filter-price-min').value = '';
    document.getElementById('filter-price-max').value = '';
    
    loadData(); // Перезагружаем все данные
}

// Управление модальным окном
function openProductForm(productId = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('modal-title');
    const saveBtn = document.getElementById('save-btn-text');
    
    if (productId) {
        // Редактирование существующего продукта
        title.textContent = 'Редактирование продукта';
        saveBtn.textContent = 'Обновить';
        loadProductData(productId);
    } else {
        // Добавление нового продукта
        title.textContent = 'Добавление продукта';
        saveBtn.textContent = 'Сохранить';
        resetProductForm();
    }
    
    // Заполняем список цехов для выбора
    populateWorkshopsChecklist();
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('product-modal').classList.remove('active');
    resetProductForm();
}

function resetProductForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    
    // Сбрасываем все чекбоксы цехов
    const checkboxes = document.querySelectorAll('#workshops-checklist input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = false);
}

async function loadProductData(productId) {
    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        if (response.ok) {
            const product = await response.json();
            
            document.getElementById('product-id').value = product.id;
            document.getElementById('article').value = product.article;
            document.getElementById('product-type').value = product.product_type_id;
            document.getElementById('product-name').value = product.product_name;
            document.getElementById('min-price').value = parseFloat(product.min_partner_price);
            document.getElementById('main-material').value = product.main_material_id;
            document.getElementById('param1').value = product.param1;
            document.getElementById('param2').value = product.param2;
            
            // Отмечаем выбранные цехи
            if (product.workshops && product.workshops.length > 0) {
                product.workshops.forEach(workshop => {
                    const checkbox = document.querySelector(`input[name="workshop"][value="${workshop.id}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки данных продукта:', error);
        showNotification('Ошибка загрузки данных продукта', 'error');
    }
}

function populateWorkshopsChecklist() {
    const checklist = document.getElementById('workshops-checklist');
    checklist.innerHTML = '';
    
    allWorkshops.forEach(workshop => {
        const item = document.createElement('div');
        item.className = 'checklist-item';
        item.innerHTML = `
            <input type="checkbox" id="workshop-${workshop.id}" name="workshop" value="${workshop.id}">
            <label for="workshop-${workshop.id}">
                ${workshop.workshop_name} (${workshop.processing_time} ч)
            </label>
        `;
        checklist.appendChild(item);
    });
}

// Сохранение продукта
async function saveProduct(event) {
    event.preventDefault();
    
    const productId = document.getElementById('product-id').value;
    const formData = {
        article: document.getElementById('article').value,
        product_type_id: parseInt(document.getElementById('product-type').value),
        product_name: document.getElementById('product-name').value,
        min_partner_price: parseFloat(document.getElementById('min-price').value),
        main_material_id: parseInt(document.getElementById('main-material').value),
        param1: parseFloat(document.getElementById('param1').value),
        param2: parseFloat(document.getElementById('param2').value)
    };
    
    // Валидация
    if (!formData.article || !formData.product_name || formData.min_partner_price < 0) {
        showNotification('Пожалуйста, заполните все обязательные поля корректно', 'error');
        return;
    }
    
    try {
        let response;
        
        if (productId) {
            // Обновление существующего продукта
            response = await fetch(`${API_URL}/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Создание нового продукта
            response = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
        }
        
        if (response.ok) {
            // Сохраняем выбранные цехи
            const selectedWorkshops = Array.from(
                document.querySelectorAll('input[name="workshop"]:checked')
            ).map(cb => parseInt(cb.value));
            
            await saveProductWorkshops(productId || (await response.json()).id, selectedWorkshops);
            
            showNotification(
                productId ? 'Продукт успешно обновлен' : 'Продукт успешно добавлен',
                'success'
            );
            
            closeModal();
            await loadData(); // Перезагружаем данные
        } else {
            const error = await response.json();
            showNotification(`Ошибка: ${error.detail || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка сохранения продукта:', error);
        showNotification('Ошибка сохранения продукта. Проверьте подключение к серверу.', 'error');
    }
}

async function saveProductWorkshops(productId, workshopIds) {
    try {
        // Сначала удаляем все существующие связи
        await fetch(`${API_URL}/products/${productId}/workshops`, {
            method: 'DELETE'
        });
        
        // Затем добавляем новые связи
        for (let i = 0; i < workshopIds.length; i++) {
            await fetch(`${API_URL}/products/${productId}/workshops/${workshopIds[i]}?order=${i + 1}`, {
                method: 'POST'
            });
        }
    } catch (error) {
        console.error('Ошибка сохранения цехов:', error);
    }
}

// Редактирование продукта
async function editProduct(productId) {
    openProductForm(productId);
}

// Просмотр цехов продукта
function viewWorkshops(productId) {
    const product = allProducts.find(p => p.id == productId);
    if (product) {
        let message = `<strong>Цехи для продукта "${product.product_name}":</strong><br><br>`;
        
        if (product.workshops && product.workshops.length > 0) {
            product.workshops.forEach((workshop, index) => {
                message += `${index + 1}. ${workshop.workshop_name} - ${workshop.processing_time} ч<br>`;
            });
            const totalTime = product.workshops.reduce((sum, w) => sum + w.processing_time, 0);
            message += `<br><strong>Общее время: ${totalTime} ч</strong>`;
        } else {
            message += 'Цехи не назначены';
        }
        
        showNotification(message, 'info');
    }
}

// Калькулятор сырья
async function calculateMaterials() {
    const request = {
        product_type_id: parseInt(document.getElementById('calc-product-type').value),
        material_type_id: parseInt(document.getElementById('calc-material-type').value),
        quantity: parseInt(document.getElementById('calc-quantity').value),
        param1: parseFloat(document.getElementById('calc-param1').value),
        param2: parseFloat(document.getElementById('calc-param2').value)
    };
    
    // Валидация
    if (!request.product_type_id || !request.material_type_id || 
        !request.quantity || request.quantity <= 0 ||
        !request.param1 || request.param1 <= 0 ||
        !request.param2 || request.param2 <= 0) {
        showNotification('Пожалуйста, заполните все поля корректно', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/calculate-materials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            const resultBox = document.getElementById('calculation-result');
            resultBox.innerHTML = `
                <h4>Результат расчета:</h4>
                <div class="result-value">${result.raw_material_needed} ед.</div>
                <p>Для производства ${request.quantity} единиц продукции</p>
                <small>Параметры: ${request.param1}м × ${request.param2}м</small>
            `;
            
            showNotification('Расчет выполнен успешно', 'success');
        } else {
            const error = await response.json();
            showNotification(`Ошибка расчета: ${error.detail || 'Неверные параметры'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка расчета:', error);
        showNotification('Ошибка расчета. Проверьте подключение к серверу.', 'error');
    }
}

// Обновление отчетов и дашборда
function updateReports() {
    // Общая статистика
    document.getElementById('total-products').textContent = allProducts.length;
    document.getElementById('total-workshops').textContent = allWorkshops.length;
    
    const avgTime = allProducts.length > 0 ? 
        Math.round(allProducts.reduce((sum, p) => {
            const total = p.workshops ? p.workshops.reduce((s, w) => s + w.processing_time, 0) : 0;
            return sum + total;
        }, 0) / allProducts.length) : 0;
    document.getElementById('avg-production-time').textContent = `${avgTime} ч`;
    
    // Статистика по ценам
    const prices = allProducts.map(p => parseFloat(p.min_partner_price));
    const avgPrice = prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices).toFixed(2) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices).toFixed(2) : 0;
    
    document.getElementById('avg-price').textContent = `${avgPrice} ₽`;
    document.getElementById('min-price-stat').textContent = `${minPrice} ₽`;
    document.getElementById('max-price-stat').textContent = `${maxPrice} ₽`;
    
    // Строим простые графики распределения
    buildTypeDistributionChart();
    buildMaterialDistributionChart();
    buildPriceDistributionChart();
    
    // Обновляем кнопки выгрузки отчетов
    setupReportExportButtons();
}

function updateDashboard() {
    // Обновляем статистику на дашборде
    document.getElementById('dashboard-total-products').textContent = allProducts.length;
    document.getElementById('dashboard-total-workshops').textContent = allWorkshops.length;
    document.getElementById('dashboard-total-types').textContent = productTypes.length;
    document.getElementById('dashboard-total-materials').textContent = materials.length;
    
    // Показываем последние добавленные товары
    const recentProductsContainer = document.getElementById('recent-products-list');
    if (recentProductsContainer) {
        const recentProducts = allProducts.slice(0, 5);
        let html = '';
        recentProducts.forEach(product => {
            html += `
                <div class="recent-product-item">
                    <div class="recent-product-name">${product.article} - ${product.product_name}</div>
                    <div class="recent-product-price">${parseFloat(product.min_partner_price).toFixed(2)} ₽</div>
                </div>
            `;
        });
        recentProductsContainer.innerHTML = html;
    }
}

function buildTypeDistributionChart() {
    const chartElement = document.getElementById('type-chart');
    if (!chartElement) return;
    
    // Группируем по типам
    const typeCounts = {};
    allProducts.forEach(product => {
        const typeName = product.product_type?.type_name || 'Не указан';
        typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
    });
    
    // Создаем простую текстовую визуализацию
    let html = '<div class="distribution-list">';
    for (const [typeName, count] of Object.entries(typeCounts)) {
        const percentage = allProducts.length > 0 ? Math.round((count / allProducts.length) * 100) : 0;
        html += `
            <div class="distribution-item">
                <span class="dist-label">${typeName}</span>
                <div class="dist-bar-container">
                    <div class="dist-bar" style="width: ${percentage}%;"></div>
                </div>
                <span class="dist-value">${count} (${percentage}%)</span>
            </div>
        `;
    }
    html += '</div>';
    
    chartElement.innerHTML = html;
}

function buildMaterialDistributionChart() {
    const chartElement = document.getElementById('material-chart');
    if (!chartElement) return;
    
    // Группируем по материалам
    const materialCounts = {};
    allProducts.forEach(product => {
        const materialName = product.main_material?.material_name || 'Не указан';
        materialCounts[materialName] = (materialCounts[materialName] || 0) + 1;
    });
    
    // Создаем простую текстовую визуализацию
    let html = '<div class="distribution-list">';
    for (const [materialName, count] of Object.entries(materialCounts)) {
        const percentage = allProducts.length > 0 ? Math.round((count / allProducts.length) * 100) : 0;
        html += `
            <div class="distribution-item">
                <span class="dist-label">${materialName}</span>
                <div class="dist-bar-container">
                    <div class="dist-bar" style="width: ${percentage}%; background-color: var(--primary-color);"></div>
                </div>
                <span class="dist-value">${count} (${percentage}%)</span>
            </div>
        `;
    }
    html += '</div>';
    
    chartElement.innerHTML = html;
}

function buildPriceDistributionChart() {
    const chartElement = document.getElementById('price-chart');
    if (!chartElement) return;
    
    // Группируем по ценовым диапазонам
    const priceRanges = {
        'До 5,000 ₽': 0,
        '5,000 - 10,000 ₽': 0,
        '10,000 - 20,000 ₽': 0,
        '20,000 - 50,000 ₽': 0,
        'Свыше 50,000 ₽': 0
    };
    
    allProducts.forEach(product => {
        const price = parseFloat(product.min_partner_price);
        if (price < 5000) priceRanges['До 5,000 ₽']++;
        else if (price < 10000) priceRanges['5,000 - 10,000 ₽']++;
        else if (price < 20000) priceRanges['10,000 - 20,000 ₽']++;
        else if (price < 50000) priceRanges['20,000 - 50,000 ₽']++;
        else priceRanges['Свыше 50,000 ₽']++;
    });
    
    // Создаем простую текстовую визуализацию
    let html = '<div class="distribution-list">';
    for (const [range, count] of Object.entries(priceRanges)) {
        const percentage = allProducts.length > 0 ? Math.round((count / allProducts.length) * 100) : 0;
        html += `
            <div class="distribution-item">
                <span class="dist-label">${range}</span>
                <div class="dist-bar-container">
                    <div class="dist-bar" style="width: ${percentage}%; background-color: var(--secondary-color);"></div>
                </div>
                <span class="dist-value">${count} (${percentage}%)</span>
            </div>
        `;
    }
    html += '</div>';
    
    chartElement.innerHTML = html;
}

// Выгрузка отчетов
async function exportReport(type) {
    try {
        let reportData;
        let filename;
        let contentType;
        
        switch(type) {
            case 'products':
                reportData = generateProductsReport();
                filename = `products_report_${new Date().toISOString().split('T')[0]}.csv`;
                contentType = 'text/csv;charset=utf-8;';
                break;
            case 'workshops':
                reportData = generateWorkshopsReport();
                filename = `workshops_report_${new Date().toISOString().split('T')[0]}.csv`;
                contentType = 'text/csv;charset=utf-8;';
                break;
            case 'materials':
                reportData = generateMaterialsReport();
                filename = `materials_report_${new Date().toISOString().split('T')[0]}.csv`;
                contentType = 'text/csv;charset=utf-8;';
                break;
            case 'full':
                reportData = generateFullReport();
                filename = `full_report_${new Date().toISOString().split('T')[0]}.csv`;
                contentType = 'text/csv;charset=utf-8;';
                break;
            case 'statistics':
                reportData = generateStatisticsReport();
                filename = `statistics_report_${new Date().toISOString().split('T')[0]}.csv`;
                contentType = 'text/csv;charset=utf-8;';
                break;
            default:
                return;
        }
        
        // Создаем Blob и скачиваем
        const blob = new Blob(['\ufeff' + reportData], { 
            type: contentType
        });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Отчет успешно выгружен', 'success');
        
    } catch (error) {
        console.error('Ошибка выгрузки отчета:', error);
        showNotification('Ошибка выгрузки отчета', 'error');
    }
}

// Генерация отчета по продукции
function generateProductsReport() {
    let csvContent = '';
    
    // Заголовки
    const headers = [
        'ID', 'Артикул', 'Наименование', 'Тип продукции', 'Материал', 
        'Цена (руб)', 'Параметр 1', 'Параметр 2', 'Количество цехов', 
        'Общее время (ч)', 'Дата создания', 'Дата обновления'
    ];
    
    csvContent += headers.join(';') + "\n";
    
    // Данные
    allProducts.forEach(product => {
        const totalTime = product.workshops ? 
            product.workshops.reduce((sum, w) => sum + w.processing_time, 0) : 0;
        
        const row = [
            product.id,
            product.article,
            product.product_name,
            product.product_type?.type_name || '',
            product.main_material?.material_name || '',
            product.min_partner_price,
            product.param1,
            product.param2,
            product.workshops?.length || 0,
            totalTime,
            new Date(product.created_at).toLocaleDateString('ru-RU'),
            new Date(product.updated_at).toLocaleDateString('ru-RU')
        ].map(cell => `"${cell}"`).join(';');
        
        csvContent += row + "\n";
    });
    
    return csvContent;
}

// Генерация отчета по цехам
function generateWorkshopsReport() {
    let csvContent = '';
    
    // Заголовки
    const headers = ['ID', 'Название цеха', 'Работников', 'Время обработки (ч)', 'Загруженность (%)'];
    csvContent += headers.join(';') + "\n";
    
    // Данные
    allWorkshops.forEach(workshop => {
        const load = Math.min(100, Math.floor(Math.random() * 70) + 30);
        
        const row = [
            workshop.id,
            workshop.workshop_name,
            workshop.worker_count,
            workshop.processing_time,
            load
        ].map(cell => `"${cell}"`).join(';');
        
        csvContent += row + "\n";
    });
    
    return csvContent;
}

// Генерация отчета по материалам
function generateMaterialsReport() {
    let csvContent = '';
    
    // Заголовки
    const headers = ['ID', 'Материал', 'Потери (%)', 'Используется в товарах'];
    csvContent += headers.join(';') + "\n";
    
    // Данные
    materials.forEach(material => {
        // Считаем количество товаров с этим материалом
        const productCount = allProducts.filter(p => p.main_material_id === material.id).length;
        
        const row = [
            material.id,
            material.material_name,
            material.loss_percentage,
            productCount
        ].map(cell => `"${cell}"`).join(';');
        
        csvContent += row + "\n";
    });
    
    return csvContent;
}

// Генерация полного отчета
function generateFullReport() {
    let csvContent = '';
    
    // Раздел: Общая статистика
    csvContent += "ОТЧЕТ ПО МЕБЕЛЬНОЙ КОМПАНИИ\n\n";
    csvContent += "Общая статистика\n";
    csvContent += `Всего товаров;${allProducts.length}\n`;
    csvContent += `Всего цехов;${allWorkshops.length}\n`;
    csvContent += `Всего типов продукции;${productTypes.length}\n`;
    csvContent += `Всего материалов;${materials.length}\n\n`;
    
    // Раздел: Товары
    csvContent += "Товары\n";
    const productHeaders = ['Артикул', 'Наименование', 'Тип', 'Материал', 'Цена', 'Цехи', 'Общее время'];
    csvContent += productHeaders.join(';') + "\n";
    
    allProducts.forEach(product => {
        const workshopNames = product.workshops ? 
            product.workshops.map(w => w.workshop_name).join(', ') : '';
        const totalTime = product.workshops ? 
            product.workshops.reduce((sum, w) => sum + w.processing_time, 0) : 0;
        
        const row = [
            product.article,
            product.product_name,
            product.product_type?.type_name || '',
            product.main_material?.material_name || '',
            product.min_partner_price,
            workshopNames,
            totalTime
        ].map(cell => `"${cell}"`).join(';');
        
        csvContent += row + "\n";
    });
    
    csvContent += "\n";
    
    // Раздел: Цехи
    csvContent += "Цехи\n";
    const workshopHeaders = ['Цех', 'Работников', 'Время обработки', 'Загруженность'];
    csvContent += workshopHeaders.join(';') + "\n";
    
    allWorkshops.forEach(workshop => {
        const load = Math.min(100, Math.floor(Math.random() * 70) + 30);
        
        const row = [
            workshop.workshop_name,
            workshop.worker_count,
            workshop.processing_time,
            `${load}%`
        ].map(cell => `"${cell}"`).join(';');
        
        csvContent += row + "\n";
    });
    
    // Раздел: Статистика
    csvContent += "\nСтатистика\n";
    const prices = allProducts.map(p => parseFloat(p.min_partner_price));
    const avgPrice = prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : 0;
    
    csvContent += `Средняя цена товара;${avgPrice} ₽\n`;
    csvContent += `Минимальная цена;${prices.length > 0 ? Math.min(...prices).toFixed(2) : 0} ₽\n`;
    csvContent += `Максимальная цена;${prices.length > 0 ? Math.max(...prices).toFixed(2) : 0} ₽\n`;
    csvContent += `Общее время производства всех товаров;${allProducts.reduce((sum, p) => {
        const total = p.workshops ? p.workshops.reduce((s, w) => s + w.processing_time, 0) : 0;
        return sum + total;
    }, 0)} ч\n`;
    
    return csvContent;
}

// Генерация статистического отчета
function generateStatisticsReport() {
    let csvContent = '';
    
    csvContent += "СТАТИСТИЧЕСКИЙ ОТЧЕТ\n\n";
    
    // Распределение по типам
    csvContent += "Распределение по типам продукции\n";
    csvContent += "Тип;Количество;Доля (%)\n";
    
    const typeCounts = {};
    allProducts.forEach(product => {
        const typeName = product.product_type?.type_name || 'Не указан';
        typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
    });
    
    for (const [typeName, count] of Object.entries(typeCounts)) {
        const percentage = allProducts.length > 0 ? ((count / allProducts.length) * 100).toFixed(2) : 0;
        csvContent += `${typeName};${count};${percentage}\n`;
    }
    
    csvContent += "\n";
    
    // Распределение по материалам
    csvContent += "Распределение по материалам\n";
    csvContent += "Материал;Количество;Доля (%)\n";
    
    const materialCounts = {};
    allProducts.forEach(product => {
        const materialName = product.main_material?.material_name || 'Не указан';
        materialCounts[materialName] = (materialCounts[materialName] || 0) + 1;
    });
    
    for (const [materialName, count] of Object.entries(materialCounts)) {
        const percentage = allProducts.length > 0 ? ((count / allProducts.length) * 100).toFixed(2) : 0;
        csvContent += `${materialName};${count};${percentage}\n`;
    }
    
    csvContent += "\n";
    
    // Распределение по ценам
    csvContent += "Распределение по ценовым диапазонам\n";
    csvContent += "Диапазон цен;Количество;Доля (%)\n";
    
    const priceRanges = {
        'До 5,000 ₽': 0,
        '5,000 - 10,000 ₽': 0,
        '10,000 - 20,000 ₽': 0,
        '20,000 - 50,000 ₽': 0,
        'Свыше 50,000 ₽': 0
    };
    
    allProducts.forEach(product => {
        const price = parseFloat(product.min_partner_price);
        if (price < 5000) priceRanges['До 5,000 ₽']++;
        else if (price < 10000) priceRanges['5,000 - 10,000 ₽']++;
        else if (price < 20000) priceRanges['10,000 - 20,000 ₽']++;
        else if (price < 50000) priceRanges['20,000 - 50,000 ₽']++;
        else priceRanges['Свыше 50,000 ₽']++;
    });
    
    for (const [range, count] of Object.entries(priceRanges)) {
        const percentage = allProducts.length > 0 ? ((count / allProducts.length) * 100).toFixed(2) : 0;
        csvContent += `${range};${count};${percentage}\n`;
    }
    
    return csvContent;
}

// Настройка кнопок выгрузки отчетов
function setupReportExportButtons() {
    const exportButtons = document.querySelectorAll('[data-export]');
    exportButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const reportType = button.getAttribute('data-export');
            exportReport(reportType);
        });
    });
}

// Генерация пользовательских отчетов
function generateCustomReport() {
    const productType = document.getElementById('report-product-type').value;
    const material = document.getElementById('report-material').value;
    const dateFrom = document.getElementById('report-date-from').value;
    const dateTo = document.getElementById('report-date-to').value;
    
    let filteredProducts = allProducts;
    
    if (productType) {
        filteredProducts = filteredProducts.filter(p => p.product_type_id == productType);
    }
    
    if (material) {
        filteredProducts = filteredProducts.filter(p => p.main_material_id == material);
    }
    
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filteredProducts = filteredProducts.filter(p => new Date(p.created_at) >= fromDate);
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        filteredProducts = filteredProducts.filter(p => new Date(p.created_at) <= toDate);
    }
    
    // Генерируем отчет
    let csvContent = "ПОЛЬЗОВАТЕЛЬСКИЙ ОТЧЕТ\n\n";
    csvContent += `Параметры отчета:\n`;
    csvContent += `Тип продукции: ${productType ? productTypes.find(t => t.id == productType)?.type_name : 'Все'}\n`;
    csvContent += `Материал: ${material ? materials.find(m => m.id == material)?.material_name : 'Все'}\n`;
    csvContent += `Период: ${dateFrom || 'Начало'} - ${dateTo || 'Конец'}\n\n`;
    
    csvContent += "Результаты:\n";
    const headers = ['Артикул', 'Наименование', 'Цена', 'Тип', 'Материал', 'Дата создания'];
    csvContent += headers.join(';') + "\n";
    
    filteredProducts.forEach(product => {
        const row = [
            product.article,
            product.product_name,
            product.min_partner_price,
            product.product_type?.type_name || '',
            product.main_material?.material_name || '',
            new Date(product.created_at).toLocaleDateString('ru-RU')
        ].map(cell => `"${cell}"`).join(';');
        
        csvContent += row + "\n";
    });
    
    csvContent += `\nИтого: ${filteredProducts.length} товаров\n`;
    const totalValue = filteredProducts.reduce((sum, p) => sum + parseFloat(p.min_partner_price), 0);
    csvContent += `Общая стоимость: ${totalValue.toFixed(2)} ₽\n`;
    
    // Скачиваем отчет
    const blob = new Blob(['\ufeff' + csvContent], { 
        type: 'text/csv;charset=utf-8;'
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Пользовательский отчет успешно сгенерирован', 'success');
}

// Навигация по страницам
function showPage(pageId) {
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Показываем выбранную страницу
    document.getElementById(`${pageId}-page`).classList.add('active');
    
    // Обновляем активный пункт меню
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`.nav-item a[onclick*="${pageId}"]`).parentElement;
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Загружаем данные для страницы, если нужно
    if (pageId === 'reports') {
        updateReports();
    } else if (pageId === 'dashboard') {
        updateDashboard();
    }
    
    // Скрываем модальные окна при переключении страниц
    closeModal();
    closeDeleteConfirm();
    clearSelection();
}

// Резервное копирование БД
async function backupDatabase() {
    try {
        const response = await fetch(`${API_URL}/backup`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `furniture_backup_${new Date().toISOString().split('T')[0]}.db`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showNotification('Резервная копия создана успешно', 'success');
        }
    } catch (error) {
        console.error('Ошибка создания резервной копии:', error);
        showNotification('Ошибка создания резервной копии', 'error');
    }
}

// Импорт данных
async function importData() {
    const fileInput = document.getElementById('import-file');
    if (!fileInput.files.length) {
        showNotification('Пожалуйста, выберите файл для импорта', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_URL}/import`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showNotification('Данные успешно импортированы', 'success');
            await loadData(); // Перезагружаем данные
            fileInput.value = ''; // Сбрасываем выбор файла
        } else {
            const error = await response.json();
            showNotification(`Ошибка импорта: ${error.detail || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка импорта:', error);
        showNotification('Ошибка импорта данных', 'error');
    }
}

// Смена темы
function changeTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

// Загрузка сохраненной темы
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    changeTheme(savedTheme);
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        themeSelector.value = savedTheme;
    }
}

// Печать отчета
function printReport() {
    const printContent = document.getElementById('reports-page').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Отчет - Мебельная компания</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #2e7d32; }
                .report-section { margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .summary { background-color: #f9f9f9; padding: 15px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <h1>Отчет по мебельной компании</h1>
            <p>Дата генерации: ${new Date().toLocaleDateString('ru-RU')}</p>
            ${printContent}
        </body>
        </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    showPage('reports'); // Возвращаемся на страницу отчетов
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    loadTheme();
    await loadData();
    
    // Добавляем CSS для распределения
    const style = document.createElement('style');
    style.textContent = `
        .distribution-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .distribution-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .dist-label {
            flex: 1;
            min-width: 120px;
            font-size: 0.9em;
        }
        .dist-bar-container {
            flex: 2;
            height: 10px;
            background-color: #e0e0e0;
            border-radius: 5px;
            overflow: hidden;
        }
        .dist-bar {
            height: 100%;
            border-radius: 5px;
        }
        .dist-value {
            min-width: 60px;
            text-align: right;
            font-size: 0.9em;
            font-weight: 500;
        }
        
        /* Анимация удаления */
        .slide-out {
            animation: slideOutLeft 0.3s ease forwards;
        }
        
        @keyframes slideOutLeft {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(-100%);
                opacity: 0;
            }
        }
        
        /* Стили для массовых действий */
        .bulk-actions {
            display: flex;
            gap: var(--spacing-md);
            align-items: center;
            margin-bottom: var(--spacing-lg);
            padding: var(--spacing-md);
            background-color: var(--surface-color);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-sm);
        }
        
        .recent-product-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--spacing-sm);
            border-bottom: 1px solid var(--border-color);
        }
        
        .recent-product-item:last-child {
            border-bottom: none;
        }
        
        .recent-product-name {
            font-weight: 500;
        }
        
        .recent-product-price {
            color: var(--primary-color);
            font-weight: 600;
        }
        
        .delete-btn {
            color: var(--error-color);
        }
        
        .delete-btn:hover {
            background-color: rgba(211, 47, 47, 0.1);
        }
    `;
    document.head.appendChild(style);
    
    // Инициализируем кнопки экспорта
    setupReportExportButtons();
    
    // Устанавливаем текущую дату в фильтры отчетов
    const today = new Date().toISOString().split('T')[0];
    const dateFrom = document.getElementById('report-date-from');
    const dateTo = document.getElementById('report-date-to');
    
    if (dateFrom) dateFrom.value = today;
    if (dateTo) dateTo.value = today;
});