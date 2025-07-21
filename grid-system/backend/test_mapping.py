#!/usr/bin/env python3
"""
Test Mapping - Kiểm tra mapping khu với collection
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.data_service import DataService
from database.mongodb import MongoDBClient
from config import config

def test_mapping():
    """Test mapping khu với collection"""
    print("🔍 Testing Khu -> Collection Mapping")
    print("=" * 50)
    
    # Khởi tạo DataService
    mongo_client = MongoDBClient(config.mongodb_url, config.database_name)
    data_service = DataService(mongo_client)
    
    # Test các khu
    test_khus = ["SupplyAndDemand", "Supply", "Demand"]
    
    for khu in test_khus:
        print(f"\n📋 Testing khu: '{khu}'")
        print(f"   khu.lower() = '{khu.lower()}'")
        print(f"   Available keys: {list(data_service.collections.keys())}")
        
        # Test mapping
        khu_lower = khu.lower()
        collection = data_service.collections.get(khu_lower)
        print(f"   Collection found: '{collection}'")
        
        if collection:
            # Test query
            try:
                data = data_service.get_task_data(khu)
                print(f"   ✅ Success: {len(data)} records")
            except Exception as e:
                print(f"   ❌ Error: {e}")
        else:
            print(f"   ❌ No mapping found for '{khu_lower}'")

if __name__ == "__main__":
    test_mapping() 