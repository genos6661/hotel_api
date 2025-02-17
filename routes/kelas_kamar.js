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

// **2. Tampilkan Kelas Kamar Berdasarkan Noindex**
router.get('/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('SELECT * FROM kelas_kamar WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) return res.status(404).json({ message: 'Kelas Kamar tidak ditemukan' });
        res.json(result[0]);
    });
});

// **3. Tambah Kelas Kamar Baru**
router.post('/', (req, res) => {
    const { kode_kelas, nama_kelas, harga, fasilitas } = req.body;
    const sql = 'INSERT INTO kelas_kamar (kode_kelas, nama_kelas, harga, fasilitas) VALUES (?, ?, ?, ?)';
    db.query(sql, [kode_kelas, nama_kelas, harga, fasilitas], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Kelas Kamar berhasil ditambahkan', id: result.insertId });
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
    db.query('DELETE FROM kelas_kamar WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Kelas Kamar tidak ditemukan' });
        res.json({ message: 'Kelas Kamar berhasil dihapus' });
    });
});

module.exports = router;
