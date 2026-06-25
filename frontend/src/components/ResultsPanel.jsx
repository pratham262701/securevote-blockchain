import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { BarChart3, Trophy, Users, Vote, Download, RefreshCw, Crown } from 'lucide-react';

const ResultsPanel = ({ web3, account, contract, votingPeriod }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalVotes, setTotalVotes] = useState(0);
  const [winner, setWinner] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!contract) return;

    let mounted = true;
    async function init() {
      await loadResults();

      // polling fallback (works for HTTP providers like Ganache CLI)
      const intervalId = setInterval(() => {
        if (mounted) loadResults();
      }, 15000); // 15s

      // client-side update listener (fires immediately after local vote)
      const onClientVote = () => {
        loadResults();
      };
      window.addEventListener('evote:vote_cast', onClientVote);

      // try subscribing to on-chain VoteCast events (works if provider supports WS)
      try {
        if (contract.events && typeof contract.events.VoteCast === 'function') {
          subscriptionRef.current = contract.events.VoteCast({ fromBlock: 'latest' })
            .on('data', (evt) => {
              console.debug('VoteCast event received:', evt);
              loadResults();
            })
            .on('error', (err) => {
              console.warn('VoteCast subscription error:', err);
            });
        }
      } catch (err) {
        console.warn('Event subscription not available:', err);
      }

      // cleanup
      return () => {
        mounted = false;
        clearInterval(intervalId);
        window.removeEventListener('evote:vote_cast', onClientVote);
        if (subscriptionRef.current && typeof subscriptionRef.current.unsubscribe === 'function') {
          try { subscriptionRef.current.unsubscribe(); } catch (e) { /* ignore */ }
        }
      };
    }

    const cleanupPromise = init();

    // return cleanup function for useEffect
    return () => {
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract]);

  const loadResults = async () => {
    setLoading(true);
    setError('');

    try {
      const rawCount = await contract.methods.candidateCount().call();
      const candidateCount = parseInt(rawCount.toString(), 10);
      const candidateList = [];
      let total = 0;

      for (let i = 1; i <= candidateCount; i++) {
        const candidate = await contract.methods.candidates(i).call();
        const votes = parseInt(candidate.votes.toString(), 10);
        candidateList.push({
          id: candidate.id.toString(),
          name: candidate.name,
          votes: votes
        });
        total += votes;
      }

      // Sort candidates by votes (descending)
      candidateList.sort((a, b) => b.votes - a.votes);

      setCandidates(candidateList);
      setTotalVotes(total);
      setWinner(candidateList.length > 0 ? candidateList[0] : null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading results:', err);
      setError('Failed to load election results');
    }

    setLoading(false);
  };

  const getVotePercentage = (votes) => {
    return totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  };

  const generateReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      totalVotes,
      candidates: candidates.map(candidate => ({
        ...candidate,
        percentage: getVotePercentage(candidate.votes)
      })),
      winner: winner,
      votingPeriod: {
        started: votingPeriod?.started,
        ended: votingPeriod?.ended
      }
    };

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `election-results-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Election Results
              </CardTitle>
              <CardDescription>
                {votingPeriod?.ended ? 'Final Results' : 'Live Results'} •
                Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadResults}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateReport}
                disabled={candidates.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{totalVotes}</div>
              <div className="text-sm text-gray-600 flex items-center justify-center">
                <Vote className="w-4 h-4 mr-1" />
                Total Votes
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{candidates.length}</div>
              <div className="text-sm text-gray-600 flex items-center justify-center">
                <Users className="w-4 h-4 mr-1" />
                Candidates
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {winner ? getVotePercentage(winner.votes) : 0}%
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center">
                <Trophy className="w-4 h-4 mr-1" />
                Leading Vote Share
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* No Results Message */}
      {!loading && candidates.length === 0 && (
        <Alert>
          <AlertDescription>No candidates or votes available yet.</AlertDescription>
        </Alert>
      )}

      {/* Winner Announcement */}
      {winner && votingPeriod?.ended && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <Crown className="w-5 h-5 mr-2" />
              Election Winner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-800 mb-2">{winner.name}</div>
              <div className="text-lg text-yellow-700">
                {winner.votes} votes ({getVotePercentage(winner.votes)}%)
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Vote Distribution</CardTitle>
          <CardDescription>
            Breakdown of votes by candidate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading results...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No voting data available
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate, index) => (
                <div key={candidate.id}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="font-medium">{candidate.name}</div>
                      {index === 0 && winner && votingPeriod?.ended && (
                        <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                          <Crown className="w-3 h-3 mr-1" />
                          Winner
                        </Badge>
                      )}
                      {index === 0 && !votingPeriod?.ended && (
                        <Badge variant="secondary">Leading</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{candidate.votes}</div>
                      <div className="text-sm text-gray-600">
                        {getVotePercentage(candidate.votes)}%
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={getVotePercentage(candidate.votes)}
                    className="h-3"
                  />
                  {index < candidates.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
          <CardDescription>
            Complete breakdown of election statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Rank</th>
                    <th className="text-left py-2">Candidate</th>
                    <th className="text-right py-2">Votes</th>
                    <th className="text-right py-2">Percentage</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate, index) => (
                    <tr key={candidate.id} className="border-b">
                      <td className="py-3">
                        <div className="flex items-center">
                          {index + 1}
                          {index === 0 && (
                            <Trophy className="w-4 h-4 ml-2 text-yellow-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 font-medium">{candidate.name}</td>
                      <td className="py-3 text-right">{candidate.votes}</td>
                      <td className="py-3 text-right">{getVotePercentage(candidate.votes)}%</td>
                      <td className="py-3 text-center">
                        {index === 0 && winner && votingPeriod?.ended ? (
                          <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                            Winner
                          </Badge>
                        ) : index === 0 && !votingPeriod?.ended ? (
                          <Badge variant="secondary">Leading</Badge>
                        ) : (
                          <Badge variant="outline">—</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Election Status */}
      <Card>
        <CardHeader>
          <CardTitle>Election Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Election Status</div>
              <div className="font-medium">
                {!votingPeriod?.started ? 'Not Started' :
                  votingPeriod?.ended ? 'Completed' : 'In Progress'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Results Type</div>
              <div className="font-medium">
                {votingPeriod?.ended ? 'Final Results' : 'Live Results'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Participation</div>
              <div className="font-medium">{totalVotes} votes cast</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Last Updated</div>
              <div className="font-medium">
                {lastUpdated ? lastUpdated.toLocaleString() : 'Never'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsPanel;
