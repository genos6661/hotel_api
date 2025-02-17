const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pelangganRoutes = require('./routes/pelanggan');
const kamarRoutes = require('./routes/kamar');
const kelasKamarRoutes = require('./routes/kelas_kamar');
const negaraRoutes = require('./routes/negara');
const produkLayananRoutes = require('./routes/produk_layanan');
const reservasiRoutes = require('./routes/reservasi');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Rute Pelanggan
app.use('/pelanggan', pelangganRoutes);
app.use('/kelas_kamar', kelasKamarRoutes);
app.use('/kamar', kamarRoutes);
app.use('/negara', negaraRoutes);
app.use('/produk_layanan', produkLayananRoutes);
app.use('/reservasi', reservasiRoutes);

// Menjalankan Server
app.listen(port, () => {
    console.log(`Server berjalan pada port : ${port}`);
});
