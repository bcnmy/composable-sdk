import type {
  Address,
  ContractFunctionArgs,
  ContractFunctionName,
  ContractFunctionReturnType,
  PublicClient,
} from 'viem';
import { erc20Abi } from 'viem';

// ---------------------------------------------------------------------------
// ERC20Token
// ---------------------------------------------------------------------------

type ERC20Abi = typeof erc20Abi;

interface ERC20TokenInstance {
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

export function ERC20Token(publicClient: PublicClient, address: Address): ERC20TokenInstance {
  return {
    address,
    abi: erc20Abi,
    read(functionName, args) {
      return publicClient.readContract({ abi: erc20Abi, address, functionName, args });
    },
  };
}

// ---------------------------------------------------------------------------
// NativeToken
// ---------------------------------------------------------------------------

interface NativeTokenInstance {
  getBalance(address: Address): Promise<bigint>;
}

export function NativeToken(publicClient: PublicClient): NativeTokenInstance {
  return {
    getBalance(address) {
      return publicClient.getBalance({ address });
    },
  };
}
