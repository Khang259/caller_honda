#!/usr/bin/env python3
"""
Test MongoDB Connection và Collections
Kiểm tra kết nối và dữ liệu trong MongoDB
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.mongodb import MongoDBClient
from config import config
import json

def test_mongodb_connection():
    """Test kết nối MongoDB"""
    print("🔍 Testing MongoDB Connection...")
    print(f"📋 Config: {config.mongodb_url} | DB: {config.database_name}")
    
    try:
        # Test connection
        mongo_client = MongoDBClient(config.mongodb_url, config.database_name)
        mongo_client.client.admin.command('ping')
        print("✅ MongoDB connection successful!")
        
        # Test database access
        db = mongo_client.db
        print(f"✅ Database '{db.name}' accessible")
        
        # List collections
        collections = db.list_collection_names()
        print(f"📚 Available collections: {collections}")
        
        return mongo_client
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return None

def test_task_collections(mongo_client):
    """Test task collections"""
    print("\n🔍 Testing Task Collections...")
    
    collections = {
        "task_path_supply_demand": "SupplyAndDemand",
        "task_path_supply": "Supply", 
        "task_path_demand": "Demand"
    }
    
    for collection_name, khu in collections.items():
        try:
            collection = mongo_client.get_collection(collection_name)
            count = collection.count_documents({})
            print(f"📊 {collection_name} ({khu}): {count} documents")
            
            if count > 0:
                # Show sample data
                sample = collection.find_one()
                if sample:
                    sample_clean = mongo_client.convert_objectid_to_str(sample)
                    print(f"   📝 Sample: {json.dumps(sample_clean, indent=2, ensure_ascii=False)}")
            
        except Exception as e:
            print(f"❌ Error testing {collection_name}: {e}")

def test_grid_history(mongo_client):
    """Test grid history collection"""
    print("\n🔍 Testing Grid History...")
    
    try:
        collection = mongo_client.get_collection("grid_history")
        count = collection.count_documents({})
        print(f"📊 grid_history: {count} documents")
        
        if count > 0:
            # Show recent entries
            recent = list(collection.find().sort("_id", -1).limit(3))
            print("📝 Recent entries:")
            for i, doc in enumerate(recent, 1):
                doc_clean = mongo_client.convert_objectid_to_str(doc)
                print(f"   {i}. {json.dumps(doc_clean, indent=2, ensure_ascii=False)}")
        
    except Exception as e:
        print(f"❌ Error testing grid_history: {e}")

def test_data_service():
    """Test DataService integration"""
    print("\n🔍 Testing DataService...")
    
    try:
        from services.data_service import DataService
        from database.mongodb import MongoDBClient
        
        mongo_client = MongoDBClient(config.mongodb_url, config.database_name)
        data_service = DataService(mongo_client)
        
        test_khus = ["SupplyAndDemand", "Supply", "Demand"]
        
        for khu in test_khus:
            try:
                data = data_service.get_task_data(khu)
                print(f"📊 DataService.get_task_data('{khu}'): {len(data)} records")
                
                if data:
                    print(f"   📝 Sample: {json.dumps(data[0], indent=2, ensure_ascii=False)}")
                    
            except Exception as e:
                print(f"❌ Error testing DataService for {khu}: {e}")
                
    except Exception as e:
        print(f"❌ Error testing DataService: {e}")

def main():
    """Main test function"""
    print("🚀 MongoDB Test Suite")
    print("=" * 50)
    
    # Test basic connection
    mongo_client = test_mongodb_connection()
    if not mongo_client:
        print("❌ Cannot proceed without MongoDB connection")
        return
    
    # Test collections
    test_task_collections(mongo_client)
    test_grid_history(mongo_client)
    
    # Test DataService
    test_data_service()
    
    print("\n✅ Test completed!")

if __name__ == "__main__":
    main() 