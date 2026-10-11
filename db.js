const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'MySQL_password*0810',
    database: 'traffic_db'
});

db.connect(err => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        process.exit(1);
    }
    console.log("MySQL Connected...");
});

module.exports = { db, database: db.promise() };
