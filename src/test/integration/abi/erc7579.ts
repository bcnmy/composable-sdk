/**
 * ERC-7579 modular smart account standard ABI fragments.
 *
 * Covers the module management interface (installModule / isModuleInstalled)
 * used by any ERC-7579-compliant account (Nexus, ZeroDev Kernel, etc.).
 */
export const ERC7579_ABI = [
  {
    type: 'function',
    name: 'installModule',
    inputs: [
      { name: 'moduleTypeId', type: 'uint256' },
      { name: 'module', type: 'address' },
      { name: 'initData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isModuleInstalled',
    inputs: [
      { name: 'moduleTypeId', type: 'uint256' },
      { name: 'module', type: 'address' },
      { name: 'additionalContext', type: 'bytes' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
] as const;
