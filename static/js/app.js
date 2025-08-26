// Инициализация Telegram Web App
let tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Глобальные переменные
let currentUser = null;
let sportGroups = [];

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    try {
        // Получаем данные пользователя из Telegram
        const userData = tg.initDataUnsafe?.user || {
            id: 123456789, // Тестовый ID для разработки
            username: 'test_user',
            first_name: 'Тестовый',
            last_name: 'Пользователь'
        };

        // Инициализируем пользователя на сервере
        const response = await fetch('/api/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        
        if (result.success) {
            currentUser = result.user;
            showUserPanel();
            loadSportGroups();
            
            // Проверяем авторизацию для родителей
            if (currentUser.role === 'parent') {
                checkAuthorization();
            }
        } else {
            showError('Ошибка инициализации: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Ошибка подключения к серверу');
    }
}

function showUserPanel() {
    if (currentUser.role === 'admin') {
        document.getElementById('adminPanel').style.display = 'block';
    } else {
        document.getElementById('parentPanel').style.display = 'block';
    }
}

async function loadSportGroups() {
    try {
        const response = await fetch('/api/sport-groups');
        const result = await response.json();
        
        if (result.success) {
            sportGroups = result.groups;
            renderSportGroups();
        } else {
            showError('Ошибка загрузки групп: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки групп:', error);
        showError('Ошибка загрузки спортивных групп');
    }
}

function renderSportGroups() {
    const container = document.getElementById('sportGroups');
    
    if (sportGroups.length === 0) {
        container.innerHTML = '<div class="error">Нет доступных групп</div>';
        return;
    }

    container.innerHTML = sportGroups.map(group => `
        <div class="sport-group-card">
            <div class="group-content" onclick="openGroupDetails(${group.id})">
                <h3>${group.name}</h3>
                <p>${group.description}</p>
            </div>
            ${currentUser && currentUser.role === 'admin' ? `
                <div class="group-actions">
                    <button class="btn btn-secondary" onclick="showGroupStudents(${group.id}, '${group.name}')">👥 Ученики</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function openGroupDetails(groupId) {
    // Переходим на страницу с подробной информацией о группе
    window.location.href = `/group/${groupId}?id=${groupId}`;
}



// Функции для модальных окон
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    
    // Загружаем данные для конкретных модальных окон
    if (modalId === 'scheduleModal') {
        loadScheduleData();
    } else if (modalId === 'paymentsModal') {
        loadPaymentsData();
    } else if (modalId === 'studentsModal') {
        loadStudentsData();
    } else if (modalId === 'contactModal') {
        loadContactData();
    } else if (modalId === 'paymentModal') {
        loadPaymentData().then(() => {
            loadFinancialInfo();
        });
    } else if (modalId === 'discountsModal') {
        loadDiscounts();
        toggleDiscountFormForRole();
    } else if (modalId === 'attendanceModal') {
        loadAttendanceGroups();
    } else if (modalId === 'parentAttendanceModal') {
        loadParentAttendance();
    } else if (modalId === 'authorizationModal') {
        loadAuthorizedParticipants();
    } else if (modalId === 'participantsModal') {
        loadParticipantGroups();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}
// Скидки и акции
async function loadDiscounts() {
    try {
        const response = await fetch('/api/discounts');
        const result = await response.json();
        const container = document.getElementById('discountsList');
        if (!container) return;
        if (result.success) {
            if (result.discounts.length === 0) {
                container.innerHTML = '<p>Активных скидок пока нет</p>';
                return;
            }
            container.innerHTML = `
                <h4>Действующие предложения:</h4>
                ${result.discounts.map(d => `
                    <div class="schedule-item">
                        <div class="schedule-day">${d.name} — ${d.discount_percent}%</div>
                        <div class="schedule-time">${d.discount_type}${formatDiscountDates(d)}</div>
                        ${currentUser?.role === 'admin' ? `<div style="margin-top:8px;"><button class="btn btn-secondary" onclick="deleteDiscount(${d.id})">Удалить</button></div>` : ''}
                    </div>
                `).join('')}
            `;
        } else {
            container.innerHTML = '<div class="error">Ошибка загрузки скидок</div>';
        }
    } catch (e) {
        console.error('Ошибка загрузки скидок', e);
        const container = document.getElementById('discountsList');
        if (container) container.innerHTML = '<div class="error">Ошибка загрузки скидок</div>';
    }
}

function formatDiscountDates(d) {
    const parts = [];
    if (d.start_date) parts.push(` c ${d.start_date}`);
    if (d.end_date) parts.push(` по ${d.end_date}`);
    return parts.length ? ` (${parts.join('')})` : '';
}

function toggleDiscountFormForRole() {
    const form = document.getElementById('discountForm');
    if (!form) return;
    if (currentUser && currentUser.role === 'admin') {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

// Отправка формы создания скидки (только админ)
document.getElementById('discountForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('discountName').value,
        description: document.getElementById('discountDescription').value,
        discount_type: document.getElementById('discountTypeAdmin').value,
        discount_percent: parseInt(document.getElementById('discountPercentAdmin').value),
        start_date: document.getElementById('discountStartDate').value || null,
        end_date: document.getElementById('discountEndDate').value || null,
        is_active: true
    };
    try {
        const response = await fetch('/api/admin/discounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            showSuccess('Скидка добавлена');
            this.reset();
            loadDiscounts();
        } else {
            showError('Ошибка добавления: ' + result.error);
        }
    } catch (e) {
        console.error('Ошибка добавления скидки', e);
        showError('Ошибка добавления скидки');
    }
});

async function deleteDiscount(id) {
    if (!confirm('Удалить скидку?')) return;
    try {
        const response = await fetch(`/api/admin/discounts/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            showSuccess('Скидка удалена');
            loadDiscounts();
        } else {
            showError('Ошибка удаления: ' + result.error);
        }
    } catch (e) {
        console.error('Ошибка удаления скидки', e);
        showError('Ошибка удаления скидки');
    }
}

// Закрытие модальных окон при клике вне их
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Загрузка данных для расписания
async function loadScheduleData() {
    try {
        // Заполняем селект группами
        const scheduleGroupSelect = document.getElementById('scheduleGroup');
        scheduleGroupSelect.innerHTML = '<option value="">Выберите группу</option>' +
            sportGroups.map(group => `<option value="${group.id}">${group.name}</option>`).join('');

        // Загружаем текущее расписание
        const response = await fetch('/api/admin/schedule');
        const result = await response.json();
        
        const scheduleList = document.getElementById('scheduleList');
        if (result.success) {
            if (result.schedules.length > 0) {
                scheduleList.innerHTML = `
                    <h4>Текущее расписание:</h4>
                    ${result.schedules.map(s => `
                        <div class="schedule-item">
                            <div class="schedule-day">${s.sport_group_name}</div>
                            <div class="schedule-time">${getDayName(s.day_of_week)} ${s.start_time} - ${s.end_time}</div>
                        </div>
                    `).join('')}
                `;
            } else {
                scheduleList.innerHTML = '<h4>Текущее расписание:</h4><p>Расписание пока не установлено</p>';
            }
        } else {
            scheduleList.innerHTML = '<div class="error">Ошибка загрузки расписания</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки данных расписания:', error);
    }
}

// Загрузка данных для платежей
async function loadPaymentsData() {
    try {
        const response = await fetch('/api/admin/payments');
        const result = await response.json();
        
        const paymentsList = document.getElementById('paymentsList');
        if (result.success) {
            if (result.payments.length > 0) {
                paymentsList.innerHTML = `
                    <h4>Список платежей:</h4>
                    ${result.payments.map(p => `
                        <div class="schedule-item payment-item ${p.status}">
                            <div class="payment-header">
                                <div class="payment-participant">${p.participant_name}</div>
                                <div class="payment-status ${p.status}">${getStatusText(p.status)}</div>
                            </div>
                            <div class="payment-details">
                                <div>📱 ${p.participant_phone}</div>
                                <div>🏃‍♂️ ${p.sport_group} — ${p.subscription_type}</div>
                                <div>💰 ${p.amount} ₽ (${p.payment_method})</div>
                                <div>📅 Создан: ${p.created_at}</div>
                                ${p.payment_date ? `<div>✅ Подтвержден: ${p.payment_date}</div>` : ''}
                                ${p.admin_notes ? `<div>📝 Заметка: ${p.admin_notes}</div>` : ''}
                            </div>
                            ${p.status === 'pending' ? `
                                <div class="payment-actions">
                                    <button class="btn btn-success" onclick="approvePayment(${p.id})">✅ Подтвердить</button>
                                    <button class="btn btn-danger" onclick="rejectPayment(${p.id})">❌ Отклонить</button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                `;
            } else {
                paymentsList.innerHTML = '<p>Платежей пока нет</p>';
            }
        } else {
            paymentsList.innerHTML = '<div class="error">Ошибка загрузки платежей</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки платежей:', error);
        document.getElementById('paymentsList').innerHTML = '<div class="error">Ошибка загрузки платежей</div>';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return '⏳ Ожидает подтверждения';
        case 'approved': return '✅ Подтвержден';
        case 'rejected': return '❌ Отклонен';
        default: return status;
    }
}

async function approvePayment(paymentId) {
    const adminNotes = prompt('Введите заметку (необязательно):');
    
    try {
        const response = await fetch(`/api/admin/payments/${paymentId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ admin_notes: adminNotes || '' })
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Платеж подтвержден');
            loadPaymentsData(); // Перезагружаем список
        } else {
            showError('Ошибка подтверждения: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка подтверждения платежа:', error);
        showError('Ошибка подтверждения платежа');
    }
}

async function rejectPayment(paymentId) {
    const adminNotes = prompt('Введите причину отклонения:');
    if (!adminNotes) {
        showError('Необходимо указать причину отклонения');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/payments/${paymentId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ admin_notes: adminNotes })
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Платеж отклонен');
            loadPaymentsData(); // Перезагружаем список
        } else {
            showError('Ошибка отклонения: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка отклонения платежа:', error);
        showError('Ошибка отклонения платежа');
    }
}

// Показать учеников конкретной группы
async function showGroupStudents(groupId, groupName) {
    try {
        const response = await fetch(`/api/admin/group/${groupId}/students`);
        const result = await response.json();
        
        if (result.success) {
            // Создаем модальное окно для отображения учеников группы
            const modalHtml = `
                <div class="modal" id="groupStudentsModal" style="display: block;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">👥 Ученики группы: ${groupName}</h3>
                            <button class="close-btn" onclick="closeGroupStudentsModal()">&times;</button>
                        </div>
                        <div id="groupStudentsList">
                            ${renderGroupStudents(result.students, groupName)}
                        </div>
                    </div>
                </div>
            `;
            
            // Добавляем модальное окно в body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } else {
            showError('Ошибка загрузки учеников группы: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки учеников группы:', error);
        showError('Ошибка загрузки учеников группы');
    }
}

function closeGroupStudentsModal() {
    const modal = document.getElementById('groupStudentsModal');
    if (modal) {
        modal.remove();
    }
}

function renderGroupStudents(students, groupName) {
    if (students.length === 0) {
        return '<p>В этой группе пока нет учеников с оплаченными подписками</p>';
    }
    
    // Вычисляем статистику группы
    const totalStudents = students.length;
    const totalPaid = students.reduce((sum, student) => sum + student.total_paid, 0);
    const totalRemaining = students.reduce((sum, student) => sum + student.remaining_lessons, 0);
    
    return `
        <div class="group-statistics">
            <h4>📊 Статистика группы "${groupName}":</h4>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-number">${totalStudents}</div>
                    <div class="stat-label">Учеников</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${totalPaid.toLocaleString()} ₽</div>
                    <div class="stat-label">Оплачено</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${totalRemaining}</div>
                    <div class="stat-label">Осталось занятий</div>
                </div>
            </div>
        </div>
        <h4>Список учеников (${students.length}):</h4>
        ${students.map(student => `
            <div class="student-item">
                <div class="student-header">
                    <div class="student-name">${student.participant_name}</div>
                    <div class="student-phone">📱 ${student.parent_phone}</div>
                </div>
                <div class="student-info">
                    <div>📅 Дата рождения: ${student.birth_date}</div>
                    ${student.medical_certificate ? '<div>🏥 Медицинская справка: ✅</div>' : '<div>🏥 Медицинская справка: ❌</div>'}
                    ${student.discount_type ? `<div>🎫 Скидка: ${student.discount_type} (${student.discount_percent}%)</div>` : ''}
                </div>
                <div class="student-financial">
                    <div class="financial-summary">
                        <span>💰 Оплачено: ${student.total_paid} ₽</span>
                        <span>📚 Осталось занятий: <span class="balance-remaining ${getBalanceClass(student.remaining_lessons)}">${student.remaining_lessons}</span></span>
                        <span>📅 Тип абонемента: ${student.subscription_type}</span>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

// Загрузка данных учеников для администратора
async function loadStudentsData() {
    try {
        const response = await fetch('/api/admin/students');
        const result = await response.json();
        const studentsList = document.getElementById('studentsList');
        
        if (result.success) {
            // Фильтруем только учеников с оплаченными подписками
            const studentsWithPaidSubscriptions = result.students.filter(student => student.total_paid_all > 0);
            
            if (studentsWithPaidSubscriptions.length > 0) {
                // Вычисляем общую статистику
                const totalStudents = studentsWithPaidSubscriptions.length;
                const totalPaid = studentsWithPaidSubscriptions.reduce((sum, student) => sum + student.total_paid_all, 0);
                const totalRemaining = studentsWithPaidSubscriptions.reduce((sum, student) => sum + student.total_remaining_all, 0);
                const totalSubscriptions = studentsWithPaidSubscriptions.reduce((sum, student) => sum + student.subscription_count, 0);
                const studentsWithMedical = studentsWithPaidSubscriptions.filter(student => student.medical_certificate).length;
                const studentsWithDiscount = studentsWithPaidSubscriptions.filter(student => student.discount_type).length;
                
                studentsList.innerHTML = `
                    <div class="statistics-summary">
                        <h4>📊 Общая статистика:</h4>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-number">${totalStudents}</div>
                                <div class="stat-label">Всего учеников</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${totalPaid.toLocaleString()} ₽</div>
                                <div class="stat-label">Общая оплата</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${totalRemaining}</div>
                                <div class="stat-label">Осталось занятий</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${totalSubscriptions}</div>
                                <div class="stat-label">Активных подписок</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${studentsWithMedical}</div>
                                <div class="stat-label">С мед. справкой</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${studentsWithDiscount}</div>
                                <div class="stat-label">Со скидкой</div>
                            </div>
                        </div>
                    </div>
                    <h4>Список учеников с оплаченными подписками (${studentsWithPaidSubscriptions.length}):</h4>
                    ${studentsWithPaidSubscriptions.map(student => `
                        <div class="student-item">
                            <div class="student-header">
                                <div class="student-name">${student.participant_name}</div>
                                <div class="student-phone">📱 ${student.parent_phone}</div>
                            </div>
                            <div class="student-info">
                                <div>📅 Дата рождения: ${student.birth_date}</div>
                                ${student.medical_certificate ? '<div>🏥 Медицинская справка: ✅</div>' : '<div>🏥 Медицинская справка: ❌</div>'}
                                ${student.discount_type ? `<div>🎫 Скидка: ${student.discount_type} (${student.discount_percent}%)</div>` : ''}
                            </div>
                            <div class="student-financial">
                                <div class="financial-summary">
                                    <span>💰 Всего оплачено: ${student.total_paid_all} ₽</span>
                                    <span>📚 Осталось занятий: <span class="balance-remaining ${getBalanceClass(student.total_remaining_all)}">${student.total_remaining_all}</span></span>
                                    <span>📋 Подписок: ${student.subscription_count}</span>
                                </div>
                                ${student.subscriptions.length > 0 ? `
                                    <div class="subscriptions-list">
                                        <h5>Подписки:</h5>
                                        ${student.subscriptions.map(sub => `
                                            <div class="subscription-item">
                                                <div class="subscription-header">
                                                    <div>🏃‍♂️ ${sub.sport_group_name} — ${sub.subscription_type}</div>
                                                    <button class="btn btn-danger btn-small" onclick="deleteSubscription(${sub.subscription_id}, '${student.participant_name}', '${sub.sport_group_name}')">🗑️</button>
                                                </div>
                                                <div>💰 Оплачено: ${sub.total_paid} ₽ | Осталось: <span class="balance-remaining ${getBalanceClass(sub.remaining_lessons)}">${sub.remaining_lessons}</span></div>
                                                <div>📅 ${sub.start_date} — ${sub.end_date}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : '<div class="no-subscriptions">Нет активных подписок</div>'}
                            </div>
                        </div>
                    `).join('')}
                `;
            } else {
                studentsList.innerHTML = '<p>Учеников с оплаченными подписками пока нет</p>';
            }
        } else {
            studentsList.innerHTML = '<div class="error">Ошибка загрузки учеников</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки учеников:', error);
        document.getElementById('studentsList').innerHTML = '<div class="error">Ошибка загрузки учеников</div>';
    }
}

// Загрузка контактных данных
async function loadContactData() {
    try {
        const response = await fetch('/api/parent/contact');
        const result = await response.json();
        
        const contactInfo = document.getElementById('contactInfo');
        if (result.success) {
            contactInfo.innerHTML = `
                <div>
                    <h4>Контактная информация:</h4>
                    <p><strong>Телефон:</strong> ${result.contact_info.phone}</p>
                    <p><strong>Email:</strong> ${result.contact_info.email}</p>
                    <p><strong>Адрес:</strong> ${result.contact_info.address}</p>
                    
                    <div style="margin-top: 20px;">
                        <button class="btn" onclick="window.open('tel:${result.contact_info.phone}')">
                            📞 Позвонить
                        </button>
                        <button class="btn btn-secondary" onclick="window.open('mailto:${result.contact_info.email}')">
                            ✉️ Написать email
                        </button>
                    </div>
                </div>
            `;
        } else {
            contactInfo.innerHTML = '<div class="error">Ошибка загрузки контактов</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки контактов:', error);
        document.getElementById('contactInfo').innerHTML = '<div class="error">Ошибка загрузки контактов</div>';
    }
}

// Загрузка данных для оплаты
async function loadPaymentData() {
    // Загружаем авторизованных участников
    try {
        const response = await fetch('/api/auth/participants');
        const result = await response.json();
        
        const participantSelect = document.getElementById('paymentParticipant');
        participantSelect.innerHTML = '<option value="">Выберите участника</option>';
        
        if (result.success && result.participants.length > 0) {
            result.participants.forEach(participant => {
                participantSelect.innerHTML += `<option value="${participant.id}">${participant.full_name}</option>`;
            });
        } else {
            participantSelect.innerHTML = '<option value="">Нет авторизованных участников</option>';
        }
    } catch (error) {
        console.error('Ошибка загрузки участников:', error);
        document.getElementById('paymentParticipant').innerHTML = '<option value="">Ошибка загрузки участников</option>';
    }
    
    const paymentGroupSelect = document.getElementById('paymentGroup');
    paymentGroupSelect.innerHTML = '<option value="">Выберите группу</option>' +
        sportGroups.map(group => `<option value="${group.id}">${group.name}</option>`).join('');
    
    // Обработчик изменения группы для расчета стоимости
    paymentGroupSelect.addEventListener('change', function() {
        const groupId = this.value;
        const subscriptionType = document.getElementById('subscriptionType').value;
        calculatePayment(groupId, subscriptionType);
    });
    
    // Обработчик изменения типа абонемента
    document.getElementById('subscriptionType').addEventListener('change', function() {
        const groupId = document.getElementById('paymentGroup').value;
        const subscriptionType = this.value;
        calculatePayment(groupId, subscriptionType);
    });
}

// Расчет стоимости оплаты
function calculatePayment(groupId, subscriptionType) {
    const group = sportGroups.find(g => g.id == groupId);
    if (!group) return;
    
    let amount = 0;
    switch (subscriptionType) {
        case '8 занятий':
            amount = group.price_8;
            break;
        case '12 занятий':
            amount = group.price_12;
            break;
        case 'Разовые занятия':
            amount = group.price_single;
            break;
    }
    
    document.getElementById('paymentAmount').value = amount;
}

// Обработчики форм
document.getElementById('participantForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        full_name: document.getElementById('fullName').value,
        parent_phone: document.getElementById('parentPhone').value,
        birth_date: document.getElementById('birthDate').value,
        sport_group_id: parseInt(document.getElementById('participantGroup').value),
        medical_certificate: document.getElementById('medicalCertificate').checked,
        discount_type: document.getElementById('discountType').value,
        discount_percent: parseInt(document.getElementById('discountPercent').value) || 0
    };
    
    try {
        const response = await fetch('/api/admin/participants', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        if (result.success) {
            if (result.authorization_code) {
                showSuccess(`Участник успешно зарегистрирован! Код авторизации: ${result.authorization_code}`);
            } else {
                showSuccess('Участник успешно зарегистрирован');
            }
            this.reset();
            closeModal('participantsModal');
        } else {
            showError('Ошибка регистрации: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка регистрации участника:', error);
        showError('Ошибка регистрации участника');
    }
});

document.getElementById('scheduleForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        sport_group_id: parseInt(document.getElementById('scheduleGroup').value),
        day_of_week: parseInt(document.getElementById('dayOfWeek').value),
        start_time: document.getElementById('startTime').value,
        end_time: document.getElementById('endTime').value
    };
    
    try {
        const response = await fetch('/api/admin/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Расписание успешно добавлено');
            this.reset();
            loadScheduleData(); // Перезагружаем список расписания
        } else {
            showError('Ошибка добавления расписания: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка добавления расписания:', error);
        showError('Ошибка добавления расписания');
    }
});

document.getElementById('paymentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const participantId = document.getElementById('paymentParticipant').value;
    if (!participantId) {
        showError('Пожалуйста, выберите участника');
        return;
    }
    
    const formData = {
        participant_id: parseInt(participantId),
        sport_group_id: parseInt(document.getElementById('paymentGroup').value),
        subscription_type: document.getElementById('subscriptionType').value,
        total_lessons: getLessonsCount(document.getElementById('subscriptionType').value),
        amount: parseInt(document.getElementById('paymentAmount').value),
        payment_method: document.getElementById('paymentMethod').value
    };
    
    try {
        const response = await fetch('/api/parent/payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess(result.message || 'Платеж успешно создан и ожидает подтверждения администратора');
            this.reset();
            closeModal('paymentModal');
        } else {
            showError('Ошибка создания платежа: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка создания платежа:', error);
        showError('Ошибка создания платежа');
    }
});

document.getElementById('transferForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        subscription_id: 1, // В реальном приложении нужно выбирать из списка подписок
        original_date: document.getElementById('originalDate').value,
        new_date: document.getElementById('newDate').value,
        reason: document.getElementById('transferReason').value
    };
    
    try {
        const response = await fetch('/api/parent/transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Запрос на перенос отправлен');
            this.reset();
            closeModal('transferModal');
        } else {
            showError('Ошибка отправки запроса: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка отправки запроса на перенос:', error);
        showError('Ошибка отправки запроса на перенос');
    }
});

// Вспомогательные функции
function getDayName(dayOfWeek) {
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    return days[dayOfWeek] || 'Неизвестный день';
}

function getLessonsCount(subscriptionType) {
    switch (subscriptionType) {
        case '8 занятий': return 8;
        case '12 занятий': return 12;
        case 'Разовые занятия': return 1;
        default: return 1;
    }
}

function showSuccess(message) {
    tg.showAlert(message);
}

function showError(message) {
    tg.showAlert(message);
}

// ===== ФУНКЦИИ ДЛЯ СИСТЕМЫ ПОСЕЩАЕМОСТИ =====

// Глобальные переменные для посещаемости
let currentAttendanceGroup = null;
let currentAttendanceDate = null;
let currentAttendanceId = null;

// Инициализация модальных окон посещаемости
// Обработчики будут добавлены при открытии модальных окон

// Загрузка групп для учета посещаемости (админ)
async function loadAttendanceGroups() {
    try {
        const response = await fetch('/api/admin/attendance/groups');
        const result = await response.json();
        
        if (result.success) {
            renderAttendanceGroups(result.groups);
        } else {
            showError('Ошибка загрузки групп: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки групп посещаемости:', error);
        showError('Ошибка загрузки групп');
    }
}

// Отображение групп для учета посещаемости
function renderAttendanceGroups(groups) {
    const container = document.getElementById('attendanceContent');
    
    if (groups.length === 0) {
        container.innerHTML = '<div class="error">Нет доступных групп</div>';
        return;
    }

    container.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h4 style="margin-bottom: 12px; color: #ffffff;">Выберите группу для учета посещаемости:</h4>
        </div>
        ${groups.map(group => `
            <div class="attendance-group">
                <div onclick="selectAttendanceGroup(${group.id}, '${group.name}')" style="cursor: pointer;">
                    <h4 style="margin-bottom: 4px; color: #ffffff;">${group.name}</h4>
                    <p style="color: #9ca3af; font-size: 13px;">${group.description}</p>
                </div>
                <div style="margin-top: 8px;">
                    <button class="btn btn-secondary" onclick="loadAttendanceStats(${group.id})" style="font-size: 12px; padding: 6px 12px;">
                        📊 Статистика
                    </button>
                </div>
            </div>
        `).join('')}
    `;
}

// Выбор группы для учета посещаемости
async function selectAttendanceGroup(groupId, groupName) {
    currentAttendanceGroup = { id: groupId, name: groupName };
    
    try {
        const response = await fetch(`/api/admin/attendance/schedule/${groupId}`);
        const result = await response.json();
        
        if (result.success) {
            renderAttendanceDates(result.dates, groupName);
            closeModal('attendanceModal');
            showModal('attendanceDateModal');
        } else {
            showError('Ошибка загрузки расписания: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки расписания посещаемости:', error);
        showError('Ошибка загрузки расписания');
    }
}

// Отображение дат для учета посещаемости
function renderAttendanceDates(dates, groupName) {
    const container = document.getElementById('attendanceDatesList');
    
    if (dates.length === 0) {
        container.innerHTML = '<div class="error">Нет запланированных занятий</div>';
        return;
    }

    container.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h4 style="margin-bottom: 8px; color: #ffffff;">${groupName}</h4>
            <p style="color: #9ca3af; font-size: 13px; margin-bottom: 12px;">Выберите дату занятия:</p>
        </div>
        ${dates.map(date => `
            <div class="attendance-date ${date.has_attendance ? (date.is_completed ? 'completed' : 'pending') : ''}" 
                 onclick="selectAttendanceDate('${date.date}', '${date.day_name} ${date.day_number} ${date.month} ${date.year}')">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: #ffffff;">${date.day_name} ${date.day_number} ${date.month}</div>
                        <div style="font-size: 12px; color: #9ca3af;">${date.start_time} - ${date.end_time}</div>
                    </div>
                    <div style="font-size: 12px; color: #9ca3af;">
                        ${date.has_attendance ? (date.is_completed ? '✅ Завершено' : '⏳ Ожидает') : '📝 Новое'}
                    </div>
                </div>
            </div>
        `).join('')}
        <div style="margin-top: 20px;">
            <button class="btn btn-secondary" onclick="loadAttendanceStats(${currentAttendanceGroup.id})">
                📊 Просмотреть статистику группы
            </button>
        </div>
    `;
}

// Выбор даты для учета посещаемости
async function selectAttendanceDate(date, dateDisplay) {
    currentAttendanceDate = { date: date, display: dateDisplay };
    
    try {
        const response = await fetch(`/api/admin/attendance/participants/${currentAttendanceGroup.id}/${date}`);
        const result = await response.json();
        
        if (result.success) {
            currentAttendanceId = result.attendance_id;
            renderAttendanceParticipants(result.participants, dateDisplay, result.is_completed);
            closeModal('attendanceDateModal');
            showModal('attendanceRecordModal');
        } else {
            showError('Ошибка загрузки участников: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки участников:', error);
        showError('Ошибка загрузки участников');
    }
}

// Отображение участников для учета посещаемости
function renderAttendanceParticipants(participants, dateDisplay, isCompleted) {
    const container = document.getElementById('attendanceRecordContent');
    
    if (participants.length === 0) {
        container.innerHTML = '<div class="error">Нет участников в группе</div>';
        return;
    }

    container.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h4 style="margin-bottom: 8px; color: #ffffff;">${currentAttendanceGroup.name}</h4>
            <p style="color: #9ca3af; font-size: 13px; margin-bottom: 12px;">${dateDisplay}</p>
        </div>
        ${participants.map(participant => `
            <div class="participant-item" data-participant-id="${participant.id}">
                <div class="participant-info">
                    <div class="participant-name">${participant.full_name}</div>
                    <div class="participant-phone">${participant.parent_phone}</div>
                </div>
                <div class="attendance-controls">
                    <div class="attendance-toggle">
                        <div class="toggle-switch ${participant.is_present ? 'active' : ''}" 
                             onclick="toggleAttendance(${participant.id}, this)">
                        </div>
                        <span class="attendance-status ${participant.is_present ? 'present' : 'absent'}">
                            ${participant.is_present ? 'Присутствует' : 'Отсутствует'}
                        </span>
                    </div>
                    <div class="absence-reason" style="display: ${participant.is_present ? 'none' : 'block'}; margin-top: 8px;">
                        <select class="reason-select" onchange="updateAbsenceReason(${participant.id}, this.value)">
                            <option value="unexcused">Без уважительной причины</option>
                            <option value="excused">По уважительной причине</option>
                        </select>
                    </div>
                </div>
            </div>
        `).join('')}
        <div style="margin-top: 20px;">
            <button class="btn" onclick="saveAttendance()" ${isCompleted ? 'disabled' : ''}>
                ${isCompleted ? 'Посещаемость уже сохранена' : 'Сохранить посещаемость'}
            </button>
        </div>
    `;
}

// Переключение статуса посещаемости
function toggleAttendance(participantId, element) {
    const toggle = element;
    const statusElement = toggle.nextElementSibling;
    const participantItem = toggle.closest('.participant-item');
    const absenceReason = participantItem.querySelector('.absence-reason');
    
    toggle.classList.toggle('active');
    const isPresent = toggle.classList.contains('active');
    
    statusElement.textContent = isPresent ? 'Присутствует' : 'Отсутствует';
    statusElement.className = `attendance-status ${isPresent ? 'present' : 'absent'}`;
    
    // Показываем/скрываем выбор причины отсутствия
    if (absenceReason) {
        absenceReason.style.display = isPresent ? 'none' : 'block';
    }
}

// Обновление причины отсутствия
function updateAbsenceReason(participantId, reason) {
    // Сохраняем причину в data-атрибуте элемента
    const participantItem = document.querySelector(`[data-participant-id="${participantId}"]`);
    if (participantItem) {
        participantItem.setAttribute('data-absence-reason', reason);
    }
}

// Удаление подписки
async function deleteSubscription(subscriptionId, participantName, groupName) {
    if (!confirm(`Вы уверены, что хотите удалить подписку ${participantName} в группе "${groupName}"? Это действие нельзя отменить.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/subscription/${subscriptionId}/delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Подписка успешно удалена');
            // Перезагружаем данные
            if (currentAttendanceGroup) {
                showGroupStudents(currentAttendanceGroup.id, currentAttendanceGroup.name);
            } else {
                loadStudentsData();
            }
        } else {
            showError('Ошибка удаления подписки: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка удаления подписки:', error);
        showError('Ошибка удаления подписки');
    }
}

// Сохранение посещаемости
async function saveAttendance() {
    const participants = [];
    const participantItems = document.querySelectorAll('.participant-item');
    
    participantItems.forEach(item => {
        const participantId = parseInt(item.querySelector('.toggle-switch').getAttribute('onclick').match(/\d+/)[0]);
        const isPresent = item.querySelector('.toggle-switch').classList.contains('active');
        const absenceReason = item.getAttribute('data-absence-reason') || 'unexcused';
        
        participants.push({
            id: participantId,
            is_present: isPresent,
            absence_reason: isPresent ? null : absenceReason
        });
    });
    
    try {
        const response = await fetch('/api/admin/attendance/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                attendance_id: currentAttendanceId,
                participants: participants
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Посещаемость сохранена! Уведомления отправлены родителям.');
            closeModal('attendanceRecordModal');
            // Возвращаемся к списку дат
            selectAttendanceGroup(currentAttendanceGroup.id, currentAttendanceGroup.name);
        } else {
            showError('Ошибка сохранения посещаемости: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка сохранения посещаемости:', error);
        showError('Ошибка сохранения посещаемости');
    }
}

// Загрузка статистики посещаемости группы
async function loadAttendanceStats(groupId) {
    try {
        // Если мы не в контексте выбора группы, нужно получить информацию о группе
        if (!currentAttendanceGroup || currentAttendanceGroup.id !== groupId) {
            const groupResponse = await fetch('/api/admin/attendance/groups');
            const groupResult = await groupResponse.json();
            if (groupResult.success) {
                const group = groupResult.groups.find(g => g.id === groupId);
                if (group) {
                    currentAttendanceGroup = { id: groupId, name: group.name };
                }
            }
        }
        
        const response = await fetch(`/api/admin/attendance/stats/${groupId}`);
        const result = await response.json();
        
        if (result.success) {
            renderAttendanceStats(result.stats);
            closeModal('attendanceModal');
            closeModal('attendanceDateModal');
            showModal('attendanceStatsModal');
        } else {
            showError('Ошибка загрузки статистики: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        showError('Ошибка загрузки статистики');
    }
}

// Отображение статистики посещаемости
function renderAttendanceStats(stats) {
    const container = document.getElementById('attendanceStatsContent');
    
    if (stats.length === 0) {
        container.innerHTML = '<div class="error">Нет данных о посещаемости</div>';
        return;
    }

    container.innerHTML = `
        <div style="margin-bottom: 16px;">
            <button class="back-btn" onclick="closeModal('attendanceStatsModal'); showModal('attendanceModal');">
                ← Назад к группам
            </button>
            <h4 style="margin-bottom: 8px; color: #ffffff;">Статистика посещаемости</h4>
            <p style="color: #9ca3af; font-size: 13px; margin-bottom: 12px;">${currentAttendanceGroup.name}</p>
        </div>
        ${stats.map(stat => {
            const percentageClass = stat.percentage >= 80 ? 'high' : stat.percentage >= 60 ? 'medium' : 'low';
            return `
                <div class="stats-item">
                    <div class="stats-header">
                        <div class="stats-date">${stat.day_name} ${new Date(stat.date).toLocaleDateString('ru-RU')}</div>
                        <div class="stats-percentage ${percentageClass}">${stat.percentage}%</div>
                    </div>
                    <div class="stats-details">
                        <span>Всего: ${stat.total}</span>
                        <span>Присутствовало: ${stat.present}</span>
                        <span>Отсутствовало: ${stat.absent}</span>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

// Загрузка посещаемости для родителя
async function loadParentAttendance() {
    try {
        // Получаем список участников пользователя
        const response = await fetch('/api/participants');
        const result = await response.json();
        
        if (result.success && result.participants.length > 0) {
            renderParentAttendanceParticipants(result.participants);
        } else {
            document.getElementById('parentAttendanceContent').innerHTML = 
                '<div class="error">У вас нет зарегистрированных участников</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки участников родителя:', error);
        showError('Ошибка загрузки данных');
    }
}

// Отображение участников для родителя
function renderParentAttendanceParticipants(participants) {
    const container = document.getElementById('parentAttendanceContent');
    
    container.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h4 style="margin-bottom: 8px; color: #ffffff;">Выберите участника для просмотра посещаемости:</h4>
        </div>
        ${participants.map(participant => `
            <div class="attendance-group" onclick="loadParticipantAttendance(${participant.id}, '${participant.full_name}')">
                <h4 style="margin-bottom: 4px; color: #ffffff;">${participant.full_name}</h4>
                <p style="color: #9ca3af; font-size: 13px;">Нажмите для просмотра посещаемости</p>
            </div>
        `).join('')}
    `;
}

// Загрузка посещаемости конкретного участника
async function loadParticipantAttendance(participantId, participantName) {
    try {
        const response = await fetch(`/api/parent/attendance/${participantId}`);
        const result = await response.json();
        
        if (result.success) {
            renderParticipantAttendance(result.stats, participantName);
            closeModal('parentAttendanceModal');
            showModal('attendanceStatsModal');
        } else {
            showError('Ошибка загрузки посещаемости: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки посещаемости участника:', error);
        showError('Ошибка загрузки посещаемости');
    }
}

// Отображение посещаемости участника
function renderParticipantAttendance(stats, participantName) {
    const container = document.getElementById('attendanceStatsContent');
    
    if (stats.length === 0) {
        container.innerHTML = '<div class="error">Нет данных о посещаемости</div>';
        return;
    }

    container.innerHTML = `
        <div style="margin-bottom: 16px;">
            <button class="back-btn" onclick="closeModal('attendanceStatsModal'); showModal('parentAttendanceModal');">
                ← Назад к участникам
            </button>
            <h4 style="margin-bottom: 8px; color: #ffffff;">Посещаемость</h4>
            <p style="color: #9ca3af; font-size: 13px; margin-bottom: 12px;">${participantName}</p>
        </div>
        ${stats.map(stat => `
            <div class="stats-item">
                <div class="stats-header">
                    <div class="stats-date">${stat.day_name} ${new Date(stat.date).toLocaleDateString('ru-RU')}</div>
                    <div class="attendance-status ${stat.is_present ? 'present' : 'absent'}">
                        ${stat.is_present ? '✅ Присутствовал' : '❌ Отсутствовал'}
                    </div>
                </div>
                <div class="stats-details">
                    <span>Группа: ${stat.sport_group}</span>
                    <span>Время: ${stat.start_time} - ${stat.end_time}</span>
                </div>
            </div>
        `).join('')}
    `;
}

// ===== ФУНКЦИИ ДЛЯ АВТОРИЗАЦИИ =====

// Загрузка авторизованных участников
async function loadAuthorizedParticipants() {
    try {
        const response = await fetch('/api/auth/participants');
        const result = await response.json();
        
        const container = document.getElementById('authorizedParticipants');
        if (result.success) {
            if (result.participants.length > 0) {
                container.innerHTML = `
                    <h4 style="margin-bottom: 8px; color: #ffffff;">Ваши авторизованные участники:</h4>
                    ${result.participants.map(participant => `
                        <div class="authorized-participant">
                            <h5>${participant.full_name}</h5>
                            <p>Телефон: ${participant.parent_phone}</p>
                            <p>Авторизован: ${participant.authorized_at}</p>
                        </div>
                    `).join('')}
                `;
                
                // Показываем кнопки оплаты и посещаемости
                showAuthorizedButtons();
            } else {
                container.innerHTML = `
                    <h4 style="margin-bottom: 8px; color: #ffffff;">Ваши авторизованные участники:</h4>
                    <p style="color: #9ca3af;">У вас пока нет авторизованных участников</p>
                `;
                
                // Скрываем кнопки оплаты и посещаемости
                hideAuthorizedButtons();
            }
        } else {
            container.innerHTML = '<div class="error">Ошибка загрузки участников</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки авторизованных участников:', error);
        document.getElementById('authorizedParticipants').innerHTML = '<div class="error">Ошибка загрузки данных</div>';
    }
}

// Показать кнопки для авторизованных пользователей
function showAuthorizedButtons() {
    const paymentBtn = document.getElementById('paymentBtn');
    const attendanceBtn = document.getElementById('attendanceBtn');
    const transferBtn = document.getElementById('transferBtn');
    
    if (paymentBtn) paymentBtn.style.display = 'inline-block';
    if (attendanceBtn) attendanceBtn.style.display = 'inline-block';
    if (transferBtn) transferBtn.style.display = 'inline-block';
}

// Скрыть кнопки для авторизованных пользователей
function hideAuthorizedButtons() {
    const paymentBtn = document.getElementById('paymentBtn');
    const attendanceBtn = document.getElementById('attendanceBtn');
    const transferBtn = document.getElementById('transferBtn');
    
    if (paymentBtn) paymentBtn.style.display = 'none';
    if (attendanceBtn) attendanceBtn.style.display = 'none';
    if (transferBtn) transferBtn.style.display = 'none';
}

// Обработчик формы авторизации
document.getElementById('authorizationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const code = document.getElementById('authCode').value.trim();
    
    if (code.length !== 6) {
        showError('Код должен содержать 6 цифр');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: code })
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess(result.message);
            this.reset();
            loadAuthorizedParticipants(); // Перезагружаем список участников
        } else {
            showError('Ошибка авторизации: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        showError('Ошибка авторизации');
    }
});

// Проверка авторизации при загрузке приложения
async function checkAuthorization() {
    try {
        const response = await fetch('/api/auth/participants');
        const result = await response.json();
        
        if (result.success && result.participants.length > 0) {
            showAuthorizedButtons();
        } else {
            hideAuthorizedButtons();
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        hideAuthorizedButtons();
    }
}

// Загрузка групп для регистрации участников
function loadParticipantGroups() {
    const participantGroupSelect = document.getElementById('participantGroup');
    if (participantGroupSelect && sportGroups.length > 0) {
        participantGroupSelect.innerHTML = '<option value="">Выберите группу</option>' +
            sportGroups.map(group => `<option value="${group.id}">${group.name}</option>`).join('');
    }
}

// ===== ФУНКЦИИ ДЛЯ УЧЕТА ФИНАНСОВ =====

// Загрузка финансовой информации для родителя
async function loadFinancialInfo() {
    try {
        const response = await fetch('/api/parent/financial-info');
        const result = await response.json();
        
        const container = document.getElementById('financialInfo');
        if (result.success) {
            if (result.financial_data.length > 0) {
                container.innerHTML = `
                    <h4 style="margin-bottom: 12px; color: #ffffff;">Финансовая информация:</h4>
                    ${result.financial_data.map(participant => `
                        <div class="financial-info">
                            <div class="financial-header">
                                <div class="participant-name">${participant.participant_name}</div>
                            </div>
                            ${participant.subscriptions.map(subscription => `
                                <div class="balance-info">
                                    <span>Группа: ${subscription.sport_group_name}</span>
                                    <span>Тип: ${subscription.subscription_type}</span>
                                    <span>Осталось: <span class="balance-remaining ${getBalanceClass(subscription.remaining_lessons)}">${subscription.remaining_lessons}</span></span>
                                    <span>Оплачено: ${subscription.total_paid} ₽</span>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                `;
            } else {
                container.innerHTML = `
                    <h4 style="margin-bottom: 12px; color: #ffffff;">Финансовая информация:</h4>
                    <p style="color: #9ca3af;">Нет данных о подписках</p>
                `;
            }
        } else {
            container.innerHTML = '<div class="error">Ошибка загрузки финансовой информации</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки финансовой информации:', error);
        document.getElementById('financialInfo').innerHTML = '<div class="error">Ошибка загрузки данных</div>';
    }
}

// Получить CSS класс для баланса
function getBalanceClass(remaining) {
    if (remaining <= 1) return 'low';
    if (remaining <= 3) return 'medium';
    return 'high';
}

// Проверка низкого баланса (для администратора)
async function checkLowBalance() {
    try {
        const response = await fetch('/api/admin/check-low-balance');
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`Проверка завершена! Отправлено ${result.notifications_sent} уведомлений. Найдено ${result.low_balance_count} участников с низким балансом.`);
        } else {
            showError('Ошибка проверки балансов: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка проверки балансов:', error);
        showError('Ошибка проверки балансов');
    }
}

// Загрузка участников группы с финансовой информацией (для администратора)
async function loadGroupParticipants(groupId) {
    try {
        const response = await fetch(`/api/admin/group/${groupId}/participants`);
        const result = await response.json();
        
        if (result.success) {
            return result.participants;
        } else {
            showError('Ошибка загрузки участников группы: ' + result.error);
            return [];
        }
    } catch (error) {
        console.error('Ошибка загрузки участников группы:', error);
        showError('Ошибка загрузки участников группы');
        return [];
    }
}

// Обновляем функцию openGroupDetails для отображения участников
async function openGroupDetails(groupId) {
    try {
        // Получаем участников группы
        const participants = await loadGroupParticipants(groupId);
        
        // Переходим на страницу с подробной информацией о группе
        window.location.href = `/group/${groupId}?id=${groupId}`;
        
        // Сохраняем данные участников в localStorage для использования на странице группы
        localStorage.setItem('groupParticipants', JSON.stringify(participants));
    } catch (error) {
        console.error('Ошибка загрузки данных группы:', error);
        window.location.href = `/group/${groupId}?id=${groupId}`;
    }
}
