#!/usr/bin/env python3
"""
Test Cells Config - Kiểm tra tính năng cells độc lập với rows/columns
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.data_service import DataService
from database.mongodb import MongoDBClient
from config import config

def test_cells_independence():
    """Test tính năng cells độc lập"""
    print("🔍 Testing Cells Independence")
    print("=" * 50)
    
    # Khởi tạo DataService
    mongo_client = MongoDBClient(config.mongodb_url, config.database_name)
    data_service = DataService(mongo_client)
    
    # Test cases
    test_configs = [
        {
            "name": "Cells = Rows × Columns (default)",
            "config": {
                "SupplyAndDemandConfig": {"rows": 4, "columns": 6, "cells": 24},
                "SupplyConfig": {"rows": 5, "columns": 6, "cells": 30},
                "DemandConfig": {"rows": 4, "columns": 6, "cells": 24}
            }
        },
        {
            "name": "Cells < Rows × Columns",
            "config": {
                "SupplyAndDemandConfig": {"rows": 4, "columns": 6, "cells": 15},
                "SupplyConfig": {"rows": 5, "columns": 6, "cells": 20},
                "DemandConfig": {"rows": 4, "columns": 6, "cells": 10}
            }
        },
        {
            "name": "Cells > Rows × Columns",
            "config": {
                "SupplyAndDemandConfig": {"rows": 4, "columns": 6, "cells": 30},
                "SupplyConfig": {"rows": 5, "columns": 6, "cells": 40},
                "DemandConfig": {"rows": 4, "columns": 6, "cells": 35}
            }
        }
    ]
    
    for test_case in test_configs:
        print(f"\n📋 Test: {test_case['name']}")
        print("-" * 30)
        
        config_data = test_case["config"]
        
        # Test validation
        validated = data_service.validate_config(config_data)
        
        for khu, khu_config in validated.items():
            if khu.endswith("Config"):
                rows = khu_config.get("rows", 0)
                columns = khu_config.get("columns", 0)
                cells = khu_config.get("cells", 0)
                expected_cells = rows * columns
                
                print(f"   {khu}:")
                print(f"     Rows: {rows}, Columns: {columns}")
                print(f"     Cells: {cells} (expected: {expected_cells})")
                print(f"     Independent: {'✅' if cells != expected_cells else '🔄'}")
                
                if cells != expected_cells:
                    print(f"     Note: Cells độc lập với Rows × Columns")
                else:
                    print(f"     Note: Cells = Rows × Columns (default)")
        
        # Test save and load
        try:
            # Save config
            saved = data_service.save_config(config_data)
            print(f"   ✅ Saved to MongoDB: {saved.get('status', 'success')}")
            
            # Load config
            loaded = data_service.get_config()
            print(f"   ✅ Loaded from MongoDB: success")
            
            # Compare
            for khu in ["SupplyAndDemandConfig", "SupplyConfig", "DemandConfig"]:
                original_cells = config_data[khu]["cells"]
                loaded_cells = loaded.get(khu, {}).get("cells", 0)
                print(f"     {khu}: {original_cells} → {loaded_cells} {'✅' if original_cells == loaded_cells else '❌'}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")

def test_grid_layout():
    """Test grid layout với cells độc lập"""
    print("\n🔍 Testing Grid Layout")
    print("=" * 50)
    
    # Test cases cho grid layout
    test_layouts = [
        {"rows": 4, "columns": 6, "cells": 15, "description": "15 cells in 4x6 grid"},
        {"rows": 5, "columns": 6, "cells": 20, "description": "20 cells in 5x6 grid"},
        {"rows": 3, "columns": 4, "cells": 10, "description": "10 cells in 3x4 grid"},
        {"rows": 6, "columns": 8, "cells": 30, "description": "30 cells in 6x8 grid"}
    ]
    
    for layout in test_layouts:
        rows = layout["rows"]
        columns = layout["columns"]
        cells = layout["cells"]
        description = layout["description"]
        
        print(f"\n📋 {description}")
        print(f"   Grid: {rows} rows × {columns} columns = {rows * columns} positions")
        print(f"   Cells: {cells} cells to display")
        print(f"   Layout: {rows} rows, {columns} columns")
        
        if cells <= rows * columns:
            print(f"   ✅ Cells fit in grid layout")
        else:
            print(f"   ⚠️ Cells exceed grid layout (will wrap to next row)")

if __name__ == "__main__":
    test_cells_independence()
    test_grid_layout()
    print("\n✅ Test completed!") 