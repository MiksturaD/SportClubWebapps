#!/usr/bin/env python3
"""
Тестовый скрипт для проверки создания платежа
"""

import requests
import json

# URL вашего приложения
BASE_URL = "http://localhost:5000"

def test_payment_creation():
    """Тест создания платежа"""
    
    # Данные для тестирования
    payment_data = {
        "participant_id": 1,  # ID участника
        "sport_group_id": 1,  # ID спортивной группы
        "subscription_type": "8 занятий",
        "total_lessons": 8,
        "amount": 5000,
        "payment_method": "cash"
    }
    
    try:
        # Отправляем запрос на создание платежа
        response = requests.post(
            f"{BASE_URL}/api/parent/payment",
            headers={"Content-Type": "application/json"},
            data=json.dumps(payment_data)
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ Платеж успешно создан!")
                print(f"ID платежа: {result.get('payment_id')}")
            else:
                print(f"❌ Ошибка: {result.get('error')}")
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Не удалось подключиться к серверу. Убедитесь, что приложение запущено.")
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    print("Тестирование создания платежа...")
    test_payment_creation()
