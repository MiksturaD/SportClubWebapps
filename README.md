# SportClubWebapps

Современное веб‑приложение для спортивной секции/клуба на Flask. Проект автоматизирует запись в группы, управление абонементами и платежами, учёт посещаемости и уведомления в Telegram для родителей и администратора.

## Возможности
- Управление спортивными группами и расписанием (автоинициализация и обновление)
- Роли пользователей: администратор и родитель (через Telegram Web App)
- Абонементы и платежи: создание, подтверждение/отклонение админом, уведомления
- Учёт посещаемости с автоматическим списанием занятий и уведомлениями
- Авторизация родителей к участникам по одноразовому коду
- Публичный список скидок и админ‑панель управления скидками
- Telegram‑уведомления родителям и администраторам о ключевых событиях

## Технологии
- Python, Flask
- SQLAlchemy (модели/ORM)
- Flask-CORS
- Telegram Bot API (уведомления)
- Jinja2 шаблоны для страниц (админ и публичные)

## Структура проекта (основное)
- `app.py` — точки входа и все основные маршруты API/страниц
- `models.py` — модели БД (User, Participant, SportGroup, Schedule, Subscription, Payment, Discount, LessonTransfer, Attendance, AttendanceRecord, AuthorizationCode)
- `config.py` — конфигурация приложения (`Config`)
- `templates/` — HTML шаблоны (`index.html`, `admin/*`, `schedule.html`, и т.д.)

## Быстрый старт (Windows PowerShell)
1) Клонируйте репозиторий
```powershell
cd C:\Users\Home\Documents\GitHub
git clone https://github.com/<you>/SportClubWebapps.git
cd SportClubWebapps
```

2) Создайте и активируйте виртуальную среду
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3) Установите зависимости
```powershell
pip install -r requirements.txt
```

4) Настройте переменные окружения (см. раздел «Конфигурация»)

5) Запустите сервер разработки
```powershell
python app.py
```
Приложение стартует на `http://127.0.0.1:5000`.

## Конфигурация
Значения берутся из `config.py` (класс `Config`). Минимально рекомендуемые параметры:
- `SECRET_KEY` — секретный ключ Flask
- `SQLALCHEMY_DATABASE_URI` — строка подключения к БД (например, `sqlite:///app.db`)
- `SQLALCHEMY_TRACK_MODIFICATIONS` — `False`
- `TELEGRAM_BOT_TOKEN` — токен Telegram‑бота для уведомлений
- `ADMIN_TELEGRAM_ID` — Telegram ID администратора (для назначения роли admin при инициализации)
- Контакты для родителей (отдаются публично в `/api/parent/contact`):
  - `ADMIN_CONTACT_NAME`
  - `ADMIN_CONTACT_PHONE`
  - `ADMIN_CONTACT_TELEGRAM` (допускается с `@` или без)
- Дополнительно:
  - `ENROLL_NOTIFY_CHAT_ID` — чат/канал для дублирования заявок на запись

Подсказка: если вы используете `.env`, импортируйте значения в `config.py`, либо экспортируйте переменные окружения перед запуском.

## Данные и инициализация
- При первом запуске создаются таблицы БД и инициализируются спортивные группы со встроенными описаниями и расписанием.
- Расписание хранится в БД (`Schedule`) и форматируется для отображения.
- Эндпоинты для принудительного обновления/сброса групп:
  - `POST /api/admin/update-sport-groups` — обновить данные групп
  - `POST /api/admin/reset-sport-groups` — сбросить и пересоздать группы и расписание

## Роли и сессии
- Роль назначается при инициализации пользователя через `POST /api/init`.
  - Если `telegram_id == Config.ADMIN_TELEGRAM_ID` → роль `admin`, иначе `parent`.
- Сессия хранит: `user_id`, `telegram_id`, `role`.
- Доступ к admin‑маршрутам осуществляется по `session['role'] == 'admin'`.

## Основные страницы
- `GET /` — главная (если админ авторизован — редирект в панель)
- `GET /index` — админ‑панель с общей статистикой
- `GET /schedule` — расписание всех групп для сайта
- `GET /admin/groups`, `GET /admin/students` — страницы админки

## Ключевые API эндпоинты (кратко)
- Публичные/общие:
  - `GET /api/sport-groups` — список групп с форматированным расписанием
  - `GET /api/sport-group/<id>` — детали группы (включая расписание в разрезе дней)
  - `GET /api/discounts` — активные скидки
  - `POST /api/enroll-request` — заявка на запись (уведомляет админов в Telegram)
- Инициализация/авторизация:
  - `POST /api/init` — инициализация пользователя (устанавливает роль в сессии)
  - `POST /api/auth/verify` — авторизация родителя к участнику по коду
  - `GET /api/auth/participants` — список участников, к которым получен доступ
- Родители:
  - `GET /api/parent/contact` — контакты администрации
  - `GET /api/participants` — участники, к которым есть доступ у текущего пользователя
  - `POST /api/parent/payment` — создание подписки и платежа (статус pending)
  - `POST /api/parent/transfer` — заявка на перенос занятия
  - `GET /api/parent/attendance/<participant_id>` — посещаемость участника
  - `GET /api/parent/financial-info` — фин.информация по активным подпискам
- Администраторы:
  - Участники: `GET/POST /api/admin/participants`, `GET/PUT/DELETE /api/admin/participants/<id>`
  - Группы/расписание: `GET /api/admin/attendance/groups`, `GET /api/admin/attendance/schedule/<group_id>`
  - Посещаемость: `GET /api/admin/attendance/participants/<group_id>/<date>`, `POST /api/admin/attendance/save`, `GET /api/admin/attendance/stats/<group_id>`
  - Финансы: `GET /api/admin/payments`, `POST /api/admin/payments/<id>/approve`, `POST /api/admin/payments/<id>/reject`, `GET /api/admin/group/<group_id>/participants`
  - Скидки: `GET/POST /api/admin/discounts`, `PUT/DELETE /api/admin/discounts/<id>`
  - Низкий баланс: `GET /api/admin/check-low-balance`
  - Группы: `POST /api/admin/update-sport-groups`, `POST /api/admin/reset-sport-groups`

Примечание: большинство админ‑маршрутов требует активной сессии с ролью `admin`.

## Рабочие процессы
- Платёж:
  1) Родитель создаёт подписку и платеж `POST /api/parent/payment` (status=pending)
  2) Админ подтверждает/отклоняет: `/api/admin/payments/<id>/approve|reject`
  3) Отправка Telegram‑уведомлений родителю и администратору
- Посещаемость:
  1) Админ выбирает дату/группу, отмечает присутствия
  2) Сохранение `POST /api/admin/attendance/save` — списание занятий, уведомления, финишный статус
  3) Доп.уведомления при остатке ≤ 1 занятия
- Авторизация родителей:
  1) Админ создаёт участника → генерируется `AuthorizationCode`
  2) Родитель вводит код в `POST /api/auth/verify` → выдаётся доступ к участнику

## Telegram уведомления
- Для отправки сообщений задайте `TELEGRAM_BOT_TOKEN`
- Для назначения администратора — `ADMIN_TELEGRAM_ID`
- Для заявок на запись можно задать `ENROLL_NOTIFY_CHAT_ID` (опционально)

## Полезные примеры (curl)
Инициализация сессии (замените поля фактическими данными Telegram WebApp):
```bash
curl -X POST http://127.0.0.1:5000/api/init \
  -H "Content-Type: application/json" \
  -d '{"id": 123456789, "username": "parent", "first_name": "Ivan", "last_name": "Ivanov"}' \
  -c cookies.txt -b cookies.txt
```
Получить группы:
```bash
curl http://127.0.0.1:5000/api/sport-groups -c cookies.txt -b cookies.txt
```
Создать платёж родителем:
```bash
curl -X POST http://127.0.0.1:5000/api/parent/payment \
  -H "Content-Type: application/json" \
  -d '{"participant_id": 1, "sport_group_id": 1, "subscription_type": "8 занятий", "total_lessons": 8, "amount": 4000}' \
  -c cookies.txt -b cookies.txt
```
Подтвердить платеж админом:
```bash
curl -X POST http://127.0.0.1:5000/api/admin/payments/1/approve \
  -H "Content-Type: application/json" \
  -d '{"admin_notes": "Оплачено наличными"}' \
  -c cookies.txt -b cookies.txt
```

## Развёртывание
- Настройте переменные окружения согласно разделу «Конфигурация»
- Используйте надёжный `SECRET_KEY` и отключите `debug=True`
- Рекомендуется reverse proxy (Nginx) и процесс‑менеджер (gunicorn/uwsgi)
- Настройте HTTPS и ограничение доступа к админ‑эндпоинтам

## Отладка и советы
- Логи включены (`logging.INFO`) и помогают диагностировать ошибки
- Если расписание не отображается — проверьте корректность записей `Schedule` и `day_of_week`
- Ошибки Telegram‑отправки видны в логах (проверьте токен и доступность API)
- Для повторной инициализации групп используйте `POST /api/admin/reset-sport-groups` (только admin)

## Лицензия
Укажите лицензию проекта при необходимости (например, MIT).
