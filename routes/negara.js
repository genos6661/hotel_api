const express = require('express');
const db = require('../config/db');
const router = express.Router();

// **1. Tampilkan Semua Negara**
router.get('/', (req, res) => {
    db.query('SELECT * FROM negara', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
});

// **2. Tampilkan Negara Berdasarkan Noindex**
router.get('/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('SELECT * FROM negara WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) return res.status(404).json({ message: 'Negara tidak ditemukan' });
        res.json(result[0]);
    });
});

// **3. Tambah Negara Baru**
router.post('/', (req, res) => {
    const { negara } = req.body;
    const sql = 'INSERT INTO negara (negara) VALUES (?)';
    db.query(sql, [negara], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Negara berhasil ditambahkan', id: result.insertId });
    });
});

// **4. Update Data Negara**
router.put('/:noindex', (req, res) => {
    const { noindex } = req.params;
    const { negara } = req.body;
    db.query('UPDATE negara SET negara=? WHERE noindex=?', [negara, noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Negara berhasil diperbarui' });
    });
});

// **5. Hapus Negara**
router.delete('/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('DELETE FROM negara WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Negara berhasil dihapus' });
    });
});

module.exports = router;
