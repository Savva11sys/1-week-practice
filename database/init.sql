import sqlite3
import pandas as pd
from contextlib import contextmanager
from pathlib import Path
from typing import Optional, List, Dict, Any

class Database:
    def __init__(self, db_path: Optional[str] = None):
        """Инициализация подключения к базе данных SQLite"""
        if db_path is None:
            # Путь к базе данных относительно расположения этого файла
            self.db_path = Path(__file__).parent.parent / "database" / "furniture.db"
        else:
            self.db_path = Path(db_path)
        
        # Создаем папку для базы данных, если её нет
        self.db_path.parent.mkdir(exist_ok=True)
    
    @contextmanager
    def get_connection(self):
        """
        Контекстный менеджер для работы с подключением к БД.
        Автоматически закрывает соединение после использования.
        """
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row  # Возвращает строки как словари
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"❌ Ошибка в транзакции: {e}")
            raise
        finally:
            conn.close()
    
    def init_database(self) -> bool:
        """Инициализация базы данных: создает таблицы и заполняет тестовыми данными"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # 1. Создаем таблицу типов продукции
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS product_types (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type_name VARCHAR(50) NOT NULL UNIQUE,
                    production_coefficient REAL NOT NULL CHECK(production_coefficient > 0)
                )
                """)
                
                # 2. Создаем таблицу материалов
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS materials (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    material_name VARCHAR(100) NOT NULL UNIQUE,
                    loss_percentage REAL NOT NULL CHECK(loss_percentage >= 0 AND loss_percentage <= 100)
                )
                """)
                
                # 3. Создаем таблицу цехов
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS workshops (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    workshop_name VARCHAR(100) NOT NULL UNIQUE,
                    worker_count INTEGER NOT NULL CHECK(worker_count > 0),
                    processing_time INTEGER NOT NULL CHECK(processing_time > 0)
                )
                """)
                
                # 4. Создаем таблицу продукции
                cursor.execute("""
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
                """)
                
                # 5. Создаем таблицу для связи продукции и цехов (производственный график)
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS production_schedule (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    workshop_id INTEGER NOT NULL,
                    processing_order INTEGER NOT NULL CHECK(processing_order > 0),
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    FOREIGN KEY (workshop_id) REFERENCES workshops(id),
                    UNIQUE(product_id, workshop_id, processing_order)
                )
                """)
                
                # 6. Создаем триггер для автоматического обновления времени изменения
                cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS update_products_timestamp 
                AFTER UPDATE ON products
                BEGIN
                    UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END
                """)
                
                # 7. Заполняем тестовыми данными (используем INSERT OR IGNORE чтобы избежать ошибок дублирования)
                
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
                
                # Проверяем, есть ли уже продукты, если нет - добавляем тестовые
                cursor.execute("SELECT COUNT(*) as count FROM products")
                if cursor.fetchone()['count'] == 0:
                    # Добавляем тестовый продукт
                    cursor.execute("""
                    INSERT OR IGNORE INTO products 
                    (article, product_type_id, product_name, min_partner_price, main_material_id, param1, param2)
                    VALUES 
                    ('CHAIR-001', 1, 'Современный стул "Эко"', 4500.00, 1, 0.5, 0.5)
                    """)
                    
                    # Получаем ID добавленного продукта
                    product_id = cursor.lastrowid
                    
                    # Назначаем цехи для этого продукта
                    if product_id:
                        cursor.execute("""
                        INSERT OR IGNORE INTO production_schedule (product_id, workshop_id, processing_order) VALUES
                        (?, 1, 1),
                        (?, 2, 2),
                        (?, 3, 3)
                        """, (product_id, product_id, product_id))
                
                print(f"✅ База данных успешно инициализирована: {self.db_path}")
                return True
                
        except Exception as e:
            print(f"❌ Ошибка инициализации базы данных: {e}")
            return False
    
    def execute_query(self, query: str, params: tuple = None, 
                     fetch_one: bool = False, fetch_all: bool = False) -> Any:
        """
        Универсальный метод для выполнения SQL запросов
        
        Аргументы:
            query: SQL запрос
            params: параметры для запроса
            fetch_one: вернуть одну строку
            fetch_all: вернуть все строки
            
        Возвращает:
            Результат запроса или ID последней вставленной строки
        """
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
            print(f"   Запрос: {query}")
            print(f"   Параметры: {params}")
            raise
    
    def import_from_excel(self, file_path: str, table_name: str) -> bool:
        """
        Импорт данных из Excel файла в указанную таблицу
        
        Аргументы:
            file_path: путь к Excel файлу
            table_name: имя таблицы для импорта
            
        Возвращает:
            True если импорт успешен, False если есть ошибки
        """
        try:
            # Читаем Excel файл
            df = pd.read_excel(file_path)
            
            with self.get_connection() as conn:
                # Используем if_exists='append' чтобы добавлять данные, не удаляя существующие
                df.to_sql(table_name, conn, if_exists='append', index=False)
            
            print(f"✅ Данные успешно импортированы из {file_path} в таблицу {table_name}")
            return True
            
        except FileNotFoundError:
            print(f"❌ Файл не найден: {file_path}")
            return False
        except Exception as e:
            print(f"❌ Ошибка импорта из Excel: {e}")
            return False
    
    def get_all_products(self) -> List[Dict]:
        """Получить все продукты с информацией о типе и материале"""
        query = """
        SELECT 
            p.*,
            pt.type_name as product_type_name,
            pt.production_coefficient,
            m.material_name,
            m.loss_percentage
        FROM products p
        LEFT JOIN product_types pt ON p.product_type_id = pt.id
        LEFT JOIN materials m ON p.main_material_id = m.id
        ORDER BY p.created_at DESC
        """
        return self.execute_query(query, fetch_all=True)
    
    def get_product_by_id(self, product_id: int) -> Optional[Dict]:
        """Получить продукт по ID"""
        query = """
        SELECT 
            p.*,
            pt.type_name as product_type_name,
            pt.production_coefficient,
            m.material_name,
            m.loss_percentage
        FROM products p
        LEFT JOIN product_types pt ON p.product_type_id = pt.id
        LEFT JOIN materials m ON p.main_material_id = m.id
        WHERE p.id = ?
        """
        result = self.execute_query(query, (product_id,), fetch_one=True)
        if result:
            # Получаем цехи для этого продукта
            workshops_query = """
            SELECT w.*, ps.processing_order
            FROM workshops w
            JOIN production_schedule ps ON w.id = ps.workshop_id
            WHERE ps.product_id = ?
            ORDER BY ps.processing_order
            """
            workshops = self.execute_query(workshops_query, (product_id,), fetch_all=True)
            result['workshops'] = workshops
        return result
    
    def get_all_workshops(self) -> List[Dict]:
        """Получить все цехи"""
        return self.execute_query("SELECT * FROM workshops ORDER BY workshop_name", fetch_all=True)
    
    def get_product_workshops(self, product_id: int) -> List[Dict]:
        """Получить цехи для конкретного продукта"""
        query = """
        SELECT w.*, ps.processing_order
        FROM workshops w
        JOIN production_schedule ps ON w.id = ps.workshop_id
        WHERE ps.product_id = ?
        ORDER BY ps.processing_order
        """
        return self.execute_query(query, (product_id,), fetch_all=True)
    
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
        try:
            product_id = self.execute_query(
                query, 
                (article, product_type_id, product_name, min_partner_price, 
                 main_material_id, param1, param2)
            )
            return product_id
        except Exception as e:
            print(f"❌ Ошибка добавления продукта: {e}")
            return None
    
    def update_product(self, product_id: int, article: str, product_type_id: int, 
                      product_name: str, min_partner_price: float, 
                      main_material_id: int, param1: float, param2: float) -> bool:
        """Обновить существующий продукт"""
        query = """
        UPDATE products 
        SET article = ?, product_type_id = ?, product_name = ?, 
            min_partner_price = ?, main_material_id = ?, 
            param1 = ?, param2 = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """
        try:
            self.execute_query(
                query,
                (article, product_type_id, product_name, min_partner_price,
                 main_material_id, param1, param2, product_id)
            )
            return True
        except Exception as e:
            print(f"❌ Ошибка обновления продукта: {e}")
            return False
    
    def delete_product(self, product_id: int) -> bool:
        """Удалить продукт (каскадное удаление через production_schedule)"""
        query = "DELETE FROM products WHERE id = ?"
        try:
            self.execute_query(query, (product_id,))
            return True
        except Exception as e:
            print(f"❌ Ошибка удаления продукта: {e}")
            return False
    
    def add_workshop_to_product(self, product_id: int, workshop_id: int, 
                               processing_order: int) -> bool:
        """Добавить цех к продукту"""
        query = """
        INSERT OR REPLACE INTO production_schedule 
        (product_id, workshop_id, processing_order)
        VALUES (?, ?, ?)
        """
        try:
            self.execute_query(query, (product_id, workshop_id, processing_order))
            return True
        except Exception as e:
            print(f"❌ Ошибка добавления цеха к продукту: {e}")
            return False
    
    def get_product_types(self) -> List[Dict]:
        """Получить все типы продукции"""
        return self.execute_query("SELECT * FROM product_types ORDER BY type_name", fetch_all=True)
    
    def get_materials(self) -> List[Dict]:
        """Получить все материалы"""
        return self.execute_query("SELECT * FROM materials ORDER BY material_name", fetch_all=True)
    
    def calculate_total_production_time(self, product_id: int) -> int:
        """Рассчитать общее время производства продукта"""
        query = """
        SELECT SUM(w.processing_time) as total_time
        FROM workshops w
        JOIN production_schedule ps ON w.id = ps.workshop_id
        WHERE ps.product_id = ?
        """
        result = self.execute_query(query, (product_id,), fetch_one=True)
        return result['total_time'] if result and result['total_time'] else 0
    
    def backup_database(self, backup_path: str) -> bool:
        """Создать резервную копию базы данных"""
        try:
            import shutil
            shutil.copy2(str(self.db_path), backup_path)
            print(f"✅ Резервная копия создана: {backup_path}")
            return True
        except Exception as e:
            print(f"❌ Ошибка создания резервной копии: {e}")
            return False


# Создаем глобальный экземпляр для удобства использования
db_instance = Database()

if __name__ == "__main__":
    # Тестирование базы данных
    print("🔧 Тестирование базы данных...")
    
    db = Database()
    if db.init_database():
        print("✅ База данных успешно протестирована")
        
        # Показываем примеры данных
        products = db.get_all_products()
        print(f"📦 Найдено продуктов: {len(products)}")
        
        workshops = db.get_all_workshops()
        print(f"🏭 Найдено цехов: {len(workshops)}")
        
        materials = db.get_materials()
        print(f"🌳 Найдено материалов: {len(materials)}")
    else:
        print("❌ Ошибка тестирования базы данных")