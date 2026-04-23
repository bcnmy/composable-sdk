export const STORAGE_WRITE_EXAMPLE_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'result',
        type: 'uint256',
      },
    ],
    name: 'ResultEmitted',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'a', type: 'uint256' },
      { internalType: 'uint256', name: 'b', type: 'uint256' },
    ],
    name: 'multipleOutput',
    outputs: [
      { internalType: 'uint256', name: 'sum', type: 'uint256' },
      { internalType: 'uint256', name: 'product', type: 'uint256' },
      { internalType: 'bool', name: 'greater', type: 'bool' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'a', type: 'uint256' }],
    name: 'multipleOutputStaticCall',
    outputs: [
      { internalType: 'uint256', name: 'triple', type: 'uint256' },
      { internalType: 'uint256', name: 'quad', type: 'uint256' },
      { internalType: 'uint256', name: 'quint', type: 'uint256' },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'a', type: 'uint256' },
      { internalType: 'uint256', name: 'b', type: 'uint256' },
    ],
    name: 'multipleOutputString',
    outputs: [
      { internalType: 'uint256', name: 'sum', type: 'uint256' },
      { internalType: 'string', name: 'label', type: 'string' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'a', type: 'uint256' }],
    name: 'multipleOutputStringStaticCall',
    outputs: [
      { internalType: 'uint256', name: 'triple', type: 'uint256' },
      { internalType: 'string', name: 'label', type: 'string' },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'a', type: 'uint256' }],
    name: 'oneOutput',
    outputs: [{ internalType: 'uint256', name: 'result', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'a', type: 'uint256' }],
    name: 'oneOutputStaticCall',
    outputs: [{ internalType: 'uint256', name: 'result', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'a', type: 'uint256' }],
    name: 'oneOutputString',
    outputs: [{ internalType: 'string', name: 'result', type: 'string' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'a', type: 'uint256' }],
    name: 'oneOutputStringStaticCall',
    outputs: [{ internalType: 'string', name: 'result', type: 'string' }],
    stateMutability: 'pure',
    type: 'function',
  },
];
