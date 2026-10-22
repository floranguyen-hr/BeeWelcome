# Hướng Dẫn Sử Dụng & Vận Hành BeeWelcome Với Microsoft SQL Server & SSMS

Chào Yumesekai! Hệ thống đã được nâng cấp để **chạy trực tiếp 100% trên Microsoft SQL Server (`BeeWelcomeDB`)** mà không cần phụ thuộc vào dịch vụ đám mây Supabase.

---

## 🚀 1. Lợi Ích Khi Chuyển Sang SQL Server Local
- **Độc lập hoàn toàn**: Không cần kết nối internet hay tài khoản cloud Supabase.
- **Tốc độ phản hồi tức thì**: Database chạy trên cùng máy tính với Next.js qua giao thức bộ nhớ chia sẻ / Named Pipes / TCP localhost.
- **Quản trị trực quan trên SSMS**: Anh có thể mở **SQL Server Management Studio (SSMS)** để xem dữ liệu, sửa bảng, chạy stored procedures và theo dõi tiến độ nhân viên trực tiếp.

---

## 🛠️ 2. Step-by-Step: Hướng Dẫn Vận Hành Hệ Thống

### Bước 1: Khởi Tạo / Nạp Lại CSDL (Nếu Cần)
CSDL `BeeWelcomeDB` hiện đã được tạo và nạp sẵn 100% dữ liệu mẫu trên máy của anh. Nếu sau này anh muốn xóa đi làm lại từ đầu (Reset Database sạch), chỉ cần mở PowerShell trong thư mục dự án và chạy:

```powershell
# Chạy DDL tạo 16 bảng & triggers
sqlcmd -S "localhost" -E -C -f 65001 -i ".\sql\01_Schema_BeeWelcome.sql"

# Tạo Stored Procedures (Nghiệp vụ chấm điểm, phân quyền, lộ trình)
sqlcmd -S "localhost" -E -C -f 65001 -i ".\sql\02_StoredProcedures_BeeWelcome.sql"

# Nạp dữ liệu mẫu an toàn (4 tài khoản, 5 nội dung, 1 template, 2 lộ trình)
sqlcmd -S "localhost" -E -C -f 65001 -i ".\sql\03_SeedData_BeeWelcome.sql"
```

### Bước 2: Thiết Lập Biến Môi Trường `.env.local`
Tạo file `.env.local` tại thư mục gốc của dự án (hoặc copy từ `.env.example`):

```bash
# Chuỗi kết nối Windows Authentication (tự động nhận diện quyền Windows của máy bạn)
MSSQL_CONNECTION_STRING="Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=BeeWelcomeDB;Trusted_Connection=yes;TrustServerCertificate=yes;"
```

### Bước 3: Khởi Động Ứng Dụng Web
Chạy lệnh khởi động máy chủ Next.js:

```bash
npm.cmd run dev
```

Mở trình duyệt truy cập: [**`http://localhost:3000`**](http://localhost:3000)

---

## 🔑 3. Danh Sách Tài Khoản Demo Sẵn Sàng Đăng Nhập

Hệ thống đã chuẩn bị sẵn 4 tài khoản với phân quyền rõ ràng:

| Vai Trò | Email Đăng Nhập | Mật Khẩu Demo | Mô Tả |
| :--- | :--- | :--- | :--- |
| **Nhân Viên Mới A** | `employee-a@bee-onboarding.invalid` | `DemoPassword123!` | Nguyễn Văn An (Logistics Coordinator - Đà Nẵng) |
| **Nhân Viên Mới B** | `employee-b@bee-onboarding.invalid` | `DemoPassword123!` | Trần Thị Bình (Warehouse Specialist - TP.HCM) |
| **HR Administrator** | `hr-admin@bee-onboarding.invalid` | `DemoPassword123!` | Quản trị viên nhân sự toàn quyền |
| **HR Director** | `hrd@bee-onboarding.invalid` | `DemoPassword123!` | Giám đốc nhân sự điều hành |

*(Tại màn hình đăng nhập `/login`, anh chỉ cần bấm vào các nút **"Chọn"** của bộ **Quick Demo Switcher** là hệ thống sẽ tự động điền email và mật khẩu mà không cần gõ tay).*

---

## 📊 4. Hướng Dẫn Thao Tác Trực Tiếp Trên SSMS

1. Khởi động **SQL Server Management Studio (SSMS)**.
2. Tại màn hình đăng nhập:
   - **Server type**: `Database Engine`
   - **Server name**: `localhost` (hoặc `.`)
   - **Authentication**: `Windows Authentication`
   - Bấm **Connect**.
3. Trong cửa sổ **Object Explorer**:
   - Mở rộng nhánh: `Databases` $\to$ `BeeWelcomeDB` $\to$ `Tables`. Anh sẽ thấy đầy đủ 16 bảng thuộc các schema `auth`, `app`, `audit`.
4. Bấm **`Ctrl + N`** và chạy các câu lệnh mẫu:

```sql
USE BeeWelcomeDB;
GO

-- 1. Xem toàn bộ nhân viên và chức danh
SELECT Id, DisplayName, Email, Role, Office, Department, Position 
FROM app.Profiles;

-- 2. Xem tiến độ lộ trình của Employee A
SELECT 
    a.MilestoneNameSnapshot AS [Giai Đoạn],
    a.TitleSnapshot AS [Nhiệm Vụ],
    a.CompletionRule AS [Quy Tắc],
    a.Status AS [Trạng Thái],
    a.CompletionSource AS [Nguồn Hoàn Thành],
    a.CompletedAt AS [Thời Gian]
FROM app.JourneyActivities a
INNER JOIN app.EmployeeJourneys j ON j.Id = a.JourneyId
WHERE j.EmployeeId = 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA'
ORDER BY a.MilestoneSequence, a.ActivitySequence;

-- 3. Xem nhật ký kiểm toán mới nhất
SELECT TOP 10 EventType, EventData, CreatedAt
FROM audit.ActivityEvents
ORDER BY CreatedAt DESC;
```
