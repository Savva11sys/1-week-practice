from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class ProductTypeBase(BaseModel):
    type_name: str = Field(..., max_length=50)
    production_coefficient: float = Field(..., gt=0)

class ProductTypeCreate(ProductTypeBase):
    pass

class ProductType(ProductTypeBase):
    id: int
    
    class Config:
        from_attributes = True

class MaterialBase(BaseModel):
    material_name: str = Field(..., max_length=100)
    loss_percentage: float = Field(..., ge=0, le=100)

class MaterialCreate(MaterialBase):
    pass

class Material(MaterialBase):
    id: int
    
    class Config:
        from_attributes = True

class WorkshopBase(BaseModel):
    workshop_name: str = Field(..., max_length=100)
    worker_count: int = Field(..., gt=0)
    processing_time: int = Field(..., gt=0)

class WorkshopCreate(WorkshopBase):
    pass

class Workshop(WorkshopBase):
    id: int
    
    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    article: str = Field(..., max_length=50)
    product_type_id: int
    product_name: str = Field(..., max_length=200)
    min_partner_price: Decimal = Field(..., ge=0)
    main_material_id: int
    param1: float = Field(..., gt=0)
    param2: float = Field(..., gt=0)
    
    @validator('min_partner_price')
    def validate_price(cls, v):
        return round(v, 2)

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    product_type: Optional[ProductType] = None
    main_material: Optional[Material] = None
    
    class Config:
        from_attributes = True

class ProductionScheduleBase(BaseModel):
    product_id: int
    workshop_id: int
    processing_order: int = Field(..., gt=0)

class ProductionScheduleCreate(ProductionScheduleBase):
    pass

class ProductionSchedule(ProductionScheduleBase):
    id: int
    
    class Config:
        from_attributes = True

class ProductWithWorkshops(Product):
    workshops: List[Workshop] = []
    total_production_time: Optional[int] = None

class MaterialCalculationRequest(BaseModel):
    product_type_id: int
    material_type_id: int
    quantity: int = Field(..., gt=0)
    param1: float = Field(..., gt=0)
    param2: float = Field(..., gt=0)

class MaterialCalculationResponse(BaseModel):
    raw_material_needed: int
    calculation_details: dict