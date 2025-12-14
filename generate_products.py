import sqlite3
import random
from datetime import datetime, timedelta
from pathlib import Path


DB_PATH = Path(__file__).parent / "database" / "furniture.db"


PRODUCT_TYPES = [
    {"id": 1, "name": "Современный стул", "coefficient": 1.2},
    {"id": 2, "name": "Классический стол", "coefficient": 1.5},
    {"id": 3, "name": "Современный шкаф", "coefficient": 1.8},
    {"id": 4, "name": "Классическое кресло", "coefficient": 1.3},
    {"id": 5, "name": "Комод", "coefficient": 1.6},
    {"id": 6, "name": "Тумба", "coefficient": 1.4},
    {"id": 7, "name": "Полка", "coefficient": 1.1},
    {"id": 8, "name": "Стеллаж", "coefficient": 1.7}
]

MATERIALS = [
    {"id": 1, "name": "Дуб", "loss": 5.0},
    {"id": 2, "name": "Бук", "loss": 4.5},
    {"id": 3, "name": "Сосна", "loss": 6.0},
    {"id": 4, "name": "МДФ", "loss": 3.0},
    {"id": 5, "name": "Массив ясеня", "loss": 4.0},
    {"id": 6, "name": "Орех", "loss": 4.8},
    {"id": 7, "name": "Береза", "loss": 5.5},
    {"id": 8, "name": "Лиственница", "loss": 5.2}
]

WORKSHOPS = [
    {"id": 1, "name": "Цех распиловки", "time": 2},
    {"id": 2, "name": "Цех шлифовки", "time": 3},
    {"id": 3, "name": "Цех сборки", "time": 5},
    {"id": 4, "name": "Цех покраски", "time": 4},
    {"id": 5, "name": "Цех упаковки", "time": 1},
    {"id": 6, "name": "Цех фрезеровки", "time": 3},
    {"id": 7, "name": "Цех лакировки", "time": 4},
    {"id": 8, "name": "Цех фурнитуры", "time": 2}
]


CHAIR_NAMES = [
    "Стул офисный 'Эргономик'",
    "Стул кухонный 'Классик'",
    "Стул геймерский 'Профи'",
    "Стул детский 'Радуга'",
    "Стул барный 'Высота'",
    "Стул складной 'Кемпинг'",
    "Стул компьютерный 'Орто'",
    "Стул руководителя 'Премиум'"
]

TABLE_NAMES = [
    "Стол обеденный 'Семейный'",
    "Стол компьютерный 'Геймер'",
    "Стол журнальный 'Модерн'",
    "Стол кухонный 'Угловой'",
    "Стол письменный 'Ученик'",
    "Стол кофейный 'Мини'",
    "Стол прикроватный 'Компакт'",
    "Стол трансформер 'Мульти'"
]

WARDROBE_NAMES = [
    "Шкаф-купе 'Система'",
    "Шкаф распашной 'Классика'",
    "Шкаф гардеробный 'Практик'",
    "Шкаф книжный 'Библио'",
    "Шкаф прихожий 'Встреча'",
    "Шкаф угловой 'Оптима'",
    "Шкаф детский 'Сказка'",
    "Шкаф встроенный 'Стиль'"
]

CHAIR_NAMES = [
    "Кресло офисное 'Комфорт'",
    "Кресло качалка 'Релакс'",
    "Кресло компьютерное 'Геймер'",
    "Кресло детское 'Малыш'",
    "Кресло массажное 'Здоровье'",
    "Кресло парикмахерское 'Профи'",
    "Кресло кинозал 'Кино'",
    "Кресло кожаное 'Люкс'"
]

CHEST_NAMES = [
    "Комод трехсекционный 'Порядок'",
    "Комод детский 'Игрушка'",
    "Комод прикроватный 'Аксессуар'",
    "Комод с зеркалом 'Грация'",
    "Комод угловой 'Эконом'",
    "Комод распашной 'Традиция'",
    "Комод современный 'Минимал'",
    "Комод винтажный 'Ретро'"
]

CABINET_NAMES = [
    "Тумба ТВ 'Телевизор'",
    "Тумба прикроватная 'Ночка'",
    "Тумба под раковину 'Ванна'",
    "Тумба обувная 'Обувница'",
    "Тумба журнальная 'Пресса'",
    "Тумба барная 'Бармен'",
    "Тумба компьютерная 'Оргтехника'",
    "Тумба угловая 'Уголок'"
]

SHELF_NAMES = [
    "Полка настенная 'Декор'",
    "Полка книжная 'Читатель'",
    "Полка угловая 'Угол'",
    "Полка напольная 'Стойка'",
    "Полка в ванную 'Гигиена'",
    "Полка детская 'Игрушки'",
    "Полка кухонная 'Посуда'",
    "Полка многоярусная 'Система'"
]

RACK_NAMES = [
    "Стеллаж книжный 'Библиотека'",
    "Стеллаж промышленный 'Склад'",
    "Стеллаж детский 'Развитие'",
    "Стеллаж обувной 'Обувь'",
    "Стеллаж для вина 'Винный'",
    "Стеллаж гаражный 'Инструмент'",
    "Стеллаж офисный 'Документы'",
    "Стеллаж модульный 'Система'"
]

ALL_PRODUCT_NAMES = CHAIR_NAMES + TABLE_NAMES + WARDROBE_NAMES + CHAIR_NAMES + CHEST_NAMES + CABINET_NAMES + SHELF_NAMES + RACK_NAMES

def generate_articles(start_num=1, count=200):
    """Генерация артикулов"""
    articles = []
    for i in range(start_num, start_num + count):
        if i <= 12:
            articles.append(f"CHAIR-{i:03d}")
        elif i <= 24:
            articles.append(f"TABLE-{i-12:03d}")
        elif i <= 36:
            articles.append(f"WARD-{i-24:03d}")
        elif i <= 48:
            articles.append(f"CRSL-{i-36:03d}")
        else:
            articles.append(f"COMP-{i-48:03d}")
    return articles

def get_product_name(article, product_type_id):
    """Получить название товара на основе артикула и типа"""
    if "CHAIR" in article:
        names = CHAIR_NAMES if product_type_id == 1 else CHAIR_NAMES
    elif "TABLE" in article:
        names = TABLE_NAMES
    elif "WARD" in article:
        names = WARDROBE_NAMES
    elif "CRSL" in article:
        names = CHAIR_NAMES
    else:
        names = random.choice([CHEST_NAMES, CABINET_NAMES, SHELF_NAMES, RACK_NAMES])
    
    return random.choice(names)

def generate_products(count=200):
    """Генерация тестовых товаров"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    
    cursor.execute("SELECT COUNT(*) FROM products")
    existing_count = cursor.fetchone()[0]
    
    if existing_count >= count:
        print(f"✅ В базе уже есть {existing_count} товаров")
        return
    
    articles = generate_articles(existing_count + 1, count)
    
    inserted_count = 0
    for i, article in enumerate(articles):
        try:
            
            if "CHAIR" in article:
                product_type_id = 1  
            elif "TABLE" in article:
                product_type_id = 2  
            elif "WARD" in article:
                product_type_id = 3  
            elif "CRSL" in article:
                product_type_id = 4  
            else:
                product_type_id = random.randint(5, 8)  
            
            product_name = get_product_name(article, product_type_id)
            material_id = random.randint(1, len(MATERIALS))
            
           
            if product_type_id == 1:  # Стул
                param1 = round(random.uniform(0.4, 0.6), 2)  
                param2 = round(random.uniform(0.4, 0.6), 2)  
                price = round(random.uniform(2500, 8500), 2)
            elif product_type_id == 2:  # Стол
                param1 = round(random.uniform(0.8, 1.6), 2)  
                param2 = round(random.uniform(0.6, 1.0), 2)  
                price = round(random.uniform(7500, 25000), 2)
            elif product_type_id == 3:  # Шкаф
                param1 = round(random.uniform(1.2, 2.4), 2)  
                param2 = round(random.uniform(0.4, 0.8), 2)  
                price = round(random.uniform(15000, 50000), 2)
            elif product_type_id == 4:  # Кресло
                param1 = round(random.uniform(0.6, 0.9), 2)  
                param2 = round(random.uniform(0.6, 0.9), 2)  
                price = round(random.uniform(5000, 15000), 2)
            else:  # Другая мебель
                param1 = round(random.uniform(0.5, 1.5), 2)
                param2 = round(random.uniform(0.3, 0.8), 2)
                price = round(random.uniform(3000, 20000), 2)
            
           
            days_ago = random.randint(0, 180)
            created_date = datetime.now() - timedelta(days=days_ago)
            
            
            cursor.execute("""
                INSERT INTO products 
                (article, product_type_id, product_name, min_partner_price, 
                 main_material_id, param1, param2, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                article, product_type_id, product_name, price,
                material_id, param1, param2,
                created_date, created_date
            ))
            
            product_id = cursor.lastrowid
            
            
            workshop_count = random.randint(1, 4)
            selected_workshops = random.sample(range(1, len(WORKSHOPS) + 1), workshop_count)
            
            for order, workshop_id in enumerate(selected_workshops, 1):
                cursor.execute("""
                    INSERT INTO production_schedule (product_id, workshop_id, processing_order)
                    VALUES (?, ?, ?)
                """, (product_id, workshop_id, order))
            
            inserted_count += 1
            
            print(f"✅ Добавлен товар: {article} - {product_name}")
            
        except Exception as e:
            print(f"❌ Ошибка при добавлении товара {article}: {e}")
    
    conn.commit()
    conn.close()
    
    print(f"\n🎉 Успешно добавлено {inserted_count} товаров!")
    print(f"📊 Всего товаров в базе: {existing_count + inserted_count}")

def check_database():
    """Проверка состояния базы данных"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\n📊 Проверка базы данных:")
    print("-" * 40)
    

    tables = ['products', 'product_types', 'materials', 'workshops', 'production_schedule']
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"📁 Таблица {table}: {count} записей")
    
    cursor.execute("""
        SELECT 
            pt.type_name,
            COUNT(p.id) as count,
            AVG(p.min_partner_price) as avg_price
        FROM products p
        LEFT JOIN product_types pt ON p.product_type_id = pt.id
        GROUP BY p.product_type_id
    """)
    
    print("\n📦 Статистика по типам продукции:")
    print("-" * 40)
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]} товаров, средняя цена: {row[2]:.2f} ₽")
    
    conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("🎯 Генератор тестовых товаров для мебельной компании")
    print("=" * 60)
    
    generate_products(200)
    
    check_database()
    
    print("\n✅ Генерация завершена!")
    print(f"🌐 Откройте http://localhost:8000 для просмотра товаров")