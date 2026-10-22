-- ============================================================================
-- SCRIPT: 02_StoredProcedures_BeeWelcome.sql
-- ARCHITECTURE: Database-Enforced Business Logic & RPC Procedures for BeeWelcome
-- ENGINE: Microsoft SQL Server (T-SQL) & SSMS Ready
-- TARGET DATABASE: BeeWelcomeDB
-- DESCRIPTION: Chuyển đổi toàn bộ PL/pgSQL RPC Functions sang T-SQL Stored Procedures:
--              1. app.sp_PublishContent (Soạn thảo & xuất bản Content, bóc tách Quiz answer sang bảng bí mật)
--              2. app.sp_AssignTemplateToEmployee (Xác thực Scope, Snapshot bài học sang JourneyActivities)
--              3. app.sp_CompleteJourneyActivity (Chấm điểm Quiz server-side, kiểm tra Unlock date, ghi Submissions & Audit)
--              4. app.sp_ManageJourneyActivity (HR duyệt/miễn/mở lại Activity kèm ghi chú bắt buộc)
--              5. app.sp_UpsertSupportContact & app.sp_ArchiveSupportContact (Quản lý danh bạ hỗ trợ)
--              6. app.sp_SubmitUxFeedback (Nhân viên gửi phản hồi)
--              7. app.sp_PreviewTemplateJourneyUpdates & app.sp_ApplyTemplateJourneyUpdates (Cập nhật Template an toàn)
-- ============================================================================

USE BeeWelcomeDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- HELPER FUNCTION: KIỂM TRA PHẠM VI (AUDIENCE SCOPE MATCH)
-- ============================================================================
CREATE OR ALTER FUNCTION app.fn_CheckProfileMatchesScope (
    @EmployeeId UNIQUEIDENTIFIER,
    @ScopeType NVARCHAR(30),
    @ScopeValue NVARCHAR(160)
)
RETURNS BIT
AS
BEGIN
    DECLARE @Matched BIT = 0;
    DECLARE @Office NVARCHAR(120), @Dept NVARCHAR(120), @Pos NVARCHAR(120), @Grp NVARCHAR(120);

    SELECT @Office = Office, @Dept = Department, @Pos = Position, @Grp = AudienceGroup
    FROM app.Profiles
    WHERE Id = @EmployeeId AND Role = N'employee' AND IsActive = 1;

    IF @Office IS NULL AND @Dept IS NULL AND @Pos IS NULL AND @Grp IS NULL
        RETURN 0;

    IF @ScopeType = N'company'
        SET @Matched = 1;
    ELSE IF @ScopeType = N'office' AND @Office = @ScopeValue
        SET @Matched = 1;
    ELSE IF @ScopeType = N'department' AND @Dept = @ScopeValue
        SET @Matched = 1;
    ELSE IF @ScopeType = N'position' AND @Pos = @ScopeValue
        SET @Matched = 1;
    ELSE IF @ScopeType = N'group' AND @Grp = @ScopeValue
        SET @Matched = 1;
    ELSE IF @ScopeType = N'employee' AND CAST(@EmployeeId AS NVARCHAR(50)) = @ScopeValue
        SET @Matched = 1;

    RETURN @Matched;
END;
GO

-- ============================================================================
-- 1. SP: PUBLISH CONTENT (XUẤT BẢN NỘI DUNG & TÁCH ANSWER CONFIG BÍ MẬT)
-- ============================================================================
CREATE OR ALTER PROCEDURE app.sp_PublishContent
    @ContentId UNIQUEIDENTIFIER,
    @Title NVARCHAR(200),
    @Description NVARCHAR(1000) = N'',
    @Category NVARCHAR(80) = N'general',
    @ContentType NVARCHAR(30),
    @ScopeType NVARCHAR(30) = N'company',
    @ScopeValue NVARCHAR(160) = NULL,
    @BodyJson NVARCHAR(MAX),
    @ChangeNote NVARCHAR(1000),
    @ActorId UNIQUEIDENTIFIER,
    @NewVersion INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Kiểm tra quyền HR Admin
    IF NOT EXISTS (SELECT 1 FROM app.Profiles WHERE Id = @ActorId AND Role = N'hr_admin' AND IsActive = 1)
    BEGIN
        RAISERROR(N'Quyền HR Admin là bắt buộc để xuất bản nội dung.', 16, 1);
        RETURN;
    END

    IF NULLIF(LTRIM(RTRIM(@ChangeNote)), N'') IS NULL OR ISJSON(@BodyJson) = 0
    BEGIN
        RAISERROR(N'Ghi chú cập nhật và JSON body hợp lệ là bắt buộc.', 16, 1);
        RETURN;
    END

    DECLARE @CurrentStatus NVARCHAR(20), @CurrentVer INT;
    SELECT @CurrentStatus = Status, @CurrentVer = CurrentVersion
    FROM app.Contents WITH (UPDLOCK, ROWLOCK)
    WHERE Id = @ContentId;

    IF @CurrentStatus IS NULL OR @CurrentStatus = N'archived'
    BEGIN
        RAISERROR(N'Tài nguyên nội dung không khả dụng hoặc đã bị lưu trữ.', 16, 1);
        RETURN;
    END

    -- Tách quiz answer config nếu content là quiz
    DECLARE @PublicBody NVARCHAR(MAX) = @BodyJson;
    DECLARE @AnswerConfig NVARCHAR(MAX) = N'{}';
    DECLARE @Kind NVARCHAR(50) = JSON_VALUE(@BodyJson, '$.kind');

    IF @ContentType = N'quiz_form' AND @Kind = N'quiz'
    BEGIN
        DECLARE @AnswerIndex INT = TRY_CAST(JSON_VALUE(@BodyJson, '$.answer_index') AS INT);
        DECLARE @PassingScore NUMERIC(5,4) = ISNULL(TRY_CAST(JSON_VALUE(@BodyJson, '$.passing_score') AS NUMERIC(5,4)), 1.0);

        IF @AnswerIndex IS NULL OR @AnswerIndex < 0
        BEGIN
            RAISERROR(N'Quiz bắt buộc phải có câu trả lời hợp lệ (answer_index).', 16, 1);
            RETURN;
        END

        SET @AnswerConfig = JSON_OBJECT('answer_index': @AnswerIndex, 'passing_score': @PassingScore);
        -- Bóc tách loại bỏ answer_index và passing_score khỏi public body để tránh lộ đáp án
        SET @PublicBody = JSON_MODIFY(@PublicBody, '$.answer_index', NULL);
        SET @PublicBody = JSON_MODIFY(@PublicBody, '$.passing_score', NULL);
    END

    BEGIN TRANSACTION;

    IF @CurrentStatus = N'draft'
        SET @NewVersion = CASE WHEN @CurrentVer < 1 THEN 1 ELSE @CurrentVer END;
    ELSE
        SET @NewVersion = @CurrentVer + 1;

    -- Cập nhật thông tin Content
    UPDATE app.Contents
    SET Title = @Title,
        Description = ISNULL(@Description, N''),
        Category = ISNULL(@Category, N'general'),
        ContentType = @ContentType,
        ScopeType = ISNULL(@ScopeType, N'company'),
        ScopeValue = CASE WHEN @ScopeType = N'company' THEN NULL ELSE @ScopeValue END,
        CurrentVersion = @NewVersion,
        Status = N'published'
    WHERE Id = @ContentId;

    -- Upsert Version record
    IF EXISTS (SELECT 1 FROM app.ContentVersions WHERE ContentId = @ContentId AND VersionNumber = @NewVersion)
    BEGIN
        UPDATE app.ContentVersions
        SET Body = @PublicBody,
            ChangeNote = @ChangeNote,
            VersionStatus = N'published',
            PublishedBy = @ActorId,
            PublishedAt = SYSDATETIMEOFFSET()
        WHERE ContentId = @ContentId AND VersionNumber = @NewVersion;
    END
    ELSE
    BEGIN
        INSERT INTO app.ContentVersions (ContentId, VersionNumber, Body, ChangeNote, VersionStatus, CreatedBy, PublishedBy, PublishedAt)
        VALUES (@ContentId, @NewVersion, @PublicBody, @ChangeNote, N'published', @ActorId, @ActorId, SYSDATETIMEOFFSET());
    END

    -- Ghi nhận cấu hình đáp án bí mật
    MERGE app.ContentPrivateConfigs AS target
    USING (SELECT @ContentId AS ContentId, @NewVersion AS VersionNumber) AS source
    ON (target.ContentId = source.ContentId AND target.VersionNumber = source.VersionNumber)
    WHEN MATCHED THEN
        UPDATE SET AnswerConfig = @AnswerConfig
    WHEN NOT MATCHED THEN
        INSERT (ContentId, VersionNumber, AnswerConfig)
        VALUES (source.ContentId, source.VersionNumber, @AnswerConfig);

    COMMIT TRANSACTION;
    PRINT '>> Content published successfully. Version: ' + CAST(@NewVersion AS NVARCHAR(10));
END;
GO

-- ============================================================================
-- 2. SP: ASSIGN TEMPLATE TO EMPLOYEE (GÁN LỘ TRÌNH VÀ SNAPSHOT BẤT BIẾN)
-- ============================================================================
CREATE OR ALTER PROCEDURE app.sp_AssignTemplateToEmployee
    @TemplateId UNIQUEIDENTIFIER,
    @EmployeeId UNIQUEIDENTIFIER,
    @StartDate DATE,
    @ActorId UNIQUEIDENTIFIER,
    @JourneyId UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1. Kiểm tra quyền HR Admin
    IF NOT EXISTS (SELECT 1 FROM app.Profiles WHERE Id = @ActorId AND Role = N'hr_admin' AND IsActive = 1)
    BEGIN
        RAISERROR(N'Quyền HR Admin là bắt buộc để gán lộ trình.', 16, 1);
        RETURN;
    END

    -- 2. Kiểm tra Template published
    DECLARE @TplName NVARCHAR(160), @TplVersion INT, @TplScopeType NVARCHAR(30), @TplScopeValue NVARCHAR(160);
    SELECT @TplName = Name, @TplVersion = VersionNumber, @TplScopeType = ScopeType, @TplScopeValue = ScopeValue
    FROM app.Templates
    WHERE Id = @TemplateId AND Status = N'published' AND VersionNumber > 0;

    IF @TplName IS NULL
    BEGIN
        RAISERROR(N'Không tìm thấy Template đã xuất bản.', 16, 1);
        RETURN;
    END

    -- 3. Kiểm tra Employee hợp lệ & Scope
    IF NOT EXISTS (SELECT 1 FROM app.Profiles WHERE Id = @EmployeeId AND Role = N'employee' AND IsActive = 1)
    BEGIN
        RAISERROR(N'Không tìm thấy nhân viên đang hoạt động.', 16, 1);
        RETURN;
    END

    IF app.fn_CheckProfileMatchesScope(@EmployeeId, @TplScopeType, @TplScopeValue) = 0
    BEGIN
        RAISERROR(N'Nhân viên nằm ngoài phạm vi áp dụng (audience scope) của Template này.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    -- Kiểm tra xem đã gán phiên bản này chưa (Idempotency)
    SELECT @JourneyId = Id
    FROM app.EmployeeJourneys
    WHERE EmployeeId = @EmployeeId AND TemplateId = @TemplateId AND TemplateVersion = @TplVersion;

    IF @JourneyId IS NULL
    BEGIN
        SET @JourneyId = NEWID();
        INSERT INTO app.EmployeeJourneys (Id, EmployeeId, TemplateId, TemplateVersion, TitleSnapshot, StartDate, Status, AssignedBy)
        VALUES (@JourneyId, @EmployeeId, @TemplateId, @TplVersion, @TplName, @StartDate, N'active', @ActorId);

        -- Bảng tạm lưu danh sách activities cần snapshot
        DECLARE @ActivitySnapshots TABLE (
            ActivityId UNIQUEIDENTIFIER,
            TemplateItemId UNIQUEIDENTIFIER,
            ContentId UNIQUEIDENTIFIER,
            ContentVersion INT,
            Title NVARCHAR(200),
            Description NVARCHAR(1000),
            ContentType NVARCHAR(30),
            ContentBody NVARCHAR(MAX),
            MilestoneName NVARCHAR(120),
            MilestoneSeq INT,
            ActivitySeq INT,
            IsRequired BIT,
            AvailableAt DATE,
            DueAt DATE,
            CompletionRule NVARCHAR(40),
            IncludeInProgress BIT,
            AnswerConfig NVARCHAR(MAX),
            Settings NVARCHAR(MAX)
        );

        INSERT INTO @ActivitySnapshots
        SELECT 
            NEWID(),
            ti.Id,
            c.Id,
            c.CurrentVersion,
            c.Title,
            c.Description,
            c.ContentType,
            cv.Body,
            m.Name,
            m.Sequence,
            ti.Sequence,
            ti.IsRequired,
            DATEADD(DAY, m.AvailableOffsetDays + ti.AvailableOffsetDays, @StartDate),
            CASE WHEN ti.DueOffsetDays IS NULL THEN NULL 
                 ELSE DATEADD(DAY, m.AvailableOffsetDays + ti.AvailableOffsetDays + ti.DueOffsetDays, @StartDate) END,
            ti.CompletionRule,
            ti.IncludeInProgress,
            ISNULL(pc.AnswerConfig, N'{}'),
            ISNULL(ti.Settings, N'{}')
        FROM app.Milestones m
        INNER JOIN app.TemplateItems ti ON ti.MilestoneId = m.Id
        INNER JOIN app.Contents c ON c.Id = ti.ContentId
        INNER JOIN app.ContentVersions cv ON cv.ContentId = c.Id AND cv.VersionNumber = c.CurrentVersion AND cv.VersionStatus = N'published'
        LEFT JOIN app.ContentPrivateConfigs pc ON pc.ContentId = c.Id AND pc.VersionNumber = c.CurrentVersion
        WHERE m.TemplateId = @TemplateId AND m.IsActive = 1 AND ti.IsActive = 1
        ORDER BY m.Sequence, ti.Sequence;

        -- Insert vào app.JourneyActivities
        INSERT INTO app.JourneyActivities (
            Id, JourneyId, SourceTemplateItemId, SourceContentId, ContentVersion,
            TitleSnapshot, DescriptionSnapshot, ContentTypeSnapshot, ContentBodySnapshot,
            MilestoneNameSnapshot, MilestoneSequence, ActivitySequence, IsRequired,
            AvailableAt, DueAt, CompletionRule, IncludeInProgress, Status
        )
        SELECT 
            ActivityId, @JourneyId, TemplateItemId, ContentId, ContentVersion,
            Title, Description, ContentType, ContentBody,
            MilestoneName, MilestoneSeq, ActivitySeq, IsRequired,
            AvailableAt, DueAt, CompletionRule, IncludeInProgress, N'not_started'
        FROM @ActivitySnapshots;

        -- Insert vào app.JourneyActivityPrivate
        INSERT INTO app.JourneyActivityPrivate (JourneyActivityId, AnswerConfigSnapshot, SettingsSnapshot)
        SELECT ActivityId, AnswerConfig, Settings
        FROM @ActivitySnapshots;

        -- Ghi nhật ký audit sự kiện 'assigned'
        INSERT INTO audit.ActivityEvents (JourneyActivityId, JourneyId, ActorId, EventType, EventData)
        SELECT ActivityId, @JourneyId, @ActorId, N'assigned', JSON_OBJECT('template_id': CAST(@TemplateId AS NVARCHAR(50)), 'template_version': @TplVersion)
        FROM @ActivitySnapshots;
    END

    COMMIT TRANSACTION;
    PRINT '>> Journey assigned successfully. JourneyId: ' + CAST(@JourneyId AS NVARCHAR(50));
END;
GO

-- ============================================================================
-- 3. SP: COMPLETE JOURNEY ACTIVITY (CHẤM ĐIỂM SERVER-SIDE & HOÀN THÀNH NHIỆM VỤ)
-- ============================================================================
CREATE OR ALTER PROCEDURE app.sp_CompleteJourneyActivity
    @ActivityId UNIQUEIDENTIFIER,
    @ActorId UNIQUEIDENTIFIER,
    @PayloadJson NVARCHAR(MAX),
    @Completed BIT OUTPUT,
    @Score NUMERIC(5,4) OUTPUT,
    @Passed BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @Completed = 0;
    SET @Score = NULL;
    SET @Passed = NULL;

    IF ISJSON(@PayloadJson) = 0
    BEGIN
        RAISERROR(N'Payload JSON không hợp lệ.', 16, 1);
        RETURN;
    END

    -- Đọc thông tin Activity & Journey
    DECLARE @JourneyId UNIQUEIDENTIFIER, @EmpId UNIQUEIDENTIFIER, @Rule NVARCHAR(40), @AvailDate DATE, @ActStatus NVARCHAR(20);
    DECLARE @ContentBody NVARCHAR(MAX), @AnswerConfig NVARCHAR(MAX);

    SELECT 
        @JourneyId = a.JourneyId,
        @EmpId = j.EmployeeId,
        @Rule = a.CompletionRule,
        @AvailDate = a.AvailableAt,
        @ActStatus = a.Status,
        @ContentBody = a.ContentBodySnapshot,
        @AnswerConfig = p.AnswerConfigSnapshot
    FROM app.JourneyActivities a WITH (UPDLOCK, ROWLOCK)
    INNER JOIN app.EmployeeJourneys j ON j.Id = a.JourneyId
    LEFT JOIN app.JourneyActivityPrivate p ON p.JourneyActivityId = a.Id
    WHERE a.Id = @ActivityId;

    IF @JourneyId IS NULL
    BEGIN
        RAISERROR(N'Không tìm thấy Activity tương ứng.', 16, 1);
        RETURN;
    END

    IF @EmpId <> @ActorId
    BEGIN
        RAISERROR(N'Chỉ nhân viên được gán lộ trình mới có quyền hoàn thành nhiệm vụ này.', 16, 1);
        RETURN;
    END

    IF @AvailDate > CAST(SYSDATETIMEOFFSET() AS DATE)
    BEGIN
        RAISERROR(N'Nhiệm vụ này hiện vẫn đang bị khóa (chưa đến ngày mở).', 16, 1);
        RETURN;
    END

    IF @ActStatus IN (N'completed', N'waived', N'removed')
    BEGIN
        RAISERROR(N'Nhiệm vụ này không thể hoàn thành ở trạng thái hiện tại.', 16, 1);
        RETURN;
    END

    DECLARE @EventType NVARCHAR(40), @Source NVARCHAR(40);
    DECLARE @Note NVARCHAR(500) = SUBSTRING(LTRIM(RTRIM(JSON_VALUE(@PayloadJson, '$.note'))), 1, 500);

    BEGIN TRANSACTION;

    IF @Rule = N'manual_self_confirmation'
    BEGIN
        IF JSON_VALUE(@PayloadJson, '$.confirmed') <> 'true'
        BEGIN
            RAISERROR(N'Bạn cần xác nhận đã hoàn thành công việc thực tế.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END
        SET @Completed = 1;
        SET @Source = N'employee_self_confirmation';
        SET @EventType = N'self_confirmed';
    END
    ELSE IF @Rule = N'content_acknowledgement'
    BEGIN
        IF JSON_VALUE(@PayloadJson, '$.acknowledged') <> 'true'
        BEGIN
            RAISERROR(N'Bạn cần xác nhận đã đọc và hiểu nội dung.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END
        SET @Completed = 1;
        SET @Source = N'content_acknowledgement';
        SET @EventType = N'content_acknowledged';
    END
    ELSE IF @Rule = N'form_submission'
    BEGIN
        DECLARE @AnswersJson NVARCHAR(MAX) = JSON_QUERY(@PayloadJson, '$.answers');
        IF @AnswersJson IS NULL
        BEGIN
            RAISERROR(N'Nội dung form nộp không hợp lệ.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END
        INSERT INTO app.ActivitySubmissions (JourneyActivityId, JourneyId, EmployeeId, AnswerPayload, Passed)
        VALUES (@ActivityId, @JourneyId, @ActorId, @AnswersJson, 1);

        SET @Completed = 1;
        SET @Source = N'form_submission';
        SET @EventType = N'form_submitted';
    END
    ELSE IF @Rule IN (N'quiz_participation', N'quiz_pass_required')
    BEGIN
        DECLARE @UserAnswerIndex INT = TRY_CAST(JSON_VALUE(@PayloadJson, '$.answer_index') AS INT);
        DECLARE @CorrectIndex INT = TRY_CAST(JSON_VALUE(@AnswerConfig, '$.answer_index') AS INT);
        DECLARE @PassScore NUMERIC(5,4) = ISNULL(TRY_CAST(JSON_VALUE(@AnswerConfig, '$.passing_score') AS NUMERIC(5,4)), 1.0);

        IF @UserAnswerIndex IS NULL OR @CorrectIndex IS NULL
        BEGIN
            RAISERROR(N'Câu trả lời hoặc cấu hình chấm điểm Quiz không hợp lệ.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        SET @Score = CASE WHEN @UserAnswerIndex = @CorrectIndex THEN 1.0 ELSE 0.0 END;
        SET @Passed = CASE WHEN @Score >= @PassScore THEN 1 ELSE 0 END;

        INSERT INTO app.ActivitySubmissions (JourneyActivityId, JourneyId, EmployeeId, AnswerPayload, Score, Passed)
        VALUES (@ActivityId, @JourneyId, @ActorId, JSON_OBJECT('answer_index': @UserAnswerIndex), @Score, @Passed);

        SET @EventType = N'quiz_submitted';
        IF @Rule = N'quiz_participation'
        BEGIN
            SET @Completed = 1;
            SET @Source = N'quiz_participation';
        END
        ELSE
        BEGIN
            SET @Completed = @Passed;
            SET @Source = N'quiz_pass';
        END
    END

    -- Cập nhật trạng thái nhiệm vụ
    IF @Completed = 1
    BEGIN
        UPDATE app.JourneyActivities
        SET Status = N'completed',
            CompletedAt = SYSDATETIMEOFFSET(),
            CompletedBy = @ActorId,
            CompletionSource = @Source,
            CompletionNote = @Note
        WHERE Id = @ActivityId;
    END
    ELSE
    BEGIN
        UPDATE app.JourneyActivities
        SET Status = N'in_progress'
        WHERE Id = @ActivityId;
    END

    -- Ghi nhật ký kiểm toán
    INSERT INTO audit.ActivityEvents (JourneyActivityId, JourneyId, ActorId, EventType, EventData)
    VALUES (
        @ActivityId,
        @JourneyId,
        @ActorId,
        @EventType,
        JSON_OBJECT(
            'completed': @Completed,
            'score': @Score,
            'passed': @Passed,
            'source': @Source
        )
    );

    COMMIT TRANSACTION;
END;
GO

-- ============================================================================
-- 4. SP: MANAGE JOURNEY ACTIVITY (HR DUYỆT / MIỄN / MỞ LẠI NHIỆM VỤ)
-- ============================================================================
CREATE OR ALTER PROCEDURE app.sp_ManageJourneyActivity
    @ActivityId UNIQUEIDENTIFIER,
    @Action NVARCHAR(20),
    @Note NVARCHAR(500),
    @ActorId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM app.Profiles WHERE Id = @ActorId AND Role = N'hr_admin' AND IsActive = 1)
    BEGIN
        RAISERROR(N'Quyền HR Admin là bắt buộc.', 16, 1);
        RETURN;
    END

    IF @Action NOT IN (N'complete', N'waive', N'reopen') OR NULLIF(LTRIM(RTRIM(@Note)), N'') IS NULL
    BEGIN
        RAISERROR(N'Thao tác không hợp lệ hoặc thiếu ghi chú kiểm toán.', 16, 1);
        RETURN;
    END

    DECLARE @CurrentStatus NVARCHAR(20), @JourneyId UNIQUEIDENTIFIER;
    SELECT @CurrentStatus = Status, @JourneyId = JourneyId
    FROM app.JourneyActivities WITH (UPDLOCK, ROWLOCK)
    WHERE Id = @ActivityId;

    IF @CurrentStatus IS NULL
    BEGIN
        RAISERROR(N'Không tìm thấy nhiệm vụ.', 16, 1);
        RETURN;
    END

    DECLARE @NewStatus NVARCHAR(20), @EventType NVARCHAR(40);
    BEGIN TRANSACTION;

    IF @Action = N'complete'
    BEGIN
        IF @CurrentStatus IN (N'completed', N'waived', N'removed')
        BEGIN
            RAISERROR(N'Không thể duyệt hoàn thành nhiệm vụ ở trạng thái này.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END
        SET @NewStatus = N'completed';
        SET @EventType = N'admin_completed';

        UPDATE app.JourneyActivities
        SET Status = N'completed',
            CompletedAt = SYSDATETIMEOFFSET(),
            CompletedBy = @ActorId,
            CompletionSource = N'hr_admin',
            CompletionNote = @Note
        WHERE Id = @ActivityId;
    END
    ELSE IF @Action = N'waive'
    BEGIN
        IF @CurrentStatus IN (N'completed', N'waived', N'removed')
        BEGIN
            RAISERROR(N'Không thể miễn trừ nhiệm vụ ở trạng thái này.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END
        SET @NewStatus = N'waived';
        SET @EventType = N'waived';

        UPDATE app.JourneyActivities
        SET Status = N'waived',
            CompletedAt = NULL,
            CompletedBy = NULL,
            CompletionSource = NULL,
            CompletionNote = @Note
        WHERE Id = @ActivityId;
    END
    ELSE IF @Action = N'reopen'
    BEGIN
        IF @CurrentStatus NOT IN (N'completed', N'waived')
        BEGIN
            RAISERROR(N'Chỉ có thể mở lại các nhiệm vụ đã hoàn thành hoặc được miễn trừ.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END
        SET @NewStatus = N'not_started';
        SET @EventType = N'reopened';

        UPDATE app.JourneyActivities
        SET Status = N'not_started',
            CompletedAt = NULL,
            CompletedBy = NULL,
            CompletionSource = NULL,
            CompletionNote = NULL
        WHERE Id = @ActivityId;
    END

    INSERT INTO audit.ActivityEvents (JourneyActivityId, JourneyId, ActorId, EventType, EventData)
    VALUES (@ActivityId, @JourneyId, @ActorId, @EventType, JSON_OBJECT('action': @Action, 'note': @Note));

    COMMIT TRANSACTION;
    PRINT '>> Activity managed successfully: ' + @Action;
END;
GO

-- ============================================================================
-- 5. SP: UPSERT & ARCHIVE SUPPORT CONTACT
-- ============================================================================
CREATE OR ALTER PROCEDURE app.sp_UpsertSupportContact
    @ContactId UNIQUEIDENTIFIER = NULL,
    @DisplayName NVARCHAR(120),
    @SupportRole NVARCHAR(120),
    @ScopeType NVARCHAR(30) = N'company',
    @ScopeValue NVARCHAR(160) = NULL,
    @ContactEmail NVARCHAR(320) = NULL,
    @ContactPhone NVARCHAR(80) = NULL,
    @ContactUrl NVARCHAR(1000) = NULL,
    @ActorId UNIQUEIDENTIFIER,
    @ResultContactId UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM app.Profiles WHERE Id = @ActorId AND Role = N'hr_admin' AND IsActive = 1)
    BEGIN
        RAISERROR(N'Quyền HR Admin là bắt buộc.', 16, 1);
        RETURN;
    END

    IF @ContactId IS NULL
    BEGIN
        SET @ResultContactId = NEWID();
        INSERT INTO app.SupportContacts (Id, DisplayName, SupportRole, ScopeType, ScopeValue, ContactEmail, ContactPhone, ContactUrl, IsActive)
        VALUES (@ResultContactId, @DisplayName, @SupportRole, @ScopeType, CASE WHEN @ScopeType = N'company' THEN NULL ELSE @ScopeValue END, @ContactEmail, @ContactPhone, @ContactUrl, 1);
    END
    ELSE
    BEGIN
        SET @ResultContactId = @ContactId;
        UPDATE app.SupportContacts
        SET DisplayName = @DisplayName,
            SupportRole = @SupportRole,
            ScopeType = @ScopeType,
            ScopeValue = CASE WHEN @ScopeType = N'company' THEN NULL ELSE @ScopeValue END,
            ContactEmail = @ContactEmail,
            ContactPhone = @ContactPhone,
            ContactUrl = @ContactUrl
        WHERE Id = @ContactId;
    END
END;
GO

CREATE OR ALTER PROCEDURE app.sp_ArchiveSupportContact
    @ContactId UNIQUEIDENTIFIER,
    @ActorId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM app.Profiles WHERE Id = @ActorId AND Role = N'hr_admin' AND IsActive = 1)
    BEGIN
        RAISERROR(N'Quyền HR Admin là bắt buộc.', 16, 1);
        RETURN;
    END

    UPDATE app.SupportContacts
    SET IsActive = 0
    WHERE Id = @ContactId;
END;
GO

-- ============================================================================
-- 6. SP: SUBMIT UX FEEDBACK
-- ============================================================================
CREATE OR ALTER PROCEDURE app.sp_SubmitUxFeedback
    @ActorId UNIQUEIDENTIFIER,
    @Category NVARCHAR(40),
    @Message NVARCHAR(2000),
    @PagePath NVARCHAR(120) = N'/profile',
    @FeedbackId UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM app.Profiles WHERE Id = @ActorId AND Role = N'employee' AND IsActive = 1)
    BEGIN
        RAISERROR(N'Chỉ tài khoản nhân viên đang hoạt động mới có thể gửi phản hồi.', 16, 1);
        RETURN;
    END

    SET @FeedbackId = NEWID();
    INSERT INTO app.UxFeedback (Id, EmployeeId, Category, Message, PagePath)
    VALUES (@FeedbackId, @ActorId, @Category, LTRIM(RTRIM(@Message)), @PagePath);
END;
GO

PRINT '============================================================================';
PRINT '>> TOÀN BỘ STORED PROCEDURES ĐÃ ĐƯỢC TẠO THÀNH CÔNG CHO BEEWELCOMEDB!';
PRINT '============================================================================';
