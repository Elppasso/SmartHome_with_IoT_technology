"""
Об'єднаний скрипт для перевірки бази даних
Використовує налаштування з .env файлу
Включає: тест підключення, перелік таблиць, доступні методи, статистику температур
"""

import pyodbc
import os
from dotenv import load_dotenv
from database import SmartHomeDB

# Завантажуємо змінні з .env
load_dotenv()

# Отримуємо налаштування з .env
SERVER = os.getenv('DB_SERVER')
DATABASE = os.getenv('DB_DATABASE')
USERNAME = os.getenv('DB_USERNAME')
PASSWORD = os.getenv('DB_PASSWORD')


# ========== 1. ПЕРЕВІРКА МЕТОДІВ ТА ПІДКЛЮЧЕННЯ ==========
def check_methods_and_connection():
    print("\n" + "="*60)
    print(" 1. ПЕРЕВІРКА МЕТОДІВ ТА ПІДКЛЮЧЕННЯ")
    print("="*60)
    
    db = SmartHomeDB()
    print("\nДоступні методи класу SmartHomeDB:")
    methods = [method for method in dir(db) if not method.startswith('_')]
    for method in methods:
        print(f"   - {method}")
    
    if hasattr(db, 'conn'):
        print(f"\nСтан підключення (conn): {db.conn is not None}")
    else:
        print("\nНемає атрибута conn (підключення створюється для кожного запиту)")


# ========== 2. ПРЯМЕ ПІДКЛЮЧЕННЯ ЧЕРЕЗ ODBC ==========
def test_direct_odbc_connection():
    print("\n" + "="*60)
    print(" 2. ПРЯМЕ ПІДКЛЮЧЕННЯ ЧЕРЕЗ ODBC")
    print("="*60)
    
    print(f"   Сервер: {SERVER}")
    print(f"   База: {DATABASE}")
    print(f"   Логін: {USERNAME}")
    print()
    
    connection_string = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={SERVER},1433;"
        f"DATABASE={DATABASE};"
        f"UID={USERNAME};"
        f"PWD={PASSWORD};"
        f"Encrypt=yes;"
        f"TrustServerCertificate=no;"
        f"Connection Timeout=30;"
    )
    
    try:
        conn = pyodbc.connect(connection_string)
        print("ПІДКЛЮЧЕННЯ УСПІШНЕ!")
        
        cursor = conn.cursor()
        cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES")
        tables = cursor.fetchall()
        print(f"\nТаблиці в базі даних ({len(tables)}):")
        for table in tables:
            print(f"   - {table[0]}")
        
        conn.close()
        return True
        
    except pyodbc.Error as e:
        print(f"ПОМИЛКА: {e}")
        
        if "18456" in str(e):
            print("\nПомилка логіна. Перевірте:")
            print("   - Логін в Azure Portal (поле 'Администратор сервера')")
            print("   - Чи не змінився пароль")
        elif "4060" in str(e):
            print(f"\nБаза даних '{DATABASE}' не існує або немає доступу")
            print("   - Перевірте назву бази в Azure Portal")
        elif "0" in str(e) or "258" in str(e):
            print("\nМожливо, вашу IP не додано в Firewall")
            print("   - Зайдіть в Azure Portal → SQL Server → Networking")
            print("   - Додайте свою IP-адресу")
        return False


# ========== 3. ПЕРЕВІРКА ТЕМПЕРАТУРНИХ ДАНИХ ==========
def check_temperature_data():
    print("\n" + "="*60)
    print(" 3. ПЕРЕВІРКА ТЕМПЕРАТУРНИХ ДАНИХ")
    print("="*60)
    
    db = SmartHomeDB()
    
    # Перевірка підключення
    try:
        test = db.execute_query("SELECT 1 as test")
        if not test:
            print("Немає підключення до бази даних!")
            return
    except Exception as e:
        print(f"Помилка підключення: {e}")
        return
    
    print("Підключення до бази даних успішне!\n")
    
    # 3.1 Останні показання температури по сенсорах
    print("ОСТАННІ ПОКАЗАННЯ ТЕМПЕРАТУРИ ПО СЕНСОРАХ:")
    query1 = """
    SELECT 
        S.id_sensor,
        R.name as room,
        D.name as device,
        SD.value as last_temp,
        FORMAT(SD.created_at, 'yyyy-MM-dd HH:mm:ss') as last_time
    FROM SensorData SD
    JOIN Sensor S ON SD.id_sensor = S.id_sensor
    JOIN Device D ON S.id_device = D.id_device
    JOIN Room R ON D.id_room = R.id_room
    WHERE S.type = 'Temperature'
    AND SD.created_at = (
        SELECT MAX(created_at) 
        FROM SensorData SD2 
        WHERE SD2.id_sensor = S.id_sensor
    )
    ORDER BY R.name
    """
    results = db.execute_query(query1)
    
    if results:
        for r in results:
            print(f"   {r['room']} - {r['device']}: {r['last_temp']}°C (останнє показання)")
    else:
        print("   Немає даних про температуру")
    
    # 3.2 Статистика по кімнатах
    print("\nСТАТИСТИКА ПО КІМНАТАХ (СЕРЕДНІ ЗНАЧЕННЯ):")
    query2 = """
    SELECT 
        R.name as room,
        ROUND(AVG(SD.value), 1) as avg_temp,
        MIN(SD.value) as min_temp,
        MAX(SD.value) as max_temp,
        COUNT(*) as readings_count
    FROM SensorData SD
    JOIN Sensor S ON SD.id_sensor = S.id_sensor
    JOIN Device D ON S.id_device = D.id_device
    JOIN Room R ON D.id_room = R.id_room
    WHERE S.type = 'Temperature'
    GROUP BY R.name
    """
    stats = db.execute_query(query2)
    
    if stats:
        for s in stats:
            print(f"   {s['room']}:")
            print(f"      Середня: {s['avg_temp']}°C")
            print(f"      Мінімум: {s['min_temp']}°C")
            print(f"      Максимум: {s['max_temp']}°C")
            print(f"      Кількість вимірів: {s['readings_count']}")
    else:
        print("   Немає статистичних даних")


# ========== 4. ПЕРЕВІРКА ВСІХ ТИПІВ СЕНСОРІВ ==========
def check_all_sensors():
    print("\n" + "="*60)
    print(" 4. ПЕРЕВІРКА ВСІХ ТИПІВ СЕНСОРІВ")
    print("="*60)
    
    db = SmartHomeDB()
    
    query = """
    SELECT 
        S.id_sensor,
        S.type,
        D.name as device_name,
        R.name as room_name,
        CASE WHEN D.status = 1 THEN 'Увімкнено' ELSE 'Вимкнено' END as device_status
    FROM Sensor S
    JOIN Device D ON S.id_device = D.id_device
    JOIN Room R ON D.id_room = R.id_room
    ORDER BY S.type, R.name
    """
    
    sensors = db.execute_query(query)
    
    if not sensors:
        print("Немає жодного сенсора в базі даних!")
        return
    
    # Групуємо за типами
    sensors_by_type = {}
    for s in sensors:
        s_type = s['type']
        if s_type not in sensors_by_type:
            sensors_by_type[s_type] = []
        sensors_by_type[s_type].append(s)
    
    for s_type, s_list in sensors_by_type.items():
        print(f"\n{s_type} ({len(s_list)} сенсорів):")
        for s in s_list:
            status_text = "Увімкнено" if "Увімкнено" in s['device_status'] else "Вимкнено"
            print(f"   [{status_text}] {s['room_name']} - {s['device_name']} (ID: {s['id_sensor']})")


# ========== ГОЛОВНА ФУНКЦІЯ ==========
def main():
    print("\n" + "█"*60)
    print("   ПЕРЕВІРКА БАЗИ ДАНИХ РОЗУМНИЙ БУДИНОК")
    print("█"*60)
    
    # Перевіряємо наявність .env
    if not os.path.exists('.env'):
        print("\n⚠️ Увага: Файл .env не знайдено. Використовуються стандартні налаштування.")
        print("   Для зміни параметрів створіть файл .env (див. .env.example)\n")
    
    # 1. Перевірка методів
    check_methods_and_connection()
    
    # 2. Пряме ODBC підключення
    test_direct_odbc_connection()
    
    # 3. Перевірка температурних даних
    check_temperature_data()
    
    # 4. Перевірка всіх сенсорів
    check_all_sensors()
    
    print("\n" + "█"*60)
    print("   ПЕРЕВІРКУ ЗАВЕРШЕНО")
    print("█"*60 + "\n")


if __name__ == "__main__":
    main()