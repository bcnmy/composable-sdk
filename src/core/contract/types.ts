import type { Abi } from 'abitype';
import type {
  Address,
  ContractFunctionArgs,
  ContractFunctionName,
  ContractFunctionReturnType,
} from 'viem';
import type { ComposableCall, RuntimeConstraint, RuntimeValue } from '../encoding';

/**
 * Wraps each element of an ABI args tuple to also accept a RuntimeValue.
 * Allows mixing concrete values with runtime-resolved values in a single call.
 */
export type ComposableArgs<T extends readonly unknown[]> = {
  [K in keyof T]: T[K] | RuntimeValue;
};

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
  write<
    TFunctionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
    const TArgs extends ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName> &
      readonly unknown[],
  >(functionName: TFunctionName, args: ComposableArgs<TArgs>, value?: bigint): ComposableCall[];
  runtimeValue<
    TFunctionName extends ContractFunctionName<TAbi, 'pure' | 'view'>,
    const TArgs extends ContractFunctionArgs<TAbi, 'pure' | 'view', TFunctionName>,
  >(functionName: TFunctionName, args: TArgs, constraints?: RuntimeConstraint[]): RuntimeValue;
}
