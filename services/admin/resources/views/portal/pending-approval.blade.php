<x-portal-layout>
    <x-slot name="title">Pending Approval</x-slot>
    <div class="bg-white shadow rounded-lg p-8 text-center">
        <div class="inline-flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <svg class="h-10 w-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-12 0 9 9 0 0112 0z"></path>
            </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Email Berhasil Diverifikasi!</h2>
        <p class="text-gray-600">Akun kamu saat ini sedang dalam proses peninjauan oleh admin. Kami akan mengirimkan email notifikasi segera setelah akun kamu diaktifkan.</p>
        <div class="mt-6">
            <a href="/portal/login" class="text-indigo-600 hover:text-indigo-900 font-medium">Kembali ke Login</a>
        </div>
    </div>
</x-portal-layout>
