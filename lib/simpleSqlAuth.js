const { Pool } = require('pg');
const crypto = require('crypto');
const logger = require('./logger');

const connectionString = process.env.DATABASE_URL;
const pool = connectionString
    ? new Pool({
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    })
    : null;

const fallbackUsers = new Map();

const ensureAuthSchema = async () => {
    if (!pool) {
        logger.warn('DATABASE_URL not configured. Falling back to in-memory auth store.');
        return false;
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS app_users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            last_login_at TIMESTAMPTZ
        );
    `);

    return true;
};

const getUserByEmail = async (email) => {
    if (!pool) {
        return fallbackUsers.get(email) || null;
    }

    const result = await pool.query(
        'SELECT id, name, email, password_hash AS "passwordHash" FROM app_users WHERE email = $1',
        [email]
    );

    return result.rows[0] || null;
};

const createUser = async ({ name, email, passwordHash }) => {
    if (!pool) {
        if (fallbackUsers.has(email)) {
            throw new Error('USER_EXISTS');
        }

        const id = crypto.randomUUID();
        const user = { id, name, email, passwordHash };
        fallbackUsers.set(email, user);
        return user;
    }

    const id = crypto.randomUUID();

    try {
        const result = await pool.query(
            `INSERT INTO app_users (id, name, email, password_hash)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email`,
            [id, name, email, passwordHash]
        );

        return result.rows[0];
    } catch (error) {
        if (error.code === '23505') {
            const duplicateError = new Error('USER_EXISTS');
            duplicateError.code = 'USER_EXISTS';
            throw duplicateError;
        }
        logger.error('Failed to create user in SQL store', { error: error.message });
        throw error;
    }
};

const recordLogin = async (userId) => {
    if (!pool) {
        return;
    }

    await pool.query(
        'UPDATE app_users SET last_login_at = NOW() WHERE id = $1',
        [userId]
    );
};

module.exports = {
    ensureAuthSchema,
    getUserByEmail,
    createUser,
    recordLogin
};
