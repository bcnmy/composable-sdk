import { createComposableBatch } from 'smart-batching';
import type { Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { account, initNexus, publicClient, toMeeCalls } from '../utils';
import { RUNTIME_TRANSFER_ABI } from './abi/runtime-transfer';
import {
  ensureRuntimeTransferContractBalance,
  ensureScaBalance,
  RUNTIME_TRANSFER_CONTRACT,
  TRANSFER_AMOUNT,
  USDC,
  usdcBalanceOf,
} from './helpers';

if (!account) throw new Error('PRIVATE_KEY is not set in environment');

// ---------------------------------------------------------------------------
// Shared Nexus state — initialised once for the whole suite
// ---------------------------------------------------------------------------

let scaAddress: Address;
let meeClient: Awaited<ReturnType<typeof initNexus>>['meeClient'];

// ---------------------------------------------------------------------------
// Integration — signed integer and OR constraints on runtime ERC-20 balance
// ---------------------------------------------------------------------------

describe('Integration — signed integer and OR constraints on runtimeBalance (Base Sepolia)', () => {
  beforeAll(async () => {
    const nexus = await initNexus();
    scaAddress = nexus.scaAddress;
    meeClient = nexus.meeClient;

    await ensureScaBalance(scaAddress);
  });

  beforeEach(async () => {
    await ensureScaBalance(scaAddress);
    await ensureRuntimeTransferContractBalance();
  });

  it('lteSigned: simulation reverts when runtime balance exceeds signed upper bound', async () => {
    // Contract holds TRANSFER_AMOUNT (1 USDC).
    // lteSigned: 0n requires balance ≤ 0 as int256 — fails because TRANSFER_AMOUNT > 0.
    const batch = createComposableBatch(publicClient, scaAddress);
    const usdc = batch.erc20Token(USDC);
    const runtimeTransfer = batch.contract(RUNTIME_TRANSFER_CONTRACT, RUNTIME_TRANSFER_ABI);

    batch.add([
      runtimeTransfer.write({
        functionName: 'transferFunds',
        args: [
          USDC,
          scaAddress,
          usdc.runtimeBalance({
            owner: RUNTIME_TRANSFER_CONTRACT,
            constraints: [{ lteSigned: 0n }],
          }),
        ],
      }),
    ]);

    await expect(
      meeClient.getQuote({
        instructions: [
          { calls: toMeeCalls(await batch.toCalls()), chainId: baseSepolia.id, isComposable: true },
        ],
        simulation: { simulate: true },
        feeToken: { address: USDC, chainId: baseSepolia.id },
      }),
    ).rejects.toThrow(
      'UserOp [1] simulation failed. Revert reason: Execution reverted at contract 0x0000000020fe2f30453074ad916edeb653ec7e9d and reverted with error selector 0xa31844b0',
    );
  });

  it('gteSigned: simulation reverts when runtime balance is below signed lower bound', async () => {
    // Contract holds TRANSFER_AMOUNT (1 USDC).
    // gteSigned: TRANSFER_AMOUNT + 1n requires balance > 1 USDC — fails because balance equals exactly TRANSFER_AMOUNT.
    const batch = createComposableBatch(publicClient, scaAddress);
    const usdc = batch.erc20Token(USDC);
    const runtimeTransfer = batch.contract(RUNTIME_TRANSFER_CONTRACT, RUNTIME_TRANSFER_ABI);

    batch.add([
      runtimeTransfer.write({
        functionName: 'transferFunds',
        args: [
          USDC,
          scaAddress,
          usdc.runtimeBalance({
            owner: RUNTIME_TRANSFER_CONTRACT,
            constraints: [{ gteSigned: TRANSFER_AMOUNT + 1n }],
          }),
        ],
      }),
    ]);

    await expect(
      meeClient.getQuote({
        instructions: [
          { calls: toMeeCalls(await batch.toCalls()), chainId: baseSepolia.id, isComposable: true },
        ],
        simulation: { simulate: true },
        feeToken: { address: USDC, chainId: baseSepolia.id },
      }),
    ).rejects.toThrow(
      'UserOp [1] simulation failed. Revert reason: Execution reverted at contract 0x0000000020fe2f30453074ad916edeb653ec7e9d and reverted with error selector 0xa31844b0',
    );
  });

  it('OR(lteSigned, gteSigned): runtime balance satisfies one branch and transfer succeeds', async () => {
    // Contract holds TRANSFER_AMOUNT (1 USDC).
    // OR constraint:
    //   - lteSigned: 0n            → TRANSFER_AMOUNT ≤ 0?    No  — fails
    //   - gteSigned: TRANSFER_AMOUNT → TRANSFER_AMOUNT ≥ TRANSFER_AMOUNT? Yes — passes
    // OR passes because the gteSigned branch succeeds → transfer executes.
    const batch = createComposableBatch(publicClient, scaAddress);
    const usdc = batch.erc20Token(USDC);
    const runtimeTransfer = batch.contract(RUNTIME_TRANSFER_CONTRACT, RUNTIME_TRANSFER_ABI);

    const contractBalanceBefore = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceBefore).toEqual(TRANSFER_AMOUNT);

    const scaBalanceBefore = await usdcBalanceOf(scaAddress);

    batch.add([
      runtimeTransfer.write({
        functionName: 'transferFunds',
        args: [
          USDC,
          scaAddress,
          usdc.runtimeBalance({
            owner: RUNTIME_TRANSFER_CONTRACT,
            constraints: [
              {
                or: [
                  { lteSigned: 0n }, // fails: TRANSFER_AMOUNT > 0
                  { gteSigned: TRANSFER_AMOUNT }, // passes: TRANSFER_AMOUNT ≥ TRANSFER_AMOUNT
                ],
              },
            ],
          }),
        ],
      }),
    ]);

    const quote = await meeClient.getQuote({
      instructions: [
        { calls: toMeeCalls(await batch.toCalls()), chainId: baseSepolia.id, isComposable: true },
      ],
      simulation: { simulate: true },
      feeToken: { address: USDC, chainId: baseSepolia.id },
    });

    const { hash } = await meeClient.executeQuote({ quote });
    await meeClient.waitForSupertransactionReceipt({ hash });

    // Contract fully swept
    const contractBalanceAfter = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceAfter).toEqual(0n);

    // SCA received the transferred funds
    const scaBalanceAfter = await usdcBalanceOf(scaAddress);
    expect(scaBalanceAfter).toBeGreaterThan(scaBalanceBefore);
  });
});
