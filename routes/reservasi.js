const express = require('express');
const db = require('../config/db');
const router = express.Router();

function getUniqueNomorReservasi(nomor, callback) {
    let prefix = nomor.slice(0, -3); // Ambil bagian depan nomor (tanpa 3 digit terakhir)
    let lastDigits = parseInt(nomor.slice(-3)); // Ambil 3 digit terakhir dan ubah ke integer

    function cekNomor() {
        let newNomor = `${prefix}${String(lastDigits).padStart(3, "0")}`;
        
        db.query("SELECT COUNT(*) AS count FROM reservasi WHERE nomor = ?", [newNomor], (err, result) => {
            if (err) return callback(err, null);

            if (result[0].count > 0) {
                lastDigits++; // Jika nomor sudah ada, tambah 1
                cekNomor();
            } else {
                callback(null, newNomor);
            }
        });
    }

    cekNomor();
}

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
            left join pelanggan p on p.noindex = r.id_pelanggan 
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

router.get('/cekNomorTrans', (req, res) => {
    const tglpendek = new Date().toISOString().slice(2, 10).replace(/-/g, '');

    db.query(
        "SELECT MAX(CAST(SUBSTRING(nomor, 7) AS UNSIGNED)) AS urutan FROM reservasi WHERE nomor LIKE ?",
        [`${tglpendek}%`],
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
            }
            
            let urutan = results[0].urutan ? results[0].urutan + 1 : 1;
            let kode_transaksi = tglpendek + urutan.toString().padStart(3, '0'); 
            
            res.json({ kode_transaksi });
        }
    );
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

router.post("/", (req, res) => {
    const { nomor, pelanggan, status, tanggal, tanggal_checkin, tanggal_checkout, detail } = req.body;

    getUniqueNomorReservasi(nomor, (err, finalNomor) => {
        if (err) return res.status(500).json({ success: false, message: "Error saat mengecek nomor reservasi", error: err.message });

        // Hitung jumlah hari
        const date1 = new Date(tanggal_checkin);
        const date2 = new Date(tanggal_checkout);
        const jumlah_hari = Math.ceil((date2 - date1) / (1000 * 60 * 60 * 24));

        let total_harga = 0;
        detail.forEach((d) => {
            total_harga += d.harga * jumlah_hari;
        });

        // Simpan reservasi ke database
        const sqlReservasi = `INSERT INTO reservasi (nomor, tanggal, id_pelanggan, tanggal_checkin, tanggal_checkout, total_harga, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.query(sqlReservasi, [finalNomor, tanggal, pelanggan, tanggal_checkin, tanggal_checkout, total_harga, status], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: "Gagal menyimpan reservasi", error: err.message });

            const id_reservasi = result.insertId;
            let success = true;

            // Simpan detail reservasi
            detail.forEach((d) => {
                const subtotal = d.harga * jumlah_hari;
                const sqlDetail = `INSERT INTO detail_reservasi (id_reservasi, id_kamar, harga, subtotal) VALUES (?, ?, ?, ?)`;

                db.query(sqlDetail, [id_reservasi, d.kamar, d.harga, subtotal], (err) => {
                    if (err) success = false;
                });
            });

            if (success) {
                res.status(201).json({
                    success: true,
                    message: `Berhasil Membuat Reservasi Baru dengan Nomor Referensi: ${finalNomor}`,
                    id_reservasi: id_reservasi,
                });
            } else {
                res.status(500).json({ success: false, message: "Gagal menyimpan detail reservasi" });
            }
        });
    });
});

router.put('/id/:noindex', (req, res) => {
    const { noindex } = req.params.noindex;
    const { nomor, tanggal, id_pelanggan, tanggal_checkin, tanggal_checkout, total_harga, status } = req.body;
    const sql = 'UPDATE reservasi SET nomor=?, tanggal=?, id_pelanggan=?, tanggal_checkin=?, tanggal_checkout=?, total_harga=?, status=? WHERE noindex=?';
    db.query(sql, [nomor, tanggal, id_pelanggan, tanggal_checkin, tanggal_checkout, total_harga, status, noindex], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Reservasi berhasil diperbarui' });
    });
});

router.put('/cancel/:noindex', (req, res) => {
    const noindex = req.params.noindex;
    const stat = "canceled";

    const sql = 'UPDATE reservasi SET status = ? WHERE noindex=?';
    db.query(sql, [stat, noindex], (err, result) => {
        if (err) return res.status(500).json({ message: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Data reservasi tidak ditemukan' });
        res.json({ message: 'Reservasi Dibatalkan' });
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
