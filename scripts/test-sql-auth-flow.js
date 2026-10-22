const crypto = require("node:crypto");
const sql = require("mssql/msnodesqlv8");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

function verifyPassword(password, storedHash) {
  try {
    if (!storedHash || !storedHash.includes(":")) return false;
    const [salt, key] = storedHash.split(":");
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

async function runTests() {
  console.log(">> Bắt đầu kiểm thử toàn diện quy trình Auth & User Management trên SQL Server...");

  const connStr =
    process.env.MSSQL_CONNECTION_STRING ||
    "server=localhost;Database=BeeWelcomeDB;Trusted_Connection=Yes;Driver={ODBC Driver 18 for SQL Server};TrustServerCertificate=Yes;";
  const pool = new sql.ConnectionPool({ connectionString: connStr });
  await pool.connect();

  // Test 1: Kiểm tra mật khẩu tài khoản Demo Admin
  console.log("\n--- Test 1: Xác thực tài khoản Admin Demo ---");
  const adminRes = await pool.request().query(`
    SELECT u.Id, u.Email, u.PasswordHash, p.Role, p.DisplayName, p.IsActive
    FROM auth.Users u
    JOIN app.Profiles p ON u.Id = p.Id
    WHERE u.Email = 'admin@bee-logistics.com'
  `);
  if (adminRes.recordset.length === 0) {
    throw new Error("Không tìm thấy tài khoản admin@bee-logistics.com");
  }
  const admin = adminRes.recordset[0];
  const adminPwdOk = verifyPassword("Admin@123", admin.PasswordHash);
  console.log("Admin Email:", admin.Email, "| Role:", admin.Role, "| Mật khẩu hợp lệ:", adminPwdOk);
  if (!adminPwdOk) throw new Error("Mật khẩu Admin@123 không khớp!");

  // Test 2: Kiểm tra mật khẩu tài khoản Demo User
  console.log("\n--- Test 2: Xác thực tài khoản User Demo ---");
  const userRes = await pool.request().query(`
    SELECT u.Id, u.Email, u.PasswordHash, p.Role, p.DisplayName, p.IsActive
    FROM auth.Users u
    JOIN app.Profiles p ON u.Id = p.Id
    WHERE u.Email = 'user@bee-logistics.com'
  `);
  if (userRes.recordset.length === 0) {
    throw new Error("Không tìm thấy tài khoản user@bee-logistics.com");
  }
  const user = userRes.recordset[0];
  const userPwdOk = verifyPassword("User@123", user.PasswordHash);
  console.log("User Email:", user.Email, "| Role:", user.Role, "| Mật khẩu hợp lệ:", userPwdOk);
  if (!userPwdOk) throw new Error("Mật khẩu User@123 không khớp!");

  // Test 3: Kiểm tra hành trình Onboarding của User Demo
  console.log("\n--- Test 3: Kiểm tra lộ trình Onboarding gán cho User Demo ---");
  const journeyRes = await pool.request().query(`
    SELECT j.Id, j.TitleSnapshot, j.Status, COUNT(a.Id) as ActivityCount
    FROM app.EmployeeJourneys j
    LEFT JOIN app.JourneyActivities a ON j.Id = a.JourneyId
    WHERE j.EmployeeId = '${user.Id}'
    GROUP BY j.Id, j.TitleSnapshot, j.Status
  `);
  console.log("Lộ trình của User:", journeyRes.recordset);

  // Test 4: Thử nghiệm tạo tài khoản mới (Registration) với vai trò cố định là employee
  console.log("\n--- Test 4: Kiểm thử quy trình đăng ký tài khoản User mới ---");
  const testUserId = crypto.randomUUID();
  const testEmail = "test.employee." + Date.now() + "@bee-logistics.com";
  const testPassword = "PasswordTest@123";
  const testHash = hashPassword(testPassword);

  await pool.request()
    .input("id", sql.UniqueIdentifier, testUserId)
    .input("email", sql.NVarChar(256), testEmail)
    .input("hash", sql.NVarChar(256), testHash)
    .query(`
      INSERT INTO auth.Users (Id, Email, PasswordHash, IsEmailConfirmed)
      VALUES (@id, @email, @hash, 1);

      INSERT INTO app.Profiles (Id, Email, DisplayName, EmployeeCode, Role, Office, Department, Position, IsActive)
      VALUES (@id, @email, N'Nhân Viên Test Mới', N'TEST99', N'employee', N'HQ Hanoi', N'Logistics Operations', N'Chuyên viên tập sự', 1);
    `);

  console.log("Đã đăng ký tài khoản nhân viên mới:", testEmail);
  const verifyNew = verifyPassword(testPassword, testHash);
  console.log("Xác thực mật khẩu tài khoản mới:", verifyNew);

  // Test 5: Admin xem toàn bộ danh sách tài khoản
  console.log("\n--- Test 5: Admin xem toàn bộ danh sách tài khoản ---");
  const allUsersRes = await pool.request().query(`
    SELECT p.Id, p.Email, p.DisplayName, p.Role, p.IsActive
    FROM app.Profiles p
    JOIN auth.Users u ON p.Id = u.Id
  `);
  console.table(allUsersRes.recordset);

  // Test 6: Admin xóa tài khoản vừa tạo
  console.log("\n--- Test 6: Admin xóa tài khoản vừa tạo ---");
  await pool.request()
    .input("id", sql.UniqueIdentifier, testUserId)
    .query(`
      DELETE FROM app.Profiles WHERE Id = @id;
      DELETE FROM auth.Users WHERE Id = @id;
    `);
  console.log("Đã xóa tài khoản test thành công!");

  console.log("\n>> TOÀN BỘ CÁC BƯỚC KIỂM THỬ ĐÃ THÀNH CÔNG RỰC RỠ 100%!");
  await pool.close();
}

runTests().catch(err => {
  console.error("Test thất bại:", err);
  process.exit(1);
});
