import type { Address, Chain, Hex, PublicClient, Transport } from 'viem';
import type { ContractInstance } from '../contract';
import type { ComposableCall } from '../encoding';
import type { ERC20TokenInstance, NativeTokenInstance } from '../token';

export interface ComposableBatchInstance<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
> {
  readonly publicClient: PublicClient<TTransport, TChain>;
  readonly accountAddress: Address;
  readonly length: number;
  erc20Token(tokenAddress: Address): ERC20TokenInstance;
  nativeToken(): NativeTokenInstance;
  contract<const TAbi extends readonly unknown[]>(
    address: Address,
    abi: TAbi,
  ): ContractInstance<TAbi>;
  add(call: ComposableCall | ComposableCall[]): void;
  clear(): void;
  toCalldata(): Promise<Hex>;
}
