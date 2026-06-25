// src/App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Web3 from 'web3';
import VotingContract from './abi/Voting.json';
import AdminPanel from './components/AdminPanel';
import VoterPanel from './components/VoterPanel';
import ResultsPanel from './components/ResultsPanel';
import AuthFlow from './components/AuthFlow';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { Wallet, Vote, BarChart3, Settings, Shield, Lock } from 'lucide-react';

const CONNECT_FLAG = 'evote_connected';

const App = () => {
  const { t } = useTranslation();
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [votingPeriod, setVotingPeriod] = useState({ started: false, ended: false });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthFlow, setShowAuthFlow] = useState(false);

  // refs to handlers so we can remove them
  const accountsChangedHandlerRef = useRef(null);
  const chainChangedHandlerRef = useRef(null);

  // ---- initWeb3 (useCallback so listeners can reference logout safely) ----
  const initWeb3 = useCallback(async () => {
    try {
      if (!window.ethereum) {
        setError('Please install MetaMask');
        return;
      }

      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);

      // ask for accounts
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3Instance.eth.getAccounts();
      const currentAccount = accounts[0] || '';
      setAccount(currentAccount);

      // Load contract if deployed on current network
      const networkId = await web3Instance.eth.net.getId();
      const deployedNetwork = VotingContract.networks[networkId];
      if (deployedNetwork) {
        const contractInstance = new web3Instance.eth.Contract(VotingContract.abi, deployedNetwork.address);
        setContract(contractInstance);

        // is admin?
        try {
          const admin = await contractInstance.methods.admin().call();
          const adminStatus = admin.toLowerCase() === (currentAccount || '').toLowerCase();
          setIsAdmin(adminStatus);
          console.log('Admin check:', { admin, currentAccount, isAdmin: adminStatus });
        } catch (e) {
          console.warn('could not read admin', e);
          setIsAdmin(false);
        }

        // voting period
        await checkVotingPeriod(contractInstance);
      } else {
        setError('Contract not deployed on this network');
      }

      // attach wallet listeners
      const onAccountsChanged = (accounts) => {
        // if user disconnects accounts array could be empty
        if (!accounts || accounts.length === 0) {
          // user disconnected from MetaMask: perform logout-like cleanup
          handleLogoutCleanup();
          return;
        }
        setAccount(accounts[0]);
      };
      const onChainChanged = (_chainId) => {
        // just reload UI so provider/contract picks up new chain
        window.location.reload();
      };

      // store refs for removal later
      accountsChangedHandlerRef.current = onAccountsChanged;
      chainChangedHandlerRef.current = onChainChanged;

      if (window.ethereum && window.ethereum.on) {
        window.ethereum.on('accountsChanged', onAccountsChanged);
        window.ethereum.on('chainChanged', onChainChanged);
      }
    } catch (err) {
      console.error('Error in initWeb3', err);
      setError('Failed to connect to blockchain');
    }
  }, []);

  // Check voting time windows
  const checkVotingPeriod = async (contractInstance) => {
    try {
      const startTime = await contractInstance.methods.startTime().call();
      const endTime = await contractInstance.methods.endTime().call();
      const currentTime = Math.floor(Date.now() / 1000);
      setVotingPeriod({
        started: currentTime >= parseInt(startTime.toString(), 10),
        ended: currentTime > parseInt(endTime.toString(), 10)
      });
    } catch (err) {
      console.warn('checkVotingPeriod error', err);
    }
  };

  // connect button handler — sets local flag and initializes web3
  const connectWallet = async () => {
    setLoading(true);
    setError('');
    try {
      localStorage.setItem(CONNECT_FLAG, 'true'); // mark user wants auto-connect
      await initWeb3();
    } catch (err) {
      console.error('connectWallet err', err);
      setError('Failed to connect wallet');
    }
    setLoading(false);
  };

  // cleanup function used by logout and account-disconnect
  const handleLogoutCleanup = useCallback(() => {
    try {
      // remove ethereum listeners (must pass same handler references)
      if (window.ethereum && window.ethereum.removeListener) {
        if (accountsChangedHandlerRef.current) {
          window.ethereum.removeListener('accountsChanged', accountsChangedHandlerRef.current);
        }
        if (chainChangedHandlerRef.current) {
          window.ethereum.removeListener('chainChanged', chainChangedHandlerRef.current);
        }
      }
    } catch (e) {
      console.warn('error removing listeners', e);
    }

    // clear state
    setContract(null);
    setAccount('');
    setIsAdmin(false);
    setWeb3(null);
    setError('');
    setVotingPeriod({ started: false, ended: false });

    // custom app events cleanup
    try {
      window.dispatchEvent(new CustomEvent('evote:logout', { detail: {} }));
      window.removeEventListener('evote:vote_cast', () => {}); // harmless
    } catch (e) {}
  }, []);

  // logout exposed to UI
  const logout = async () => {
    try {
      // remove connect flag so app won't auto-reconnect on reload
      localStorage.removeItem(CONNECT_FLAG);

      // optionally remove stored vote receipts for this account
      if (account) localStorage.removeItem(`vote_${account}`);
      localStorage.removeItem('auth_token');

      // cleanup listeners + state
      handleLogoutCleanup();

      // Reset authentication state
      setIsAuthenticated(false);
      setShowAuthFlow(false);

      // show connect UI (no reload)
    } catch (err) {
      console.warn('logout failed', err);
    }
  };

  // disconnect wallet completely
  const disconnectWallet = async () => {
    try {
      // Clear all local storage
      localStorage.removeItem(CONNECT_FLAG);
      localStorage.removeItem('auth_token');
      if (account) localStorage.removeItem(`vote_${account}`);

      // Cleanup and reset all state
      handleLogoutCleanup();
      setIsAuthenticated(false);
      setShowAuthFlow(false);

      // Reload page to fully reset
      window.location.reload();
    } catch (err) {
      console.warn('disconnect failed', err);
    }
  };

  // auto-init only if user previously pressed Connect (CONNECT_FLAG)
  useEffect(() => {
    const shouldAuto = localStorage.getItem(CONNECT_FLAG) === 'true';
    if (shouldAuto) {
      initWeb3();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // make sure to clean up listeners when unmounting
  useEffect(() => {
    return () => {
      try {
        if (window.ethereum && window.ethereum.removeListener) {
          if (accountsChangedHandlerRef.current) {
            window.ethereum.removeListener('accountsChanged', accountsChangedHandlerRef.current);
          }
          if (chainChangedHandlerRef.current) {
            window.ethereum.removeListener('chainChanged', chainChangedHandlerRef.current);
          }
        }
      } catch (e) {}
    };
  }, []);

  // UI when not connected
  if (!web3 || !account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Intelligent Blockchain-Based E-Voting with Voice & Sign Authentication</CardTitle>
            <CardDescription>
              Connect your wallet to participate in blockchain-based voting
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={connectWallet}
              disabled={loading}
              className="w-full"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {loading ? t('common.loading') : t('auth.connectWallet')}
            </Button>
            {/* Clear saved connection */}
            <div className="mt-3 text-sm text-center text-gray-500">
              <button
                onClick={() => {
                  localStorage.removeItem(CONNECT_FLAG);
                  localStorage.removeItem('auth_token');
                  alert('Auto-reconnect disabled. Refresh to connect manually.');
                }}
                className="underline hover:text-gray-700"
              >
                Clear saved connection
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authentication handler
  const handleAuthSuccess = (authResult) => {
    console.log('Authentication successful:', authResult);
    setIsAuthenticated(true);
    setShowAuthFlow(false);
    // Store auth token if provided
    if (authResult.token) {
      localStorage.setItem('auth_token', authResult.token);
    }
    // Log admin status for debugging
    console.log('User authenticated. Admin status:', isAdmin);
  };

  // Check if user needs authentication
  const needsAuth = web3 && account && !isAuthenticated;

  // Show authentication flow if wallet connected but not authenticated
  if (needsAuth || showAuthFlow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">Intelligent Blockchain-Based E-Voting with Voice & Sign Authentication</h1>
              </div>
              <div className="flex items-center space-x-4">
                <LanguageSwitcher />
                <div className="text-sm text-gray-600">
                  Connected: {account.slice(0, 6)}...{account.slice(-4)}
                </div>
                {isAdmin && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Admin Account
                  </span>
                )}
                <Lock className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-yellow-600 font-medium">Authentication Required</span>

                {/* Disconnect button */}
                <Button
                  onClick={disconnectWallet}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 border-red-300"
                >
                  {t('auth.disconnectWallet')}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AuthFlow
            walletAddress={account}
            onAuthSuccess={handleAuthSuccess}
          />
        </main>
      </div>
    );
  }

  // Main logged-in UI (after authentication)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Intelligent Blockchain-Based E-Voting with Voice & Sign Authentication</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <div className="text-sm text-gray-600">
                Connected: {account.slice(0, 6)}...{account.slice(-4)}
              </div>
              {isAuthenticated && (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  ✓ Authenticated
                </span>
              )}
              {isAdmin && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Admin
                </span>
              )}

              {/* Logout button */}
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="text-gray-800 hover:bg-gray-100"
                title="Logout (clears session, keeps wallet connected)"
              >
                {t('auth.logout')}
              </Button>

              {/* Disconnect Wallet button */}
              <Button
                onClick={disconnectWallet}
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                title="Disconnect wallet completely"
              >
                {t('auth.disconnectWallet')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue={isAdmin ? "admin" : "vote"} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                {t('admin.adminPanel')}
              </TabsTrigger>
            )}
            <TabsTrigger value="vote" className="flex items-center">
              <Vote className="w-4 h-4 mr-2" />
              {t('voting.castVote')}
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              {t('admin.results')}
            </TabsTrigger>
          </TabsList>

          {isAdmin && (
            <TabsContent value="admin">
              <AdminPanel
                web3={web3}
                account={account}
                contract={contract}
                votingPeriod={votingPeriod}
                onVotingPeriodUpdate={() => checkVotingPeriod(contract)}
              />
            </TabsContent>
          )}

          <TabsContent value="vote">
            <VoterPanel
              web3={web3}
              account={account}
              contract={contract}
              votingPeriod={votingPeriod}
            />
          </TabsContent>

          <TabsContent value="results">
            <ResultsPanel
              web3={web3}
              account={account}
              contract={contract}
              votingPeriod={votingPeriod}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default App;
