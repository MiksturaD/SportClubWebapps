from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    telegram_id = db.Column(db.BigInteger, unique=True, nullable=False)
    username = db.Column(db.String(100))
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    role = db.Column(db.String(20), default='parent')  # 'admin' or 'parent'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    participants = db.relationship('Participant', backref='user', lazy=True)
    payments = db.relationship('Payment', backref='user', lazy=True)

class Participant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    parent_phone = db.Column(db.String(20), nullable=False)
    birth_date = db.Column(db.Date, nullable=False)
    medical_certificate = db.Column(db.Boolean, default=False)
    discount_type = db.Column(db.String(100))
    discount_percent = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    subscriptions = db.relationship('Subscription', backref='participant', lazy=True)
    attendance_records = db.relationship('AttendanceRecord', backref='participant', lazy=True)

class SportGroup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    detailed_description = db.Column(db.Text)
    trainer_name = db.Column(db.String(100))
    trainer_info = db.Column(db.Text)
    price_8 = db.Column(db.Integer, default=0)  # Цена за 8 занятий
    price_12 = db.Column(db.Integer, default=0)  # Цена за 12 занятий
    price_single = db.Column(db.Integer, default=0)  # Цена за разовое занятие
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    schedules = db.relationship('Schedule', backref='sport_group', lazy=True)
    subscriptions = db.relationship('Subscription', backref='sport_group', lazy=True)
    attendances = db.relationship('Attendance', backref='sport_group', lazy=True)

class Schedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sport_group_id = db.Column(db.Integer, db.ForeignKey('sport_group.id'), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Subscription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.Integer, db.ForeignKey('participant.id'), nullable=False)
    sport_group_id = db.Column(db.Integer, db.ForeignKey('sport_group.id'), nullable=False)
    subscription_type = db.Column(db.String(20), nullable=False)  # '8 занятий', '12 занятий', 'Разовые занятия'
    total_lessons = db.Column(db.Integer, nullable=False)
    remaining_lessons = db.Column(db.Integer, nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    payments = db.relationship('Payment', backref='subscription', lazy=True)

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscription.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    payment_method = db.Column(db.String(50), default='cash')
    status = db.Column(db.String(20), default='pending')  # 'pending', 'approved', 'rejected'
    is_paid = db.Column(db.Boolean, default=False)
    payment_date = db.Column(db.DateTime)
    admin_notes = db.Column(db.Text)  # Заметки администратора
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Discount(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    discount_type = db.Column(db.String(100), nullable=False)
    discount_percent = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class LessonTransfer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscription.id'), nullable=False)
    original_date = db.Column(db.Date, nullable=False)
    new_date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'approved', 'rejected'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Attendance(db.Model):
    """Модель для учета посещаемости по дням"""
    id = db.Column(db.Integer, primary_key=True)
    sport_group_id = db.Column(db.Integer, db.ForeignKey('sport_group.id'), nullable=False)
    lesson_date = db.Column(db.Date, nullable=False)  # Дата занятия
    day_of_week = db.Column(db.Integer, nullable=False)  # День недели (0=Monday, 6=Sunday)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    is_completed = db.Column(db.Boolean, default=False)  # Занятие завершено
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    records = db.relationship('AttendanceRecord', backref='attendance', lazy=True, cascade='all, delete-orphan')
    
    __table_args__ = (db.UniqueConstraint('sport_group_id', 'lesson_date', name='unique_attendance_date'),)

class AttendanceRecord(db.Model):
    """Модель для записей посещаемости участников"""
    id = db.Column(db.Integer, primary_key=True)
    attendance_id = db.Column(db.Integer, db.ForeignKey('attendance.id'), nullable=False)
    participant_id = db.Column(db.Integer, db.ForeignKey('participant.id'), nullable=False)
    is_present = db.Column(db.Boolean, default=False)  # Присутствовал ли участник
    absence_reason = db.Column(db.String(50), nullable=True)  # Причина отсутствия: 'excused', 'unexcused', None
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('attendance_id', 'participant_id', name='unique_attendance_record'),)

class AuthorizationCode(db.Model):
    """Модель для кодов авторизации родителей"""
    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.Integer, db.ForeignKey('participant.id'), nullable=False)
    code = db.Column(db.String(6), unique=True, nullable=False)  # 6-значный код
    is_used = db.Column(db.Boolean, default=False)  # Использован ли код
    used_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Кем использован
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    used_at = db.Column(db.DateTime, nullable=True)  # Когда использован
    
    # Relationships
    participant = db.relationship('Participant', backref='authorization_codes')
    used_by_user = db.relationship('User', backref='used_authorization_codes')
    
    @staticmethod
    def generate_code():
        """Генерация уникального 6-значного кода"""
        import random
        import string
        while True:
            code = ''.join(random.choices(string.digits, k=6))
            if not AuthorizationCode.query.filter_by(code=code).first():
                return code
