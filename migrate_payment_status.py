#!/usr/bin/env python3
"""
Скрипт миграции для обновления таблицы платежей
Добавляет поля status и admin_notes
"""

import sqlite3
import os

def migrate_payment_table():
    """Миграция таблицы платежей"""
    
    # Путь к базе данных
    db_path = 'instance/sportclub.db'
    
    if not os.path.exists(db_path):
        print("❌ База данных не найдена. Создайте базу данных через Flask.")
        return
    
    try:
        # Подключаемся к базе данных
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Проверяем, существуют ли уже новые поля
        cursor.execute("PRAGMA table_info(payment)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'status' not in columns:
            print("➕ Добавляем поле 'status'...")
            cursor.execute("ALTER TABLE payment ADD COLUMN status TEXT DEFAULT 'pending'")
            
            # Обновляем существующие записи
            cursor.execute("UPDATE payment SET status = 'approved' WHERE is_paid = 1")
            cursor.execute("UPDATE payment SET status = 'pending' WHERE is_paid = 0")
            
        if 'admin_notes' not in columns:
            print("➕ Добавляем поле 'admin_notes'...")
            cursor.execute("ALTER TABLE payment ADD COLUMN admin_notes TEXT")
        
        # Сохраняем изменения
        conn.commit()
        print("✅ Миграция завершена успешно!")
        
        # Показываем статистику
        cursor.execute("SELECT status, COUNT(*) FROM payment GROUP BY status")
        status_counts = cursor.fetchall()
        
        print("\n📊 Статистика платежей:")
        for status, count in status_counts:
            print(f"   {status}: {count}")
        
    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("🔄 Начинаем миграцию таблицы платежей...")
    migrate_payment_table()
