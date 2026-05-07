<!DOCTYPE html>
<html>
<body>
    <h2>Halo {{ $user->name }},</h2>
    <p>Terima kasih telah mendaftar di Routex.</p>
    <p>Silakan klik tombol di bawah ini untuk memverifikasi alamat email kamu:</p>
    <p>
        <a href="{{ url('/portal/verify-email/' . $token) }}" 
           style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Verifikasi Email
        </a>
    </p>
    <p>Link ini berlaku selama 24 jam.</p>
    <p>Jika kamu tidak merasa melakukan pendaftaran ini, silakan abaikan email ini.</p>
    <br>
    <p>Salam,<br>Tim Routex</p>
</body>
</html>
