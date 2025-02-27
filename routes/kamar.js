const express = require('express');
const db = require('../config/db');
const router = express.Router();

// **1. Tampilkan Semua Kamar**
router.get('/', (req, res) => {
    db.query('SELECT k.*, kk.nama_kelas FROM kamar k join kelas_kamar kk on k.id_kelas = kk.noindex where k.deleted = 0 order by kode_kamar', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
});

router.get('/datatable', (req, res) => {
    let offset = parseInt(req.query.offset) || 0;  // start (offset)
    let limit = parseInt(req.query.limit) || 20;   // length (limit)
    let search = req.query.search || '';           // search term

    // Query Count Total Data
    let countQuery = "SELECT COUNT(*) AS total FROM kamar where deleted = 0";
    db.query(countQuery, (err, totalResult) => {
        if (err) throw err;
        let totalRecords = totalResult[0].total;

        // Query Data dengan LIMIT dan pencarian
        let query = `
            SELECT k.*, kk.nama_kelas 
            FROM kamar k 
            JOIN kelas_kamar kk ON k.id_kelas = kk.noindex 
            WHERE k.deleted = 0 AND (k.nama_kamar LIKE ? OR k.kode_kamar LIKE ? OR kk.nama_kelas LIKE ?)
            ORDER BY k.kode_kamar
            LIMIT ?, ?`;

        db.query(query, [`%${search}%`, `%${search}%`, `%${search}%`, offset, limit], (err, results) => {
            if (err) throw err;

            // Kirim data ke DataTables
            res.json({
                draw: req.query.draw || 1,
                recordsTotal: totalRecords,
                recordsFiltered: results.length,
                data: results
            });
        });
    });
});

router.get("/alnod-select", (req, res) => {
    let offset = parseInt(req.query.offset) || 0;
    let limit = parseInt(req.query.limit) || 20;
    let search = req.query.search ? `%${req.query.search}%` : "%";

    const query = `
        SELECT *
        FROM kamar 
        WHERE nama_kamar LIKE ? OR kode_kamar LIKE ?
        ORDER BY kode_kamar ASC 
        LIMIT ?, ?`;

    db.query(query, [search, search, offset, limit], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// **2. Tampilkan Kamar Berdasarkan Noindex**
router.get('/id/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('SELECT k.*, kk.nama_kelas, kk.kode_kelas FROM kamar k join kelas_kamar kk on k.id_kelas =  kk.noindex WHERE k.noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
        res.json(result[0]);
    });
});

router.post('/', (req, res) => {
    const { kode, nama, kelas, harga, fasilitas } = req.body;

    // Cek apakah id_kelas ada di tabel kelas_kamar
    const sqlCheck = 'SELECT * FROM kelas_kamar WHERE noindex = ?';
    db.query(sqlCheck, [kelas], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows.length === 0) {
            return res.status(400).json({ error: 'ID Kelas tidak ditemukan' });
        }

        // Ambil harga & fasilitas jika tidak dikirim oleh klien
        const hargaFinal = (harga === "" || harga === undefined) ? rows[0].harga : harga;
        const fasilitasFinal = (fasilitas === "" || fasilitas === undefined) ? rows[0].fasilitas : fasilitas;

        // Lanjutkan proses insert ke tabel kamar
        const sqlInsert = 'INSERT INTO kamar (kode_kamar, nama_kamar, id_kelas, harga, fasilitas, nonaktif, deleted) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.query(sqlInsert, [kode, nama, kelas, hargaFinal, fasilitasFinal, 0, 0], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Kamar berhasil ditambahkan', id: result.insertId });
        });
    });
});


// **4. Update Data Kamar**
router.put('/:noindex', (req, res) => {
    const { noindex } = req.params;
    const { kode_kamar, nama_kamar, id_kelas, harga, fasilitas, nonaktif, deleted } = req.body;
    const sql = 'UPDATE kamar SET kode_kamar=?, nama_kamar=?, id_kelas=?, harga=?, fasilitas=?, nonaktif=?, deleted=? WHERE noindex=?';
    db.query(sql, [kode_kamar, nama_kamar, id_kelas, harga, fasilitas, nonaktif, deleted, noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
        res.json({ message: 'Kamar berhasil diperbarui' });
    });
});

// **5. Hapus Data Kamar**
router.delete('/:noindex', (req, res) => {
    const { noindex } = req.params;

    // Cek apakah kamar sudah digunakan dalam tabel detail_reservasi
    const sqlCheck = 'SELECT COUNT(*) AS count FROM detail_reservasi WHERE id_kamar = ?';
    db.query(sqlCheck, [noindex], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows[0].count > 0) {
            return res.status(404).json({ message: 'Kamar sudah pernah digunakan dalam reservasi' });
        }

        // Jika tidak digunakan, ubah kolom deleted menjadi 1
        const sqlUpdate = 'UPDATE kamar SET deleted = 1 WHERE noindex = ?';
        db.query(sqlUpdate, [noindex], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
            res.json({ message: 'Kamar berhasil dihapus' });
        });
    });
});

module.exports = router;
