const express = require('express');
const crypto = require('crypto');
const { database } = require('../db');
const { hashPassword, verifyPassword } = require('../lib/security');

const router = express.Router();
const sessions = new Map();
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const BADGE_PATTERN = /^[A-Z]{2}-POL-\d{4}$/;
const VEHICLE_PATTERN = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/;

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function normaliseVehicle(value = '') {
    return String(value).toUpperCase().replace(/[\s-]/g, '');
}

function normaliseBadge(value = '') {
    return String(value).toUpperCase().trim().replace(/\s+/g, '');
}

function publicUser(user) {
    return {
        id: user.id,
        role: user.role,
        name: user.name,
        badgeNumber: user.badgeNumber || null
    };
}

function createSession(user) {
    const token = crypto.randomUUID();
    sessions.set(token, { user, expiresAt: Date.now() + SESSION_DURATION_MS });
    return token;
}

function requireRole(role) {
    return (req, res, next) => {
        const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
        const session = token && sessions.get(token);
        if (!session || session.expiresAt < Date.now() || session.user.role !== role) {
            if (token) sessions.delete(token);
            return res.status(401).json({ message: 'Please log in with the required account.' });
        }
        req.user = session.user;
        next();
    };
}

router.get('/test', (req, res) => res.send('API working'));

router.get('/violations', asyncRoute(async (req, res) => {
    const [violations] = await database.query(
        'SELECT violation_id, violation_type, fine FROM violations ORDER BY violation_type'
    );
    res.json(violations);
}));

router.post('/auth/police/register', asyncRoute(async (req, res) => {
    const { fullName, stationName, email, password } = req.body;
    const badgeNumber = normaliseBadge(req.body.badgeNumber);
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!fullName?.trim() || !stationName?.trim() || !cleanEmail || !password) {
        return res.status(400).json({ message: 'Complete every registration field.' });
    }
    if (!BADGE_PATTERN.test(badgeNumber)) {
        return res.status(400).json({ message: 'Use the Police ID format TS-POL-1234.' });
    }
    if (String(password).length < 8) {
        return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
    }

    try {
        await database.query(
            `INSERT INTO police_officers (badge_number, full_name, station_name, email, password_hash)
             VALUES (?, ?, ?, ?, ?)`,
            [badgeNumber, fullName.trim(), stationName.trim(), cleanEmail, await hashPassword(password)]
        );
        res.status(201).json({ message: 'Police account created. You can now log in.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'That Police ID or email is already registered.' });
        }
        throw error;
    }
}));

router.post('/auth/login', asyncRoute(async (req, res) => {
    const { role, password } = req.body;
    const identifier = String(req.body.identifier || '').trim();
    if (!identifier || !password || !['police', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Enter your account details.' });
    }

    let account;
    let user;
    if (role === 'police') {
        const [rows] = await database.query(
            `SELECT officer_id, badge_number, full_name, password_hash
             FROM police_officers WHERE badge_number = ?`,
            [normaliseBadge(identifier)]
        );
        account = rows[0];
        user = account && { id: account.officer_id, role, name: account.full_name, badgeNumber: account.badge_number };
    } else {
        const [rows] = await database.query(
            'SELECT admin_id, full_name, password_hash FROM admins WHERE email = ?',
            [identifier.toLowerCase()]
        );
        account = rows[0];
        user = account && { id: account.admin_id, role, name: account.full_name };
    }

    if (!account || !(await verifyPassword(password, account.password_hash))) {
        return res.status(401).json({ message: 'Incorrect account details.' });
    }

    res.json({ token: createSession(user), user: publicUser(user) });
}));

router.get('/auth/me', (req, res) => {
    const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    const session = token && sessions.get(token);
    if (!session || session.expiresAt < Date.now()) return res.status(401).json({ message: 'Session expired.' });
    res.json({ user: publicUser(session.user) });
});

router.post('/auth/logout', (req, res) => {
    const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (token) sessions.delete(token);
    res.status(204).end();
});

router.post('/createChallan', requireRole('police'), asyncRoute(async (req, res) => {
    const vehicleNumber = normaliseVehicle(req.body.vehicle_number);
    const ownerName = String(req.body.owner_name || '').trim() || 'Unknown';
    const rawIds = req.body.violation_ids || [req.body.violation_id];
    const violationIds = [...new Set(rawIds.map(Number).filter(Number.isInteger))];

    if (!VEHICLE_PATTERN.test(vehicleNumber)) {
        return res.status(400).json({ message: 'Enter a valid vehicle number, for example TS09AB1234.' });
    }
    if (violationIds.length === 0) {
        return res.status(400).json({ message: 'Choose at least one violation.' });
    }

    const placeholders = violationIds.map(() => '?').join(', ');
    const [validViolations] = await database.query(
        `SELECT violation_id FROM violations WHERE violation_id IN (${placeholders})`, violationIds
    );
    if (validViolations.length !== violationIds.length) {
        return res.status(400).json({ message: 'One of the chosen violations no longer exists.' });
    }

    await database.beginTransaction();
    try {
        const [vehicles] = await database.query(
            'SELECT vehicle_id, owner_name FROM vehicles WHERE vehicle_number = ?', [vehicleNumber]
        );
        let vehicleId;
        if (vehicles.length === 0) {
            const [result] = await database.query(
                'INSERT INTO vehicles (vehicle_number, owner_name) VALUES (?, ?)', [vehicleNumber, ownerName]
            );
            vehicleId = result.insertId;
        } else {
            vehicleId = vehicles[0].vehicle_id;
            if (ownerName !== 'Unknown' && vehicles[0].owner_name === 'Unknown') {
                await database.query('UPDATE vehicles SET owner_name = ? WHERE vehicle_id = ?', [ownerName, vehicleId]);
            }
        }

        for (const violationId of violationIds) {
            await database.query(
                `INSERT INTO challans (vehicle_id, violation_id, police_officer_id, issued_at)
                 VALUES (?, ?, ?, NOW())`,
                [vehicleId, violationId, req.user.id]
            );
        }
        await database.commit();
        res.status(201).json({
            message: `${violationIds.length} challan${violationIds.length > 1 ? 's' : ''} generated for ${vehicleNumber}.`,
            vehicleNumber,
            challansCreated: violationIds.length
        });
    } catch (error) {
        await database.rollback();
        throw error;
    }
}));

router.get('/challan/:vehicle_number', asyncRoute(async (req, res) => {
    const vehicleNumber = normaliseVehicle(req.params.vehicle_number);
    const [rows] = await database.query(
        `SELECT c.challan_id, v.vehicle_number, v.owner_name, vl.violation_type, vl.fine,
                c.payment_status, c.issued_at, p.full_name AS officer_name, p.badge_number
         FROM challans c
         JOIN vehicles v ON c.vehicle_id = v.vehicle_id
         JOIN violations vl ON c.violation_id = vl.violation_id
         LEFT JOIN police_officers p ON c.police_officer_id = p.officer_id
         WHERE v.vehicle_number = ?
         ORDER BY c.issued_at DESC, c.challan_id DESC`,
        [vehicleNumber]
    );
    if (rows.length === 0) return res.json({ message: 'No challans found for this vehicle.' });
    res.json(rows);
}));

router.put('/pay/:id', asyncRoute(async (req, res) => {
    const [result] = await database.query(
        "UPDATE challans SET payment_status = 'Paid' WHERE challan_id = ?", [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Challan not found.' });
    res.json({ message: 'Payment marked as successful.' });
}));

router.get('/admin/dashboard', requireRole('admin'), asyncRoute(async (req, res) => {
    const [[police]] = await database.query('SELECT COUNT(*) AS count FROM police_officers');
    const [[vehicles]] = await database.query('SELECT COUNT(*) AS count FROM vehicles');
    const [[challans]] = await database.query('SELECT COUNT(*) AS count FROM challans');
    const [[pending]] = await database.query("SELECT COUNT(*) AS count FROM challans WHERE payment_status = 'Pending'");
    const [[revenue]] = await database.query(
        `SELECT COALESCE(SUM(vl.fine), 0) AS amount
         FROM challans c JOIN violations vl ON c.violation_id = vl.violation_id
         WHERE c.payment_status = 'Paid'`
    );
    res.json({
        totalPolice: police.count,
        totalVehicles: vehicles.count,
        totalChallans: challans.count,
        pendingChallans: pending.count,
        collectedAmount: Number(revenue.amount)
    });
}));

router.get('/admin/police', requireRole('admin'), asyncRoute(async (req, res) => {
    const [rows] = await database.query(
        `SELECT p.badge_number, p.full_name, p.station_name, p.email, p.created_at,
                COUNT(c.challan_id) AS challans_issued
         FROM police_officers p
         LEFT JOIN challans c ON c.police_officer_id = p.officer_id
         GROUP BY p.officer_id
         ORDER BY p.created_at DESC`
    );
    res.json(rows);
}));

router.get('/admin/vehicles', requireRole('admin'), asyncRoute(async (req, res) => {
    const [rows] = await database.query(
        `SELECT v.vehicle_number, v.owner_name, COUNT(c.challan_id) AS total_challans,
                COALESCE(SUM(vl.fine), 0) AS total_fines
         FROM vehicles v
         LEFT JOIN challans c ON c.vehicle_id = v.vehicle_id
         LEFT JOIN violations vl ON c.violation_id = vl.violation_id
         GROUP BY v.vehicle_id
         ORDER BY total_challans DESC, v.vehicle_number`
    );
    res.json(rows);
}));

router.get('/admin/challans', requireRole('admin'), asyncRoute(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const like = `%${search}%`;
    const [rows] = await database.query(
        `SELECT c.challan_id, c.payment_status, c.issued_at, v.vehicle_number, v.owner_name,
                vl.violation_type, vl.fine, p.full_name AS officer_name, p.badge_number
         FROM challans c
         JOIN vehicles v ON c.vehicle_id = v.vehicle_id
         JOIN violations vl ON c.violation_id = vl.violation_id
         LEFT JOIN police_officers p ON c.police_officer_id = p.officer_id
         WHERE (? = '' OR v.vehicle_number LIKE ? OR v.owner_name LIKE ?
                OR p.full_name LIKE ? OR p.badge_number LIKE ?)
         ORDER BY c.issued_at DESC, c.challan_id DESC`,
        [search, like, like, like, like]
    );
    res.json(rows);
}));

router.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

module.exports = router;
