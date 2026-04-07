import type {
  Address,
  ContractFunctionArgs,
  ContractFunctionName,
  ContractFunctionReturnType,
  erc20Abi,
} from 'viem';
import type { ComposableArgs } from '../contract';
import type { ComposableCall, RuntimeConstraint, RuntimeValue } from '../encoding';

export type ERC20Abi = typeof erc20Abi;

export interface ERC20RuntimeBalanceParams {
  owner?: Address;
  constraints?: RuntimeConstraint[];
}

export interface ERC20RuntimeAllowanceParams {
  spender: Address;
  owner?: Address;
  constraints?: RuntimeConstraint[];
}

export interface NativeBalanceParams {
  address?: Address;
}

export interface NativeRuntimeBalanceParams {
  address?: Address;
  constraints?: RuntimeConstraint[];
}

export interface ERC20TokenInstance {
  readonly address: Address;
  readonly abi: ERC20Abi;
  read<
    TFunctionName extends ContractFunctionName<ERC20Abi, 'pure' | 'view'>,
    const TArgs extends ContractFunctionArgs<ERC20Abi, 'pure' | 'view', TFunctionName>,
  >(params: {
    functionName: TFunctionName;
    args: TArgs;
  }): Promise<ContractFunctionReturnType<ERC20Abi, 'pure' | 'view', TFunctionName, TArgs>>;
  write<
    TFunctionName extends ContractFunctionName<ERC20Abi, 'nonpayable' | 'payable'>,
    const TArgs extends ContractFunctionArgs<ERC20Abi, 'nonpayable' | 'payable', TFunctionName> &
      readonly unknown[],
  >(params: {
    functionName: TFunctionName;
    args: ComposableArgs<TArgs>;
    value?: bigint;
  }): ComposableCall;
  runtimeBalance(params?: ERC20RuntimeBalanceParams): RuntimeValue;
  runtimeAllowance(params: ERC20RuntimeAllowanceParams): RuntimeValue;
}

export interface NativeTokenInstance {
  balance(params?: NativeBalanceParams): Promise<bigint>;
  runtimeBalance(params?: NativeRuntimeBalanceParams): RuntimeValue;
}
