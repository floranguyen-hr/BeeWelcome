# BeeWelcome Codebase Directive & System Architecture Handbook

> **Project Identity:** BeeWelcome (bee-onboarding)
> **Classification:** Internal HR & Employee Onboarding Portal (Enterprise Architecture)
> **Engine:** Next.js 16 (App Router) + React 19 + TypeScript 5 + Microsoft SQL Server 2019/2022 & SSMS

---

## 1. Executive Architecture Overview

BeeWelcome là hệ thống quản lý và triển khai lộ trình Onboarding dành cho nhân sự (HR Admin) và nhân viên mới (Employee) của **Bee Logistics Corporation**. Hệ thống được thiết kế theo nguyên lý **Zero-Trust Client** kết hợp **Database-Enforced Business Logic**:
- **Next.js App Router (React 19 & Next.js 16)**: Đóng vai trò lớp trình diễn (Presentation Layer), Route Handlers (`/api/auth/*`) và Server Components.
- **Session Authentication**: Quản lý phiên làm việc bảo mật qua HTTP-Only cookie `bee_session` kèm thuật toán ký HMAC SHA-256 và mã hóa mật khẩu `scrypt` tiêu chuẩn công nghiệp (`src/lib/auth/*`).
- **Microsoft SQL Server (T-SQL Stored Procedures & Transaction Invariants)**: Toàn bộ nghiệp vụ phê duyệt, tính điểm quiz, snapshot lộ trình, xác thực phân quyền và lưu vết kiểm toán (audit log) được thực thi và khóa chặt ở tầng Database. Client tuyệt đối không được cấp quyền ghi tùy tiện lên các bảng dữ liệu cốt lõi mà phải gọi qua các Stored Procedures có kiểm tra quyền hạn (`app.sp_*`).

---

## 2. Directory Structure & Layer Responsibilities

```
BeeWelcome/
├── .agents/                         # Customizations & Workspace Skills
│   └── skills/                      # Skills thiết kế UI/UX chuyên sâu (frontend-design, ui-ux-pro-max, impeccable, web-guidelines)
├── .env.example                     # Biến môi trường mẫu cho kết nối SQL Server
├── .env.local                       # Biến môi trường cục bộ (MSSQL_CONNECTION_STRING, SESSION_SECRET)
├── AGENTS.md                        # Cẩm nang kiến trúc và quy chuẩn phát triển cho Agent (File này)
├── README.md                        # Hướng dẫn setup, chạy SSMS và tài khoản demo
├── docs/
│   ├── HUONG_DAN_SQL_SERVER.md      # Hướng dẫn chi tiết vận hành với SQL Server & SSMS
│   └── IMPLEMENTATION_PLAN.md       # Chi tiết kiến trúc hệ thống
├── next.config.ts                   # Cấu hình Next.js 16
├── package.json                     # Node.js >= 24, Next 16.4.2, React 19, mssql, msnodesqlv8
├── sql/                             # Bộ mã nguồn CSDL Microsoft SQL Server & SSMS
│   ├── 01_Schema_BeeWelcome.sql     # DDL 16 bảng, indexes, checks, triggers cập nhật UpdatedAt
│   ├── 02_StoredProcedures_BeeWelcome.sql # Bộ Stored Procedures nghiệp vụ (sp_PublishContent, sp_AssignTemplate, v.v.)
│   ├── 03_SeedData_BeeWelcome.sql   # Dữ liệu mẫu synthetic (tài khoản demo, content, template, journeys)
│   └── README_SQL_SERVER.md         # Hướng dẫn kết nối và kiểm thử trên SSMS
└── src/
    ├── app/                         # Route Handlers & Pages (Next.js App Router)
    │   ├── (admin)/                 # Phân vùng quản trị HR Admin (gated by role 'hr_admin')
    │   │   └── admin/
    │   │       ├── content/         # Quản lý Content Library (Draft, Publish, Archive)
    │   │       ├── dashboard/       # Bento KPI Dashboard, tiến độ nhân viên, feedback
    │   │       ├── employees/       # Gán Template cho Employee (Immutable Snapshots)
    │   │       ├── progress/        # Chi tiết tiến độ, duyệt/miễn/mở lại nhiệm vụ
    │   │       ├── settings/support/# Cấu hình danh bạ hỗ trợ (Support Directory)
    │   │       ├── templates/       # Template Builder, Milestones, Activity Rules
    │   │       └── users/           # Quản lý tài khoản người dùng (Users Management)
    │   ├── (employee)/              # Phân vùng nhân viên (gated by role 'employee')
    │   │   ├── profile/             # Thông tin cá nhân & gửi phản hồi UX độc lập
    │   │   ├── resources/           # Thư viện tài nguyên theo phạm vi (audience scope)
    │   │   ├── roadmap/             # Lộ trình nhiệm vụ (Milestones, Activities, Quiz, Form)
    │   │   └── support/             # Danh bạ đầu mối hỗ trợ theo bộ phận/văn phòng
    │   ├── api/auth/                # API Route Handlers (login/register)
    │   ├── login/                   # Trang đăng nhập xác thực
    │   ├── register/                # Trang đăng ký nhân viên mới
    │   ├── unauthorized/            # Trang cảnh báo truy cập trái quyền
    │   └── globals.css              # Hệ thống style UI, Design System Tokens & Animations
    ├── components/
    │   └── ui/                      # Shared UI Components (BrandLogo, BeeMascot, WelcomeHeader)
    ├── features/                    # Feature Modules (Domain Logic & Actions)
    │   ├── admin-operations/        # Actions & Schemas gán lộ trình, quản trị tiến độ, users
    │   ├── auth/                    # Xác thực session, role check helper (`requireRole`, `getSessionProfile`)
    │   ├── content-library/         # Quản trị kho nội dung, versioning, schemas
    │   ├── employee-journey/        # Actions hoàn thành nhiệm vụ, nộp form, chấm điểm quiz
    │   ├── employee-profile/        # Actions gửi UX feedback
    │   └── template-builder/        # Actions & UI Template Builder, Milestones, Item sequencing
    └── lib/
        ├── auth/                    # Hashing mật khẩu (scrypt) & ký token phiên làm việc
        └── db/                      # Singleton SQL Server connection pool (`mssql`)
```

---

## 3. Database Schema & Stored Procedures Invariants

Toàn bộ CSDL `BeeWelcomeDB` được quản lý tại [`sql/`](file:///c:/Users/G531/Desktop/Yumesekai/GitHub/BeeWelcome/sql) gồm 16 bảng:

1. **Phân hệ Người dùng & Xác thực:**
   - `auth.Users`: Lưu trữ `Id`, `Email`, `PasswordHash` (mã hóa scrypt an toàn), `IsEmailConfirmed`.
   - `app.Profiles`: Lưu thông tin nhân sự (`DisplayName`, `EmployeeCode`, `Role`, `Office`, `Department`, `Position`, `IsActive`). Roles: `'hr_admin'` | `'employee'`.
2. **Phân hệ Nội dung & Thư viện:**
   - `app.Contents`: Quản lý metadata bài học, phạm vi đối tượng (`scope_type`, `scope_value`), `CurrentVersion`.
   - `app.ContentVersions`: Lưu trữ nội dung JSON body, trạng thái version (`'draft'`, `'published'`, `'archived'`), nhật ký thay đổi (`ChangeNote`).
   - `app.ContentPrivateConfigs`: Lưu trữ đáp án Quiz bí mật (`AnswerConfig`). Tách biệt hoàn toàn khỏi Client để tránh gian lận.
3. **Phân hệ Template & Lộ trình:**
   - `app.Templates`, `app.Milestones`, `app.TemplateItems`: Cấu trúc lộ trình chuẩn, thứ tự giai đoạn, ngày mở khóa bài học (`AvailableOffsetDays`), quy tắc hoàn thành.
   - `app.EmployeeJourneys`: Lưu snapshot phiên bản template tại thời điểm gán.
   - `app.JourneyActivities`: **Immutable Snapshot** của từng nhiệm vụ từ `TemplateItems` và `Contents`. Đảm bảo khi template hoặc bài học gốc thay đổi, lộ trình đang học của nhân sự không bị xáo trộn.
   - `app.JourneyActivityPrivate`: Lưu đáp án quiz bí mật gắn riêng với từng activity của nhân viên.
4. **Phân hệ Tiến độ & Kiểm toán:**
   - `app.ActivitySubmissions`: Lưu kết quả trả lời câu hỏi Quiz hoặc dữ liệu điền Form.
   - `audit.ActivityEvents`: Lưu nhật ký kiểm toán hành vi (assigned, self_confirmed, admin_completed, waived, reopened) kèm ID người thực hiện và metadata JSON.
5. **Bộ Stored Procedures cốt lõi (`02_StoredProcedures_BeeWelcome.sql`):**
   - `app.sp_PublishContent`: Xuất bản bài học, bóc tách đáp án quiz sang `ContentPrivateConfigs`.
   - `app.sp_AssignTemplateToEmployee`: Xác thực phạm vi đối tượng, snapshot toàn bộ bài học sang `JourneyActivities`.
   - `app.sp_CompleteJourneyActivity`: Chấm điểm Quiz trên server, kiểm tra ngày mở khóa, ghi nhận điểm số và tạo event kiểm toán.
   - `app.sp_ManageJourneyActivity`: Quyền HR Admin để hoàn thành, miễn trừ hoặc mở lại bài học kèm lý do bắt buộc.
   - `app.sp_PreviewTemplateJourneyUpdates` & `app.sp_ApplyTemplateJourneyUpdates`: Cơ chế cập nhật lộ trình có kiểm soát, bảo lưu 100% nhiệm vụ đã hoàn thành.

---

## 4. Key Engineering Invariants & Coding Standards

Khi phát triển hoặc can thiệp vào codebase này, Agent bắt buộc phải tuân thủ các nguyên tắc sau:

### 4.1. Security & Authorization Invariant
- **Zero Raw Table Writes from Client**: Mọi tác vụ ghi dữ liệu nhạy cảm (hoàn thành bài học, gán lộ trình, duyệt tiến độ) phải đi qua Stored Procedures có transaction bảo vệ.
- **Answer Key Concealment**: Tuyệt đối không gửi đáp án câu hỏi Quiz về Client. Tầng giao diện chỉ nhận danh sách lựa chọn; việc chấm điểm diễn ra 100% trong Stored Procedure `app.sp_CompleteJourneyActivity`.
- **Role Verification**: Mọi Server Action, Server Component và API Route phải gọi `requireRole('hr_admin')` hoặc `requireRole('employee')` từ [`src/features/auth/session.ts`](file:///c:/Users/G531/Desktop/Yumesekai/GitHub/BeeWelcome/src/features/auth/session.ts).

### 4.2. UI/UX Design System Invariants
- **Bảng màu chuẩn**:
  - `var(--color-primary)`: Bee Orange `#FF5A00`
  - `var(--color-accent)`: Bee Yellow `#FFC928`
  - `var(--color-text-main)`: Charcoal `#252525`
  - `var(--color-bg-card)`: Pure White `#FFFFFF`
- **Độ tương phản khi Hover**: Tuyệt đối không được để chữ biến mất hoặc trùng màu nền khi rê chuột vào thẻ, nút bấm, hay câu hỏi quiz. Áp dụng quy tắc bảo vệ chữ trong `globals.css`.
- **Micro-Animations**: Duy trì hiệu ứng vỗ cánh sinh động của linh vật Ong (`BeeMascot`), thanh tiến độ kim loại lấp lánh (`shimmerProgress`) và chuyển động nhấc nhẹ thẻ khi hover (`card-interactive`).

### 4.3. Code Completeness & Zero-Truncation
- Không sử dụng code stubs (`// TODO`, `/* rest of code */`, `pass`, `...`).
- Mọi hàm, component và action phải hoàn chỉnh, có type definition chuẩn xác và xử lý lỗi cụ thể.

---

## 5. Development & Verification Commands

- **Cài đặt thư viện**:
  ```bash
  npm.cmd ci
  ```
- **Kiểm tra kiểu dữ liệu (TypeScript)**:
  ```bash
  npm.cmd run typecheck
  ```
- **Kiểm tra cú pháp & Linting**:
  ```bash
  npm.cmd run lint
  ```
- **Build ứng dụng Production**:
  ```bash
  npm.cmd run build
  ```
- **Khởi chạy môi trường Dev**:
  ```bash
  npm.cmd run dev
  ```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
