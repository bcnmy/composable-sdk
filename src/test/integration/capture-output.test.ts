/**
 * Integration — capture output params: execResult (single + multiple) and staticCall (single + multiple)
 *
 * Uses the StorageWriteExample deployed on Base Sepolia.
 * StorageWriteExample address (Base Sepolia): 0xEfDE41e2f93F2F0b231a010ddC35c9B8125f17bA
 *
 * Test 1 — execResult single output:
 *   oneOutput(5) → result = 10 (1 uint256).
 *   Captured via execResult; storage.check asserts slot == 10 on-chain.
 *
 * Test 2 — execResult multiple outputs:
 *   multipleOutput(7, 3) → (sum=10, product=21, greater=true) (3 outputs).
 *   Stored at slot / slot+1 / slot+2.
 *   storage.check asserts slot == 10 on-chain; storage.read verifies all three slots.
 *
 * Test 3 — staticCall single output:
 *   oneOutput(1) as write trigger; staticCall capture on oneOutputStaticCall(4) → result=12.
 *   storage.check asserts slot == 12 on-chain; storage.read confirms.
 *
 * Test 4 — staticCall multiple outputs:
 *   oneOutput(1) as write trigger; staticCall capture on multipleOutputStaticCall(4)
 *   → (triple=12, quad=16, quint=20) (3 outputs).
 *   Stored at slot / slot+1 / slot+2.
 *   storage.check asserts slot == 12 on-chain; storage.read verifies all three slots.
 */

import { toBytes32 } from '@biconomy/abstractjs';
import type { Abi } from 'viem';
import { getAddress, parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { describe, expect, it } from 'vitest';
import { createComposableBatch } from '../../core/batch';
import { account, initNexus, publicClient } from '../utils';
import { STORAGE_WRITE_EXAMPLE_ABI } from './abi/storage-write-example';
import { fundWithUsdc, USDC } from './helpers';

if (!account) throw new Error('PRIVATE_KEY is not set in environment');

const STORAGE_WRITE_EXAMPLE_CONTRACT = getAddress('0x6D3782b184F45A0EEd5C00644290fb2b87dBEE9E');
const FEE_FUND_AMOUNT = parseUnits('1', 6); // 1 mock USDC to cover MEE fees

// ---------------------------------------------------------------------------
// Integration — capture output params (Base Sepolia)
// ---------------------------------------------------------------------------

describe('Integration — capture output params: execResult and staticCall (Base Sepolia)', () => {
  it('execResult single output: oneOutput(5) → slot holds 10, verified on-chain', async () => {
    const { scaAddress, meeClient } = await initNexus();

    await fundWithUsdc(scaAddress, FEE_FUND_AMOUNT);

    const batch = createComposableBatch(publicClient, scaAddress);
    const storage = batch.storage();
    const storageWriteExample = batch.contract(
      STORAGE_WRITE_EXAMPLE_CONTRACT,
      STORAGE_WRITE_EXAMPLE_ABI,
    );

    const storageKey = await storage.getStorageKey();

    // oneOutput(5) → result = 5 * 2 = 10
    const a = 5n;
    const expectedResult = a * 2n; // 10

    batch.add([
      // 1. Call oneOutput with execResult capture → result written to slot
      storageWriteExample.write({
        functionName: 'oneOutput',
        args: [a],
        capture: { type: 'execResult', storageKey },
      }),
      // 2. On-chain constraint: slot must equal the captured return value
      storage.check({ storageKey, constraints: [{ eq: expectedResult }] }),
    ]);

    expect(batch.length).toBe(2);

    const quote = await meeClient.getQuote({
      instructions: [{ calls: await batch.toCalls(), chainId: baseSepolia.id, isComposable: true }],
      simulation: { simulate: true },
      feeToken: { address: USDC, chainId: baseSepolia.id },
    });

    const { hash } = await meeClient.executeQuote({ quote });
    await meeClient.waitForSupertransactionReceipt({ hash });

    expect(await storage.read({ storageKey })).to.eq(toBytes32(expectedResult));
  });

  it('execResult multiple outputs: multipleOutput(7, 3) → sum/product/greater across 3 slots', async () => {
    const { scaAddress, meeClient } = await initNexus();

    await fundWithUsdc(scaAddress, FEE_FUND_AMOUNT);

    const batch = createComposableBatch(publicClient, scaAddress);
    const storage = batch.storage();
    const storageWriteExample = batch.contract(
      STORAGE_WRITE_EXAMPLE_CONTRACT,
      STORAGE_WRITE_EXAMPLE_ABI,
    );

    const storageKey = await storage.getStorageKey();

    // multipleOutput(7, 3) → (sum=10, product=21, greater=true)
    //   slot     → 10   (sum)
    //   slot + 1 → 21   (product)
    //   slot + 2 → 1    (greater = true, zero-padded)
    const a = 7n;
    const b = 3n;
    const expectedSum = a + b; // 10
    const expectedProduct = a * b; // 21
    const expectedGreater = 1n; // true

    batch.add([
      // 1. Call multipleOutput with execResult capture → 3 values written to slot / slot+1 / slot+2
      storageWriteExample.write({
        functionName: 'multipleOutput',
        args: [a, b],
        capture: { type: 'execResult', storageKey },
      }),
      // 2. On-chain constraint: first slot must equal sum
      storage.check({ storageKey, constraints: [{ eq: expectedSum }] }),
    ]);

    expect(batch.length).toBe(2);

    const quote = await meeClient.getQuote({
      instructions: [{ calls: await batch.toCalls(), chainId: baseSepolia.id, isComposable: true }],
      simulation: { simulate: true },
      feeToken: { address: USDC, chainId: baseSepolia.id },
    });

    const { hash } = await meeClient.executeQuote({ quote });
    await meeClient.waitForSupertransactionReceipt({ hash });

    // Off-chain: verify all three captured slots
    expect(await storage.read({ storageKey })).to.eq(toBytes32(expectedSum));
    expect(await storage.read({ storageKey: storageKey + 1n })).to.eq(toBytes32(expectedProduct));
    expect(await storage.read({ storageKey: storageKey + 2n })).to.eq(toBytes32(expectedGreater));
  });

  it('staticCall single output: oneOutputStaticCall(4) → slot holds 12, verified on-chain', async () => {
    const { scaAddress, meeClient } = await initNexus();

    await fundWithUsdc(scaAddress, FEE_FUND_AMOUNT);

    const batch = createComposableBatch(publicClient, scaAddress);
    const storage = batch.storage();
    const storageWriteExample = batch.contract(
      STORAGE_WRITE_EXAMPLE_CONTRACT,
      STORAGE_WRITE_EXAMPLE_ABI,
    );

    const storageKey = await storage.getStorageKey();

    // oneOutputStaticCall(4) → result = 4 * 3 = 12
    const a = 4n;
    const expectedResult = a * 3n; // 12

    batch.add([
      // 1. Write trigger (oneOutput); staticCall capture on oneOutputStaticCall(4) → result written to slot
      storageWriteExample.write({
        functionName: 'oneOutput',
        args: [1n],
        capture: {
          type: 'staticCall',
          abi: STORAGE_WRITE_EXAMPLE_ABI as Abi,
          functionName: 'oneOutputStaticCall',
          targetAddress: STORAGE_WRITE_EXAMPLE_CONTRACT,
          args: [a],
          storageKey,
        },
      }),
      // 2. On-chain constraint: slot must equal the captured static call result
      storage.check({ storageKey, constraints: [{ eq: expectedResult }] }),
    ]);

    expect(batch.length).toBe(2);

    const quote = await meeClient.getQuote({
      instructions: [{ calls: await batch.toCalls(), chainId: baseSepolia.id, isComposable: true }],
      simulation: { simulate: true },
      feeToken: { address: USDC, chainId: baseSepolia.id },
    });

    const { hash } = await meeClient.executeQuote({ quote });
    await meeClient.waitForSupertransactionReceipt({ hash });

    expect(await storage.read({ storageKey })).to.eq(toBytes32(expectedResult));
  });

  it('staticCall multiple outputs: multipleOutputStaticCall(4) → triple/quad/quint across 3 slots', async () => {
    const { scaAddress, meeClient } = await initNexus();

    await fundWithUsdc(scaAddress, FEE_FUND_AMOUNT);

    const batch = createComposableBatch(publicClient, scaAddress);
    const storage = batch.storage();
    const storageWriteExample = batch.contract(
      STORAGE_WRITE_EXAMPLE_CONTRACT,
      STORAGE_WRITE_EXAMPLE_ABI,
    );

    const storageKey = await storage.getStorageKey();

    // multipleOutputStaticCall(4) → (triple=12, quad=16, quint=20)
    //   slot     → 12   (triple)
    //   slot + 1 → 16   (quad)
    //   slot + 2 → 20   (quint)
    const a = 4n;
    const expectedTriple = a * 3n; // 12
    const expectedQuad = a * 4n; // 16
    const expectedQuint = a * 5n; // 20

    batch.add([
      // 1. Write trigger (oneOutput); staticCall capture on multipleOutputStaticCall(4)
      //    stores 3 values at slot / slot+1 / slot+2
      storageWriteExample.write({
        functionName: 'oneOutput',
        args: [1n],
        capture: {
          type: 'staticCall',
          abi: STORAGE_WRITE_EXAMPLE_ABI as Abi,
          functionName: 'multipleOutputStaticCall',
          targetAddress: STORAGE_WRITE_EXAMPLE_CONTRACT,
          args: [a],
          storageKey,
        },
      }),
      // 2. On-chain constraint: first slot must equal triple (12)
      storage.check({ storageKey, constraints: [{ eq: expectedTriple }] }),
    ]);

    expect(batch.length).toBe(2);

    const quote = await meeClient.getQuote({
      instructions: [{ calls: await batch.toCalls(), chainId: baseSepolia.id, isComposable: true }],
      simulation: { simulate: true },
      feeToken: { address: USDC, chainId: baseSepolia.id },
    });

    const { hash } = await meeClient.executeQuote({ quote });
    await meeClient.waitForSupertransactionReceipt({ hash });

    // Off-chain: verify all three captured slots
    expect(await storage.read({ storageKey })).to.eq(toBytes32(expectedTriple));
    expect(await storage.read({ storageKey: storageKey + 1n })).to.eq(toBytes32(expectedQuad));
    expect(await storage.read({ storageKey: storageKey + 2n })).to.eq(toBytes32(expectedQuint));
  });
});
