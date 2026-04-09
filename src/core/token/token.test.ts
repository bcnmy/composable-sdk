import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';
import { publicClient } from '../../test/utils';
import { InputParamFetcherType } from '../encoding';
import { createERC20Token, createNativeToken } from './token';

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
  const usdc = createERC20Token(publicClient, USDC_ADDRESS);

  it('stores the correct address', () => {
    expect(usdc.address).toBe(USDC_ADDRESS);
  });

  it('read(symbol) returns "USDC"', async () => {
    const symbol = await usdc.read({ functionName: 'symbol', args: [] });
    expect(symbol).toBe('USDC');
  });

  it('read(decimals) returns 6', async () => {
    const decimals = await usdc.read({ functionName: 'decimals', args: [] });
    expect(decimals).toBe(6);
  });

  it('read(totalSupply) returns a positive bigint', async () => {
    const supply = await usdc.read({ functionName: 'totalSupply', args: [] });
    expect(typeof supply).toBe('bigint');
    expect(supply > 0n).toBe(true);
  });

  it('read(balanceOf) returns a bigint for any address', async () => {
    const balance = await usdc.read({ functionName: 'balanceOf', args: [UNISWAP_V3_ROUTER] });
    expect(typeof balance).toBe('bigint');
  });

  it('read(allowance) returns a bigint for any owner + spender pair', async () => {
    const allowance = await usdc.read({
      functionName: 'allowance',
      args: [USDC_ADDRESS, UNISWAP_V3_ROUTER],
    });
    expect(typeof allowance).toBe('bigint');
  });
});

// ---------------------------------------------------------------------------
// ERC20Token — WETH
// ---------------------------------------------------------------------------

describe('ERC20Token — WETH (Base Sepolia)', () => {
  const weth = createERC20Token(publicClient, WETH_ADDRESS);

  it('read(symbol) returns "WETH"', async () => {
    const symbol = await weth.read({ functionName: 'symbol', args: [] });
    expect(symbol).toBe('WETH');
  });

  it('read(decimals) returns 18', async () => {
    const decimals = await weth.read({ functionName: 'decimals', args: [] });
    expect(decimals).toBe(18);
  });

  it('read(totalSupply) returns a bigint', async () => {
    const supply = await weth.read({ functionName: 'totalSupply', args: [] });
    expect(typeof supply).toBe('bigint');
  });
});

// ---------------------------------------------------------------------------
// NativeToken
// ---------------------------------------------------------------------------

describe('NativeToken (Base Sepolia)', () => {
  const native = createNativeToken(publicClient);

  it('balance returns a bigint', async () => {
    const balance = await native.balance({ address: WETH_CONTRACT });
    expect(typeof balance).toBe('bigint');
  });

  it('balance of the WETH contract is positive', async () => {
    // The WETH contract always holds ETH equal to its totalSupply
    const balance = await native.balance({ address: WETH_CONTRACT });
    expect(balance > 0n).toBe(true);
  });

  it('runtimeBalance returns a RuntimeValue with isRuntime=true', () => {
    const rv = native.runtimeBalance({ address: WETH_CONTRACT });
    expect(rv.isRuntime).toBe(true);
  });

  it('runtimeBalance uses BALANCE fetcherType', () => {
    const rv = native.runtimeBalance({ address: WETH_CONTRACT });
    expect(rv.inputParams).toHaveLength(1);
    expect(rv.inputParams[0].fetcherType).toBe(InputParamFetcherType.BALANCE);
  });

  it('runtimeBalance encodes the target address in paramData', () => {
    const rv = native.runtimeBalance({ address: WETH_CONTRACT });
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(
      WETH_CONTRACT.slice(2).toLowerCase(),
    );
  });

  it('runtimeBalance produces different paramData for different targets', () => {
    const a = native.runtimeBalance({ address: WETH_CONTRACT });
    const b = native.runtimeBalance({ address: UNISWAP_V3_ROUTER });
    expect(a.inputParams[0].paramData).not.toBe(b.inputParams[0].paramData);
  });
});

// ---------------------------------------------------------------------------
// ERC20Token — runtimeBalance
// ---------------------------------------------------------------------------

describe('ERC20Token — runtimeBalance (USDC)', () => {
  const usdc = createERC20Token(publicClient, USDC_ADDRESS);

  it('runtimeBalance returns a RuntimeValue with isRuntime=true', () => {
    const rv = usdc.runtimeBalance({ owner: UNISWAP_V3_ROUTER });
    expect(rv.isRuntime).toBe(true);
  });

  it('runtimeBalance uses BALANCE fetcherType', () => {
    const rv = usdc.runtimeBalance({ owner: UNISWAP_V3_ROUTER });
    expect(rv.inputParams).toHaveLength(1);
    expect(rv.inputParams[0].fetcherType).toBe(InputParamFetcherType.BALANCE);
  });

  it('runtimeBalance encodes the token address in paramData', () => {
    const rv = usdc.runtimeBalance({ owner: UNISWAP_V3_ROUTER });
    // paramData is encodePacked([tokenAddress, targetAddress])
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(
      USDC_ADDRESS.slice(2).toLowerCase(),
    );
  });

  it('runtimeBalance encodes the owner address in paramData', () => {
    const rv = usdc.runtimeBalance({ owner: UNISWAP_V3_ROUTER });
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(
      UNISWAP_V3_ROUTER.slice(2).toLowerCase(),
    );
  });

  it('runtimeBalance produces different paramData for different owners', () => {
    const a = usdc.runtimeBalance({ owner: UNISWAP_V3_ROUTER });
    const b = usdc.runtimeBalance({ owner: WETH_ADDRESS });
    expect(a.inputParams[0].paramData).not.toBe(b.inputParams[0].paramData);
  });

  it('runtimeBalance on WETH uses WETH as token address in paramData', () => {
    const weth = createERC20Token(publicClient, WETH_ADDRESS);
    const rv = weth.runtimeBalance({ owner: UNISWAP_V3_ROUTER });
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(
      WETH_ADDRESS.slice(2).toLowerCase(),
    );
  });
});

// ---------------------------------------------------------------------------
// ERC20Token — runtimeAllowance
// ---------------------------------------------------------------------------

describe('ERC20Token — runtimeAllowance (USDC)', () => {
  const usdc = createERC20Token(publicClient, USDC_ADDRESS);

  it('runtimeAllowance returns a RuntimeValue with isRuntime=true', () => {
    const rv = usdc.runtimeAllowance({ spender: UNISWAP_V3_ROUTER, owner: WETH_ADDRESS });
    expect(rv.isRuntime).toBe(true);
  });

  it('runtimeAllowance uses STATIC_CALL fetcherType', () => {
    const rv = usdc.runtimeAllowance({ spender: UNISWAP_V3_ROUTER, owner: WETH_ADDRESS });
    expect(rv.inputParams).toHaveLength(1);
    expect(rv.inputParams[0].fetcherType).toBe(InputParamFetcherType.STATIC_CALL);
  });

  it('runtimeAllowance encodes the token address in paramData', () => {
    const rv = usdc.runtimeAllowance({ spender: UNISWAP_V3_ROUTER, owner: WETH_ADDRESS });
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(
      USDC_ADDRESS.slice(2).toLowerCase(),
    );
  });

  it('runtimeAllowance produces different paramData for different owners', () => {
    const a = usdc.runtimeAllowance({ spender: UNISWAP_V3_ROUTER, owner: WETH_ADDRESS });
    const b = usdc.runtimeAllowance({ spender: UNISWAP_V3_ROUTER, owner: USDC_ADDRESS });
    expect(a.inputParams[0].paramData).not.toBe(b.inputParams[0].paramData);
  });

  it('runtimeAllowance produces different paramData for different spenders', () => {
    const a = usdc.runtimeAllowance({ spender: USDC_ADDRESS, owner: WETH_ADDRESS });
    const b = usdc.runtimeAllowance({ spender: UNISWAP_V3_ROUTER, owner: WETH_ADDRESS });
    expect(a.inputParams[0].paramData).not.toBe(b.inputParams[0].paramData);
  });

  it('runtimeAllowance on WETH uses WETH as token address in paramData', () => {
    const weth = createERC20Token(publicClient, WETH_ADDRESS);
    const rv = weth.runtimeAllowance({ spender: USDC_ADDRESS, owner: UNISWAP_V3_ROUTER });
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(
      WETH_ADDRESS.slice(2).toLowerCase(),
    );
  });
});

// ---------------------------------------------------------------------------
// Constraints on runtime values
// ---------------------------------------------------------------------------

describe('ERC20Token — runtimeBalance with constraints', () => {
  const usdc = createERC20Token(publicClient, USDC_ADDRESS);

  it('gte constraint adds one constraint to inputParams[0]', () => {
    const rv = usdc.runtimeBalance({
      constraints: [{ gte: 1_000_000n }],
      owner: UNISWAP_V3_ROUTER,
    });
    expect(rv.inputParams[0].constraints).toHaveLength(1);
  });

  it('lte constraint adds one constraint to inputParams[0]', () => {
    const rv = usdc.runtimeBalance({
      constraints: [{ lte: 5_000_000n }],
      owner: UNISWAP_V3_ROUTER,
    });
    expect(rv.inputParams[0].constraints).toHaveLength(1);
  });

  it('eq constraint adds one constraint to inputParams[0]', () => {
    const rv = usdc.runtimeBalance({ constraints: [{ eq: 0n }], owner: UNISWAP_V3_ROUTER });
    expect(rv.inputParams[0].constraints).toHaveLength(1);
  });

  it('multiple constraints are all added', () => {
    const rv = usdc.runtimeBalance({
      constraints: [{ gte: 1_000n }, { lte: 9_000n }],
      owner: UNISWAP_V3_ROUTER,
    });
    expect(rv.inputParams[0].constraints).toHaveLength(2);
  });

  it('no constraints defaults to empty', () => {
    const rv = usdc.runtimeBalance({ owner: UNISWAP_V3_ROUTER });
    expect(rv.inputParams[0].constraints).toHaveLength(0);
  });

  it('uses accountAddress as owner when owner is omitted', () => {
    const usdcWithAccount = createERC20Token(publicClient, USDC_ADDRESS, UNISWAP_V3_ROUTER);
    const rv = usdcWithAccount.runtimeBalance({ constraints: [{ gte: 1n }] });
    expect(rv.inputParams[0].constraints).toHaveLength(1);
  });
});

describe('ERC20Token — runtimeAllowance with constraints', () => {
  const usdc = createERC20Token(publicClient, USDC_ADDRESS);

  it('gte constraint adds one constraint', () => {
    const rv = usdc.runtimeAllowance({
      spender: UNISWAP_V3_ROUTER,
      constraints: [{ gte: 500n }],
      owner: WETH_ADDRESS,
    });
    expect(rv.inputParams[0].constraints).toHaveLength(1);
  });

  it('multiple constraints are all added', () => {
    const rv = usdc.runtimeAllowance({
      spender: UNISWAP_V3_ROUTER,
      constraints: [{ gte: 100n }, { lte: 1_000n }, { eq: 500n }],
      owner: WETH_ADDRESS,
    });
    expect(rv.inputParams[0].constraints).toHaveLength(3);
  });

  it('no constraints defaults to empty', () => {
    const rv = usdc.runtimeAllowance({ spender: UNISWAP_V3_ROUTER, owner: WETH_ADDRESS });
    expect(rv.inputParams[0].constraints).toHaveLength(0);
  });

  it('uses accountAddress as owner when owner is omitted', () => {
    const usdcWithAccount = createERC20Token(publicClient, USDC_ADDRESS, WETH_ADDRESS);
    const rv = usdcWithAccount.runtimeAllowance({
      spender: UNISWAP_V3_ROUTER,
      constraints: [{ gte: 1n }],
    });
    expect(rv.inputParams[0].constraints).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// ERC20Token — write
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ERC20Token — check
// ---------------------------------------------------------------------------

describe('ERC20Token — check', () => {
  const usdc = createERC20Token(publicClient, USDC_ADDRESS);

  it('check(balanceOf) returns a ComposableCall with a functionSig', () => {
    const call = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 0n }],
    });
    expect(typeof call.functionSig).toBe('string');
    expect(call.functionSig.length).toBeGreaterThan(0);
  });

  it('check(balanceOf) encodes the correct function selector', () => {
    const call = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 0n }],
    });
    // keccak256("balanceOf(address)") first 4 bytes = 0x70a08231
    expect(call.functionSig).toBe('0x70a08231');
  });

  it('check(allowance) encodes the correct function selector', () => {
    const call = usdc.check({
      functionName: 'allowance',
      args: [UNISWAP_V3_ROUTER, WETH_ADDRESS],
      constraints: [{ gte: 0n }],
    });
    // keccak256("allowance(address,address)") first 4 bytes = 0xdd62ed3e
    expect(call.functionSig).toBe('0xdd62ed3e');
  });

  it('check(balanceOf) and check(allowance) produce different functionSigs', () => {
    const a = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 0n }],
    });
    const b = usdc.check({
      functionName: 'allowance',
      args: [UNISWAP_V3_ROUTER, WETH_ADDRESS],
      constraints: [{ gte: 0n }],
    });
    expect(a.functionSig).not.toBe(b.functionSig);
  });

  it('check(balanceOf) outputParams is empty', () => {
    const call = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 0n }],
    });
    expect(call.outputParams).toHaveLength(0);
  });

  it('check(balanceOf) inputParams contains a STATIC_CALL param', () => {
    const call = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 0n }],
    });
    const staticCallParam = call.inputParams.find(
      (p) => p.fetcherType === InputParamFetcherType.STATIC_CALL,
    );
    expect(staticCallParam).toBeDefined();
  });

  it('one constraint is applied to the STATIC_CALL param', () => {
    const call = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 1_000n }],
    });
    const staticCallParam = call.inputParams.find(
      (p) => p.fetcherType === InputParamFetcherType.STATIC_CALL,
    );
    expect(staticCallParam?.constraints).toHaveLength(1);
  });

  it('multiple constraints are all applied to the STATIC_CALL param', () => {
    const call = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 1_000n }, { lte: 1_000_000n }],
    });
    const staticCallParam = call.inputParams.find(
      (p) => p.fetcherType === InputParamFetcherType.STATIC_CALL,
    );
    expect(staticCallParam?.constraints).toHaveLength(2);
  });

  it('constraints do not affect paramData of the STATIC_CALL param', () => {
    const a = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 999n }],
    });
    const b = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ lte: 1n }],
    });
    const staticA = a.inputParams.find((p) => p.fetcherType === InputParamFetcherType.STATIC_CALL);
    const staticB = b.inputParams.find((p) => p.fetcherType === InputParamFetcherType.STATIC_CALL);
    expect(staticA?.paramData).toBe(staticB?.paramData);
  });

  it('check(balanceOf) produces different paramData for different addresses', () => {
    const a = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 0n }],
    });
    const b = usdc.check({
      functionName: 'balanceOf',
      args: [WETH_ADDRESS],
      constraints: [{ gte: 0n }],
    });
    const staticA = a.inputParams.find((p) => p.fetcherType === InputParamFetcherType.STATIC_CALL);
    const staticB = b.inputParams.find((p) => p.fetcherType === InputParamFetcherType.STATIC_CALL);
    expect(staticA?.paramData).not.toBe(staticB?.paramData);
  });

  it('check(balanceOf) is deterministic for the same args', () => {
    const a = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 0n }],
    });
    const b = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 0n }],
    });
    expect(a.functionSig).toBe(b.functionSig);
    expect(JSON.stringify(a.inputParams)).toBe(JSON.stringify(b.inputParams));
  });

  it('check on WETH produces different paramData than check on USDC for same owner', () => {
    const weth = createERC20Token(publicClient, WETH_ADDRESS);
    const a = usdc.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 0n }],
    });
    const b = weth.check({
      functionName: 'balanceOf',
      args: [UNISWAP_V3_ROUTER],
      constraints: [{ gte: 0n }],
    });
    const staticA = a.inputParams.find((p) => p.fetcherType === InputParamFetcherType.STATIC_CALL);
    const staticB = b.inputParams.find((p) => p.fetcherType === InputParamFetcherType.STATIC_CALL);
    expect(staticA?.paramData).not.toBe(staticB?.paramData);
  });
});

describe('ERC20Token — write', () => {
  const usdc = createERC20Token(publicClient, USDC_ADDRESS);

  it('write(transfer) returns a ComposableCall object', () => {
    const call = usdc.write({ functionName: 'transfer', args: [UNISWAP_V3_ROUTER, 1_000_000n] });
    expect(typeof call).toBe('object');
  });

  it('write(transfer) has a functionSig', () => {
    const call = usdc.write({ functionName: 'transfer', args: [UNISWAP_V3_ROUTER, 1_000_000n] });
    expect(typeof call.functionSig).toBe('string');
    expect(call.functionSig.length).toBeGreaterThan(0);
  });

  it('write(approve) has a functionSig', () => {
    const call = usdc.write({ functionName: 'approve', args: [UNISWAP_V3_ROUTER, 1_000_000n] });
    expect(typeof call.functionSig).toBe('string');
    expect(call.functionSig.length).toBeGreaterThan(0);
  });

  it('write(transfer) and write(approve) produce different functionSigs', () => {
    const transfer = usdc.write({
      functionName: 'transfer',
      args: [UNISWAP_V3_ROUTER, 1_000_000n],
    });
    const approve = usdc.write({
      functionName: 'approve',
      args: [UNISWAP_V3_ROUTER, 1_000_000n],
    });
    expect(transfer.functionSig).not.toBe(approve.functionSig);
  });

  it('write(transfer) accepts a runtimeBalance() as the amount arg', () => {
    const rv = usdc.runtimeBalance({ owner: UNISWAP_V3_ROUTER });
    const call = usdc.write({ functionName: 'transfer', args: [WETH_ADDRESS, rv] });
    expect(typeof call).toBe('object');
    expect(call.functionSig).toBeDefined();
  });

  it('write(transfer) produces different inputParams for different amounts', () => {
    const a = usdc.write({ functionName: 'transfer', args: [UNISWAP_V3_ROUTER, 1n] });
    const b = usdc.write({ functionName: 'transfer', args: [UNISWAP_V3_ROUTER, 2n] });
    expect(JSON.stringify(a.inputParams)).not.toBe(JSON.stringify(b.inputParams));
  });

  it('write(transfer) produces different inputParams for different recipients', () => {
    const a = usdc.write({ functionName: 'transfer', args: [UNISWAP_V3_ROUTER, 1n] });
    const b = usdc.write({ functionName: 'transfer', args: [WETH_ADDRESS, 1n] });
    expect(JSON.stringify(a.inputParams)).not.toBe(JSON.stringify(b.inputParams));
  });
});

describe('NativeToken — runtimeBalance with constraints', () => {
  const native = createNativeToken(publicClient);

  it('gte constraint adds one constraint', () => {
    const rv = native.runtimeBalance({ constraints: [{ gte: 1n }], address: WETH_CONTRACT });
    expect(rv.inputParams[0].constraints).toHaveLength(1);
  });

  it('multiple constraints are all added', () => {
    const rv = native.runtimeBalance({
      constraints: [{ gte: 0n }, { lte: 100n }],
      address: WETH_CONTRACT,
    });
    expect(rv.inputParams[0].constraints).toHaveLength(2);
  });

  it('no constraints defaults to empty', () => {
    const rv = native.runtimeBalance({ address: WETH_CONTRACT });
    expect(rv.inputParams[0].constraints).toHaveLength(0);
  });

  it('uses accountAddress as target when address is omitted', () => {
    const nativeWithAccount = createNativeToken(publicClient, WETH_CONTRACT);
    const rv = nativeWithAccount.runtimeBalance({ constraints: [{ gte: 1n }] });
    expect(rv.inputParams[0].constraints).toHaveLength(1);
  });
});
