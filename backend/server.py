from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    full_name: str
    role: str  # "admin" or "kasir"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category_id: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    name: str
    category_id: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    available: bool = True

class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_number: str
    capacity: int
    status: str  # "available", "occupied", "reserved"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TableCreate(BaseModel):
    table_number: str
    capacity: int
    status: str = "available"

class OrderItem(BaseModel):
    menu_item_id: str
    menu_item_name: str
    quantity: int
    price: float
    subtotal: float
    notes: Optional[str] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    table_id: Optional[str] = None
    table_number: Optional[str] = None
    order_type: str  # "dine-in", "takeaway"
    items: List[OrderItem]
    subtotal: float
    tax: float
    total: float
    status: str  # "pending", "completed", "cancelled"
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class OrderCreate(BaseModel):
    table_id: Optional[str] = None
    table_number: Optional[str] = None
    order_type: str
    items: List[OrderItem]
    subtotal: float
    tax: float
    total: float

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_number: str
    order_id: str
    payment_method: str  # "cash", "debit", "credit"
    amount_paid: float
    change_amount: float
    total: float
    cashier: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    order_id: str
    payment_method: str
    amount_paid: float
    change_amount: float
    total: float

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_name: str
    address: str
    phone: str
    tax_percentage: float = 10.0
    logo_url: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    restaurant_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    tax_percentage: Optional[float] = None
    logo_url: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = await db.users.find_one({"username": username}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=User)
async def register(user_input: UserCreate):
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_input.username}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    user_dict = user_input.model_dump()
    password = user_dict.pop("password")
    hashed_password = get_password_hash(password)
    
    user_obj = User(**user_dict)
    doc = user_obj.model_dump()
    doc['hashed_password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login", response_model=Token)
async def login(user_input: UserLogin):
    user = await db.users.find_one({"username": user_input.username}, {"_id": 0})
    if not user or not verify_password(user_input.password, user['hashed_password']):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user['username']})
    
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    user_obj = User(**user)
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==================== CATEGORY ROUTES ====================

@api_router.post("/categories", response_model=Category)
async def create_category(category_input: CategoryCreate, current_user: User = Depends(get_admin_user)):
    category_obj = Category(**category_input.model_dump())
    doc = category_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.categories.insert_one(doc)
    return category_obj

@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: User = Depends(get_current_user)):
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    for cat in categories:
        if isinstance(cat['created_at'], str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    return categories

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_input: CategoryCreate, current_user: User = Depends(get_admin_user)):
    result = await db.categories.update_one(
        {"id": category_id},
        {"$set": category_input.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if isinstance(category['created_at'], str):
        category['created_at'] = datetime.fromisoformat(category['created_at'])
    return Category(**category)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: User = Depends(get_admin_user)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# ==================== MENU ITEM ROUTES ====================

@api_router.post("/menu-items", response_model=MenuItem)
async def create_menu_item(item_input: MenuItemCreate, current_user: User = Depends(get_admin_user)):
    item_obj = MenuItem(**item_input.model_dump())
    doc = item_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.menu_items.insert_one(doc)
    return item_obj

@api_router.get("/menu-items", response_model=List[MenuItem])
async def get_menu_items(current_user: User = Depends(get_current_user)):
    items = await db.menu_items.find({}, {"_id": 0}).to_list(1000)
    for item in items:
        if isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.put("/menu-items/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, item_input: MenuItemCreate, current_user: User = Depends(get_admin_user)):
    result = await db.menu_items.update_one(
        {"id": item_id},
        {"$set": item_input.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if isinstance(item['created_at'], str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    return MenuItem(**item)

@api_router.delete("/menu-items/{item_id}")
async def delete_menu_item(item_id: str, current_user: User = Depends(get_admin_user)):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted successfully"}

# ==================== TABLE ROUTES ====================

@api_router.post("/tables", response_model=Table)
async def create_table(table_input: TableCreate, current_user: User = Depends(get_admin_user)):
    table_obj = Table(**table_input.model_dump())
    doc = table_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.tables.insert_one(doc)
    return table_obj

@api_router.get("/tables", response_model=List[Table])
async def get_tables(current_user: User = Depends(get_current_user)):
    tables = await db.tables.find({}, {"_id": 0}).to_list(1000)
    for table in tables:
        if isinstance(table['created_at'], str):
            table['created_at'] = datetime.fromisoformat(table['created_at'])
    return tables

@api_router.put("/tables/{table_id}", response_model=Table)
async def update_table(table_id: str, table_input: TableCreate, current_user: User = Depends(get_current_user)):
    result = await db.tables.update_one(
        {"id": table_id},
        {"$set": table_input.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if isinstance(table['created_at'], str):
        table['created_at'] = datetime.fromisoformat(table['created_at'])
    return Table(**table)

@api_router.delete("/tables/{table_id}")
async def delete_table(table_id: str, current_user: User = Depends(get_admin_user)):
    result = await db.tables.delete_one({"id": table_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted successfully"}

# ==================== ORDER ROUTES ====================

@api_router.post("/orders", response_model=Order)
async def create_order(order_input: OrderCreate, current_user: User = Depends(get_current_user)):
    # Generate order number
    order_count = await db.orders.count_documents({})
    order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{order_count + 1:04d}"
    
    order_dict = order_input.model_dump()
    order_dict['order_number'] = order_number
    order_dict['status'] = 'pending'
    order_dict['created_by'] = current_user.username
    
    order_obj = Order(**order_dict)
    doc = order_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    # Update table status if dine-in
    if order_input.table_id:
        await db.tables.update_one(
            {"id": order_input.table_id},
            {"$set": {"status": "occupied"}}
        )
    
    await db.orders.insert_one(doc)
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_orders(status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if status:
        query['status'] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for order in orders:
        if isinstance(order['created_at'], str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if order.get('completed_at') and isinstance(order['completed_at'], str):
            order['completed_at'] = datetime.fromisoformat(order['completed_at'])
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if isinstance(order['created_at'], str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    if order.get('completed_at') and isinstance(order['completed_at'], str):
        order['completed_at'] = datetime.fromisoformat(order['completed_at'])
    
    return Order(**order)

@api_router.put("/orders/{order_id}/complete")
async def complete_order(order_id: str, current_user: User = Depends(get_current_user)):
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order completed successfully"}

# ==================== TRANSACTION ROUTES ====================

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_input: TransactionCreate, current_user: User = Depends(get_current_user)):
    # Generate transaction number
    trans_count = await db.transactions.count_documents({})
    transaction_number = f"TRX-{datetime.now().strftime('%Y%m%d')}-{trans_count + 1:04d}"
    
    transaction_dict = transaction_input.model_dump()
    transaction_dict['transaction_number'] = transaction_number
    transaction_dict['cashier'] = current_user.full_name
    
    transaction_obj = Transaction(**transaction_dict)
    doc = transaction_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    # Complete the order
    await db.orders.update_one(
        {"id": transaction_input.order_id},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Free up table if dine-in
    order = await db.orders.find_one({"id": transaction_input.order_id}, {"_id": 0})
    if order and order.get('table_id'):
        await db.tables.update_one(
            {"id": order['table_id']},
            {"$set": {"status": "available"}}
        )
    
    await db.transactions.insert_one(doc)
    return transaction_obj

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for trans in transactions:
        if isinstance(trans['created_at'], str):
            trans['created_at'] = datetime.fromisoformat(trans['created_at'])
    return transactions

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str, current_user: User = Depends(get_current_user)):
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if isinstance(transaction['created_at'], str):
        transaction['created_at'] = datetime.fromisoformat(transaction['created_at'])
    
    return Transaction(**transaction)

# ==================== SETTINGS ROUTES ====================

@api_router.get("/settings", response_model=Settings)
async def get_settings():
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = Settings(
            restaurant_name="Restoran Saya",
            address="Jl. Contoh No. 123, Jakarta",
            phone="021-12345678",
            tax_percentage=10.0
        )
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        return default_settings
    
    if isinstance(settings['updated_at'], str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    
    return Settings(**settings)

@api_router.put("/settings", response_model=Settings)
async def update_settings(settings_input: SettingsUpdate, current_user: User = Depends(get_admin_user)):
    update_data = {k: v for k, v in settings_input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one({}, {"$set": update_data}, upsert=True)
    
    settings = await db.settings.find_one({}, {"_id": 0})
    if isinstance(settings['updated_at'], str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    
    return Settings(**settings)

# ==================== DASHBOARD/REPORTS ROUTES ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Get today's date range
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_iso = today.isoformat()
    
    # Total revenue today
    transactions_today = await db.transactions.find({
        "created_at": {"$gte": today_iso}
    }, {"_id": 0}).to_list(10000)
    
    total_revenue_today = sum(t['total'] for t in transactions_today)
    
    # Total transactions today
    total_transactions_today = len(transactions_today)
    
    # Pending orders
    pending_orders = await db.orders.count_documents({"status": "pending"})
    
    # Total menu items
    total_menu_items = await db.menu_items.count_documents({})
    
    # Get all transactions for revenue chart (last 7 days)
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_transactions = await db.transactions.find({
        "created_at": {"$gte": seven_days_ago}
    }, {"_id": 0}).to_list(10000)
    
    # Group by date
    daily_revenue = {}
    for t in recent_transactions:
        date_str = t['created_at'][:10]  # Get YYYY-MM-DD
        daily_revenue[date_str] = daily_revenue.get(date_str, 0) + t['total']
    
    revenue_chart = [{"date": k, "revenue": v} for k, v in sorted(daily_revenue.items())]
    
    # Top selling items
    all_orders = await db.orders.find({"status": "completed"}, {"_id": 0}).to_list(10000)
    item_sales = {}
    for order in all_orders:
        for item in order['items']:
            key = item['menu_item_name']
            if key not in item_sales:
                item_sales[key] = {'name': key, 'quantity': 0, 'revenue': 0}
            item_sales[key]['quantity'] += item['quantity']
            item_sales[key]['revenue'] += item['subtotal']
    
    top_items = sorted(item_sales.values(), key=lambda x: x['quantity'], reverse=True)[:5]
    
    return {
        "total_revenue_today": total_revenue_today,
        "total_transactions_today": total_transactions_today,
        "pending_orders": pending_orders,
        "total_menu_items": total_menu_items,
        "revenue_chart": revenue_chart,
        "top_selling_items": top_items
    }

# ==================== REPORTS ROUTES ====================

@api_router.get("/reports/daily")
async def get_daily_report(date: str, current_user: User = Depends(get_current_user)):
    """
    Get daily report for a specific date
    date format: YYYY-MM-DD
    """
    try:
        target_date = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Start and end of the day
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    # Previous day for comparison
    prev_start = start_of_day - timedelta(days=1)
    prev_end = start_of_day
    
    # Get transactions for the day
    transactions = await db.transactions.find({
        "created_at": {
            "$gte": start_of_day.isoformat(),
            "$lt": end_of_day.isoformat()
        }
    }, {"_id": 0}).to_list(10000)
    
    # Get previous day transactions
    prev_transactions = await db.transactions.find({
        "created_at": {
            "$gte": prev_start.isoformat(),
            "$lt": prev_end.isoformat()
        }
    }, {"_id": 0}).to_list(10000)
    
    # Calculate metrics
    total_revenue = sum(t['total'] for t in transactions)
    total_transactions = len(transactions)
    avg_transaction = total_revenue / total_transactions if total_transactions > 0 else 0
    
    prev_revenue = sum(t['total'] for t in prev_transactions)
    prev_count = len(prev_transactions)
    
    revenue_growth = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    transaction_growth = ((total_transactions - prev_count) / prev_count * 100) if prev_count > 0 else 0
    
    # Payment method breakdown
    payment_methods = {}
    for t in transactions:
        method = t['payment_method']
        payment_methods[method] = payment_methods.get(method, 0) + t['total']
    
    payment_breakdown = [{"method": k, "amount": v} for k, v in payment_methods.items()]
    
    # Get orders for the day
    orders = await db.orders.find({
        "created_at": {
            "$gte": start_of_day.isoformat(),
            "$lt": end_of_day.isoformat()
        },
        "status": "completed"
    }, {"_id": 0}).to_list(10000)
    
    # Top selling items
    item_sales = {}
    order_type_count = {"dine-in": 0, "takeaway": 0}
    
    for order in orders:
        order_type_count[order['order_type']] = order_type_count.get(order['order_type'], 0) + 1
        for item in order['items']:
            key = item['menu_item_name']
            if key not in item_sales:
                item_sales[key] = {'name': key, 'quantity': 0, 'revenue': 0}
            item_sales[key]['quantity'] += item['quantity']
            item_sales[key]['revenue'] += item['subtotal']
    
    top_items = sorted(item_sales.values(), key=lambda x: x['quantity'], reverse=True)[:10]
    
    return {
        "date": date,
        "total_revenue": total_revenue,
        "total_transactions": total_transactions,
        "average_transaction": avg_transaction,
        "revenue_growth": revenue_growth,
        "transaction_growth": transaction_growth,
        "payment_breakdown": payment_breakdown,
        "order_type_breakdown": [{"type": k, "count": v} for k, v in order_type_count.items()],
        "top_selling_items": top_items
    }

@api_router.get("/reports/weekly")
async def get_weekly_report(start_date: str, current_user: User = Depends(get_current_user)):
    """
    Get weekly report starting from start_date
    start_date format: YYYY-MM-DD (Monday of the week)
    """
    try:
        week_start = datetime.fromisoformat(start_date).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    week_end = week_start + timedelta(days=7)
    
    # Previous week for comparison
    prev_week_start = week_start - timedelta(days=7)
    prev_week_end = week_start
    
    # Get transactions for the week
    transactions = await db.transactions.find({
        "created_at": {
            "$gte": week_start.isoformat(),
            "$lt": week_end.isoformat()
        }
    }, {"_id": 0}).to_list(10000)
    
    # Get previous week transactions
    prev_transactions = await db.transactions.find({
        "created_at": {
            "$gte": prev_week_start.isoformat(),
            "$lt": prev_week_end.isoformat()
        }
    }, {"_id": 0}).to_list(10000)
    
    # Calculate metrics
    total_revenue = sum(t['total'] for t in transactions)
    total_transactions = len(transactions)
    avg_transaction = total_revenue / total_transactions if total_transactions > 0 else 0
    
    prev_revenue = sum(t['total'] for t in prev_transactions)
    prev_count = len(prev_transactions)
    
    revenue_growth = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    transaction_growth = ((total_transactions - prev_count) / prev_count * 100) if prev_count > 0 else 0
    
    # Daily breakdown
    daily_data = {}
    for t in transactions:
        date_str = t['created_at'][:10]
        if date_str not in daily_data:
            daily_data[date_str] = {"revenue": 0, "transactions": 0}
        daily_data[date_str]["revenue"] += t['total']
        daily_data[date_str]["transactions"] += 1
    
    daily_breakdown = [{"date": k, "revenue": v["revenue"], "transactions": v["transactions"]} 
                       for k, v in sorted(daily_data.items())]
    
    # Payment method breakdown
    payment_methods = {}
    for t in transactions:
        method = t['payment_method']
        payment_methods[method] = payment_methods.get(method, 0) + t['total']
    
    payment_breakdown = [{"method": k, "amount": v} for k, v in payment_methods.items()]
    
    # Get orders for the week
    orders = await db.orders.find({
        "created_at": {
            "$gte": week_start.isoformat(),
            "$lt": week_end.isoformat()
        },
        "status": "completed"
    }, {"_id": 0}).to_list(10000)
    
    # Top selling items
    item_sales = {}
    order_type_count = {"dine-in": 0, "takeaway": 0}
    
    for order in orders:
        order_type_count[order['order_type']] = order_type_count.get(order['order_type'], 0) + 1
        for item in order['items']:
            key = item['menu_item_name']
            if key not in item_sales:
                item_sales[key] = {'name': key, 'quantity': 0, 'revenue': 0}
            item_sales[key]['quantity'] += item['quantity']
            item_sales[key]['revenue'] += item['subtotal']
    
    top_items = sorted(item_sales.values(), key=lambda x: x['quantity'], reverse=True)[:10]
    
    return {
        "start_date": start_date,
        "end_date": week_end.date().isoformat(),
        "total_revenue": total_revenue,
        "total_transactions": total_transactions,
        "average_transaction": avg_transaction,
        "revenue_growth": revenue_growth,
        "transaction_growth": transaction_growth,
        "daily_breakdown": daily_breakdown,
        "payment_breakdown": payment_breakdown,
        "order_type_breakdown": [{"type": k, "count": v} for k, v in order_type_count.items()],
        "top_selling_items": top_items
    }

@api_router.get("/reports/monthly")
async def get_monthly_report(year: int, month: int, current_user: User = Depends(get_current_user)):
    """
    Get monthly report for a specific year and month
    year: YYYY (e.g., 2025)
    month: 1-12
    """
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    
    # Start and end of the month
    month_start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        month_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        month_end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    
    # Previous month for comparison
    if month == 1:
        prev_month_start = datetime(year - 1, 12, 1, tzinfo=timezone.utc)
        prev_month_end = month_start
    else:
        prev_month_start = datetime(year, month - 1, 1, tzinfo=timezone.utc)
        prev_month_end = month_start
    
    # Get transactions for the month
    transactions = await db.transactions.find({
        "created_at": {
            "$gte": month_start.isoformat(),
            "$lt": month_end.isoformat()
        }
    }, {"_id": 0}).to_list(10000)
    
    # Get previous month transactions
    prev_transactions = await db.transactions.find({
        "created_at": {
            "$gte": prev_month_start.isoformat(),
            "$lt": prev_month_end.isoformat()
        }
    }, {"_id": 0}).to_list(10000)
    
    # Calculate metrics
    total_revenue = sum(t['total'] for t in transactions)
    total_transactions = len(transactions)
    avg_transaction = total_revenue / total_transactions if total_transactions > 0 else 0
    
    prev_revenue = sum(t['total'] for t in prev_transactions)
    prev_count = len(prev_transactions)
    
    revenue_growth = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    transaction_growth = ((total_transactions - prev_count) / prev_count * 100) if prev_count > 0 else 0
    
    # Daily breakdown
    daily_data = {}
    for t in transactions:
        date_str = t['created_at'][:10]
        if date_str not in daily_data:
            daily_data[date_str] = {"revenue": 0, "transactions": 0}
        daily_data[date_str]["revenue"] += t['total']
        daily_data[date_str]["transactions"] += 1
    
    daily_breakdown = [{"date": k, "revenue": v["revenue"], "transactions": v["transactions"]} 
                       for k, v in sorted(daily_data.items())]
    
    # Weekly breakdown
    weekly_data = {}
    for t in transactions:
        trans_date = datetime.fromisoformat(t['created_at'])
        # Get the week number
        week_num = trans_date.isocalendar()[1]
        week_key = f"Week {week_num}"
        if week_key not in weekly_data:
            weekly_data[week_key] = {"revenue": 0, "transactions": 0}
        weekly_data[week_key]["revenue"] += t['total']
        weekly_data[week_key]["transactions"] += 1
    
    weekly_breakdown = [{"week": k, "revenue": v["revenue"], "transactions": v["transactions"]} 
                        for k, v in sorted(weekly_data.items())]
    
    # Payment method breakdown
    payment_methods = {}
    for t in transactions:
        method = t['payment_method']
        payment_methods[method] = payment_methods.get(method, 0) + t['total']
    
    payment_breakdown = [{"method": k, "amount": v} for k, v in payment_methods.items()]
    
    # Get orders for the month
    orders = await db.orders.find({
        "created_at": {
            "$gte": month_start.isoformat(),
            "$lt": month_end.isoformat()
        },
        "status": "completed"
    }, {"_id": 0}).to_list(10000)
    
    # Top selling items
    item_sales = {}
    order_type_count = {"dine-in": 0, "takeaway": 0}
    
    for order in orders:
        order_type_count[order['order_type']] = order_type_count.get(order['order_type'], 0) + 1
        for item in order['items']:
            key = item['menu_item_name']
            if key not in item_sales:
                item_sales[key] = {'name': key, 'quantity': 0, 'revenue': 0}
            item_sales[key]['quantity'] += item['quantity']
            item_sales[key]['revenue'] += item['subtotal']
    
    top_items = sorted(item_sales.values(), key=lambda x: x['quantity'], reverse=True)[:10]
    
    return {
        "year": year,
        "month": month,
        "month_name": month_start.strftime("%B"),
        "total_revenue": total_revenue,
        "total_transactions": total_transactions,
        "average_transaction": avg_transaction,
        "revenue_growth": revenue_growth,
        "transaction_growth": transaction_growth,
        "daily_breakdown": daily_breakdown,
        "weekly_breakdown": weekly_breakdown,
        "payment_breakdown": payment_breakdown,
        "order_type_breakdown": [{"type": k, "count": v} for k, v in order_type_count.items()],
        "top_selling_items": top_items
    }

# ==================== USER MANAGEMENT ROUTES ====================

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(1000)
    for user in users:
        if isinstance(user['created_at'], str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_admin_user)):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

# Include router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()