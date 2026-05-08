<x-portal-layout>
    <x-slot name="title">{{ $vendor->name }} Configuration</x-slot>

    <div class="max-w-3xl mx-auto">
        <div class="mb-6">
            <a href="/portal" class="text-sm text-indigo-600 hover:text-indigo-900 flex items-center">
                &larr; Back to Dashboard
            </a>
        </div>

        <div class="bg-white shadow sm:rounded-lg overflow-hidden">
            <div class="px-4 py-5 sm:px-6 bg-indigo-600">
                <h3 class="text-lg leading-6 font-medium text-white">{{ $vendor->name }} Integration</h3>
                <p class="mt-1 max-w-2xl text-sm text-indigo-100 italic">Configure your API credentials to enable this payment channel.</p>
            </div>

            <div class="px-4 py-5 sm:p-6">
                @if($errors->has('credentials'))
                    <div class="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                </svg>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm text-red-700 font-bold">{{ $errors->first('credentials') }}</p>
                            </div>
                        </div>
                    </div>
                @endif

                <form action="/portal/vendors/{{ $vendor->code }}" method="POST" class="space-y-6">
                    @csrf
                    <div>
                        <label class="block text-sm font-bold text-gray-700">Account Name</label>
                        <input type="text" name="account_name" required value="{{ old('account_name', $existingAccount->account_name ?? 'Default ' . $vendor->name) }}" 
                            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="e.g., My Store {{ $vendor->name }}">
                        <p class="mt-1 text-xs text-gray-500 italic">Nama internal untuk mengenali akun ini di sistem kami.</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-1 gap-6 pt-4 border-t border-gray-100">
                        @foreach($config['fields'] as $field)
                            @if($field['type'] === 'boolean')
                                <div class="flex items-center">
                                    <input type="hidden" name="credentials[{{ $field['key'] }}]" value="0">
                                    <input type="checkbox" name="credentials[{{ $field['key'] }}]" value="1" 
                                        {{ old("credentials.{$field['key']}", $existingAccount->credentials[$field['key']] ?? false) ? 'checked' : '' }} 
                                        class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                                    <label class="ml-2 block text-sm font-medium text-gray-900">{{ $field['label'] }}</label>
                                </div>
                            @else
                                <div>
                                    <label class="block text-sm font-bold text-gray-700">
                                        {{ $field['label'] }}
                                        @if($field['required']) <span class="text-red-500">*</span> @endif
                                    </label>
                                    <input type="{{ $field['type'] }}" name="credentials[{{ $field['key'] }}]" 
                                        value="{{ $field['type'] === 'password' ? '' : old("credentials.{$field['key']}", $existingAccount->credentials[$field['key']] ?? '') }}" 
                                        {{ $field['required'] ? 'required' : '' }}
                                        placeholder="{{ $field['type'] === 'password' && $existingAccount ? '•••••••• (Encrypted - Leave blank to keep existing)' : '' }}"
                                        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                    @if(isset($field['hint']))
                                        <p class="mt-1 text-xs text-gray-500 italic">{{ $field['hint'] }}</p>
                                    @endif
                                </div>
                            @endif
                        @endforeach
                    </div>

                    <div class="flex justify-end items-center space-x-4 pt-6 border-t border-gray-100">
                        <span class="text-xs text-gray-500 flex items-center italic">
                            <svg class="h-4 w-4 mr-1 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            Koneksi akan diuji ke vendor sebelum disimpan.
                        </span>
                        <button type="submit" class="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-bold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Test & Save Configuration
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</x-portal-layout>
