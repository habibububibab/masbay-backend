var transaksi_controller = require('../controllers/transaksiController');
var topup_controller = require('../controllers/topUpController');
var user_controller = require('../controllers/userController');
var api_crawler = require('../api/crawler');
var api_pulsatop = require('../api/pulsatop');

//timer update pembayaran & crawler
function updatePembayaran(){

    transaksi_controller.cekTransaksi(['Pending'], arrTransaksiPending => {
        topup_controller.cekTopUp(['Pending'], (arrTopUpPending) => {
            api_crawler.crawl(cekmutasi => {
                if (cekmutasi == 'Kesalahan') {
                    console.log('Crawler gagal!');
                } else {
                    console.log('Crawler berhasil!');
                    let i;
                    let trfketemu;
                    let mutasiPulsa = cekmutasi;
                    for (i = 0; i < arrTransaksiPending.length; i++) { 
                        gantiFormat(arrTransaksiPending[i], cekprice => {
                            //cari rupiah yang pending pada array cek mutasi dr crawler
                            trfketemu = mutasiPulsa.search(cekprice);
                            if (trfketemu == -1) { 
                                //console.log('gagal, coba lagi!');
                            } else {
                                //console.log('ketemu!');
                                //ambil seluruh data dr price tsb
                                transaksi_controller.ambilTransaksiTerbayar(arrTransaksiPending[i], paidTransaction => {
                                    api_pulsatop.isiTransfer(paidTransaction, status => {
                                        if (status == 'error') {
                                            console.log("Akses ke API pulsatop gagal");
                                        } else {
                                            //update status pembelian ke sukses
                                            transaksi_controller.suksesIsiPulsa(paidTransaction, (pesan) => {
                                                console.log(pesan);
                                            })
                                        }
                                    })
                                })
                            }
                        })
                    }
                    let j;
                    let sldketemu;
                    let mutasiSaldo = cekmutasi;
                    for (j = 0; j < arrTopUpPending.length; j++) { 
                        console.log(arrTopUpPending);
                        gantiFormat(arrTopUpPending[j], ceksaldo => {
                            //cari rupiah yang pending pada array cek mutasi dr crawler
                            console.log(ceksaldo);
                            console.log(mutasiSaldo);
                            sldketemu = mutasiSaldo.search(ceksaldo);
                            if (sldketemu == -1) {
                                console.log('gagal, coba lagi!');
                            } else {
                                console.log('ketemu!');
                                //ambil seluruh data dr price tsb
                                topup_controller.ambilTopUpSaldo(arrTopUpPending[j], paidTopUp => {
                                    console.log(paidTopUp);
                                    user_controller.isiSaldo(paidTopUp, (isiSaldo) => {
                                        //console.log(pesan);
                                        if (isiSaldo == 'Error') {
                                            console.log('Isi saldo gagal! Kemungkinan data user tidak sinkron dengan database');
                                        } else {
                                            topup_controller.suksesIsiSaldo(paidTopUp, (pesan) => {
                                                console.log(pesan);
                                            })
                                        }
                                    })
                                })
                            }
                        })
                    }
                }
            })
        })
    })
}

setInterval(transaksi_controller.updateStatusTransaksi, 30000); //req setiap x/1000 detik
setInterval(topup_controller.updateStatusTopUp, 30000); //req setiap x/1000 detik

//updatePembayaran();
setInterval(updatePembayaran, 300000); //req setiap x / 1000 detik


////------------------------------------------------////
///////////////////////Editor Rupiah////////////////////
////------------------------------------------------////
Number.prototype.formatRupiah = function(c, d, t){
    var n = this, 
    c = isNaN(c = Math.abs(c)) ? 2 : c, 
    d = d == undefined ? "." : d, 
    t = t == undefined ? "," : t, 
    s = n < 0 ? "-" : "", 
    i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))), 
    j = (j = i.length) > 3 ? j % 3 : 0;
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};
////------------------------------------------------////
////////////////////////////////////////////////////////
////------------------------------------------------////

function gantiFormat(price, callback) {
    var cekprice = price.formatRupiah(0, ',', '.'); //edit 5850 -> 5.850 
    cekprice = '\\"' + cekprice + ',00';
    return callback(cekprice); //cek array, ada yang sama dengan price / tidak
}