---
name: impeccable
description: Phản biện thẩm mỹ, phát hiện lỗi bố cục vi mô, loại bỏ chi tiết thô vụng và đánh bóng (polish) giao diện đến từng pixel.
---

# Impeccable — Đánh Giá Thiết Kế, Phát Hiện Lỗi & Tinh Chỉnh Pixel-Perfect

Bộ kỹ năng này hoạt động như một Giám đốc Nghệ thuật (Design Director) và Chuyên gia Kiểm thử Giao diện khắt khe, rà soát từng màn hình nhằm loại bỏ mọi dấu vết cẩu thả, lệch lạc hoặc sơ sài.

---

## 1. Bộ Danh Sách Kiểm Tra "Lỗi Thiết Kế Điển Hình" (Design Smell Checklist)

Mỗi khi sinh mã hoặc tái cấu trúc giao diện, phải soi chiếu kỹ qua các tiêu chí sau:

1. ❌ **Căn lề lệch lạc (Misalignment)**:
   - Các icon và nhãn text không thẳng hàng theo trục ngang (`inline-flex items-center` hoặc `align-items: center` bị thiếu).
   - Card padding không đều (bên trái 24px nhưng bên phải 16px).
   - Khoảng cách giữa các phần tử liên quan (title và subtitle) xa hơn khoảng cách giữa hai khối không liên quan (vi phạm quy luật Proximity trong Gestalt).
2. ❌ **Độ tương phản kém (Contrast Ratio Failure)**:
   - Text xám nhạt trên nền xám trung tính (khó đọc, gây mỏi mắt).
   - Nút bấm màu vàng chanh nhưng lại dùng text trắng (không đọc được).
3. ❌ **Bo góc bất đối xứng (Radius Inconsistency)**:
   - Thẻ ngoài bo góc 16px nhưng nút bên trong bo góc 0px nhọn hoắt hoặc 24px tròn lố bịch. (Quy tắc lồng bo góc: `radius_inner = radius_outer - padding`).
4. ❌ **Nhấp nháy & Giật cục (Layout Shifts & Jerky Transitions)**:
   - Khi hover vào nút bấm, viền border 1px xuất hiện làm cả component xung quanh bị giật chuyển vị trí (phải dùng sẵn border 1px trong suốt hoặc `box-shadow` inset).
   - Skeleton loading không khớp với kích thước của nội dung sau khi load xong.
5. ❌ **Giao diện "Câm nín" (Lack of Feedback)**:
   - Người dùng bấm nút submit nhưng giao diện đơ ra, không có loading indicator hay disable trạng thái bấm nhiều lần (anti-spam).

---

## 2. Các Bước "Polish" Đẳng Cấp (The Polish Ritual)

1. **Hiệu ứng Kính Mờ & Ánh Sáng Tinh Tế (Subtle Lighting & Glassmorphism)**:
   - Thêm lớp viền highlight trên cùng của Card (`border-t: 1px solid rgba(255, 255, 255, 0.6)` đối với light mode hoặc `rgba(255, 255, 255, 0.1)` đối với dark mode) để tạo cảm giác có ánh sáng rọi từ trên trần xuống.
2. **Dynamic Empty States**:
   - Khi danh sách trống (không có journey, không có template, không có feedback), cấm để một dòng text cụt lủn "No data".
   - Phải thiết kế Empty State gồm: Minh họa icon nghệ thuật, tiêu đề ấm áp, đoạn mô tả hướng dẫn, và nút CTA tạo mới trực diện.
3. **Smooth Interactive State**:
   - Mọi thao tác click/hover đều có phản hồi xúc giác thị giác (scale 0.98 khi active/click, bóng đổ mềm khi hover).
4. **Typography Polish**:
   - Áp dụng `text-wrap: balance` cho tiêu đề chính để tránh tình trạng chữ mồ côi (single orphan word ở dòng dưới).
   - Dùng tabular figures (`font-variant-numeric: tabular-nums`) cho các bảng số liệu, ngày tháng và thanh phần trăm tiến độ để các con số không bị nhảy bề ngang khi thay đổi.
