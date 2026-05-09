<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>API Keys - Routex Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <x-portal-layout>
        <div class="max-w-6xl mx-auto py-8 px-4">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">API Keys</h1>
                <p class="mt-2 text-gray-600">Kelola API keys untuk mengakses Routex API</p>
            </div>

            <!-- Sandbox API Key Card -->
            <div class="bg-white rounded-lg shadow-md border-l-4 border-amber-500 mb-6">
                <div class="p-6">
                    <!-- Header with Badge -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <span class="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full uppercase">
                                Sandbox
                            </span>
                            <h2 class="text-xl font-semibold text-gray-900">Sandbox API Key</h2>
                        </div>
                        <i class="fas fa-flask text-amber-500 text-2xl"></i>
                    </div>

                    <!-- Hint -->
                    <p class="text-sm text-gray-600 mb-4">
                        Gunakan untuk testing.<br>
                        <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">Endpoint: sandbox.routex.id</span>
                    </p>

                    <!-- Key Display -->
                    <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                        <div class="flex items-center justify-between">
                            <div class="flex-1">
                                <label class="text-xs text-gray-600 uppercase font-semibold mb-1 block">API Key</label>
                                <div class="font-mono text-sm text-gray-900" id="sandbox-key-display">
                                    Loading...
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-2">
                        <button
                            onclick="toggleReveal('sandbox')"
                            id="sandbox-reveal-btn"
                            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
                            <i class="fas fa-eye" id="sandbox-icon"></i>
                            <span id="sandbox-btn-text">Reveal</span>
                        </button>
                        <button
                            onclick="copyKey('sandbox')"
                            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition flex items-center gap-2">
                            <i class="fas fa-copy"></i>
                            Copy
                        </button>
                        <button
                            onclick="regenerateKey('sandbox')"
                            class="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition flex items-center gap-2">
                            <i class="fas fa-sync-alt"></i>
                            Regenerate
                        </button>
                    </div>
                </div>
            </div>

            <!-- Production API Key Card -->
            <div class="bg-white rounded-lg shadow-md border-l-4 border-teal-500">
                <div class="p-6">
                    <!-- Header with Badge -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <span class="px-3 py-1 bg-teal-100 text-teal-800 text-xs font-semibold rounded-full uppercase">
                                Production
                            </span>
                            <h2 class="text-xl font-semibold text-gray-900">Production API Key</h2>
                        </div>
                        <i class="fas fa-rocket text-teal-500 text-2xl"></i>
                    </div>

                    <!-- Hint -->
                    <p class="text-sm text-gray-600 mb-4">
                        Gunakan untuk transaksi real.<br>
                        <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">Endpoint: api.routex.id</span>
                    </p>

                    <!-- Key Display -->
                    <div class="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
                        <div class="flex items-center justify-between">
                            <div class="flex-1">
                                <label class="text-xs text-gray-600 uppercase font-semibold mb-1 block">API Key</label>
                                <div class="font-mono text-sm text-gray-900" id="production-key-display">
                                    Loading...
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-2">
                        <button
                            onclick="showProductionWarning()"
                            id="production-reveal-btn"
                            class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
                            <i class="fas fa-eye" id="production-icon"></i>
                            <span id="production-btn-text">Reveal</span>
                        </button>
                        <button
                            onclick="copyKey('production')"
                            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition flex items-center gap-2">
                            <i class="fas fa-copy"></i>
                            Copy
                        </button>
                        <button
                            onclick="regenerateKey('production')"
                            class="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition flex items-center gap-2">
                            <i class="fas fa-sync-alt"></i>
                            Regenerate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </x-portal-layout>

    <!-- Production Warning Modal -->
    <div id="production-modal" class="fixed inset-0 bg-gray-900 bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-900">Peringatan</h3>
            </div>

            <p class="text-gray-600 mb-6">
                Kamu akan melihat production key. <strong>Jangan share key ini dengan siapapun.</strong>
                Transaksi menggunakan key ini akan memproses uang sungguhan.
            </p>

            <div class="flex gap-3 justify-end">
                <button
                    onclick="closeProductionModal()"
                    class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition">
                    Batal
                </button>
                <button
                    onclick="confirmProductionReveal()"
                    class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">
                    Ya, tampilkan
                </button>
            </div>
        </div>
    </div>

    <script>
        let sandboxKey = '';
        let productionKey = '';
        let sandboxRevealed = false;
        let productionRevealed = false;

        // Load API keys on page load
        async function loadKeys() {
            try {
                const response = await fetch('/portal/api/keys', {
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'Accept': 'application/json',
                    }
                });
                const data = await response.json();

                sandboxKey = data.sandbox_api_key;
                productionKey = data.production_api_key;

                document.getElementById('sandbox-key-display').textContent = sandboxKey;
                document.getElementById('production-key-display').textContent = productionKey;
            } catch (error) {
                console.error('Failed to load keys:', error);
                document.getElementById('sandbox-key-display').textContent = 'Error loading key';
                document.getElementById('production-key-display').textContent = 'Error loading key';
            }
        }

        // Toggle reveal for sandbox key
        async function toggleReveal(type) {
            if (type === 'sandbox') {
                if (sandboxRevealed) {
                    // Hide key
                    await loadKeys();
                    sandboxRevealed = false;
                    document.getElementById('sandbox-btn-text').textContent = 'Reveal';
                    document.getElementById('sandbox-icon').className = 'fas fa-eye';
                } else {
                    // Reveal key
                    const response = await fetch('/portal/api/keys', {
                        headers: {
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                            'X-Reveal-Key': 'true',
                            'Accept': 'application/json',
                        }
                    });
                    const data = await response.json();
                    sandboxKey = data.sandbox_api_key;
                    document.getElementById('sandbox-key-display').textContent = sandboxKey;
                    sandboxRevealed = true;
                    document.getElementById('sandbox-btn-text').textContent = 'Hide';
                    document.getElementById('sandbox-icon').className = 'fas fa-eye-slash';
                }
            }
        }

        // Show production warning modal
        function showProductionWarning() {
            if (productionRevealed) {
                // If already revealed, just hide
                loadKeys();
                productionRevealed = false;
                document.getElementById('production-btn-text').textContent = 'Reveal';
                document.getElementById('production-icon').className = 'fas fa-eye';
            } else {
                // Show modal
                document.getElementById('production-modal').classList.remove('hidden');
                document.getElementById('production-modal').classList.add('flex');
            }
        }

        // Close modal
        function closeProductionModal() {
            document.getElementById('production-modal').classList.add('hidden');
            document.getElementById('production-modal').classList.remove('flex');
        }

        // Confirm production reveal
        async function confirmProductionReveal() {
            closeProductionModal();

            const response = await fetch('/portal/api/keys', {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'X-Reveal-Key': 'true',
                    'Accept': 'application/json',
                }
            });
            const data = await response.json();
            productionKey = data.production_api_key;
            document.getElementById('production-key-display').textContent = productionKey;
            productionRevealed = true;
            document.getElementById('production-btn-text').textContent = 'Hide';
            document.getElementById('production-icon').className = 'fas fa-eye-slash';
        }

        // Copy key to clipboard
        async function copyKey(type) {
            const key = type === 'sandbox' ? sandboxKey : productionKey;

            try {
                await navigator.clipboard.writeText(key);
                alert(`${type === 'sandbox' ? 'Sandbox' : 'Production'} API key copied to clipboard!`);
            } catch (error) {
                console.error('Failed to copy:', error);
                alert('Failed to copy key');
            }
        }

        // Regenerate key
        async function regenerateKey(type) {
            const confirmed = confirm(`Yakin ingin regenerate ${type} API key? Key lama akan tidak bisa digunakan lagi.`);
            if (!confirmed) return;

            try {
                const response = await fetch(`/portal/api/keys/regenerate-${type}`, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'Accept': 'application/json',
                    }
                });
                const data = await response.json();

                if (data.success) {
                    alert(data.message);
                    if (type === 'sandbox') {
                        sandboxKey = data.new_key;
                        document.getElementById('sandbox-key-display').textContent = data.new_key;
                        sandboxRevealed = true;
                        document.getElementById('sandbox-btn-text').textContent = 'Hide';
                        document.getElementById('sandbox-icon').className = 'fas fa-eye-slash';
                    } else {
                        productionKey = data.new_key;
                        document.getElementById('production-key-display').textContent = data.new_key;
                        productionRevealed = true;
                        document.getElementById('production-btn-text').textContent = 'Hide';
                        document.getElementById('production-icon').className = 'fas fa-eye-slash';
                    }
                }
            } catch (error) {
                console.error('Failed to regenerate:', error);
                alert('Failed to regenerate key');
            }
        }

        // Load keys when page loads
        loadKeys();
    </script>
</body>
</html>
