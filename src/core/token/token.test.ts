import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';
import { publicClient } from '../../test/utils';
import { ERC20Token, NativeToken } from './token';

// Well-known Base Sepolia token addresses
const USDC_ADDRESS = getAddress('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
const WETH_ADDRESS = getAddress('0x4200000000000000000000000000000000000006');

// Base Sepolia Uniswap V3 router — known to have a USDC allowance set
const UNISWAP_V3_ROUTER = getAddress('0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4');

// WETH contract itself always holds ETH (it IS the wrapped ETH)
const WETH_CONTRACT = WETH_ADDRESS;

// ---------------------------------------------------------------------------
// ERC20Token — USDC
// ---------------------------------------------------------------------------

describe('ERC20Token — USDC (Base Sepolia)', () => {
  const usdc = ERC20Token(publicClient, USDC_ADDRESS);

  it('stores the correct address', () => {
    expect(usdc.address).toBe(USDC_ADDRESS);
  });

  it('read(symbol) returns "USDC"', async () => {
    const symbol = await usdc.read('symbol', []);
    expect(symbol).toBe('USDC');
  });

  it('read(decimals) returns 6', async () => {
    const decimals = await usdc.read('decimals', []);
    expect(decimals).toBe(6);
  });

  it('read(totalSupply) returns a positive bigint', async () => {
    const supply = await usdc.read('totalSupply', []);
    expect(typeof supply).toBe('bigint');
    expect(supply > 0n).toBe(true);
  });

  it('read(balanceOf) returns a bigint for any address', async () => {
    const balance = await usdc.read('balanceOf', [UNISWAP_V3_ROUTER]);
    expect(typeof balance).toBe('bigint');
  });

  it('read(allowance) returns a bigint for any owner + spender pair', async () => {
    const allowance = await usdc.read('allowance', [USDC_ADDRESS, UNISWAP_V3_ROUTER]);
    expect(typeof allowance).toBe('bigint');
  });
});

// ---------------------------------------------------------------------------
// ERC20Token — WETH
// ---------------------------------------------------------------------------

describe('ERC20Token — WETH (Base Sepolia)', () => {
  const weth = ERC20Token(publicClient, WETH_ADDRESS);

  it('read(symbol) returns "WETH"', async () => {
    const symbol = await weth.read('symbol', []);
    expect(symbol).toBe('WETH');
  });

  it('read(decimals) returns 18', async () => {
    const decimals = await weth.read('decimals', []);
    expect(decimals).toBe(18);
  });

  it('read(totalSupply) returns a bigint', async () => {
    const supply = await weth.read('totalSupply', []);
    expect(typeof supply).toBe('bigint');
  });
});

// ---------------------------------------------------------------------------
// NativeToken
// ---------------------------------------------------------------------------

describe('NativeToken (Base Sepolia)', () => {
  const native = NativeToken(publicClient);

  it('getBalance returns a bigint', async () => {
    const balance = await native.getBalance(WETH_CONTRACT);
    expect(typeof balance).toBe('bigint');
  });

  it('getBalance of the WETH contract is positive', async () => {
    // The WETH contract always holds ETH equal to its totalSupply
    const balance = await native.getBalance(WETH_CONTRACT);
    expect(balance > 0n).toBe(true);
  });
});
