import {
  type AbiParameter,
  type Address,
  concatHex,
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
import { encodeAddress, encodeRuntimeFunctionData } from './runtimeAbiEncoding';
import {
  type Constraint,
  type ConstraintField,
  ConstraintType,
  type InputParam,
  InputParamFetcherType,
  InputParamType,
  type OutputParam,
  type OutputParamFetcherType,
  type RuntimeBalanceOfParams,
  type RuntimeConstraint,
  type RuntimeNativeBalanceOfParams,
  type RuntimeParamViaCustomStaticCallParams,
  type RuntimeValue,
  type runtimeERC20AllowanceOfParams,
} from './types';
import { isRuntimeComposableValue, toBytes32 } from './utils';

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

/**
 * Maps the user-facing RuntimeConstraint format to the internal ConstraintField format.
 * Handles gte, lte, and eq constraint types.
 */
export const toConstraintFields = (constraints: RuntimeConstraint[]): ConstraintField[] =>
  constraints.map((c) => {
    if ('gte' in c) return greaterThanOrEqualTo(c.gte);
    if ('lte' in c) return lessThanOrEqualTo(c.lte);
    return equalTo(c.eq);
  });

export const prepareTargetAndValueInputParams = (
  to: Address | RuntimeValue,
  value?: bigint | RuntimeValue,
): {
  targetInputParam: InputParam;
  valueInputParam: InputParam | undefined;
} => {
  // Prepare target and value input params
  // if to is of type Address, then we need to prepare the target input param as raw_bytes
  // else if to is of type RuntimeValue, then we need to prepare the target input param
  let targetInputParam: InputParam;
  if (isAddress(to as Address)) {
    targetInputParam = {
      paramType: InputParamType.TARGET,
      fetcherType: InputParamFetcherType.RAW_BYTES,
      paramData: encodeAddress(to as Address).data[0] as `0x${string}`,
      constraints: [],
    };
  } else {
    targetInputParam = {
      ...(to as RuntimeValue).inputParams[0],
      paramType: InputParamType.TARGET,
    };
  }

  let valueInputParam: InputParam | undefined;
  if (!value) {
    // value not provided, default to 0
    valueInputParam = undefined;
    // undefined valueInputParam would not be added to the composable call
    // and then the smart contract will use the default value of 0
    // thus saving gas on processing one input param
  } else if ((value as RuntimeValue).isRuntime && (value as RuntimeValue).inputParams.length > 0) {
    // value is a runtime value, use the first input param
    valueInputParam = {
      ...(value as RuntimeValue).inputParams[0],
      paramType: InputParamType.VALUE,
    };
  } else {
    // value is a static value, use it as raw_bytes
    if (value !== 0n) {
      valueInputParam = {
        paramType: InputParamType.VALUE,
        fetcherType: InputParamFetcherType.RAW_BYTES,
        paramData: (value as bigint).toString(16).padStart(64, '0') as `0x${string}`,
        constraints: [],
      };
    }
  }
  return { targetInputParam, valueInputParam };
};

export const prepareComposableInputCalldataParams = (inputs: AbiParameter[], args: AnyData[]) => {
  const composableParams = encodeRuntimeFunctionData(inputs, args).map((calldata) => {
    if (isRuntimeComposableValue(calldata)) {
      // Just handling input params here. In future, we may need to add support for output params as well
      return (calldata as RuntimeValue)?.inputParams;
    }

    // These are non runtime values which are encoded by the encodeRuntimeFunctionData helper.
    // These params are injected are individual raw bytes which will be combined on the composable contract
    return [prepareInputParam(InputParamFetcherType.RAW_BYTES, calldata as Hex)];
  });

  // Head Params,Head Params,Head Params + (len + Tail Params),(len + Tail Params),(len + Tail Params)
  // Static type doesn't have tail
  // Dynamic types have tail params where the head only have offset which points the dynamic param in tail
  return composableParams.flat();
};

/// @dev This is a helper function for composable pseudo-dynamic `bytes` values.
/// which are in fact several static values abi.encoded together
/// and we want one of those static values to be runtime value
/// so what we do here is we just treat runtimeAbiEncode as pseudo-function composable call
/// and just mimic the process of encoding the params for it.
/// it prepares the independent encoding with internal offsets for dynamic params, so
/// every `runtimeAbiEncode` can has nested `runtimeAbiEncode`-s inside it
export const runtimeEncodeAbiParameters = (
  // mimics the interface of the og encodeAbiParameters
  // but is able to work with runtime values
  inputs: AbiParameter[],
  args: AnyData[],
): RuntimeValue => {
  // prepare functionContext and args out of what this helper is expecting
  const inputParams: InputParam[] = prepareComposableInputCalldataParams(inputs, args);

  // so in the upper level function call encoding, there will be a runtime dynamic `bytes` argument
  // wrapped into a RuntimeValue object with several InputParam's.
  // Some of those params will be runtime values (fetcherType: STATIC_CALL)
  // and some of them will be raw bytes (fetcherType: RAW_BYTES)
  // So we should account for that in the `encodeParams` method
  return {
    isRuntime: true,
    inputParams: inputParams,
    outputParams: [],
  };
};

/**
 * Compresses the input params by merging the input params with InputParamFetcherType.RAW_BYTES
 * and no constraints together
 * It does this by creating a new InputParam with InputParamFetcherType.RAW_BYTES and no constraints
 * and paramData as the concat of paramData's
 * It allows for less input params in the composable call => less iterations in the composable smart contract
 * => less gas used
 */
export const compressCalldataInputParams = (inputParams: InputParam[]): InputParam[] => {
  const compressedParams: InputParam[] = [];
  let currentParam: InputParam = {
    fetcherType: InputParamFetcherType.RAW_BYTES,
    constraints: [],
    paramData: '',
  };
  // compress only calldata input params
  for (const param of inputParams) {
    if (param.paramType === InputParamType.TARGET || param.paramType === InputParamType.VALUE) {
      throw new Error('Target or value input params should not be compressed');
    }
    // Static call, balance or constraint based params are left as is
    if (
      param.fetcherType === InputParamFetcherType.STATIC_CALL ||
      param.fetcherType === InputParamFetcherType.BALANCE ||
      param.constraints.length > 0
    ) {
      // If there is a current param, push it to the compressed params
      // and reset the current param
      if (currentParam.paramData.length > 0) {
        compressedParams.push(currentParam);
        currentParam = {
          fetcherType: InputParamFetcherType.RAW_BYTES,
          constraints: [],
          paramData: '',
        };
      }
      compressedParams.push(param);
      continue;
    }

    // If the current param is a raw bytes param with no constraints, merge it with the current param
    currentParam.paramData = concatHex([
      currentParam.paramData as `0x${string}`,
      param.paramData as `0x${string}`,
    ]);
  }

  // If there is a non-empty current param, push it to the compressed params
  if (currentParam.paramData.length > 0) {
    compressedParams.push(currentParam);
  }

  return compressedParams;
};
