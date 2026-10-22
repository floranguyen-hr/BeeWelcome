-- ============================================================================
-- SCRIPT: 03_SeedData_BeeWelcome.sql
-- ARCHITECTURE: Synthetic Demo Data for BeeWelcome SQL Server Database
-- ENGINE: Microsoft SQL Server (T-SQL) & SSMS Ready
-- TARGET DATABASE: BeeWelcomeDB
-- DESCRIPTION: Nạp dữ liệu mẫu an toàn (Idempotent Synthetic Data):
--              - 4 Tài khoản demo: 1 HR Admin, 1 HRD, 2 Nhân viên (Employee A & B)
--              - 5 Nội dung đào tạo (Text, Task, Quiz có tính điểm, Form khảo sát)
--              - 1 Template chuẩn Onboarding với 2 Milestones
--              - Gán 2 Lộ trình Journey thực tế cho Employee A & B kèm Snapshots
--              - Danh bạ hỗ trợ Support Directory & UX Feedback mẫu
-- ============================================================================

USE BeeWelcomeDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

PRINT '>> Bắt đầu nạp dữ liệu synthetic cho BeeWelcomeDB...';

-- ============================================================================
-- 1. TẠO TÀI KHOẢN AUTH & PROFILES MẪU (ID CỐ ĐỊNH ĐỂ DỄ DÀNG KIỂM THỬ)
-- ============================================================================
DECLARE @AdminId UNIQUEIDENTIFIER    = '11111111-1111-1111-1111-111111111111';
DECLARE @HrdId UNIQUEIDENTIFIER      = '22222222-2222-2222-2222-222222222222';
DECLARE @EmpAId UNIQUEIDENTIFIER     = 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA';
DECLARE @EmpBId UNIQUEIDENTIFIER     = 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB';

-- Mật khẩu hash demo (SHA256 demo placeholder cho test môi trường)
DECLARE @DummyHash NVARCHAR(256) = N'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

-- Insert auth.Users
MERGE auth.Users AS target
USING (VALUES 
    (@AdminId, N'hr-admin@bee-onboarding.invalid', @DummyHash),
    (@HrdId,   N'hrd@bee-onboarding.invalid',      @DummyHash),
    (@EmpAId,  N'employee-a@bee-onboarding.invalid', @DummyHash),
    (@EmpBId,  N'employee-b@bee-onboarding.invalid', @DummyHash)
) AS source (Id, Email, PasswordHash)
ON (target.Id = source.Id)
WHEN MATCHED THEN
    UPDATE SET Email = source.Email
WHEN NOT MATCHED THEN
    INSERT (Id, Email, PasswordHash) VALUES (source.Id, source.Email, source.PasswordHash);

-- Insert app.Profiles
MERGE app.Profiles AS target
USING (VALUES 
    (@AdminId, N'hr-admin@bee-onboarding.invalid', N'HR Administrator', N'HR001', N'hr_admin', N'HQ Hanoi', N'Human Resources', N'HR Manager', N'HR Team', CAST('2026-01-01' AS DATE)),
    (@HrdId,   N'hrd@bee-onboarding.invalid',      N'HR Director',      N'HRD01', N'hr_admin', N'HQ Hanoi', N'Human Resources', N'HR Director', N'Management', CAST('2026-01-01' AS DATE)),
    (@EmpAId,  N'employee-a@bee-onboarding.invalid', N'Nguyen Van An',    N'EMP001', N'employee', N'Office Da Nang', N'Logistics Operations', N'Logistics Coordinator', N'Demo Group A', CAST(DATEADD(DAY, -2, GETDATE()) AS DATE)),
    (@EmpBId,  N'employee-b@bee-onboarding.invalid', N'Tran Thi Binh',    N'EMP002', N'employee', N'Office HCM', N'Logistics Operations', N'Warehouse Specialist', N'Demo Group B', CAST(DATEADD(DAY, -2, GETDATE()) AS DATE))
) AS source (Id, Email, DisplayName, EmployeeCode, Role, Office, Department, Position, AudienceGroup, StartDate)
ON (target.Id = source.Id)
WHEN MATCHED THEN
    UPDATE SET 
        DisplayName = source.DisplayName,
        EmployeeCode = source.EmployeeCode,
        Office = source.Office,
        Department = source.Department,
        Position = source.Position,
        AudienceGroup = source.AudienceGroup,
        StartDate = source.StartDate
WHEN NOT MATCHED THEN
    INSERT (Id, Email, DisplayName, EmployeeCode, Role, Office, Department, Position, AudienceGroup, StartDate)
    VALUES (source.Id, source.Email, source.DisplayName, source.EmployeeCode, source.Role, source.Office, source.Department, source.Position, source.AudienceGroup, source.StartDate);

PRINT '>> 4 Demo Profiles provisioned successfully.';

-- ============================================================================
-- 2. TẠO 5 NỘI DUNG ĐÀO TẠO (CONTENTS & VERSIONS)
-- ============================================================================
DECLARE @Content1 UNIQUEIDENTIFIER = 'C1111111-1111-1111-1111-111111111111';
DECLARE @Content2 UNIQUEIDENTIFIER = 'C2222222-2222-2222-2222-222222222222';
DECLARE @Content3 UNIQUEIDENTIFIER = 'C3333333-3333-3333-3333-333333333333';
DECLARE @Content4 UNIQUEIDENTIFIER = 'C4444444-4444-4444-4444-444444444444';
DECLARE @Content5 UNIQUEIDENTIFIER = 'C5555555-5555-5555-5555-555555555555';

-- Content 1: Chào mừng (Text)
IF NOT EXISTS (SELECT 1 FROM app.Contents WHERE Id = @Content1)
BEGIN
    INSERT INTO app.Contents (Id, Slug, Title, Description, Category, ContentType, ScopeType, ScopeValue, Status, OwnerId, CurrentVersion)
    VALUES (@Content1, N'welcome-bee-logistics', N'Chào Mừng Đến Với Bee Logistics', N'Tổng quan văn hóa công ty và tuần làm việc đầu tiên', N'culture', N'text', N'company', NULL, N'published', @AdminId, 1);

    INSERT INTO app.ContentVersions (ContentId, VersionNumber, Body, ChangeNote, VersionStatus, CreatedBy, PublishedBy, PublishedAt)
    VALUES (@Content1, 1, N'{"text": "Chào mừng bạn gia nhập đại gia đình Bee Logistics! Hãy sẵn sàng cho hành trình phát triển mới."}', N'Khởi tạo', N'published', @AdminId, @AdminId, SYSDATETIMEOFFSET());
END

-- Content 2: Nhiệm vụ chuẩn bị ca làm việc (Task)
IF NOT EXISTS (SELECT 1 FROM app.Contents WHERE Id = @Content2)
BEGIN
    INSERT INTO app.Contents (Id, Slug, Title, Description, Category, ContentType, ScopeType, ScopeValue, Status, OwnerId, CurrentVersion)
    VALUES (@Content2, N'shift-readiness-checklist', N'Chuẩn Bị Sẵn Sàng Thiết Bị & Thẻ Ra Vào', N'Kiểm tra đồng phục, thẻ nhân viên và tài khoản vận hành', N'operations', N'task', N'company', NULL, N'published', @AdminId, 1);

    INSERT INTO app.ContentVersions (ContentId, VersionNumber, Body, ChangeNote, VersionStatus, CreatedBy, PublishedBy, PublishedAt)
    VALUES (@Content2, 1, N'{"checklist": ["Nhận thẻ từ HR", "Cài đặt ứng dụng Bee Logistics", "Nhận trang phục bảo hộ"]}', N'Khởi tạo checklist', N'published', @AdminId, @AdminId, SYSDATETIMEOFFSET());
END

-- Content 3: Quiz trắc nghiệm an toàn thông tin (Quiz có đáp án bí mật)
IF NOT EXISTS (SELECT 1 FROM app.Contents WHERE Id = @Content3)
BEGIN
    INSERT INTO app.Contents (Id, Slug, Title, Description, Category, ContentType, ScopeType, ScopeValue, Status, OwnerId, CurrentVersion)
    VALUES (@Content3, N'security-awareness-quiz', N'Kiểm Tra Nhận Thức An Toàn Thông Tin', N'Bài kiểm tra ngắn 3 câu trắc nghiệm bắt buộc vượt qua', N'compliance', N'quiz_form', N'company', NULL, N'published', @AdminId, 1);

    -- Body public (không chứa answer_index)
    INSERT INTO app.ContentVersions (ContentId, VersionNumber, Body, ChangeNote, VersionStatus, CreatedBy, PublishedBy, PublishedAt)
    VALUES (@Content3, 1, N'{"kind": "quiz", "question": "Khi nhận được email lạ yêu cầu cung cấp mật khẩu tài khoản nội bộ, bạn cần làm gì?", "options": ["Nhập mật khẩu để kiểm tra", "Báo cáo ngay cho bộ phận IT Security", "Chuyển tiếp cho đồng nghiệp hỏi thử", "Xóa email và không nói với ai"]}', N'Khởi tạo Quiz', N'published', @AdminId, @AdminId, SYSDATETIMEOFFSET());

    -- Đáp án đúng là option 1: "Báo cáo ngay cho bộ phận IT Security" (Index 1)
    INSERT INTO app.ContentPrivateConfigs (ContentId, VersionNumber, AnswerConfig)
    VALUES (@Content3, 1, N'{"answer_index": 1, "passing_score": 1.0}');
END

-- Content 4: Form thu thập cỡ đồng phục & sở thích văn phòng (Form)
IF NOT EXISTS (SELECT 1 FROM app.Contents WHERE Id = @Content4)
BEGIN
    INSERT INTO app.Contents (Id, Slug, Title, Description, Category, ContentType, ScopeType, ScopeValue, Status, OwnerId, CurrentVersion)
    VALUES (@Content4, N'onboarding-survey-form', N'Khảo Sát Tiếp Nhận & Đăng Ký Đồng Phục', N'Thu thập thông tin kích cỡ trang phục và sở thích làm việc', N'general', N'quiz_form', N'company', NULL, N'published', @AdminId, 1);

    INSERT INTO app.ContentVersions (ContentId, VersionNumber, Body, ChangeNote, VersionStatus, CreatedBy, PublishedBy, PublishedAt)
    VALUES (@Content4, 1, N'{"kind": "form", "fields": [{"name": "uniform_size", "label": "Cỡ áo đồng phục (S/M/L/XL)", "type": "choice", "options": ["S", "M", "L", "XL", "XXL"], "required": true}, {"name": "emergency_contact", "label": "Số điện thoại liên hệ khẩn cấp", "type": "text", "required": true}]}', N'Khởi tạo Form', N'published', @AdminId, @AdminId, SYSDATETIMEOFFSET());
END

-- Content 5: Sơ đồ liên hệ hỗ trợ (Text Resource)
IF NOT EXISTS (SELECT 1 FROM app.Contents WHERE Id = @Content5)
BEGIN
    INSERT INTO app.Contents (Id, Slug, Title, Description, Category, ContentType, ScopeType, ScopeValue, Status, OwnerId, CurrentVersion)
    VALUES (@Content5, N'support-directory-guide', N'Sổ Tay Đầu Mối Trợ Giúp Nội Bộ', N'Danh sách liên hệ khi cần hỗ trợ CNTT, nhân sự hoặc văn phòng phẩm', N'guide', N'text', N'company', NULL, N'published', @AdminId, 1);

    INSERT INTO app.ContentVersions (ContentId, VersionNumber, Body, ChangeNote, VersionStatus, CreatedBy, PublishedBy, PublishedAt)
    VALUES (@Content5, 1, N'{"text": "Mọi vấn đề kỹ thuật vui lòng gửi yêu cầu về it-support@bee-logistics.invalid hoặc hotline nội bộ 101."}', N'Khởi tạo cẩm nang', N'published', @AdminId, @AdminId, SYSDATETIMEOFFSET());
END

PRINT '>> 5 Contents created & published.';

-- ============================================================================
-- 3. TẠO TEMPLATE ONBOARDING CHUẨN (2 MILESTONES & 4 ITEMS)
-- ============================================================================
DECLARE @TemplateId UNIQUEIDENTIFIER = 'EE111111-1111-1111-1111-111111111111';
DECLARE @M1Id UNIQUEIDENTIFIER       = 'DA111111-1111-1111-1111-111111111111';
DECLARE @M2Id UNIQUEIDENTIFIER       = 'DA222222-2222-2222-2222-222222222222';

IF NOT EXISTS (SELECT 1 FROM app.Templates WHERE Id = @TemplateId)
BEGIN
    INSERT INTO app.Templates (Id, Slug, Name, Description, ScopeType, ScopeValue, Status, VersionNumber, CreatedBy, PublishedBy, PublishedAt)
    VALUES (@TemplateId, N'standard-onboarding-template', N'Lộ Trình Hội Nhập Tiêu Chuẩn 2 Tuần', N'Lộ trình hội nhập dành cho toàn bộ nhân sự mới gia nhập công ty', N'company', NULL, N'published', 1, @AdminId, @AdminId, SYSDATETIMEOFFSET());

    -- Milestone 1: Tuần 1 - Khởi Động & Hội Nhập (Available: ngày 0)
    INSERT INTO app.Milestones (Id, TemplateId, Name, Sequence, AvailableOffsetDays, IsActive)
    VALUES (@M1Id, @TemplateId, N'Tuần 1: Khởi Động & Hội Nhập Văn Hóa', 0, 0, 1);

    -- Milestone 2: Tuần 2 - Vận Hành & Khảo Sát (Available: ngày 7)
    INSERT INTO app.Milestones (Id, TemplateId, Name, Sequence, AvailableOffsetDays, IsActive)
    VALUES (@M2Id, @TemplateId, N'Tuần 2: Nắm Vững Vận Hành & Đánh Giá', 1, 7, 1);

    -- Items cho Milestone 1
    INSERT INTO app.TemplateItems (MilestoneId, ContentId, Sequence, IsRequired, AvailableOffsetDays, DueOffsetDays, CompletionRule, IncludeInProgress)
    VALUES 
        (@M1Id, @Content1, 0, 1, 0, 2, N'content_acknowledgement', 1),
        (@M1Id, @Content2, 1, 1, 0, 3, N'manual_self_confirmation', 1),
        (@M1Id, @Content3, 2, 1, 1, 4, N'quiz_pass_required', 1);

    -- Items cho Milestone 2
    INSERT INTO app.TemplateItems (MilestoneId, ContentId, Sequence, IsRequired, AvailableOffsetDays, DueOffsetDays, CompletionRule, IncludeInProgress)
    VALUES 
        (@M2Id, @Content4, 0, 1, 0, 5, N'form_submission', 1),
        (@M2Id, @Content5, 1, 0, 0, NULL, N'content_acknowledgement', 0);
END

PRINT '>> Standard Template with 2 Milestones created.';

-- ============================================================================
-- 4. GÁN LỘ TRÌNH THỰC TẾ CHO EMPLOYEE A & EMPLOYEE B
-- ============================================================================
DECLARE @OutJourneyA UNIQUEIDENTIFIER, @OutJourneyB UNIQUEIDENTIFIER;
DECLARE @StartDate DATE = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE);

EXEC app.sp_AssignTemplateToEmployee 
    @TemplateId = @TemplateId, 
    @EmployeeId = @EmpAId, 
    @StartDate = @StartDate, 
    @ActorId = @AdminId, 
    @JourneyId = @OutJourneyA OUTPUT;

EXEC app.sp_AssignTemplateToEmployee 
    @TemplateId = @TemplateId, 
    @EmployeeId = @EmpBId, 
    @StartDate = @StartDate, 
    @ActorId = @AdminId, 
    @JourneyId = @OutJourneyB OUTPUT;

PRINT '>> Assigned journeys to Employee A and B with immutable snapshots.';

-- ============================================================================
-- 5. NẠP DANH BẠ HỖ TRỢ (SUPPORT DIRECTORY) & PHẢN HỒI UX MẪU
-- ============================================================================
DECLARE @Contact1 UNIQUEIDENTIFIER = 'FA111111-1111-1111-1111-111111111111';
DECLARE @Contact2 UNIQUEIDENTIFIER = 'FA222222-2222-2222-2222-222222222222';

MERGE app.SupportContacts AS target
USING (VALUES
    (@Contact1, N'Phòng Hành Chính Nhân Sự', N'Hỗ trợ chế độ, bảo hiểm, thẻ nhân viên', N'company', NULL, N'hr@bee-logistics.invalid', N'024 3999 8888', N'https://hr.bee-logistics.invalid', 1),
    (@Contact2, N'Đội Trợ Giúp CNTT (IT Helpdesk)', N'Cấp phát máy tính, tài khoản email & ERP', N'company', NULL, N'it-helpdesk@bee-logistics.invalid', N'024 3999 9999', N'https://it.bee-logistics.invalid', 1)
) AS source (Id, DisplayName, SupportRole, ScopeType, ScopeValue, ContactEmail, ContactPhone, ContactUrl, IsActive)
ON (target.Id = source.Id)
WHEN MATCHED THEN
    UPDATE SET DisplayName = source.DisplayName, ContactEmail = source.ContactEmail
WHEN NOT MATCHED THEN
    INSERT (Id, DisplayName, SupportRole, ScopeType, ScopeValue, ContactEmail, ContactPhone, ContactUrl, IsActive)
    VALUES (source.Id, source.DisplayName, source.SupportRole, source.ScopeType, source.ScopeValue, source.ContactEmail, source.ContactPhone, source.ContactUrl, source.IsActive);

-- Gửi 1 phản hồi UX mẫu từ Employee A
IF NOT EXISTS (SELECT 1 FROM app.UxFeedback WHERE EmployeeId = @EmpAId)
BEGIN
    INSERT INTO app.UxFeedback (EmployeeId, Category, Message, PagePath)
    VALUES (@EmpAId, N'roadmap', N'Giao diện lộ trình rất trực quan và dễ theo dõi!', N'/roadmap');
END

PRINT '============================================================================';
PRINT '>> SEED DATA ĐÃ ĐƯỢC NẠP THÀNH CÔNG VÀO BEEWELCOMEDB!';
PRINT '============================================================================';
