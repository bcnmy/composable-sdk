import type { Address, Chain, PublicClient, Transport } from 'viem';
import { contract } from '../contract';
import { type ComposableCall, encodeExecuteComposable } from '../encoding';
import { ERC20Token, NativeToken } from '../token';
import type { ComposableBatchInstance } from './types';

export function ComposableBatch<
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
      return ERC20Token(publicClient, tokenAddress, accountAddress);
    },
    nativeToken() {
      return NativeToken(publicClient, accountAddress);
    },
    contract(address, abi) {
      return contract(publicClient, address, abi);
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
