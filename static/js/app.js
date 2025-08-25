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
        <div class="sport-group-card" onclick="openGroupDetails(${group.id})">
            <h3>${group.name}</h3>
            <p>${group.description}</p>
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
    } else if (modalId === 'contactModal') {
        loadContactData();
    } else if (modalId === 'paymentModal') {
        loadPaymentData();
    } else if (modalId === 'discountsModal') {
        loadDiscounts();
        toggleDiscountFormForRole();
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
                        <div class="schedule-item">
                            <div class="schedule-day">${p.participant_name} - ${p.sport_group}</div>
                            <div class="schedule-time">
                                ${p.subscription_type} | ${p.amount} ₽ | 
                                Статус: ${p.is_paid ? '✅ Оплачено' : '❌ Не оплачено'}
                                ${p.payment_date ? `<br>Дата: ${p.payment_date}` : ''}
                            </div>
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
function loadPaymentData() {
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
            showSuccess('Участник успешно зарегистрирован');
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
    
    const formData = {
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
            showSuccess('Платеж успешно создан');
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
