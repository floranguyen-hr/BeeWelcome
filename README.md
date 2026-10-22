# BeeWelcome — Cổng Đào Tạo & Onboarding Bee Logistics

Hệ thống quản lý và triển khai lộ trình tiếp nhận nhân sự (Onboarding) dành cho nhân viên mới và ban quản trị HR tại **Bee Logistics Corporation**.

> **Kiến trúc:** Next.js 16 (App Router) + React 19 + TypeScript 5 + Microsoft SQL Server & SSMS  
> **Nguyên tắc bảo mật:** Zero-Trust Client, Database-Enforced Business Logic & T-SQL Stored Procedures.  
> **AI Onboarding Handbook:** Xem chi tiết file [INITIAL.md](INITIAL.md) để AI tự động hiểu toàn bộ dự án và thiết lập môi trường từ A đến Z.

---

## 1. Điểm Nổi Bật Về Tính Năng & Thiết Kế

- **Bản sắc thương hiệu Bee Logistics:**
  - Bảng màu chủ đạo: **Bee Orange** (`#FF5A00`), **Bee Yellow** (`#FFC928`), **Charcoal Dark** (`#252525`), **Pure White** (`#FFFFFF`) và nền xám ấm nhẹ nhàng.
  - Linh vật Ong mật (**BeeMascot**) dạng vector động với hiệu ứng cánh vỗ nhịp nhàng và cử động bồng bềnh thân thiện, đồng hành cùng nhân viên mới.
  - Thanh tiến độ học tập có vệt sáng kim loại chuyển động mượt mà (`shimmerProgress`).
  - Giao diện Dashboard phong cách Bento hiện đại, tối ưu độ tương phản, hoàn toàn không bị mất chữ khi rê chuột (Hover-safe WCAG AAA).

- **Cổng Quản Trị Nhân Sự (HR Admin Portal):**
  - **Bento Dashboard**: Thống kê số lượng nhân viên, số người đang trong lộ trình, tỷ lệ hoàn thành nhiệm vụ và phản hồi trải nghiệm mới nhất.
  - **Quản lý Tài khoản (Users Management)**: Xem toàn bộ danh sách tài khoản, thêm mới tài khoản (Admin hoặc User), kích hoạt/vô hiệu hóa và xóa tài khoản an toàn.
  - **Kho nội dung (Content Library)**: Quản lý thư viện bài học, tài liệu quy chuẩn, video và khảo sát/quiz theo phiên bản (Versioning).
  - **Thiết kế lộ trình (Template Builder)**: Tạo lộ trình Onboarding theo các giai đoạn (Milestones) và nhiệm vụ (Activities) với quy tắc mở khóa theo ngày (`available_offset_days`).
  - **Gán lộ trình (Assignment Snapshots)**: Tạo bản sao lộ trình độc lập và bất biến cho từng nhân viên, đảm bảo thay đổi template gốc không làm xáo trộn lộ trình đang học.
  - **Giám sát & Phê duyệt tiến độ**: HR có quyền xác nhận hoàn thành, miễn trừ hoặc mở lại nhiệm vụ kèm lưu vết kiểm toán bắt buộc (`audit log`).
  - **Cấu hình danh bạ hỗ trợ**: Thiết lập các đầu mối hỗ trợ (IT, Admin, HR, Đào tạo) theo từng chi nhánh/văn phòng.

- **Cổng Nhân Viên Mới (Employee Portal):**
  - **Lộ trình nhiệm vụ (Roadmap)**: Hiển thị Stepper Timeline với thứ tự bài học trực quan, phân loại nhiệm vụ (Tự xác nhận, Xác nhận đã đọc, Điền form, Làm bài trắc nghiệm Quiz).
  - **Bảo mật chấm điểm Quiz Server-side**: Toàn bộ đáp án chính xác được lưu trữ trong bảng bí mật `app.ContentPrivateConfigs`, việc chấm điểm diễn ra 100% trong Stored Procedure `app.sp_CompleteJourneyActivity` của SQL Server.
  - **Thư viện tài nguyên (Resources)**: Tra cứu nhanh các tài liệu, hướng dẫn nghiệp vụ theo phạm vi phòng ban/văn phòng.
  - **Danh bạ trợ giúp (Support Directory)**: Xem hotline, email và liên kết cổng trợ giúp của các đồng nghiệp hỗ trợ.
  - **Hồ sơ cá nhân & Góp ý (Profile & UX Feedback)**: Xem thông tin nhân sự và gửi đóng góp cải tiến cổng học tập.

---

## 2. Tài Khoản Kiểm Thử (Demo Accounts)

Hệ thống đã được khởi tạo sẵn 2 tài khoản kiểm thử chính thức trong CSDL SQL Server:

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **HR Administrator** | `admin@bee-logistics.com` | `Admin@123` | Quản trị toàn bộ hệ thống, quản lý tài khoản, lộ trình, thư viện, duyệt tiến độ |
| **Nhân viên mới (User)** | `user@bee-logistics.com` | `User@123` | Nguyễn Văn An (Logistics Coordinator) · Trải nghiệm học lộ trình Onboarding |

*Tại màn hình Đăng nhập (`/login`), có sẵn khối bấm chọn nhanh để tự động điền tài khoản kiểm thử chỉ với một cú nhấp chuột.*

---

## 3. Kiến Trúc Cơ Sở Dữ Liệu Microsoft SQL Server

Toàn bộ CSDL được quản trị tập trung tại thư mục [`sql/`](file:///c:/Users/G531/Desktop/Yumesekai/GitHub/BeeWelcome/sql):

1. **`01_Schema_BeeWelcome.sql`**: Khởi tạo CSDL `BeeWelcomeDB` và 16 bảng dữ liệu:
   - Phân hệ xác thực & hồ sơ: `auth.Users`, `app.Profiles`.
   - Phân hệ nội dung & phiên bản: `app.Contents`, `app.ContentVersions`, `app.ContentPrivateConfigs`.
   - Phân hệ template & mốc đào tạo: `app.Templates`, `app.Milestones`, `app.TemplateItems`.
   - Phân hệ lộ trình nhân viên: `app.EmployeeJourneys`, `app.JourneyActivities`, `app.JourneyActivityPrivate`.
   - Phân hệ nộp bài & kiểm toán: `app.ActivitySubmissions`, `app.ActivityEvents`, `app.TemplateUpdateHistories`.
   - Phân hệ hỗ trợ & góp ý: `app.SupportContacts`, `app.EmployeeFeedbacks`.
2. **`02_StoredProcedures_BeeWelcome.sql`**: Chứa toàn bộ nghiệp vụ thực thi bằng T-SQL Stored Procedures:
   - `app.sp_AssignTemplateToEmployee`: Gán lộ trình và tạo snapshot nhiệm vụ.
   - `app.sp_CompleteJourneyActivity`: Chấm điểm quiz và ghi nhận hoàn thành.
   - `app.sp_ManageJourneyActivity`: HR duyệt/miễn/mở lại nhiệm vụ.
   - `app.sp_PublishContent`: Xuất bản bài học & tách đáp án bí mật.
   - `app.sp_PreviewTemplateJourneyUpdates` & `app.sp_ApplyTemplateJourneyUpdates`: Cập nhật lộ trình có kiểm soát.
3. **`03_SeedData_BeeWelcome.sql`**: Dữ liệu mẫu chuẩn của Bee Logistics (Tài khoản, nội dung bài học, template chuẩn, lộ trình mẫu).

---

## 4. Hướng Dẫn Cài Đặt & Vận Hành Cục Bộ

### Bước 1: Khởi tạo CSDL trên SQL Server & SSMS
1. Mở **SQL Server Management Studio (SSMS)** và kết nối tới SQL Server của bạn (ví dụ `localhost` hoặc tên máy tính).
2. Mở và thực thi tuần tự 3 file script:
   - `sql/01_Schema_BeeWelcome.sql`
   - `sql/02_StoredProcedures_BeeWelcome.sql`
   - `sql/03_SeedData_BeeWelcome.sql`

### Bước 2: Cài đặt thư viện Node.js
```bash
npm.cmd ci
```

### Bước 3: Cấu hình biến môi trường
File `.env.local` đã được cấu hình mặc định sử dụng Windows Authentication:
```ini
MSSQL_CONNECTION_STRING="Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=BeeWelcomeDB;Trusted_Connection=yes;TrustServerCertificate=yes;"
SESSION_SECRET="bee-welcome-enterprise-ultra-secure-secret-2026"
```

### Bước 4: Khởi chạy môi trường phát triển
```bash
npm.cmd run dev
```
Truy cập ứng dụng tại: [http://localhost:3000](http://localhost:3000)

### Bước 5: Kiểm tra kiểu dữ liệu & Biên dịch Production
- Kiểm tra TypeScript:
  ```bash
  npm.cmd run typecheck
  ```
- Biên dịch gói Production:
  ```bash
  npm.cmd run build
  ```
