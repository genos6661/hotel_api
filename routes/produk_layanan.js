const express = require('express');
const db = require('../config/db');
const router = express.Router();

// **1. Tampilkan Semua Produk Layanan**
router.get('/', (req, res) => {
    db.query('SELECT * FROM produk_layanan', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
});

router.get('/datatable', (req, res) => {
    let offset = parseInt(req.query.offset) || 0;  
    let limit = parseInt(req.query.limit) || 20;   
    let search = req.query.search || '';        

    // Query Count Total Data
    let countQuery = "SELECT COUNT(*) AS total FROM produk_layanan";
    db.query(countQuery, (err, totalResult) => {
        if (err) throw err;
        let totalRecords = totalResult[0].total;

        // Query Data dengan LIMIT dan pencarian
        let query = `
            SELECT *
            FROM produk_layanan 
            WHERE kode LIKE ? OR nama LIKE ? OR harga LIKE ? OR keterangan LIKE ?
            ORDER BY nama
            LIMIT ?, ?`;

        db.query(query, [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, offset, limit], (err, results) => {
            if (err) throw err;

            const modifiedResults = results.map(item => ({
                ...item,
                jenis: item.is_jasa === 1 ? 'Layanan' : 'Produk'
            }));
            // Kirim data ke DataTables
            res.json({
                draw: req.query.draw || 1,
                recordsTotal: totalRecords,
                recordsFiltered: results.length,
                data: modifiedResults
            });
        });
    });
});

// **2. Tampilkan Produk Layanan Berdasarkan Noindex**
router.get('/id/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('SELECT * FROM produk_layanan WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) return res.status(404).json({ message: 'Produk Layanan tidak ditemukan' });
        res.json(result[0]);
    });
});

// **3. Tambah Produk Layanan Baru**
router.post('/', (req, res) => {
    const { kode, nama, harga, keterangan, is_jasa } = req.body;
    const sql = 'INSERT INTO produk_layanan (kode, nama, harga, keterangan, is_jasa) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [kode, nama, harga, keterangan, is_jasa], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produk/Layanan berhasil ditambahkan', id: result.insertId });
    });
});

// **4. Update Produk Layanan**
router.put('/:noindex', (req, res) => {
    const { noindex } = req.params;
    const { kode, nama, harga, keterangan } = req.body;
    const sql = 'UPDATE produk_layanan SET kode=?, nama=?, harga=?, keterangan=? WHERE noindex=?';
    db.query(sql, [kode, nama, harga, keterangan, noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produk Layanan berhasil diperbarui' });
    });
});

// **5. Hapus Produk Layanan**
router.delete('/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('DELETE FROM produk_layanan WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produk Layanan berhasil dihapus' });
    });
});

module.exports = router;
