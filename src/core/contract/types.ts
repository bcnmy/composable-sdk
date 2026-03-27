import type { Abi } from 'abitype';
import type { Address, ContractFunctionArgs, ContractFunctionName, ContractFunctionReturnType } from 'viem';

export interface ContractInstance<TAbi extends Abi | readonly unknown[]> {
  readonly address: Address;
  readonly abi: TAbi;
  read<
    TFunctionName extends ContractFunctionName<TAbi, 'pure' | 'view'>,
    const TArgs extends ContractFunctionArgs<TAbi, 'pure' | 'view', TFunctionName>,
  >(
    functionName: TFunctionName,
    args: TArgs,
  ): Promise<ContractFunctionReturnType<TAbi, 'pure' | 'view', TFunctionName, TArgs>>;
}
