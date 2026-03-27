import { createPublicClient, fallback, http } from 'viem';
import { baseSepolia } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: fallback([
    http('https://sepolia.base.org'),
    http('https://base-sepolia.blockpi.network/v1/rpc/public'),
  ]),
});
