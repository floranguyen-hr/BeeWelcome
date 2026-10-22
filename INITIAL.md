# BeeWelcome — AI Project Initialization & Bootstrap Handbook

> **Target Audience:** AI Coding Assistants (Antigravity, Claude, ChatGPT, Cursor, GitHub Copilot) & Engineers.  
> **Mission:** Hướng dẫn toàn diện để AI đọc hiểu kiến trúc dự án, tự động thiết lập môi trường, vận hành CSDL Microsoft SQL Server, nắm vững cấu trúc code và tiếp tục phát triển hệ thống mà không làm sai lệch các nguyên tắc bất biến (Invariants).

---

## 1. Project Identity & Architecture Overview

- **Tên dự án:** BeeWelcome (`bee-onboarding`)
- **Tổ chức sở hữu:** Bee Logistics Corporation
- **Phân loại:** Cổng đào tạo và tiếp nhận nhân sự nội bộ (Internal Enterprise HR & Employee Onboarding Portal).
- **Công nghệ nền tảng:**
  - **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
  - **Cơ sở dữ liệu:** Microsoft SQL Server 2019/2022 (quản trị qua SSMS).
  - **Kết nối CSDL:** Driver `mssql` (Singleton Pool) kết hợp `msnodesqlv8` (Windows Authentication).
  - **Bảo mật & Phiên:** Cookie HTTP-Only `bee_session` có chữ ký HMAC SHA-256 + mật khẩu băm chuẩn `scrypt`.
  - **Styling:** CSS chuẩn hóa hiện đại, Bento UI, Tokens thương hiệu Bee Logistics (không dùng thư viện UI đóng gói bên ngoài).
- **LƯU Ý CỐT TỬ CHO AI:**
  - **Dự án KHÔNG sử dụng Supabase hay PostgreSQL**. Mọi tham chiếu cũ về Supabase, Docker, PGlite đã được gỡ bỏ hoàn toàn.
  - Mọi thao tác lưu trữ, xác thực và logic nghiệp vụ đều chạy trên **Microsoft SQL Server cục bộ (`BeeWelcomeDB`)**.

---

## 2. Quick Setup & Execution Guide for AI

Khi tiếp nhận dự án, AI cần thực hiện hoặc hướng dẫn người dùng theo đúng 5 bước sau:

### Bước 1: Khởi tạo Cơ sở Dữ liệu trên SQL Server (SSMS)
Thư mục [`sql/`](file:///c:/Users/G531/Desktop/Yumesekai/GitHub/BeeWelcome/sql) chứa toàn bộ mã nguồn CSDL. Hãy chạy tuần tự 3 file script sau trong SSMS:
1. `sql/01_Schema_BeeWelcome.sql`: Tạo CSDL `BeeWelcomeDB`, 3 Schemas (`auth`, `app`, `audit`), 16 bảng dữ liệu, khóa ngoại, indexes và triggers tự động cập nhật `UpdatedAt`.
2. `sql/02_StoredProcedures_BeeWelcome.sql`: Định nghĩa toàn bộ các Stored Procedures nghiệp vụ (`app.sp_*`).
3. `sql/03_SeedData_BeeWelcome.sql`: Nạp sẵn dữ liệu mẫu (2 tài khoản demo, bài học mẫu, template mẫu, lộ trình mẫu).

### Bước 2: Cấu hình biến môi trường (`.env.local`)
Tạo hoặc kiểm tra file `.env.local` ở thư mục gốc:
```ini
# Kết nối SQL Server nội bộ qua Windows Authentication (không cần password SA)
MSSQL_CONNECTION_STRING="Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=BeeWelcomeDB;Trusted_Connection=yes;TrustServerCertificate=yes;"

# Khóa bí mật dùng để ký và xác thực Cookie phiên làm việc
SESSION_SECRET="bee-welcome-enterprise-ultra-secure-secret-2026"
```

### Bước 3: Cài đặt thư viện dependencies
```powershell
npm.cmd ci
```

### Bước 4: Khởi chạy ứng dụng (Development)
```powershell
npm.cmd run dev
```
Ứng dụng sẽ hoạt động tại: `http://localhost:3000` (hoặc `http://127.0.0.1:3000`).

### Bước 5: Kiểm tra tính toàn vẹn (Verification)
- Kiểm tra kiểu dữ liệu: `npm.cmd run typecheck` (Phải đạt Exit code 0).
- Kiểm tra biên dịch Production: `npm.cmd run build` (Phải Compile thành công 100%).

---

## 3. Pre-configured Demo Accounts

Hệ thống đã có sẵn 2 tài khoản kiểm thử chính thức được mã hóa an toàn trong CSDL:

| Vai trò | Email đăng nhập | Mật khẩu | Trang chuyển hướng sau đăng nhập | Quyền hạn & Trách nhiệm |
| :--- | :--- | :--- | :--- | :--- |
| **HR Administrator** | `admin@bee-logistics.com` | `Admin@123` | `/admin/dashboard` | Toàn quyền quản trị: Bento Dashboard, quản lý tài khoản Users, duyệt tiến độ, quản lý kho nội dung, thiết kế template, gán lộ trình. |
| **Nhân viên (User)** | `user@bee-logistics.com` | `User@123` | `/roadmap` | Nguyễn Văn An (Logistics Coordinator): Học lộ trình Onboarding, xem Stepper Timeline, làm bài kiểm tra quiz, gửi phản hồi trải nghiệm. |

*Lưu ý: Tại trang `/login`, người dùng có thể nhấp chuột trực tiếp vào 2 thẻ tài khoản kiểm thử để điền form tự động.*

---

## 4. Codebase Architecture & File Mapping

Dự án áp dụng mô hình **Feature-Sliced Architecture** kết hợp **Next.js App Router**:

```
BeeWelcome/
├── sql/                             # NGUỒN CƠ SỞ DỮ LIỆU CHÍNH THỨC
│   ├── 01_Schema_BeeWelcome.sql     # DDL 16 bảng
│   ├── 02_StoredProcedures_BeeWelcome.sql # Logic nghiệp vụ T-SQL
│   └── 03_SeedData_BeeWelcome.sql   # Dữ liệu mẫu khởi tạo
├── src/
│   ├── app/                         # APP ROUTER (TẦNG ĐIỀU HƯỚNG & VIEW)
│   │   ├── (admin)/                 # Phân vùng quản trị HR (bảo vệ bởi role 'hr_admin')
│   │   │   ├── admin/dashboard/     # Bento KPI Dashboard
│   │   │   ├── admin/content/       # Quản trị Content Library
│   │   │   ├── admin/templates/     # Template Builder & Milestones
│   │   │   ├── admin/employees/     # Gán lộ trình cho nhân viên
│   │   │   ├── admin/progress/      # Quản lý, phê duyệt & kiểm toán tiến độ
│   │   │   ├── admin/users/         # Quản trị tài khoản (Thêm, Xóa, Bật/Tắt)
│   │   │   └── admin/settings/support/ # Cấu hình danh bạ hỗ trợ
│   │   ├── (employee)/              # Phân vùng nhân viên (bảo vệ bởi role 'employee')
│   │   │   ├── roadmap/             # Stepper Timeline bài học, Quiz & Forms
│   │   │   ├── resources/           # Thư viện tài liệu theo phạm vi
│   │   │   ├── support/             # Danh bạ hotline, đầu mối trợ giúp
│   │   │   └── profile/             # Thông tin cá nhân & gửi phản hồi UX
│   │   ├── api/auth/                # Route Handlers đăng nhập & đăng ký (/api/auth/login, /api/auth/register)
│   │   ├── login/ & register/       # Các trang xác thực
│   │   ├── globals.css              # Design System tokens, animations, hover contrast rules
│   │   └── page.tsx                 # Landing Page giới thiệu Bee Logistics Onboarding
│   ├── components/ui/               # UI COMPONENTS DÙNG CHUNG
│   │   ├── BeeMascot.tsx            # Linh vật Ong vector vỗ cánh sống động
│   │   ├── BrandLogo.tsx            # Logo thương hiệu Bee Logistics
│   │   ├── WelcomeHeader.tsx        # Banner chào mừng nhân viên
│   │   └── index.ts                 # Barrel exports
│   ├── features/                    # DOMAIN FEATURE MODULES (TỰ ĐÓNG GÓI)
│   │   ├── admin-operations/        # user-actions.ts, actions.ts, schemas.ts, user-management-view.tsx
│   │   ├── auth/                    # session.ts (requireRole, getSessionProfile), login-form, register-form
│   │   ├── content-library/         # actions.ts, library-page.tsx, schemas.ts
│   │   ├── employee-journey/        # actions.ts (completeJourneyActivity, submitJourneyActivity)
│   │   ├── employee-profile/        # actions.ts (submitUxFeedback)
│   │   └── template-builder/        # actions.ts, template-list-page.tsx, template-detail-page.tsx
│   └── lib/                         # HẠ TẦNG KỸ THUẬT LÕI
│       ├── auth/                    # password.ts (scrypt), session.ts (signed cookies)
│       └── db/                      # sqlserver.ts (Singleton connection pool mssql)
```

---

## 5. Core Database Schema & Business Logic Invariants

Hệ thống có 16 bảng dữ liệu chia làm 6 phân hệ:

1. **Người dùng & Xác thực:**
   - `auth.Users`: `Id` (GUID), `Email`, `PasswordHash` (scrypt), `IsEmailConfirmed`.
   - `app.Profiles`: `Id` (khóa ngoại 1-1 với Users), `DisplayName`, `EmployeeCode`, `Role` (`'hr_admin'` | `'employee'`), `Office`, `Department`, `Position`, `IsActive`.
2. **Kho Nội Dung & Phiên Bản:**
   - `app.Contents`: `Slug`, `Title`, `Description`, `Category`, `ContentType` (`text`, `image`, `video`, `file_link`, `task`, `quiz_form`), `ScopeType`, `ScopeValue`, `Status` (`draft`, `published`, `archived`), `CurrentVersion`.
   - `app.ContentVersions`: `Body` (JSON nội dung bài học), `VersionStatus`, `ChangeNote`, `PublishedAt`.
   - `app.ContentPrivateConfigs`: **Bảng bí mật** lưu trữ đáp án Quiz (`AnswerConfig`). Tuyệt đối không gửi bảng này về Client.
3. **Template & Lộ Trình Mẫu:**
   - `app.Templates`: Khung đào tạo Onboarding theo phiên bản.
   - `app.Milestones`: Các chặng/giai đoạn (ví dụ: Tuần 1, Tuần 2) kèm `AvailableOffsetDays`.
   - `app.TemplateItems`: Nhiệm vụ trong từng chặng kèm quy tắc hoàn thành (`manual_self_confirmation`, `form_submission`, `quiz_participation`, `quiz_pass_required`, `content_acknowledgement`, `admin_completion`).
4. **Hành Trình Nhân Viên (Immutable Snapshots):**
   - `app.EmployeeJourneys`: Bản ghi lộ trình được gán cho nhân viên.
   - `app.JourneyActivities`: **Snapshot bất biến** của các nhiệm vụ từ `TemplateItems` sang hành trình nhân viên. Khi template gốc thay đổi, dữ liệu đang học của nhân viên không bị xáo trộn.
   - `app.JourneyActivityPrivate`: Đáp án quiz bí mật gắn riêng với từng snapshot nhiệm vụ của nhân viên.
5. **Tiến Độ & Kiểm Toán (Audit Trail):**
   - `app.ActivitySubmissions`: Kết quả nộp biểu mẫu hoặc câu trả lời quiz.
   - `audit.ActivityEvents`: Nhật ký kiểm toán hành vi (ai làm gì, thời điểm nào, ghi chú lý do).
6. **Danh Bạ Hỗ Trợ & Góp Ý:**
   - `app.SupportContacts`: Danh bạ trợ giúp kỹ thuật/nhân sự/đào tạo theo chi nhánh.
   - `app.EmployeeFeedbacks`: Góp ý nâng cao trải nghiệm của nhân viên độc lập với lộ trình học.

### Các Stored Procedures cốt lõi (Bắt buộc phải gọi, không ghi thô vào DB):
- `app.sp_PublishContent`: Xuất bản nội dung và tự động bóc tách đáp án quiz sang `ContentPrivateConfigs`.
- `app.sp_AssignTemplateToEmployee`: Xác thực phạm vi đối tượng (`app.fn_CheckProfileMatchesScope`) và snapshot toàn bộ nhiệm vụ sang `JourneyActivities`.
- `app.sp_CompleteJourneyActivity`: Chấm điểm Quiz trên server-side, kiểm tra ngày mở khóa, ghi nhận điểm số và tạo event kiểm toán.
- `app.sp_ManageJourneyActivity`: Quyền của HR Admin để hoàn thành, miễn trừ hoặc mở lại bài học kèm lý do bắt buộc.
- `app.sp_PreviewTemplateJourneyUpdates` & `app.sp_ApplyTemplateJourneyUpdates`: Cơ chế cập nhật lộ trình có kiểm soát, bảo lưu 100% nhiệm vụ đã hoàn thành.

---

## 6. Authentication & Security Invariants

1. **Phân quyền Role Guard:**
   - Mọi Server Component và Server Action trong phân vùng Admin bắt buộc phải gọi `await requireRole('hr_admin')`.
   - Mọi Server Component và Server Action trong phân vùng Nhân viên bắt buộc phải gọi `await requireRole('employee')`.
   - Hàm `requireRole` nằm tại [`src/features/auth/session.ts`](file:///c:/Users/G531/Desktop/Yumesekai/GitHub/BeeWelcome/src/features/auth/session.ts).
2. **Quy tắc bảo mật Quiz:**
   - Tầng Client (`roadmap/page.tsx`) chỉ nhận danh sách lựa chọn câu hỏi (options), **tuyệt đối không bao giờ nhận đáp án đúng (`correctIndex` hay `answerKey`)**.
   - Việc so khớp đáp án và tính điểm chỉ diễn ra trong Stored Procedure `app.sp_CompleteJourneyActivity`.
3. **Đăng ký tài khoản mới (`/register`):**
   - Bất kỳ ai tự đăng ký tài khoản mới chỉ được gán vai trò duy nhất là `employee` (nhân viên thường).
   - Chỉ có tài khoản `hr_admin` đã đăng nhập mới có quyền tạo thêm tài khoản Admin trong trang `/admin/users`.

---

## 7. UI/UX Design System Invariants

Khi phát triển thêm màn hình hoặc component mới, AI bắt buộc phải tuân thủ triệt để Design System tại [`src/app/globals.css`](file:///c:/Users/G531/Desktop/Yumesekai/GitHub/BeeWelcome/src/app/globals.css):

1. **Bảng màu chuẩn Bee Logistics:**
   - `var(--color-primary)`: Bee Orange `#FF5A00` (Nút hành động chính, tab active, viền sáng).
   - `var(--color-accent)`: Bee Yellow `#FFC928` (Điểm nhấn phụ, mascot, badge cảnh báo nhẹ).
   - `var(--color-text-main)`: Charcoal `#252525` (Tiêu đề, chữ văn bản cần độ tương phản cao).
   - `var(--color-bg-card)`: Pure White `#FFFFFF` (Nền các khối thẻ).
   - `var(--color-bg-canvas)`: Light Warm Gray `#F8F9FA` (Nền toàn trang).
2. **Quy tắc chống mất chữ khi Hover (Zero Text Loss):**
   - **Cấm kỵ:** Không được để xảy ra tình trạng chữ màu cam trên nền cam hoặc chữ trắng trên nền trắng khi hover.
   - Luôn sử dụng các class có sẵn: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.nav-tab-item`, `.demo-card`, `.check-label-card`.
3. **Hiệu ứng & Micro-animations:**
   - `BeeMascot`: Giữ hiệu ứng vỗ cánh sinh động (`wingLeft`, `wingRight`) và bay bồng bềnh (`floatMascot`).
   - `card-interactive`: Card nhấc nhẹ 2-3px khi hover (`transform: translateY(-2px)`).
   - `progress-bar-animated`: Vệt sáng kim loại chạy qua lại (`shimmerProgress`).

---

## 8. Development Rules for AI Agents

1. **Zero-Truncation Rule:**
   - Không được viết code tóm tắt, không dùng `// TODO`, `/* rest of code */`, `pass`, `...`.
   - Mọi hàm, component và file sửa đổi phải đầy đủ 100%, có type TypeScript chặt chẽ và xử lý lỗi cụ thể.
2. **Self-Verification Loop:**
   - Sau khi tạo hoặc chỉnh sửa code, luôn chạy `npm.cmd run typecheck` để bảo đảm không có lỗi kiểu dữ liệu.
   - Chạy `npm.cmd run build` để xác thực toàn bộ route pages biên dịch tốt trong Next.js 16.
3. **Import qua Barrel:**
   - Ưu tiên import từ barrel exports:
     - `import { BrandLogo, BeeMascot } from "@/components/ui";`
     - `import { requireRole, getSessionProfile } from "@/features/auth";`
     - `import { getAllUsers, assignJourney } from "@/features/admin-operations";`
     - `import { getSqlPool, sql } from "@/lib/db/sqlserver";`

---
*Tài liệu này là chuẩn mực tham chiếu cao nhất cho mọi AI Agent làm việc trên dự án BeeWelcome.*
