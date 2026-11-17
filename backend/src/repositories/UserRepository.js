/**
 * Acceso a datos de usuarios. Cada método recibe opcionalmente `db`
 * (una transacción); si no se envía, usa el pool.
 */
class UserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create({ name, email, passwordHash }, db = this.pool) {
    const { rows } = await db.query(
      "INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING id,name,email",
      [name, email, passwordHash],
    );
    return rows[0];
  }

  async findByEmail(email, db = this.pool) {
    const { rows } = await db.query("SELECT * FROM users WHERE email=$1", [email]);
    return rows[0] || null;
  }

  async updatePassword(userId, passwordHash, db = this.pool) {
    await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [passwordHash, userId]);
  }
}

module.exports = { UserRepository };
