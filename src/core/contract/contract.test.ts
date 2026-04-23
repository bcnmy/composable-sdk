import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';
import { publicClient } from '../../test/utils';
import { InputParamFetcherType, InputParamType } from '../encoding';
import { createContract } from './contract';

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

// Minimal ERC20 ABI covering both view and nonpayable functions
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// Keep backward-compat alias used in write tests below
const ERC20_WRITE_ABI = ERC20_ABI;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('contract — Uniswap V3 Factory (Base Sepolia)', () => {
  const factory = createContract(publicClient, UNISWAP_V3_FACTORY, UNISWAP_V3_FACTORY_ABI);

  it('stores the correct address and abi', () => {
    expect(factory.address).toBe(UNISWAP_V3_FACTORY);
    expect(factory.abi).toBe(UNISWAP_V3_FACTORY_ABI);
  });

  it('read(owner) returns a valid address', async () => {
    const owner = await factory.read({ functionName: 'owner', args: [] });
    expect(owner).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('read(feeAmountTickSpacing) returns 60 for the 0.3% fee tier', async () => {
    const tickSpacing = await factory.read({ functionName: 'feeAmountTickSpacing', args: [3000] });
    expect(tickSpacing).toBe(60);
  });

  it('read(feeAmountTickSpacing) returns 200 for the 1% fee tier', async () => {
    const tickSpacing = await factory.read({ functionName: 'feeAmountTickSpacing', args: [10000] });
    expect(tickSpacing).toBe(200);
  });

  it('read(getPool) returns an address for USDC/WETH 0.3% pool', async () => {
    const pool = await factory.read({ functionName: 'getPool', args: [USDC, WETH, 3000] });
    expect(pool).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('read(getPool) is symmetric — same pool regardless of token order', async () => {
    const [poolA, poolB] = await Promise.all([
      factory.read({ functionName: 'getPool', args: [USDC, WETH, 3000] }),
      factory.read({ functionName: 'getPool', args: [WETH, USDC, 3000] }),
    ]);
    expect(poolA).toBe(poolB);
  });
});

// ---------------------------------------------------------------------------
// contract — write (ComposableCall encoding)
// ---------------------------------------------------------------------------

describe('contract — write (ERC20 on Base Sepolia)', () => {
  const token = createContract(publicClient, USDC, ERC20_WRITE_ABI);
  const SPENDER = WETH; // arbitrary recipient/spender address

  it('write(transfer) returns a ComposableCall', () => {
    const result = token.write({ functionName: 'transfer', args: [SPENDER, 1_000_000n] });
    expect(typeof result).toBe('object');
    expect(result.functionSig).toBeDefined();
  });

  it('write(transfer) encodes the correct function selector', () => {
    const call = token.write({ functionName: 'transfer', args: [SPENDER, 1_000_000n] });
    // keccak256("transfer(address,uint256)") first 4 bytes = 0xa9059cbb
    expect(call.functionSig).toBe('0xa9059cbb');
  });

  it('write(approve) encodes the correct function selector', () => {
    const call = token.write({ functionName: 'approve', args: [SPENDER, 1_000_000n] });
    // keccak256("approve(address,uint256)") first 4 bytes = 0x095ea7b3
    expect(call.functionSig).toBe('0x095ea7b3');
  });

  it('write(transferFrom) encodes the correct function selector', () => {
    const call = token.write({ functionName: 'transferFrom', args: [USDC, SPENDER, 1_000_000n] });
    // keccak256("transferFrom(address,address,uint256)") first 4 bytes = 0x23b872dd
    expect(call.functionSig).toBe('0x23b872dd');
  });

  it('write(transfer) outputParams is empty', () => {
    const call = token.write({ functionName: 'transfer', args: [SPENDER, 1_000_000n] });
    expect(call.outputParams).toHaveLength(0);
  });

  it('write(transfer) inputParams includes a CALL_DATA param', () => {
    const call = token.write({ functionName: 'transfer', args: [SPENDER, 1_000_000n] });
    const calldataParam = call.inputParams.find((p) => p.paramType === InputParamType.CALL_DATA);
    expect(calldataParam).toBeDefined();
    expect(calldataParam?.paramData).toMatch(/^0x[0-9a-fA-F]+$/);
  });

  it('write(transfer) inputParams includes a TARGET param with the contract address', () => {
    const call = token.write({ functionName: 'transfer', args: [SPENDER, 1_000_000n] });
    const targetParam = call.inputParams.find((p) => p.paramType === InputParamType.TARGET);
    expect(targetParam).toBeDefined();
    // paramData is the ABI-encoded address (padded to 32 bytes), USDC address should be present
    expect(targetParam?.paramData.toLowerCase()).toContain(USDC.slice(2).toLowerCase());
  });

  it('write(transfer) without value does not include a VALUE param', () => {
    const call = token.write({ functionName: 'transfer', args: [SPENDER, 1_000_000n] });
    const valueParam = call.inputParams.find((p) => p.paramType === InputParamType.VALUE);
    expect(valueParam).toBeUndefined();
  });

  it('write(transfer) with value includes a VALUE param', () => {
    const call = token.write({ functionName: 'transfer', args: [SPENDER, 1_000_000n], value: 1n });
    const valueParam = call.inputParams.find((p) => p.paramType === InputParamType.VALUE);
    expect(valueParam).toBeDefined();
  });

  it('write(transfer) is deterministic for the same args', () => {
    const a = token.write({ functionName: 'transfer', args: [SPENDER, 500n] });
    const b = token.write({ functionName: 'transfer', args: [SPENDER, 500n] });
    expect(a.functionSig).toBe(b.functionSig);
    expect(JSON.stringify(a.inputParams)).toBe(JSON.stringify(b.inputParams));
  });

  it('write(transfer) produces different inputParams for different amounts', () => {
    const a = token.write({ functionName: 'transfer', args: [SPENDER, 1n] });
    const b = token.write({ functionName: 'transfer', args: [SPENDER, 2n] });
    expect(JSON.stringify(a.inputParams)).not.toBe(JSON.stringify(b.inputParams));
  });

  it('write(transfer) produces different inputParams for different recipients', () => {
    const a = token.write({ functionName: 'transfer', args: [USDC, 1_000_000n] });
    const b = token.write({ functionName: 'transfer', args: [WETH, 1_000_000n] });
    expect(JSON.stringify(a.inputParams)).not.toBe(JSON.stringify(b.inputParams));
  });

  it('write(transfer) accepts a RuntimeValue for the amount arg', () => {
    const runtimeAmount = token.runtimeValue({ functionName: 'balanceOf', args: [SPENDER] });
    const call = token.write({ functionName: 'transfer', args: [SPENDER, runtimeAmount] });
    expect(call.functionSig).toBe('0xa9059cbb');
  });

  it('write(transfer) accepts a RuntimeValue for the recipient arg', () => {
    const factory = createContract(publicClient, UNISWAP_V3_FACTORY, UNISWAP_V3_FACTORY_ABI);
    const runtimeRecipient = factory.runtimeValue({ functionName: 'owner', args: [] });
    const call = token.write({ functionName: 'transfer', args: [runtimeRecipient, 1_000_000n] });
    expect(call.functionSig).toBe('0xa9059cbb');
  });

  it('write(transfer) with RuntimeValue arg produces more inputParams than a plain call', () => {
    const runtimeAmount = token.runtimeValue({ functionName: 'balanceOf', args: [SPENDER] });
    const composable = token.write({ functionName: 'transfer', args: [SPENDER, runtimeAmount] });
    const plain = token.write({ functionName: 'transfer', args: [SPENDER, 1_000_000n] });
    // RuntimeValue injects a STATIC_CALL inputParam in addition to the calldata params
    expect(composable.inputParams.length).toBeGreaterThan(plain.inputParams.length);
  });

  it('write(approve) accepts RuntimeValues for both args', () => {
    const factory = createContract(publicClient, UNISWAP_V3_FACTORY, UNISWAP_V3_FACTORY_ABI);
    const runtimeSpender = factory.runtimeValue({ functionName: 'owner', args: [] });
    const runtimeAmount = token.runtimeValue({ functionName: 'totalSupply', args: [] });
    const call = token.write({ functionName: 'approve', args: [runtimeSpender, runtimeAmount] });
    expect(call.functionSig).toBe('0x095ea7b3');
  });
});

// ---------------------------------------------------------------------------
// contract — check
// ---------------------------------------------------------------------------

describe('contract — check (ERC20 on Base Sepolia)', () => {
  const token = createContract(publicClient, USDC, ERC20_ABI);

  it('check(balanceOf) returns a ComposableCall with a functionSig', () => {
    const call = token.check({
      functionName: 'balanceOf',
      args: [WETH],
      constraints: [{ gte: 0n }],
    });
    expect(typeof call.functionSig).toBe('string');
    expect(call.functionSig.length).toBeGreaterThan(0);
  });

  it('check(balanceOf) uses the predicate dummy functionSig', () => {
    const call = token.check({
      functionName: 'balanceOf',
      args: [WETH],
      constraints: [{ gte: 0n }],
    });
    // check() is a predicate — the calldata never executes, so functionSig is always the sentinel
    expect(call.functionSig).toBe('0x11111111');
  });

  it('check(totalSupply) uses the predicate dummy functionSig', () => {
    const call = token.check({ functionName: 'totalSupply', args: [], constraints: [{ gte: 1n }] });
    expect(call.functionSig).toBe('0x11111111');
  });

  it('check() always produces the same predicate functionSig regardless of function called', () => {
    const a = token.check({ functionName: 'balanceOf', args: [WETH], constraints: [{ gte: 0n }] });
    const b = token.check({ functionName: 'totalSupply', args: [], constraints: [{ gte: 0n }] });
    expect(a.functionSig).toBe(b.functionSig);
  });

  it('check(balanceOf) outputParams is empty', () => {
    const call = token.check({
      functionName: 'balanceOf',
      args: [WETH],
      constraints: [{ gte: 0n }],
    });
    expect(call.outputParams).toHaveLength(0);
  });

  it('check(balanceOf) inputParams contains a STATIC_CALL param', () => {
    const call = token.check({
      functionName: 'balanceOf',
      args: [WETH],
      constraints: [{ gte: 0n }],
    });
    const staticCallParam = call.inputParams.find(
      (p) => p.fetcherType === InputParamFetcherType.STATIC_CALL,
    );
    expect(staticCallParam).toBeDefined();
  });

  it('one constraint is applied to the STATIC_CALL param', () => {
    const call = token.check({
      functionName: 'balanceOf',
      args: [WETH],
      constraints: [{ gte: 1_000n }],
    });
    const staticCallParam = call.inputParams.find(
      (p) => p.fetcherType === InputParamFetcherType.STATIC_CALL,
    );
    expect(staticCallParam?.constraints).toHaveLength(1);
  });

  it('multiple constraints are all applied to the STATIC_CALL param', () => {
    const call = token.check({
      functionName: 'balanceOf',
      args: [WETH],
      constraints: [{ gte: 1_000n }, { lte: 1_000_000n }],
    });
    const staticCallParam = call.inputParams.find(
      (p) => p.fetcherType === InputParamFetcherType.STATIC_CALL,
    );
    expect(staticCallParam?.constraints).toHaveLength(2);
  });

  it('constraints do not affect paramData of the STATIC_CALL param', () => {
    const withConstraint = token.check({
      functionName: 'balanceOf',
      args: [WETH],
      constraints: [{ gte: 999n }],
    });
    const withOtherConstraint = token.check({
      functionName: 'balanceOf',
      args: [WETH],
      constraints: [{ lte: 1n }],
    });
    const staticA = withConstraint.inputParams.find(
      (p) => p.fetcherType === InputParamFetcherType.STATIC_CALL,
    );
    const staticB = withOtherConstraint.inputParams.find(
      (p) => p.fetcherType === InputParamFetcherType.STATIC_CALL,
    );
    expect(staticA?.paramData).toBe(staticB?.paramData);
  });

  it('check(balanceOf) produces different paramData for different addresses', () => {
    const a = token.check({ functionName: 'balanceOf', args: [USDC], constraints: [{ gte: 0n }] });
    const b = token.check({ functionName: 'balanceOf', args: [WETH], constraints: [{ gte: 0n }] });
    const staticA = a.inputParams.find((p) => p.fetcherType === InputParamFetcherType.STATIC_CALL);
    const staticB = b.inputParams.find((p) => p.fetcherType === InputParamFetcherType.STATIC_CALL);
    expect(staticA?.paramData).not.toBe(staticB?.paramData);
  });

  it('check(balanceOf) is deterministic for the same args', () => {
    const a = token.check({ functionName: 'balanceOf', args: [WETH], constraints: [{ gte: 0n }] });
    const b = token.check({ functionName: 'balanceOf', args: [WETH], constraints: [{ gte: 0n }] });
    expect(a.functionSig).toBe(b.functionSig);
    expect(JSON.stringify(a.inputParams)).toBe(JSON.stringify(b.inputParams));
  });
});

// ---------------------------------------------------------------------------
// contract — runtimeValue
// ---------------------------------------------------------------------------

describe('contract — runtimeValue (Uniswap V3 Factory)', () => {
  const factory = createContract(publicClient, UNISWAP_V3_FACTORY, UNISWAP_V3_FACTORY_ABI);

  it('runtimeValue returns a RuntimeValue with isRuntime=true', () => {
    const rv = factory.runtimeValue({ functionName: 'owner', args: [] });
    expect(rv.isRuntime).toBe(true);
  });

  it('runtimeValue uses STATIC_CALL fetcherType', () => {
    const rv = factory.runtimeValue({ functionName: 'owner', args: [] });
    expect(rv.inputParams).toHaveLength(1);
    expect(rv.inputParams[0].fetcherType).toBe(InputParamFetcherType.STATIC_CALL);
  });

  it('runtimeValue encodes the target contract address in paramData', () => {
    const rv = factory.runtimeValue({ functionName: 'owner', args: [] });
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(
      UNISWAP_V3_FACTORY.slice(2).toLowerCase(),
    );
  });

  it('runtimeValue(getPool) encodes the contract address in paramData', () => {
    const rv = factory.runtimeValue({ functionName: 'getPool', args: [USDC, WETH, 3000] });
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(
      UNISWAP_V3_FACTORY.slice(2).toLowerCase(),
    );
  });

  it('runtimeValue produces different paramData for different function calls', () => {
    const a = factory.runtimeValue({ functionName: 'owner', args: [] });
    const b = factory.runtimeValue({ functionName: 'getPool', args: [USDC, WETH, 3000] });
    expect(a.inputParams[0].paramData).not.toBe(b.inputParams[0].paramData);
  });

  it('runtimeValue(getPool) produces different paramData for different args', () => {
    const a = factory.runtimeValue({ functionName: 'getPool', args: [USDC, WETH, 3000] });
    const b = factory.runtimeValue({ functionName: 'getPool', args: [USDC, WETH, 10000] });
    expect(a.inputParams[0].paramData).not.toBe(b.inputParams[0].paramData);
  });

  it('runtimeValue outputParams is empty', () => {
    const rv = factory.runtimeValue({ functionName: 'owner', args: [] });
    expect(rv.outputParams).toHaveLength(0);
  });

  it('no constraints defaults to empty constraints array', () => {
    const rv = factory.runtimeValue({ functionName: 'owner', args: [] });
    expect(rv.inputParams[0].constraints).toHaveLength(0);
  });

  it('gte constraint adds one constraint', () => {
    const rv = factory.runtimeValue({
      functionName: 'feeAmountTickSpacing',
      args: [3000],
      constraints: [{ gte: 10n }],
    });
    expect(rv.inputParams[0].constraints).toHaveLength(1);
  });

  it('lte constraint adds one constraint', () => {
    const rv = factory.runtimeValue({
      functionName: 'feeAmountTickSpacing',
      args: [3000],
      constraints: [{ lte: 200n }],
    });
    expect(rv.inputParams[0].constraints).toHaveLength(1);
  });

  it('eq constraint adds one constraint', () => {
    const rv = factory.runtimeValue({
      functionName: 'feeAmountTickSpacing',
      args: [3000],
      constraints: [{ eq: 60n }],
    });
    expect(rv.inputParams[0].constraints).toHaveLength(1);
  });

  it('multiple constraints are all added', () => {
    const rv = factory.runtimeValue({
      functionName: 'feeAmountTickSpacing',
      args: [3000],
      constraints: [{ gte: 10n }, { lte: 200n }],
    });
    expect(rv.inputParams[0].constraints).toHaveLength(2);
  });

  it('constraints do not affect the encoded paramData', () => {
    const withConstraint = factory.runtimeValue({
      functionName: 'owner',
      args: [],
      constraints: [{ gte: 1n }],
    });
    const withoutConstraint = factory.runtimeValue({ functionName: 'owner', args: [] });
    expect(withConstraint.inputParams[0].paramData).toBe(
      withoutConstraint.inputParams[0].paramData,
    );
  });
});
