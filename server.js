require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./lib/database-init');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// IMPORTANT (case sensitive)
const trafficRoutes = require('./routes/trafficroutes');
app.use('/api', trafficRoutes);

console.log("DB CONFIG CHECK:", {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    passwordSet: !!process.env.DB_PASSWORD,
    adminEmailSet: !!process.env.ADMIN_EMAIL,
    adminPasswordSet: !!process.env.ADMIN_PASSWORD
});

initializeDatabase()
    .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
    .catch((error) => {
        console.error('Database setup failed:', error.message);
        console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        process.exit(1);
    });
