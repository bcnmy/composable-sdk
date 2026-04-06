import { erc20Abi, getAddress } from 'viem';
import { describe, expect, it } from 'vitest';
import { publicClient } from '../../test/utils';
import { InputParamFetcherType } from '../encoding';
import { ComposableBatch } from './batch';

const ACCOUNT = getAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
const USDC = getAddress('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
const WETH = getAddress('0x4200000000000000000000000000000000000006');
const UNISWAP_V3_FACTORY = getAddress('0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24');

const UNISWAP_V3_FACTORY_ABI = [
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// ---------------------------------------------------------------------------
// ComposableBatch — construction
// ---------------------------------------------------------------------------

describe('ComposableBatch — construction', () => {
  const batch = ComposableBatch(publicClient, ACCOUNT);

  it('stores publicClient', () => {
    expect(batch.publicClient).toBe(publicClient);
  });

  it('stores accountAddress', () => {
    expect(batch.accountAddress).toBe(ACCOUNT);
  });
});

// ---------------------------------------------------------------------------
// ComposableBatch — erc20Token
// ---------------------------------------------------------------------------

describe('ComposableBatch — erc20Token', () => {
  const batch = ComposableBatch(publicClient, ACCOUNT);
  const token = batch.erc20Token(USDC);

  it('returns an ERC20TokenInstance with the correct address', () => {
    expect(token.address).toBe(USDC);
  });

  it('returns an ERC20TokenInstance with erc20Abi', () => {
    expect(token.abi).toBe(erc20Abi);
  });

  it('returns different instances for different token addresses', () => {
    const weth = batch.erc20Token(WETH);
    expect(weth.address).toBe(WETH);
    expect(token.address).toBe(USDC);
  });

  it('read delegates to publicClient (symbol)', async () => {
    const symbol = await token.read({ functionName: 'symbol', args: [] });
    expect(symbol).toBe('USDC');
  });

  it('runtimeBalance uses accountAddress when owner is omitted', () => {
    const rv = token.runtimeBalance();
    expect(rv.isRuntime).toBe(true);
    expect(rv.inputParams[0].fetcherType).toBe(InputParamFetcherType.BALANCE);
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(ACCOUNT.slice(2).toLowerCase());
  });

  it('runtimeBalance uses explicit address when provided', () => {
    const rv = token.runtimeBalance({ owner: WETH });
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(WETH.slice(2).toLowerCase());
  });

  it('runtimeAllowance uses accountAddress as owner when omitted', () => {
    const rv = token.runtimeAllowance({ spender: WETH });
    expect(rv.isRuntime).toBe(true);
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(ACCOUNT.slice(2).toLowerCase());
  });

  it('runtimeAllowance uses explicit owner when provided', () => {
    const rv = token.runtimeAllowance({ spender: WETH, owner: UNISWAP_V3_FACTORY });
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(
      UNISWAP_V3_FACTORY.slice(2).toLowerCase(),
    );
  });
});

// ---------------------------------------------------------------------------
// ComposableBatch — nativeToken
// ---------------------------------------------------------------------------

describe('ComposableBatch — nativeToken', () => {
  const batch = ComposableBatch(publicClient, ACCOUNT);
  const native = batch.nativeToken();

  it('balance uses accountAddress when address is omitted', async () => {
    const balance = await native.balance();
    expect(typeof balance).toBe('bigint');
  });

  it('balance uses explicit address when provided', async () => {
    // WETH contract always holds ETH
    const balance = await native.balance({ address: WETH });
    expect(balance > 0n).toBe(true);
  });

  it('runtimeBalance uses accountAddress when address is omitted', () => {
    const rv = native.runtimeBalance();
    expect(rv.isRuntime).toBe(true);
    expect(rv.inputParams[0].fetcherType).toBe(InputParamFetcherType.BALANCE);
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(ACCOUNT.slice(2).toLowerCase());
  });

  it('runtimeBalance uses explicit address when provided', () => {
    const rv = native.runtimeBalance({ address: WETH });
    expect(rv.inputParams[0].paramData.toLowerCase()).toContain(WETH.slice(2).toLowerCase());
  });
});

// ---------------------------------------------------------------------------
// ComposableBatch — add / length / clear / toCalldata
// ---------------------------------------------------------------------------

describe('ComposableBatch — add, length, clear, toCalldata', () => {
  it('length is 0 on a fresh batch', () => {
    const batch = ComposableBatch(publicClient, ACCOUNT);
    expect(batch.length).toBe(0);
  });

  it('add(single call) increments length by 1', () => {
    const batch = ComposableBatch(publicClient, ACCOUNT);
    const call = batch
      .contract(USDC, erc20Abi)
      .write({ functionName: 'transfer', args: [WETH, 1n] });
    batch.add(call);
    expect(batch.length).toBe(1);
  });

  it('add(array of calls) increments length by the array size', () => {
    const batch = ComposableBatch(publicClient, ACCOUNT);
    const token = batch.contract(USDC, erc20Abi);
    const calls = [
      token.write({ functionName: 'transfer', args: [WETH, 1n] }),
      token.write({ functionName: 'approve', args: [WETH, 1n] }),
    ];
    batch.add(calls);
    expect(batch.length).toBe(2);
  });

  it('add() can be called multiple times and accumulates calls', () => {
    const batch = ComposableBatch(publicClient, ACCOUNT);
    const token = batch.contract(USDC, erc20Abi);
    batch.add(token.write({ functionName: 'transfer', args: [WETH, 1n] }));
    batch.add(token.write({ functionName: 'approve', args: [WETH, 1n] }));
    expect(batch.length).toBe(2);
  });

  it('clear() resets length to 0', () => {
    const batch = ComposableBatch(publicClient, ACCOUNT);
    const call = batch
      .contract(USDC, erc20Abi)
      .write({ functionName: 'transfer', args: [WETH, 1n] });
    batch.add(call);
    batch.clear();
    expect(batch.length).toBe(0);
  });

  it('toCalldata() returns a hex string', async () => {
    const batch = ComposableBatch(publicClient, ACCOUNT);
    const call = batch
      .contract(USDC, erc20Abi)
      .write({ functionName: 'transfer', args: [WETH, 1n] });
    batch.add(call);
    const calldata = await batch.toCalldata();
    expect(calldata).toMatch(/^0x[0-9a-fA-F]+$/);
  });

  it('toCalldata() with multiple calls returns a hex string', async () => {
    const batch = ComposableBatch(publicClient, ACCOUNT);
    const token = batch.contract(USDC, erc20Abi);
    batch.add(token.write({ functionName: 'transfer', args: [WETH, 1n] }));
    batch.add(token.write({ functionName: 'approve', args: [WETH, 1_000_000n] }));
    const calldata = await batch.toCalldata();
    expect(calldata).toMatch(/^0x[0-9a-fA-F]+$/);
  });

  it('toCalldata() produces different output for different calls', async () => {
    const batchA = ComposableBatch(publicClient, ACCOUNT);
    const batchB = ComposableBatch(publicClient, ACCOUNT);
    const token = batchA.contract(USDC, erc20Abi);
    batchA.add(token.write({ functionName: 'transfer', args: [WETH, 1n] }));
    batchB.add(
      batchB.contract(USDC, erc20Abi).write({ functionName: 'approve', args: [WETH, 1n] }),
    );
    const [a, b] = await Promise.all([batchA.toCalldata(), batchB.toCalldata()]);
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// ComposableBatch — calls getter
// ---------------------------------------------------------------------------

describe('ComposableBatch — calls getter', () => {
  it('calls is empty on a fresh batch', () => {
    const batch = ComposableBatch(publicClient, ACCOUNT);
    expect(batch.calls).toHaveLength(0);
  });

  it('calls reflects added single call', () => {
    const batch = ComposableBatch(publicClient, ACCOUNT);
    const call = batch.contract(USDC, erc20Abi).write({ functionName: 'transfer', args: [WETH, 1n] });
    batch.add(call);
    expect(batch.calls).toHaveLength(1);
    expect(batch.calls[0].functionSig).toBe(call.functionSig);
  });

  it('calls reflects added array of calls', () => {
    const batch = ComposableBatch(publicClient, ACCOUNT);
    const token = batch.contract(USDC, erc20Abi);
    batch.add([
      token.write({ functionName: 'transfer', args: [WETH, 1n] }),
      token.write({ functionName: 'approve', args: [WETH, 1n] }),
    ]);
    expect(batch.calls).toHaveLength(2);
  });

  it('calls is empty after clear()', () => {
    const batch = ComposableBatch(publicClient, ACCOUNT);
    batch.add(batch.contract(USDC, erc20Abi).write({ functionName: 'transfer', args: [WETH, 1n] }));
    batch.clear();
    expect(batch.calls).toHaveLength(0);
  });

  it('calls returns a copy — mutating it does not affect the batch', () => {
    const batch = ComposableBatch(publicClient, ACCOUNT);
    batch.add(batch.contract(USDC, erc20Abi).write({ functionName: 'transfer', args: [WETH, 1n] }));
    const snapshot = batch.calls;
    snapshot.pop();
    expect(batch.calls).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// ComposableBatch — contract
// ---------------------------------------------------------------------------

describe('ComposableBatch — contract', () => {
  const batch = ComposableBatch(publicClient, ACCOUNT);
  const factory = batch.contract(UNISWAP_V3_FACTORY, UNISWAP_V3_FACTORY_ABI);

  it('returns a ContractInstance with the correct address', () => {
    expect(factory.address).toBe(UNISWAP_V3_FACTORY);
  });

  it('returns a ContractInstance with the provided abi', () => {
    expect(factory.abi).toBe(UNISWAP_V3_FACTORY_ABI);
  });

  it('read delegates to publicClient', async () => {
    const owner = await factory.read({ functionName: 'owner', args: [] });
    expect(owner).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('runtimeValue returns a RuntimeValue', () => {
    const rv = factory.runtimeValue({ functionName: 'owner', args: [] });
    expect(rv.isRuntime).toBe(true);
    expect(rv.inputParams[0].fetcherType).toBe(InputParamFetcherType.STATIC_CALL);
  });

  it('write returns a ComposableCall', () => {
    const call = batch
      .contract(USDC, erc20Abi)
      .write({ functionName: 'transfer', args: [WETH, 1_000_000n] });
    expect(typeof call).toBe('object');
    expect(call.functionSig).toBeDefined();
  });
});
