#!/usr/bin/env python3
"""
Скрипт для тестирования обновления подписок
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import Participant, Subscription

def test_subscription_update():
    """Тестируем обновление подписки"""
    with app.app_context():
        print("=== Тестирование обновления подписки ===\n")
        
        # Находим участника
        participant = Participant.query.filter_by(full_name="Губанова Елизавета Алексеевна").first()
        if not participant:
            print("Участник не найден")
            return
        
        print(f"Участник: {participant.full_name} (ID: {participant.id})")
        
        # Находим активную подписку
        subscription = Subscription.query.filter_by(
            participant_id=participant.id,
            is_active=True
        ).first()
        
        if not subscription:
            print("Активная подписка не найдена")
            return
        
        print(f"Подписка найдена: ID {subscription.id}")
        print(f"Группа: {subscription.sport_group.name}")
        print(f"Осталось занятий: {subscription.remaining_lessons}")
        
        # Тестируем уменьшение
        old_remaining = subscription.remaining_lessons
        subscription.remaining_lessons -= 1
        
        print(f"Уменьшаем с {old_remaining} до {subscription.remaining_lessons}")
        
        # Сохраняем изменения
        db.session.add(subscription)
        db.session.commit()
        
        print("Изменения сохранены")
        
        # Проверяем, что изменения сохранились
        db.session.expire_all()
        updated_subscription = Subscription.query.get(subscription.id)
        print(f"После обновления: {updated_subscription.remaining_lessons} занятий")

if __name__ == "__main__":
    test_subscription_update()
