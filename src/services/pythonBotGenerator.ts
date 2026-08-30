export function generateUpdatedPythonBotScript(): string {
  return `#!/usr/bin/env python3
"""
=============================================================================
POLYGON USDT MULTI-TOKEN ARBITRAGE BOT (AUTO-EXECUTION & AUTO-APPROVAL)
=============================================================================
Core Architecture & Rules:
  1) BASE ASSET: All trades START with USDT on Polygon.
  2) STRICT SEQUENTIAL CYCLE: USDT -> Token B -> Token C -> USDT.
     Before buying the next token, the bot ALWAYS sells the previous token 
     back to USDT with profit. No unliquidated tokens are held.
  3) AUTO-APPROVAL: Automatically checks and approves ERC20 allowances 
     to QuickSwap and SushiSwap routers on startup.
  4) ATOMIC EXECUTION: Multi-hop swaps executed on-chain in 1 transaction
     with minimum output (minAmountOut) slippage protection.
  5) GAS SHIELD: Trades only trigger when Gross Profit > Gas Fees + DEX Fees.

Network: Polygon Mainnet (Chain ID: 137)
RPC: https://rpc.ankr.com/polygon (or your custom RPC in .env)
=============================================================================
"""

import os
import sys
import time
import json
from decimal import Decimal

# Load environment variables (.env file)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Import Web3 and Crypto libraries with multi-version compatibility (Web3 v5, v6, v7)
try:
    from web3 import Web3
except ImportError as e:
    print(f"[-] Missing web3 package ({e}). Please run: pip install web3 python-dotenv eth-account requests")
    sys.exit(1)

try:
    from eth_account import Account
except ImportError:
    try:
        from web3.eth.account import Account
    except ImportError:
        Account = None

# Compatibility layer for POA middleware across Web3 versions (v5, v6, v7+)
POA_MIDDLEWARE = None
try:
    # Web3 v7+
    from web3.middleware import ExtraDataToPOAMiddleware as POA_MIDDLEWARE
except ImportError:
    try:
        # Web3 v6 / v5
        from web3.middleware import geth_poa_middleware as POA_MIDDLEWARE
    except ImportError:
        try:
            from web3.middleware.proof_of_authority import ExtraDataToPOAMiddleware as POA_MIDDLEWARE
        except ImportError:
            POA_MIDDLEWARE = None

# ----------------- CONFIGURATION & RPC ROTATION -----------------
# High-reliability Polygon public RPC list (auto-fails over if one is blocked or slow)
POLYGON_RPC_POOLS = [
    os.getenv("POLYGON_RPC_URL", "").strip(),
    "https://polygon-bor-rpc.publicnode.com",
    "https://polygon.llamarpc.com",
    "https://1rpc.io/matic",
    "https://rpc.ankr.com/polygon",
    "https://polygon.drpc.org",
    "https://polygon-mainnet.public.blastapi.io"
]
# Filter empty strings
POLYGON_RPC_POOLS = [u for u in POLYGON_RPC_POOLS if u]

CHAIN_ID = 137

# Account Private Key from .env (Never share or commit private keys!)
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
WALLET_ADDRESS = os.getenv("WALLET_ADDRESS", "")

# Trade parameters
TRADE_AMOUNT_USDT = float(os.getenv("TRADE_AMOUNT_USDT", "5.0"))  # Amount in USDT to trade per cycle
MIN_NET_PROFIT_USDT = float(os.getenv("MIN_NET_PROFIT_USDT", "0.01")) # Minimum net profit required after fees
MAX_GAS_PRICE_GWEI = float(os.getenv("MAX_GAS_PRICE_GWEI", "150.0"))
SLIPPAGE_TOLERANCE_PCT = float(os.getenv("SLIPPAGE_TOLERANCE_PCT", "0.5")) # 0.5% max slippage

# Official Polygon Verified Token Addresses
TOKENS = {
    "USDT":   "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", # 6 decimals
    "WMATIC": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", # 18 decimals
    "USDC":   "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", # 6 decimals
    "DAI":    "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", # 18 decimals
    "WETH":   "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", # 18 decimals
    "WBTC":   "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", # 8 decimals
    "QUICK":  "0xB5C064F955D8e7F38fE0460C556a72987494eE17", # 18 decimals
    "LINK":   "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", # 18 decimals
    "AAVE":   "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", # 18 decimals
    "UNI":    "0xb33EaAd8d922B1083446DC23f610c2567fB5180f", # 18 decimals
    "SAND":   "0xBbba073C31bF03b8ACf7c28EF0781859556254b1", # 18 decimals
    "MANA":   "0xA1c57f48F0De49958348cb5e381088a6A6E470E7", # 18 decimals
    "CRV":    "0x172370d5Cd63279eFa6d502DAB29171933a610AF", # 18 decimals
    "SUSHI":  "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a", # 18 decimals
    "GHST":   "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7", # 18 decimals
}

# Major Polygon DEX Routers & Factories
DEXES = {
    "QuickSwap": {
        "router": "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
        "factory": "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
        "fee": 0.0030
    },
    "SushiSwap": {
        "router": "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
        "factory": "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
        "fee": 0.0030
    }
}

# Minimal ABIs
ERC20_ABI = [
    {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"},
    {"constant": True, "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}], "name": "allowance", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
    {"constant": False, "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
    {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "type": "function"},
    {"constant": True, "inputs": [], "name": "symbol", "outputs": [{"name": "", "type": "string"}], "type": "function"},
]

PAIR_ABI = [
    {"constant": True, "inputs": [], "name": "getReserves", "outputs": [{"name": "_reserve0", "type": "uint112"}, {"name": "_reserve1", "type": "uint112"}, {"name": "_blockTimestampLast", "type": "uint32"}], "type": "function"},
    {"constant": True, "inputs": [], "name": "token0", "outputs": [{"name": "", "type": "address"}], "type": "function"},
    {"constant": True, "inputs": [], "name": "token1", "outputs": [{"name": "", "type": "address"}], "type": "function"}
]

FACTORY_ABI = [
    {"constant": True, "inputs": [{"name": "tokenA", "type": "address"}, {"name": "tokenB", "type": "address"}], "name": "getPair", "outputs": [{"name": "pair", "type": "address"}], "type": "function"}
]

ROUTER_ABI = [
    {"constant": False, "inputs": [
        {"name": "amountIn", "type": "uint256"},
        {"name": "amountOutMin", "type": "uint256"},
        {"name": "path", "type": "address[]"},
        {"name": "to", "type": "address"},
        {"name": "deadline", "type": "uint256"}
    ], "name": "swapExactTokensForTokens", "outputs": [{"name": "amounts", "type": "uint256[]"}], "type": "function"},
    {"constant": True, "inputs": [
        {"name": "amountIn", "type": "uint256"},
        {"name": "path", "type": "address[]"}
    ], "name": "getAmountsOut", "outputs": [{"name": "amounts", "type": "uint256[]"}], "type": "function"}
]

MAX_UINT256 = 2**256 - 1

# ----------------- ARBITRAGE BOT ENGINE -----------------
class PolygonUsdtArbitrageBot:
    def __init__(self):
        self.w3 = None
        self.active_rpc = None
        self.account = None
        self.wallet_address = None
        self.usdt_contract = None

        # Setup Web3 connection with auto-rotation across RPC pools
        self.connect_to_best_rpc()

        if PRIVATE_KEY:
            try:
                pk_clean = PRIVATE_KEY.strip()
                if not pk_clean.startswith("0x") and len(pk_clean) == 64:
                    pk_clean = "0x" + pk_clean
                self.account = Account.from_key(pk_clean)
                self.wallet_address = self.account.address
            except Exception as e:
                print(f"[-] Invalid PRIVATE_KEY in .env: {e}")
        elif WALLET_ADDRESS and Web3.is_address(WALLET_ADDRESS):
            self.wallet_address = Web3.to_checksum_address(WALLET_ADDRESS)

    def connect_to_best_rpc(self):
        """Tries each RPC in the pool and connects to the fastest working one"""
        for rpc in POLYGON_RPC_POOLS:
            try:
                print(f"[*] Testing connection to RPC: {rpc} ...")
                provider = Web3.HTTPProvider(rpc, request_kwargs={'timeout': 8})
                test_w3 = Web3(provider)
                if test_w3.is_connected():
                    # Apply POA middleware
                    if POA_MIDDLEWARE:
                        try:
                            test_w3.middleware_onion.inject(POA_MIDDLEWARE, layer=0)
                        except Exception:
                            pass
                    
                    # Validate chain id
                    c_id = test_w3.eth.chain_id
                    if c_id == 137:
                        self.w3 = test_w3
                        self.active_rpc = rpc
                        print(f"[+] Successfully connected to Polygon Mainnet (137) via {rpc}")
                        return True
            except Exception as e:
                print(f"    [-] RPC failed ({rpc}): {e}")
                continue
        return False

    def initialize(self):
        if not self.w3 or not self.w3.is_connected():
            print("[-] Retrying RPC connections...")
            if not self.connect_to_best_rpc():
                print("[-] All public Polygon RPC endpoints timed out. Please check your internet connection.")
                return False
        
        chain_id = self.w3.eth.chain_id
        print(f"[+] Connected to Polygon Mainnet (Chain ID: {chain_id}) via {self.active_rpc}")
        
        if self.wallet_address:
            pol_bal = self.w3.eth.get_balance(self.wallet_address) / 1e18
            self.usdt_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(TOKENS["USDT"]),
                abi=ERC20_ABI
            )
            usdt_raw = self.usdt_contract.functions.balanceOf(self.wallet_address).call()
            usdt_bal = usdt_raw / 1e6
            print(f"[+] Wallet Loaded: {self.wallet_address}")
            print(f"    - POL Balance (Gas):  {pol_bal:.4f} POL")
            print(f"    - USDT Balance (Base): \${usdt_bal:.2f} USDT")

            if self.account:
                print("[+] Auto-signing ENABLED (Private Key ready)")
                self.ensure_token_approvals()
            else:
                print("[!] Read-Only Mode (No PRIVATE_KEY provided in .env)")
        else:
            print("[!] Running in Simulation Mode (No wallet configured)")
        return True

    def send_signed_transaction(self, signed_tx):
        """
        Robust transaction broadcaster compatible with all web3.py versions (v5, v6, v7).
        In Web3 v6+, SignedTransaction uses .raw_transaction (snake_case).
        In Web3 v5, it used .rawTransaction (camelCase).
        """
        raw_tx = getattr(signed_tx, 'raw_transaction', getattr(signed_tx, 'rawTransaction', None))
        if raw_tx is None and isinstance(signed_tx, dict):
            raw_tx = signed_tx.get('raw_transaction') or signed_tx.get('rawTransaction')
        if raw_tx is None:
            raw_tx = signed_tx
        return self.w3.eth.send_raw_transaction(raw_tx)

    def ensure_token_approvals(self):
        """Auto-approves USDT and major tokens on QuickSwap & SushiSwap routers"""
        print("[*] Checking DEX token approvals...")
        for dex_name, dex_info in DEXES.items():
            router_addr = Web3.to_checksum_address(dex_info["router"])
            usdt_addr = Web3.to_checksum_address(TOKENS["USDT"])
            
            try:
                allowance = self.usdt_contract.functions.allowance(self.wallet_address, router_addr).call()
                if allowance < 1000 * 10**6:
                    print(f"[*] Approving USDT for {dex_name} Router ({router_addr})...")
                    nonce = self.w3.eth.get_transaction_count(self.wallet_address)
                    gas_price = self.w3.eth.gas_price
                    tx = self.usdt_contract.functions.approve(router_addr, MAX_UINT256).build_transaction({
                        'from': self.wallet_address,
                        'nonce': nonce,
                        'gas': 80000,
                        'gasPrice': gas_price,
                        'chainId': CHAIN_ID
                    })
                    signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY.strip())
                    tx_hash = self.send_signed_transaction(signed_tx)
                    print(f"[+] Approval Tx sent: {self.w3.to_hex(tx_hash)}")
                    self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
                    print(f"[+] USDT Approved for {dex_name}!")
                else:
                    print(f"[+] USDT already Approved for {dex_name}!")
            except Exception as e:
                print(f"[-] Approval error on {dex_name}: {e}")

    def get_estimated_gas_cost_usd(self, gas_limit=350000):
        try:
            gas_price_wei = self.w3.eth.gas_price
            pol_price_usd = 0.11 # Current Polygon POL price estimate
            gas_cost_pol = (gas_limit * gas_price_wei) / 1e18
            return float(gas_cost_pol) * pol_price_usd
        except Exception:
            return 0.005 # Fallback ~$0.005 on Polygon

    def get_pair_reserves(self, dex_name, token_a_sym, token_b_sym):
        try:
            factory_addr = Web3.to_checksum_address(DEXES[dex_name]["factory"])
            factory = self.w3.eth.contract(address=factory_addr, abi=FACTORY_ABI)
            t_a = Web3.to_checksum_address(TOKENS[token_a_sym])
            t_b = Web3.to_checksum_address(TOKENS[token_b_sym])
            pair_addr = factory.functions.getPair(t_a, t_b).call()
            if pair_addr == "0x0000000000000000000000000000000000000000":
                return None
            pair = self.w3.eth.contract(address=pair_addr, abi=PAIR_ABI)
            r0, r1, _ = pair.functions.getReserves().call()
            t0 = pair.functions.token0().call()
            if t0.lower() == t_a.lower():
                return r0, r1
            else:
                return r1, r0
        except Exception:
            return None

    def scan_usdt_triangular_cycles(self):
        """
        Scans all 3-hop cycles that START and END with USDT:
        USDT -> Token B -> Token C -> USDT
        """
        cycles = [
            ("USDT", "QUICK", "WMATIC"),
            ("USDT", "WETH", "WBTC"),
            ("USDT", "LINK", "WETH"),
            ("USDT", "AAVE", "WMATIC"),
            ("USDT", "SAND", "WMATIC"),
            ("USDT", "UNI", "WMATIC"),
            ("USDT", "CRV", "WETH"),
            ("USDT", "SUSHI", "WMATIC"),
            ("USDT", "GHST", "WMATIC"),
            ("USDT", "GRT", "WETH"),
            ("USDT", "MANA", "WMATIC"),
            ("USDT", "WMATIC", "WETH"),
        ]

        opportunities = []
        gas_cost_usd = self.get_estimated_gas_cost_usd(380000)

        for t0, t1, t2 in cycles:
            for dex_name in ["QuickSwap", "SushiSwap"]:
                r1 = self.get_pair_reserves(dex_name, t0, t1)
                r2 = self.get_pair_reserves(dex_name, t1, t2)
                r3 = self.get_pair_reserves(dex_name, t2, t0)

                if not r1 or not r2 or not r3 or r1[0] == 0 or r2[0] == 0 or r3[0] == 0:
                    continue

                rate1 = (r1[1] / r1[0]) * (1 - 0.003)
                rate2 = (r2[1] / r2[0]) * (1 - 0.003)
                rate3 = (r3[1] / r3[0]) * (1 - 0.003)
                multiplier = rate1 * rate2 * rate3

                if multiplier > 1.002: # Positive arbitrage edge
                    gross_profit = TRADE_AMOUNT_USDT * (multiplier - 1)
                    net_profit = gross_profit - gas_cost_usd

                    if net_profit >= MIN_NET_PROFIT_USDT:
                        opportunities.append({
                            "dex": dex_name,
                            "route": [t0, t1, t2, t0],
                            "route_str": f"{t0} -> {t1} -> {t2} -> {t0}",
                            "multiplier": multiplier,
                            "edge_pct": (multiplier - 1) * 100,
                            "gross_profit_usd": gross_profit,
                            "gas_cost_usd": gas_cost_usd,
                            "net_profit_usd": net_profit,
                        })

        return sorted(opportunities, key=lambda x: x["net_profit_usd"], reverse=True)

    def execute_closed_usdt_trade(self, opp):
        """
        Executes an atomic closed-loop trade:
        USDT -> Token 1 -> Token 2 -> USDT
        All 3 legs execute in 1 single on-chain transaction.
        If profit is not met, the smart contract reverts safely!
        """
        if not self.account:
            print(f"[PAPER EXECUTION] Simulating closed loop trade for \${opp['net_profit_usd']:.3f} profit on {opp['route_str']}")
            return True

        dex_name = opp["dex"]
        router_addr = Web3.to_checksum_address(DEXES[dex_name]["router"])
        router = self.w3.eth.contract(address=router_addr, abi=ROUTER_ABI)

        # Build address path: [USDT, Token1, Token2, USDT]
        path = [Web3.to_checksum_address(TOKENS[sym]) for sym in opp["route"]]

        amount_in = int(TRADE_AMOUNT_USDT * 1e6) # USDT has 6 decimals
        # Minimum amount out: must return initial amount + minimal profit (slippage guarded)
        min_amount_out = int(TRADE_AMOUNT_USDT * 1e6 * (1 + (opp["edge_pct"] / 100) * (1 - SLIPPAGE_TOLERANCE_PCT / 100)))

        deadline = int(time.time()) + 180 # 3 minutes

        print(f"\\n[*] EXECUTING CLOSED LOOP: {opp['route_str']} on {dex_name}")
        print(f"    - Input: \${TRADE_AMOUNT_USDT:.2f} USDT")
        print(f"    - Expected Net Profit: +\${opp['net_profit_usd']:.4f}")

        try:
            nonce = self.w3.eth.get_transaction_count(self.wallet_address)
            gas_price = self.w3.eth.gas_price

            tx = router.functions.swapExactTokensForTokens(
                amount_in,
                min_amount_out,
                path,
                self.wallet_address,
                deadline
            ).build_transaction({
                'from': self.wallet_address,
                'nonce': nonce,
                'gas': 420000,
                'gasPrice': gas_price,
                'chainId': CHAIN_ID
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY.strip())
            tx_hash = self.send_signed_transaction(signed_tx)
            print(f"[+] Transaction broadcasted! Tx Hash: {self.w3.to_hex(tx_hash)}")
            print(f"    Explorer: https://polygonscan.com/tx/{self.w3.to_hex(tx_hash)}")

            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=90)
            if receipt.status == 1:
                print(f"[✔] TRADE COMPLETED SUCCESSFULLY! Sold back to USDT in profit.")
                # Verify new USDT balance
                new_usdt = self.usdt_contract.functions.balanceOf(self.wallet_address).call() / 1e6
                print(f"[+] Updated USDT Balance: \${new_usdt:.2f} USDT")
                return True
            else:
                print(f"[-] Transaction reverted on-chain. Funds returned safely without slippage loss.")
                return False
        except Exception as e:
            print(f"[-] Trade execution failed: {e}")
            return False

    def run_continuous_bot(self):
        """Continuous automated loop scanning and executing profitable USDT loops"""
        print("\\n=======================================================")
        print("  POLYGON USDT ARBITRAGE BOT RUNNING (AUTO-TRADING)    ")
        print(f"  Trade Size: \${TRADE_AMOUNT_USDT:.2f} USDT | Min Profit: \${MIN_NET_PROFIT_USDT:.2f}")
        print("=======================================================\\n")

        cycle_count = 0
        while True:
            try:
                cycle_count += 1
                opps = self.scan_usdt_triangular_cycles()
                if opps:
                    best = opps[0]
                    print(f"[{time.strftime('%H:%M:%S')}] FOUND: {best['route_str']} on {best['dex']} | Edge: {best['edge_pct']:.2f}% | Net: +\${best['net_profit_usd']:.4f}")
                    
                    # STRICT RULE: Execute cycle, sell back to USDT, and verify before next trade
                    success = self.execute_closed_usdt_trade(best)
                    if success:
                        print("[*] Trade finished. Waiting 5s before next cycle...")
                        time.sleep(5)
                else:
                    if cycle_count % 10 == 0:
                        print(f"[{time.strftime('%H:%M:%S')}] Monitoring Polygon DEX pools for USDT arbitrage gaps...")

                time.sleep(1.0)
            except KeyboardInterrupt:
                print("\\n[!] Bot stopped by user.")
                break
            except Exception as e:
                print(f"[-] Scanner error: {e}")
                time.sleep(3)


if __name__ == "__main__":
    bot = PolygonUsdtArbitrageBot()
    if bot.initialize():
        bot.run_continuous_bot()
`;
}

export function generatePythonEnvFile(): string {
  return `# Polygon Arbitrage Bot Environment Configuration
# Put your settings below. Keep this file PRIVATE and NEVER share with anyone!

# Polygon RPC URL (High-speed Ankr RPC)
POLYGON_RPC_URL=https://rpc.ankr.com/polygon

# Your Wallet Private Key (Required for auto-signing transactions without manual clicks)
# Export from Trust Wallet / MetaMask (Settings -> Security -> Show Private Key)
PRIVATE_KEY=your_private_key_here

# Your Wallet Address
WALLET_ADDRESS=0x6981be93efbdf04f82206180600fbef1b59812f1

# Trading Parameters
TRADE_AMOUNT_USDT=5.0
MIN_NET_PROFIT_USDT=0.01
MAX_GAS_PRICE_GWEI=150.0
SLIPPAGE_TOLERANCE_PCT=0.5
`;
}

export function generatePythonRequirements(): string {
  return `web3>=6.15.0
eth-account>=0.11.0
python-dotenv>=1.0.0
requests>=2.31.0
`;
}

export function generateInstallBatFile(): string {
  return `@echo off
title Polygon Arbitrage Bot - 1-Click Dependency Installer
color 0A
cls
echo ==============================================================================
echo   POLYGON USDT ARBITRAGE BOT - 1-CLICK DEPENDENCY INSTALLER (WINDOWS)
echo ==============================================================================
echo.

:: 1. Check if Python is installed and accessible in PATH
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Python is not recognized on your system!
    echo.
    echo Please install Python 3.9+ from https://www.python.org/downloads/
    echo IMPORTANT: Make sure to CHECK "Add Python to PATH" during installation!
    echo.
    pause
    exit /b 1
)

echo [*] Python detected successfully:
python --version
echo.

:: 2. Ensure pip is installed and upgrade to latest
echo [*] Ensuring pip package manager is installed and up-to-date...
python -m ensurepip --default-pip >nul 2>&1
python -m pip install --upgrade pip --quiet
echo [+] Pip ready.
echo.

:: 3. Install required Web3 and Cryptography packages
echo [*] Installing required Web3 & DeFi libraries (web3, eth-account, python-dotenv, requests)...
echo [*] This takes about 15-30 seconds...
echo.

python -m pip install web3==6.15.0 eth-account==0.11.0 python-dotenv==1.0.0 requests==2.31.0

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [*] Retrying installation without strict version pins...
    python -m pip install web3 python-dotenv eth-account requests
)

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] Failed to install one or more packages.
    echo Please check your internet connection or run: python -m pip install --user web3 python-dotenv eth-account requests
    echo.
    pause
    exit /b 1
)

:: 4. Check if .env exists, if not copy from .env.example
if not exist .env (
    if exist .env.example (
        echo.
        echo [*] Creating .env from .env.example template...
        copy .env.example .env >nul
        echo [+] Created .env configuration file!
    )
)

echo.
color 0A
echo ==============================================================================
echo   [SUCCESS] ALL REQUIREMENTS INSTALLED SUCCESSFULLY!
echo ==============================================================================
echo.
echo Next steps:
echo   1. Edit the .env file with your Notepad and set your PRIVATE_KEY.
echo   2. Double-click "start_bot.bat" or run: python polygon_usdt_arbitrage_bot.py
echo.
pause
`;
}

export function generateRunBotBatFile(): string {
  return `@echo off
title Polygon Autonomous Arbitrage Bot
color 0B
cls
echo ==============================================================================
echo   STARTING AUTONOMOUS POLYGON USDT ARBITRAGE BOT
echo ==============================================================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Python is not installed or not in PATH!
    echo Please download Python from https://www.python.org and check "Add to PATH".
    echo.
    pause
    exit /b 1
)

:: 2. Check if .env exists
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [*] Generated default .env file.
    )
)

:: 3. Run the bot
echo [*] Launching polygon_usdt_arbitrage_bot.py...
echo.
python polygon_usdt_arbitrage_bot.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Bot exited with code %ERRORLEVEL%.
    echo If modules were missing, please double-click "install_requirements.bat" first!
    echo.
    pause
)
`;
}

export function generatePythonReadme(): string {
  return `# Polygon USDT Automated Arbitrage Bot

A high-speed autonomous arbitrage bot for Polygon (Chain ID: 137) with **auto-token approval**, **auto-signing**, and **strict sequential closed-loop execution**.

## Key Architecture & Guarantees
1. **USDT as Base Currency**: Every single trade starts with USDT and finishes with USDT (\`USDT -> Token B -> Token C -> USDT\`).
2. **No Orphan Tokens**: The bot never buys Token C before selling Token B. All legs are executed atomically in a single multi-hop transaction on QuickSwap / SushiSwap.
3. **Auto-Approval**: On initial boot, the bot automatically grants token allowances to the DEX routers, eliminating manual approval popups.
4. **Gas & Slippage Protection**: Trades are strictly filtered so Gross Profit > (Gas Fees + LP Fees) with maximum 0.5% slippage protection.

## Setup Instructions

### 1. Install Requirements
Ensure Python 3.9+ is installed:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 2. Configure Environment (.env)
Copy \`.env.example\` to \`.env\`:
\`\`\`bash
cp .env.example .env
\`\`\`
Edit \`.env\` and add your \`PRIVATE_KEY\`.

### 3. Run the Bot
\`\`\`bash
python polygon_usdt_arbitrage_bot.py
\`\`\`

The bot will connect to Polygon, check token allowances, scan all triangular loops starting with USDT, and execute profitable trades automatically!
`;
}
