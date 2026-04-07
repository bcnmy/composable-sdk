import type { Hex } from 'viem';
import { createPublicClient, createWalletClient, fallback, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

const transport = fallback([
  http('https://sepolia.base.org'),
  http('https://base-sepolia.blockpi.network/v1/rpc/public'),
]);

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport,
});

// ---------------------------------------------------------------------------
// Account + wallet client (requires PRIVATE_KEY in environment)
// ---------------------------------------------------------------------------

const privateKey = process.env.PRIVATE_KEY;

export const account = privateKey ? privateKeyToAccount(privateKey as Hex) : undefined;

export const walletClient = account
  ? createWalletClient({ account, chain: baseSepolia, transport })
  : undefined;

// ---------------------------------------------------------------------------
// Well-known addresses (Base Sepolia)
// ---------------------------------------------------------------------------

// Mock USDC on Base Sepolia (used in integration tests)
export const USDC_ADDRESS = '0x8976987ebEe0806924Ae17eEd12229Cf4789cB1f' as const;
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const;
