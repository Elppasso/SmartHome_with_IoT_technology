# Розумний будинок — веб-інтерфейс для керування IoT-пристроями

Курсова робота з дисципліни «Бази даних»  
Студентський проєкт, що демонструє інтеграцію веб-застосунку (Flask) з хмарною базою даних (Microsoft SQL Server / Azure SQL) для моніторингу та керування пристроями «розумного будинку».

## 📖 Опис проєкту

Система дозволяє:

- Переглядати структуру будинку (будинки → кімнати → пристрої → сенсори)
- Керувати станом пристроїв (увімкнути/вимкнути)
- Додавати та видаляти пристрої
- Переглядати останні показання сенсорів (температура, тощо)
- Аналізувати статистику температури по кімнатах за різні періоди (1 год, 24 год, 7 днів, 30 днів)
- Переглядати журнал подій (лог зміни стану пристроїв)
- Переглядати правила автоматизації (зв’язок користувачів, умов, дій)

Фронтенд реалізований у вигляді окремих HTML-сторінок (`templates/`) з використанням JavaScript для взаємодії з REST API.

## 🛠 Технології

- **Backend**: Python 3, Flask
- **База даних**: Microsoft SQL Server (локальний або Azure SQL)
- **Драйвер**: ODBC Driver 18 for SQL Server
- **Бібліотеки**: pyodbc, python-dotenv
- **Фронтенд**: HTML, CSS (Bootstrap або власний), JavaScript (fetch API)

## 📁 Структура проєкту

```
SmartHome_with_IoT_technology/
├── app.py
├── database.py
├── check_database.py
├── requirements.txt
├── .env
├── .env.example
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── common.js
│       ├── dashboard.js
│       ├── devices.js
│       ├── sensors.js
│       ├── events.js
│       └── automation.js
└── templates/
    ├── index.html
    ├── devices.html
    ├── sensors.html
    ├── events.html
    └── automation.html
```

## ⚙️ Вимоги до встановлення

1. **Python 3.8+**
2. **Microsoft SQL Server** (локальний, або хмарний екземпляр Azure SQL)
3. **ODBC Driver 18 for SQL Server**  
   [Завантажити](https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
4. **Створена база даних** з таблицями, описаними нижче (або виконайте SQL-скрипти із розділу «Схема бази даних»)

## 🔧 Встановлення та запуск

### 1. Клонувати репозиторій
```bash
git clone https://github.com/your-username/smart-home-coursework.git
cd smart-home-coursework
```

### 2. Встановити залежності
```bash
pip install -r requirements.txt
```

### 3. Налаштувати змінні оточення
Створіть файл `.env` у корені проєкту:
```ini
# Flask
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=false

# Database (SQL Server / Azure SQL)
DB_SERVER=your-server.database.windows.net
DB_DATABASE=SmartHomeDB
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### 4. Створити необхідні таблиці в БД
Виконайте SQL-скрипт з розділу **Схема бази даних** (див. нижче) у вашому SQL Server.

### 5. Запустити веб-застосунок
```bash
python app.py
```

Відкрийте у браузері: `http://localhost:5000`

## 🗄 Схема бази даних

На основі запитів, що використовуються в `database.py`, необхідно створити такі таблиці:

```sql
CREATE TABLE Home (
    id_home INT IDENTITY(1,1) PRIMARY KEY,
    address NVARCHAR(200) NOT NULL
);

CREATE TABLE Room (
    id_room INT IDENTITY(1,1) PRIMARY KEY,
    id_home INT NOT NULL FOREIGN KEY REFERENCES Home(id_home),
    name NVARCHAR(100) NOT NULL
);

CREATE TABLE Device (
    id_device INT IDENTITY(1,1) PRIMARY KEY,
    id_room INT NOT NULL FOREIGN KEY REFERENCES Room(id_room),
    name NVARCHAR(100) NOT NULL,
    status BIT NOT NULL DEFAULT 0   -- 0 = вимкнено, 1 = увімкнено
);

CREATE TABLE Sensor (
    id_sensor INT IDENTITY(1,1) PRIMARY KEY,
    id_device INT NOT NULL FOREIGN KEY REFERENCES Device(id_device),
    type NVARCHAR(50) NOT NULL   -- 'Temperature', 'Humidity', 'Motion' тощо
);

CREATE TABLE SensorData (
    id_data INT IDENTITY(1,1) PRIMARY KEY,
    id_sensor INT NOT NULL FOREIGN KEY REFERENCES Sensor(id_sensor),
    value FLOAT NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE EventLog (
    id_event INT IDENTITY(1,1) PRIMARY KEY,
    id_device INT NOT NULL FOREIGN KEY REFERENCES Device(id_device),
    description NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE [User] (
    id_user INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL
);

CREATE TABLE AutomationRule (
    id_rule INT IDENTITY(1,1) PRIMARY KEY,
    id_user INT NOT NULL FOREIGN KEY REFERENCES [User](id_user),
    condition NVARCHAR(500) NOT NULL
);

CREATE TABLE ActionTable (
    id_action INT IDENTITY(1,1) PRIMARY KEY,
    id_rule INT NOT NULL FOREIGN KEY REFERENCES AutomationRule(id_rule),
    action_type NVARCHAR(100) NOT NULL,
    id_device INT NOT NULL FOREIGN KEY REFERENCES Device(id_device)
);
```

> 💡 **Примітка:** якщо ви використовуєте Azure SQL, переконайтеся, що ваш IP-адресу додано до правил брандмауера (в Azure Portal → SQL Server → Networking).

## 🧪 Перевірка бази даних

Скрипт `check_database.py` виконує:
- Тест прямого ODBC-підключення
- Перелік усіх таблиць
- Виведення останніх показань температури
- Статистику по кімнатах (середня, мін., макс.)
- Список усіх сенсорів

Запустіть його для діагностики:
```bash
python check_database.py
```

## 📡 API Endpoints

Застосунок надає REST API (усі відповіді у JSON):

| Метод | URL | Опис |
|-------|-----|------|
| GET | `/api/infrastructure` | Повна структура: будинки, кімнати, пристрої, сенсори |
| GET | `/api/temperature-stats` | Останнє значення температури по кожній кімнаті |
| GET | `/api/sensor/<id>/latest` | Останнє показання сенсора |
| GET | `/api/sensor/<id>/data?period=24h` | Історія сенсора за період (`1h`, `24h`, `7d`, `30d`) |
| GET | `/api/events` | Останні 10 подій |
| GET | `/api/all-events` | Останні 50 подій |
| GET | `/api/homes` | Список будинків |
| GET | `/api/rooms/<home_id>` | Кімнати будинку |
| GET | `/api/devices/<room_id>` | Пристрої в кімнаті |
| POST | `/api/device/toggle` | Змінити стан пристрою (тіло: `{device_id, current_status}`) |
| POST | `/api/device/add` | Додати пристрій (тіло: `{room_id, name, status, sensor_type?}`) |
| DELETE | `/api/device/delete/<device_id>` | Видалити пристрій |
| POST | `/api/home/add` | Додати будинок (`{address}`) |
| POST | `/api/room/add` | Додати кімнату (`{home_id, name}`) |
| GET | `/api/automation-rules` | Список правил автоматизації |
| ... | ... | (інші маршрути для сторінок: `/devices`, `/sensors`, `/automation`, `/events`) |

## 📄 Сторінки інтерфейсу

- `/` – головна дашборд (інфраструктура + останні події)
- `/devices` – керування пристроями
- `/sensors` – перегляд сенсорів та графіків температури
- `/automation` – перегляд правил автоматизації (читання)
- `/events` – повний журнал подій

## 👨‍💻 Автор

Максим.Р, Андрій.Т

Курсова робота з баз даних, Хмельницький Національни Університет, 2025

## 📃 Ліцензія

Цей проєкт створений в навчальних цілях. Використовуйте вільно для власного навчання.
