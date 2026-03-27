import type { Abi, AbiParameter, Address } from 'viem';
import type { AnyData } from '../types';

/**
 * fetcherType: Defines how to fetch the param
 * paramData: The data that is used during fetching the param
 * constraints: The constraints that the resulting param needs to satisfy
 * paramType: The type of the param. This field is optional and it is introduced in the composability version 1.1.0
 * If earlier versions are used, this field may not not present.
 */
export type InputParam = {
  paramType?: InputParamType;
  fetcherType: InputParamFetcherType;
  paramData: string;
  constraints: Constraint[];
};

export type OutputParam = {
  fetcherType: OutputParamFetcherType;
  paramData: string;
};

/**
 * paramType: The type of the param.
 * TARGET: The target address => used as a target address for the call
 * VALUE: The value => used as a native value for the call
 * CALL_DATA: processed param will be part of the calldata for the call
 * This field is optional and it is introduced in the composability version 1.1.0
 * If earlier versions are used, this field may not not present.
 */
export const InputParamType = {
  TARGET: 0,
  VALUE: 1,
  CALL_DATA: 2,
} as const;

/**
 * fetcherType: Defines how to fetch the param
 * RAW_BYTES: just use param data as is (raw bytes)
 * STATIC_CALL: param data defines the params for the static call
 * Outputs of the static call will form the processed param
 * BALANCE: param data defines the params for the balance query
 */
export const InputParamFetcherType = {
  RAW_BYTES: 0,
  STATIC_CALL: 1,
  BALANCE: 2,
} as const;

export const OutputParamFetcherType = {
  EXEC_RESULT: 0,
  STATIC_CALL: 1,
} as const;

export const ConstraintType = {
  EQ: 0,
  GTE: 1,
  LTE: 2,
  IN: 3,
} as const;

export type InputParamFetcherType =
  (typeof InputParamFetcherType)[keyof typeof InputParamFetcherType];
export type OutputParamFetcherType =
  (typeof OutputParamFetcherType)[keyof typeof OutputParamFetcherType];
export type ConstraintType = (typeof ConstraintType)[keyof typeof ConstraintType];
export type InputParamType = (typeof InputParamType)[keyof typeof InputParamType];

export type Constraint = {
  constraintType: ConstraintType;
  referenceData: string;
};

/**
 * Base composable call type
 * @param functionSig - The function signature of the composable call
 * @param inputParams - The input parameters of the composable call
 * @param outputParams - The output parameters of the composable call
 * @param to - The address of the target contract.
 * @param value - The value of the composable call.
 * Since Composability version 1.1.0, to and value are not required
 * as they are replaced by the input params with according types (TARGET, VALUE)
 */
export type BaseComposableCall = {
  to?: Address;
  value?: bigint;
  functionSig: string;
  inputParams: InputParam[];
  outputParams: OutputParam[];
};

export type ConstraintField = {
  type: ConstraintType;
  value: AnyData; // type any is being implicitly used. The appropriate value validation happens in the runtime function
};

export type RuntimeParamViaCustomStaticCallParams = {
  targetContractAddress: Address;
  functionAbi: Abi;
  args: Array<AnyData>;
  functionName?: string;
  constraints?: ConstraintField[];
};

export type runtimeERC20AllowanceOfParams = {
  owner: Address;
  spender: Address;
  tokenAddress: Address;
  constraints?: ConstraintField[];
};

export type RuntimeBalanceOfParams = {
  targetAddress: Address;
  tokenAddress: Address;
  constraints?: ConstraintField[];
};

export type RuntimeNativeBalanceOfParams = Omit<RuntimeBalanceOfParams, 'tokenAddress'>;

export type FunctionContext = {
  inputs: readonly AbiParameter[];
  outputs: readonly AbiParameter[];
  name: string;
  functionType: 'read' | 'write';
  functionSig: string;
};

export type RuntimeValue = {
  isRuntime: boolean;
  inputParams: InputParam[];
  outputParams: OutputParam[];
};
