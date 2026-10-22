import sql from "mssql/msnodesqlv8";

// Chuỗi kết nối Windows Authentication trực tiếp qua ODBC Driver 18 cho BeeWelcomeDB
const connectionString =
  process.env.MSSQL_CONNECTION_STRING ||
  "server=localhost;Database=BeeWelcomeDB;Trusted_Connection=Yes;Driver={ODBC Driver 18 for SQL Server};TrustServerCertificate=Yes;";

// Singleton Connection Pool cho Next.js App Router
let pool: sql.ConnectionPool | null = null;
let poolConnecting: Promise<sql.ConnectionPool> | null = null;

export async function getSqlPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  if (poolConnecting) {
    return poolConnecting;
  }

  const config = {
    connectionString,
  };

  poolConnecting = (async () => {
    try {
      const newPool = new sql.ConnectionPool(config as unknown as sql.config);
      await newPool.connect();
      pool = newPool;
      return pool;
    } catch (err) {
      pool = null;
      throw err;
    } finally {
      poolConnecting = null;
    }
  })();

  return poolConnecting;
}

export { sql };
