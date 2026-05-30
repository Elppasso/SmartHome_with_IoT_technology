from flask import Flask, render_template, request, jsonify
from database import SmartHomeDB
import os
from dotenv import load_dotenv

# Завантажуємо змінні з .env
load_dotenv()

app = Flask(__name__)
db = SmartHomeDB()

# Отримуємо налаштування з .env або використовуємо значення за замовчуванням
HOST = os.getenv('FLASK_HOST')
PORT = int(os.getenv('FLASK_PORT'))
DEBUG = os.getenv('FLASK_DEBUG').lower() == 'true'

@app.route('/')
def index():
    """Головна сторінка"""
    return render_template('index.html')

@app.route('/api/infrastructure')
def get_infrastructure_api():
    """API: отримати інфраструктуру в JSON форматі"""
    try:
        data = db.get_full_infrastructure()
        return jsonify(data)
    except Exception as e:
        print(f"Помилка в /api/infrastructure: {e}")
        return jsonify([])

@app.route('/api/temperature-stats')
def get_temperature_stats_api():
    """API: отримати ОСТАННЄ значення температури по кожній кімнаті"""
    try:
        query = """
        SELECT 
            R.name AS [Кімната],
            SD.value AS [Середня °C],
            SD.value AS [Мін. °C],
            SD.value AS [Макс. °C]
        FROM (
            SELECT 
                D.id_room,
                SD.value,
                ROW_NUMBER() OVER (PARTITION BY D.id_room ORDER BY SD.created_at DESC) as rn
            FROM SensorData SD
            JOIN Sensor S ON SD.id_sensor = S.id_sensor
            JOIN Device D ON S.id_device = D.id_device
            WHERE S.type = 'Temperature'
        ) SD
        JOIN Room R ON SD.id_room = R.id_room
        WHERE SD.rn = 1
        """
        stats = db.execute_query(query)
        return jsonify(stats)
    except Exception as e:
        print(f"Помилка: {e}")
        return jsonify([])

@app.route('/api/sensor/<int:sensor_id>/latest')
def get_latest_sensor_value(sensor_id):
    """API: отримати останнє значення сенсора"""
    try:
        query = f"""
        SELECT TOP 1
            value as temperature,
            FORMAT(created_at, 'yyyy-MM-dd HH:mm:ss') as time
        FROM SensorData 
        WHERE id_sensor = {sensor_id}
        ORDER BY created_at DESC
        """
        result = db.execute_query(query)
        return jsonify(result[0] if result else {'temperature': None, 'time': None})
    except Exception as e:
        print(f"Помилка: {e}")
        return jsonify({'temperature': None, 'time': None})

@app.route('/api/events')
def get_events_api():
    """API: отримати останні події в JSON форматі"""
    try:
        data = db.get_recent_events()
        return jsonify(data)
    except Exception as e:
        print(f"Помилка в /api/events: {e}")
        return jsonify([])

@app.route('/api/homes')
def get_homes():
    """API: отримати всі будинки"""
    try:
        homes = db.get_all_homes()
        return jsonify(homes)
    except Exception as e:
        print(f"Помилка в /api/homes: {e}")
        return jsonify([])

@app.route('/api/rooms/<int:home_id>')
def get_rooms(home_id):
    """API: отримати кімнати будинку"""
    try:
        rooms = db.get_rooms_by_home(home_id)
        return jsonify(rooms)
    except Exception as e:
        print(f"Помилка в /api/rooms: {e}")
        return jsonify([])

@app.route('/api/devices/<int:room_id>')
def get_devices(room_id):
    """API: отримати пристрої кімнати"""
    try:
        devices = db.get_devices_by_room(room_id)
        return jsonify(devices)
    except Exception as e:
        print(f"Помилка в /api/devices: {e}")
        return jsonify([])

@app.route('/api/device/toggle', methods=['POST'])
def toggle_device():
    """API: змінити статус пристрою"""
    try:
        data = request.json
        device_id = data.get('device_id')
        current_status = data.get('current_status')
        new_status = 0 if current_status == 1 else 1
        
        success = db.update_device_status(device_id, new_status)
        return jsonify({'success': success, 'new_status': new_status})
    except Exception as e:
        print(f"Помилка в /api/device/toggle: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/device/add', methods=['POST'])
def add_device():
    """API: додати пристрій"""
    try:
        data = request.json
        room_id = data.get('room_id')
        name = data.get('name')
        status = data.get('status', 0)
        sensor_type = data.get('sensor_type', None)
        
        # Додаємо пристрій
        success = db.add_device(room_id, name, status)
        
        # Отримуємо ID нового пристрою
        if success and sensor_type:
            # Отримуємо останній ID
            query = "SELECT MAX(id_device) as id_device FROM Device WHERE id_room = " + str(room_id)
            result = db.execute_query(query)
            if result and len(result) > 0:
                device_id = result[0].get('id_device')
                if device_id:
                    db.add_sensor(device_id, sensor_type)
        
        return jsonify({'success': success})
    except Exception as e:
        print(f"Помилка в /api/device/add: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/device/delete/<int:device_id>', methods=['DELETE'])
def delete_device(device_id):
    """API: видалити пристрій"""
    try:
        success = db.delete_device(device_id)
        return jsonify({'success': success})
    except Exception as e:
        print(f"Помилка в /api/device/delete: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/devices')
def devices():
    """Сторінка пристроїв"""
    return render_template('devices.html')

@app.route('/sensors')
def sensors():
    """Сторінка сенсорів"""
    return render_template('sensors.html')

@app.route('/automation')
def automation():
    """Сторінка автоматизації"""
    return render_template('automation.html')

@app.route('/events')
def events():
    """Сторінка подій"""
    return render_template('events.html')

@app.route('/api/sensors')
def get_sensors():
    """API: отримати всі сенсори"""
    try:
        query = """
        SELECT 
            S.id_sensor,
            S.type,
            D.name as device_name,
            R.name as room_name,
            H.address as home_address
        FROM Sensor S
        JOIN Device D ON S.id_device = D.id_device
        JOIN Room R ON D.id_room = R.id_room
        JOIN Home H ON R.id_home = H.id_home
        """
        sensors = db.execute_query(query)
        return jsonify(sensors)
    except Exception as e:
        print(f"Помилка в /api/sensors: {e}")
        return jsonify([])

@app.route('/api/sensor/<int:sensor_id>/data')
def get_sensor_data_api(sensor_id):
    """API: отримати дані сенсора з підтримкою періоду"""
    try:
        period = request.args.get('period', '24h')
        
        # Визначаємо SQL фільтр за періодом
        period_filter = ""
        if period == '1h':
            period_filter = "AND created_at >= DATEADD(hour, -1, GETDATE())"
        elif period == '24h':
            period_filter = "AND created_at >= DATEADD(day, -1, GETDATE())"
        elif period == '7d':
            period_filter = "AND created_at >= DATEADD(day, -7, GETDATE())"
        elif period == '30d':
            period_filter = "AND created_at >= DATEADD(day, -30, GETDATE())"
        
        # Отримуємо дані за період
        query = f"""
        SELECT TOP 100
            FORMAT(created_at, 'yyyy-MM-dd HH:mm:ss') as [Час],
            value as [Значення]
        FROM SensorData 
        WHERE id_sensor = {sensor_id}
        {period_filter}
        ORDER BY created_at DESC
        """
        data = db.execute_query(query)
        
        # Окремо отримуємо останнє значення
        latest_query = f"""
        SELECT TOP 1
            value as [Значення],
            FORMAT(created_at, 'yyyy-MM-dd HH:mm:ss') as [Час]
        FROM SensorData 
        WHERE id_sensor = {sensor_id}
        ORDER BY created_at DESC
        """
        latest = db.execute_query(latest_query)
        
        response = {
            'data': data,
            'latest': latest[0] if latest else None
        }
        return jsonify(response)
    except Exception as e:
        print(f"Помилка в /api/sensor/{sensor_id}/data: {e}")
        return jsonify({'data': [], 'latest': None})

@app.route('/api/automation-rules')
def get_automation_rules_api():
    """API: отримати правила автоматизації"""
    try:
        rules = db.get_automation_rules()
        return jsonify(rules)
    except Exception as e:
        print(f"Помилка в /api/automation-rules: {e}")
        return jsonify([])

@app.route('/api/all-events')
def get_all_events():
    """API: отримати всі події (останні 50)"""
    try:
        query = """
        SELECT TOP 50
            FORMAT(E.created_at, 'yyyy-MM-dd HH:mm:ss') AS [Час],
            D.name AS [Пристрій],
            E.description AS [Подія]
        FROM EventLog E
        JOIN Device D ON E.id_device = D.id_device
        ORDER BY E.created_at DESC
        """
        events = db.execute_query(query)
        return jsonify(events)
    except Exception as e:
        print(f"Помилка в /api/all-events: {e}")
        return jsonify([])

@app.route('/api/home/add', methods=['POST'])
def add_home():
    try:
        data = request.json
        address = data.get('address')
        if not address:
            return jsonify({'success': False, 'error': 'Адреса обов\'язкова'}), 400
        query = f"INSERT INTO Home (address) VALUES (N'{address}')"
        success = db.execute_non_query(query)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/room/add', methods=['POST'])
def add_room():
    try:
        data = request.json
        home_id = data.get('home_id')
        name = data.get('name')
        if not home_id or not name:
            return jsonify({'success': False, 'error': 'Неповні дані'}), 400
        query = f"INSERT INTO Room (id_home, name) VALUES ({home_id}, N'{name}')"
        success = db.execute_non_query(query)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/device/<int:device_id>/sensors')
def get_device_sensors(device_id):
    try:
        query = f"SELECT id_sensor, type FROM Sensor WHERE id_device = {device_id}"
        sensors = db.execute_query(query)
        return jsonify(sensors)
    except Exception as e:
        return jsonify([])

if __name__ == '__main__':
    print("="*50)
    print("Запуск веб-інтерфейсу 'Розумний будинок'")
    print(f"🌐 http://{HOST}:{PORT}")
    if DEBUG:
        print("⚠️ Режим налагодження УВІМКНЕНО (тільки для розробки)")
    print("="*50)
    app.run(debug=DEBUG, host=HOST, port=PORT)