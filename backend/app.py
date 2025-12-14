from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import os
import sqlite3
from typing import List
import json

# АБСОЛЮТНЫЙ ПУТЬ к файлу frontend/index.html
BASE_DIR = Path(__file__).parent.parent
FRONTEND_PATH = BASE_DIR / "frontend" / "index.html"

print(f"🔍 Путь к фронтенду: {FRONTEND_PATH}")
print(f"🔍 Файл существует: {FRONTEND_PATH.exists()}")

from database import db

# Путь к базе данных
DB_PATH = BASE_DIR / "database" / "furniture_company.db"

app = FastAPI(title="Мебельная компания API", version="1.0.0")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске"""
    print("🚀 Запуск системы управления мебельной компанией...")
    db.init_database()
    print("✅ База данных готова")
    print(f"🌐 Интерфейс доступен по адресу: http://localhost:8000")

# ГЛАВНАЯ СТРАНИЦА - КЛЮЧЕВОЙ МОМЕНТ!
@app.get("/")
async def read_root():
    """Главная страница системы"""
    print(f"📄 Запрос главной страницы, проверяю файл: {FRONTEND_PATH}")
    
    if FRONTEND_PATH.exists():
        print("✅ Файл frontend/index.html найден, отдаю...")
        return FileResponse(FRONTEND_PATH)
    else:
        print("❌ Файл frontend/index.html НЕ НАЙДЕН!")
        print(f"   Искал по пути: {FRONTEND_PATH}")
        print(f"   Текущая директория: {os.getcwd()}")
        
        # Возвращаем JSON с инструкцией
        return JSONResponse({
            "message": "Добро пожаловать в систему управления мебельной компанией!",
            "status": "backend_active",
            "frontend_status": "not_found",
            "instruction": "Создайте файл frontend/index.html в папке frontend/",
            "api_endpoints": {
                "products": "GET /products",
                "workshops": "GET /workshops",
                "product_types": "GET /product-types",
                "materials": "GET /materials",
                "create_product": "POST /products",
                "delete_product": "DELETE /products/{id}",
                "batch_delete": "DELETE /products/batch",
                "statistics": "GET /reports/statistics"
            },
            "quick_test": "Откройте /products для проверки API"
        })

# API эндпоинты
@app.get("/products")
async def get_products():
    """Получить все продукты"""
    try:
        products = db.get_all_products()
        return {"success": True, "data": products, "count": len(products)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workshops")
async def get_workshops():
    """Получить все цехи"""
    try:
        workshops = db.get_all_workshops()
        return {"success": True, "data": workshops, "count": len(workshops)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/product-types")
async def get_product_types():
    """Получить все типы продукции"""
    try:
        types = db.get_product_types()
        return {"success": True, "data": types, "count": len(types)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/materials")
async def get_materials():
    """Получить все материалы"""
    try:
        materials = db.get_materials()
        return {"success": True, "data": materials, "count": len(materials)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/products")
async def create_product(data: dict):
    """Создать новый продукт"""
    try:
        required_fields = ['article', 'product_type_id', 'product_name', 
                          'min_partner_price', 'main_material_id', 'param1', 'param2']
        
        for field in required_fields:
            if field not in data:
                raise HTTPException(status_code=400, detail=f"Отсутствует поле: {field}")
        
        product_id = db.add_product(
            article=data['article'],
            product_type_id=data['product_type_id'],
            product_name=data['product_name'],
            min_partner_price=data['min_partner_price'],
            main_material_id=data['main_material_id'],
            param1=data['param1'],
            param2=data['param2']
        )
        
        return {"success": True, "id": product_id, "message": "Продукт создан"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/products/{product_id}")
async def delete_product(product_id: int):
    """Удалить продукт по ID"""
    try:
        # Проверяем существование продукта
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM products WHERE id = ?", (product_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Продукт не найден")
        
        # Удаляем продукт (каскадное удаление через внешние ключи)
        cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
        conn.commit()
        conn.close()
        
        return {"success": True, "message": f"Продукт {product_id} удален"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/products/batch")
async def delete_products_batch(product_ids: List[int]):
    """Массовое удаление продуктов"""
    try:
        if not product_ids:
            raise HTTPException(status_code=400, detail="Не указаны ID продуктов")
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Преобразуем список в строку для SQL запроса
        placeholders = ','.join('?' for _ in product_ids)
        query = f"DELETE FROM products WHERE id IN ({placeholders})"
        
        cursor.execute(query, product_ids)
        deleted_count = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "message": f"Удалено {deleted_count} продуктов",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Новый эндпоинт для получения статистики
@app.get("/reports/statistics")
async def get_statistics():
    """Получить статистику для отчетов"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Общая статистика
        cursor.execute("SELECT COUNT(*) FROM products")
        total_products = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM workshops")
        total_workshops = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM product_types")
        total_types = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM materials")
        total_materials = cursor.fetchone()[0]
        
        # Статистика по ценам
        cursor.execute("SELECT AVG(min_partner_price), MIN(min_partner_price), MAX(min_partner_price) FROM products")
        price_stats = cursor.fetchone()
        
        # Распределение по типам
        cursor.execute("""
            SELECT pt.type_name, COUNT(p.id) as count
            FROM products p
            JOIN product_types pt ON p.product_type_id = pt.id
            GROUP BY p.product_type_id
            ORDER BY count DESC
        """)
        type_distribution = cursor.fetchall()
        
        # Распределение по материалам
        cursor.execute("""
            SELECT m.material_name, COUNT(p.id) as count
            FROM products p
            JOIN materials m ON p.main_material_id = m.id
            GROUP BY p.main_material_id
            ORDER BY count DESC
        """)
        material_distribution = cursor.fetchall()
        
        # Последние добавленные товары
        cursor.execute("""
            SELECT article, product_name, min_partner_price, created_at
            FROM products
            ORDER BY created_at DESC
            LIMIT 10
        """)
        recent_products = cursor.fetchall()
        
        # Статистика по цехам (производительность)
        cursor.execute("""
            SELECT workshop_name, worker_count, processing_time, 
                   ROUND(worker_count * 100.0 / processing_time, 2) as productivity
            FROM workshops
            ORDER BY productivity DESC
        """)
        workshop_stats = cursor.fetchall()
        
        conn.close()
        
        return {
            "success": True,
            "statistics": {
                "total_products": total_products,
                "total_workshops": total_workshops,
                "total_types": total_types,
                "total_materials": total_materials,
                "price_avg": float(price_stats[0]) if price_stats[0] else 0,
                "price_min": float(price_stats[1]) if price_stats[1] else 0,
                "price_max": float(price_stats[2]) if price_stats[2] else 0,
                "type_distribution": [
                    {"type": row[0], "count": row[1]} 
                    for row in type_distribution
                ],
                "material_distribution": [
                    {"material": row[0], "count": row[1]} 
                    for row in material_distribution
                ],
                "recent_products": [
                    {
                        "article": row[0],
                        "name": row[1],
                        "price": float(row[2]) if row[2] else 0,
                        "date": row[3]
                    } 
                    for row in recent_products
                ],
                "workshop_stats": [
                    {
                        "name": row[0],
                        "workers": row[1],
                        "processing_time": row[2],
                        "productivity": row[3]
                    }
                    for row in workshop_stats
                ]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Дополнительный эндпоинт для получения продукта по ID
@app.get("/products/{product_id}")
async def get_product(product_id: int):
    """Получить продукт по ID"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT p.*, pt.type_name, m.material_name
            FROM products p
            LEFT JOIN product_types pt ON p.product_type_id = pt.id
            LEFT JOIN materials m ON p.main_material_id = m.id
            WHERE p.id = ?
        """, (product_id,))
        
        product = cursor.fetchone()
        conn.close()
        
        if not product:
            raise HTTPException(status_code=404, detail="Продукт не найден")
        
        # Преобразуем в словарь
        columns = [description[0] for description in cursor.description]
        product_dict = dict(zip(columns, product))
        
        return {"success": True, "data": product_dict}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Эндпоинт для обновления продукта
@app.put("/products/{product_id}")
async def update_product(product_id: int, data: dict):
    """Обновить продукт по ID"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Проверяем существование продукта
        cursor.execute("SELECT id FROM products WHERE id = ?", (product_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Продукт не найден")
        
        # Формируем запрос на обновление
        update_fields = []
        values = []
        
        allowed_fields = ['article', 'product_name', 'product_type_id', 
                         'main_material_id', 'min_partner_price', 'param1', 'param2']
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = ?")
                values.append(data[field])
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="Нет полей для обновления")
        
        # Добавляем ID в конец значений
        values.append(product_id)
        
        # Выполняем обновление
        query = f"UPDATE products SET {', '.join(update_fields)} WHERE id = ?"
        cursor.execute(query, values)
        conn.commit()
        conn.close()
        
        return {"success": True, "message": f"Продукт {product_id} обновлен"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Эндпоинт для экспорта данных
@app.get("/export/{data_type}")
async def export_data(data_type: str):
    """Экспорт данных в CSV формате"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        if data_type == "products":
            cursor.execute("""
                SELECT p.article, p.product_name, pt.type_name, m.material_name, 
                       p.min_partner_price, p.param1, p.param2, p.created_at
                FROM products p
                LEFT JOIN product_types pt ON p.product_type_id = pt.id
                LEFT JOIN materials m ON p.main_material_id = m.id
            """)
            data = cursor.fetchall()
            headers = ["Артикул", "Наименование", "Тип", "Материал", 
                      "Цена", "Параметр1", "Параметр2", "Дата создания"]
            
        elif data_type == "workshops":
            cursor.execute("SELECT workshop_name, worker_count, processing_time FROM workshops")
            data = cursor.fetchall()
            headers = ["Название цеха", "Количество работников", "Время обработки (ч)"]
            
        elif data_type == "materials":
            cursor.execute("SELECT material_name, description FROM materials")
            data = cursor.fetchall()
            headers = ["Материал", "Описание"]
            
        else:
            raise HTTPException(status_code=400, detail="Неверный тип данных")
        
        conn.close()
        
        # Преобразуем в CSV формат
        csv_content = ",".join(headers) + "\n"
        for row in data:
            csv_content += ",".join(str(value) for value in row) + "\n"
        
        return JSONResponse({
            "success": True,
            "data_type": data_type,
            "csv_content": csv_content,
            "row_count": len(data)
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Отдача статических файлов
@app.get("/{filename:path}")
async def serve_static(filename: str):
    """Отдача статических файлов из frontend"""
    file_path = BASE_DIR / "frontend" / filename
    
    # Разрешенные расширения
    allowed_extensions = {'.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg'}
    
    if file_path.suffix.lower() in allowed_extensions and file_path.exists():
        return FileResponse(file_path)
    
    # Если это не статический файл, вернем 404
    raise HTTPException(status_code=404, detail=f"Ресурс не найден: {filename}")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 Запуск сервера мебельной компании")
    print("="*60)
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)