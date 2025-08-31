#!/usr/bin/env python3
"""
Тестовый скрипт для проверки работы расписания
"""

from app import create_app, db
from models import SportGroup, Schedule
from datetime import datetime

def test_schedule():
    """Тестируем создание и получение расписания"""
    app = create_app()
    
    with app.app_context():
        print("=== Тест расписания ===")
        
        # Проверяем количество групп
        groups = SportGroup.query.all()
        print(f"Найдено групп: {len(groups)}")
        
        for group in groups:
            print(f"\nГруппа: {group.name}")
            print(f"Описание расписания: {group.schedule}")
            
            # Проверяем записи в таблице Schedule
            schedules = Schedule.query.filter_by(sport_group_id=group.id).all()
            print(f"Записей в Schedule: {len(schedules)}")
            
            for schedule in schedules:
                days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
                day_name = days[schedule.day_of_week] if 0 <= schedule.day_of_week < 7 else f"День {schedule.day_of_week}"
                print(f"  - {day_name}: {schedule.start_time} - {schedule.end_time}")
        
        print("\n=== Тест завершен ===")

if __name__ == '__main__':
    test_schedule() 