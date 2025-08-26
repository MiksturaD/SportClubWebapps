#!/usr/bin/env python3
"""
Тестовый скрипт для проверки связей между участниками и родителями
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import Participant, User, AuthorizationCode, Subscription

def test_authorization_links():
    """Проверяем связи между участниками и родителями"""
    with app.app_context():
        print("=== Проверка связей участников и родителей ===\n")
        
        # Получаем всех участников
        participants = Participant.query.all()
        print(f"Всего участников: {len(participants)}")
        
        for participant in participants:
            print(f"\n--- Участник: {participant.full_name} (ID: {participant.id}) ---")
            
            # Проверяем коды авторизации
            auth_codes = AuthorizationCode.query.filter_by(participant_id=participant.id).all()
            print(f"Кодов авторизации: {len(auth_codes)}")
            
            for auth_code in auth_codes:
                print(f"  Код: {auth_code.code}, Использован: {auth_code.is_used}")
                if auth_code.used_by_user_id:
                    user = User.query.get(auth_code.used_by_user_id)
                    if user:
                        print(f"  Пользователь: {user.username} (ID: {user.id}), Telegram: {user.telegram_id}")
                    else:
                        print(f"  Пользователь не найден (ID: {auth_code.used_by_user_id})")
                else:
                    print(f"  Пользователь не указан")
            
            # Проверяем подписки
            subscriptions = Subscription.query.filter_by(participant_id=participant.id).all()
            print(f"Подписок: {len(subscriptions)}")
            
            for subscription in subscriptions:
                print(f"  Группа: {subscription.sport_group.name}, Осталось занятий: {subscription.remaining_lessons}, Активна: {subscription.is_active}")
        
        print("\n=== Проверка пользователей ===\n")
        
        # Получаем всех пользователей
        users = User.query.all()
        print(f"Всего пользователей: {len(users)}")
        
        for user in users:
            print(f"\n--- Пользователь: {user.username} (ID: {user.id}) ---")
            print(f"Telegram ID: {user.telegram_id}")
            print(f"Роль: {user.role}")
            
            # Проверяем коды авторизации пользователя
            auth_codes = AuthorizationCode.query.filter_by(used_by_user_id=user.id).all()
            print(f"Авторизованных участников: {len(auth_codes)}")
            
            for auth_code in auth_codes:
                participant = auth_code.participant
                print(f"  Участник: {participant.full_name} (ID: {participant.id})")

if __name__ == "__main__":
    test_authorization_links()
