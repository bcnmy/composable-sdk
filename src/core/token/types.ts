import type {
  Address,
  ContractFunctionArgs,
  ContractFunctionName,
  ContractFunctionReturnType,
  erc20Abi,
} from 'viem';
import type { RuntimeConstraint, RuntimeValue } from '../encoding';

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
  runtimeBalance(address: Address, constraints?: RuntimeConstraint[]): RuntimeValue;
  runtimeAllowance(
    ownerAddress: Address,
    spenderAddress: Address,
    constraints?: RuntimeConstraint[],
  ): RuntimeValue;
}

export interface NativeTokenInstance {
  balance(address: Address): Promise<bigint>;
  runtimeBalance(address: Address, constraints?: RuntimeConstraint[]): RuntimeValue;
}
