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

// **2. Tampilkan Produk Layanan Berdasarkan Noindex**
router.get('/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('SELECT * FROM produk_layanan WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) return res.status(404).json({ message: 'Produk Layanan tidak ditemukan' });
        res.json(result[0]);
    });
});

// **3. Tambah Produk Layanan Baru**
router.post('/', (req, res) => {
    const { kode, nama, harga, keterangan } = req.body;
    const sql = 'INSERT INTO produk_layanan (kode, nama, harga, keterangan) VALUES (?, ?, ?, ?)';
    db.query(sql, [kode, nama, harga, keterangan], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produk Layanan berhasil ditambahkan', id: result.insertId });
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
