import sqlite3
import pandas as pd
from contextlib import contextmanager
from pathlib import Path
from typing import Optional, List, Dict, Any

class Database:
    def __init__(self, db_path: Optional[str] = None):
        """Инициализация подключения к базе данных SQLite"""
        if db_path is None:
            self.db_path = Path(__file__).parent.parent / "database" / "furniture.db"
        else:
            self.db_path = Path(db_path)
        
        self.db_path.parent.mkdir(exist_ok=True)
    
    @contextmanager
    def get_connection(self):
        """Контекстный менеджер для работы с подключением к БД"""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def init_database(self) -> bool:
        """Инициализация базы данных: создает таблицы и заполняет тестовыми данными"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Создаем все таблицы
                tables_sql = [
                    # Таблица типов продукции
                    """
                    CREATE TABLE IF NOT EXISTS product_types (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        type_name VARCHAR(50) NOT NULL UNIQUE,
                        production_coefficient REAL NOT NULL CHECK(production_coefficient > 0)
                    )
                    """,
                    
                    # Таблица материалов
                    """
                    CREATE TABLE IF NOT EXISTS materials (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        material_name VARCHAR(100) NOT NULL UNIQUE,
                        loss_percentage REAL NOT NULL CHECK(loss_percentage >= 0 AND loss_percentage <= 100)
                    )
                    """,
                    
                    # Таблица цехов
                    """
                    CREATE TABLE IF NOT EXISTS workshops (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        workshop_name VARCHAR(100) NOT NULL UNIQUE,
                        worker_count INTEGER NOT NULL CHECK(worker_count > 0),
                        processing_time INTEGER NOT NULL CHECK(processing_time > 0)
                    )
                    """,
                    
                    # Таблица продукции
                    """
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
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (product_type_id) REFERENCES product_types(id),
                        FOREIGN KEY (main_material_id) REFERENCES materials(id)
                    )
                    """,
                    
                    # Таблица производственного графика
                    """
                    CREATE TABLE IF NOT EXISTS production_schedule (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        product_id INTEGER NOT NULL,
                        workshop_id INTEGER NOT NULL,
                        processing_order INTEGER NOT NULL CHECK(processing_order > 0),
                        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
                        UNIQUE(product_id, workshop_id, processing_order)
                    )
                    """,
                    
                    # Триггер для обновления времени
                    """
                    CREATE TRIGGER IF NOT EXISTS update_products_timestamp 
                    AFTER UPDATE ON products
                    BEGIN
                        UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                    END
                    """
                ]
                
                # Выполняем все SQL команды
                for sql in tables_sql:
                    cursor.execute(sql)
                
                # Заполняем тестовыми данными
                # Типы продукции
                cursor.execute("""
                INSERT OR IGNORE INTO product_types (type_name, production_coefficient) VALUES
                ('Современный стул', 1.2),
                ('Классический стол', 1.5),
                ('Современный шкаф', 1.8),
                ('Классическое кресло', 1.3)
                """)
                
                # Материалы
                cursor.execute("""
                INSERT OR IGNORE INTO materials (material_name, loss_percentage) VALUES
                ('Дуб', 5.0),
                ('Бук', 4.5),
                ('Сосна', 6.0),
                ('МДФ', 3.0),
                ('Массив ясеня', 4.0)
                """)
                
                # Цехи
                cursor.execute("""
                INSERT OR IGNORE INTO workshops (workshop_name, worker_count, processing_time) VALUES
                ('Цех распиловки', 8, 2),
                ('Цех шлифовки', 6, 3),
                ('Цех сборки', 10, 5),
                ('Цех покраски', 7, 4),
                ('Цех упаковки', 4, 1)
                """)
                
                # Проверяем, есть ли продукты
                cursor.execute("SELECT COUNT(*) as count FROM products")
                if cursor.fetchone()['count'] == 0:
                    # Добавляем тестовый продукт
                    cursor.execute("""
                    INSERT INTO products 
                    (article, product_type_id, product_name, min_partner_price, main_material_id, param1, param2)
                    VALUES 
                    ('CHAIR-001', 1, 'Современный стул "Эко"', 4500.00, 1, 0.5, 0.5)
                    """)
                    
                    product_id = cursor.lastrowid
                    
                    # Назначаем цехи
                    if product_id:
                        cursor.execute("""
                        INSERT INTO production_schedule (product_id, workshop_id, processing_order) VALUES
                        (?, 1, 1),
                        (?, 2, 2),
                        (?, 3, 3)
                        """, (product_id, product_id, product_id))
                
                print(f"✅ База данных успешно инициализирована")
                return True
                
        except Exception as e:
            print(f"❌ Ошибка инициализации базы данных: {e}")
            return False
    
    def execute_query(self, query: str, params: tuple = None, 
                     fetch_one: bool = False, fetch_all: bool = False) -> Any:
        """Универсальный метод для выполнения SQL запросов"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params or ())
                
                if fetch_one:
                    result = cursor.fetchone()
                    return dict(result) if result else None
                elif fetch_all:
                    return [dict(row) for row in cursor.fetchall()]
                else:
                    return cursor.lastrowid
        except Exception as e:
            print(f"❌ Ошибка выполнения запроса: {e}")
            raise
    
    def get_all_products(self) -> List[Dict]:
        """Получить все продукты"""
        query = """
        SELECT 
            p.*,
            pt.type_name as product_type_name,
            m.material_name
        FROM products p
        LEFT JOIN product_types pt ON p.product_type_id = pt.id
        LEFT JOIN materials m ON p.main_material_id = m.id
        ORDER BY p.created_at DESC
        """
        return self.execute_query(query, fetch_all=True)
    
    def get_all_workshops(self) -> List[Dict]:
        """Получить все цехи"""
        return self.execute_query("SELECT * FROM workshops ORDER BY workshop_name", fetch_all=True)
    
    def get_product_types(self) -> List[Dict]:
        """Получить все типы продукции"""
        return self.execute_query("SELECT * FROM product_types ORDER BY type_name", fetch_all=True)
    
    def get_materials(self) -> List[Dict]:
        """Получить все материалы"""
        return self.execute_query("SELECT * FROM materials ORDER BY material_name", fetch_all=True)
    
    def add_product(self, article: str, product_type_id: int, product_name: str,
                   min_partner_price: float, main_material_id: int,
                   param1: float, param2: float) -> Optional[int]:
        """Добавить новый продукт"""
        query = """
        INSERT INTO products 
        (article, product_type_id, product_name, min_partner_price, 
         main_material_id, param1, param2)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        return self.execute_query(
            query, 
            (article, product_type_id, product_name, min_partner_price, 
             main_material_id, param1, param2)
        )


# Глобальный экземпляр для использования
db = Database()