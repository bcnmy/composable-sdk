import { erc20Abi } from 'viem';
import type { Address, Chain, PublicClient, Transport } from 'viem';
import type { ERC20TokenInstance, NativeTokenInstance } from './types';

export function ERC20Token<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(publicClient: PublicClient<TTransport, TChain>, address: Address): ERC20TokenInstance {
  return {
    address,
    abi: erc20Abi,
    read(functionName, args) {
      return publicClient.readContract({ abi: erc20Abi, address, functionName, args });
    },
  };
}

export function NativeToken<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(publicClient: PublicClient<TTransport, TChain>): NativeTokenInstance {
  return {
    getBalance(address) {
      return publicClient.getBalance({ address });
    },
  };
}
