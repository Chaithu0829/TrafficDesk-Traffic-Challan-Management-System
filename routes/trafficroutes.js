const express = require('express');
const router = express.Router();
const db = require('../db');

// TEST
router.get('/test', (req, res) => {
    res.send("API working");
});

// GET VIOLATIONS
router.get('/violations', (req, res) => {
    db.query("SELECT * FROM violations", (err, result) => {
        if (err) {
            console.log("Violation Error:", err);
            return res.send(err);
        }
        res.json(result);
    });
});

// CREATE CHALLAN
router.post('/createChallan', (req, res) => {
    const { vehicle_number, violation_id } = req.body;

    console.log("Incoming:", vehicle_number, violation_id);

    if (!vehicle_number || !violation_id) {
        return res.send("Missing data");
    }

    db.query(
        "SELECT * FROM vehicles WHERE vehicle_number=?",
        [vehicle_number],
        (err, result) => {

            if (err) {
                console.log("SELECT ERROR:", err);
                return res.send(err);
            }

            if (result.length === 0) {

                console.log("Creating new vehicle...");

                db.query(
                    "INSERT INTO vehicles (vehicle_number, owner_name) VALUES (?, ?)",
                    [vehicle_number, "Unknown"],
                    (err2, result2) => {

                        if (err2) {
                            console.log("INSERT VEHICLE ERROR:", err2);
                            return res.send(err2);
                        }

                        const vehicle_id = result2.insertId;

                        db.query(
                            "INSERT INTO challans (vehicle_id, violation_id) VALUES (?, ?)",
                            [vehicle_id, violation_id],
                            (err3) => {

                                if (err3) {
                                    console.log("INSERT CHALLAN ERROR:", err3);
                                    return res.send(err3);
                                }

                                res.send("Vehicle created & Challan Generated");
                            }
                        );
                    }
                );

            } else {

                const vehicle_id = result[0].vehicle_id;

                db.query(
                    "INSERT INTO challans (vehicle_id, violation_id) VALUES (?, ?)",
                    [vehicle_id, violation_id],
                    (err4) => {

                        if (err4) {
                            console.log("CHALLAN ERROR:", err4);
                            return res.send(err4);
                        }

                        res.send("Challan Generated");
                    }
                );
            }
        }
    );
});

// GET CHALLAN
router.get('/challan/:vehicle_number', (req, res) => {
    const vehicle_number = req.params.vehicle_number;

    db.query(
        "SELECT * FROM vehicles WHERE vehicle_number=?",
        [vehicle_number],
        (err, vehicleResult) => {

            if (vehicleResult.length === 0) {
                return res.json({ message: "Vehicle not found" });
            }

            const vehicle_id = vehicleResult[0].vehicle_id;

            const sql = `
            SELECT 
                c.challan_id,
                vl.violation_type,
                vl.fine,
                c.payment_status
            FROM challans c
            JOIN violations vl ON c.violation_id = vl.violation_id
            WHERE c.vehicle_id = ?
            `;

            db.query(sql, [vehicle_id], (err2, result) => {

                if (result.length === 0) {
                    return res.json({ message: "No challans found" });
                }

                res.json(result);
            });
        }
    );
});

// PAY
router.put('/pay/:id', (req, res) => {
    db.query(
        "UPDATE challans SET payment_status='Paid' WHERE challan_id=?",
        [req.params.id],
        (err) => {
            if (err) return res.send(err);
            res.send("Payment Successful");
        }
    );
});

module.exports = router;