import type { Abi } from 'abitype';
import type { Address, Chain, PublicClient, Transport } from 'viem';
import type { ContractInstance } from './types';

export function contract<
  const TAbi extends Abi | readonly unknown[],
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(
  publicClient: PublicClient<TTransport, TChain>,
  address: Address,
  abi: TAbi,
): ContractInstance<TAbi> {
  return {
    address,
    abi,
    read(functionName, args) {
      return publicClient.readContract({ abi, address, functionName, args });
    },
  };
}
