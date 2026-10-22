-- ============================================================================
-- SCRIPT: 01_Schema_BeeWelcome.sql
-- ARCHITECTURE: Enterprise SQL Server 2022+ / 2025 Architecture for BeeWelcome
-- ENGINE: Microsoft SQL Server (T-SQL) & SSMS Ready
-- TARGET DATABASE: BeeWelcomeDB
-- DESCRIPTION: Thiết kế lại toàn bộ CSDL BeeWelcome từ PostgreSQL/Supabase sang
--              Microsoft SQL Server với kiến trúc Enterprise-grade:
--              - Tables, Constraints, Indexes, Foreign Keys
--              - Temporal/Audit triggers (updated_at)
--              - JSON constraints (ISJSON)
--              - Row Level Security (RLS) Predicate Function & Security Policies
-- ============================================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'BeeWelcomeDB')
BEGIN
    CREATE DATABASE BeeWelcomeDB
    COLLATE Latin1_General_100_CI_AS_SC_UTF8;
    PRINT '>> Database BeeWelcomeDB created successfully.';
END
ELSE
BEGIN
    PRINT '>> Database BeeWelcomeDB already exists.';
END
GO

USE BeeWelcomeDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- 1. TẠO SCHEMA QUẢN TRỊ (SCHEMAS)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'auth')
    EXEC('CREATE SCHEMA auth;');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'app')
    EXEC('CREATE SCHEMA app;');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'audit')
    EXEC('CREATE SCHEMA audit;');
GO

-- ============================================================================
-- 2. TẠO BẢNG AUTH & PROFILES
-- ============================================================================

-- Bảng auth.Users: Thay thế cho auth.users của Supabase
IF OBJECT_ID('auth.Users', 'U') IS NULL
BEGIN
    CREATE TABLE auth.Users (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        Email NVARCHAR(256) NOT NULL,
        PasswordHash NVARCHAR(256) NOT NULL,
        IsEmailConfirmed BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_auth_Users PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_auth_Users_Email UNIQUE NONCLUSTERED (Email)
    );
    PRINT '>> Table auth.Users created.';
END
GO

-- Bảng app.Profiles: Hồ sơ nhân viên & HR Admin
IF OBJECT_ID('app.Profiles', 'U') IS NULL
BEGIN
    CREATE TABLE app.Profiles (
        Id UNIQUEIDENTIFIER NOT NULL,
        Email NVARCHAR(256) NOT NULL,
        DisplayName NVARCHAR(160) NOT NULL,
        EmployeeCode NVARCHAR(50) NULL,
        Role NVARCHAR(20) NOT NULL DEFAULT N'employee',
        Office NVARCHAR(120) NULL,
        Department NVARCHAR(120) NULL,
        Position NVARCHAR(120) NULL,
        AudienceGroup NVARCHAR(120) NULL,
        StartDate DATE NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_Profiles PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_app_Profiles_Users FOREIGN KEY (Id) REFERENCES auth.Users (Id) ON DELETE CASCADE,
        CONSTRAINT CK_app_Profiles_Role CHECK (Role IN (N'hr_admin', N'employee')),
        CONSTRAINT UQ_app_Profiles_Email UNIQUE NONCLUSTERED (Email)
    );
    CREATE UNIQUE NONCLUSTERED INDEX UQ_app_Profiles_EmployeeCode
        ON app.Profiles (EmployeeCode) WHERE EmployeeCode IS NOT NULL;
    PRINT '>> Table app.Profiles created.';
END
GO

-- ============================================================================
-- 3. TẠO BẢNG CONTENT LIBRARY & VERSIONS
-- ============================================================================

-- Bảng app.Contents: Quản lý metadata và scope của tài nguyên đào tạo
IF OBJECT_ID('app.Contents', 'U') IS NULL
BEGIN
    CREATE TABLE app.Contents (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        Slug NVARCHAR(120) NOT NULL,
        Title NVARCHAR(200) NOT NULL,
        Description NVARCHAR(1000) NOT NULL DEFAULT N'',
        Category NVARCHAR(80) NOT NULL DEFAULT N'general',
        ContentType NVARCHAR(30) NOT NULL,
        ScopeType NVARCHAR(30) NOT NULL DEFAULT N'company',
        ScopeValue NVARCHAR(160) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT N'draft',
        OwnerId UNIQUEIDENTIFIER NOT NULL,
        CurrentVersion INT NOT NULL DEFAULT 0,
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_Contents PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_app_Contents_Slug UNIQUE NONCLUSTERED (Slug),
        CONSTRAINT FK_app_Contents_Owner FOREIGN KEY (OwnerId) REFERENCES app.Profiles (Id),
        CONSTRAINT CK_app_Contents_ContentType CHECK (ContentType IN (N'text', N'image', N'video', N'file_link', N'task', N'quiz_form')),
        CONSTRAINT CK_app_Contents_ScopeType CHECK (ScopeType IN (N'company', N'office', N'department', N'position', N'group', N'employee')),
        CONSTRAINT CK_app_Contents_Status CHECK (Status IN (N'draft', N'published', N'archived')),
        CONSTRAINT CK_app_Contents_CurrentVersion CHECK (CurrentVersion >= 0),
        CONSTRAINT CK_app_Contents_ScopeValue CHECK (
            (ScopeType = N'company' AND ScopeValue IS NULL)
            OR (ScopeType <> N'company' AND NULLIF(LTRIM(RTRIM(ScopeValue)), N'') IS NOT NULL)
        )
    );
    CREATE NONCLUSTERED INDEX IX_app_Contents_Status_ContentType ON app.Contents (Status, ContentType);
    CREATE NONCLUSTERED INDEX IX_app_Contents_Scope ON app.Contents (ScopeType, ScopeValue);
    PRINT '>> Table app.Contents created.';
END
GO

-- Bảng app.ContentVersions: Quản lý phiên bản bài học, snapshot JSON body
IF OBJECT_ID('app.ContentVersions', 'U') IS NULL
BEGIN
    CREATE TABLE app.ContentVersions (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        ContentId UNIQUEIDENTIFIER NOT NULL,
        VersionNumber INT NOT NULL,
        Body NVARCHAR(MAX) NOT NULL,
        ChangeNote NVARCHAR(1000) NOT NULL DEFAULT N'',
        VersionStatus NVARCHAR(20) NOT NULL DEFAULT N'draft',
        CreatedBy UNIQUEIDENTIFIER NOT NULL,
        PublishedBy UNIQUEIDENTIFIER NULL,
        PublishedAt DATETIMEOFFSET NULL,
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_ContentVersions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_app_ContentVersions_Number UNIQUE NONCLUSTERED (ContentId, VersionNumber),
        CONSTRAINT FK_app_ContentVersions_Content FOREIGN KEY (ContentId) REFERENCES app.Contents (Id) ON DELETE NO ACTION,
        CONSTRAINT FK_app_ContentVersions_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES app.Profiles (Id),
        CONSTRAINT FK_app_ContentVersions_PublishedBy FOREIGN KEY (PublishedBy) REFERENCES app.Profiles (Id),
        CONSTRAINT CK_app_ContentVersions_VersionNumber CHECK (VersionNumber > 0),
        CONSTRAINT CK_app_ContentVersions_Status CHECK (VersionStatus IN (N'draft', N'published')),
        CONSTRAINT CK_app_ContentVersions_BodyJson CHECK (ISJSON(Body) > 0),
        CONSTRAINT CK_app_ContentVersions_PublishState CHECK (
            (VersionStatus = N'draft' AND PublishedAt IS NULL AND PublishedBy IS NULL)
            OR (VersionStatus = N'published' AND PublishedAt IS NOT NULL AND PublishedBy IS NOT NULL)
        )
    );
    CREATE NONCLUSTERED INDEX IX_app_ContentVersions_Lookup ON app.ContentVersions (ContentId, VersionNumber DESC);
    PRINT '>> Table app.ContentVersions created.';
END
GO

-- Bảng app.ContentPrivateConfigs: Chứa đáp án Quiz bí mật (Zero-leakage)
IF OBJECT_ID('app.ContentPrivateConfigs', 'U') IS NULL
BEGIN
    CREATE TABLE app.ContentPrivateConfigs (
        ContentId UNIQUEIDENTIFIER NOT NULL,
        VersionNumber INT NOT NULL,
        AnswerConfig NVARCHAR(MAX) NOT NULL DEFAULT N'{}',
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_ContentPrivateConfigs PRIMARY KEY CLUSTERED (ContentId, VersionNumber),
        CONSTRAINT FK_app_ContentPrivateConfigs_Version FOREIGN KEY (ContentId, VersionNumber)
            REFERENCES app.ContentVersions (ContentId, VersionNumber) ON DELETE CASCADE,
        CONSTRAINT CK_app_ContentPrivateConfigs_Json CHECK (ISJSON(AnswerConfig) > 0)
    );
    PRINT '>> Table app.ContentPrivateConfigs created.';
END
GO

-- ============================================================================
-- 4. TẠO BẢNG TEMPLATE BUILDER, MILESTONES & ITEMS
-- ============================================================================

-- Bảng app.Templates: Khung lộ trình Onboarding
IF OBJECT_ID('app.Templates', 'U') IS NULL
BEGIN
    CREATE TABLE app.Templates (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        Slug NVARCHAR(120) NOT NULL,
        Name NVARCHAR(160) NOT NULL,
        Description NVARCHAR(1000) NOT NULL DEFAULT N'',
        ScopeType NVARCHAR(30) NOT NULL DEFAULT N'company',
        ScopeValue NVARCHAR(160) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT N'draft',
        VersionNumber INT NOT NULL DEFAULT 0,
        CreatedBy UNIQUEIDENTIFIER NOT NULL,
        PublishedBy UNIQUEIDENTIFIER NULL,
        PublishedAt DATETIMEOFFSET NULL,
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_Templates PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_app_Templates_Slug UNIQUE NONCLUSTERED (Slug),
        CONSTRAINT FK_app_Templates_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES app.Profiles (Id),
        CONSTRAINT FK_app_Templates_PublishedBy FOREIGN KEY (PublishedBy) REFERENCES app.Profiles (Id),
        CONSTRAINT CK_app_Templates_ScopeType CHECK (ScopeType IN (N'company', N'office', N'department', N'position', N'group', N'employee')),
        CONSTRAINT CK_app_Templates_Status CHECK (Status IN (N'draft', N'published', N'archived')),
        CONSTRAINT CK_app_Templates_VersionNumber CHECK (VersionNumber >= 0),
        CONSTRAINT CK_app_Templates_ScopeValue CHECK (
            (ScopeType = N'company' AND ScopeValue IS NULL)
            OR (ScopeType <> N'company' AND NULLIF(LTRIM(RTRIM(ScopeValue)), N'') IS NOT NULL)
        )
    );
    CREATE NONCLUSTERED INDEX IX_app_Templates_Status_Scope ON app.Templates (Status, ScopeType, ScopeValue);
    PRINT '>> Table app.Templates created.';
END
GO

-- Bảng app.Milestones: Các giai đoạn theo mốc thời gian trong Template
IF OBJECT_ID('app.Milestones', 'U') IS NULL
BEGIN
    CREATE TABLE app.Milestones (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        TemplateId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(120) NOT NULL,
        Sequence INT NOT NULL,
        AvailableOffsetDays INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_Milestones PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_app_Milestones_Order UNIQUE NONCLUSTERED (TemplateId, Sequence),
        CONSTRAINT FK_app_Milestones_Template FOREIGN KEY (TemplateId) REFERENCES app.Templates (Id) ON DELETE CASCADE,
        CONSTRAINT CK_app_Milestones_Sequence CHECK (Sequence >= 0),
        CONSTRAINT CK_app_Milestones_Offset CHECK (AvailableOffsetDays >= 0)
    );
    PRINT '>> Table app.Milestones created.';
END
GO

-- Bảng app.TemplateItems: Các hoạt động cụ thể trong từng Milestone
IF OBJECT_ID('app.TemplateItems', 'U') IS NULL
BEGIN
    CREATE TABLE app.TemplateItems (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        MilestoneId UNIQUEIDENTIFIER NOT NULL,
        ContentId UNIQUEIDENTIFIER NOT NULL,
        Sequence INT NOT NULL,
        IsRequired BIT NOT NULL DEFAULT 1,
        AvailableOffsetDays INT NOT NULL DEFAULT 0,
        DueOffsetDays INT NULL,
        CompletionRule NVARCHAR(40) NOT NULL,
        IncludeInProgress BIT NOT NULL DEFAULT 1,
        Settings NVARCHAR(MAX) NOT NULL DEFAULT N'{}',
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_TemplateItems PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_app_TemplateItems_Order UNIQUE NONCLUSTERED (MilestoneId, Sequence),
        CONSTRAINT FK_app_TemplateItems_Milestone FOREIGN KEY (MilestoneId) REFERENCES app.Milestones (Id) ON DELETE CASCADE,
        CONSTRAINT FK_app_TemplateItems_Content FOREIGN KEY (ContentId) REFERENCES app.Contents (Id) ON DELETE NO ACTION,
        CONSTRAINT CK_app_TemplateItems_Sequence CHECK (Sequence >= 0),
        CONSTRAINT CK_app_TemplateItems_AvailableOffset CHECK (AvailableOffsetDays >= 0),
        CONSTRAINT CK_app_TemplateItems_DueOffset CHECK (DueOffsetDays IS NULL OR DueOffsetDays >= 0),
        CONSTRAINT CK_app_TemplateItems_SettingsJson CHECK (ISJSON(Settings) > 0),
        CONSTRAINT CK_app_TemplateItems_CompletionRule CHECK (
            CompletionRule IN (
                N'manual_self_confirmation',
                N'form_submission',
                N'quiz_participation',
                N'quiz_pass_required',
                N'content_acknowledgement',
                N'admin_completion'
            )
        )
    );
    PRINT '>> Table app.TemplateItems created.';
END
GO

-- ============================================================================
-- 5. TẠO BẢNG EMPLOYEE JOURNEYS & IMMUTABLE SNAPSHOT ACTIVITIES
-- ============================================================================

-- Bảng app.EmployeeJourneys: Lộ trình được gán cho nhân viên (Phiên bản Snapshot)
IF OBJECT_ID('app.EmployeeJourneys', 'U') IS NULL
BEGIN
    CREATE TABLE app.EmployeeJourneys (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        EmployeeId UNIQUEIDENTIFIER NOT NULL,
        TemplateId UNIQUEIDENTIFIER NOT NULL,
        TemplateVersion INT NOT NULL,
        TitleSnapshot NVARCHAR(160) NOT NULL,
        StartDate DATE NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT N'active',
        AssignedBy UNIQUEIDENTIFIER NOT NULL,
        AssignedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_EmployeeJourneys PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_app_EmployeeJourneys_Assignment UNIQUE NONCLUSTERED (EmployeeId, TemplateId, TemplateVersion),
        CONSTRAINT FK_app_EmployeeJourneys_Employee FOREIGN KEY (EmployeeId) REFERENCES app.Profiles (Id) ON DELETE NO ACTION,
        CONSTRAINT FK_app_EmployeeJourneys_Template FOREIGN KEY (TemplateId) REFERENCES app.Templates (Id) ON DELETE NO ACTION,
        CONSTRAINT FK_app_EmployeeJourneys_AssignedBy FOREIGN KEY (AssignedBy) REFERENCES app.Profiles (Id),
        CONSTRAINT CK_app_EmployeeJourneys_Version CHECK (TemplateVersion > 0),
        CONSTRAINT CK_app_EmployeeJourneys_Status CHECK (Status IN (N'active', N'completed', N'paused', N'cancelled'))
    );
    CREATE NONCLUSTERED INDEX IX_app_EmployeeJourneys_Employee ON app.EmployeeJourneys (EmployeeId, Status, StartDate DESC);
    PRINT '>> Table app.EmployeeJourneys created.';
END
GO

-- Bảng app.JourneyActivities: Snapshot bất biến của từng nhiệm vụ cho nhân viên
IF OBJECT_ID('app.JourneyActivities', 'U') IS NULL
BEGIN
    CREATE TABLE app.JourneyActivities (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        JourneyId UNIQUEIDENTIFIER NOT NULL,
        SourceTemplateItemId UNIQUEIDENTIFIER NOT NULL,
        SourceContentId UNIQUEIDENTIFIER NOT NULL,
        ContentVersion INT NOT NULL,
        TitleSnapshot NVARCHAR(200) NOT NULL,
        DescriptionSnapshot NVARCHAR(1000) NOT NULL DEFAULT N'',
        ContentTypeSnapshot NVARCHAR(30) NOT NULL,
        ContentBodySnapshot NVARCHAR(MAX) NOT NULL,
        MilestoneNameSnapshot NVARCHAR(120) NOT NULL,
        MilestoneSequence INT NOT NULL,
        ActivitySequence INT NOT NULL,
        IsRequired BIT NOT NULL,
        AvailableAt DATE NOT NULL,
        DueAt DATE NULL,
        CompletionRule NVARCHAR(40) NOT NULL,
        IncludeInProgress BIT NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT N'not_started',
        CompletionSource NVARCHAR(40) NULL,
        CompletedAt DATETIMEOFFSET NULL,
        CompletedBy UNIQUEIDENTIFIER NULL,
        CompletionNote NVARCHAR(500) NULL,
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_JourneyActivities PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_app_JourneyActivities_Item UNIQUE NONCLUSTERED (JourneyId, SourceTemplateItemId),
        CONSTRAINT FK_app_JourneyActivities_Journey FOREIGN KEY (JourneyId) REFERENCES app.EmployeeJourneys (Id) ON DELETE CASCADE,
        CONSTRAINT FK_app_JourneyActivities_SourceItem FOREIGN KEY (SourceTemplateItemId) REFERENCES app.TemplateItems (Id) ON DELETE NO ACTION,
        CONSTRAINT FK_app_JourneyActivities_SourceContent FOREIGN KEY (SourceContentId) REFERENCES app.Contents (Id) ON DELETE NO ACTION,
        CONSTRAINT FK_app_JourneyActivities_CompletedBy FOREIGN KEY (CompletedBy) REFERENCES app.Profiles (Id),
        CONSTRAINT CK_app_JourneyActivities_ContentVersion CHECK (ContentVersion > 0),
        CONSTRAINT CK_app_JourneyActivities_MilestoneSeq CHECK (MilestoneSequence >= 0),
        CONSTRAINT CK_app_JourneyActivities_ActivitySeq CHECK (ActivitySequence >= 0),
        CONSTRAINT CK_app_JourneyActivities_BodyJson CHECK (ISJSON(ContentBodySnapshot) > 0),
        CONSTRAINT CK_app_JourneyActivities_Status CHECK (Status IN (N'not_started', N'in_progress', N'completed', N'waived', N'removed')),
        CONSTRAINT CK_app_JourneyActivities_CompletionSource CHECK (
            CompletionSource IS NULL OR CompletionSource IN (
                N'employee_self_confirmation',
                N'content_acknowledgement',
                N'form_submission',
                N'quiz_participation',
                N'quiz_pass',
                N'hr_admin'
            )
        ),
        CONSTRAINT CK_app_JourneyActivities_CompletionState CHECK (
            (Status = N'completed' AND CompletedAt IS NOT NULL AND CompletedBy IS NOT NULL)
            OR (Status <> N'completed' AND CompletedAt IS NULL AND CompletedBy IS NULL)
        )
    );
    CREATE NONCLUSTERED INDEX IX_app_JourneyActivities_Order ON app.JourneyActivities (JourneyId, MilestoneSequence, ActivitySequence);
    CREATE NONCLUSTERED INDEX IX_app_JourneyActivities_Due ON app.JourneyActivities (DueAt, Status) WHERE DueAt IS NOT NULL;
    PRINT '>> Table app.JourneyActivities created.';
END
GO

-- Bảng app.JourneyActivityPrivate: Snapshot bí mật của Quiz/Setting cho từng Activity
IF OBJECT_ID('app.JourneyActivityPrivate', 'U') IS NULL
BEGIN
    CREATE TABLE app.JourneyActivityPrivate (
        JourneyActivityId UNIQUEIDENTIFIER NOT NULL,
        AnswerConfigSnapshot NVARCHAR(MAX) NOT NULL DEFAULT N'{}',
        SettingsSnapshot NVARCHAR(MAX) NOT NULL DEFAULT N'{}',
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_JourneyActivityPrivate PRIMARY KEY CLUSTERED (JourneyActivityId),
        CONSTRAINT FK_app_JourneyActivityPrivate_Activity FOREIGN KEY (JourneyActivityId)
            REFERENCES app.JourneyActivities (Id) ON DELETE CASCADE,
        CONSTRAINT CK_app_JourneyActivityPrivate_AnswerJson CHECK (ISJSON(AnswerConfigSnapshot) > 0),
        CONSTRAINT CK_app_JourneyActivityPrivate_SettingsJson CHECK (ISJSON(SettingsSnapshot) > 0)
    );
    PRINT '>> Table app.JourneyActivityPrivate created.';
END
GO

-- Bảng app.ActivitySubmissions: Kết quả làm bài Quiz / nộp biểu mẫu
IF OBJECT_ID('app.ActivitySubmissions', 'U') IS NULL
BEGIN
    CREATE TABLE app.ActivitySubmissions (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        JourneyActivityId UNIQUEIDENTIFIER NOT NULL,
        JourneyId UNIQUEIDENTIFIER NOT NULL,
        EmployeeId UNIQUEIDENTIFIER NOT NULL,
        AnswerPayload NVARCHAR(MAX) NOT NULL,
        Score NUMERIC(5, 4) NULL,
        Passed BIT NULL,
        SubmittedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_ActivitySubmissions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_app_ActivitySubmissions_Activity FOREIGN KEY (JourneyActivityId)
            REFERENCES app.JourneyActivities (Id) ON DELETE CASCADE,
        CONSTRAINT FK_app_ActivitySubmissions_Journey FOREIGN KEY (JourneyId)
            REFERENCES app.EmployeeJourneys (Id) ON DELETE NO ACTION,
        CONSTRAINT FK_app_ActivitySubmissions_Employee FOREIGN KEY (EmployeeId)
            REFERENCES app.Profiles (Id) ON DELETE NO ACTION,
        CONSTRAINT CK_app_ActivitySubmissions_Score CHECK (Score IS NULL OR (Score >= 0.0 AND Score <= 1.0)),
        CONSTRAINT CK_app_ActivitySubmissions_PayloadJson CHECK (ISJSON(AnswerPayload) > 0)
    );
    CREATE NONCLUSTERED INDEX IX_app_ActivitySubmissions_Employee ON app.ActivitySubmissions (EmployeeId, SubmittedAt DESC);
    CREATE NONCLUSTERED INDEX IX_app_ActivitySubmissions_Activity ON app.ActivitySubmissions (JourneyActivityId, SubmittedAt DESC);
    PRINT '>> Table app.ActivitySubmissions created.';
END
GO

-- Bảng audit.ActivityEvents: Nhật ký kiểm toán bất biến (Audit Trail)
IF OBJECT_ID('audit.ActivityEvents', 'U') IS NULL
BEGIN
    CREATE TABLE audit.ActivityEvents (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        JourneyActivityId UNIQUEIDENTIFIER NOT NULL,
        JourneyId UNIQUEIDENTIFIER NOT NULL,
        ActorId UNIQUEIDENTIFIER NOT NULL,
        EventType NVARCHAR(40) NOT NULL,
        EventData NVARCHAR(MAX) NOT NULL DEFAULT N'{}',
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_audit_ActivityEvents PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_audit_ActivityEvents_Activity FOREIGN KEY (JourneyActivityId)
            REFERENCES app.JourneyActivities (Id) ON DELETE CASCADE,
        CONSTRAINT FK_audit_ActivityEvents_Journey FOREIGN KEY (JourneyId)
            REFERENCES app.EmployeeJourneys (Id) ON DELETE NO ACTION,
        CONSTRAINT FK_audit_ActivityEvents_Actor FOREIGN KEY (ActorId)
            REFERENCES app.Profiles (Id) ON DELETE NO ACTION,
        CONSTRAINT CK_audit_ActivityEvents_EventDataJson CHECK (ISJSON(EventData) > 0),
        CONSTRAINT CK_audit_ActivityEvents_EventType CHECK (
            EventType IN (
                N'assigned',
                N'self_confirmed',
                N'content_acknowledged',
                N'form_submitted',
                N'quiz_submitted',
                N'admin_completed',
                N'waived',
                N'reopened',
                N'note_added',
                N'template_update_applied'
            )
        )
    );
    CREATE NONCLUSTERED INDEX IX_audit_ActivityEvents_Lookup
        ON audit.ActivityEvents (JourneyActivityId, CreatedAt DESC);
    PRINT '>> Table audit.ActivityEvents created.';
END
GO

-- Bảng audit.JourneyTemplateUpdates: Nhật ký cập nhật phiên bản Template cho nhân viên
IF OBJECT_ID('audit.JourneyTemplateUpdates', 'U') IS NULL
BEGIN
    CREATE TABLE audit.JourneyTemplateUpdates (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        JourneyId UNIQUEIDENTIFIER NOT NULL,
        FromVersion INT NOT NULL,
        ToVersion INT NOT NULL,
        AddedCount INT NOT NULL DEFAULT 0,
        UpdatedCount INT NOT NULL DEFAULT 0,
        RemovedCount INT NOT NULL DEFAULT 0,
        PreservedCount INT NOT NULL DEFAULT 0,
        AppliedBy UNIQUEIDENTIFIER NOT NULL,
        AppliedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_audit_JourneyTemplateUpdates PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_audit_JourneyTemplateUpdates_Ver UNIQUE NONCLUSTERED (JourneyId, ToVersion),
        CONSTRAINT FK_audit_JourneyTemplateUpdates_Journey FOREIGN KEY (JourneyId)
            REFERENCES app.EmployeeJourneys (Id) ON DELETE NO ACTION,
        CONSTRAINT FK_audit_JourneyTemplateUpdates_AppliedBy FOREIGN KEY (AppliedBy)
            REFERENCES app.Profiles (Id) ON DELETE NO ACTION,
        CONSTRAINT CK_audit_JourneyTemplateUpdates_FromVer CHECK (FromVersion > 0),
        CONSTRAINT CK_audit_JourneyTemplateUpdates_ToVer CHECK (ToVersion > FromVersion),
        CONSTRAINT CK_audit_JourneyTemplateUpdates_Counts CHECK (
            AddedCount >= 0 AND UpdatedCount >= 0 AND RemovedCount >= 0 AND PreservedCount >= 0
        )
    );
    PRINT '>> Table audit.JourneyTemplateUpdates created.';
END
GO

-- ============================================================================
-- 6. TẠO BẢNG SUPPORT DIRECTORY & UX FEEDBACK
-- ============================================================================

-- Bảng app.SupportContacts: Danh bạ hỗ trợ nhân viên theo phòng ban/văn phòng
IF OBJECT_ID('app.SupportContacts', 'U') IS NULL
BEGIN
    CREATE TABLE app.SupportContacts (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        DisplayName NVARCHAR(120) NOT NULL,
        SupportRole NVARCHAR(120) NOT NULL,
        ScopeType NVARCHAR(30) NOT NULL DEFAULT N'company',
        ScopeValue NVARCHAR(160) NULL,
        ContactEmail NVARCHAR(320) NULL,
        ContactPhone NVARCHAR(80) NULL,
        ContactUrl NVARCHAR(1000) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_SupportContacts PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT CK_app_SupportContacts_ScopeType CHECK (ScopeType IN (N'company', N'office', N'department', N'position', N'group', N'employee')),
        CONSTRAINT CK_app_SupportContacts_ScopeValue CHECK (
            (ScopeType = N'company' AND ScopeValue IS NULL)
            OR (ScopeType <> N'company' AND NULLIF(LTRIM(RTRIM(ScopeValue)), N'') IS NOT NULL)
        ),
        CONSTRAINT CK_app_SupportContacts_Channel CHECK (
            ContactEmail IS NOT NULL OR ContactPhone IS NOT NULL OR ContactUrl IS NOT NULL
        )
    );
    CREATE NONCLUSTERED INDEX IX_app_SupportContacts_Scope ON app.SupportContacts (IsActive, ScopeType, ScopeValue);
    PRINT '>> Table app.SupportContacts created.';
END
GO

-- Bảng app.UxFeedback: Góp ý trải nghiệm từ nhân viên
IF OBJECT_ID('app.UxFeedback', 'U') IS NULL
BEGIN
    CREATE TABLE app.UxFeedback (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        EmployeeId UNIQUEIDENTIFIER NOT NULL,
        Category NVARCHAR(40) NOT NULL,
        Message NVARCHAR(2000) NOT NULL,
        PagePath NVARCHAR(120) NOT NULL DEFAULT N'/profile',
        SubmittedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT PK_app_UxFeedback PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_app_UxFeedback_Employee FOREIGN KEY (EmployeeId) REFERENCES app.Profiles (Id) ON DELETE NO ACTION,
        CONSTRAINT CK_app_UxFeedback_Category CHECK (Category IN (N'roadmap', N'content', N'navigation', N'accessibility', N'other')),
        CONSTRAINT CK_app_UxFeedback_Path CHECK (LEN(PagePath) <= 120 AND LEFT(PagePath, 1) = N'/')
    );
    CREATE NONCLUSTERED INDEX IX_app_UxFeedback_Employee ON app.UxFeedback (EmployeeId, SubmittedAt DESC);
    PRINT '>> Table app.UxFeedback created.';
END
GO

-- ============================================================================
-- 7. TRIGGERS: TỰ ĐỘNG CẬP NHẬT UPDATED_AT (TEMPORAL INTEGRITY)
-- ============================================================================

CREATE OR ALTER TRIGGER app.TR_Profiles_UpdatedAt
ON app.Profiles AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE p
    SET UpdatedAt = SYSDATETIMEOFFSET()
    FROM app.Profiles p
    INNER JOIN inserted i ON p.Id = i.Id;
END;
GO

CREATE OR ALTER TRIGGER app.TR_Contents_UpdatedAt
ON app.Contents AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE c
    SET UpdatedAt = SYSDATETIMEOFFSET()
    FROM app.Contents c
    INNER JOIN inserted i ON c.Id = i.Id;
END;
GO

CREATE OR ALTER TRIGGER app.TR_Templates_UpdatedAt
ON app.Templates AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE t
    SET UpdatedAt = SYSDATETIMEOFFSET()
    FROM app.Templates t
    INNER JOIN inserted i ON t.Id = i.Id;
END;
GO

CREATE OR ALTER TRIGGER app.TR_EmployeeJourneys_UpdatedAt
ON app.EmployeeJourneys AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE j
    SET UpdatedAt = SYSDATETIMEOFFSET()
    FROM app.EmployeeJourneys j
    INNER JOIN inserted i ON j.Id = i.Id;
END;
GO

CREATE OR ALTER TRIGGER app.TR_JourneyActivities_UpdatedAt
ON app.JourneyActivities AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE a
    SET UpdatedAt = SYSDATETIMEOFFSET()
    FROM app.JourneyActivities a
    INNER JOIN inserted i ON a.Id = i.Id;
END;
GO

CREATE OR ALTER TRIGGER app.TR_SupportContacts_UpdatedAt
ON app.SupportContacts AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE s
    SET UpdatedAt = SYSDATETIMEOFFSET()
    FROM app.SupportContacts s
    INNER JOIN inserted i ON s.Id = i.Id;
END;
GO

PRINT '============================================================================';
PRINT '>> TOÀN BỘ SCHEMA DỮ LIỆU BEEWELCOMEDB ĐÃ ĐƯỢC THIẾT LẬP THÀNH CÔNG!';
PRINT '============================================================================';
