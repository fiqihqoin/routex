<!DOCTYPE html>
<html>
<body>
    <h2>Selamat {{ $user->name }}!</h2>
    <p>Akun Routex kamu sudah aktif dan siap digunakan.</p>
    <p>Berikut adalah Live API Key kamu:</p>
    <pre style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; font-weight: bold;"><code>{{ $apiKey }}</code></pre>
    
    <h3>Cara Memulai:</h3>
    <ol>
        <li>Login ke <a href="{{ url('/portal/login') }}">Portal Routex</a></li>
        <li>Buka menu <strong>Vendors</strong> untuk konfigurasi provider (Midtrans/Xendit/Qoinhub)</li>
        <li>Salin API Key di atas ke dalam aplikasi kamu</li>
        <li>Baca <a href="https://docs.routex.id">Dokumentasi API</a> untuk integrasi teknis</li>
    </ol>
    
    <p>Jika ada kendala, jangan ragu untuk membalas email ini.</p>
    <br>
    <p>Selamat bertransaksi!<br>Tim Routex</p>
</body>
</html>
