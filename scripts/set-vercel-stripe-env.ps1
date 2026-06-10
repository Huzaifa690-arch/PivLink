$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '..' '.env.local' | Resolve-Path
$local = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)=(.*)$') {
    $local[$matches[1]] = $matches[2].Trim('"')
  }
}

$overrides = @{
  NEXT_PUBLIC_SOLANA_NETWORK = 'mainnet'
  NEXT_PUBLIC_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com'
  NEXT_PUBLIC_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  NEXT_PUBLIC_APP_URL = 'https://pivlinks.com'
}

$keys = @(
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_CRYPTO_ONRAMP_VERSION',
  'STRIPE_ONRAMP_MAX_USD',
  'NEXT_PUBLIC_PAYMENT_PROVIDER',
  'NEXT_PUBLIC_ENABLE_STRIPE_ONRAMP',
  'NEXT_PUBLIC_ENABLE_PRIVY_CARD_FALLBACK',
  'NEXT_PUBLIC_ENABLE_BLINK_FALLBACK',
  'NEXT_PUBLIC_SOLANA_NETWORK',
  'NEXT_PUBLIC_SOLANA_RPC_URL',
  'NEXT_PUBLIC_USDC_MINT',
  'NEXT_PUBLIC_APP_URL'
)

foreach ($name in $keys) {
  $value = if ($overrides.ContainsKey($name)) { $overrides[$name] } else { $local[$name] }
  if (-not $value) { throw "Missing value for $name" }
  vercel env rm $name production --yes 2>$null | Out-Null
  $value | vercel env add $name production
  Write-Host "Set $name"
}
