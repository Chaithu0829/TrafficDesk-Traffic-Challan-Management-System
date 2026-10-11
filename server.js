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

initializeDatabase()
    .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
    .catch((error) => {
        console.error('Database setup failed:', error);
        process.exit(1);
    });
