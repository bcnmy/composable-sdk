import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';
import { publicClient } from '../../test/utils';
import { contract } from './contract';

// Uniswap V3 Factory on Base Sepolia
const UNISWAP_V3_FACTORY = getAddress('0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24');
const UNISWAP_V3_FACTORY_ABI = [
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'feeAmountTickSpacing',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'fee', type: 'uint24' }],
    outputs: [{ name: '', type: 'int24' }],
  },
  {
    name: 'getPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const;

const USDC = getAddress('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
const WETH = getAddress('0x4200000000000000000000000000000000000006');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('contract — Uniswap V3 Factory (Base Sepolia)', () => {
  const factory = contract(publicClient, UNISWAP_V3_FACTORY, UNISWAP_V3_FACTORY_ABI);

  it('stores the correct address and abi', () => {
    expect(factory.address).toBe(UNISWAP_V3_FACTORY);
    expect(factory.abi).toBe(UNISWAP_V3_FACTORY_ABI);
  });

  it('read(owner) returns a valid address', async () => {
    const owner = await factory.read('owner', []);
    expect(owner).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('read(feeAmountTickSpacing) returns 60 for the 0.3% fee tier', async () => {
    const tickSpacing = await factory.read('feeAmountTickSpacing', [3000]);
    expect(tickSpacing).toBe(60);
  });

  it('read(feeAmountTickSpacing) returns 200 for the 1% fee tier', async () => {
    const tickSpacing = await factory.read('feeAmountTickSpacing', [10000]);
    expect(tickSpacing).toBe(200);
  });

  it('read(getPool) returns an address for USDC/WETH 0.3% pool', async () => {
    const pool = await factory.read('getPool', [USDC, WETH, 3000]);
    expect(pool).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('read(getPool) is symmetric — same pool regardless of token order', async () => {
    const [poolA, poolB] = await Promise.all([
      factory.read('getPool', [USDC, WETH, 3000]),
      factory.read('getPool', [WETH, USDC, 3000]),
    ]);
    expect(poolA).toBe(poolB);
  });
});
