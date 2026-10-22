# Hướng Dẫn Sử Dụng & Kết Nối CSDL BeeWelcomeDB trên Microsoft SQL Server & SSMS

Tài liệu này cung cấp toàn bộ hướng dẫn kết nối, quản trị và kiểm thử CSDL **BeeWelcomeDB** được thiết kế lại hoàn toàn trên nền tảng **Microsoft SQL Server (2022 / 2025 Developer/Standard/Enterprise)** và **SQL Server Management Studio (SSMS)**.

---

## 1. Thông Tin Kết Nối Nhanh

| Thông số | Giá trị |
| :--- | :--- |
| **Server Name** | `localhost` hoặc `.` hoặc `127.0.0.1` hoặc `DESKTOP-SR9VAHG` |
| **Database Name** | `BeeWelcomeDB` |
| **Authentication** | `Windows Authentication` (Tự động nhận diện tài khoản Windows hiện tại) |
| **Mã hóa (Collation)** | `Latin1_General_100_CI_AS_SC_UTF8` (Hỗ trợ tiếng Việt Unicode UTF-8 chuẩn xác) |
| **Engine Status** | SQL Server 2025 RTM (Standard Developer Edition) — Đang chạy Service `MSSQLSERVER` |

---

## 2. Danh Sách Script T-SQL Được Cung Cấp

Toàn bộ mã nguồn CSDL được tổ chức tại thư mục [`sql/`](file:///c:/Users/G531/Desktop/Yumesekai/GitHub/BeeWelcome/sql):

1. [**`01_Schema_BeeWelcome.sql`**](file:///c:/Users/G531/Desktop/Yumesekai/GitHub/BeeWelcome/sql/01_Schema_BeeWelcome.sql):
   - Tạo CSDL `BeeWelcomeDB` và 3 schema riêng biệt: `auth`, `app`, `audit`.
   - Tạo 16 bảng dữ liệu, khóa chính (`PK`), khóa ngoại (`FK`), ràng buộc kiểm tra (`CHECK`), ràng buộc JSON (`ISJSON`), và các Filtered Indexes.
   - 6 Temporal Triggers tự động cập nhật mốc thời gian `UpdatedAt`.
2. [**`02_StoredProcedures_BeeWelcome.sql`**](file:///c:/Users/G531/Desktop/Yumesekai/GitHub/BeeWelcome/sql/02_StoredProcedures_BeeWelcome.sql):
   - Chuyển đổi toàn bộ logic RPC từ PostgreSQL sang **T-SQL Stored Procedures** chuẩn:
     - `app.sp_PublishContent`: Xuất bản bài học, tự động bóc tách đáp án Quiz sang bảng bảo mật `app.ContentPrivateConfigs`.
     - `app.sp_AssignTemplateToEmployee`: Xác thực phạm vi đối tượng (`audience scope`) và tạo Snapshot bất biến (`JourneyActivities`).
     - `app.sp_CompleteJourneyActivity`: Chấm điểm Quiz server-side, kiểm tra ngày mở bài (`AvailableAt`), lưu kết quả (`ActivitySubmissions`) và ghi nhật ký kiểm toán (`ActivityEvents`).
     - `app.sp_ManageJourneyActivity`: Quyền HR Admin duyệt/miễn/mở lại nhiệm vụ kèm lý do kiểm toán bắt buộc.
     - `app.sp_UpsertSupportContact` & `app.sp_ArchiveSupportContact`: Quản lý danh bạ hỗ trợ.
     - `app.sp_SubmitUxFeedback`: Gửi góp ý trải nghiệm người dùng.
3. [**`03_SeedData_BeeWelcome.sql`**](file:///c:/Users/G531/Desktop/Yumesekai/GitHub/BeeWelcome/sql/03_SeedData_BeeWelcome.sql):
   - Nạp dữ liệu mẫu an toàn (`Idempotent Synthetic Data`): 4 tài khoản demo (HR Admin, HRD, Employee A & B), 5 nội dung học, 1 Template chuẩn với 2 Milestones, 2 Lộ trình thực tế cho Employee A & B, 2 liên hệ danh bạ và phản hồi UX mẫu.

---

## 3. Các Bước Mở & Thao Tác Trên SSMS (SQL Server Management Studio)

### Bước 1: Mở SSMS và Đăng nhập
1. Khởi động **SQL Server Management Studio (SSMS)** từ Start Menu hoặc tìm kiếm `SSMS`.
2. Trong cửa sổ **Connect to Server**:
   - **Server type**: `Database Engine`
   - **Server name**: Điền `localhost` hoặc dấu chấm `.`
   - **Authentication**: Chọn `Windows Authentication`
   - Bấm **Connect**.

### Bước 2: Xem Cấu Trúc Database
1. Trong cửa sổ **Object Explorer** bên tay trái, mở rộng nhánh:
   `Databases` $\to$ `BeeWelcomeDB` $\to$ `Tables`.
2. Anh sẽ thấy toàn bộ 16 bảng đã được phân nhóm schema chuyên nghiệp:
   - `auth.Users`
   - `app.Profiles`, `app.Contents`, `app.ContentVersions`, `app.ContentPrivateConfigs`
   - `app.Templates`, `app.Milestones`, `app.TemplateItems`
   - `app.EmployeeJourneys`, `app.JourneyActivities`, `app.JourneyActivityPrivate`
   - `app.ActivitySubmissions`, `app.SupportContacts`, `app.UxFeedback`
   - `audit.ActivityEvents`, `audit.JourneyTemplateUpdates`

### Bước 3: Xem và Chạy Các Stored Procedures
1. Mở rộng nhánh: `Programmability` $\to$ `Stored Procedures`.
2. Để mở một cửa sổ truy vấn mới (New Query), bấm tổ hợp phím **`Ctrl + N`**.
3. Chạy câu lệnh kiểm tra dữ liệu đã nạp:
   ```sql
   USE BeeWelcomeDB;
   GO

   -- 1. Xem danh sách nhân viên & HR
   SELECT Id, DisplayName, Email, Role, Office, Department, Position 
   FROM app.Profiles;

   -- 2. Xem lộ trình nhiệm vụ đang chạy của Employee A
   SELECT 
       a.MilestoneNameSnapshot AS [Giai Đoạn],
       a.TitleSnapshot AS [Tên Hoạt Động],
       a.CompletionRule AS [Quy Tắc Hoàn Thành],
       a.Status AS [Trạng Thái],
       a.AvailableAt AS [Ngày Mở],
       a.DueAt AS [Hạn Chót],
       a.CompletedAt AS [Thời Gian Hoàn Thành]
   FROM app.JourneyActivities a
   INNER JOIN app.EmployeeJourneys j ON j.Id = a.JourneyId
   WHERE j.EmployeeId = 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA'
   ORDER BY a.MilestoneSequence, a.ActivitySequence;

   -- 3. Xem lịch sử kiểm toán các thao tác gần nhất
   SELECT TOP 10
       e.EventType AS [Loại Sự Kiện],
       p.DisplayName AS [Người Thực Hiện],
       e.EventData AS [Dữ Liệu JSON],
       e.CreatedAt AS [Thời Điểm]
   FROM audit.ActivityEvents e
   INNER JOIN app.Profiles p ON p.Id = e.ActorId
   ORDER BY e.CreatedAt DESC;
   ```
4. Bấm **`F5`** (hoặc nút **Execute**) để xem kết quả trực quan trên SSMS.

---

## 4. Chạy Lại Scripts Bằng Lệnh (Command Line / PowerShell) Khi Cần

Nếu muốn khởi tạo lại toàn bộ CSDL hoặc nạp lại dữ liệu từ terminal:

```powershell
# Chạy Schema DDL
sqlcmd -S "localhost" -E -C -i ".\sql\01_Schema_BeeWelcome.sql"

# Chạy Stored Procedures
sqlcmd -S "localhost" -E -C -i ".\sql\02_StoredProcedures_BeeWelcome.sql"

# Nạp Seed Data
sqlcmd -S "localhost" -E -C -i ".\sql\03_SeedData_BeeWelcome.sql"
```
