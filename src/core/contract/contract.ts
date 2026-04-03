import type { Abi } from 'abitype';
import type { Address, Chain, PublicClient, Transport } from 'viem';
import {
  type ComposableCall,
  compressCalldataInputParams,
  type InputParam,
  InputParamType,
  prepareComposableInputCalldataParams,
  prepareTargetAndValueInputParams,
  runtimeParamViaCustomStaticCall,
  toConstraintFields,
} from '../encoding';
import { getFunctionContextFromAbi } from '../encoding/runtimeAbiEncoding';
import type { AnyData } from '../types';
import type { ContractInstance } from './types';

export function contract<
  const TAbi extends Abi | readonly unknown[],
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(
  publicClient: PublicClient<TTransport, TChain>,
  address: Address,
  abi: TAbi,
): ContractInstance<TAbi> {
  return {
    address,
    abi,
    read(functionName, args) {
      return publicClient.readContract({ abi, address, functionName, args });
    },
    write(functionName, args, value) {
      const functionContext = getFunctionContextFromAbi(functionName, abi as Abi);

      const inputParams: InputParam[] = prepareComposableInputCalldataParams(
        [...functionContext.inputs],
        args as AnyData[],
      );

      const compressedInputParams = compressCalldataInputParams(inputParams);

      // for composability version 1.1.0+, we need to add paramType: CALL_DATA to the input params
      // since the input param type field is required for composability version 1.1.0+
      const formattedInputParams = compressedInputParams.map((param) => ({
        ...param,
        paramType: InputParamType.CALL_DATA,
      }));

      const { targetInputParam, valueInputParam } = prepareTargetAndValueInputParams(
        address,
        value,
      );

      const finalInputParams = [
        ...formattedInputParams,
        targetInputParam,
        ...(valueInputParam ? [valueInputParam] : []), // do not add valueInputParam if it is undefined
      ];

      const composableCall: ComposableCall = {
        functionSig: functionContext.functionSig,
        inputParams: finalInputParams,
        // In the current scope, output params are not handled. When more composability functions are added, this will change
        outputParams: [],
      };

      return [composableCall];
    },
    runtimeValue(functionName, args, constraints = []) {
      return runtimeParamViaCustomStaticCall({
        targetContractAddress: address,
        functionAbi: abi as Abi,
        functionName,
        args: args as AnyData[],
        constraints: toConstraintFields(constraints),
      });
    },
  };
}
