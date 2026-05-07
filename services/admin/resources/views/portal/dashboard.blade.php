<x-portal-layout>
    <x-slot name="title">Merchant Dashboard</x-slot>

    <div class="space-y-8">
        <!-- API Key & Account Status Header -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2 bg-white shadow rounded-lg p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">API Credentials</h3>
                <div class="flex items-center space-x-4">
                    <div class="relative flex-grow">
                        <input type="password" id="apiKey" readonly value="{{ $user->api_key }}" 
                            class="block w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-4 text-sm font-mono focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <button type="button" onclick="toggleApiKey()" class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        <span id="toggleText">Show</span>
                    </button>
                    <button type="button" onclick="copyApiKey()" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                        Copy
                    </button>
                </div>
                <p class="mt-2 text-xs text-gray-500 italic">Gunakan key ini untuk otentikasi setiap request ke API RouteX.</p>
            </div>

            <div class="bg-white shadow rounded-lg p-6 flex flex-col justify-between">
                <h3 class="text-lg font-medium text-gray-900 mb-2">Account Status</h3>
                <div>
                    @php
                        $badgeColor = match($user->status) {
                            'active' => 'bg-green-100 text-green-800',
                            'pending_approval' => 'bg-yellow-100 text-yellow-800',
                            'rejected' => 'bg-red-100 text-red-800',
                            default => 'bg-gray-100 text-gray-800',
                        };
                    @endphp
                    <span class="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full {{ $badgeColor }}">
                        {{ strtoupper(str_replace('_', ' ', $user->status)) }}
                    </span>
                </div>
                <p class="mt-4 text-sm text-gray-500">Member since {{ $user->created_at->format('M d, Y') }}</p>
            </div>
        </div>

        <!-- Vendor Integration Cards -->
        <div>
            <h3 class="text-xl font-bold text-gray-900 mb-4">Payment Integrations</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                @foreach($vendorData as $v)
                <div class="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <div class="h-10 w-10 bg-indigo-100 rounded-md flex items-center justify-center">
                                <span class="text-indigo-700 font-bold text-lg">{{ substr($v['code'], 0, 1) }}</span>
                            </div>
                            <span class="text-xs font-bold uppercase tracking-wider text-gray-400">{{ $v['code'] }}</span>
                        </div>
                        <h4 class="text-lg font-bold text-gray-900">{{ $v['name'] }}</h4>
                        
                        <div class="mt-4 flex items-center">
                            @php
                                $statusDot = match($v['status_color']) {
                                    'green' => 'bg-green-400',
                                    'blue' => 'bg-blue-400',
                                    'red' => 'bg-red-400',
                                    default => 'bg-gray-400',
                                };
                            @endphp
                            <span class="h-2 w-2 rounded-full {{ $statusDot }} mr-2"></span>
                            <span class="text-sm text-gray-600">{{ $v['status'] }}</span>
                        </div>
                    </div>
                    <div class="bg-gray-50 px-6 py-4 flex justify-between items-center">
                        <a href="/portal/vendors" class="text-indigo-600 hover:text-indigo-900 text-sm font-bold">
                            {{ $v['has_account'] ? 'Update' : 'Konfigurasi' }} &rarr;
                        </a>
                    </div>
                </div>
                @endforeach
            </div>
        </div>

        <!-- Webhook URLs -->
        <div class="bg-white shadow rounded-lg p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Your Webhook Endpoints</h3>
            <div class="space-y-4">
                @foreach($vendorData as $v)
                <div class="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-200">
                    <div class="mb-2 md:mb-0">
                        <span class="text-sm font-bold text-gray-700">{{ $v['name'] }}</span>
                        <p class="text-xs text-gray-500 font-mono mt-1 break-all">{{ $v['webhook_url'] }}</p>
                    </div>
                    <button type="button" onclick="copyText('{{ $v['webhook_url'] }}')" 
                        class="inline-flex items-center px-3 py-1.5 border border-indigo-300 text-xs font-medium rounded text-indigo-700 bg-white hover:bg-indigo-50">
                        Copy URL
                    </button>
                </div>
                @endforeach
            </div>
        </div>
    </div>

    <script>
        function toggleApiKey() {
            const input = document.getElementById('apiKey');
            const btn = document.getElementById('toggleText');
            if (input.type === 'password') {
                input.type = 'text';
                btn.innerText = 'Hide';
            } else {
                input.type = 'password';
                btn.innerText = 'Show';
            }
        }

        function copyApiKey() {
            const input = document.getElementById('apiKey');
            navigator.clipboard.writeText(input.value).then(() => {
                alert('API Key copied to clipboard!');
            });
        }

        function copyText(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Webhook URL copied to clipboard!');
            });
        }
    </script>
</x-portal-layout>
