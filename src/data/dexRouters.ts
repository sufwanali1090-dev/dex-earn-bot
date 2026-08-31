import { DexInfo } from '../types';
import { ethers } from 'ethers';

export function safeChecksumAddress(addr: string): string {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') {
    return '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'; // QuickSwap V2 fallback
  }
  try {
    return ethers.getAddress(addr.trim().toLowerCase());
  } catch {
    return addr;
  }
}

const RAW_POLYGON_DEXES: DexInfo[] = [
  {
    id: 'quickswap',
    name: 'QuickSwap V2/V3',
    routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    feePercent: 0.30,
    protocol: 'uniswap_v2',
    color: '#00D2FF',
  },
  {
    id: 'sushiswap',
    name: 'SushiSwap',
    routerAddress: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
    feePercent: 0.30,
    protocol: 'uniswap_v2',
    color: '#FA52A0',
  },
  {
    id: 'uniswap',
    name: 'Uniswap V3',
    routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    feePercent: 0.30,
    protocol: 'uniswap_v2',
    color: '#FF007A',
  },
  {
    id: 'pancakeswap',
    name: 'PancakeSwap',
    routerAddress: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
    factoryAddress: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
    feePercent: 0.25,
    protocol: 'uniswap_v2',
    color: '#D1884F',
  },
  {
    id: 'kyberswap',
    name: 'KyberSwap',
    routerAddress: '0x546C79662E028B661dFB4767664d0273184E4dD1',
    factoryAddress: '0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a',
    feePercent: 0.25,
    protocol: 'uniswap_v2',
    color: '#31CB9E',
  },
  {
    id: 'balancer',
    name: 'Balancer V2',
    routerAddress: '0xBA12222222228d8Ba531E78428213D71d0514060',
    factoryAddress: '0xBA12222222228d8Ba531E78428213D71d0514060',
    feePercent: 0.15,
    protocol: 'uniswap_v2',
    color: '#4C6EF5',
  },
  {
    id: 'dfyn',
    name: 'Dfyn Network',
    routerAddress: '0xA102072A4C07F06EC3B4900FDC4C7B80b6c57429',
    factoryAddress: '0xE7615CDAb656Fa9cad883853246023326444AC73',
    feePercent: 0.30,
    protocol: 'uniswap_v2',
    color: '#9C27B0',
  },
  {
    id: 'apeswap',
    name: 'ApeSwap',
    routerAddress: '0xC0788A3aD43d79aa53B09c272fd207b99351709c',
    factoryAddress: '0xCf083Beba2285Ab819FF930869F150829079baa0',
    feePercent: 0.20,
    protocol: 'uniswap_v2',
    color: '#FF9800',
  },
  {
    id: 'meshswap',
    name: 'Meshswap',
    routerAddress: '0x10f4A785d0b23249ff61dda70F19b06f851A9a68',
    factoryAddress: '0x9F3044f7F9FC8baC39E150ffC371C229d790bB7a',
    feePercent: 0.20,
    protocol: 'uniswap_v2',
    color: '#228BE6',
  },
  {
    id: 'polycat',
    name: 'Polycat Finance',
    routerAddress: '0x94930a328162957FF1dd48900aF67B5439336cBD',
    factoryAddress: '0x477Ce834455F1421645f4429603332418157396a',
    feePercent: 0.20,
    protocol: 'uniswap_v2',
    color: '#7950F2',
  },
  {
    id: 'waultswap',
    name: 'WaultSwap',
    routerAddress: '0x3a1D87f206D1241C0f61250B246954A21A5c0271',
    factoryAddress: '0xB42e3FE71b7E0673335b3331B3e1053BD9822570',
    feePercent: 0.20,
    protocol: 'uniswap_v2',
    color: '#12B886',
  },
  {
    id: 'dodo',
    name: 'DODO V2',
    routerAddress: '0xa356867fD58974575971698372FDA7B65E7E4166',
    factoryAddress: '0x66f6Ea6b9aA0aE07EBf8c14E01F82f1958b4f4c3',
    feePercent: 0.15,
    protocol: 'uniswap_v2',
    color: '#FAB005',
  },
  {
    id: 'curve',
    name: 'Curve Finance',
    routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // Safe Uniswap V2 router fallback for atomic execution
    factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    feePercent: 0.04,
    protocol: 'uniswap_v2',
    color: '#E03131',
  },
];

export const POLYGON_DEXES: DexInfo[] = RAW_POLYGON_DEXES.map((d) => ({
  ...d,
  routerAddress: safeChecksumAddress(d.routerAddress),
  factoryAddress: safeChecksumAddress(d.factoryAddress),
}));


export const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function totalSupply() external view returns (uint256)',
];

export const UNISWAP_V2_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
  'function allPairsLength() external view returns (uint256)',
];

export const UNISWAP_V2_ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)',
];

export const ERC20_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 value) external returns (bool)',
];
