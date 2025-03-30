import pandas as pd

def count_matching_first_two_digits(file_path, column_name):
    # Đọc file Excel
    df = pd.read_excel(file_path)
    
    # Tạo một cột mới chứa 2 chữ số đầu tiên
    # Chuyển tất cả thành string và lấy 2 ký tự đầu
    df['first_two'] = df[column_name].astype(str).str[:2]
    
    # Đếm số lần xuất hiện của mỗi giá trị
    value_counts = df['first_two'].value_counts()
    
    # Tổng số cặp giống nhau
    # Với mỗi giá trị xuất hiện n lần, số cặp là n-1
    total_matches = sum(count - 1 for count in value_counts if count > 1)
    
    return total_matches

# Sử dụng hàm
file_path = r'C:\Users\ThadaoSoft\Downloads\Area_thadosoft_Shelves_20250321 (1).xlsx'
column_name = 'Shelf No.'
result = count_matching_first_two_digits(file_path, column_name)
print(f"Số cặp có 2 chữ số đầu giống nhau: {result}")