<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - Routex Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Daftar Akun Routex</h2>
            <p class="mt-2 text-center text-sm text-gray-600">Mulai integrasi pembayaran kamu sekarang</p>
        </div>
        <form class="mt-8 space-y-6" action="{{ route('portal.register') }}" method="POST">
            @csrf
            <div class="rounded-md shadow-sm space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                    <input name="name" type="text" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Email Business</label>
                    <input name="email" type="email" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Password</label>
                    <input name="password" type="password" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Konfirmasi Password</label>
                    <input name="password_confirmation" type="password" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nama Perusahaan</label>
                    <input name="company_name" type="text" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Use Case</label>
                    <textarea name="use_case" required rows="3" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Contoh: Ecommerce fashion, Jual pulsa, dll"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Estimasi Volume Bulanan (IDR)</label>
                    <input name="expected_monthly_volume" type="number" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
            </div>

            @if($errors->any())
                <div class="text-red-500 text-sm italic">
                    {{ $errors->first() }}
                </div>
            @endif

            <div>
                <button type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Daftar Sekarang
                </button>
            </div>
            
            <div class="text-center">
                <a href="{{ route('portal.login') }}" class="text-sm text-indigo-600 hover:text-indigo-500">Sudah punya akun? Login</a>
            </div>
        </form>
    </div>
</body>
</html>
