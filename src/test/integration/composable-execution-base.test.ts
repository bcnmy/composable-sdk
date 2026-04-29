import { createComposableBatch } from 'smart-batching';
import type { Address } from 'viem';
import { getAddress, parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { account, initNexus, publicClient, toMeeCalls, walletClient } from '../utils';
import { RUNTIME_TRANSFER_ABI } from './abi/runtime-transfer';
import { fundWithUsdc, USDC, usdcBalanceOf } from './helpers';

if (!account) throw new Error('PRIVATE_KEY is not set in environment');

const RUNTIME_TRANSFER_CONTRACT = getAddress('0x7c3b315E1d72CFdB8999A68a12e87fc3cc490fec');

const TRANSFER_AMOUNT = parseUnits('1', 6); // 1 mock USDC funded into the runtime transfer contract per test
const SCA_MIN_BALANCE = parseUnits('0.5', 6); // top up SCA if it drops below this
const SCA_TARGET_BALANCE = parseUnits('1', 6); // top up SCA to this amount

// ---------------------------------------------------------------------------
// Shared Nexus state — initialised once for the whole suite
// ---------------------------------------------------------------------------

let scaAddress: Address;
let meeClient: Awaited<ReturnType<typeof initNexus>>['meeClient'];

// ---------------------------------------------------------------------------
// Top-up helpers (specific to this suite's balance thresholds)
// ---------------------------------------------------------------------------

// Tops up SCA to SCA_TARGET_BALANCE if its balance has dropped below SCA_MIN_BALANCE
async function ensureScaBalance(): Promise<void> {
  const balance = await usdcBalanceOf(scaAddress);
  if (balance < SCA_MIN_BALANCE) {
    await fundWithUsdc(scaAddress, SCA_TARGET_BALANCE - balance);
  }
}

// Resets the runtime transfer contract balance to exactly TRANSFER_AMOUNT before each test.
// Drains any excess (from a previously failed test that didn't sweep) back to the EOA,
// then tops up if the balance is below TRANSFER_AMOUNT.
async function ensureRuntimeTransferContractBalance(): Promise<void> {
  if (!walletClient) throw new Error('PRIVATE_KEY is not set in environment');
  const balance = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
  if (balance > TRANSFER_AMOUNT) {
    const hash = await walletClient.writeContract({
      abi: RUNTIME_TRANSFER_ABI,
      address: RUNTIME_TRANSFER_CONTRACT,
      functionName: 'transferFunds',
      args: [USDC, walletClient.account.address, balance - TRANSFER_AMOUNT],
    });
    await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  } else if (balance < TRANSFER_AMOUNT) {
    await fundWithUsdc(RUNTIME_TRANSFER_CONTRACT, TRANSFER_AMOUNT - balance);
  }
}

// ---------------------------------------------------------------------------
// Integration — composable execution via runtime transfer contract (Base Sepolia)
// ---------------------------------------------------------------------------

describe('Integration — composable execution via runtime transfer contract (Base Sepolia)', () => {
  beforeAll(async () => {
    const nexus = await initNexus();
    scaAddress = nexus.scaAddress;
    meeClient = nexus.meeClient;

    // Ensure SCA starts with enough USDC to cover fees across the suite
    await ensureScaBalance();
  });

  beforeEach(async () => {
    // Top up SCA if fees from a previous test swept it below the minimum
    await ensureScaBalance();
    // Ensure the runtime transfer contract has a full TRANSFER_AMOUNT ready for the next test
    await ensureRuntimeTransferContractBalance();
  });

  it('transferFunds: runtime balance of runtime transfer contract is transferred to SCA', async () => {
    const batch = createComposableBatch(publicClient, scaAddress);
    const usdc = batch.erc20Token(USDC);
    const runtimeTransfer = batch.contract(RUNTIME_TRANSFER_CONTRACT, RUNTIME_TRANSFER_ABI);

    // Assert the runtime transfer contract is funded before execution
    const contractBalanceBefore = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceBefore).toEqual(TRANSFER_AMOUNT);

    const scaBalanceBefore = await usdcBalanceOf(scaAddress);

    batch.add([
      // Pre-condition: assert the runtime transfer contract holds TRANSFER_AMOUNT before executing
      usdc.check({
        functionName: 'balanceOf',
        args: [RUNTIME_TRANSFER_CONTRACT],
        constraints: [{ gte: TRANSFER_AMOUNT }],
      }),
      // Transfer: move the runtime transfer contract's full balance to the SCA
      runtimeTransfer.write({
        functionName: 'transferFunds',
        args: [
          USDC,
          scaAddress,
          // Runtime value: resolved to the runtime transfer contract's USDC balance at execution time
          usdc.runtimeBalance({ owner: RUNTIME_TRANSFER_CONTRACT }),
        ],
      }),
      // Post-condition: assert the runtime transfer contract has been fully swept
      usdc.check({
        functionName: 'balanceOf',
        args: [RUNTIME_TRANSFER_CONTRACT],
        constraints: [{ eq: 0n }],
      }),
    ]);

    expect(batch.length).toBe(3);

    const quote = await meeClient.getQuote({
      instructions: [
        { calls: toMeeCalls(await batch.toCalls()), chainId: baseSepolia.id, isComposable: true },
      ],
      simulation: { simulate: true },
      feeToken: { address: USDC, chainId: baseSepolia.id },
    });

    const { hash } = await meeClient.executeQuote({ quote });
    await meeClient.waitForSupertransactionReceipt({ hash });

    // Runtime transfer contract should be swept to zero after the transfer
    const contractBalanceAfter = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceAfter).toEqual(0n);

    // SCA received TRANSFER_AMOUNT from the runtime transfer contract (minus MEE fees)
    const scaBalanceAfter = await usdcBalanceOf(scaAddress);
    expect(scaBalanceAfter).toBeGreaterThan(scaBalanceBefore);
  });

  it('transferFundsWithStruct: runtime balance is transferred to SCA via struct payload', async () => {
    const batch = createComposableBatch(publicClient, scaAddress);
    const usdc = batch.erc20Token(USDC);
    const runtimeTransfer = batch.contract(RUNTIME_TRANSFER_CONTRACT, RUNTIME_TRANSFER_ABI);

    const contractBalanceBefore = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceBefore).toEqual(TRANSFER_AMOUNT);

    const scaBalanceBefore = await usdcBalanceOf(scaAddress);

    batch.add([
      usdc.check({
        functionName: 'balanceOf',
        args: [RUNTIME_TRANSFER_CONTRACT],
        constraints: [{ gte: TRANSFER_AMOUNT }],
      }),
      runtimeTransfer.write({
        functionName: 'transferFundsWithStruct',
        args: [
          USDC,
          RUNTIME_TRANSFER_CONTRACT,
          {
            recipient: scaAddress,
            amount: usdc.runtimeBalance({ owner: RUNTIME_TRANSFER_CONTRACT }),
          },
        ],
      }),
      usdc.check({
        functionName: 'balanceOf',
        args: [RUNTIME_TRANSFER_CONTRACT],
        constraints: [{ eq: 0n }],
      }),
    ]);

    expect(batch.length).toBe(3);

    const quote = await meeClient.getQuote({
      instructions: [
        { calls: toMeeCalls(await batch.toCalls()), chainId: baseSepolia.id, isComposable: true },
      ],
      simulation: { simulate: true },
      feeToken: { address: USDC, chainId: baseSepolia.id },
    });

    const { hash } = await meeClient.executeQuote({ quote });
    await meeClient.waitForSupertransactionReceipt({ hash });

    const contractBalanceAfter = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceAfter).toEqual(0n);

    const scaBalanceAfter = await usdcBalanceOf(scaAddress);
    expect(scaBalanceAfter).toBeGreaterThan(scaBalanceBefore);
  });

  it('transferFundsWithDynamicArray: runtime balance is transferred to SCA via dynamic address array', async () => {
    const batch = createComposableBatch(publicClient, scaAddress);
    const usdc = batch.erc20Token(USDC);
    const runtimeTransfer = batch.contract(RUNTIME_TRANSFER_CONTRACT, RUNTIME_TRANSFER_ABI);

    const contractBalanceBefore = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceBefore).toEqual(TRANSFER_AMOUNT);

    const scaBalanceBefore = await usdcBalanceOf(scaAddress);

    batch.add([
      usdc.check({
        functionName: 'balanceOf',
        args: [RUNTIME_TRANSFER_CONTRACT],
        constraints: [{ gte: TRANSFER_AMOUNT }],
      }),
      runtimeTransfer.write({
        functionName: 'transferFundsWithDynamicArray',
        args: [
          USDC,
          scaAddress,
          [RUNTIME_TRANSFER_CONTRACT, scaAddress],
          usdc.runtimeBalance({ owner: RUNTIME_TRANSFER_CONTRACT }),
        ],
      }),
      usdc.check({
        functionName: 'balanceOf',
        args: [RUNTIME_TRANSFER_CONTRACT],
        constraints: [{ eq: 0n }],
      }),
    ]);

    expect(batch.length).toBe(3);

    const quote = await meeClient.getQuote({
      instructions: [
        { calls: toMeeCalls(await batch.toCalls()), chainId: baseSepolia.id, isComposable: true },
      ],
      simulation: { simulate: true },
      feeToken: { address: USDC, chainId: baseSepolia.id },
    });

    const { hash } = await meeClient.executeQuote({ quote });
    await meeClient.waitForSupertransactionReceipt({ hash });

    const contractBalanceAfter = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceAfter).toEqual(0n);

    const scaBalanceAfter = await usdcBalanceOf(scaAddress);
    expect(scaBalanceAfter).toBeGreaterThan(scaBalanceBefore);
  });

  it('transferFundsWithString: runtime balance is transferred to SCA with a static string arg', async () => {
    const batch = createComposableBatch(publicClient, scaAddress);
    const usdc = batch.erc20Token(USDC);
    const runtimeTransfer = batch.contract(RUNTIME_TRANSFER_CONTRACT, RUNTIME_TRANSFER_ABI);

    const contractBalanceBefore = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceBefore).toEqual(TRANSFER_AMOUNT);

    const scaBalanceBefore = await usdcBalanceOf(scaAddress);

    batch.add([
      usdc.check({
        functionName: 'balanceOf',
        args: [RUNTIME_TRANSFER_CONTRACT],
        constraints: [{ gte: TRANSFER_AMOUNT }],
      }),
      runtimeTransfer.write({
        functionName: 'transferFundsWithString',
        args: [
          USDC,
          'transfer',
          [RUNTIME_TRANSFER_CONTRACT, scaAddress],
          usdc.runtimeBalance({ owner: RUNTIME_TRANSFER_CONTRACT }),
        ],
      }),
      usdc.check({
        functionName: 'balanceOf',
        args: [RUNTIME_TRANSFER_CONTRACT],
        constraints: [{ eq: 0n }],
      }),
    ]);

    expect(batch.length).toBe(3);

    const quote = await meeClient.getQuote({
      instructions: [
        { calls: toMeeCalls(await batch.toCalls()), chainId: baseSepolia.id, isComposable: true },
      ],
      simulation: { simulate: true },
      feeToken: { address: USDC, chainId: baseSepolia.id },
    });

    const { hash } = await meeClient.executeQuote({ quote });
    await meeClient.waitForSupertransactionReceipt({ hash });

    const contractBalanceAfter = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceAfter).toEqual(0n);

    const scaBalanceAfter = await usdcBalanceOf(scaAddress);
    expect(scaBalanceAfter).toBeGreaterThan(scaBalanceBefore);
  });

  it('transferFundsWithBytes: runtime balance is transferred to SCA with a static bytes arg', async () => {
    const batch = createComposableBatch(publicClient, scaAddress);
    const usdc = batch.erc20Token(USDC);
    const runtimeTransfer = batch.contract(RUNTIME_TRANSFER_CONTRACT, RUNTIME_TRANSFER_ABI);

    const contractBalanceBefore = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceBefore).toEqual(TRANSFER_AMOUNT);

    const scaBalanceBefore = await usdcBalanceOf(scaAddress);

    batch.add([
      usdc.check({
        functionName: 'balanceOf',
        args: [RUNTIME_TRANSFER_CONTRACT],
        constraints: [{ gte: TRANSFER_AMOUNT }],
      }),
      runtimeTransfer.write({
        functionName: 'transferFundsWithBytes',
        args: [
          USDC,
          '0x',
          [RUNTIME_TRANSFER_CONTRACT, scaAddress],
          usdc.runtimeBalance({ owner: RUNTIME_TRANSFER_CONTRACT }),
        ],
      }),
      usdc.check({
        functionName: 'balanceOf',
        args: [RUNTIME_TRANSFER_CONTRACT],
        constraints: [{ eq: 0n }],
      }),
    ]);

    expect(batch.length).toBe(3);

    const quote = await meeClient.getQuote({
      instructions: [
        { calls: toMeeCalls(await batch.toCalls()), chainId: baseSepolia.id, isComposable: true },
      ],
      simulation: { simulate: true },
      feeToken: { address: USDC, chainId: baseSepolia.id },
    });

    const { hash } = await meeClient.executeQuote({ quote });
    await meeClient.waitForSupertransactionReceipt({ hash });

    const contractBalanceAfter = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceAfter).toEqual(0n);

    const scaBalanceAfter = await usdcBalanceOf(scaAddress);
    expect(scaBalanceAfter).toBeGreaterThan(scaBalanceBefore);
  });

  it('transferFundsWithRuntimeParamInsideArray: runtime balance inside a uint256[] is transferred to SCA', async () => {
    const batch = createComposableBatch(publicClient, scaAddress);
    const usdc = batch.erc20Token(USDC);
    const runtimeTransfer = batch.contract(RUNTIME_TRANSFER_CONTRACT, RUNTIME_TRANSFER_ABI);

    const contractBalanceBefore = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceBefore).toEqual(TRANSFER_AMOUNT);

    const scaBalanceBefore = await usdcBalanceOf(scaAddress);

    batch.add([
      usdc.check({
        functionName: 'balanceOf',
        args: [RUNTIME_TRANSFER_CONTRACT],
        constraints: [{ gte: TRANSFER_AMOUNT }],
      }),
      runtimeTransfer.write({
        functionName: 'transferFundsWithRuntimeParamInsideArray',
        args: [
          USDC,
          [RUNTIME_TRANSFER_CONTRACT, scaAddress],
          [usdc.runtimeBalance({ owner: RUNTIME_TRANSFER_CONTRACT })],
        ],
      }),
      usdc.check({
        functionName: 'balanceOf',
        args: [RUNTIME_TRANSFER_CONTRACT],
        constraints: [{ eq: 0n }],
      }),
    ]);

    expect(batch.length).toBe(3);

    const quote = await meeClient.getQuote({
      instructions: [
        { calls: toMeeCalls(await batch.toCalls()), chainId: baseSepolia.id, isComposable: true },
      ],
      simulation: { simulate: true },
      feeToken: { address: USDC, chainId: baseSepolia.id },
    });

    const { hash } = await meeClient.executeQuote({ quote });
    await meeClient.waitForSupertransactionReceipt({ hash });

    const contractBalanceAfter = await usdcBalanceOf(RUNTIME_TRANSFER_CONTRACT);
    expect(contractBalanceAfter).toEqual(0n);

    const scaBalanceAfter = await usdcBalanceOf(scaAddress);
    expect(scaBalanceAfter).toBeGreaterThan(scaBalanceBefore);
  });
});
