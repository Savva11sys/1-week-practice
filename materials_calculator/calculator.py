import math
import sqlite3
from pathlib import Path

class MaterialCalculator:
    def __init__(self, db_path=None):
        if db_path is None:
            db_path = Path(__file__).parent.parent / "database" / "furniture.db"
        self.db_path = db_path
    
    def get_connection(self):
        """Создает соединение с базой данных"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def calculate_raw_material_needed(self, product_type_id: int, material_type_id: int, 
                                    quantity: int, param1: float, param2: float) -> int:
        """
        Рассчитывает количество сырья, необходимого для производства заданного 
        количества продукции с учетом потерь сырья.
        
        Формула:
        Сырье = ceil((param1 * param2 * production_coefficient * quantity) * (1 + loss_percentage/100))
        
        Возвращает:
        - Количество сырья (целое число, округленное вверх)
        - -1 в случае ошибки (неверные параметры)
        """
        try:
            # Проверка входных параметров
            if quantity <= 0 or param1 <= 0 or param2 <= 0:
                return -1
            
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Получаем коэффициент типа продукции
                cursor.execute(
                    "SELECT production_coefficient FROM product_types WHERE id = ?",
                    (product_type_id,)
                )
                product_type = cursor.fetchone()
                
                if not product_type:
                    return -1
                
                production_coefficient = product_type['production_coefficient']
                
                # Получаем процент потерь для материала
                cursor.execute(
                    "SELECT loss_percentage FROM materials WHERE id = ?",
                    (material_type_id,)
                )
                material = cursor.fetchone()
                
                if not material:
                    return -1
                
                loss_percentage = material['loss_percentage']
                
                # Расчет необходимого сырья
                material_per_unit = param1 * param2 * production_coefficient
                total_material_needed = material_per_unit * quantity
                
                # Учет потерь
                material_with_loss = total_material_needed * (1 + loss_percentage / 100)
                
                # Округление вверх до целого числа
                raw_material_needed = math.ceil(material_with_loss)
                
                return raw_material_needed
                
        except Exception as e:
            print(f"Ошибка расчета: {e}")
            return -1

def calculate_raw_material_needed(product_type_id: int, material_type_id: int, 
                                quantity: int, param1: float, param2: float) -> int:
    """
    Функция для использования из других модулей
    """
    calculator = MaterialCalculator()
    return calculator.calculate_raw_material_needed(
        product_type_id, material_type_id, quantity, param1, param2
    )

if __name__ == "__main__":
    # Тестирование калькулятора
    calculator = MaterialCalculator()
    
    # Тестовые данные
    test_cases = [
        (1, 1, 10, 1.0, 1.0),  # Современный стул, Дуб
        (2, 2, 5, 1.5, 0.8),   # Классический стол, Бук
        (3, 3, 3, 2.0, 0.6),   # Современный шкаф, Сосна
    ]
    
    print("Тестирование калькулятора сырья:")
    print("-" * 50)
    
    for i, (pt_id, mt_id, qty, p1, p2) in enumerate(test_cases, 1):
        result = calculator.calculate_raw_material_needed(pt_id, mt_id, qty, p1, p2)
        
        if result == -1:
            print(f"Тест {i}: Ошибка в параметрах")
        else:
            print(f"Тест {i}:")
            print(f"  Тип продукции: {pt_id}, Материал: {mt_id}")
            print(f"  Количество: {qty}, Параметры: {p1} x {p2}")
            print(f"  Результат: {result} единиц сырья")
            print()