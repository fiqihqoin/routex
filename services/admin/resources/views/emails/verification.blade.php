<!DOCTYPE html>
<html>
<body>
    <h2>Halo {{ $user->name }},</h2>
    <p>Terima kasih telah mendaftar di CaishenEngine.</p>
    <p>Silakan klik tombol di bawah ini untuk memverifikasi alamat email kamu:</p>
    <p>
        <a href="{{ $verificationUrl }}" 
           style="background-color: #00D4AA; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verifikasi Email
        </a>
    </p>
    <p>Link ini berlaku selama 24 jam.</p>
    <p>Jika kamu tidak merasa melakukan pendaftaran ini, silakan abaikan email ini.</p>
    <br>
    <p>Salam,<br>Tim CaishenEngine</p>
</body>
</html>
