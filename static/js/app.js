// Инициализация Telegram Web App
let tg = null;
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
} else {
    console.log('Telegram Web App not available, running in browser mode');
    // Создаем заглушку для функций Telegram
    tg = {
        showAlert: function(message) { alert(message); },
        showConfirm: function(message) { return confirm(message); },
        showPopup: function(message) { alert(message); },
        expand: function() {},
        ready: function() {}
    };
}

// Глобальные переменные
let currentUser = null;
let sportGroups = [];

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});



async function initApp() {
    try {
        // Получаем данные пользователя из Telegram или используем тестовые данные
        let userData;
        if (window.Telegram && window.Telegram.WebApp && tg.initDataUnsafe?.user) {
            userData = tg.initDataUnsafe.user;
        } else {
            userData = {
                id: 123456789,
                username: 'test_user',
                first_name: 'Тестовый',
                last_name: 'Пользователь'
            };
        }

        const response = await fetch('/api/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (result.success) {
            currentUser = result.user;

            showUserPanel();
            await loadSportGroups();
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
    if (!currentUser) return;
    if (currentUser.role === 'admin') {
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) adminPanel.style.display = 'block';
    } else {
        const parentPanel = document.getElementById('parentPanel');
        if (parentPanel) parentPanel.style.display = 'block';
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

// Рендер направлений (категорий) на главной
function renderDirections() {
    const container = document.getElementById('sportGroups');
    const directions = [
        { key: 'gymnastics', title: 'Гимнастика от 3х лет' },
        { key: 'judo', title: 'Дзюдо от 4х лет' },
        { key: 'mma', title: 'ММА от 14 лет' },
        { key: 'fitness', title: 'Женский фитнес от 18 лет' }
    ];
    const html = directions.map(d => {
        return `
            <div class="sport-group-card direction-card" onclick="openCategory('${d.key}')">
                <div class="group-content">
                    <h3>${d.title}</h3>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// Открыть категорию и показать входящие группы
function openCategory(category) {
    const container = document.getElementById('sportGroups');
    const groups = sportGroups.filter(g => g.category === category);
    const titleMap = { gymnastics: 'Гимнастика', judo: 'Дзюдо', mma: 'ММА', fitness: 'Женский фитнес' };
    let html = `
        <div class="category-header">
            <button class="btn secondary" onclick="renderDirections()">← Назад</button>
            <h2 class="category-title">${titleMap[category] || ''}</h2>
        </div>
        <div class="category-groups">
    `;

    html += groups.map(group => `
        <div class="sport-group-card">
            <div class="group-content" onclick="openGroupDetails(${group.id})">
                <h3>${group.name}</h3>
                <p>${group.description || ''}</p>
                ${group.schedule ? `<div class="schedule-info"><strong>Расписание:</strong> ${group.schedule}</div>` : ''}
                <div class="prices">
                    ${group.price_8 ? `<span class="price-tag">8 занятий: ${group.price_8} ₽</span>` : ''}
                    ${group.price_12 ? `<span class="price-tag">12 занятий: ${group.price_12} ₽</span>` : ''}
                    ${group.price_single ? `<span class="price-tag">Разовое: ${group.price_single} ₽</span>` : ''}
                </div>
            </div>
            ${currentUser && currentUser.role === 'admin' ? `
                <div class="group-actions">
                    <button class="btn btn-secondary" onclick="showGroupStudents(${group.id}, '${group.name}')">👥 Ученики</button>
                    <button class="btn btn-secondary" onclick="openGroupAttendance(${group.id}, '${group.name}')">📝 Посещаемость</button>
                    <button class="btn btn-secondary" onclick="openPaymentsForGroup(${group.id}, '${group.name}')">💰 Платежи</button>
                </div>
            ` : ''}
        </div>
    `).join('');

    html += '</div>';
    container.innerHTML = html;
}

// Переопределяем рендер групп: на главной показываем направления
function renderSportGroups() {
    if (!Array.isArray(sportGroups) || sportGroups.length === 0) {
        document.getElementById('sportGroups').innerHTML = '<div class="error">Нет доступных направлений</div>';
        return;
    }
    renderDirections();
}

// Остальной код без изменений ниже
// ... existing code ...

// ===== Админ: просмотр учеников группы =====
async function showGroupStudents(groupId, groupName) {
    try {
        const response = await fetch(`/api/admin/group/${groupId}/students`);
        const result = await response.json();
        if (!result.success) {
            showError('Ошибка загрузки учеников группы: ' + (result.error || ''));
            return;
        }
        const modalHtml = `
            <div class="modal" id="groupStudentsModal" style="display: block;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">👥 Ученики группы: ${groupName}</h3>
                        <button class="close-btn" onclick="closeGroupStudentsModal()">&times;</button>
                    </div>
                    <div class="modal-body" id="groupStudentsList">
                        ${renderGroupStudents(result.students, groupName)}
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (e) {
        console.error('Ошибка загрузки учеников группы:', e);
        showError('Ошибка загрузки учеников группы');
    }
}

function closeGroupStudentsModal() {
    const modal = document.getElementById('groupStudentsModal');
    if (modal) modal.remove();
}

function renderGroupStudents(students, groupName) {
    if (!Array.isArray(students) || students.length === 0) {
        return '<p>В этой группе пока нет учеников с оплаченными подписками</p>';
    }
    const totalStudents = students.length;
    const totalPaid = students.reduce((sum, s) => sum + (s.total_paid || 0), 0);
    const totalRemaining = students.reduce((sum, s) => sum + (s.remaining_lessons || 0), 0);
    return `
        <div class="group-statistics">
            <h4>📊 Статистика группы "${groupName}":</h4>
            <div class="stats-grid">
                <div class="stat-item"><div class="stat-number">${totalStudents}</div><div class="stat-label">Учеников</div></div>
                <div class="stat-item"><div class="stat-number">${totalPaid.toLocaleString()} ₽</div><div class="stat-label">Оплачено</div></div>
                <div class="stat-item"><div class="stat-number">${totalRemaining}</div><div class="stat-label">Осталось занятий</div></div>
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
                    ${student.authorization_code ? `<div>🔐 Код для авторизации: <strong>${student.authorization_code}</strong></div>` : ''}
                </div>
                <div class="student-financial">
                    <div class="financial-summary">
                        <span>💰 Оплачено: ${student.total_paid || 0} ₽</span>
                        <span>📚 Осталось занятий: <span class="balance-remaining ${getBalanceClass(student.remaining_lessons || 0)}">${student.remaining_lessons || 0}</span></span>
                        <span>📅 Тип абонемента: ${student.subscription_type || ''}</span>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

// ===== Модальные окна =====
function showModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.style.display = 'block';

    if (modalId === 'paymentsModal') {
        loadPaymentsData();
    } else if (modalId === 'attendanceModal') {
        loadAttendanceGroups();
    } else if (modalId === 'discountsModal') {
        loadDiscounts();
        toggleDiscountFormForRole();
    } else if (modalId === 'parentAttendanceModal') {
        loadParentAttendance();
    } else if (modalId === 'authorizationModal') {
        loadAuthorizedParticipants();
    } else if (modalId === 'participantsModal') {
        loadParticipantGroups();
    } else if (modalId === 'contactModal') {
        loadContactData();
    } else if (modalId === 'paymentModal') {
        loadPaymentData();
    }
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.style.display = 'none';
}

// Закрытие модалок по клику на фон
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// ===== Скидки и акции =====
async function loadDiscounts() {
    try {
        const resp = await fetch('/api/discounts');
        const data = await resp.json();
        const container = document.getElementById('discountsList');
        if (!container) return;
        if (data.success) {
            if ((data.discounts || []).length === 0) {
                container.innerHTML = '<p>Активных скидок пока нет</p>';
                return;
            }
            container.innerHTML = `
                <h4>Действующие предложения:</h4>
                ${data.discounts.map(d => `
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
    form.style.display = (currentUser && currentUser.role === 'admin') ? 'block' : 'none';
}

async function deleteDiscount(id) {
    if (!confirm('Удалить скидку?')) return;
    try {
        const resp = await fetch(`/api/admin/discounts/${id}`, { method: 'DELETE' });
        const data = await resp.json();
        if (data.success) {
            showSuccess('Скидка удалена');
            loadDiscounts();
        } else {
            showError('Ошибка удаления: ' + data.error);
        }
    } catch (e) {
        console.error('Ошибка удаления скидки', e);
        showError('Ошибка удаления скидки');
    }
}

// Отправка формы скидок (только админ)
(function bindDiscountForm(){
    const form = document.getElementById('discountForm');
    if (!form) return;
    form.addEventListener('submit', async function(e){
        e.preventDefault();
        const payload = {
            name: document.getElementById('discountName').value,
            description: document.getElementById('discountDescription').value,
            discount_type: document.getElementById('discountTypeSelect').value,
            discount_percent: parseInt(document.getElementById('discountPercentInput').value),
            start_date: document.getElementById('discountStartDate').value || null,
            end_date: document.getElementById('discountEndDate').value || null,
            is_active: true
        };
        try {
            const resp = await fetch('/api/admin/discounts', {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (data.success) {
                showSuccess('Скидка добавлена');
                form.reset();
                loadDiscounts();
            } else {
                showError('Ошибка добавления: ' + data.error);
            }
        } catch (e) {
            console.error('Ошибка добавления скидки', e);
            showError('Ошибка добавления скидки');
        }
    });
})();

// ===== Контакты =====
async function loadContactData() {
    try {
        const resp = await fetch('/api/parent/contact');
        const data = await resp.json();
        const el = document.getElementById('contactInfo');
        if (!el) return;
        if (data.success) {
            el.innerHTML = `
                <div>
                    <h4>Контактная информация:</h4>
                    <p><strong>Телефон:</strong> ${data.contact_info.phone}</p>
                    <p><strong>Email:</strong> ${data.contact_info.telegram}</p>
                    <p><strong>Адрес:</strong> ${data.contact_info.address}</p>
                    <div style="margin-top: 20px;">
                        <button class="btn" onclick="window.open('tel:${data.contact_info.phone}')">📞 Позвонить</button>
                        <button class="btn btn-secondary" onclick="window.open('mailto:${data.contact_info.telegram}')">✉️ Написать в телеграм</button>
                    </div>
                </div>`;
        } else {
            el.innerHTML = '<div class="error">Ошибка загрузки контактов</div>';
        }
    } catch (e) {
        console.error('Ошибка загрузки контактов', e);
        const el = document.getElementById('contactInfo');
        if (el) el.innerHTML = '<div class="error">Ошибка загрузки контактов</div>';
    }
}

// ===== Платежи (админ список) =====
async function loadPaymentsData() {
    try {
        const resp = await fetch('/api/admin/payments');
        const data = await resp.json();
        const list = document.getElementById('paymentsList');
        if (!list) return;
        if (data.success) {
            if (data.payments.length === 0) {
                list.innerHTML = '<p>Платежей пока нет</p>';
                return;
            }
            list.innerHTML = `
                <h4>Список платежей:</h4>
                ${data.payments.map(p => `
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
            list.innerHTML = '<div class="error">Ошибка загрузки платежей</div>';
        }
    } catch (e) {
        console.error('Ошибка загрузки платежей', e);
        const list = document.getElementById('paymentsList');
        if (list) list.innerHTML = '<div class="error">Ошибка загрузки платежей</div>';
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
        const resp = await fetch(`/api/admin/payments/${paymentId}/approve`, {
            method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ admin_notes: adminNotes || '' })
        });
        const data = await resp.json();
        if (data.success) {
            showSuccess('Платеж подтвержден');
            loadPaymentsData();
        } else {
            showError('Ошибка подтверждения: ' + data.error);
        }
    } catch (e) {
        console.error('Ошибка подтверждения платежа', e);
        showError('Ошибка подтверждения платежа');
    }
}

async function rejectPayment(paymentId) {
    const adminNotes = prompt('Введите причину отклонения:');
    if (!adminNotes) { showError('Необходимо указать причину отклонения'); return; }
    try {
        const resp = await fetch(`/api/admin/payments/${paymentId}/reject`, {
            method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ admin_notes: adminNotes })
        });
        const data = await resp.json();
        if (data.success) {
            showSuccess('Платеж отклонен');
            loadPaymentsData();
        } else {
            showError('Ошибка отклонения: ' + data.error);
        }
    } catch (e) {
        console.error('Ошибка отклонения платежа', e);
        showError('Ошибка отклонения платежа');
    }
}



// Формы: участники, расписание, оплата
(function bindParticipantForm(){
    const form = document.getElementById('participantForm');
    if (!form) return;
    form.addEventListener('submit', async function(e){
        e.preventDefault();
        const payload = {
            full_name: document.getElementById('fullName').value,
            parent_phone: document.getElementById('parentPhone').value,
            birth_date: document.getElementById('birthDate').value,
            sport_group_id: parseInt(document.getElementById('participantGroup').value),
            medical_certificate: document.getElementById('medicalCertificate').checked,
            discount_type: document.getElementById('discountType').value,
            discount_percent: parseInt(document.getElementById('discountPercent').value) || 0
        };
        try {
            const resp = await fetch('/api/admin/participants', {
                method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (data.success) {
                showSuccess(data.authorization_code ? `Участник зарегистрирован! Код: ${data.authorization_code}` : 'Участник зарегистрирован');
                form.reset();
                closeModal('participantsModal');
            } else {
                showError('Ошибка регистрации: ' + data.error);
            }
        } catch (e) {
            console.error('Ошибка регистрации участника', e);
            showError('Ошибка регистрации участника');
        }
    });
})();



// Оплата (родитель)
async function loadPaymentData() {
    try {
        // Участники
        const resp = await fetch('/api/auth/participants');
        const data = await resp.json();
        const select = document.getElementById('paymentParticipant');
        if (select) {
            select.innerHTML = '<option value="">Выберите участника</option>';
            if (data.success && (data.participants||[]).length > 0) {
                data.participants.forEach(p => select.innerHTML += `<option value="${p.id}">${p.full_name}</option>`);
            } else {
                select.innerHTML = '<option value="">Нет авторизованных участников</option>';
            }
        }
        // Группы
        const groupSelect = document.getElementById('paymentGroup');
        if (groupSelect) {
            groupSelect.innerHTML = '<option value="">Выберите группу</option>' + sportGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
            groupSelect.onchange = function(){ calculatePayment(this.value, document.getElementById('paymentType').value); };
        }
        const typeSelect = document.getElementById('paymentType');
        if (typeSelect) {
            typeSelect.onchange = function(){ calculatePayment(document.getElementById('paymentGroup').value, this.value); };
        }
    } catch (e) {
        console.error('Ошибка загрузки данных оплаты', e);
    }
}

function calculatePayment(groupId, subscriptionType) {
    const group = sportGroups.find(g => String(g.id) === String(groupId));
    if (!group) return;
    let amount = 0;
    switch (subscriptionType) {
        case '8 занятий': amount = group.price_8; break;
        case '12 занятий': amount = group.price_12; break;
        case 'Разовые занятия': amount = group.price_single; break;
        default: amount = 0;
    }
    const amountInput = document.getElementById('paymentAmount');
    if (amountInput) amountInput.value = amount || 0;
}

(function bindPaymentForm(){
    const form = document.getElementById('paymentForm');
    if (!form) return;
    form.addEventListener('submit', async function(e){
        e.preventDefault();
        const participantId = document.getElementById('paymentParticipant').value;
        if (!participantId) { showError('Пожалуйста, выберите участника'); return; }
        const payload = {
            participant_id: parseInt(participantId),
            sport_group_id: parseInt(document.getElementById('paymentGroup').value),
            subscription_type: document.getElementById('paymentType').value,
            total_lessons: getLessonsCount(document.getElementById('paymentType').value),
            amount: parseInt(document.getElementById('paymentAmount').value),
            payment_method: 'cash'
        };
        try {
            const resp = await fetch('/api/parent/payment', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
            const data = await resp.json();
            if (data.success) {
                showSuccess(data.message || 'Платеж создан и ожидает подтверждения администратора');
                form.reset();
                closeModal('paymentModal');
            } else {
                showError('Ошибка создания платежа: ' + data.error);
            }
        } catch (e) {
            console.error('Ошибка создания платежа', e);
            showError('Ошибка создания платежа');
        }
    });
})();

function getLessonsCount(subscriptionType) {
    switch (subscriptionType) {
        case '8 занятий': return 8;
        case '12 занятий': return 12;
        case 'Разовые занятия': return 1;
        default: return 1;
    }
}

// ===== Посещаемость (админ) =====
async function loadAttendanceGroups() {
    try {
        const resp = await fetch('/api/admin/attendance/groups');
        const data = await resp.json();
        const container = document.getElementById('attendanceContent');
        if (!container) return;
        if (data.success) {
            container.innerHTML = `
                <div style="margin-bottom: 16px;"><h4 style="margin-bottom: 12px; color: #ffffff;">Выберите группу для учета посещаемости:</h4></div>
                ${data.groups.map(group => `
                    <div class="attendance-group">
                        <div onclick="selectAttendanceGroup(${group.id}, '${group.name.replace(/'/g, "\'")}')" style="cursor: pointer;">
                            <h4 style="margin-bottom: 4px; color: #ffffff;">${group.name}</h4>
                            <p style="color: #9ca3af; font-size: 13px;">${group.description||''}</p>
                        </div>
                        <div style="margin-top: 8px;"><button class="btn btn-secondary" onclick="loadAttendanceStats(${group.id})" style="font-size:12px; padding:6px 12px;">📊 Статистика</button></div>
                    </div>`).join('')}
            `;
        } else {
            container.innerHTML = '<div class="error">Ошибка загрузки групп</div>';
        }
    } catch (e) {
        console.error('Ошибка загрузки групп посещаемости', e);
        showError('Ошибка загрузки групп');
    }
}

async function selectAttendanceGroup(groupId, groupName) {
    window.currentAttendanceGroup = { id: groupId, name: groupName };
    try {
        const resp = await fetch(`/api/admin/attendance/schedule/${groupId}`);
        const data = await resp.json();
        if (data.success) {
            renderAttendanceDates(data.dates, groupName);
            closeModal('attendanceModal');
            // Создаем модалку дат
            const html = `
                <div class="modal" id="attendanceDateModal" style="display:block;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">Выбор даты</h3>
                            <button class="close-btn" onclick="closeModal('attendanceDateModal')">&times;</button>
                        </div>
                        <div class="modal-body" id="attendanceDatesList"></div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            renderAttendanceDates(data.dates, groupName);
        } else {
            showError('Ошибка загрузки расписания: ' + data.error);
        }
    } catch (e) {
        console.error('Ошибка загрузки расписания посещаемости', e);
        showError('Ошибка загрузки расписания');
    }
}

function renderAttendanceDates(dates, groupName) {
    const container = document.getElementById('attendanceDatesList');
    if (!container) return;
    if (!dates || dates.length === 0) {
        container.innerHTML = '<div class="error">Нет запланированных занятий</div>';
        return;
    }
    container.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h4 style="margin-bottom: 8px; color: #ffffff;">${groupName}</h4>
            <p style="color:#9ca3af; font-size:13px; margin-bottom:12px;">Выберите дату занятия:</p>
        </div>
        ${dates.map(date => `
            <div class="attendance-date ${date.has_attendance ? (date.is_completed ? 'completed' : 'pending') : ''}"
                 onclick="selectAttendanceDate('${date.date}', '${date.day_name} ${date.day_number} ${date.month} ${date.year}')">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:600; color:#ffffff;">${date.day_name} ${date.day_number} ${date.month}</div>
                        <div style="font-size:12px; color:#9ca3af;">${date.start_time} - ${date.end_time}</div>
                    </div>
                    <div style="font-size:12px; color:#9ca3af;">${date.has_attendance ? (date.is_completed ? '✅ Завершено' : '⏳ Ожидает') : '📝 Новое'}</div>
                </div>
            </div>`).join('')}
        <div style="margin-top:20px;"><button class="btn btn-secondary" onclick="loadAttendanceStats(${window.currentAttendanceGroup.id})">📊 Просмотреть статистику группы</button></div>
    `;
}

async function selectAttendanceDate(date, dateDisplay) {
    window.currentAttendanceDate = { date, display: dateDisplay };
    try {
        const resp = await fetch(`/api/admin/attendance/participants/${window.currentAttendanceGroup.id}/${date}`);
        const data = await resp.json();
        if (data.success) {
            window.currentAttendanceId = data.attendance_id;
            const html = `
                <div class="modal" id="attendanceRecordModal" style="display:block;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">Отметка посещаемости</h3>
                            <button class="close-btn" onclick="closeModal('attendanceRecordModal')">&times;</button>
                        </div>
                        <div class="modal-body" id="attendanceRecordContent"></div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            renderAttendanceParticipants(data.participants, dateDisplay, data.is_completed);
        } else {
            showError('Ошибка загрузки участников: ' + data.error);
        }
    } catch (e) {
        console.error('Ошибка загрузки участников', e);
        showError('Ошибка загрузки участников');
    }
}

function renderAttendanceParticipants(participants, dateDisplay, isCompleted) {
    const container = document.getElementById('attendanceRecordContent');
    if (!container) return;
    if (!participants || participants.length === 0) {
        container.innerHTML = '<div class="error">Нет участников в группе</div>';
        return;
    }
    container.innerHTML = `
        <div style="margin-bottom:16px;">
            <h4 style="margin-bottom:8px; color:#ffffff;">${window.currentAttendanceGroup.name}</h4>
            <p style="color:#9ca3af; font-size:13px; margin-bottom:12px;">${dateDisplay}</p>
        </div>
        ${participants.map(p => `
            <div class="participant-item" data-participant-id="${p.id}">
                <div class="participant-info">
                    <div class="participant-name">${p.full_name}</div>
                    <div class="participant-phone">${p.parent_phone}</div>
                </div>
                <div class="attendance-controls">
                    <div class="attendance-toggle">
                        <div class="toggle-switch ${p.is_present ? 'active' : ''}" onclick="toggleAttendance(${p.id}, this)"></div>
                        <span class="attendance-status ${p.is_present ? 'present' : 'absent'}">${p.is_present ? 'Присутствует' : 'Отсутствует'}</span>
                    </div>
                    <div class="absence-reason" style="display:${p.is_present ? 'none' : 'block'}; margin-top:8px;">
                        <select class="reason-select" onchange="updateAbsenceReason(${p.id}, this.value)">
                            <option value="unexcused">Без уважительной причины</option>
                            <option value="excused">По уважительной причине</option>
                        </select>
                    </div>
                </div>
            </div>`).join('')}
        <div style="margin-top:20px;"><button class="btn" onclick="saveAttendance()" ${isCompleted ? 'disabled' : ''}>${isCompleted ? 'Посещаемость уже сохранена' : 'Сохранить посещаемость'}</button></div>
    `;
}

function toggleAttendance(participantId, el) {
    const toggle = el;
    const status = toggle.nextElementSibling;
    const item = toggle.closest('.participant-item');
    const reason = item.querySelector('.absence-reason');
    toggle.classList.toggle('active');
    const present = toggle.classList.contains('active');
    status.textContent = present ? 'Присутствует' : 'Отсутствует';
    status.className = `attendance-status ${present ? 'present' : 'absent'}`;
    if (reason) reason.style.display = present ? 'none' : 'block';
}

function updateAbsenceReason(participantId, reason) {
    const item = document.querySelector(`[data-participant-id="${participantId}"]`);
    if (item) item.setAttribute('data-absence-reason', reason);
}

async function saveAttendance() {
    const participants = [];
    document.querySelectorAll('.participant-item').forEach(item => {
        const toggle = item.querySelector('.toggle-switch');
        const idMatch = toggle.getAttribute('onclick').match(/\d+/);
        const pid = idMatch ? parseInt(idMatch[0]) : null;
        const isPresent = toggle.classList.contains('active');
        const absenceReason = item.getAttribute('data-absence-reason') || 'unexcused';
        participants.push({ id: pid, is_present: isPresent, absence_reason: isPresent ? null : absenceReason });
    });
    try {
        const resp = await fetch('/api/admin/attendance/save', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ attendance_id: window.currentAttendanceId, participants }) });
        const data = await resp.json();
        if (data.success) {
            showSuccess('Посещаемость сохранена!');
            closeModal('attendanceRecordModal');
            selectAttendanceGroup(window.currentAttendanceGroup.id, window.currentAttendanceGroup.name);
        } else {
            showError('Ошибка сохранения посещаемости: ' + data.error);
        }
    } catch (e) {
        console.error('Ошибка сохранения посещаемости', e);
        showError('Ошибка сохранения посещаемости');
    }
}

// Статистика посещаемости
async function loadAttendanceStats(groupId) {
    try {
        const resp = await fetch(`/api/admin/attendance/stats/${groupId}`);
        const data = await resp.json();
        if (data.success) {
            const html = `
                <div class="modal" id="attendanceStatsModal" style="display:block;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">Статистика посещаемости</h3>
                            <button class="close-btn" onclick="closeModal('attendanceStatsModal')">&times;</button>
                        </div>
                        <div class="modal-body" id="attendanceStatsContent"></div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            renderAttendanceStats(data.stats);
        } else {
            showError('Ошибка загрузки статистики: ' + data.error);
        }
    } catch (e) {
        console.error('Ошибка загрузки статистики', e);
        showError('Ошибка загрузки статистики');
    }
}

function renderAttendanceStats(stats) {
    const container = document.getElementById('attendanceStatsContent');
    if (!container) return;
    if (!stats || stats.length === 0) {
        container.innerHTML = '<div class="error">Нет данных о посещаемости</div>';
        return;
    }
    container.innerHTML = stats.map(stat => {
        const cls = stat.percentage >= 80 ? 'high' : stat.percentage >= 60 ? 'medium' : 'low';
        return `
            <div class="stats-item">
                <div class="stats-header">
                    <div class="stats-date">${stat.day_name} ${new Date(stat.date).toLocaleDateString('ru-RU')}</div>
                    <div class="stats-percentage ${cls}">${stat.percentage}%</div>
                </div>
                <div class="stats-details">
                    <span>Всего: ${stat.total}</span>
                    <span>Присутствовало: ${stat.present}</span>
                    <span>Отсутствовало: ${stat.absent}</span>
                </div>
            </div>`;
    }).join('');
}

// ===== Авторизация родителей и абонементы =====
async function loadAuthorizedParticipants() {
    try {
        const resp = await fetch('/api/auth/participants');
        const data = await resp.json();
        const container = document.getElementById('authorizedParticipants');
        if (!container) return;
        if (data.success) {
            if ((data.participants||[]).length > 0) {
                container.innerHTML = `
                    <h4 style="margin-bottom: 8px; color: #ffffff;">Ваши авторизованные участники:</h4>
                    ${data.participants.map(p => `
                        <div class="authorized-participant">
                            <h5>${p.full_name}</h5>
                            <p>Телефон: ${p.parent_phone}</p>
                            <p>Авторизован: ${p.authorized_at}</p>
                        </div>`).join('')}`;
                showAuthorizedButtons();
            } else {
                container.innerHTML = `
                    <h4 style="margin-bottom:8px; color:#ffffff;">Ваши авторизованные участники:</h4>
                    <p style="color:#9ca3af;">У вас пока нет авторизованных участников</p>`;
                hideAuthorizedButtons();
            }
        } else {
            container.innerHTML = '<div class="error">Ошибка загрузки участников</div>';
        }
    } catch (e) {
        console.error('Ошибка загрузки авторизованных участников', e);
        const container = document.getElementById('authorizedParticipants');
        if (container) container.innerHTML = '<div class="error">Ошибка загрузки данных</div>';
    }
}

function showAuthorizedButtons() {
    const paymentBtn = document.getElementById('paymentBtn');
    const attendanceBtn = document.getElementById('attendanceBtn');
    if (paymentBtn) paymentBtn.style.display = 'inline-block';
    if (attendanceBtn) attendanceBtn.style.display = 'inline-block';
}

function hideAuthorizedButtons() {
    const paymentBtn = document.getElementById('paymentBtn');
    const attendanceBtn = document.getElementById('attendanceBtn');
    if (paymentBtn) paymentBtn.style.display = 'none';
    if (attendanceBtn) attendanceBtn.style.display = 'none';
}

(function bindAuthorizationForm(){
    const form = document.getElementById('authorizationForm');
    if (!form) return;
    form.addEventListener('submit', async function(e){
        e.preventDefault();
        const code = document.getElementById('authCode').value.trim();
        if (code.length !== 6) { showError('Код должен содержать 6 цифр'); return; }
        try {
            const resp = await fetch('/api/auth/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code })});
            const data = await resp.json();
            if (data.success) {
                showSuccess(data.message);
                form.reset();
                loadAuthorizedParticipants();
            } else {
                showError('Ошибка авторизации: ' + data.error);
            }
        } catch (e) {
            console.error('Ошибка авторизации', e);
            showError('Ошибка авторизации');
        }
    });
})();

async function checkAuthorization() {
    try {
        const resp = await fetch('/api/auth/participants');
        const data = await resp.json();
        if (data.success && (data.participants||[]).length > 0) {
            showAuthorizedButtons();
        } else {
            hideAuthorizedButtons();
        }
    } catch (e) {
        console.error('Ошибка проверки авторизации', e);
        hideAuthorizedButtons();
    }
}

async function loadParticipantGroups() {
    const select = document.getElementById('participantGroup');
    if (!select) return;
    
    // Если sportGroups недоступны или пусты, загружаем их напрямую
    if (!Array.isArray(sportGroups) || sportGroups.length === 0) {
        try {
            const response = await fetch('/api/sport-groups');
            const result = await response.json();
            
            if (result.success && Array.isArray(result.groups)) {
                sportGroups = result.groups;
            } else {
                console.error('API returned error or invalid data:', result);
                return;
            }
        } catch (error) {
            console.error('Error loading groups directly:', error);
            return;
        }
    }
    
    if (Array.isArray(sportGroups) && sportGroups.length > 0) {
        select.innerHTML = '<option value="">Выберите группу</option>' + sportGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    } else {
        select.innerHTML = '<option value="">Нет доступных групп</option>';
    }
}





// ===== Посещаемость родителя =====
async function loadParentAttendance() {
    try {
        const resp = await fetch('/api/participants');
        const data = await resp.json();
        const container = document.getElementById('parentAttendanceContent');
        if (!container) return;
        if (data.success && (data.participants||[]).length>0) {
            container.innerHTML = `
                <div style="margin-bottom:16px;"><h4 style="margin-bottom:8px; color:#ffffff;">Выберите участника для просмотра посещаемости:</h4></div>
                ${data.participants.map(p => `
                    <div class="attendance-group" onclick="loadParticipantAttendance(${p.id}, '${p.full_name.replace(/'/g, "\'")}')">
                        <h4 style="margin-bottom:4px; color:#ffffff;">${p.full_name}</h4>
                        <p style="color:#9ca3af; font-size:13px;">Нажмите для просмотра посещаемости</p>
                    </div>`).join('')}`;
        } else {
            container.innerHTML = '<div class="error">У вас нет зарегистрированных участников</div>';
        }
    } catch (e) {
        console.error('Ошибка загрузки участников родителя', e);
        showError('Ошибка загрузки данных');
    }
}

async function loadParticipantAttendance(participantId, participantName) {
    try {
        const resp = await fetch(`/api/parent/attendance/${participantId}`);
        const data = await resp.json();
        if (data.success) {
            const html = `
                <div class="modal" id="attendanceStatsModal" style="display:block;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">Посещаемость</h3>
                            <button class="close-btn" onclick="closeModal('attendanceStatsModal')">&times;</button>
                        </div>
                        <div class="modal-body" id="attendanceStatsContent"></div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            renderParticipantAttendance(data.stats, participantName);
            closeModal('parentAttendanceModal');
        } else {
            showError('Ошибка загрузки посещаемости: ' + data.error);
        }
    } catch (e) {
        console.error('Ошибка загрузки посещаемости участника', e);
        showError('Ошибка загрузки посещаемости');
    }
}

function renderParticipantAttendance(stats, participantName) {
    const container = document.getElementById('attendanceStatsContent');
    if (!container) return;
    if (!stats || stats.length === 0) {
        container.innerHTML = '<div class="error">Нет данных о посещаемости</div>';
        return;
    }
    container.innerHTML = `
        <div style="margin-bottom:16px;">
            <button class="back-btn" onclick="closeModal('attendanceStatsModal'); showModal('parentAttendanceModal');">← Назад к участникам</button>
            <h4 style="margin-bottom:8px; color:#ffffff;">Посещаемость</h4>
            <p style="color:#9ca3af; font-size:13px; margin-bottom:12px;">${participantName}</p>
        </div>
        ${stats.map(stat => `
            <div class="stats-item">
                <div class="stats-header">
                    <div class="stats-date">${stat.day_name} ${new Date(stat.date).toLocaleDateString('ru-RU')}</div>
                    <div class="attendance-status ${stat.is_present ? 'present' : 'absent'}">${stat.is_present ? '✅ Присутствовал' : '❌ Отсутствовал'}</div>
                </div>
                <div class="stats-details"><span>Группа: ${stat.sport_group}</span><span>Время: ${stat.start_time} - ${stat.end_time}</span></div>
            </div>`).join('')}`;
}

// ===== Вспомогательные =====

function getBalanceClass(remaining) {
    if (remaining <= 0) return 'zero';
    if (remaining <= 1) return 'low';
    if (remaining <= 3) return 'medium';
    return 'normal';
}

function showSuccess(message) { try { tg.showAlert(message); } catch(e) { alert(message); } }
function showError(message) { try { tg.showAlert(message); } catch(e) { alert(message); } }

// ===== Карточка группы (подробности и запись) =====
async function openGroupDetails(groupId) {
    try {
        let group = sportGroups.find(g => g.id === groupId);
        if (!group) {
            const resp = await fetch(`/api/sport-group/${groupId}`);
            const data = await resp.json();
            if (data && data.success && data.group) {
                group = {
                    id: data.group.id,
                    name: data.group.name,
                    description: data.group.description,
                    detailed_description: data.group.detailed_description,
                    trainer_name: data.group.trainer_name,
                    trainer_info: data.group.trainer_info,
                    price_8: data.group.price_8,
                    price_12: data.group.price_12,
                    price_single: data.group.price_single,
                    category: data.group.category,
                    age_group: data.group.age_group,
                    schedule: data.group.schedule_text
                };
            }
        }
        if (group) {
            showGroupInfoModal(group);
        } else {
            showError('Не удалось загрузить информацию о группе');
        }
    } catch (e) {
        console.error('Ошибка открытия деталей группы:', e);
        showError('Ошибка открытия деталей группы');
    }
}

function showGroupInfoModal(group) {
    const scheduleText = group.schedule || group.schedule_text || '';
    const html = `
        <div class="modal" id="groupInfoModal" style="display:block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">🏋️ ${group.name}</h3>
                    <button class="close-btn" onclick="closeGroupInfoModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="group-info">
                        <p>${group.description || ''}</p>
                        ${group.detailed_description ? `<p>${group.detailed_description}</p>` : ''}
                        ${scheduleText ? `<div class="schedule-info"><strong>Расписание:</strong> ${scheduleText}</div>` : ''}
                        <div class="prices">
                            <h4>Стоимость:</h4>
                            ${group.price_8 ? `<div>8 занятий: ${group.price_8} ₽</div>` : ''}
                            ${group.price_12 ? `<div>12 занятий: ${group.price_12} ₽</div>` : ''}
                            ${group.price_single ? `<div>Разовое занятие: ${group.price_single} ₽</div>` : ''}
                        </div>
                        ${group.trainer_name ? `
                            <div class="trainer-info">
                                <h4>Тренер:</h4>
                                <p><strong>${group.trainer_name}</strong></p>
                                ${group.trainer_info ? `<p>${group.trainer_info}</p>` : ''}
                            </div>
                        ` : ''}
                        <div class="group-actions">
                            <button class="btn" onclick="requestEnroll(${group.id}, '${(group.name||'').replace(/'/g, "\'")}')">Записаться в эту группу</button>
                            <button class="btn secondary" onclick="openContacts()">📞 Контакты</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeGroupInfoModal() {
    const modal = document.getElementById('groupInfoModal');
    if (modal) modal.remove();
}

async function requestEnroll(groupId, groupName) {
    try {
        const resp = await fetch('/api/enroll-request', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ group_id: groupId, group_name: groupName }) });
        const data = await resp.json();
        if (data.success) {
            showSuccess('Заявка отправлена администратору');
            closeGroupInfoModal();
        } else {
            showError('Не удалось отправить заявку: ' + data.error);
        }
    } catch (e) {
        console.error('Ошибка отправки заявки', e);
        showError('Ошибка отправки заявки');
    }
}

// ===== Контакты (динамическое окно) =====
async function openContacts() {
    let phone = '+7 902 923 7193';
    let tgUser = 'Taiky_admin';
    let name = 'Директор клуба';
    try {
        const resp = await fetch('/api/parent/contact');
        const data = await resp.json();
        if (data?.success && data.contact_info) {
            phone = data.contact_info.phone || phone;
            tgUser = (data.contact_info.telegram || tgUser).replace(/^@/, '');
            name = data.contact_info.name || name;
        }
    } catch (e) { console.warn('Не удалось загрузить контактные данные', e); }
    const html = `
        <div class="modal" id="dynamicContactModal" style="display:block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Контакты</h3>
                    <button class="close-btn" onclick="closeDynamicContacts()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="group-info">
                        <h4>Директор клуба</h4>
                        <p>
                            ${name}
                        </p>
                        <div style="margin-top: 16px; display:flex; gap:12px; flex-wrap:wrap;">
                            <button class="btn" onclick="callPhone('${phone}')">📞 Позвонить</button>
                            <button class="btn btn-secondary" onclick="openTelegram('${tgUser}')">✈️ Телеграм</button>
                        </div>
                        <div style="margin-top:12px; color: var(--text-secondary);">
                            <div>Телефон: ${phone}</div>
                            <div>Telegram: @${tgUser}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeDynamicContacts() {
    const modal = document.getElementById('dynamicContactModal');
    if (modal) modal.remove();
}

function callPhone(phone) {
    window.location.href = `tel:${phone.replace(/\s|\(|\)|-/g, '')}`;
}

function openTelegram(username) {
    // Prefer native Telegram app if installed; fall back to web
    const tgLink = `https://t.me/${username.replace(/^@/, '')}`;
    window.open(tgLink, '_blank');
}

function openGroupAttendance(groupId, groupName) {
    // Переиспользуем существующий поток посещаемости, сразу выбирая группу
    window.currentAttendanceGroup = { id: groupId, name: groupName };
    // Загружаем даты посещаемости для группы
    selectAttendanceGroup(groupId, groupName);
}

async function openPaymentsForGroup(groupId, groupName) {
    try {
        const resp = await fetch('/api/admin/payments');
        const data = await resp.json();
        if (!data.success) { showError('Не удалось загрузить платежи'); return; }
        const groupPayments = (data.payments || []).filter(p => String(p.group_id) === String(groupId) || p.sport_group === groupName);
        const html = `
            <div class="modal" id="groupPaymentsModal" style="display:block;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">💰 Платежи группы: ${groupName}</h3>
                        <button class="close-btn" onclick="closeModal('groupPaymentsModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${groupPayments.length === 0 ? '<p>Платежей пока нет</p>' : groupPayments.map(p => `
                            <div class="schedule-item payment-item ${p.status}">
                                <div class="payment-header">
                                    <div class="payment-participant">${p.participant_name}</div>
                                    <div class="payment-status ${p.status}">${getStatusText(p.status)}</div>
                                </div>
                                <div class="payment-details">
                                    <div>📱 ${p.participant_phone || ''}</div>
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
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    } catch (e) {
        console.error(e);
        showError('Ошибка загрузки платежей');
    }
}

// ===== Управление учениками (страница admin/students) =====

// Загрузка списка всех учеников
async function loadAllStudents() {
    try {
        const response = await fetch('/api/admin/students');
        const result = await response.json();
        
        if (result.success) {
            renderStudentsTable(result.students);
        } else {
            showError('Ошибка загрузки учеников: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки учеников:', error);
        showError('Ошибка загрузки учеников');
    }
}

// Рендер таблицы учеников
function renderStudentsTable(students) {
    const container = document.getElementById('studentsTable');
    if (!container) return;
    
    if (!students || students.length === 0) {
        container.innerHTML = '<div class="no-students">Учеников пока нет</div>';
        return;
    }
    
    let html = `
        <div class="table-header">
            <div>ФИО</div>
            <div>Группа</div>
            <div>Возраст</div>
            <div>Абонемент</div>
            <div>Оплата</div>
            <div>Код авторизации</div>
            <div>Действия</div>
        </div>
    `;
    
    students.forEach(student => {
        const statusClass = student.has_payments ? 'status-paid' : 'status-unpaid';
        const paymentStatus = student.has_payments ? 'Да' : 'Нет';
        
        html += `
            <div class="student-row">
                <div class="student-name">${student.participant_name}</div>
                <div class="student-group">${student.subscriptions && student.subscriptions.length > 0 ? student.subscriptions[0].sport_group_name : 'Не записан'}</div>
                <div class="student-age">${student.age || 'Не указано'}</div>
                <div class="subscription-type">${student.subscriptions && student.subscriptions.length > 0 ? student.subscriptions[0].subscription_type : '-'}</div>
                <div class="payment-status ${statusClass}">${paymentStatus}</div>
                <div class="auth-code">${student.authorization_code || 'Не создан'}</div>
                <div class="student-actions">
                    <button class="btn btn-primary btn-small" onclick="editStudent(${student.participant_id})">✏️</button>
                    <button class="btn btn-danger btn-small" onclick="deleteStudent(${student.participant_id})">🗑️</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Открытие модального окна для добавления ученика
async function openAddStudentModal() {
    const modal = document.getElementById('studentModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('studentForm');
    
    if (modal && modalTitle && form) {
        modalTitle.textContent = 'Добавить ученика';
        form.reset();
        form.removeAttribute('data-student-id');
        modal.style.display = 'block';
        
        // Сразу загружаем группы напрямую
        try {
            const response = await fetch('/api/sport-groups');
            const result = await response.json();
            
            if (result.success && Array.isArray(result.groups)) {
                const groupSelect = document.getElementById('sportGroup');
                if (groupSelect) {
                    const options = result.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
                    groupSelect.innerHTML = '<option value="">Выберите группу</option>' + options;
                }
            }
        } catch (error) {
            // Не показываем ошибку пользователю
        }
    }
}

// Открытие модального окна для редактирования ученика
async function editStudent(studentId) {
    try {
        const response = await fetch(`/api/admin/participants/${studentId}`);
        const result = await response.json();
        
        if (result.success) {
            const modal = document.getElementById('studentModal');
            const modalTitle = document.getElementById('modalTitle');
            const form = document.getElementById('studentForm');
            
            if (modal && modalTitle && form) {
                modalTitle.textContent = 'Редактировать ученика';
                form.setAttribute('data-student-id', studentId);
                
                // Заполняем форму данными
                document.getElementById('fullName').value = result.participant.full_name;
                document.getElementById('parentPhone').value = result.participant.parent_phone;
                document.getElementById('birthDate').value = result.participant.birth_date;
                document.getElementById('medicalCertificate').checked = result.participant.medical_certificate;
                document.getElementById('discountType').value = result.participant.discount_type || '';
                document.getElementById('discountPercent').value = result.participant.discount_percent || 0;
                
                // Загружаем список групп и затем заполняем группу
                await loadGroupsForSelect();
                
                // Если есть подписки, заполняем группу и тип абонемента
                if (result.participant.subscriptions && result.participant.subscriptions.length > 0) {
                    const subscription = result.participant.subscriptions[0];
                    const sportGroupSelect = document.getElementById('sportGroup');
                    if (sportGroupSelect) {
                        sportGroupSelect.value = subscription.sport_group_id;
                    }
                    document.getElementById('subscriptionType').value = subscription.subscription_type;
                }
                
                modal.style.display = 'block';
            }
        } else {
            showError('Ошибка загрузки данных ученика: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки ученика:', error);
        showError('Ошибка загрузки данных ученика');
    }
}

// Удаление ученика
async function deleteStudent(studentId) {
    if (!confirm('Вы уверены, что хотите удалить этого ученика? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/participants/${studentId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Ученик успешно удален');
            loadAllStudents(); // Перезагружаем список
        } else {
            showError('Ошибка удаления ученика: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка удаления ученика:', error);
        showError('Ошибка удаления ученика');
    }
}

// Закрытие модального окна
function closeStudentModal() {
    const modal = document.getElementById('studentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Обновление списка учеников
function refreshStudents() {
    loadAllStudents();
}

// Загрузка групп для выпадающего списка
async function loadGroupsForSelect() {
    const groupSelect = document.getElementById('sportGroup');
    
    if (!groupSelect) {
        return;
    }
    
    // Если sportGroups недоступны или пусты, загружаем их напрямую
    if (!Array.isArray(sportGroups) || sportGroups.length === 0) {
        try {
            const response = await fetch('/api/sport-groups');
            const result = await response.json();
            
            if (result.success && Array.isArray(result.groups)) {
                sportGroups = result.groups;
            } else {
                // Не показываем ошибку, просто выходим
                return;
            }
        } catch (error) {
            // Не показываем ошибку, просто выходим
            return;
        }
    }
    
    if (Array.isArray(sportGroups) && sportGroups.length > 0) {
        const options = sportGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        groupSelect.innerHTML = '<option value="">Выберите группу</option>' + options;
    } else {
        groupSelect.innerHTML = '<option value="">Нет доступных групп</option>';
    }
}

// Обработка отправки формы ученика
async function submitStudentForm(event) {
    event.preventDefault();
    
    const form = event.target;
    const studentId = form.getAttribute('data-student-id');
    const isEdit = !!studentId;
    
    // Собираем данные формы
    const fullName = document.getElementById('fullName').value;
    const parentPhone = document.getElementById('parentPhone').value;
    const birthDate = document.getElementById('birthDate').value;
    const sportGroupId = document.getElementById('sportGroup').value;
    const subscriptionType = document.getElementById('subscriptionType').value;
    const medicalCertificate = document.getElementById('medicalCertificate').checked;
    const discountType = document.getElementById('discountType').value;
    const discountPercent = parseInt(document.getElementById('discountPercent').value) || 0;
    
    const formData = {
        full_name: fullName,
        parent_phone: parentPhone,
        birth_date: birthDate,
        sport_group_id: parseInt(sportGroupId),
        subscription_type: subscriptionType,
        total_lessons: getLessonsCount(subscriptionType),
        medical_certificate: medicalCertificate,
        discount_type: discountType,
        discount_percent: discountPercent
    };
    
    // Проверяем обязательные поля
    if (!formData.full_name || !formData.parent_phone || !formData.birth_date || !formData.sport_group_id || !formData.subscription_type) {
        const missingFields = [];
        if (!formData.full_name) missingFields.push('ФИО');
        if (!formData.parent_phone) missingFields.push('Телефон родителя');
        if (!formData.birth_date) missingFields.push('Дата рождения');
        if (!formData.sport_group_id) missingFields.push('Спортивная группа');
        if (!formData.subscription_type) missingFields.push('Тип абонемента');
        
        showError(`Пожалуйста, заполните все обязательные поля: ${missingFields.join(', ')}`);
        return;
    }
    
    try {
        const url = isEdit ? `/api/admin/participants/${studentId}` : '/api/admin/participants';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(isEdit ? 'Ученик успешно обновлен' : 'Ученик успешно добавлен');
            if (result.authorization_code) {
                showSuccess(`Код авторизации: ${result.authorization_code}`);
            }
            closeStudentModal();
            loadAllStudents(); // Перезагружаем список
        } else {
            showError('Ошибка: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка сохранения ученика:', error);
        showError('Ошибка сохранения ученика: ' + error.message);
    }
}

// Функция возврата назад
function goBack() {
    window.history.back();
}

// Инициализация страницы учеников при загрузке
if (document.getElementById('studentsTable')) {
    // Загружаем учеников сразу
    loadAllStudents();
    
    // Привязываем обработчик формы
    const form = document.getElementById('studentForm');
    if (form) {
        form.addEventListener('submit', submitStudentForm);
    }
    
    // Привязываем обработчик изменения даты рождения для автоматического расчета возраста
    const birthDateInput = document.getElementById('birthDate');
    
    if (birthDateInput) {
        birthDateInput.addEventListener('change', function() {
            calculateAgeFromBirthDate(this.value);
        });
    }
}

// Функция для расчета возраста из даты рождения
function calculateAgeFromBirthDate(birthDateString) {
    if (!birthDateString) return;
    
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    // Если есть поле возраста, обновляем его (хотя оно должно быть скрыто)
    const ageInput = document.getElementById('age');
    if (ageInput) {
        ageInput.value = age;
    }
    
    return age;
}




