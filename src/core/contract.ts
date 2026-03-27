import type { Abi } from 'abitype';
import type {
  Address,
  ContractFunctionArgs,
  ContractFunctionName,
  ContractFunctionReturnType,
  PublicClient,
} from 'viem';

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

interface ContractInstance<TAbi extends Abi | readonly unknown[]> {
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

export function contract<const TAbi extends Abi | readonly unknown[]>(
  publicClient: PublicClient,
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
