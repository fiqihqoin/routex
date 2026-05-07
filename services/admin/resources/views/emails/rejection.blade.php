<!DOCTYPE html>
<html>
<body>
    <h2>Halo {{ $user->name }},</h2>
    <p>Kami telah meninjau pendaftaran akun Routex kamu.</p>
    <p>Mohon maaf, saat ini pendaftaran kamu belum dapat kami setujui dengan alasan berikut:</p>
    <blockquote style="border-left: 4px solid #EF4444; padding-left: 15px; font-style: italic; color: #4B5563;">
        {{ $reason }}
    </blockquote>
    <p>Jika kamu memiliki pertanyaan atau ingin melakukan pengajuan ulang, silakan hubungi tim support kami di <a href="mailto:support@routex.id">support@routex.id</a>.</p>
    <br>
    <p>Salam,<br>Tim Routex</p>
</body>
</html>
