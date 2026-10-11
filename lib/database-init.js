const { database } = require('../db');
const { hashPassword } = require('./security');

async function foreignKeyExists(tableName, constraintName) {
    const [rows] = await database.query(
        `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
         WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
        [tableName, constraintName]
    );
    return rows.length > 0;
}

async function columnExists(tableName, columnName) {
    const [rows] = await database.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [tableName, columnName]
    );
    return rows.length > 0;
}

async function initializeDatabase() {
    await database.query(`CREATE TABLE IF NOT EXISTS violations (
        violation_id INT AUTO_INCREMENT PRIMARY KEY,
        violation_type VARCHAR(100) NOT NULL UNIQUE,
        fine DECIMAL(10,2) NOT NULL
    )`);
    await database.query(`CREATE TABLE IF NOT EXISTS vehicles (
        vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_number VARCHAR(20) NOT NULL UNIQUE,
        owner_name VARCHAR(100) NOT NULL
    )`);
    await database.query(`CREATE TABLE IF NOT EXISTS challans (
        challan_id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT NOT NULL,
        violation_id INT NOT NULL,
        payment_status ENUM('Pending', 'Paid') NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
        FOREIGN KEY (violation_id) REFERENCES violations(violation_id)
    )`);
    await database.query(`CREATE TABLE IF NOT EXISTS police_officers (
        officer_id INT AUTO_INCREMENT PRIMARY KEY,
        badge_number VARCHAR(20) NOT NULL UNIQUE,
        full_name VARCHAR(100) NOT NULL,
        station_name VARCHAR(120) NOT NULL,
        email VARCHAR(120) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await database.query(`CREATE TABLE IF NOT EXISTS admins (
        admin_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(120) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    if (!await columnExists('challans', 'police_officer_id')) {
        await database.query('ALTER TABLE challans ADD COLUMN police_officer_id INT NULL');
    }
    if (!await columnExists('challans', 'issued_at')) {
        await database.query('ALTER TABLE challans ADD COLUMN issued_at DATETIME NULL');
    }
    await database.query('UPDATE challans SET issued_at = created_at WHERE issued_at IS NULL');
    if (!await foreignKeyExists('challans', 'fk_challan_officer')) {
        await database.query(`ALTER TABLE challans ADD CONSTRAINT fk_challan_officer
            FOREIGN KEY (police_officer_id) REFERENCES police_officers(officer_id)`);
    }
    await database.query(`INSERT IGNORE INTO violations (violation_type, fine) VALUES
        ('No Helmet', 500.00), ('Over Speeding', 1000.00),
        ('Signal Jump', 1500.00), ('No Seat Belt', 500.00)`);
    const adminEmail = process.env.ADMIN_EMAIL;
    const [admins] = await database.query('SELECT admin_id FROM admins WHERE email = ?', [adminEmail]);
    if (admins.length === 0) {
       const adminPassword = process.env.ADMIN_PASSWORD;
        await database.query('INSERT INTO admins (full_name, email, password_hash) VALUES (?, ?, ?)',
            ['System Administrator', adminEmail, await hashPassword(adminPassword)]);
        console.log(`Demo administrator created for ${adminEmail}`);
    }
}

module.exports = { initializeDatabase };
