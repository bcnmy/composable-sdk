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
  const pendingCalls: (ComposableCall | Promise<ComposableCall>)[] = [];

  async function build(): Promise<ComposableCall[]> {
    return Promise.all(pendingCalls);
  }

  return {
    publicClient,
    accountAddress,
    get length() {
      return pendingCalls.length;
    },
    erc20Token(tokenAddress) {
      return createERC20Token(publicClient, tokenAddress, accountAddress);
    },
    nativeToken() {
      return createNativeToken(publicClient, accountAddress);
    },
    contract(address, abi) {
      return createContract(publicClient, address, abi, accountAddress);
    },
    storage() {
      return createStorage(publicClient, accountAddress);
    },
    add(call) {
      if (Array.isArray(call)) {
        pendingCalls.push(...call);
      } else {
        pendingCalls.push(call);
      }
    },
    clear() {
      pendingCalls.length = 0;
    },
    async toCalls() {
      return build();
    },
    async toCalldata() {
      return encodeExecuteComposable(await build());
    },
  };
}
