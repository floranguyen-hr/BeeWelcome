import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const accounts = {
  employeeA: "00000000-0000-4000-8000-000000000001",
  employeeB: "00000000-0000-4000-8000-000000000002",
  hrAdmin: "00000000-0000-4000-8000-000000000003",
  hrd: "00000000-0000-4000-8000-000000000004",
};

const database = new PGlite();

async function queryAs(
  role: "anon" | "authenticated",
  userId: string | null,
  sql: string,
) {
  await database.exec("begin");
  try {
    await database.exec("set local role " + role);
    if (userId) {
      await database.query(
        "select set_config('request.jwt.claim.sub', $1, true)",
        [userId],
      );
    }
    const result = await database.query(sql);
    await database.exec("rollback");
    return result;
  } catch (error) {
    await database.exec("rollback");
    throw error;
  }
}

async function transactionAs<T>(
  role: "anon" | "authenticated",
  userId: string | null,
  operation: () => Promise<T>,
): Promise<T> {
  await database.exec("begin");
  try {
    await database.exec("set local role " + role);
    if (userId) {
      await database.query(
        "select set_config('request.jwt.claim.sub', $1, true)",
        [userId],
      );
    }
    const result = await operation();
    await database.exec("rollback");
    return result;
  } catch (error) {
    await database.exec("rollback");
    throw error;
  }
}

async function commitAs<T>(
  role: "anon" | "authenticated",
  userId: string | null,
  operation: () => Promise<T>,
): Promise<T> {
  await database.exec("begin");
  try {
    await database.exec("set local role " + role);
    if (userId) {
      await database.query(
        "select set_config('request.jwt.claim.sub', $1, true)",
        [userId],
      );
    }
    const result = await operation();
    await database.exec("commit");
    return result;
  } catch (error) {
    await database.exec("rollback");
    throw error;
  }
}

describe("profile row-level security", () => {
  beforeAll(async () => {
    await database.exec(
      [
        "create role anon nologin;",
        "create role authenticated nologin;",
        "create schema auth;",
        "create table auth.users (id uuid primary key, email text not null unique);",
        "create function auth.uid() returns uuid language sql stable as",
        "$function$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $function$;",
        "grant usage on schema auth to anon, authenticated;",
        "grant execute on function auth.uid() to anon, authenticated;",
      ].join("\n"),
    );

    const profileMigration = await readFile(
      resolve(
        process.cwd(),
        "supabase/migrations/202610220001_profiles_auth_rls.sql",
      ),
      "utf8",
    );
    const contentMigration = await readFile(
      resolve(
        process.cwd(),
        "supabase/migrations/202610220002_content_templates.sql",
      ),
      "utf8",
    );
    const journeyMigration = await readFile(
      resolve(
        process.cwd(),
        "supabase/migrations/202610220003_employee_journeys.sql",
      ),
      "utf8",
    );
    const completionMigration = await readFile(
      resolve(
        process.cwd(),
        "supabase/migrations/202610220004_activity_completion.sql",
      ),
      "utf8",
    );
    const employeeMigration = await readFile(
      resolve(
        process.cwd(),
        "supabase/migrations/202610220005_employee_support_feedback.sql",
      ),
      "utf8",
    );
    const adminOperationsMigration = await readFile(
      resolve(
        process.cwd(),
        "supabase/migrations/202610220006_admin_operations.sql",
      ),
      "utf8",
    );
    const templateUpdateMigration = await readFile(
      resolve(
        process.cwd(),
        "supabase/migrations/202610220007_template_update_preview_apply.sql",
      ),
      "utf8",
    );
    await database.exec(profileMigration);
    await database.exec(contentMigration);
    await database.exec(journeyMigration);
    await database.exec(completionMigration);
    await database.exec(employeeMigration);
    await database.exec(adminOperationsMigration);
    await database.exec(templateUpdateMigration);

    await database.query(
      "insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8)",
      [
        accounts.employeeA,
        "employee-a@bee-onboarding.invalid",
        accounts.employeeB,
        "employee-b@bee-onboarding.invalid",
        accounts.hrAdmin,
        "hr-admin@bee-onboarding.invalid",
        accounts.hrd,
        "hrd@bee-onboarding.invalid",
      ],
    );
    await database.query(
      "insert into public.profiles (id, email, display_name, role, office, department, position, audience_group) values ($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16), ($17, $18, $19, $20, null, null, null, null), ($21, $22, $23, $24, null, null, null, null)",
      [
        accounts.employeeA,
        "employee-a@bee-onboarding.invalid",
        "Demo Employee A",
        "employee",
        "HCM",
        "Operations",
        "Driver",
        "Group A",
        accounts.employeeB,
        "employee-b@bee-onboarding.invalid",
        "Demo Employee B",
        "employee",
        "HAN",
        "Operations",
        "Driver",
        "Group B",
        accounts.hrAdmin,
        "hr-admin@bee-onboarding.invalid",
        "Demo HR Admin",
        "hr_admin",
        accounts.hrd,
        "hrd@bee-onboarding.invalid",
        "Demo HRD",
        "hr_admin",
      ],
    );
    await database.query(
      "insert into public.support_contacts (id, display_name, support_role, scope_type, scope_value, contact_email) values ($1, 'Demo HCM Support', 'Sample contact', 'office', 'HCM', 'demo-hcm-support@example.invalid'), ($2, 'Demo HAN Support', 'Sample contact', 'office', 'HAN', 'demo-han-support@example.invalid')",
      [
        "00000000-0000-4000-8000-000000000080",
        "00000000-0000-4000-8000-000000000081",
      ],
    );
    await database.query(
      "insert into public.ux_feedback (id, employee_id, category, message) values ($1, $2, 'roadmap', 'Synthetic feedback from Employee A'), ($3, $4, 'content', 'Synthetic feedback from Employee B')",
      [
        "00000000-0000-4000-8000-000000000082",
        accounts.employeeA,
        "00000000-0000-4000-8000-000000000083",
        accounts.employeeB,
      ],
    );

    await database.query(
      "insert into public.contents (id, slug, title, content_type, scope_type, scope_value, status, owner_id, current_version) values ($1, 'shared-guide', 'Shared Guide', 'text', 'company', null, 'published', $2, 1), ($3, 'hcm-guide', 'HCM Guide', 'text', 'office', 'HCM', 'published', $2, 1), ($4, 'han-guide', 'HAN Guide', 'text', 'office', 'HAN', 'published', $2, 1), ($5, 'employee-a-guide', 'Employee A Guide', 'text', 'employee', $6, 'published', $2, 1), ($7, 'employee-b-guide', 'Employee B Guide', 'text', 'employee', $8, 'published', $2, 1), ($9, 'draft-guide', 'Draft Guide', 'text', 'company', null, 'draft', $2, 1)",
      [
        "00000000-0000-4000-8000-000000000010",
        accounts.hrAdmin,
        "00000000-0000-4000-8000-000000000011",
        "00000000-0000-4000-8000-000000000012",
        "00000000-0000-4000-8000-000000000013",
        accounts.employeeA,
        "00000000-0000-4000-8000-000000000014",
        accounts.employeeB,
        "00000000-0000-4000-8000-000000000015",
      ],
    );
    await database.query(
      "insert into public.content_versions (content_id, version_number, body, version_status, created_by, published_by, published_at) values ($1, 1, '{}'::jsonb, 'published', $2, $2, now()), ($3, 1, '{}'::jsonb, 'published', $2, $2, now()), ($4, 1, '{}'::jsonb, 'published', $2, $2, now()), ($5, 1, '{}'::jsonb, 'published', $2, $2, now()), ($6, 1, '{}'::jsonb, 'published', $2, $2, now()), ($7, 1, '{}'::jsonb, 'draft', $2, null, null)",
      [
        "00000000-0000-4000-8000-000000000010",
        accounts.hrAdmin,
        "00000000-0000-4000-8000-000000000011",
        "00000000-0000-4000-8000-000000000012",
        "00000000-0000-4000-8000-000000000013",
        "00000000-0000-4000-8000-000000000014",
        "00000000-0000-4000-8000-000000000015",
      ],
    );
    await database.query(
      "insert into public.templates (id, slug, name, scope_type, scope_value, status, version_number, created_by, published_by, published_at) values ($1, 'shared-template', 'Shared Template', 'company', null, 'published', 1, $2, $2, now()), ($3, 'hcm-template', 'HCM Template', 'office', 'HCM', 'published', 1, $2, $2, now()), ($4, 'han-template', 'HAN Template', 'office', 'HAN', 'published', 1, $2, $2, now()), ($5, 'employee-a-template', 'Employee A Template', 'employee', $6, 'published', 1, $2, $2, now()), ($7, 'draft-template', 'Draft Template', 'company', null, 'draft', 0, $2, null, null)",
      [
        "00000000-0000-4000-8000-000000000020",
        accounts.hrAdmin,
        "00000000-0000-4000-8000-000000000021",
        "00000000-0000-4000-8000-000000000022",
        "00000000-0000-4000-8000-000000000023",
        accounts.employeeA,
        "00000000-0000-4000-8000-000000000024",
      ],
    );
    await database.query(
      "insert into public.milestones (id, template_id, name, sequence) values ($1, $2, 'D1', 0), ($3, $4, 'D1', 0), ($5, $6, 'D1', 0), ($7, $8, 'D1', 0), ($9, $10, 'D1', 0)",
      [
        "00000000-0000-4000-8000-000000000030",
        "00000000-0000-4000-8000-000000000020",
        "00000000-0000-4000-8000-000000000031",
        "00000000-0000-4000-8000-000000000021",
        "00000000-0000-4000-8000-000000000032",
        "00000000-0000-4000-8000-000000000022",
        "00000000-0000-4000-8000-000000000033",
        "00000000-0000-4000-8000-000000000023",
        "00000000-0000-4000-8000-000000000034",
        "00000000-0000-4000-8000-000000000024",
      ],
    );
    await database.query(
      "insert into public.template_items (id, milestone_id, content_id, sequence, completion_rule) values ($1, $2, $3, 0, 'content_acknowledgement'), ($4, $5, $6, 0, 'content_acknowledgement'), ($7, $8, $9, 0, 'content_acknowledgement'), ($10, $11, $12, 0, 'content_acknowledgement'), ($13, $14, $15, 0, 'content_acknowledgement')",
      [
        "00000000-0000-4000-8000-000000000040",
        "00000000-0000-4000-8000-000000000030",
        "00000000-0000-4000-8000-000000000010",
        "00000000-0000-4000-8000-000000000041",
        "00000000-0000-4000-8000-000000000031",
        "00000000-0000-4000-8000-000000000011",
        "00000000-0000-4000-8000-000000000042",
        "00000000-0000-4000-8000-000000000032",
        "00000000-0000-4000-8000-000000000012",
        "00000000-0000-4000-8000-000000000043",
        "00000000-0000-4000-8000-000000000033",
        "00000000-0000-4000-8000-000000000013",
        "00000000-0000-4000-8000-000000000044",
        "00000000-0000-4000-8000-000000000034",
        "00000000-0000-4000-8000-000000000014",
      ],
    );
    await database.query(
      "insert into public.employee_journeys (id, employee_id, template_id, template_version, title_snapshot, start_date, assigned_by) values ($1, $2, $3, 1, 'Shared snapshot A', '2026-10-22', $4), ($5, $6, $7, 1, 'HAN snapshot B', '2026-10-22', $4)",
      [
        "00000000-0000-4000-8000-000000000050",
        accounts.employeeA,
        "00000000-0000-4000-8000-000000000020",
        accounts.hrAdmin,
        "00000000-0000-4000-8000-000000000051",
        accounts.employeeB,
        "00000000-0000-4000-8000-000000000022",
      ],
    );
    await database.query(
      "insert into public.journey_activities (id, journey_id, source_template_item_id, source_content_id, content_version, title_snapshot, content_type_snapshot, content_body_snapshot, milestone_name_snapshot, milestone_sequence, activity_sequence, is_required, available_at, completion_rule, include_in_progress) values ($1, $2, $3, $4, 1, 'Shared snapshot A', 'text', '{}'::jsonb, 'D1', 0, 0, true, '2026-10-22', 'content_acknowledgement', true), ($5, $6, $7, $8, 1, 'HAN snapshot B', 'text', '{}'::jsonb, 'D1', 0, 0, true, '2026-10-22', 'content_acknowledgement', true)",
      [
        "00000000-0000-4000-8000-000000000060",
        "00000000-0000-4000-8000-000000000050",
        "00000000-0000-4000-8000-000000000040",
        "00000000-0000-4000-8000-000000000010",
        "00000000-0000-4000-8000-000000000061",
        "00000000-0000-4000-8000-000000000051",
        "00000000-0000-4000-8000-000000000042",
        "00000000-0000-4000-8000-000000000012",
      ],
    );
    await database.query(
      "insert into public.activity_events (id, journey_activity_id, journey_id, actor_id, event_type) values ($1, $2, $3, $4, 'self_confirmed'), ($5, $6, $7, $8, 'self_confirmed')",
      [
        "00000000-0000-4000-8000-000000000070",
        "00000000-0000-4000-8000-000000000060",
        "00000000-0000-4000-8000-000000000050",
        accounts.employeeA,
        "00000000-0000-4000-8000-000000000071",
        "00000000-0000-4000-8000-000000000061",
        "00000000-0000-4000-8000-000000000051",
        accounts.employeeB,
      ],
    );
  });

  afterAll(async () => {
    await database.close();
  });

  it("lets Employee A read only Employee A's profile", async () => {
    const result = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select id, role from public.profiles order by id",
    );
    expect(result.rows).toEqual([{ id: accounts.employeeA, role: "employee" }]);
  });

  it("lets Employee B read only Employee B's profile", async () => {
    const result = await queryAs(
      "authenticated",
      accounts.employeeB,
      "select id, role from public.profiles order by id",
    );
    expect(result.rows).toEqual([{ id: accounts.employeeB, role: "employee" }]);
  });

  it("lets HR Admin read profiles in the demo scope", async () => {
    const result = await queryAs(
      "authenticated",
      accounts.hrAdmin,
      "select id from public.profiles order by id",
    );
    expect(result.rows).toHaveLength(4);
  });

  it("filters published content by company, audience, and employee scope", async () => {
    const result = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select id from public.contents order by id",
    );
    expect((result.rows as Array<{ id: string }>).map((row) => row.id)).toEqual([
      "00000000-0000-4000-8000-000000000010",
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000013",
    ]);
  });

  it("filters content versions to the current published version", async () => {
    const result = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select content_id from public.content_versions order by content_id",
    );
    expect(result.rows).toHaveLength(3);
    expect((result.rows as Array<{ content_id: string }>).map((row) => row.content_id)).not.toContain(
      "00000000-0000-4000-8000-000000000014",
    );
  });

  it("filters templates, milestones, and items using the employee audience", async () => {
    const templates = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select id from public.templates order by id",
    );
    const milestones = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select id from public.milestones order by id",
    );
    const items = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select id from public.template_items order by id",
    );
    expect(templates.rows).toHaveLength(3);
    expect(milestones.rows).toHaveLength(3);
    expect(items.rows).toHaveLength(3);
  });

  it("limits journeys, activity snapshots, and events to each employee", async () => {
    const employeeAJourneys = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select id from public.employee_journeys order by id",
    );
    const employeeAActivities = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select id from public.journey_activities order by id",
    );
    const employeeAEvents = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select id from public.activity_events order by id",
    );
    const employeeBJourneys = await queryAs(
      "authenticated",
      accounts.employeeB,
      "select id from public.employee_journeys order by id",
    );
    const employeeBActivities = await queryAs(
      "authenticated",
      accounts.employeeB,
      "select id from public.journey_activities order by id",
    );
    const employeeBEvents = await queryAs(
      "authenticated",
      accounts.employeeB,
      "select id from public.activity_events order by id",
    );

    expect(employeeAJourneys.rows).toEqual([
      { id: "00000000-0000-4000-8000-000000000050" },
    ]);
    expect(employeeAActivities.rows).toEqual([
      { id: "00000000-0000-4000-8000-000000000060" },
    ]);
    expect(employeeAEvents.rows).toEqual([
      { id: "00000000-0000-4000-8000-000000000070" },
    ]);
    expect(employeeBJourneys.rows).toEqual([
      { id: "00000000-0000-4000-8000-000000000051" },
    ]);
    expect(employeeBActivities.rows).toEqual([
      { id: "00000000-0000-4000-8000-000000000061" },
    ]);
    expect(employeeBEvents.rows).toEqual([
      { id: "00000000-0000-4000-8000-000000000071" },
    ]);
  });

  it("lets HR Admin read every seeded journey and event", async () => {
    const journeys = await queryAs(
      "authenticated",
      accounts.hrAdmin,
      "select id from public.employee_journeys",
    );
    const activities = await queryAs(
      "authenticated",
      accounts.hrAdmin,
      "select id from public.journey_activities",
    );
    const events = await queryAs(
      "authenticated",
      accounts.hrAdmin,
      "select id from public.activity_events",
    );
    expect(journeys.rows).toHaveLength(2);
    expect(activities.rows).toHaveLength(2);
    expect(events.rows).toHaveLength(2);
  });

  it("filters support contacts by employee audience", async () => {
    const hcmContacts = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select id from public.support_contacts order by id",
    );
    const hanContacts = await queryAs(
      "authenticated",
      accounts.employeeB,
      "select id from public.support_contacts order by id",
    );
    const adminContacts = await queryAs(
      "authenticated",
      accounts.hrAdmin,
      "select id from public.support_contacts",
    );
    expect(hcmContacts.rows).toEqual([
      { id: "00000000-0000-4000-8000-000000000080" },
    ]);
    expect(hanContacts.rows).toEqual([
      { id: "00000000-0000-4000-8000-000000000081" },
    ]);
    expect(adminContacts.rows).toHaveLength(2);
  });

  it("keeps UX feedback private to its employee and available to HR", async () => {
    const employeeAFeedback = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select id, message from public.ux_feedback order by id",
    );
    const employeeBFeedback = await queryAs(
      "authenticated",
      accounts.employeeB,
      "select id, message from public.ux_feedback order by id",
    );
    const adminFeedback = await queryAs(
      "authenticated",
      accounts.hrAdmin,
      "select id from public.ux_feedback",
    );
    expect(employeeAFeedback.rows).toHaveLength(1);
    expect(employeeAFeedback.rows[0]).toMatchObject({
      id: "00000000-0000-4000-8000-000000000082",
    });
    expect(employeeBFeedback.rows).toHaveLength(1);
    expect(employeeBFeedback.rows[0]).toMatchObject({
      id: "00000000-0000-4000-8000-000000000083",
    });
    expect(adminFeedback.rows).toHaveLength(2);
  });

  it("does not let employees write progress or activity events directly", async () => {
    await expect(
      queryAs(
        "authenticated",
        accounts.employeeA,
        "update public.employee_journeys set status = 'completed' where id = '00000000-0000-4000-8000-000000000050'",
      ),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      queryAs(
        "authenticated",
        accounts.employeeA,
        "insert into public.activity_events (journey_activity_id, journey_id, actor_id, event_type) values ('00000000-0000-4000-8000-000000000060', '00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000001', 'self_confirmed')",
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("lets HR Admin manage progress with a required audit note", async () => {
    const result = await transactionAs(
      "authenticated",
      accounts.hrAdmin,
      async () => {
        const completed = await database.query(
          "select public.manage_journey_activity($1::uuid, 'complete', 'Reviewed evidence with the employee.') as result",
          ["00000000-0000-4000-8000-000000000060"],
        );
        const completedState = await database.query(
          "select status, completion_source, completed_by from public.journey_activities where id = $1::uuid",
          ["00000000-0000-4000-8000-000000000060"],
        );
        const waived = await database.query(
          "select public.manage_journey_activity($1::uuid, 'waive', 'Duplicate activity for this demo role.') as result",
          ["00000000-0000-4000-8000-000000000061"],
        );
        const reopened = await database.query(
          "select public.manage_journey_activity($1::uuid, 'reopen', 'Reopened for a fresh review.') as result",
          ["00000000-0000-4000-8000-000000000060"],
        );
        const events = await database.query(
          "select event_type, actor_id, event_data ->> 'note' as note from public.activity_events where journey_activity_id = $1::uuid order by created_at desc limit 3",
          ["00000000-0000-4000-8000-000000000060"],
        );
        return { completed, completedState, waived, reopened, events };
      },
    );
    expect(result.completed.rows).toEqual([
      {
        result: {
          activity_id: "00000000-0000-4000-8000-000000000060",
          status: "completed",
          event_type: "admin_completed",
        },
      },
    ]);
    expect(result.completedState.rows).toEqual([
      {
        status: "completed",
        completion_source: "hr_admin",
        completed_by: accounts.hrAdmin,
      },
    ]);
    expect(result.waived.rows).toEqual([
      {
        result: {
          activity_id: "00000000-0000-4000-8000-000000000061",
          status: "waived",
          event_type: "waived",
        },
      },
    ]);
    expect(result.reopened.rows).toEqual([
      {
        result: {
          activity_id: "00000000-0000-4000-8000-000000000060",
          status: "not_started",
          event_type: "reopened",
        },
      },
    ]);
    expect(result.events.rows).toEqual(
      expect.arrayContaining([
        {
          event_type: "admin_completed",
          actor_id: accounts.hrAdmin,
          note: "Reviewed evidence with the employee.",
        },
        {
          event_type: "reopened",
          actor_id: accounts.hrAdmin,
          note: "Reopened for a fresh review.",
        },
      ]),
    );
    await expect(
      queryAs(
        "authenticated",
        accounts.employeeA,
        "select public.manage_journey_activity('00000000-0000-4000-8000-000000000060', 'complete', 'Not allowed')",
      ),
    ).rejects.toThrow(/HR Admin permission required/i);
    await expect(
      queryAs(
        "authenticated",
        accounts.hrAdmin,
        "select public.manage_journey_activity('00000000-0000-4000-8000-000000000060', 'complete', '   ')",
      ),
    ).rejects.toThrow(/audit note/i);
  });

  it("lets HR Admin maintain support contacts through scoped RPCs", async () => {
    const result = await transactionAs(
      "authenticated",
      accounts.hrAdmin,
      async () => {
        const created = await database.query(
          "select public.upsert_support_contact(null, '{\"display_name\":\"Demo People Team\",\"support_role\":\"People support\",\"scope_type\":\"company\",\"scope_value\":null,\"contact_email\":\"people@example.invalid\"}'::jsonb) as id",
        );
        const contactId = (created.rows as Array<{ id: string }>)[0]!.id;
        const updated = await database.query(
          "select public.upsert_support_contact($1::uuid, '{\"display_name\":\"Demo People Team Updated\",\"support_role\":\"People support\",\"scope_type\":\"office\",\"scope_value\":\"HCM\",\"contact_email\":\"people@example.invalid\"}'::jsonb) as id",
          [contactId],
        );
        await database.query(
          "select public.archive_support_contact($1::uuid)",
          [contactId],
        );
        const contact = await database.query(
          "select display_name, scope_type, scope_value, is_active from public.support_contacts where id = $1::uuid",
          [contactId],
        );
        return { contactId, updated, contact };
      },
    );
    expect(result.updated.rows).toEqual([{ id: result.contactId }]);
    expect(result.contact.rows).toEqual([
      {
        display_name: "Demo People Team Updated",
        scope_type: "office",
        scope_value: "HCM",
        is_active: false,
      },
    ]);
    await expect(
      queryAs(
        "authenticated",
        accounts.employeeA,
        "select public.upsert_support_contact(null, '{\"display_name\":\"Fake\",\"support_role\":\"Fake\",\"contact_email\":\"fake@example.invalid\"}'::jsonb)",
      ),
    ).rejects.toThrow(/HR Admin permission required/i);
    await expect(
      queryAs(
        "authenticated",
        accounts.hrAdmin,
        "select public.upsert_support_contact(null, '{\"display_name\":\"Bad URL\",\"support_role\":\"Support\",\"contact_url\":\"javascript:alert(1)\"}'::jsonb)",
      ),
    ).rejects.toThrow(/Invalid support contact/i);
  });

  it("submits UX feedback outside onboarding progress with owner-scoped reads", async () => {
    const result = await transactionAs(
      "authenticated",
      accounts.employeeA,
      async () => {
        const created = await database.query(
          "select public.submit_ux_feedback('roadmap', 'The sample milestone labels are clear.', '/roadmap') as id",
        );
        const ownFeedback = await database.query(
          "select employee_id, category, message, page_path from public.ux_feedback where message = 'The sample milestone labels are clear.'",
        );
        return { created, ownFeedback };
      },
    );
    expect(result.created.rows).toEqual([{ id: expect.any(String) }]);
    expect(result.ownFeedback.rows).toEqual([
      {
        employee_id: accounts.employeeA,
        category: "roadmap",
        message: "The sample milestone labels are clear.",
        page_path: "/roadmap",
      },
    ]);
    await expect(
      queryAs(
        "authenticated",
        accounts.employeeA,
        "insert into public.ux_feedback (employee_id, category, message) values ('" +
          accounts.employeeA +
          "', 'other', 'Direct write')",
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("assigns a published template once and snapshots content immutably", async () => {
    const assignment = await transactionAs(
      "authenticated",
      accounts.hrAdmin,
      async () => {
        const first = await database.query(
          "select public.assign_template_to_employee($1::uuid, $2::uuid, '2026-10-22'::date) as id",
          [
            "00000000-0000-4000-8000-000000000021",
            accounts.employeeA,
          ],
        );
        const journeyId = (first.rows as Array<{ id: string }>)[0]!.id;
        await database.query(
          "select public.assign_template_to_employee($1::uuid, $2::uuid, '2026-11-01'::date)",
          [
            "00000000-0000-4000-8000-000000000021",
            accounts.employeeA,
          ],
        );
        const journeys = await database.query(
          "select id, start_date from public.employee_journeys where employee_id = $1::uuid and template_id = $2::uuid",
          [accounts.employeeA, "00000000-0000-4000-8000-000000000021"],
        );
        const activities = await database.query(
          "select title_snapshot, content_version, content_body_snapshot from public.journey_activities where journey_id = $1::uuid",
          [journeyId],
        );
        await database.exec("reset role");
        await database.query(
          "update public.content_versions set body = '{\"text\":\"Changed source\"}'::jsonb where content_id = $1::uuid and version_number = 1",
          ["00000000-0000-4000-8000-000000000011"],
        );
        const snapshotAfterSourceEdit = await database.query(
          "select content_body_snapshot from public.journey_activities where journey_id = $1::uuid",
          [journeyId],
        );
        return { journeys, activities, snapshotAfterSourceEdit };
      },
    );

    const assignedJourney = (
      assignment.journeys.rows as Array<{ id: string; start_date: Date }>
    )[0]!;
    expect(assignedJourney.id).toEqual(expect.any(String));
    expect(assignedJourney.start_date.toISOString()).toBe(
      "2026-10-22T00:00:00.000Z",
    );
    expect(assignment.activities.rows).toEqual([
      {
        title_snapshot: "HCM Guide",
        content_version: 1,
        content_body_snapshot: {},
      },
    ]);
    expect(assignment.snapshotAfterSourceEdit.rows).toEqual([
      { content_body_snapshot: {} },
    ]);
  });

  it("rejects assignments outside the employee audience", async () => {
    await expect(
      queryAs(
        "authenticated",
        accounts.hrAdmin,
        "select public.assign_template_to_employee('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000002', '2026-10-22')",
      ),
    ).rejects.toThrow(/outside the template audience/i);
  });

  it("does not let an employee invoke HR content-management functions", async () => {
    await expect(
      queryAs(
        "authenticated",
        accounts.employeeA,
        "select public.create_content_draft('{\"slug\":\"blocked-draft\",\"title\":\"Blocked\",\"content_type\":\"text\",\"body\":{}}'::jsonb)",
      ),
    ).rejects.toThrow(/HR Admin permission required/i);
  });

  it("restricts template authoring to HR Admin", async () => {
    await expect(
      queryAs(
        "authenticated",
        accounts.employeeA,
        "select public.create_template_draft('{\"slug\":\"blocked-template\",\"name\":\"Blocked\"}'::jsonb)",
      ),
    ).rejects.toThrow(/HR Admin permission required/i);
  });

  it("lets HR Admin edit, order, remove, and publish template structure", async () => {
    const result = await transactionAs(
      "authenticated",
      accounts.hrAdmin,
      async () => {
        const created = await database.query(
          "select public.create_template_draft($1::jsonb) as id",
          [
            JSON.stringify({
              slug: "rpc-template",
              name: "RPC Template",
              scope_type: "company",
              scope_value: null,
            }),
          ],
        );
        const templateId = (created.rows as Array<{ id: string }>)[0]!.id;
        const firstMilestone = await database.query(
          "select public.add_template_milestone($1::uuid, 'First milestone', 0, 0) as id",
          [templateId],
        );
        const firstMilestoneId =
          (firstMilestone.rows as Array<{ id: string }>)[0]!.id;
        const secondMilestone = await database.query(
          "select public.add_template_milestone($1::uuid, 'Second milestone', 1, 7) as id",
          [templateId],
        );
        const secondMilestoneId =
          (secondMilestone.rows as Array<{ id: string }>)[0]!.id;
        const firstItem = await database.query(
          "select public.add_template_item($1::uuid, $2::uuid, 0, true, 0, null::integer, 'content_acknowledgement', true, '{}'::jsonb) as id",
          [firstMilestoneId, "00000000-0000-4000-8000-000000000010"],
        );
        const firstItemId = (firstItem.rows as Array<{ id: string }>)[0]!.id;
        const secondItem = await database.query(
          "select public.add_template_item($1::uuid, $2::uuid, 1, true, 0, null::integer, 'content_acknowledgement', true, '{}'::jsonb) as id",
          [firstMilestoneId, "00000000-0000-4000-8000-000000000010"],
        );
        const secondItemId = (secondItem.rows as Array<{ id: string }>)[0]!.id;

        await database.query(
          "select public.move_template_item($1::uuid, 'up')",
          [secondItemId],
        );
        await database.query(
          "select public.update_template_item($1::uuid, false, 5, 14, 'content_acknowledgement', false)",
          [firstItemId],
        );
        await database.query("select public.remove_template_item($1::uuid)", [
          secondItemId,
        ]);
        await database.query(
          "select public.move_template_milestone($1::uuid, 'up')",
          [secondMilestoneId],
        );
        await database.query(
          "select public.update_template_milestone($1::uuid, 'Updated first', 3)",
          [firstMilestoneId],
        );
        await database.query(
          "select public.remove_template_milestone($1::uuid)",
          [secondMilestoneId],
        );
        const published = await database.query(
          "select public.publish_template($1::uuid) as version",
          [templateId],
        );
        const milestones = await database.query(
          "select name, sequence, is_active from public.milestones where template_id = $1::uuid order by sequence",
          [templateId],
        );
        const items = await database.query(
          "select sequence, is_active, is_required, available_offset_days, due_offset_days, completion_rule, include_in_progress from public.template_items where milestone_id = $1::uuid order by sequence",
          [firstMilestoneId],
        );
        return { published, milestones, items };
      },
    );

    expect(result.published.rows).toEqual([{ version: 1 }]);
    expect(result.milestones.rows).toEqual([
      { name: "Second milestone", sequence: 0, is_active: false },
      { name: "Updated first", sequence: 1, is_active: true },
    ]);
    expect(result.items.rows).toEqual([
      {
        sequence: 0,
        is_active: false,
        is_required: true,
        available_offset_days: 0,
        due_offset_days: null,
        completion_rule: "content_acknowledgement",
        include_in_progress: true,
      },
      {
        sequence: 1,
        is_active: true,
        is_required: false,
        available_offset_days: 5,
        due_offset_days: 14,
        completion_rule: "content_acknowledgement",
        include_in_progress: false,
      },
    ]);
  });

  it("recognizes the separate HRD demo account as HR Admin", async () => {
    const result = await queryAs(
      "authenticated",
      accounts.hrd,
      "select public.current_user_is_hr_admin() as is_admin",
    );
    expect(result.rows).toEqual([{ is_admin: true }]);
  });

  it("does not let Employee A update their own role", async () => {
    await expect(
      queryAs(
        "authenticated",
        accounts.employeeA,
        "update public.profiles set role = 'hr_admin' where id = '" +
          accounts.employeeA +
          "'",
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("does not allow anonymous access to profiles", async () => {
    await expect(
      queryAs("anon", null, "select id from public.profiles"),
    ).rejects.toThrow(/permission denied/i);
  });

  it("seeds only synthetic demo records and is safe to rerun", async () => {
    const seed = await readFile(resolve(process.cwd(), "supabase/seed.sql"), "utf8");
    await database.exec(seed);
    await database.exec(seed);

    const counts = await database.query(
      "select (select count(*) from public.contents where slug like 'demo-%') as contents, (select count(*) from public.templates where slug = 'demo-starter-journey') as templates, (select count(*) from public.milestones m join public.templates t on t.id = m.template_id where t.slug = 'demo-starter-journey') as milestones, (select count(*) from public.template_items i join public.milestones m on m.id = i.milestone_id join public.templates t on t.id = m.template_id where t.slug = 'demo-starter-journey') as items, (select count(*) from public.employee_journeys j join public.templates t on t.id = j.template_id where t.slug = 'demo-starter-journey') as journeys, (select count(*) from public.journey_activities a join public.employee_journeys j on j.id = a.journey_id join public.templates t on t.id = j.template_id where t.slug = 'demo-starter-journey') as activities, (select count(*) from public.activity_events e join public.employee_journeys j on j.id = e.journey_id join public.templates t on t.id = j.template_id where t.slug = 'demo-starter-journey') as events",
    );
    expect(counts.rows).toEqual([
      {
        contents: 5,
        templates: 1,
        milestones: 2,
        items: 5,
        journeys: 2,
        activities: 10,
        events: 10,
      },
    ]);

    const journey = await database.query(
      "select j.id from public.employee_journeys j join public.templates t on t.id = j.template_id where j.employee_id = $1::uuid and t.slug = 'demo-starter-journey'",
      [accounts.employeeA],
    );
    const journeyId = (journey.rows as Array<{ id: string }>)[0]!.id;
    const activityResult = await database.query(
      "select id, title_snapshot from public.journey_activities where journey_id = $1::uuid",
      [journeyId],
    );
    const activityIds = Object.fromEntries(
      (activityResult.rows as Array<{ id: string; title_snapshot: string }>).map(
        (activity) => [activity.title_snapshot, activity.id],
      ),
    );
    const publicQuiz = await database.query(
      "select cv.body from public.contents c join public.content_versions cv on cv.content_id = c.id and cv.version_number = c.current_version where c.slug = 'demo-knowledge-check'",
    );
    expect(publicQuiz.rows).toEqual([
      {
        body: {
          kind: "quiz",
          prompt: "Which action should you take when an instruction is unclear?",
          options: [
            "Ask the assigned buddy or supervisor",
            "Guess and continue",
            "Skip the step",
          ],
        },
      },
    ]);
    const employeePrivateContent = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select answer_config from public.content_private_configs",
    );
    expect(employeePrivateContent.rows).toEqual([]);
    const employeeVisibleAnswerKey = await queryAs(
      "authenticated",
      accounts.employeeA,
      "select cv.body -> 'answer_index' as answer_index from public.content_versions cv join public.contents c on c.id = cv.content_id where c.slug = 'demo-knowledge-check' and cv.version_number = c.current_version",
    );
    expect(employeeVisibleAnswerKey.rows).toEqual([{ answer_index: null }]);
    const hrPrivateContent = await queryAs(
      "authenticated",
      accounts.hrAdmin,
      "select answer_config ->> 'answer_index' as answer_index from public.content_private_configs",
    );
    expect(hrPrivateContent.rows).toContainEqual({ answer_index: "0" });
    await expect(
      queryAs(
        "authenticated",
        accounts.employeeA,
        "select answer_config_snapshot from public.journey_activity_private",
      ),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      transactionAs("authenticated", accounts.employeeB, async () => {
        await database.query(
          "select public.complete_journey_activity($1::uuid, '{\"acknowledged\":true}'::jsonb)",
          [activityIds["Welcome to Your First Week"]],
        );
      }),
    ).rejects.toThrow(/only the assigned active employee/i);

    await expect(
      transactionAs("authenticated", accounts.employeeA, async () => {
        await database.query(
          "select public.complete_journey_activity($1::uuid, '{\"answers\":{\"sample_team\":\"Team Alpha\"}}'::jsonb)",
          [activityIds["Demo First Week Check-in"]],
        );
      }),
    ).rejects.toThrow(/required form field is missing/i);

    const completionResults = await transactionAs(
      "authenticated",
      accounts.employeeA,
      async () => {
        const acknowledgement = await database.query(
          "select public.complete_journey_activity($1::uuid, '{\"acknowledged\":true}'::jsonb) as result",
          [activityIds["Welcome to Your First Week"]],
        );
        const offlineTask = await database.query(
          "select public.complete_journey_activity($1::uuid, '{\"confirmed\":true}'::jsonb) as result",
          [activityIds["Shift Readiness Practice"]],
        );
        const failedQuiz = await database.query(
          "select public.complete_journey_activity($1::uuid, '{\"answer_index\":1}'::jsonb) as result",
          [activityIds["Sample Knowledge Check"]],
        );
        const passedQuiz = await database.query(
          "select public.complete_journey_activity($1::uuid, '{\"answer_index\":0}'::jsonb) as result",
          [activityIds["Sample Knowledge Check"]],
        );
        const form = await database.query(
          "select public.complete_journey_activity($1::uuid, '{\"answers\":{\"buddy_question\":\"Ask the demo buddy\",\"sample_team\":\"Team Alpha\"}}'::jsonb) as result",
          [activityIds["Demo First Week Check-in"]],
        );
        const submissions = await database.query(
          "select answer_payload, score, passed from public.activity_submissions where journey_activity_id in ($1::uuid, $2::uuid) order by submitted_at",
          [
            activityIds["Sample Knowledge Check"],
            activityIds["Demo First Week Check-in"],
          ],
        );
        const states = await database.query(
          "select title_snapshot, status, completion_source from public.journey_activities where journey_id = $1::uuid order by milestone_sequence, activity_sequence",
          [journeyId],
        );
        await database.exec("reset role");
        await database.query(
          "select set_config('request.jwt.claim.sub', $1, true)",
          [accounts.employeeB],
        );
        await database.exec("set local role authenticated");
        const employeeBCannotReadAnswers = await database.query(
          "select id from public.activity_submissions where journey_id = $1::uuid",
          [journeyId],
        );
        await database.exec("reset role");
        await database.query(
          "select set_config('request.jwt.claim.sub', $1, true)",
          [accounts.hrAdmin],
        );
        await database.exec("set local role authenticated");
        const hrCanReadSubmissions = await database.query(
          "select id from public.activity_submissions",
        );
        return {
          acknowledgement,
          offlineTask,
          failedQuiz,
          passedQuiz,
          form,
          submissions,
          states,
          employeeBCannotReadAnswers,
          hrCanReadSubmissions,
        };
      },
    );

    expect(completionResults.acknowledgement.rows).toEqual([
      { result: { completed: true, completion_source: "content_acknowledgement" } },
    ]);
    expect(completionResults.offlineTask.rows).toEqual([
      { result: { completed: true, completion_source: "employee_self_confirmation" } },
    ]);
    expect(completionResults.failedQuiz.rows).toEqual([
      { result: { completed: false, score: 0, passed: false, completion_source: "quiz_pass" } },
    ]);
    expect(completionResults.passedQuiz.rows).toEqual([
      { result: { completed: true, score: 1, passed: true, completion_source: "quiz_pass" } },
    ]);
    expect(completionResults.form.rows).toEqual([
      { result: { completed: true, completion_source: "form_submission" } },
    ]);
    expect(completionResults.submissions.rows).toHaveLength(3);
    expect(completionResults.states.rows).toContainEqual({
      title_snapshot: "Sample Knowledge Check",
      status: "completed",
      completion_source: "quiz_pass",
    });

    expect(completionResults.employeeBCannotReadAnswers.rows).toEqual([]);
    expect(completionResults.hrCanReadSubmissions.rows).toHaveLength(3);
  });

  it("previews and applies a template update while preserving completed snapshots", async () => {
    const template = await database.query(
      "select id from public.templates where slug = 'demo-starter-journey'",
    );
    const templateId = (template.rows as Array<{ id: string }>)[0]!.id;
    const supportContent = await database.query(
      "select id from public.contents where slug = 'demo-support-map'",
    );
    const supportContentId = (supportContent.rows as Array<{ id: string }>)[0]!.id;
    const milestones = await database.query(
      "select id, name from public.milestones where template_id = $1::uuid and is_active",
      [templateId],
    );
    const milestoneIds = Object.fromEntries(
      (milestones.rows as Array<{ id: string; name: string }>).map((milestone) => [milestone.name, milestone.id]),
    );
    const itemResult = await database.query(
      "select i.id, c.slug from public.template_items i join public.milestones m on m.id = i.milestone_id join public.contents c on c.id = i.content_id where m.template_id = $1::uuid and i.is_active",
      [templateId],
    );
    const itemIds = Object.fromEntries(
      (itemResult.rows as Array<{ id: string; slug: string }>).map((item) => [item.slug, item.id]),
    );
    const employeeJourney = await database.query(
      "select id from public.employee_journeys where template_id = $1::uuid and employee_id = $2::uuid",
      [templateId, accounts.employeeA],
    );
    const journeyId = (employeeJourney.rows as Array<{ id: string }>)[0]!.id;
    const journeyActivityResult = await database.query(
      "select id, title_snapshot from public.journey_activities where journey_id = $1::uuid",
      [journeyId],
    );
    const activityIds = Object.fromEntries(
      (journeyActivityResult.rows as Array<{ id: string; title_snapshot: string }>).map((activity) => [activity.title_snapshot, activity.id]),
    );

    const completedExamples = await commitAs(
      "authenticated",
      accounts.employeeA,
      async () => {
        const welcome = await database.query(
          "select public.complete_journey_activity($1::uuid, '{\"acknowledged\":true}'::jsonb) as result",
          [activityIds["Welcome to Your First Week"]],
        );
        const task = await database.query(
          "select public.complete_journey_activity($1::uuid, '{\"confirmed\":true}'::jsonb) as result",
          [activityIds["Shift Readiness Practice"]],
        );
        return { welcome, task };
      },
    );
    expect(completedExamples.welcome.rows[0]).toMatchObject({
      result: { completed: true },
    });
    expect(completedExamples.task.rows[0]).toMatchObject({
      result: { completed: true },
    });

    const previewState = await commitAs(
      "authenticated",
      accounts.hrAdmin,
      async () => {
        await database.query(
          "select public.manage_journey_activity($1::uuid, 'reopen', 'Reopened for the template update sample.')",
          [activityIds["Shift Readiness Practice"]],
        );
        await database.query(
          "select public.reopen_template_draft($1::uuid)",
          [templateId],
        );
        await database.query(
          "select public.update_template_draft($1::uuid, $2::jsonb)",
          [
            templateId,
            JSON.stringify({
              name: "Demo Starter Journey",
              description: "Fictional update preview test.",
              scope_type: "office",
              scope_value: "Demo Office A",
            }),
          ],
        );
        await database.query(
          "select public.remove_template_item($1::uuid)",
          [itemIds["demo-support-map"]],
        );
        await database.query(
          "select public.update_template_item($1::uuid, true, 2, 5, 'manual_self_confirmation', true)",
          [itemIds["demo-shift-readiness"]],
        );
        await database.query(
          "select public.add_template_item($1::uuid, $2::uuid, 3, false, 0, null::integer, 'content_acknowledgement', true, '{}'::jsonb) as id",
          [milestoneIds["First Week"], supportContentId],
        );
        const published = await database.query(
          "select public.publish_template($1::uuid) as version",
          [templateId],
        );
        const preview = await database.query(
          "select journey_id, employee_id, from_version, to_version, added_count, updated_count, removed_count, preserved_count, eligible, reason from public.preview_template_journey_updates($1::uuid) order by employee_id",
          [templateId],
        );
        return { published, preview };
      },
    );

    expect(previewState.published.rows).toEqual([{ version: 2 }]);
    expect(previewState.preview.rows).toEqual([
      {
        journey_id: journeyId,
        employee_id: accounts.employeeA,
        from_version: 1,
        to_version: 2,
        added_count: 1,
        updated_count: 1,
        removed_count: 1,
        preserved_count: 1,
        eligible: true,
        reason: null,
      },
      {
        journey_id: expect.any(String),
        employee_id: accounts.employeeB,
        from_version: 1,
        to_version: 2,
        added_count: 1,
        updated_count: 1,
        removed_count: 1,
        preserved_count: 0,
        eligible: false,
        reason: "Employee is outside the published template audience",
      },
    ]);

    await expect(
      queryAs(
        "authenticated",
        accounts.employeeA,
        `select * from public.preview_template_journey_updates('${templateId}'::uuid)`,
      ),
    ).rejects.toThrow(/HR Admin permission required/i);
    await expect(
      queryAs(
        "authenticated",
        accounts.employeeA,
        `select public.apply_template_update_to_journey('${journeyId}'::uuid, 2)`,
      ),
    ).rejects.toThrow(/HR Admin permission required/i);
    await expect(
      queryAs(
        "authenticated",
        accounts.hrAdmin,
        `select public.apply_template_update_to_journey('${journeyId}'::uuid, 1)`,
      ),
    ).rejects.toThrow(/version changed after preview/i);
    const employeeBJourneyId = (previewState.preview.rows as Array<{
      journey_id: string;
      employee_id: string;
    }>).find((preview) => preview.employee_id === accounts.employeeB)!.journey_id;
    await expect(
      queryAs(
        "authenticated",
        accounts.hrAdmin,
        `select public.apply_template_update_to_journey('${employeeBJourneyId}'::uuid, 2)`,
      ),
    ).rejects.toThrow(/outside the published template audience/i);

    const applied = await commitAs(
      "authenticated",
      accounts.hrAdmin,
      async () => {
        const result = await database.query(
          "select public.apply_template_update_to_journey($1::uuid, 2) as result",
          [journeyId],
        );
        const journey = await database.query(
          "select template_version from public.employee_journeys where id = $1::uuid",
          [journeyId],
        );
        const activities = await database.query(
          "select title_snapshot, milestone_name_snapshot, content_version, status, available_at from public.journey_activities where journey_id = $1::uuid order by milestone_sequence, activity_sequence",
          [journeyId],
        );
        const updateLog = await database.query(
          "select from_version, to_version, added_count, updated_count, removed_count, preserved_count, applied_by from public.journey_template_updates where journey_id = $1::uuid",
          [journeyId],
        );
        const appliedEvents = await database.query(
          "select event_data ->> 'change' as change from public.activity_events where journey_id = $1::uuid and event_type = 'template_update_applied'",
          [journeyId],
        );
        return { result, journey, activities, updateLog, appliedEvents };
      },
    );

    expect(applied.result.rows).toEqual([
      {
        result: {
          journey_id: journeyId,
          from_version: 1,
          to_version: 2,
          added_count: 1,
          updated_count: 1,
          removed_count: 1,
          preserved_count: 1,
        },
      },
    ]);
    expect(applied.journey.rows).toEqual([{ template_version: 2 }]);
    expect(applied.activities.rows).toContainEqual({
      title_snapshot: "Welcome to Your First Week",
      milestone_name_snapshot: "Getting Started",
      content_version: 1,
      status: "completed",
      available_at: expect.any(Date),
    });
    expect(applied.activities.rows).toContainEqual({
      title_snapshot: "Finding the Right Support",
      milestone_name_snapshot: "Getting Started",
      content_version: 1,
      status: "removed",
      available_at: expect.any(Date),
    });
    expect(applied.activities.rows).toContainEqual({
      title_snapshot: "Shift Readiness Practice",
      milestone_name_snapshot: "First Week",
      content_version: 1,
      status: "not_started",
      available_at: expect.any(Date),
    });
    expect(applied.activities.rows).toContainEqual({
      title_snapshot: "Finding the Right Support",
      milestone_name_snapshot: "First Week",
      content_version: 1,
      status: "not_started",
      available_at: expect.any(Date),
    });
    expect(applied.updateLog.rows).toEqual([
      {
        from_version: 1,
        to_version: 2,
        added_count: 1,
        updated_count: 1,
        removed_count: 1,
        preserved_count: 1,
        applied_by: accounts.hrAdmin,
      },
    ]);
    expect(applied.appliedEvents.rows).toEqual(
      expect.arrayContaining([
        { change: "added" },
        { change: "updated" },
        { change: "removed" },
      ]),
    );

    const employeeAudit = await queryAs(
      "authenticated",
      accounts.employeeB,
      "select id from public.journey_template_updates",
    );
    expect(employeeAudit.rows).toEqual([]);
    await expect(
      queryAs(
        "authenticated",
        accounts.hrAdmin,
        `select public.apply_template_update_to_journey('${journeyId}'::uuid, 2)`,
      ),
    ).rejects.toThrow(/already on this template version/i);
  });
});
