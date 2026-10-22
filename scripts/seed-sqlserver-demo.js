const crypto = require("node:crypto");
const sql = require("mssql/msnodesqlv8");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

async function main() {
  const connectionString =
    process.env.MSSQL_CONNECTION_STRING ||
    "server=localhost;Database=BeeWelcomeDB;Trusted_Connection=Yes;Driver={ODBC Driver 18 for SQL Server};TrustServerCertificate=Yes;";

  console.log(">> Kết nối đến BeeWelcomeDB...");
  const pool = new sql.ConnectionPool({ connectionString });
  await pool.connect();

  const adminHash = hashPassword("Admin@123");
  const userHash = hashPassword("User@123");

  console.log(">> Đang cập nhật 2 tài khoản demo chính thức...");

  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    const req = new sql.Request(tx);

    // Xóa các dữ liệu phụ thuộc của 2 tài khoản demo cũ nếu có (HRD & Employee B)
    await req.query(`
      DELETE FROM audit.ActivityEvents WHERE ActorId IN ('22222222-2222-2222-2222-222222222222', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB');
      DELETE FROM app.JourneyActivities WHERE JourneyId IN (SELECT Id FROM app.EmployeeJourneys WHERE EmployeeId = 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB');
      DELETE FROM app.EmployeeJourneys WHERE EmployeeId = 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB';
      DELETE FROM app.UxFeedback WHERE EmployeeId = 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB';
      DELETE FROM app.Profiles WHERE Id IN ('22222222-2222-2222-2222-222222222222', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB');
      DELETE FROM auth.Users WHERE Id IN ('22222222-2222-2222-2222-222222222222', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB');
    `);

    // Cập nhật Admin demo
    await req
      .input("adminHash", sql.NVarChar(256), adminHash)
      .query(`
        UPDATE auth.Users
        SET Email = 'admin@bee-logistics.com', PasswordHash = @adminHash
        WHERE Id = '11111111-1111-1111-1111-111111111111';

        UPDATE app.Profiles
        SET Email = 'admin@bee-logistics.com',
            DisplayName = N'HR Administrator',
            EmployeeCode = 'ADM001',
            Role = 'hr_admin',
            Office = N'HQ Hanoi',
            Department = N'Human Resources',
            Position = N'HR Manager'
        WHERE Id = '11111111-1111-1111-1111-111111111111';
      `);

    // Cập nhật User demo
    const req2 = new sql.Request(tx);
    await req2
      .input("userHash", sql.NVarChar(256), userHash)
      .query(`
        UPDATE auth.Users
        SET Email = 'user@bee-logistics.com', PasswordHash = @userHash
        WHERE Id = 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA';

        UPDATE app.Profiles
        SET Email = 'user@bee-logistics.com',
            DisplayName = N'Nguyễn Văn An',
            EmployeeCode = 'EMP001',
            Role = 'employee',
            Office = N'Office Da Nang',
            Department = N'Logistics Operations',
            Position = N'Logistics Coordinator'
        WHERE Id = 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA';
      `);

    await tx.commit();
    console.log(">> Đã cập nhật thành công 2 tài khoản demo!");

    const res = await pool.request().query(`
      SELECT p.Id, p.Email, p.DisplayName, p.Role, p.Department, p.Position, p.IsActive, u.CreatedAt
      FROM app.Profiles p
      JOIN auth.Users u ON p.Id = u.Id
    `);

    console.table(res.recordset);
  } catch (err) {
    await tx.rollback();
    console.error(">> Lỗi cập nhật demo:", err);
  } finally {
    await pool.close();
  }
}

main().catch(console.error);
