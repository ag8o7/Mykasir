#!/usr/bin/env python3
"""
Seed script untuk membuat data awal
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from pymongo import MongoClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Connect to MongoDB
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "kasir_restoran"

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

def seed_admin_user():
    """Create default admin user"""
    existing = db.users.find_one({"username": "admin"})
    if existing:
        print("✓ Admin user already exists")
        return
    
    admin_user = {
        "id": str(uuid.uuid4()),
        "username": "admin",
        "full_name": "Administrator",
        "role": "admin",
        "hashed_password": pwd_context.hash("admin123"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.users.insert_one(admin_user)
    print("✓ Admin user created (username: admin, password: admin123)")

def seed_kasir_user():
    """Create default kasir user"""
    existing = db.users.find_one({"username": "kasir1"})
    if existing:
        print("✓ Kasir user already exists")
        return
    
    kasir_user = {
        "id": str(uuid.uuid4()),
        "username": "kasir1",
        "full_name": "Kasir Satu",
        "role": "kasir",
        "hashed_password": pwd_context.hash("kasir123"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.users.insert_one(kasir_user)
    print("✓ Kasir user created (username: kasir1, password: kasir123)")

def seed_categories():
    """Create sample categories"""
    if db.categories.count_documents({}) > 0:
        print("✓ Categories already exist")
        return
    
    categories = [
        {"id": str(uuid.uuid4()), "name": "Makanan", "description": "Aneka makanan", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Minuman", "description": "Aneka minuman", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Dessert", "description": "Makanan penutup", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    db.categories.insert_many(categories)
    print(f"✓ Created {len(categories)} categories")
    return categories

def seed_menu_items(categories):
    """Create sample menu items"""
    if db.menu_items.count_documents({}) > 0:
        print("✓ Menu items already exist")
        return
    
    makanan_id = next((c["id"] for c in categories if c["name"] == "Makanan"), None)
    minuman_id = next((c["id"] for c in categories if c["name"] == "Minuman"), None)
    dessert_id = next((c["id"] for c in categories if c["name"] == "Dessert"), None)
    
    menu_items = [
        {"id": str(uuid.uuid4()), "name": "Nasi Goreng", "category_id": makanan_id, "price": 25000, "description": "Nasi goreng spesial", "available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Mie Goreng", "category_id": makanan_id, "price": 20000, "description": "Mie goreng pedas", "available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Soto Ayam", "category_id": makanan_id, "price": 22000, "description": "Soto ayam kuning", "available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Ayam Goreng", "category_id": makanan_id, "price": 28000, "description": "Ayam goreng crispy", "available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Gado-gado", "category_id": makanan_id, "price": 18000, "description": "Gado-gado sayur", "available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        
        {"id": str(uuid.uuid4()), "name": "Es Teh Manis", "category_id": minuman_id, "price": 5000, "description": "Teh manis dingin", "available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Es Jeruk", "category_id": minuman_id, "price": 8000, "description": "Jeruk peras segar", "available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Jus Alpukat", "category_id": minuman_id, "price": 15000, "description": "Jus alpukat kental", "available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Kopi Hitam", "category_id": minuman_id, "price": 10000, "description": "Kopi hitam panas", "available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        
        {"id": str(uuid.uuid4()), "name": "Es Krim", "category_id": dessert_id, "price": 12000, "description": "Es krim vanilla", "available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Puding", "category_id": dessert_id, "price": 10000, "description": "Puding coklat", "available": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    db.menu_items.insert_many(menu_items)
    print(f"✓ Created {len(menu_items)} menu items")

def seed_tables():
    """Create sample tables"""
    if db.tables.count_documents({}) > 0:
        print("✓ Tables already exist")
        return
    
    tables = []
    for i in range(1, 11):
        tables.append({
            "id": str(uuid.uuid4()),
            "table_number": str(i),
            "capacity": 4 if i <= 6 else (6 if i <= 9 else 8),
            "status": "available",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    db.tables.insert_many(tables)
    print(f"✓ Created {len(tables)} tables")

def seed_settings():
    """Create default settings"""
    if db.settings.count_documents({}) > 0:
        print("✓ Settings already exist")
        return
    
    settings = {
        "id": str(uuid.uuid4()),
        "restaurant_name": "Restoran Nusantara",
        "address": "Jl. Merdeka No. 123, Jakarta",
        "phone": "021-12345678",
        "tax_percentage": 10.0,
        "logo_url": "",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    db.settings.insert_one(settings)
    print("✓ Created default settings")

def main():
    print("🌱 Starting seed data...")
    print("")
    
    seed_admin_user()
    seed_kasir_user()
    categories = seed_categories()
    if categories:
        seed_menu_items(categories)
    else:
        # Fetch existing categories
        categories = list(db.categories.find({}, {"_id": 0}))
        seed_menu_items(categories)
    seed_tables()
    seed_settings()
    
    print("")
    print("✅ Seed data completed successfully!")
    print("")
    print("Default logins:")
    print("  Admin: username=admin, password=admin123")
    print("  Kasir: username=kasir1, password=kasir123")
    
    client.close()

if __name__ == "__main__":
    main()
