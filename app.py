from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from models import db, User, Participant, SportGroup, Schedule, Subscription, Payment, Discount, LessonTransfer, Attendance, AttendanceRecord, AuthorizationCode
from config import Config
import json
from datetime import datetime, timedelta, date
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Инициализация расширений
    db.init_app(app)
    CORS(app)
    
    # Создание таблиц базы данных
    with app.app_context():
        db.create_all()
        # Инициализация спортивных групп
        init_sport_groups()
    
    return app

def init_sport_groups():
    """Инициализация спортивных групп при первом запуске"""
    if SportGroup.query.count() == 0:
        groups = [
            {
                'name': 'Дзюдо младшая группа', 
                'description': 'Группа для детей 5-7 лет',
                'detailed_description': 'Дзюдо для самых маленьких! Наши занятия направлены на развитие координации, гибкости и дисциплины у детей дошкольного возраста. В игровой форме дети изучают основы дзюдо, учатся работать в команде и развивают уверенность в себе.',
                'price_8': 4000, 
                'price_12': 5000,
                'price_single': 700,
                'trainer_name': 'Галоян Пайлак Араратович',
                'trainer_info': 'Является мастером спорта международного класса по дзюдо ' 
                                'Многократный призёр и чемпион чемпионатов России , 8 кратный медалист кубков Европы , бронзовый призер первенства Европы ' 
                                'Имеет педагогическое,юридическое образование '
                                'В основу ставит спортивную дисциплину  уважение к старшим '
                                'Опыт работы более 4 лет'
            },
            {
                'name': 'Дзюдо старшая группа', 
                'description': 'Группа для детей 7 лет и старше',
                'detailed_description': 'Серьезные тренировки по дзюдо для детей школьного возраста. Программа включает изучение техники, участие в соревнованиях, развитие физических качеств и спортивного характера.',
                'price_8': 4000,
                'price_12': 5000,
                'price_single': 700,
                'trainer_name': 'Галоян Пайлак Араратович',
                'trainer_info': 'Является мастером спорта международного класса по дзюдо ' 
                                'Многократный призёр и чемпион чемпионатов России , 8 кратный медалист кубков Европы , бронзовый призер первенства Европы ' 
                                'Имеет педагогическое,юридическое образование '
                                'В основу ставит спортивную дисциплину  уважение к старшим '
                                'Опыт работы более 4 лет'
            },
            {
                'name': 'Гимнастика', 
                'description': 'Группа детей от 3х до 10 лет', 
                'detailed_description': 'Художественная гимнастика для девочек - это красота, грация и сила! Занятия включают растяжку, элементы акробатики, работу с предметами (лента, мяч, обруч).',
                'price_8': 4000,
                'price_12': 5000,
                'price_single': 700,
                'trainer_name': 'Галоян Пайлак Араратович',
                'trainer_info': 'Является мастером спорта международного класса по дзюдо ' 
                                'Многократный призёр и чемпион чемпионатов России , 8 кратный медалист кубков Европы , бронзовый призер первенства Европы ' 
                                'Имеет педагогическое,юридическое образование '
                                'В основу ставит спортивную дисциплину  уважение к старшим '
                                'Опыт работы более 4 лет'
            },
            {
                'name': 'ММА', 
                'description': 'Смешанные единоборства для подростков от 14+ и взрослых',
                'detailed_description': 'Современные смешанные единоборства (MMA) - это сочетание различных боевых искусств. Тренировки включают ударную технику, борьбу, работу в партере.',
                'price_8': 4000,
                'price_12': 5000,
                'price_single': 900,
                'trainer_name': 'Галоян Пайлак Араратович',
                'trainer_info': 'Является мастером спорта международного класса по дзюдо ' 
                                'Многократный призёр и чемпион чемпионатов России , 8 кратный медалист кубков Европы , бронзовый призер первенства Европы ' 
                                'Имеет педагогическое,юридическое образование '
                                'В основу ставит спортивную дисциплину  уважение к старшим '
                                'Опыт работы более 4 лет'
            },
            {
                'name': 'Женский фитнес', 
                'description': 'Фитнес программы для женщин', 
                'detailed_description': 'Специально разработанные программы фитнеса для женщин всех возрастов. Включают кардио-тренировки, силовые упражнения, растяжку и функциональный тренинг.',
                'price_8': 4000,
                'price_single': 700,
                'trainer_name': 'Анна Морозова',
                'trainer_info': 'Сертифицированный тренер по фитнесу, специалист по женскому здоровью и питанию. Опыт работы в фитнес-индустрии 12 лет.'
            }
        ]
        
        for group_data in groups:
            group = SportGroup(**group_data)
            db.session.add(group)
        
        db.session.commit()

app = create_app()

@app.route('/')
def index():
    """Главная страница приложения"""
    return render_template('index.html')

@app.route('/group/<int:group_id>')
def group_details(group_id):
    """Страница с подробной информацией о группе"""
    return render_template('group_details.html')

@app.route('/api/init', methods=['POST'])
def init_user():
    """Инициализация пользователя при входе в Web App"""
    try:
        data = request.get_json()
        telegram_id = data.get('id')
        username = data.get('username', '')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        
        # Проверяем, существует ли пользователь
        user = User.query.filter_by(telegram_id=telegram_id).first()
        
        if not user:
            # Определяем роль пользователя
            role = 'admin' if telegram_id == app.config['ADMIN_TELEGRAM_ID'] else 'parent'
            
            # Создаем нового пользователя
            user = User(
                telegram_id=telegram_id,
                username=username,
                first_name=first_name,
                last_name=last_name,
                role=role
            )
            db.session.add(user)
            db.session.commit()
        
        # Сохраняем информацию в сессии
        session['user_id'] = user.id
        session['telegram_id'] = user.telegram_id
        session['role'] = user.role
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'telegram_id': user.telegram_id,
                'role': user.role,
                'first_name': user.first_name
            }
        })
    
    except Exception as e:
        logger.error(f"Error in init_user: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sport-groups')
def get_sport_groups():
    """Получение списка спортивных групп"""
    try:
        groups = SportGroup.query.all()
        return jsonify({
            'success': True,
            'groups': [{
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'price_8': group.price_8,
                'price_12': group.price_12,
                'price_single': group.price_single
            } for group in groups]
        })
    except Exception as e:
        logger.error(f"Error in get_sport_groups: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sport-group/<int:group_id>')
def get_sport_group_details(group_id):
    """Получение подробной информации о спортивной группе"""
    try:
        group = SportGroup.query.get_or_404(group_id)
        schedules = Schedule.query.filter_by(sport_group_id=group_id).all()
        days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
        
        return jsonify({
            'success': True,
            'group': {
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'detailed_description': group.detailed_description,
                'trainer_name': group.trainer_name,
                'trainer_info': group.trainer_info,
                'price_8': group.price_8,
                'price_12': group.price_12,
                'price_single': group.price_single,
                'schedule': [{
                    'id': schedule.id,
                    'day': days[schedule.day_of_week],
                    'start_time': schedule.start_time.strftime('%H:%M'),
                    'end_time': schedule.end_time.strftime('%H:%M')
                } for schedule in schedules]
            }
        })
    except Exception as e:
        logger.error(f"Error in get_sport_group_details: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/schedule/<int:group_id>')
def get_schedule(group_id):
    """Получение расписания для конкретной группы"""
    try:
        schedules = Schedule.query.filter_by(sport_group_id=group_id).all()
        days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
        
        return jsonify({
            'success': True,
            'schedule': [{
                'id': schedule.id,
                'day': days[schedule.day_of_week],
                'start_time': schedule.start_time.strftime('%H:%M'),
                'end_time': schedule.end_time.strftime('%H:%M')
            } for schedule in schedules]
        })
    except Exception as e:
        logger.error(f"Error in get_schedule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Административные маршруты
@app.route('/api/admin/participants', methods=['GET', 'POST'])
def admin_participants():
    """Управление участниками (только для администратора)"""
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    if request.method == 'GET':
        try:
            participants = Participant.query.all()
            return jsonify({
                'success': True,
                'participants': [{
                    'id': p.id,
                    'full_name': p.full_name,
                    'parent_phone': p.parent_phone,
                    'birth_date': p.birth_date.strftime('%Y-%m-%d'),
                    'medical_certificate': p.medical_certificate,
                    'discount_type': p.discount_type,
                    'discount_percent': p.discount_percent
                } for p in participants]
            })
        except Exception as e:
            logger.error(f"Error in admin_participants GET: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            
            # Создаем нового участника
            participant = Participant(
                user_id=session.get('user_id'),
                full_name=data['full_name'],
                parent_phone=data['parent_phone'],
                birth_date=datetime.strptime(data['birth_date'], '%Y-%m-%d').date(),
                medical_certificate=data.get('medical_certificate', False),
                discount_type=data.get('discount_type'),
                discount_percent=data.get('discount_percent', 0)
            )
            
            db.session.add(participant)
            db.session.commit()
            
            # Если указана группа, создаем подписку
            if data.get('sport_group_id'):
                sport_group = SportGroup.query.get(data['sport_group_id'])
                if sport_group:
                    subscription = Subscription(
                        participant_id=participant.id,
                        sport_group_id=data['sport_group_id'],
                        subscription_type='8 занятий',  # По умолчанию
                        total_lessons=8,
                        remaining_lessons=8,
                        start_date=datetime.now().date(),
                        end_date=(datetime.now() + timedelta(days=30)).date(),
                        is_active=True
                    )
                    db.session.add(subscription)
                    db.session.commit()
            
            # Генерируем код авторизации для родителя
            auth_code = AuthorizationCode(
                participant_id=participant.id,
                code=AuthorizationCode.generate_code()
            )
            db.session.add(auth_code)
            db.session.commit()
            
            return jsonify({
                'success': True, 
                'participant_id': participant.id,
                'authorization_code': auth_code.code
            })
        except Exception as e:
            logger.error(f"Error in admin_participants POST: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/schedule', methods=['GET', 'POST'])
def admin_schedule():
    """Управление расписанием (только для администратора)"""
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    if request.method == 'GET':
        try:
            schedules = Schedule.query.join(SportGroup).all()
            return jsonify({
                'success': True,
                'schedules': [{
                    'id': s.id,
                    'sport_group_name': s.sport_group.name,
                    'day_of_week': s.day_of_week,
                    'start_time': s.start_time.strftime('%H:%M'),
                    'end_time': s.end_time.strftime('%H:%M')
                } for s in schedules]
            })
        except Exception as e:
            logger.error(f"Error in admin_schedule GET: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            
            schedule = Schedule(
                sport_group_id=data['sport_group_id'],
                day_of_week=data['day_of_week'],
                start_time=datetime.strptime(data['start_time'], '%H:%M').time(),
                end_time=datetime.strptime(data['end_time'], '%H:%M').time()
            )
            
            db.session.add(schedule)
            db.session.commit()
            
            return jsonify({'success': True, 'schedule_id': schedule.id})
        except Exception as e:
            logger.error(f"Error in admin_schedule POST: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/payments')
def admin_payments():
    """Просмотр платежей (только для администратора)"""
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    try:
        payments = Payment.query.join(Subscription).join(Participant).join(SportGroup).all()
        return jsonify({
            'success': True,
            'payments': [{
                'id': p.id,
                'participant_name': p.subscription.participant.full_name,
                'participant_phone': p.subscription.participant.parent_phone,
                'sport_group': p.subscription.sport_group.name,
                'subscription_type': p.subscription.subscription_type,
                'amount': p.amount,
                'payment_method': p.payment_method,
                'status': p.status,
                'is_paid': p.is_paid,
                'payment_date': p.payment_date.strftime('%Y-%m-%d %H:%M') if p.payment_date else None,
                'created_at': p.created_at.strftime('%Y-%m-%d %H:%M'),
                'admin_notes': p.admin_notes
            } for p in payments]
        })
    except Exception as e:
        logger.error(f"Error in admin_payments: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/payments/<int:payment_id>/approve', methods=['POST'])
def approve_payment(payment_id):
    """Подтвердить платеж"""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        data = request.get_json()
        admin_notes = data.get('admin_notes', '')
        
        payment = Payment.query.get(payment_id)
        if not payment:
            return jsonify({'success': False, 'error': 'Платеж не найден'}), 404
        
        if payment.status != 'pending':
            return jsonify({'success': False, 'error': 'Платеж уже обработан'}), 400
        
        # Подтверждаем платеж
        payment.status = 'approved'
        payment.is_paid = True
        payment.payment_date = datetime.utcnow()
        payment.admin_notes = admin_notes
        
        db.session.commit()
        
        # Отправляем уведомление пользователю
        send_payment_confirmation_to_user(payment, 'approved')
        
        return jsonify({'success': True, 'message': 'Платеж подтвержден'})
    except Exception as e:
        logger.error(f"Error in approve_payment: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/payments/<int:payment_id>/reject', methods=['POST'])
def reject_payment(payment_id):
    """Отклонить платеж"""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        data = request.get_json()
        admin_notes = data.get('admin_notes', '')
        
        payment = Payment.query.get(payment_id)
        if not payment:
            return jsonify({'success': False, 'error': 'Платеж не найден'}), 404
        
        if payment.status != 'pending':
            return jsonify({'success': False, 'error': 'Платеж уже обработан'}), 400
        
        # Отклоняем платеж
        payment.status = 'rejected'
        payment.is_paid = False
        payment.admin_notes = admin_notes
        
        db.session.commit()
        
        # Отправляем уведомление пользователю
        send_payment_confirmation_to_user(payment, 'rejected')
        
        return jsonify({'success': True, 'message': 'Платеж отклонен'})
    except Exception as e:
        logger.error(f"Error in reject_payment: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/students')
def admin_students():
    """Получить список всех учеников с финансовой информацией"""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Получаем всех участников с их подписками и платежами
        participants = Participant.query.all()
        
        students_data = []
        for participant in participants:
            # Получаем активные подписки участника
            subscriptions = Subscription.query.filter_by(
                participant_id=participant.id,
                is_active=True
            ).all()
            
            participant_subscriptions = []
            total_paid_all = 0
            total_remaining_all = 0
            
            for subscription in subscriptions:
                # Получаем подтвержденные платежи для этой подписки
                payments = Payment.query.filter_by(
                    subscription_id=subscription.id,
                    status='approved'
                ).all()
                
                total_paid = sum(payment.amount for payment in payments)
                
                # Добавляем подписку только если есть подтвержденные платежи
                if total_paid > 0:
                    total_paid_all += total_paid
                    total_remaining_all += subscription.remaining_lessons
                    
                    participant_subscriptions.append({
                        'subscription_id': subscription.id,
                        'sport_group_name': subscription.sport_group.name,
                        'subscription_type': subscription.subscription_type,
                        'total_lessons': subscription.total_lessons,
                        'remaining_lessons': subscription.remaining_lessons,
                        'total_paid': total_paid,
                        'start_date': subscription.start_date.strftime('%Y-%m-%d'),
                        'end_date': subscription.end_date.strftime('%Y-%m-%d')
                    })
            
            # Добавляем участника только если у него есть оплаченные подписки
            if participant_subscriptions:
                students_data.append({
                    'participant_id': participant.id,
                    'participant_name': participant.full_name,
                    'parent_phone': participant.parent_phone,
                    'birth_date': participant.birth_date.strftime('%Y-%m-%d'),
                    'medical_certificate': participant.medical_certificate,
                    'discount_type': participant.discount_type,
                    'discount_percent': participant.discount_percent,
                    'subscriptions': participant_subscriptions,
                    'total_paid_all': total_paid_all,
                    'total_remaining_all': total_remaining_all,
                    'subscription_count': len(participant_subscriptions)
                })
        
        # Сортируем по имени участника
        students_data.sort(key=lambda x: x['participant_name'])
        
        return jsonify({
            'success': True,
            'students': students_data
        })
        
    except Exception as e:
        logger.error(f"Error in admin_students: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/group/<int:group_id>/students')
def admin_group_students(group_id):
    """Получить список учеников конкретной группы с оплаченными подписками"""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Получаем всех участников с активными подписками в данной группе
        subscriptions = Subscription.query.filter_by(
            sport_group_id=group_id,
            is_active=True
        ).all()
        
        students_data = []
        for subscription in subscriptions:
            # Проверяем, есть ли подтвержденные платежи для этой подписки
            payments = Payment.query.filter_by(
                subscription_id=subscription.id,
                status='approved'
            ).all()
            
            # Показываем только тех, у кого есть подтвержденные платежи
            if payments:
                total_paid = sum(payment.amount for payment in payments)
                participant = subscription.participant
                
                students_data.append({
                    'participant_id': participant.id,
                    'participant_name': participant.full_name,
                    'parent_phone': participant.parent_phone,
                    'birth_date': participant.birth_date.strftime('%Y-%m-%d'),
                    'medical_certificate': participant.medical_certificate,
                    'discount_type': participant.discount_type,
                    'discount_percent': participant.discount_percent,
                    'subscription_id': subscription.id,
                    'subscription_type': subscription.subscription_type,
                    'total_lessons': subscription.total_lessons,
                    'remaining_lessons': subscription.remaining_lessons,
                    'total_paid': total_paid,
                    'start_date': subscription.start_date.strftime('%Y-%m-%d'),
                    'end_date': subscription.end_date.strftime('%Y-%m-%d')
                })
        
        # Сортируем по имени участника
        students_data.sort(key=lambda x: x['participant_name'])
        
        return jsonify({
            'success': True,
            'students': students_data
        })
        
    except Exception as e:
        logger.error(f"Error in admin_group_students: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/subscription/<int:subscription_id>/delete', methods=['DELETE'])
def delete_subscription(subscription_id):
    """Удалить подписку"""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        subscription = Subscription.query.get(subscription_id)
        if not subscription:
            return jsonify({'success': False, 'error': 'Подписка не найдена'}), 404
        
        # Получаем информацию о подписке для уведомления
        participant = subscription.participant
        sport_group = subscription.sport_group
        user = participant.user
        
        # Удаляем связанные платежи
        payments = Payment.query.filter_by(subscription_id=subscription_id).all()
        for payment in payments:
            db.session.delete(payment)
        
        # Удаляем подписку
        db.session.delete(subscription)
        db.session.commit()
        
        # Отправляем уведомление пользователю
        if user.telegram_id:
            delete_message = f"🗑️ Подписка {participant.full_name} в группе '{sport_group.name}' ({subscription.subscription_type}) была удалена администратором."
            send_telegram_notification(user.telegram_id, delete_message)
        
        return jsonify({'success': True, 'message': 'Подписка успешно удалена'})
    except Exception as e:
        logger.error(f"Error in delete_subscription: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Скидки и акции - публичный список для всех пользователей
@app.route('/api/discounts', methods=['GET'])
def list_discounts():
    try:
        # Только активные скидки для обычных пользователей
        discounts = Discount.query.filter_by(is_active=True).all()
        return jsonify({
            'success': True,
            'discounts': [{
                'id': d.id,
                'name': d.name,
                'description': d.description,
                'discount_type': d.discount_type,
                'discount_percent': d.discount_percent,
                'start_date': d.start_date.strftime('%Y-%m-%d') if d.start_date else None,
                'end_date': d.end_date.strftime('%Y-%m-%d') if d.end_date else None,
                'is_active': d.is_active
            } for d in discounts]
        })
    except Exception as e:
        logger.error(f"Error in list_discounts: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Админ: управление скидками
@app.route('/api/admin/discounts', methods=['GET', 'POST'])
def admin_discounts():
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    if request.method == 'GET':
        try:
            discounts = Discount.query.all()
            return jsonify({
                'success': True,
                'discounts': [{
                    'id': d.id,
                    'name': d.name,
                    'description': d.description,
                    'discount_type': d.discount_type,
                    'discount_percent': d.discount_percent,
                    'start_date': d.start_date.strftime('%Y-%m-%d') if d.start_date else None,
                    'end_date': d.end_date.strftime('%Y-%m-%d') if d.end_date else None,
                    'is_active': d.is_active
                } for d in discounts]
            })
        except Exception as e:
            logger.error(f"Error in admin_discounts GET: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    else:
        try:
            data = request.get_json()
            discount = Discount(
                name=data['name'],
                description=data.get('description'),
                discount_type=data['discount_type'],
                discount_percent=int(data['discount_percent']),
                is_active=bool(data.get('is_active', True)),
                start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
                end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            )
            db.session.add(discount)
            db.session.commit()
            return jsonify({'success': True, 'discount_id': discount.id})
        except Exception as e:
            logger.error(f"Error in admin_discounts POST: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/discounts/<int:discount_id>', methods=['PUT', 'DELETE'])
def admin_discounts_update(discount_id):
    if session.get('role') != 'admin':
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    try:
        discount: Discount | None = Discount.query.get_or_404(discount_id)
        if request.method == 'DELETE':
            db.session.delete(discount)
            db.session.commit()
            return jsonify({'success': True})
        # PUT update
        data = request.get_json()
        if 'name' in data:
            discount.name = data['name']
        if 'description' in data:
            discount.description = data['description']
        if 'discount_type' in data:
            discount.discount_type = data['discount_type']
        if 'discount_percent' in data:
            discount.discount_percent = int(data['discount_percent'])
        if 'is_active' in data:
            discount.is_active = bool(data['is_active'])
        if 'start_date' in data:
            discount.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data['start_date'] else None
        if 'end_date' in data:
            discount.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data['end_date'] else None
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error in admin_discounts_update: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Маршруты для родителей
@app.route('/api/parent/contact')
def parent_contact():
    """Связаться с администрацией"""
    return jsonify({
        'success': True,
        'contact_info': {
            'phone': '+7 (XXX) XXX-XX-XX',
            'email': 'admin@sportclub.ru',
            'address': 'г. Москва, ул. Спортивная, д. 1'
        }
    })

@app.route('/api/participants')
def get_participants():
    """Получить список участников пользователя"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        # Получаем авторизованных участников пользователя
        auth_codes = AuthorizationCode.query.filter_by(
            used_by_user_id=user_id,
            is_used=True
        ).all()
        
        participants = [auth_code.participant for auth_code in auth_codes]
        
        return jsonify({
            'success': True,
            'participants': [{
                'id': participant.id,
                'full_name': participant.full_name,
                'parent_phone': participant.parent_phone,
                'birth_date': participant.birth_date.strftime('%Y-%m-%d'),
                'medical_certificate': participant.medical_certificate,
                'discount_type': participant.discount_type,
                'discount_percent': participant.discount_percent
            } for participant in participants]
        })
    except Exception as e:
        logger.error(f"Error in get_participants: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/parent/payment', methods=['POST'])
def parent_payment():
    """Оплата занятий"""
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        # Проверяем, что пользователь имеет доступ к участнику
        auth_code = AuthorizationCode.query.filter_by(
            participant_id=data['participant_id'],
            used_by_user_id=user_id,
            is_used=True
        ).first()
        
        if not auth_code:
            return jsonify({'success': False, 'error': 'Нет доступа к указанному участнику'}), 403
        
        # Проверяем, что участник существует
        participant = Participant.query.get(data['participant_id'])
        if not participant:
            return jsonify({'success': False, 'error': 'Участник не найден'}), 404
        
        # Создаем подписку
        subscription = Subscription(
            participant_id=data['participant_id'],
            sport_group_id=data['sport_group_id'],
            subscription_type=data['subscription_type'],
            total_lessons=data['total_lessons'],
            remaining_lessons=data['total_lessons'],
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30)
        )
        
        db.session.add(subscription)
        db.session.commit()
        
        # Создаем платеж в статусе ожидания подтверждения
        payment = Payment(
            user_id=session.get('user_id'),
            subscription_id=subscription.id,
            amount=data['amount'],
            payment_method=data.get('payment_method', 'cash'),
            status='pending'
        )
        
        db.session.add(payment)
        db.session.commit()
        
        # Отправляем уведомление администратору о новом платеже
        send_payment_notification_to_admin(payment)
        
        return jsonify({'success': True, 'payment_id': payment.id, 'message': 'Платеж создан и ожидает подтверждения администратора'})
    except Exception as e:
        logger.error(f"Error in parent_payment: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/parent/transfer', methods=['POST'])
def parent_transfer():
    """Перенос занятия"""
    try:
        data = request.get_json()
        
        transfer = LessonTransfer(
            subscription_id=data['subscription_id'],
            original_date=datetime.strptime(data['original_date'], '%Y-%m-%d').date(),
            new_date=datetime.strptime(data['new_date'], '%Y-%m-%d').date(),
            reason=data['reason']
        )
        
        db.session.add(transfer)
        db.session.commit()
        
        return jsonify({'success': True, 'transfer_id': transfer.id})
    except Exception as e:
        logger.error(f"Error in parent_transfer: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# API endpoints для системы посещаемости

@app.route('/api/admin/attendance/groups')
def admin_attendance_groups():
    """Получить список групп для учета посещаемости"""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        groups = SportGroup.query.all()
        return jsonify({
            'success': True,
            'groups': [{
                'id': group.id,
                'name': group.name,
                'description': group.description
            } for group in groups]
        })
    except Exception as e:
        logger.error(f"Error in admin_attendance_groups: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/attendance/schedule/<int:group_id>')
def admin_attendance_schedule(group_id):
    """Получить расписание группы для учета посещаемости"""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Получаем расписание группы
        schedules = Schedule.query.filter_by(sport_group_id=group_id).all()
        
        # Генерируем даты на ближайшие 4 недели
        today = date.today()
        dates = []
        day_names = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
        
        for i in range(28):  # 4 недели
            current_date = today + timedelta(days=i)
            day_of_week = current_date.weekday()
            
            # Проверяем, есть ли занятия в этот день недели
            for schedule in schedules:
                if schedule.day_of_week == day_of_week:
                    # Проверяем, создана ли уже запись посещаемости
                    existing_attendance = Attendance.query.filter_by(
                        sport_group_id=group_id,
                        lesson_date=current_date
                    ).first()
                    
                    dates.append({
                        'date': current_date.strftime('%Y-%m-%d'),
                        'day_name': day_names[day_of_week],
                        'day_number': current_date.day,
                        'month': current_date.strftime('%B'),
                        'year': current_date.year,
                        'start_time': schedule.start_time.strftime('%H:%M'),
                        'end_time': schedule.end_time.strftime('%H:%M'),
                        'has_attendance': existing_attendance is not None,
                        'is_completed': existing_attendance.is_completed if existing_attendance else False
                    })
                    break
        
        return jsonify({
            'success': True,
            'dates': dates
        })
    except Exception as e:
        logger.error(f"Error in admin_attendance_schedule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/attendance/participants/<int:group_id>/<date>')
def admin_attendance_participants(group_id, date):
    """Получить список участников группы для учета посещаемости на конкретную дату"""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        lesson_date = datetime.strptime(date, '%Y-%m-%d').date()
        
        # Получаем активных участников группы
        participants = Participant.query.join(Subscription).filter(
            Subscription.sport_group_id == group_id,
            Subscription.is_active == True,
            Subscription.start_date <= lesson_date,
            Subscription.end_date >= lesson_date
        ).all()
        
        # Проверяем существующую запись посещаемости
        attendance = Attendance.query.filter_by(
            sport_group_id=group_id,
            lesson_date=lesson_date
        ).first()
        
        # Если записи нет, создаем новую
        if not attendance:
            # Получаем расписание для этого дня недели
            day_of_week = lesson_date.weekday()
            schedule = Schedule.query.filter_by(
                sport_group_id=group_id,
                day_of_week=day_of_week
            ).first()
            
            if not schedule:
                return jsonify({'success': False, 'error': 'Нет расписания на этот день'}), 400
            
            attendance = Attendance(
                sport_group_id=group_id,
                lesson_date=lesson_date,
                day_of_week=day_of_week,
                start_time=schedule.start_time,
                end_time=schedule.end_time
            )
            db.session.add(attendance)
            db.session.commit()
        
        # Получаем записи посещаемости
        attendance_records = {}
        for record in attendance.records:
            attendance_records[record.participant_id] = record.is_present
        
        return jsonify({
            'success': True,
            'attendance_id': attendance.id,
            'participants': [{
                'id': participant.id,
                'full_name': participant.full_name,
                'parent_phone': participant.parent_phone,
                'is_present': attendance_records.get(participant.id, False)
            } for participant in participants],
            'is_completed': attendance.is_completed
        })
    except Exception as e:
        logger.error(f"Error in admin_attendance_participants: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/attendance/save', methods=['POST'])
def admin_attendance_save():
    """Сохранить посещаемость и отправить уведомления"""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        data = request.get_json()
        attendance_id = data['attendance_id']
        participants_data = data['participants']
        
        # Обновляем записи посещаемости
        for participant_data in participants_data:
            participant_id = participant_data['id']
            is_present = participant_data['is_present']
            absence_reason = participant_data.get('absence_reason', 'unexcused') if not is_present else None
            
            # Находим или создаем запись
            record = AttendanceRecord.query.filter_by(
                attendance_id=attendance_id,
                participant_id=participant_id
            ).first()
            
            if not record:
                record = AttendanceRecord(
                    attendance_id=attendance_id,
                    participant_id=participant_id,
                    is_present=is_present,
                    absence_reason=absence_reason
                )
                db.session.add(record)
            else:
                record.is_present = is_present
                record.absence_reason = absence_reason
        
        # Отмечаем занятие как завершенное
        attendance = Attendance.query.get(attendance_id)
        attendance.is_completed = True
        
        # Уменьшаем количество оставшихся занятий у участников
        for participant_data in participants_data:
            participant_id = participant_data['id']
            is_present = participant_data['is_present']
            
            # Находим активную подписку участника в этой группе
            subscription = Subscription.query.filter_by(
                participant_id=participant_id,
                sport_group_id=attendance.sport_group_id,
                is_active=True
            ).first()
            
            # Логируем для отладки
            participant = Participant.query.get(participant_id)
            logger.info(f"Processing attendance for participant {participant.full_name if participant else participant_id}, present: {is_present}, subscription found: {subscription is not None}")
            
            if subscription and subscription.remaining_lessons > 0:
                logger.info(f"Processing subscription for {participant.full_name}, remaining lessons: {subscription.remaining_lessons}")
                logger.info(f"Subscription ID: {subscription.id}, Group: {subscription.sport_group.name}")
            else:
                if not subscription:
                    logger.warning(f"No active subscription found for {participant.full_name} in group {attendance.sport_group_id}")
                    continue
                elif subscription.remaining_lessons <= 0:
                    logger.warning(f"No remaining lessons for {participant.full_name}, current: {subscription.remaining_lessons}")
                    continue
                # Уменьшаем количество занятий для присутствующих участников
                if is_present:
                    old_remaining = subscription.remaining_lessons
                    subscription.remaining_lessons -= 1
                    logger.info(f"Decreased lessons for {participant.full_name}: {old_remaining} -> {subscription.remaining_lessons}")
                    
                    # Принудительно обновляем объект в сессии
                    db.session.add(subscription)
                    db.session.flush()
                    
                    participant = subscription.participant
                    
                    # Находим пользователя через коды авторизации
                    auth_code = AuthorizationCode.query.filter_by(
                        participant_id=participant.id,
                        is_used=True
                    ).first()
                    
                    logger.info(f"Looking for auth code for participant {participant.full_name} (ID: {participant.id})")
                    logger.info(f"Found auth code: {auth_code is not None}")
                    
                    if auth_code:
                        logger.info(f"Auth code used by user ID: {auth_code.used_by_user_id}")
                        logger.info(f"Used by user: {auth_code.used_by_user is not None}")
                        if auth_code.used_by_user:
                            logger.info(f"User telegram ID: {auth_code.used_by_user.telegram_id}")
                    
                    if auth_code and auth_code.used_by_user and auth_code.used_by_user.telegram_id:
                        user = auth_code.used_by_user
                        logger.info(f"Sending notification to user {user.id} with telegram_id {user.telegram_id}")
                        logger.info(f"User username: {user.username}, role: {user.role}")
                        
                        # Уведомление о посещении занятия
                        present_message = f"✅ {participant.full_name} посетил тренировку {attendance.lesson_date.strftime('%d.%m.%Y')} в группе '{attendance.sport_group.name}'. Осталось: {subscription.remaining_lessons} занятий."
                        logger.info(f"Sending message: {present_message}")
                        send_telegram_notification(user.telegram_id, present_message)
                        
                        # Если осталось 1 занятие или меньше, отправляем дополнительное уведомление
                        if subscription.remaining_lessons <= 1:
                            parent_message = f"⚠️ Внимание! У {participant.full_name} осталось {subscription.remaining_lessons} оплаченных занятий в группе '{attendance.sport_group.name}'. Пожалуйста, пополните баланс."
                            send_telegram_notification(user.telegram_id, parent_message)
                    else:
                        logger.warning(f"No authorized user found for participant {participant.full_name}")
                        if auth_code:
                            logger.warning(f"Auth code exists but no user or telegram_id")
                        else:
                            logger.warning(f"No auth code found for participant {participant.id}")
                
                # Для отсутствующих участников списываем занятие только при неуважительной причине
                elif not is_present and absence_reason == 'unexcused':
                    old_remaining = subscription.remaining_lessons
                    subscription.remaining_lessons -= 1
                    logger.info(f"Decreased lessons for absent {participant.full_name}: {old_remaining} -> {subscription.remaining_lessons}")
                    
                    # Принудительно обновляем объект в сессии
                    db.session.add(subscription)
                    db.session.flush()
                    
                    participant = subscription.participant
                    
                    # Находим пользователя через коды авторизации
                    auth_code = AuthorizationCode.query.filter_by(
                        participant_id=participant.id,
                        is_used=True
                    ).first()
                    
                    if auth_code and auth_code.used_by_user and auth_code.used_by_user.telegram_id:
                        user = auth_code.used_by_user
                        
                        # Уведомление о прогуле и списании занятия
                        absence_message = f"❌ {participant.full_name} отсутствовал на занятии {attendance.lesson_date.strftime('%d.%m.%Y')} в группе '{attendance.sport_group.name}' без уважительной причины. Занятие списано. Осталось: {subscription.remaining_lessons} занятий."
                        send_telegram_notification(user.telegram_id, absence_message)
                        
                        # Если осталось 1 занятие или меньше, отправляем дополнительное уведомление
                        if subscription.remaining_lessons <= 1:
                            parent_message = f"⚠️ Внимание! У {participant.full_name} осталось {subscription.remaining_lessons} оплаченных занятий в группе '{attendance.sport_group.name}'. Пожалуйста, пополните баланс."
                            send_telegram_notification(user.telegram_id, parent_message)
                    else:
                        logger.warning(f"No authorized user found for participant {participant.full_name}")
                
                # Для отсутствующих с уважительной причиной отправляем уведомление без списания
                elif not is_present and absence_reason == 'excused':
                    participant = subscription.participant
                    
                    # Находим пользователя через коды авторизации
                    auth_code = AuthorizationCode.query.filter_by(
                        participant_id=participant.id,
                        is_used=True
                    ).first()
                    
                    if auth_code and auth_code.used_by_user and auth_code.used_by_user.telegram_id:
                        user = auth_code.used_by_user
                        
                        # Уведомление об отсутствии с уважительной причиной
                        absence_message = f"ℹ️ {participant.full_name} отсутствовал на занятии {attendance.lesson_date.strftime('%d.%m.%Y')} в группе '{attendance.sport_group.name}' по уважительной причине. Занятие не списано. Осталось: {subscription.remaining_lessons} занятий."
                        send_telegram_notification(user.telegram_id, absence_message)
                    else:
                        logger.warning(f"No authorized user found for participant {participant.full_name}")
        
        db.session.commit()
        
        # Проверяем, что изменения сохранились
        for participant_data in participants_data:
            participant_id = participant_data['id']
            is_present = participant_data['is_present']
            
            # Принудительно обновляем из базы данных
            db.session.expire_all()
            
            subscription = Subscription.query.filter_by(
                participant_id=participant_id,
                sport_group_id=attendance.sport_group_id,
                is_active=True
            ).first()
            
            if subscription:
                participant = Participant.query.get(participant_id)
                logger.info(f"After commit: {participant.full_name} has {subscription.remaining_lessons} lessons remaining")
        
        # Отправляем уведомления родителям о посещаемости
        send_attendance_notifications(attendance_id)
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error in admin_attendance_save: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/attendance/stats/<int:group_id>')
def admin_attendance_stats(group_id):
    """Получить статистику посещаемости группы"""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Получаем все записи посещаемости группы
        attendances = Attendance.query.filter_by(sport_group_id=group_id).all()
        
        stats = {}
        for attendance in attendances:
            date_str = attendance.lesson_date.strftime('%Y-%m-%d')
            total_participants = len(attendance.records)
            present_count = sum(1 for record in attendance.records if record.is_present)
            
            stats[date_str] = {
                'date': date_str,
                'day_name': ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'][attendance.day_of_week],
                'total': total_participants,
                'present': present_count,
                'absent': total_participants - present_count,
                'percentage': round((present_count / total_participants * 100) if total_participants > 0 else 0, 1)
            }
        
        return jsonify({
            'success': True,
            'stats': list(stats.values())
        })
    except Exception as e:
        logger.error(f"Error in admin_attendance_stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/parent/attendance/<int:participant_id>')
def parent_attendance(participant_id):
    """Получить статистику посещаемости для родителя"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        # Проверяем, что у пользователя есть доступ к участнику через авторизацию
        auth_code = AuthorizationCode.query.filter_by(
            participant_id=participant_id,
            used_by_user_id=user_id,
            is_used=True
        ).first()
        
        if not auth_code:
            return jsonify({'success': False, 'error': 'Нет доступа к участнику'}), 403
        
        participant = auth_code.participant
        
        # Получаем записи посещаемости участника
        records = AttendanceRecord.query.filter_by(participant_id=participant_id).all()
        
        stats = {}
        for record in records:
            attendance = record.attendance
            date_str = attendance.lesson_date.strftime('%Y-%m-%d')
            
            stats[date_str] = {
                'date': date_str,
                'day_name': ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'][attendance.day_of_week],
                'sport_group': attendance.sport_group.name,
                'is_present': record.is_present,
                'start_time': attendance.start_time.strftime('%H:%M'),
                'end_time': attendance.end_time.strftime('%H:%M')
            }
        
        return jsonify({
            'success': True,
            'participant_name': participant.full_name,
            'stats': list(stats.values())
        })
    except Exception as e:
        logger.error(f"Error in parent_attendance: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# API endpoints для учета финансов

@app.route('/api/admin/group/<int:group_id>/participants')
def admin_group_participants(group_id):
    """Получить список участников группы с финансовой информацией"""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Получаем участников группы с их подписками
        participants = Participant.query.join(Subscription).filter(
            Subscription.sport_group_id == group_id,
            Subscription.is_active == True
        ).all()
        
        participants_data = []
        for participant in participants:
            # Получаем активную подписку участника
            subscription = Subscription.query.filter_by(
                participant_id=participant.id,
                sport_group_id=group_id,
                is_active=True
            ).first()
            
            if subscription:
                # Получаем информацию о платежах
                payments = Payment.query.filter_by(subscription_id=subscription.id).all()
                total_paid = sum(payment.amount for payment in payments if payment.is_paid)
                
                participants_data.append({
                    'id': participant.id,
                    'full_name': participant.full_name,
                    'parent_phone': participant.parent_phone,
                    'subscription_type': subscription.subscription_type,
                    'total_lessons': subscription.total_lessons,
                    'remaining_lessons': subscription.remaining_lessons,
                    'total_paid': total_paid,
                    'start_date': subscription.start_date.strftime('%Y-%m-%d'),
                    'end_date': subscription.end_date.strftime('%Y-%m-%d'),
                    'is_active': subscription.is_active,
                    'needs_notification': subscription.remaining_lessons <= 1
                })
        
        return jsonify({
            'success': True,
            'participants': participants_data
        })
        
    except Exception as e:
        logger.error(f"Error in admin_group_participants: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/parent/financial-info')
def parent_financial_info():
    """Получить финансовую информацию для родителя"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        # Получаем авторизованных участников пользователя
        auth_codes = AuthorizationCode.query.filter_by(
            used_by_user_id=user_id,
            is_used=True
        ).all()
        
        financial_data = []
        for auth_code in auth_codes:
            participant = auth_code.participant
            
            # Получаем активные подписки участника
            subscriptions = Subscription.query.filter_by(
                participant_id=participant.id,
                is_active=True
            ).all()
            
            participant_subscriptions = []
            for subscription in subscriptions:
                # Получаем информацию о подтвержденных платежах
                payments = Payment.query.filter_by(subscription_id=subscription.id, status='approved').all()
                total_paid = sum(payment.amount for payment in payments)
                
                participant_subscriptions.append({
                    'subscription_id': subscription.id,
                    'sport_group_name': subscription.sport_group.name,
                    'subscription_type': subscription.subscription_type,
                    'total_lessons': subscription.total_lessons,
                    'remaining_lessons': subscription.remaining_lessons,
                    'total_paid': total_paid,
                    'start_date': subscription.start_date.strftime('%Y-%m-%d'),
                    'end_date': subscription.end_date.strftime('%Y-%m-%d'),
                    'needs_notification': subscription.remaining_lessons <= 1
                })
            
            financial_data.append({
                'participant_id': participant.id,
                'participant_name': participant.full_name,
                'subscriptions': participant_subscriptions
            })
        
        return jsonify({
            'success': True,
            'financial_data': financial_data
        })
        
    except Exception as e:
        logger.error(f"Error in parent_financial_info: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/check-low-balance')
def admin_check_low_balance():
    """Проверить участников с низким балансом и отправить уведомления"""
    try:
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Получаем всех участников с остатком 1 занятие или меньше
        low_balance_subscriptions = Subscription.query.filter(
            Subscription.remaining_lessons <= 1,
            Subscription.is_active == True
        ).all()
        
        notifications_sent = 0
        for subscription in low_balance_subscriptions:
            participant = subscription.participant
            user = participant.user
            
            # Отправляем уведомление родителю
            message = f"⚠️ Внимание! У {participant.full_name} осталось {subscription.remaining_lessons} оплаченных занятий в группе '{subscription.sport_group.name}'. Пожалуйста, пополните баланс."
            send_telegram_notification(user.telegram_id, message)
            
            # Отправляем уведомление администратору
            admin_message = f"💰 Участник {participant.full_name} (тел: {participant.parent_phone}) имеет низкий баланс: {subscription.remaining_lessons} занятий в группе '{subscription.sport_group.name}'"
            # Здесь можно добавить отправку администратору, если нужно
            
            notifications_sent += 1
        
        return jsonify({
            'success': True,
            'notifications_sent': notifications_sent,
            'low_balance_count': len(low_balance_subscriptions)
        })
        
    except Exception as e:
        logger.error(f"Error in admin_check_low_balance: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# API endpoints для авторизации

@app.route('/api/auth/verify', methods=['POST'])
def verify_authorization_code():
    """Проверка кода авторизации"""
    try:
        data = request.get_json()
        code = data.get('code')
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        if not code:
            return jsonify({'success': False, 'error': 'Код не указан'}), 400
        
        # Ищем код авторизации
        auth_code = AuthorizationCode.query.filter_by(code=code).first()
        
        if not auth_code:
            return jsonify({'success': False, 'error': 'Неверный код авторизации'}), 400
        
        if auth_code.is_used:
            return jsonify({'success': False, 'error': 'Код уже использован'}), 400
        
        # Отмечаем код как использованный
        auth_code.is_used = True
        auth_code.used_by_user_id = user_id
        auth_code.used_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Успешная авторизация! Теперь вы можете управлять участником: {auth_code.participant.full_name}'
        })
        
    except Exception as e:
        logger.error(f"Error in verify_authorization_code: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/participants')
def get_authorized_participants():
    """Получить список авторизованных участников пользователя"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        # Получаем участников, к которым у пользователя есть доступ через коды авторизации
        auth_codes = AuthorizationCode.query.filter_by(
            used_by_user_id=user_id,
            is_used=True
        ).all()
        
        participants = []
        for auth_code in auth_codes:
            participant = auth_code.participant
            participants.append({
                'id': participant.id,
                'full_name': participant.full_name,
                'parent_phone': participant.parent_phone,
                'birth_date': participant.birth_date.strftime('%Y-%m-%d'),
                'medical_certificate': participant.medical_certificate,
                'discount_type': participant.discount_type,
                'discount_percent': participant.discount_percent,
                'authorized_at': auth_code.used_at.strftime('%Y-%m-%d %H:%M')
            })
        
        return jsonify({
            'success': True,
            'participants': participants
        })
        
    except Exception as e:
        logger.error(f"Error in get_authorized_participants: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def send_attendance_notifications(attendance_id):
    """Отправить уведомления родителям о посещаемости"""
    try:
        attendance = Attendance.query.get(attendance_id)
        if not attendance:
            return
        
        for record in attendance.records:
            participant = record.participant
            user = participant.user
            
            # Формируем сообщение
            if record.is_present:
                message = f"✅ {participant.full_name} посетил тренировку {attendance.lesson_date.strftime('%d.%m.%Y')} в группе '{attendance.sport_group.name}'"
            else:
                message = f"❌ {participant.full_name} пропустил тренировку {attendance.lesson_date.strftime('%d.%m.%Y')} в группе '{attendance.sport_group.name}'"
            
            # Отправляем уведомление через Telegram Bot API
            send_telegram_notification(user.telegram_id, message)
            
    except Exception as e:
        logger.error(f"Error sending attendance notifications: {e}")

def send_payment_notification_to_admin(payment):
    """Отправить уведомление администратору о новом платеже"""
    try:
        # Получаем информацию о платеже
        subscription = payment.subscription
        participant = subscription.participant
        user = payment.user
        sport_group = subscription.sport_group
        
        message = f"""
💰 НОВЫЙ ПЛАТЕЖ ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ

👤 Участник: {participant.full_name}
📱 Телефон: {participant.parent_phone}
💳 Способ оплаты: {payment.payment_method}
💰 Сумма: {payment.amount} ₽
🏃‍♂️ Группа: {sport_group.name}
📅 Тип абонемента: {subscription.subscription_type}
📝 ID платежа: {payment.id}

Для подтверждения перейдите в админ-панель
        """.strip()
        
        # Отправляем уведомление всем администраторам
        admin_users = User.query.filter_by(role='admin').all()
        for admin in admin_users:
            if admin.telegram_id:
                send_telegram_notification(admin.telegram_id, message)
                
    except Exception as e:
        logger.error(f"Error sending payment notification to admin: {e}")

def send_payment_confirmation_to_user(payment, status):
    """Отправить уведомление пользователю о статусе платежа"""
    try:
        subscription = payment.subscription
        participant = subscription.participant
        sport_group = subscription.sport_group
        user = payment.user
        
        if status == 'approved':
            message = f"""
✅ ПЛАТЕЖ ПОДТВЕРЖДЕН!

👤 Участник: {participant.full_name}
💰 Сумма: {payment.amount} ₽
🏃‍♂️ Группа: {sport_group.name}
📅 Тип абонемента: {subscription.subscription_type}
📅 Дата подтверждения: {payment.payment_date.strftime('%d.%m.%Y %H:%M')}

Ваш платеж успешно подтвержден администратором!
            """.strip()
        else:  # rejected
            message = f"""
❌ ПЛАТЕЖ НЕ ПОДТВЕРЖДЕН

👤 Участник: {participant.full_name}
💰 Сумма: {payment.amount} ₽
🏃‍♂️ Группа: {sport_group.name}
📅 Тип абонемента: {subscription.subscription_type}

Ваш платеж не был подтвержден администратором.
Пожалуйста, свяжитесь с администрацией для уточнения деталей.
            """.strip()
        
        # Отправляем уведомление пользователю
        if user.telegram_id:
            send_telegram_notification(user.telegram_id, message)
            
    except Exception as e:
        logger.error(f"Error sending payment confirmation to user: {e}")

def send_telegram_notification(telegram_id, message):
    """Отправить уведомление через Telegram Bot API"""
    try:
        import requests
        from config import Config
        
        logger.info(f"Attempting to send Telegram notification to {telegram_id}")
        logger.info(f"Message: {message}")
        
        bot_token = Config.TELEGRAM_BOT_TOKEN
        if not bot_token:
            logger.warning("Telegram bot token not configured")
            return
        
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        data = {
            'chat_id': telegram_id,
            'text': message,
            'parse_mode': 'HTML'
        }
        
        logger.info(f"Sending request to Telegram API: {url}")
        response = requests.post(url, json=data)
        logger.info(f"Telegram API response status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"Failed to send Telegram notification: {response.text}")
        else:
            logger.info(f"Telegram notification sent successfully to {telegram_id}")
            
    except Exception as e:
        logger.error(f"Error sending Telegram notification: {e}")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
