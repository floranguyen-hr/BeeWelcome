# Bee Logistics Design System & Brand Guidelines (DESIGN.md)

> **Identity:** Bee Logistics Internal Onboarding & LMS Portal (BeeWelcome)  
> **Brand Spirit:** *Be expert in logistics*  
> **Craft Standard:** Impeccable + Anthropic Frontend Design + UI/UX Pro Max + Vercel Web Design Guidelines

---

## 1. Brand Color System (Strict Palette)

| Token Name | Hex Code | Role & Usage |
|---|---|---|
| **Bee Orange** | `#FF5A00` | **Màu chủ đạo (Primary):** Logo thương hiệu, nút hành động chính (Primary CTA), mốc bài học đang mở (Active Milestone), thanh tiến độ chính và điểm nhấn nổi bật. |
| **Pure White** | `#FFFFFF` | **Nền chính (Canvas & Card):** Giúp toàn bộ giao diện thoáng đạt, sạch sẽ, tinh tế và chuyên nghiệp. |
| **Charcoal** | `#252525` | **Màu chữ & Tiêu đề:** Văn bản chính, heading h1-h6, nhãn quan trọng cần độ tương phản cao (> 13:1 WCAG AAA). |
| **Bee Yellow** | `#FFC928` | **Điểm nhấn phụ (Accent):** Huy hiệu nổi bật, chi tiết mascot, trạng thái đang chờ xử lý; dùng có chủ đích và không lạm dụng tràn lan. |
| **Soft Gray** | `#F4F4F2` | **Nền phụ (Subtle Background):** Khung inset, divider phân tách khu vực, thẻ phụ trợ để mắt nhìn dễ chịu, không bị chói gắt. |

### Semantic State Colors
- **Success:** `#10B981` (Hoàn thành mốc, bài kiểm tra đạt, kích hoạt thành công)
- **Warning:** `#F59E0B` (Sắp đến hạn, cần bổ sung tài liệu)
- **Danger:** `#EF4444` (Quá hạn, lỗi nghiệp vụ, xác nhận xóa tài khoản)
- **Locked/Muted:** `#8A8A86` (Nhiệm vụ chưa mở khóa, thông tin thứ cấp)

---

## 2. Typography Hierarchy

- **Heading Font:** `Plus Jakarta Sans` (400, 500, 600, 700, 800) — Mang lại cảm giác hiện đại, vững chãi, uy tín của tập đoàn logistics hàng đầu.
- **Body Font:** `Inter` (400, 500, 600) — Cực kỳ sắc nét, dễ đọc trên mọi kích thước màn hình và thiết bị di động.
- **Scale:**
  - `Display / Hero Title:` `2rem` – `2.5rem` (`700` – `800`)
  - `Section Heading (H2):` `1.4rem` – `1.65rem` (`700`)
  - `Card Title (H3):` `1.1rem` – `1.25rem` (`600`)
  - `Body Regular:` `15px / 1.6` (`400`)
  - `Microcopy / Meta:` `0.78rem` – `0.85rem` (`500`)

---

## 3. Brand Identity & Mascot Integration

- **Logo:** Biểu trưng chính hãng Bee Logistics tại `public/brand/bee-logistics-logo.png`.
- **Mascot Philosophy (Chú Ong Hội Nhập):**
  - Xuất hiện có chủ đích: Lời chào đón nhân viên mới tại đỉnh trang Onboarding (`WelcomeHeader`), khuyến khích và cổ vũ khi hoàn thành từng chặng mốc.
  - Tuyệt đối không biến giao diện thành trò chơi hoạt hình trẻ con; mascot đóng vai trò người đồng hành thân thiện, chuyên nghiệp (*"Welcome to Bee Logistics!"*).

---

## 4. Component Standards

- **Buttons:**
  - *Primary Button:* Nền `#FF5A00`, chữ `#FFFFFF`, bo góc `10px`, hover đổ bóng cam nhẹ `0 4px 14px rgba(255, 90, 0, 0.35)`.
  - *Secondary Button:* Nền `#FFFFFF`, viền `#E2E2DE`, hover nền `#F4F4F2`.
- **Cards & Surface Elevation:**
  - Nền `#FFFFFF`, viền mỏng `1px solid #EDEDEA`, bo góc `14px`.
  - Đổ bóng tinh tế: `0 4px 20px -2px rgba(37, 37, 37, 0.05)`.
- **Tables & Forms:**
  - Header bảng nền `#F4F4F2`, padding `0.85rem 1rem`.
  - Input focus: Viền `#FF5A00` kèm focus ring `0 0 0 3px rgba(255, 90, 0, 0.15)`.
