const express = require('express');
const db = require('../config/db');
const router = express.Router();

// **1. Tampilkan Semua Pelanggan**
router.get('/', (req, res) => {
    db.query('SELECT * FROM pelanggan', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
});

router.get('/datatable', (req, res) => {
    let offset = parseInt(req.query.offset) || 0;  
    let limit = parseInt(req.query.limit) || 20;   
    let search = req.query.search || '';        

    // Query Count Total Data
    let countQuery = "SELECT COUNT(*) AS total FROM pelanggan";
    db.query(countQuery, (err, totalResult) => {
        if (err) throw err;
        let totalRecords = totalResult[0].total;

        // Query Data dengan LIMIT dan pencarian
        let query = `
            SELECT *
            FROM pelanggan 
            WHERE kode LIKE ? OR nama LIKE ? OR telepon LIKE ? OR email LIKE ? OR alamat LIKE ? OR nik LIKE ?
            ORDER BY kode
            LIMIT ?, ?`;

        db.query(query, [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, offset, limit], (err, results) => {
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

// **2. Tampilkan Pelanggan Berdasarkan Noindex**
router.get('/id/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('SELECT * FROM pelanggan WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) return res.status(404).json({ message: 'Pelanggan tidak ditemukan' });
        res.json(result[0]);
    });
});

// **3. Tambah Data Pelanggan**
router.post('/', (req, res) => {
    const { kode, nama, telepon, email, alamat, nik } = req.body;
    const sql = 'INSERT INTO pelanggan (kode, nama, telepon, email, alamat, nik) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [kode, nama, telepon, email, alamat, nik], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Pelanggan berhasil ditambahkan', id: result.insertId });
    });
});

// **4. Update Data Pelanggan**
router.put('/:noindex', (req, res) => {
    const { noindex } = req.params;
    const { kode, nama, telepon, email, alamat, nik } = req.body;
    const sql = 'UPDATE pelanggan SET kode=?, nama=?, telepon=?, email=?, alamat=?, nik=? WHERE noindex=?';
    db.query(sql, [kode, nama, telepon, email, alamat, nik, noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Pelanggan tidak ditemukan' });
        res.json({ message: 'Pelanggan berhasil diperbarui' });
    });
});

// **5. Hapus Data Pelanggan**
router.delete('/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('DELETE FROM pelanggan WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Pelanggan tidak ditemukan' });
        res.json({ message: 'Pelanggan berhasil dihapus' });
    });
});

module.exports = router;
