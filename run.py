#!/usr/bin/env python3
"""
Главный запускаемый файл системы управления продукцией мебельной компании.
Объединяет backend, frontend и базу данных.
"""

import sys
import webbrowser
import threading
import time
from pathlib import Path

def check_dependencies():
    """Проверка установленных зависимостей"""
    required_modules = ['fastapi', 'uvicorn', 'sqlite3', 'pandas']
    missing_modules = []
    
    for module in required_modules:
        try:
            __import__(module)
        except ImportError:
            missing_modules.append(module)
    
    if missing_modules:
        print("❌ Отсутствуют необходимые модули:")
        for module in missing_modules:
            print(f"   - {module}")
        print("\nУстановите зависимости командой:")
        print("pip install fastapi uvicorn pandas openpyxl")
        return False
    
    return True

def setup_database():
    """Настройка базы данных - ИСПРАВЛЕННЫЙ ИМПОРТ"""
    # Импортируем из правильного места
    sys.path.insert(0, str(Path(__file__).parent / "backend"))
    
    try:
        from database import Database
    except ImportError as e:
        print(f"❌ Ошибка импорта Database: {e}")
        print("Убедитесь, что файл backend/database.py существует")
        return False
    
    db = Database()
    
    # Проверяем, существует ли база данных
    db_file = Path(__file__).parent / "database" / "furniture.db"
    
    if not db_file.exists():
        print("🔧 Создание базы данных...")
        
        # Создаем папку database если её нет
        db_file.parent.mkdir(exist_ok=True)
        
        # Создаем простой init.sql если его нет
        init_file = db_file.parent / "init.sql"
        if not init_file.exists():
            init_sql = """
            CREATE TABLE IF NOT EXISTS product_types (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type_name VARCHAR(50) NOT NULL UNIQUE,
                production_coefficient REAL NOT NULL CHECK(production_coefficient > 0)
            );

            CREATE TABLE IF NOT EXISTS materials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                material_name VARCHAR(100) NOT NULL UNIQUE,
                loss_percentage REAL NOT NULL CHECK(loss_percentage >= 0 AND loss_percentage <= 100)
            );

            CREATE TABLE IF NOT EXISTS workshops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workshop_name VARCHAR(100) NOT NULL UNIQUE,
                worker_count INTEGER NOT NULL CHECK(worker_count > 0),
                processing_time INTEGER NOT NULL CHECK(processing_time > 0)
            );

            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                article VARCHAR(50) NOT NULL,
                product_type_id INTEGER NOT NULL,
                product_name VARCHAR(200) NOT NULL,
                min_partner_price DECIMAL(10,2) NOT NULL CHECK(min_partner_price >= 0),
                main_material_id INTEGER NOT NULL,
                param1 REAL NOT NULL CHECK(param1 > 0),
                param2 REAL NOT NULL CHECK(param2 > 0),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Вставка тестовых данных
            INSERT OR IGNORE INTO product_types (type_name, production_coefficient) VALUES
            ('Современный стул', 1.2),
            ('Классический стол', 1.5),
            ('Современный шкаф', 1.8),
            ('Классическое кресло', 1.3);

            INSERT OR IGNORE INTO materials (material_name, loss_percentage) VALUES
            ('Дуб', 5.0),
            ('Бук', 4.5),
            ('Сосна', 6.0),
            ('МДФ', 3.0),
            ('Массив ясеня', 4.0);

            INSERT OR IGNORE INTO workshops (workshop_name, worker_count, processing_time) VALUES
            ('Цех распиловки', 8, 2),
            ('Цех шлифовки', 6, 3),
            ('Цех сборки', 10, 5),
            ('Цех покраски', 7, 4),
            ('Цех упаковки', 4, 1);
            """
            with open(init_file, 'w', encoding='utf-8') as f:
                f.write(init_sql)
        
        db.init_database()
        
        print("✅ База данных создана и заполнена тестовыми данными")
    else:
        print("✅ База данных уже существует")
    
    return True

def start_backend():
    """Запуск backend сервера"""
    import subprocess
    import os
    
    # Меняем рабочую директорию на backend
    original_dir = os.getcwd()
    backend_dir = Path(__file__).parent / "backend"
    
    if backend_dir.exists():
        os.chdir(backend_dir)
    else:
        print(f"❌ Папка backend не найдена: {backend_dir}")
        return None
    
    try:
        # Запускаем uvicorn
        print("🚀 Запуск backend сервера...")
        print("   Сервер будет доступен по адресу: http://localhost:8000")
        print("   Нажмите Ctrl+C для остановки сервера\n")
        
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "app:app", 
            "--host", "0.0.0.0", "--port", "8000", "--reload"
        ])
        
        # Даем серверу время на запуск
        time.sleep(3)
        
        return process
        
    except Exception as e:
        print(f"❌ Ошибка запуска сервера: {e}")
        return None
    finally:
        os.chdir(original_dir)

def open_browser():
    """Открытие браузера с интерфейсом"""
    time.sleep(5)  # Даем серверу время на запуск
    webbrowser.open("http://localhost:8000")

def main():
    """Главная функция запуска системы"""
    print("=" * 60)
    print("🎯 Система управления продукцией мебельной компании")
    print("=" * 60)
    print()
    
    # Проверяем зависимости
    if not check_dependencies():
        sys.exit(1)
    
    # Настраиваем базу данных
    if not setup_database():
        sys.exit(1)
    
    # Запускаем backend в отдельном потоке
    backend_process = start_backend()
    
    if backend_process is None:
        print("❌ Не удалось запустить сервер")
        sys.exit(1)
    
    # Открываем браузер
    print("🌐 Открытие интерфейса в браузере...")
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    try:
        # Ждем завершения backend процесса
        backend_process.wait()
    except KeyboardInterrupt:
        print("\n\n👋 Завершение работы системы...")
        backend_process.terminate()
        backend_process.wait()
        print("✅ Система остановлена")

if __name__ == "__main__":
    main()