import type {
  Address,
  ContractFunctionArgs,
  ContractFunctionName,
  ContractFunctionReturnType,
  erc20Abi,
} from 'viem';

export type ERC20Abi = typeof erc20Abi;

export interface ERC20TokenInstance {
  readonly address: Address;
  readonly abi: ERC20Abi;
  read<
    TFunctionName extends ContractFunctionName<ERC20Abi, 'pure' | 'view'>,
    const TArgs extends ContractFunctionArgs<ERC20Abi, 'pure' | 'view', TFunctionName>,
  >(
    functionName: TFunctionName,
    args: TArgs,
  ): Promise<ContractFunctionReturnType<ERC20Abi, 'pure' | 'view', TFunctionName, TArgs>>;
}

export interface NativeTokenInstance {
  getBalance(address: Address): Promise<bigint>;
}
