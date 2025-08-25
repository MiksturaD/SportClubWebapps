from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from models import db, User, Participant, SportGroup, Schedule, Subscription, Payment, Discount, LessonTransfer
from config import Config
import json
from datetime import datetime, date, timedelta
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
            
            return jsonify({'success': True, 'participant_id': participant.id})
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
                'sport_group': p.subscription.sport_group.name,
                'subscription_type': p.subscription.subscription_type,
                'amount': p.amount,
                'is_paid': p.is_paid,
                'payment_date': p.payment_date.strftime('%Y-%m-%d %H:%M') if p.payment_date else None
            } for p in payments]
        })
    except Exception as e:
        logger.error(f"Error in admin_payments: {e}")
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

@app.route('/api/parent/payment', methods=['POST'])
def parent_payment():
    """Оплата занятий"""
    try:
        data = request.get_json()
        
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
        
        # Создаем платеж
        payment = Payment(
            user_id=session.get('user_id'),
            subscription_id=subscription.id,
            amount=data['amount'],
            payment_method=data.get('payment_method', 'cash')
        )
        
        db.session.add(payment)
        db.session.commit()
        
        return jsonify({'success': True, 'payment_id': payment.id})
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
