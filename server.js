const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// IMPORTANT (case sensitive)
const trafficRoutes = require('./routes/trafficroutes');
app.use('/api', trafficRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});