import type { Abi } from 'viem';

export const NAMESPACE_STORAGE_ABI: Abi = [
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'slot',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'value',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'writeStorage',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'namespace',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'slot',
        type: 'bytes32',
      },
    ],
    name: 'readStorage',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
