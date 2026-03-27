import {
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  erc20Abi,
  type Hex,
  isAddress,
  isHex,
  zeroAddress,
} from 'viem';
import type { AnyData } from '../types';
import {
  type Constraint,
  type ConstraintField,
  ConstraintType,
  type InputParam,
  InputParamFetcherType,
  type OutputParam,
  type OutputParamFetcherType,
  type RuntimeBalanceOfParams,
  type RuntimeNativeBalanceOfParams,
  type RuntimeParamViaCustomStaticCallParams,
  type RuntimeValue,
  type runtimeERC20AllowanceOfParams,
} from './types';
import { toBytes32 } from './utils';

export const prepareInputParam = (
  fetcherType: InputParamFetcherType,
  paramData: string,
  constraints: Constraint[] = [],
): InputParam => {
  return { fetcherType, paramData, constraints };
};

export const prepareOutputParam = (
  fetcherType: OutputParamFetcherType,
  paramData: string,
): OutputParam => {
  return { fetcherType, paramData };
};

export const prepareConstraint = (
  constraintType: ConstraintType,
  referenceData: string,
): Constraint => {
  return { constraintType, referenceData };
};

// type any is being implicitly used. The appropriate value validation happens in the runtime function
export const greaterThanOrEqualTo = (value: AnyData): ConstraintField => {
  return { type: ConstraintType.GTE, value };
};

// type any is being implicitly used. The appropriate value validation happens in the runtime function
export const lessThanOrEqualTo = (value: AnyData): ConstraintField => {
  return { type: ConstraintType.LTE, value };
};

// type any is being implicitly used. The appropriate value validation happens in the runtime function
export const equalTo = (value: AnyData): ConstraintField => {
  return { type: ConstraintType.EQ, value };
};

/**
 * Validates and processes constraints for runtime functions
 * @param constraints - Array of constraint fields to validate and process
 * @returns Array of processed constraints ready for use
 */
export const validateAndProcessConstraints = (constraints: ConstraintField[]): Constraint[] => {
  const constraintsToAdd: Constraint[] = [];

  if (constraints.length > 0) {
    for (const constraint of constraints) {
      // Constraint type IN is ignored for runtime functions
      // This is mostly a number/unit/int, so it makes sense to only have EQ, GTE, LTE
      if (!Object.values(ConstraintType).slice(0, 3).includes(constraint.type)) {
        throw new Error('Invalid constraint type');
      }

      // Handle value validation in a appropriate to runtime function
      if (
        typeof constraint.value !== 'bigint' &&
        typeof constraint.value !== 'boolean' &&
        !isHex(constraint.value) &&
        !isAddress(constraint.value)
      ) {
        throw new Error('Invalid constraint value');
      }

      if (typeof constraint.value === 'bigint' && constraint.value < BigInt(0)) {
        throw new Error('Invalid constraint value');
      }

      const valueHex = toBytes32(constraint.value);
      const encodedConstraintValue = encodeAbiParameters([{ type: 'bytes32' }], [valueHex as Hex]);

      constraintsToAdd.push(prepareConstraint(constraint.type, encodedConstraintValue));
    }
  }

  return constraintsToAdd;
};

export const runtimeParamViaCustomStaticCall = ({
  targetContractAddress,
  functionAbi,
  functionName,
  args,
  constraints = [],
}: RuntimeParamViaCustomStaticCallParams): RuntimeValue => {
  const encodedParam = encodeAbiParameters(
    [{ type: 'address' }, { type: 'bytes' }],
    [
      targetContractAddress,
      encodeFunctionData({
        abi: functionAbi,
        functionName: functionName,
        args,
      }),
    ],
  );

  const constraintsToAdd = validateAndProcessConstraints(constraints);

  return {
    isRuntime: true,
    inputParams: [
      prepareInputParam(InputParamFetcherType.STATIC_CALL, encodedParam, constraintsToAdd),
    ],
    outputParams: [],
  };
};

/**
 * Returns the runtime value for the ERC20 allowance of the owner for the spender
 * @param owner - The owner of the tokens
 * @param spender - The spender of the tokens
 * @param tokenAddress - The address of the ERC20 token
 * @returns The runtime value for the ERC20 allowance of the owner for the spender
 */
export const runtimeERC20AllowanceOf = ({
  owner,
  spender,
  tokenAddress,
  constraints = [],
}: runtimeERC20AllowanceOfParams): RuntimeValue => {
  const encodedParam = encodeAbiParameters(
    [{ type: 'address' }, { type: 'bytes' }],
    [
      tokenAddress,
      encodeFunctionData({
        abi: erc20Abi,
        functionName: 'allowance',
        args: [owner, spender],
      }),
    ],
  );

  const constraintsToAdd = validateAndProcessConstraints(constraints);

  return {
    isRuntime: true,
    inputParams: [
      prepareInputParam(InputParamFetcherType.STATIC_CALL, encodedParam, constraintsToAdd),
    ],
    outputParams: [],
  };
};

/**
 * Returns the runtime value for the native balance of the target address
 * Utilizes the BALANCE fetcherType
 * @param targetAddress - The address of the target account
 * @returns The runtime value for the native balance of the target address
 */
export const runtimeNativeBalanceOf = ({
  targetAddress,
  constraints = [],
}: RuntimeNativeBalanceOfParams): RuntimeValue => {
  return getBalanceOf({
    targetAddress,
    tokenAddress: zeroAddress,
    constraints,
  });
};

/**
 * Returns the runtime value for the ERC20 balance of the target address
 * @param targetAddress - The address of the target account
 * @param tokenAddress - The address of the ERC20 token
 * @returns The runtime value for the ERC20 balance of the target address
 */
export const runtimeERC20BalanceOf = ({
  targetAddress,
  tokenAddress,
  constraints = [],
}: RuntimeBalanceOfParams): RuntimeValue => {
  return getBalanceOf({
    targetAddress,
    tokenAddress,
    constraints,
  });
};

const getBalanceOf = ({
  targetAddress,
  tokenAddress,
  constraints = [],
}: RuntimeBalanceOfParams): RuntimeValue => {
  const constraintsToAdd = validateAndProcessConstraints(constraints);

  const encodedInputParamData = encodePacked(['address', 'address'], [tokenAddress, targetAddress]);

  return {
    isRuntime: true,
    inputParams: [
      prepareInputParam(InputParamFetcherType.BALANCE, encodedInputParamData, constraintsToAdd),
    ],
    outputParams: [],
  };
};
