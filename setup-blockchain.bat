@echo off
echo ========================================
echo  EchoLedger Blockchain Setup
echo ========================================

:: Step 1: Start Hardhat node in new window
echo [1/4] Starting Hardhat node...
start "Hardhat Node" cmd /k "cd /d c:\Users\adity\echoledger\blockchain && npx hardhat node"

:: Wait for node to be ready
echo Waiting for Hardhat node to start...
timeout /t 5 /nobreak >nul

:: Step 2: Deploy SimpleDispute
echo [2/4] Deploying SimpleDispute...
cd /d c:\Users\adity\echoledger\blockchain
call npx hardhat ignition deploy ignition/modules/SimpleDispute.ts --network localhost --reset 2>&1
if %errorlevel% neq 0 (
  echo ERROR: SimpleDispute deployment failed.
  pause
  exit /b 1
)

:: Step 3: Deploy DecisionHashRegistry
echo [3/4] Deploying DecisionHashRegistry...
call npx hardhat ignition deploy ignition/modules/DecisionHashRegistry.ts --network localhost 2>&1
if %errorlevel% neq 0 (
  echo ERROR: DecisionHashRegistry deployment failed.
  pause
  exit /b 1
)

:: Step 4: Extract addresses and update .env files
echo [4/4] Updating .env files with deployed addresses...
cd /d c:\Users\adity\echoledger
call node update-env.cjs

echo.
echo ========================================
echo  Starting Backend and Frontend...
echo ========================================
start "Backend" cmd /k "cd /d c:\Users\adity\echoledger\backend && node server.js"
timeout /t 2 /nobreak >nul
start "Frontend" cmd /k "cd /d c:\Users\adity\echoledger\frontend && npm run dev"

echo.
echo ========================================
echo  All done! 
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:5000
echo  Hardhat:  http://127.0.0.1:8545
echo ========================================
echo.
echo MetaMask test account:
echo   Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
echo   Key:     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
echo.
pause
