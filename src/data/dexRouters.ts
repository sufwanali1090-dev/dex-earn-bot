import { DexInfo } from '../types';

export const POLYGON_DEXES: DexInfo[] = [
  {
    id: 'quickswap',
    name: 'QuickSwap (V2/V3)',
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
    id: 'uniswap_v3',
    name: 'Uniswap V3',
    routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    feePercent: 0.05, // Tiered: 0.05%, 0.30%
    protocol: 'uniswap_v3',
    color: '#FF007A',
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
    name: 'ApeSwap Polygon',
    routerAddress: '0xC0788A3aD43d79aa53B09c272fd207b99351709c',
    factoryAddress: '0xCf083Beba2285Ab819FF930869F150829079baa0',
    feePercent: 0.20,
    protocol: 'uniswap_v2',
    color: '#A06000',
  },
];

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
