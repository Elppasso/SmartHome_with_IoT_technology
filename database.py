import pyodbc
import os
from dotenv import load_dotenv

# Завантажуємо змінні з .env файлу
load_dotenv()

class SmartHomeDB:
    def __init__(self, server: str = None, database: str = None):
        # Беремо з .env або використовуємо параметри
        self.server = server or os.getenv('DB_SERVER')
        self.database = database or os.getenv('DB_DATABASE')
        self.username = os.getenv('DB_USERNAME')
        self.password = os.getenv('DB_PASSWORD')
        
    def get_connection(self):
        """Створює нове підключення для кожного запиту"""
        connection_string = (
            f'DRIVER={{ODBC Driver 18 for SQL Server}};'
            f'SERVER={self.server},1433;'
            f'DATABASE={self.database};'
            f'UID={self.username};'
            f'PWD={self.password};'
            f'Encrypt=yes;'
            f'TrustServerCertificate=no;'
            f'Connection Timeout=30;'
        )
        return pyodbc.connect(connection_string)
    
    def execute_query(self, query: str) -> list:
        """Виконання SELECT запиту - повертає список словників"""
        conn = None
        cursor = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(query)
            
            columns = [column[0] for column in cursor.description]
            rows = []
            for row in cursor.fetchall():
                rows.append(dict(zip(columns, row)))
            return rows
        except Exception as e:
            print(f"Помилка виконання запиту: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
    
    def execute_non_query(self, query: str) -> bool:
        """Виконання INSERT, UPDATE, DELETE запитів"""
        conn = None
        cursor = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(query)
            conn.commit()
            return True
        except Exception as e:
            print(f"Помилка: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
    
    # ========== ОСНОВНІ МЕТОДИ ДЛЯ РОБОТИ З ДАНИМИ ==========
    
    def get_all_homes(self) -> list:
        query = "SELECT id_home, address FROM Home"
        return self.execute_query(query)
    
    def get_rooms_by_home(self, home_id: int) -> list:
        query = f"SELECT id_room, name FROM Room WHERE id_home = {home_id}"
        return self.execute_query(query)
    
    def get_devices_by_room(self, room_id: int) -> list:
        query = f"""
        SELECT id_device, name, status 
        FROM Device 
        WHERE id_room = {room_id}
        """
        return self.execute_query(query)
    
    def add_device(self, room_id: int, name: str, status: int = 0) -> bool:
        query = f"""
        INSERT INTO Device (id_room, name, status)
        VALUES ({room_id}, N'{name}', {status})
        """
        return self.execute_non_query(query)

    def add_sensor(self, device_id: int, sensor_type: str) -> bool:
        query = f"""
        INSERT INTO Sensor (id_device, type)
        VALUES ({device_id}, N'{sensor_type}')
        """
        return self.execute_non_query(query)
    
    def update_device_status(self, device_id: int, status: int) -> bool:
        query = f"UPDATE Device SET status = {status} WHERE id_device = {device_id}"
        return self.execute_non_query(query)
    
    def delete_device(self, device_id: int) -> bool:
        try:
            delete_sensors = f"DELETE FROM Sensor WHERE id_device = {device_id}"
            self.execute_non_query(delete_sensors)
            delete_device = f"DELETE FROM Device WHERE id_device = {device_id}"
            return self.execute_non_query(delete_device)
        except Exception as e:
            print(f"Помилка видалення пристрою: {e}")
            return False
    
    def get_full_infrastructure(self) -> list:
        query = """
        SELECT 
            H.address AS [Адреса],
            R.name AS [Кімната],
            D.name AS [Пристрій],
            CASE WHEN D.status = 1 THEN N'Увімкнено' ELSE N'Вимкнено' END AS [Стан],
            S.type AS [Тип сенсора]
        FROM Home H
        JOIN Room R ON H.id_home = R.id_home
        JOIN Device D ON R.id_room = D.id_room
        JOIN Sensor S ON D.id_device = S.id_device
        ORDER BY H.address, R.name
        """
        return self.execute_query(query)
    
    def get_temperature_stats(self) -> list:
        query = """
        SELECT 
            R.name AS [Кімната],
            ROUND(AVG(CAST(SD.value AS FLOAT)), 2) AS [Середня °C],
            MIN(CAST(SD.value AS FLOAT)) AS [Мін. °C],
            MAX(CAST(SD.value AS FLOAT)) AS [Макс. °C]
        FROM SensorData SD
        JOIN Sensor S ON SD.id_sensor = S.id_sensor
        JOIN Device D ON S.id_device = D.id_device
        JOIN Room R ON D.id_room = R.id_room
        WHERE S.type = 'Temperature'
        GROUP BY R.name
        """
        return self.execute_query(query)
    
    def get_recent_events(self) -> list:
        query = """
        SELECT TOP 10
            FORMAT(E.created_at, 'yyyy-MM-dd HH:mm:ss') AS [Час],
            D.name AS [Пристрій],
            E.description AS [Подія]
        FROM EventLog E
        JOIN Device D ON E.id_device = D.id_device
        ORDER BY E.created_at DESC
        """
        return self.execute_query(query)
    
    def get_automation_rules(self) -> list:
        query = """
        SELECT 
            U.name AS [Користувач],
            AR.condition AS [Умова],
            A.action_type AS [Дія],
            D.name AS [Пристрій]
        FROM [User] U
        JOIN AutomationRule AR ON U.id_user = AR.id_user
        JOIN ActionTable A ON AR.id_rule = A.id_rule
        JOIN Device D ON A.id_device = D.id_device
        """
        return self.execute_query(query)