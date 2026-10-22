# Bee Logistics Onboarding Platform --- Codex Project Pack

Bộ tài liệu yêu cầu để Codex xây dựng prototype hệ thống onboarding có
thể vận hành, có đăng nhập riêng, database cloud dùng chung và kiến trúc
dễ bảo trì/nâng cấp.

## Đọc theo thứ tự

1.  `AGENTS.md` --- quy tắc bắt buộc Codex phải tuân theo trong toàn bộ
    repository.
2.  `skill.md` --- quy trình làm việc chuyên biệt cho dự án onboarding.
3.  `docs/PRODUCT_REQUIREMENTS.md` --- mục tiêu, phạm vi, vai trò và
    chức năng sản phẩm.
4.  `docs/UX_AND_USER_FLOWS.md` --- cấu trúc màn hình và luồng người
    dùng.
5.  `docs/TECHNICAL_ARCHITECTURE.md` --- kiến trúc ứng dụng, công nghệ
    đề xuất, quy tắc phân lớp.
6.  `docs/DATA_MODEL.md` --- mô hình dữ liệu và quan hệ.
7.  `docs/SECURITY_AND_PRIVACY.md` --- yêu cầu bảo mật, phân quyền và dữ
    liệu test.
8.  `docs/PROGRESS_RULES.md` --- quy tắc tính tiến độ, trạng thái hoạt
    động và thời điểm mở khóa.
9.  `docs/CONTENT_AND_TEMPLATE_RULES.md` --- quản lý thư viện nội dung,
    template, phiên bản và áp dụng thay đổi.
10. `docs/IMPLEMENTATION_PLAN.md` --- các giai đoạn xây dựng và tiêu chí
    nghiệm thu.
11. `docs/TEST_PLAN.md` --- checklist test chức năng, quyền và dữ liệu.
12. `docs/DECISIONS_AND_OPEN_QUESTIONS.md` --- quyết định đã chốt và các
    điểm cần giữ cấu hình hoặc hỏi lại.

## Cách dùng

-   Đặt toàn bộ thư mục/tệp này ở root repository của dự án.
-   Cung cấp repository cho Codex và yêu cầu Codex đọc `AGENTS.md`,
    `skill.md` cùng toàn bộ tài liệu trong `docs/` trước khi chỉnh sửa
    code.
-   Yêu cầu Codex khảo sát codebase hiện có trước; không ghi đè cấu trúc
    hiện tại một cách mù quáng.
-   Khi bắt đầu triển khai, Codex cần đề xuất kế hoạch ngắn, nêu file sẽ
    tạo/sửa và lý do, sau đó triển khai từng giai đoạn.
-   Đây là đặc tả cho prototype/pilot dùng dữ liệu giả. Không sử dụng dữ
    liệu nhân sự thật của Bee Logistics trước khi được công ty phê duyệt
    và rà soát bảo mật.

## Nguyên tắc sản phẩm

Hệ thống phải là một ứng dụng onboarding có thể vận hành, không chỉ là
website tĩnh. HR có thể tạo nội dung, cấu hình lộ trình, gán lộ trình
cho nhân viên, nhân viên hoàn thành hoạt động và HR theo dõi tiến độ. Dữ
liệu phải được lưu trong database cloud dùng chung để nhiều tài khoản
truy cập từ các thiết bị khác nhau.
