const express = require('express');
const db = require('../config/db');
const router = express.Router();

// **1. Tampilkan Semua Reservasi**
router.get('/', (req, res) => {
    db.query('SELECT * FROM reservasi', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
});

router.get('/datatable', (req, res) => {
    let offset = parseInt(req.query.offset) || 0;  
    let limit = parseInt(req.query.limit) || 20;   
    let search = req.query.search || '';        

    // Query Count Total Data
    let countQuery = "SELECT COUNT(*) AS total FROM reservasi where status != 'deleted'";
    db.query(countQuery, (err, totalResult) => {
        if (err) throw err;
        let totalRecords = totalResult[0].total;

        // Query Data dengan LIMIT dan pencarian
        let query = `
            SELECT r.*, p.nama as nama_pelanggan from reservasi r 
            join pelanggan p on p.noindex = r.id_pelanggan 
            WHERE r.status != 'deleted' and 
            (r.nomor LIKE ? OR r.tanggal LIKE ? OR p.nama LIKE ? OR r.tanggal_checkin LIKE ? OR r.tanggal_checkout LIKE ? OR total_harga LIKE ? OR status LIKE ?)
            ORDER BY r.nomor desc
            LIMIT ?, ?`;

        db.query(query, [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, offset, limit], (err, results) => {
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

// **2. Tampilkan Reservasi Berdasarkan Noindex**
router.get('/id/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('SELECT * FROM reservasi WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) return res.status(404).json({ message: 'Reservasi tidak ditemukan' });
        res.json(result[0]);
    });
});

// **3. Tambah Reservasi Baru**
router.post('/', (req, res) => {
    const { nomor, tanggal, id_pelanggan, tanggal_checkin, tanggal_checkout, total_harga, status } = req.body;
    const sql = 'INSERT INTO reservasi (nomor, tanggal, id_pelanggan, tanggal_checkin, tanggal_checkout, total_harga, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [nomor, tanggal, id_pelanggan, tanggal_checkin, tanggal_checkout, total_harga, status], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Reservasi berhasil ditambahkan', id: result.insertId });
    });
});

// **4. Update Reservasi**
router.put('/:noindex', (req, res) => {
    const { noindex } = req.params;
    const { nomor, tanggal, id_pelanggan, tanggal_checkin, tanggal_checkout, total_harga, status } = req.body;
    const sql = 'UPDATE reservasi SET nomor=?, tanggal=?, id_pelanggan=?, tanggal_checkin=?, tanggal_checkout=?, total_harga=?, status=? WHERE noindex=?';
    db.query(sql, [nomor, tanggal, id_pelanggan, tanggal_checkin, tanggal_checkout, total_harga, status, noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Reservasi berhasil diperbarui' });
    });
});

// **5. Hapus Reservasi**
router.delete('/:noindex', (req, res) => {
    const { noindex } = req.params;
    db.query('DELETE FROM reservasi WHERE noindex = ?', [noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Reservasi berhasil dihapus' });
    });
});

module.exports = router;
