import type { Address, Chain, PublicClient, Transport } from 'viem';
import { createContract } from '../contract';
import { type ComposableCall, encodeExecuteComposable } from '../encoding';
import { createStorage } from '../storage';
import { createERC20Token, createNativeToken } from '../token';
import type { ComposableBatchInstance } from './types';

export function createComposableBatch<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(
  publicClient: PublicClient<TTransport, TChain>,
  accountAddress: Address,
): ComposableBatchInstance<TTransport, TChain> {
  const calls: ComposableCall[] = [];

  return {
    publicClient,
    accountAddress,
    get length() {
      return calls.length;
    },
    erc20Token(tokenAddress) {
      return createERC20Token(publicClient, tokenAddress, accountAddress);
    },
    nativeToken() {
      return createNativeToken(publicClient, accountAddress);
    },
    contract(address, abi) {
      return createContract(publicClient, address, abi);
    },
    storage() {
      return createStorage(publicClient, accountAddress);
    },
    get calls() {
      return [...calls];
    },
    add(call) {
      if (Array.isArray(call)) {
        calls.push(...call);
      } else {
        calls.push(call);
      }
    },
    clear() {
      calls.length = 0;
    },
    toCalldata() {
      return encodeExecuteComposable(calls);
    },
  };
}
