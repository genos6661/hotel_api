const express = require('express');
const db = require('../config/db');
const router = express.Router();

// **1. Tampilkan Semua Kamar**
router.get('/', (req, res) => {
    db.query('SELECT hk.*, k.nama_kamar, kk.nama_kelas from harga_kamar hk left join kamar k on k.noindex = hk.kamar left join kelas_kamar kk on kk.noindex = hk.kelas_kamar', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
});

router.get('/datatable', (req, res) => {
    let offset = parseInt(req.query.offset) || 0;  // start (offset)
    let limit = parseInt(req.query.limit) || 20;   // length (limit)
    let search = req.query.search || '';           // search term

    // Query Count Total Data
    let countQuery = "SELECT COUNT(*) AS total FROM harga_kamar";
    db.query(countQuery, (err, totalResult) => {
        if (err) throw err;
        let totalRecords = totalResult[0].total;
        const today = new Date().toISOString().split('T')[0];

        // Query Data dengan LIMIT dan pencarian
        let query = `
            SELECT hk.*, kk.nama_kelas, k.nama_kamar, k.kode_kamar
            FROM harga_kamar hk
            LEFT JOIN kelas_kamar kk ON hk.kelas_kamar = kk.noindex 
            LEFT JOIN kamar k on hk.kamar = k.noindex
            WHERE hk.tanggal_akhir >= ? AND (kk.nama_kelas like ? OR k.nama_kamar like ? or hk.harga like ? or hk.tanggal_awal like ? or hk.tanggal_akhir like ?)
            ORDER BY hk.tanggal_awal 
            LIMIT ?, ?`;

        db.query(query, [today, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, offset, limit], (err, results) => {
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

router.get("/select2", (req, res) => {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Query utama untuk mengambil data
    const queryData = "SELECT noindex as id, nama_kamar AS text FROM kamar WHERE nama_kamar LIKE ? ORDER BY nama_kamar ASC LIMIT ? OFFSET ?";
    const queryCount = "SELECT COUNT(*) as total FROM kamar WHERE nama_kamar LIKE ?";

    db.query(queryData, [`%${search}%`, limit, offset], (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Terjadi kesalahan server" });
        }

        // Hitung jumlah total data untuk pagination
        db.query(queryCount, [`%${search}%`], (err, countResult) => {
            if (err) {
                return res.status(500).json({ error: "Terjadi kesalahan server" });
            }

            const total = countResult[0].total;
            const more = offset + limit < total;

            res.json({ results, more });
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
