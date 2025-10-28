import requests
import sys
import json
from datetime import datetime

class RestaurantPOSAPITester:
    def __init__(self, base_url="https://kembangkan-dev.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.kasir_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, message="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "message": message,
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}: {message}")
        return success

    def run_api_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            message = f"Status: {response.status_code} (expected {expected_status})"
            
            response_data = None
            try:
                response_data = response.json()
            except:
                response_data = response.text

            return self.log_test(name, success, message, response_data), response_data

        except Exception as e:
            return self.log_test(name, False, f"Error: {str(e)}"), {}

    def test_auth_login(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test admin login
        success, response = self.run_api_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.log_test("Admin Token Retrieved", True, "Token stored successfully")
        else:
            self.log_test("Admin Token Retrieved", False, "Failed to get admin token")

        # Test kasir login
        success, response = self.run_api_test(
            "Kasir Login",
            "POST",
            "auth/login",
            200,
            data={"username": "kasir1", "password": "kasir123"}
        )
        if success and 'access_token' in response:
            self.kasir_token = response['access_token']
            self.log_test("Kasir Token Retrieved", True, "Token stored successfully")
        else:
            self.log_test("Kasir Token Retrieved", False, "Failed to get kasir token")

        # Test invalid login
        self.run_api_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"username": "invalid", "password": "invalid"}
        )

    def test_categories(self):
        """Test category management"""
        print("\n📂 Testing Categories...")
        
        if not self.admin_token:
            self.log_test("Categories Test", False, "No admin token available")
            return

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get categories
        success, categories = self.run_api_test(
            "Get Categories",
            "GET",
            "categories",
            200,
            headers=headers
        )

        # Create category
        success, new_category = self.run_api_test(
            "Create Category",
            "POST",
            "categories",
            200,
            data={"name": "Test Category", "description": "Test description"},
            headers=headers
        )

        category_id = None
        if success and isinstance(new_category, dict) and 'id' in new_category:
            category_id = new_category['id']

        # Update category
        if category_id:
            self.run_api_test(
                "Update Category",
                "PUT",
                f"categories/{category_id}",
                200,
                data={"name": "Updated Category", "description": "Updated description"},
                headers=headers
            )

        # Delete category
        if category_id:
            self.run_api_test(
                "Delete Category",
                "DELETE",
                f"categories/{category_id}",
                200,
                headers=headers
            )

    def test_menu_items(self):
        """Test menu item management"""
        print("\n🍽️ Testing Menu Items...")
        
        if not self.admin_token:
            self.log_test("Menu Items Test", False, "No admin token available")
            return

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get menu items
        success, items = self.run_api_test(
            "Get Menu Items",
            "GET",
            "menu-items",
            200,
            headers=headers
        )

        # Get categories first for creating menu item
        success, categories = self.run_api_test(
            "Get Categories for Menu Item",
            "GET",
            "categories",
            200,
            headers=headers
        )

        category_id = None
        if success and isinstance(categories, list) and len(categories) > 0:
            category_id = categories[0]['id']

        if category_id:
            # Create menu item
            success, new_item = self.run_api_test(
                "Create Menu Item",
                "POST",
                "menu-items",
                200,
                data={
                    "name": "Test Menu Item",
                    "category_id": category_id,
                    "price": 25000,
                    "description": "Test menu item",
                    "available": True
                },
                headers=headers
            )

            item_id = None
            if success and isinstance(new_item, dict) and 'id' in new_item:
                item_id = new_item['id']

            # Update menu item
            if item_id:
                self.run_api_test(
                    "Update Menu Item",
                    "PUT",
                    f"menu-items/{item_id}",
                    200,
                    data={
                        "name": "Updated Menu Item",
                        "category_id": category_id,
                        "price": 30000,
                        "description": "Updated description",
                        "available": True
                    },
                    headers=headers
                )

            # Delete menu item
            if item_id:
                self.run_api_test(
                    "Delete Menu Item",
                    "DELETE",
                    f"menu-items/{item_id}",
                    200,
                    headers=headers
                )

    def test_tables(self):
        """Test table management"""
        print("\n🪑 Testing Tables...")
        
        if not self.admin_token:
            self.log_test("Tables Test", False, "No admin token available")
            return

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get tables
        success, tables = self.run_api_test(
            "Get Tables",
            "GET",
            "tables",
            200,
            headers=headers
        )

        # Create table
        success, new_table = self.run_api_test(
            "Create Table",
            "POST",
            "tables",
            200,
            data={
                "table_number": "TEST-1",
                "capacity": 4,
                "status": "available"
            },
            headers=headers
        )

        table_id = None
        if success and isinstance(new_table, dict) and 'id' in new_table:
            table_id = new_table['id']

        # Update table
        if table_id:
            self.run_api_test(
                "Update Table",
                "PUT",
                f"tables/{table_id}",
                200,
                data={
                    "table_number": "TEST-1-UPDATED",
                    "capacity": 6,
                    "status": "available"
                },
                headers=headers
            )

        # Delete table
        if table_id:
            self.run_api_test(
                "Delete Table",
                "DELETE",
                f"tables/{table_id}",
                200,
                headers=headers
            )

    def test_orders_and_transactions(self):
        """Test order and transaction flow"""
        print("\n🛒 Testing Orders & Transactions...")
        
        if not self.kasir_token:
            self.log_test("Orders Test", False, "No kasir token available")
            return

        headers = {'Authorization': f'Bearer {self.kasir_token}'}
        
        # Get menu items and tables for order creation
        success, items = self.run_api_test(
            "Get Menu Items for Order",
            "GET",
            "menu-items",
            200,
            headers=headers
        )

        success, tables = self.run_api_test(
            "Get Tables for Order",
            "GET",
            "tables",
            200,
            headers=headers
        )

        if not (isinstance(items, list) and len(items) > 0):
            self.log_test("Orders Test", False, "No menu items available for testing")
            return

        if not (isinstance(tables, list) and len(tables) > 0):
            self.log_test("Orders Test", False, "No tables available for testing")
            return

        # Create order
        menu_item = items[0]
        table = tables[0]
        
        order_items = [{
            "menu_item_id": menu_item['id'],
            "menu_item_name": menu_item['name'],
            "quantity": 2,
            "price": menu_item['price'],
            "subtotal": menu_item['price'] * 2,
            "notes": "Test order"
        }]

        subtotal = menu_item['price'] * 2
        tax = subtotal * 0.1  # 10% tax
        total = subtotal + tax

        success, new_order = self.run_api_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data={
                "table_id": table['id'],
                "table_number": table['table_number'],
                "order_type": "dine-in",
                "items": order_items,
                "subtotal": subtotal,
                "tax": tax,
                "total": total
            },
            headers=headers
        )

        order_id = None
        if success and isinstance(new_order, dict) and 'id' in new_order:
            order_id = new_order['id']

        # Get orders
        self.run_api_test(
            "Get Orders",
            "GET",
            "orders",
            200,
            headers=headers
        )

        # Create transaction
        if order_id:
            success, transaction = self.run_api_test(
                "Create Transaction",
                "POST",
                "transactions",
                200,
                data={
                    "order_id": order_id,
                    "payment_method": "cash",
                    "amount_paid": total + 5000,  # Pay more than total
                    "change_amount": 5000,
                    "total": total
                },
                headers=headers
            )

        # Get transactions
        self.run_api_test(
            "Get Transactions",
            "GET",
            "transactions",
            200,
            headers=headers
        )

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard Stats...")
        
        if not self.admin_token:
            self.log_test("Dashboard Stats Test", False, "No admin token available")
            return

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        success, stats = self.run_api_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200,
            headers=headers
        )

        if success and isinstance(stats, dict):
            required_fields = [
                'total_revenue_today', 'total_transactions_today', 
                'pending_orders', 'total_menu_items', 
                'revenue_chart', 'top_selling_items'
            ]
            
            missing_fields = [field for field in required_fields if field not in stats]
            if missing_fields:
                self.log_test("Dashboard Stats Fields", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Dashboard Stats Fields", True, "All required fields present")

    def test_settings(self):
        """Test settings management"""
        print("\n⚙️ Testing Settings...")
        
        if not self.admin_token:
            self.log_test("Settings Test", False, "No admin token available")
            return

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get settings
        success, settings = self.run_api_test(
            "Get Settings",
            "GET",
            "settings",
            200,
            headers=headers
        )

        # Update settings
        self.run_api_test(
            "Update Settings",
            "PUT",
            "settings",
            200,
            data={
                "restaurant_name": "Test Restaurant Updated",
                "address": "Test Address Updated",
                "phone": "021-87654321",
                "tax_percentage": 12.5
            },
            headers=headers
        )

    def test_user_management(self):
        """Test user management"""
        print("\n👥 Testing User Management...")
        
        if not self.admin_token:
            self.log_test("User Management Test", False, "No admin token available")
            return

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get users
        success, users = self.run_api_test(
            "Get Users",
            "GET",
            "users",
            200,
            headers=headers
        )

        # Create user
        test_username = f"testuser_{datetime.now().strftime('%H%M%S')}"
        success, new_user = self.run_api_test(
            "Create User",
            "POST",
            "auth/register",
            200,
            data={
                "username": test_username,
                "password": "testpass123",
                "full_name": "Test User",
                "role": "kasir"
            },
            headers=headers
        )

        user_id = None
        if success and isinstance(new_user, dict) and 'id' in new_user:
            user_id = new_user['id']

        # Delete user
        if user_id:
            self.run_api_test(
                "Delete User",
                "DELETE",
                f"users/{user_id}",
                200,
                headers=headers
            )

    def test_reports_endpoints(self):
        """Test reporting API endpoints"""
        print("\n📈 Testing Reports Endpoints...")
        
        if not self.admin_token:
            self.log_test("Reports Test", False, "No admin token available")
            return

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test authentication requirement - should fail without token
        success, response = self.run_api_test(
            "Daily Report - No Auth",
            "GET",
            "reports/daily?date=2025-01-28",
            401,
            headers={}
        )
        
        # Test daily report with today's date
        today = datetime.now().strftime('%Y-%m-%d')
        success, daily_report = self.run_api_test(
            "Daily Report - Today",
            "GET",
            f"reports/daily?date={today}",
            200,
            headers=headers
        )
        
        if success and isinstance(daily_report, dict):
            required_fields = [
                'date', 'total_revenue', 'total_transactions', 'average_transaction',
                'revenue_growth', 'transaction_growth', 'payment_breakdown', 
                'order_type_breakdown', 'top_selling_items'
            ]
            missing_fields = [field for field in required_fields if field not in daily_report]
            if missing_fields:
                self.log_test("Daily Report Fields", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Daily Report Fields", True, "All required fields present")
        
        # Test daily report with past date
        past_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        success, past_daily = self.run_api_test(
            "Daily Report - Past Date",
            "GET",
            f"reports/daily?date={past_date}",
            200,
            headers=headers
        )
        
        # Test daily report with invalid date format
        success, invalid_daily = self.run_api_test(
            "Daily Report - Invalid Date",
            "GET",
            "reports/daily?date=invalid-date",
            400,
            headers=headers
        )
        
        # Test weekly report with current week (Monday)
        # Get Monday of current week
        today = datetime.now()
        monday = today - timedelta(days=today.weekday())
        monday_str = monday.strftime('%Y-%m-%d')
        
        success, weekly_report = self.run_api_test(
            "Weekly Report - Current Week",
            "GET",
            f"reports/weekly?start_date={monday_str}",
            200,
            headers=headers
        )
        
        if success and isinstance(weekly_report, dict):
            required_fields = [
                'start_date', 'end_date', 'total_revenue', 'total_transactions',
                'average_transaction', 'revenue_growth', 'transaction_growth',
                'daily_breakdown', 'payment_breakdown', 'order_type_breakdown', 'top_selling_items'
            ]
            missing_fields = [field for field in required_fields if field not in weekly_report]
            if missing_fields:
                self.log_test("Weekly Report Fields", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Weekly Report Fields", True, "All required fields present")
        
        # Test weekly report with invalid date
        success, invalid_weekly = self.run_api_test(
            "Weekly Report - Invalid Date",
            "GET",
            "reports/weekly?start_date=invalid-date",
            400,
            headers=headers
        )
        
        # Test monthly report with current month
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        success, monthly_report = self.run_api_test(
            "Monthly Report - Current Month",
            "GET",
            f"reports/monthly?year={current_year}&month={current_month}",
            200,
            headers=headers
        )
        
        if success and isinstance(monthly_report, dict):
            required_fields = [
                'year', 'month', 'month_name', 'total_revenue', 'total_transactions',
                'average_transaction', 'revenue_growth', 'transaction_growth',
                'daily_breakdown', 'weekly_breakdown', 'payment_breakdown', 
                'order_type_breakdown', 'top_selling_items'
            ]
            missing_fields = [field for field in required_fields if field not in monthly_report]
            if missing_fields:
                self.log_test("Monthly Report Fields", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Monthly Report Fields", True, "All required fields present")
        
        # Test monthly report with invalid month
        success, invalid_monthly = self.run_api_test(
            "Monthly Report - Invalid Month",
            "GET",
            f"reports/monthly?year={current_year}&month=13",
            400,
            headers=headers
        )
        
        # Test monthly report with invalid year (missing month)
        success, missing_month = self.run_api_test(
            "Monthly Report - Missing Month",
            "GET",
            f"reports/monthly?year={current_year}",
            422,  # FastAPI validation error
            headers=headers
        )
        
        # Test kasir access to reports (should work)
        if self.kasir_token:
            kasir_headers = {'Authorization': f'Bearer {self.kasir_token}'}
            success, kasir_daily = self.run_api_test(
                "Daily Report - Kasir Access",
                "GET",
                f"reports/daily?date={today}",
                200,
                headers=kasir_headers
            )

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Restaurant POS API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Run tests in order
        self.test_auth_login()
        self.test_categories()
        self.test_menu_items()
        self.test_tables()
        self.test_orders_and_transactions()
        self.test_dashboard_stats()
        self.test_settings()
        self.test_user_management()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RestaurantPOSAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'tests_run': tester.tests_run,
                'tests_passed': tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0
            },
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())