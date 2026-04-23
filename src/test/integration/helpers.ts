/**
 * Shared funding and balance helpers for integration tests.
 *
 * Requires the test environment to have PRIVATE_KEY set so that
 * `walletClient` from '../utils' is defined.
 */

import type { Address } from 'viem';
import { erc20Abi } from 'viem';
import { publicClient, USDC_ADDRESS, walletClient } from '../utils';

if (!walletClient) throw new Error('PRIVATE_KEY is not set in environment');
const _walletClient = walletClient;

export const USDC = USDC_ADDRESS as Address;

export async function fundWithUsdc(recipient: Address, amount: bigint): Promise<void> {
  const hash = await _walletClient.writeContract({
    abi: erc20Abi,
    address: USDC,
    functionName: 'transfer',
    args: [recipient, amount],
  });
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
}

export async function fundWithEth(recipient: Address, amount: bigint): Promise<void> {
  const hash = await _walletClient.sendTransaction({ to: recipient, value: amount });
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
}

export async function usdcBalanceOf(address: Address): Promise<bigint> {
  return publicClient.readContract({
    abi: erc20Abi,
    address: USDC,
    functionName: 'balanceOf',
    args: [address],
  });
}
