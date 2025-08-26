#!/usr/bin/env python3
"""
Скрипт миграции для добавления поля absence_reason в таблицу attendance_record
"""

import sqlite3
import os

def migrate_attendance_reason():
    """Миграция таблицы attendance_record"""
    
    # Путь к базе данных
    db_path = 'instance/sportclub.db'
    
    if not os.path.exists(db_path):
        print("❌ База данных не найдена. Создайте базу данных через Flask.")
        return
    
    try:
        # Подключаемся к базе данных
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Проверяем, существует ли уже поле absence_reason
        cursor.execute("PRAGMA table_info(attendance_record)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'absence_reason' not in columns:
            print("➕ Добавляем поле 'absence_reason'...")
            cursor.execute("ALTER TABLE attendance_record ADD COLUMN absence_reason TEXT")
            
            # Обновляем существующие записи (по умолчанию неуважительная причина)
            cursor.execute("UPDATE attendance_record SET absence_reason = 'unexcused' WHERE is_present = 0")
        
        # Сохраняем изменения
        conn.commit()
        print("✅ Миграция завершена успешно!")
        
        # Показываем статистику
        cursor.execute("SELECT absence_reason, COUNT(*) FROM attendance_record WHERE is_present = 0 GROUP BY absence_reason")
        reason_counts = cursor.fetchall()
        
        print("\n📊 Статистика причин отсутствия:")
        for reason, count in reason_counts:
            reason_text = "Неуважительная" if reason == "unexcused" else "Уважительная" if reason == "excused" else reason
            print(f"   {reason_text}: {count}")
        
    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("🔄 Начинаем миграцию таблицы attendance_record...")
    migrate_attendance_reason()
