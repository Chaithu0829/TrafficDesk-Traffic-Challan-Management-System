const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scrypt(password, salt, 64);
    return `${salt}:${hash.toString('hex')}`;
}

async function verifyPassword(password, storedValue) {
    const [salt, savedHash] = storedValue.split(':');
    if (!salt || !savedHash) return false;
    const hash = await scrypt(password, salt, 64);
    const savedBuffer = Buffer.from(savedHash, 'hex');
    return savedBuffer.length === hash.length && crypto.timingSafeEqual(savedBuffer, hash);
}

module.exports = { hashPassword, verifyPassword };
