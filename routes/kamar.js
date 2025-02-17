const express = require('express');
const db = require('../config/db');
const router = express.Router();

// **1. Tampilkan Semua Kamar**
router.get('/', (req, res) => {
    db.query('SELECT k.*, kk.nama_kelas FROM kamar k join kelas_kamar kk on k.id_kelas = kk.noindex order by kode_kamar', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
});

router.get('/datatable', (req, res) => {
    let offset = parseInt(req.query.offset) || 0;  // start (offset)
    let limit = parseInt(req.query.limit) || 20;   // length (limit)
    let search = req.query.search || '';           // search term

    // Query Count Total Data
    let countQuery = "SELECT COUNT(*) AS total FROM kamar";
    db.query(countQuery, (err, totalResult) => {
        if (err) throw err;
        let totalRecords = totalResult[0].total;

        // Query Data dengan LIMIT dan pencarian
        let query = `
            SELECT k.*, kk.nama_kelas 
            FROM kamar k 
            JOIN kelas_kamar kk ON k.id_kelas = kk.noindex 
            WHERE k.nama_kamar LIKE ? OR k.kode_kamar LIKE ? OR kk.nama_kelas LIKE ?
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

// **2. Tampilkan Kamar Berdasarkan Noindex**
router.get('/id/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('SELECT k.*, kk.nama_kelas FROM kamar k join kelas_kamar kk on k.id_kelas =  kk.noindex WHERE k.noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
        res.json(result[0]);
    });
});

// **3. Tambah Kamar Baru**
router.post('/', (req, res) => {
    const { kode_kamar, nama_kamar, id_kelas, harga, fasilitas, nonaktif, deleted } = req.body;
    const sql = 'INSERT INTO kamar (kode_kamar, nama_kamar, id_kelas, harga, fasilitas, nonaktif, deleted) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [kode_kamar, nama_kamar, id_kelas, harga, fasilitas, nonaktif, deleted], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Kamar berhasil ditambahkan', id: result.insertId });
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
    db.query('DELETE FROM kamar WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
        res.json({ message: 'Kamar berhasil dihapus' });
    });
});

module.exports = router;
