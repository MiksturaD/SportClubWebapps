import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///sportclub.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Telegram Bot settings
    TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
    TELEGRAM_WEBAPP_URL = os.environ.get('TELEGRAM_WEBAPP_URL') or 'https://your-domain.ngrok.io'
    
    # Admin Telegram ID (замените на реальный ID администратора)
    ADMIN_TELEGRAM_ID = int(os.environ.get('ADMIN_TELEGRAM_ID', '123456789'))
    
    # Sport groups
    SPORT_GROUPS = [
        'Дзюдо младшая группа',
        'Дзюдо старшая группа', 
        'Гимнастика',
        'ММА',
        'Женский фитнес'
    ]
    
    # Subscription types
    SUBSCRIPTION_TYPES = [
        '8 занятий',
        '12 занятий', 
        'Разовые занятия'
    ]
    
    # Discount types
    DISCOUNT_TYPES = [
        'Семейная скидка',
        'Многодетная семья',
        'Студенческая скидка',
        'Скидка за реферала',
        'Сезонная скидка'
    ]
