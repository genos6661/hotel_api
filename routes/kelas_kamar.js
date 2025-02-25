const express = require('express');
const db = require('../config/db');
const router = express.Router();

// **1. Tampilkan Semua Kelas Kamar**
router.get('/', (req, res) => {
    console.log("GET /kelas_kamar dipanggil");
    db.query('SELECT * FROM kelas_kamar', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
});

router.get("/alnod-select", (req, res) => {
    let offset = parseInt(req.query.offset) || 0;
    let limit = parseInt(req.query.limit) || 20;
    let search = req.query.search ? `%${req.query.search}%` : "%";

    const query = `
        SELECT *
        FROM kelas_kamar 
        WHERE nama_kelas LIKE ? OR kode_kelas LIKE ? OR harga LIKE ?
        ORDER BY harga ASC 
        LIMIT ?, ?`;

    db.query(query, [search, search, search, offset, limit], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

router.get('/datatable', (req, res) => {
    let offset = parseInt(req.query.offset) || 0;  // start (offset)
    let limit = parseInt(req.query.limit) || 20;   // length (limit)
    let search = req.query.search || '';           // search term

    // Query Count Total Data
    let countQuery = "SELECT COUNT(*) AS total FROM kelas_kamar";
    db.query(countQuery, (err, totalResult) => {
        if (err) throw err;
        let totalRecords = totalResult[0].total;

        // Query Data dengan LIMIT dan pencarian
        let query = `
            SELECT *
            FROM kelas_kamar 
            WHERE nama_kelas LIKE ? OR kode_kelas LIKE ? OR harga LIKE ? OR fasilitas LIKE ?
            ORDER BY harga
            LIMIT ?, ?`;

        db.query(query, [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, offset, limit], (err, results) => {
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

// **2. Tampilkan Kelas Kamar Berdasarkan Noindex**
router.get('/id/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('SELECT * FROM kelas_kamar WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) return res.status(404).json({ message: 'Kelas Kamar tidak ditemukan' });
        res.json(result[0]);
    });
});

// **3. Tambah Kelas Kamar Baru**
router.post('/', (req, res) => {
    const { kode, nama, harga, fasilitas } = req.body;
    const sql = 'INSERT INTO kelas_kamar (kode_kelas, nama_kelas, harga, fasilitas) VALUES (?, ?, ?, ?)';
    db.query(sql, [kode, nama, harga, fasilitas], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Kelas Kamar berhasil ditambahkan', id: result.insertId });
    });
});

router.post('/adjust', (req, res) => {
    const { id, harga, fasilitas } = req.body;

    const sqlCheck = 'SELECT harga, fasilitas FROM kelas_kamar WHERE noindex = ?';
    db.query(sqlCheck, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows.length === 0) {
            return res.status(400).json({ error: 'ID Kelas tidak ditemukan' });
        }

        const { harga: hargaKelas, fasilitas: fasilitasKelas } = rows[0];

        // Array untuk menyimpan query update yang akan dijalankan
        let updates = [];
        let values = [];

        // Jika harga = 1, update harga dengan harga dari kelas_kamar
        if (harga === 1) {
            updates.push('harga = ?');
            values.push(hargaKelas);
        }

        // Jika fasilitas = 1, update fasilitas dengan fasilitas dari kelas_kamar
        if (fasilitas === 1) {
            updates.push('fasilitas = ?');
            values.push(fasilitasKelas);
        }

        // Jika tidak ada yang diupdate, langsung kirim respon tanpa query update
        if (updates.length === 0) {
            return res.json({ message: 'Tidak ada perubahan yang dilakukan' });
        }

        // Menyusun query update hanya dengan field yang perlu diperbarui
        const sqlUpdate = `UPDATE kamar SET ${updates.join(', ')} WHERE id_kelas = ?`;
        values.push(id);

        db.query(sqlUpdate, values, (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Kamar berhasil disesuaikan' });
        });
    });
});

// **4. Update Data Kelas Kamar**
router.put('/:noindex', (req, res) => {
    const { noindex } = req.params;
    const { kode_kelas, nama_kelas, harga, fasilitas } = req.body;
    const sql = 'UPDATE kelas_kamar SET kode_kelas=?, nama_kelas=?, harga=?, fasilitas=? WHERE noindex=?';
    db.query(sql, [kode_kelas, nama_kelas, harga, fasilitas, noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Kelas Kamar tidak ditemukan' });
        res.json({ message: 'Kelas Kamar berhasil diperbarui' });
    });
});

// **5. Hapus Data Kelas Kamar**
router.delete('/:noindex', (req, res) => {
    const { noindex } = req.params;
    const sqlCheck = 'SELECT COUNT(*) AS count FROM kamar WHERE id_kelas = ?';
    db.query(sqlCheck, [noindex], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows[0].count > 0) {
            return res.status(404).json({ message: 'Kelas Kamar sudah digunakan' });
        }
        db.query('DELETE FROM kelas_kamar WHERE noindex = ?', [noindex], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Kelas Kamar tidak ditemukan' });
            res.json({ message: 'Kelas Kamar berhasil dihapus' });
        });
    });
});

module.exports = router;
