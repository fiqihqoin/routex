<x-portal-layout>
    <x-slot name="title">Vendor Settings</x-slot>

    <div class="space-y-8">
        @foreach($vendors as $vendor)
        @php
            $vendorMeta = $config[$vendor->code] ?? [];
            $vendorFields = $vendorMeta['fields'] ?? [];
            $webhookUrl = $vendorMeta['webhook_url'] ?? '';
            $instructions = $vendorMeta['instructions'] ?? '';
            $userAccount = $accounts[$vendor->id] ?? null;
        @endphp
        
        <div class="bg-white shadow sm:rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <div class="md:flex md:items-center md:justify-between">
                    <div class="flex items-center">
                        <div class="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <span class="text-indigo-600 font-bold">{{ substr($vendor->code, 0, 2) }}</span>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-lg leading-6 font-medium text-gray-900">{{ $vendor->name }}</h3>
                            <p class="text-sm text-gray-500">{{ $vendor->code }} Integration</p>
                        </div>
                    </div>
                    <div class="mt-4 md:mt-0 flex flex-col items-end">
                        @if($userAccount)
                            @if($userAccount->validation_status === 'valid')
                                <span class="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 flex items-center">
                                    <svg class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                                    Active & Valid
                                </span>
                            @else
                                <span class="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">Linked (Unvalidated)</span>
                            @endif
                            
                            @if($userAccount->last_validated_at)
                                <span class="text-xs text-gray-400 mt-1 italic">Last tested: {{ $userAccount->last_validated_at->diffForHumans() }}</span>
                            @endif
                        @else
                            <span class="px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-800">Not Linked</span>
                        @endif
                    </div>
                </div>

                <!-- Webhook Instruction Section -->
                <div class="mt-6 bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-md">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3 flex-grow">
                            <h4 class="text-sm font-bold text-indigo-800 uppercase">Webhook Configuration</h4>
                            <p class="text-sm text-indigo-700 mt-1">{{ $instructions }}</p>
                            <div class="mt-3 flex items-center">
                                <code class="bg-white px-2 py-1 rounded border border-indigo-200 text-xs font-mono text-indigo-600 select-all flex-grow mr-2">{{ $webhookUrl }}</code>
                                <button type="button" onclick="copyToClipboard('{{ $webhookUrl }}')" class="inline-flex items-center px-2 py-1 border border-indigo-300 shadow-sm text-xs font-medium rounded text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    Copy URL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-6 border-t border-gray-100 pt-6">
                    @if($errors->has('credentials'))
                        <div class="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-red-700">{{ $errors->first('credentials') }}</p>
                                </div>
                            </div>
                        </div>
                    @endif

                    <form action="/portal/vendors/{{ $vendor->code }}/credentials" method="POST" class="space-y-4">
                        @csrf
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="col-span-2">
                                <label class="block text-sm font-medium text-gray-700">Display Name</label>
                                <input type="text" name="account_name" required value="{{ old('account_name', $userAccount->account_name ?? 'Default ' . $vendor->name) }}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            </div>
                            
                            @foreach($vendorFields as $field)
                                @if($field['type'] === 'boolean')
                                    <div class="flex items-center mt-6">
                                        <input type="hidden" name="credentials[{{ $field['key'] }}]" value="0">
                                        <input type="checkbox" name="credentials[{{ $field['key'] }}]" value="1" 
                                            {{ old("credentials.{$field['key']}", $userAccount->credentials[$field['key']] ?? false) ? 'checked' : '' }} 
                                            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                                        <label class="ml-2 block text-sm text-gray-900 font-medium">{{ $field['label'] }}</label>
                                    </div>
                                @else
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">{{ $field['label'] }}</label>
                                        <input type="{{ $field['type'] }}" name="credentials[{{ $field['key'] }}]" 
                                            value="{{ $field['type'] === 'password' ? '' : old("credentials.{$field['key']}", $userAccount->credentials[$field['key']] ?? '') }}" 
                                            {{ $field['required'] ? 'required' : '' }}
                                            placeholder="{{ $field['type'] === 'password' && $userAccount ? '••••••••' : '' }}"
                                            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                    </div>
                                @endif
                            @endforeach
                        </div>

                        <div class="flex justify-end items-center space-x-4">
                            <span class="text-xs text-gray-500 flex items-center">
                                <svg class="h-4 w-4 mr-1 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                Connection will be tested before saving.
                            </span>
                            <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                {{ $userAccount ? 'Test & Update' : 'Test & Activate' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        @endforeach
    </div>

    <script>
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Webhook URL copied to clipboard!');
            });
        }
    </script>
</x-portal-layout>
