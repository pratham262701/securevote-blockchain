import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAllVotes, getVoteStats } from '../api/backend';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UserPlus, Users, Vote, CheckCircle, XCircle, Clock, Edit, Save, X } from 'lucide-react';

const AdminPanel = ({ web3, account, contract, votingPeriod, onVotingPeriodUpdate }) => {
  const [candidates, setCandidates] = useState([]);
  const [newCandidateName, setNewCandidateName] = useState('');
  const [voterAddress, setVoterAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalVoters: 0,
    totalVotes: 0,
    candidateCount: 0
  });
  const [editingCandidateId, setEditingCandidateId] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [votes, setVotes] = useState([]);
  const [voteStats, setVoteStats] = useState(null);
  const [votesLoading, setVotesLoading] = useState(false);

  useEffect(() => {
    if (contract) {
      loadCandidates();
      loadStats();
      loadVotes();
      loadVoteStats();
    }
  }, [contract]);

  const loadVotes = async () => {
    setVotesLoading(true);
    try {
      const data = await getAllVotes(1, 100);
      setVotes(data.votes || []);
    } catch (err) {
      console.error('Error loading votes:', err);
    }
    setVotesLoading(false);
  };

  const loadVoteStats = async () => {
    try {
      const data = await getVoteStats();
      setVoteStats(data);
    } catch (err) {
      console.error('Error loading vote stats:', err);
    }
  };

  const loadCandidates = async () => {
    try {
      const candidateCount = await contract.methods.candidateCount().call();
      const candidateList = [];
      
      for (let i = 1; i <= parseInt(candidateCount); i++) {
        const candidate = await contract.methods.candidates(i).call();
        candidateList.push({
          id: candidate.id.toString(),
          name: candidate.name,
          votes: candidate.votes.toString()
        });
      }
      
      setCandidates(candidateList);
    } catch (error) {
      console.error('Error loading candidates:', error);
      setError('Failed to load candidates');
    }
  };

  const loadStats = async () => {
    try {
      const candidateCount = await contract.methods.candidateCount().call();
      // Calculate total votes from candidates
      const totalVotes = candidates.reduce((sum, candidate) => sum + parseInt(candidate.votes), 0);
      
      setStats({
        totalVoters: 0, // Would need to be tracked separately
        totalVotes,
        candidateCount: parseInt(candidateCount)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const addCandidate = async () => {
    if (!newCandidateName.trim()) {
      setError('Please enter candidate name');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await contract.methods.addCandidate(newCandidateName).send({ 
        from: account,
        gas: '300000' // Use string for gas limit
      });
      setSuccess('Candidate added successfully');
      setNewCandidateName('');
      await loadCandidates();
      await loadStats();
    } catch (error) {
      console.error('Error adding candidate:', error);
      setError('Failed to add candidate');
    }
    
    setLoading(false);
  };

  const registerVoter = async () => {
    if (!web3.utils.isAddress(voterAddress)) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await contract.methods.registerVoter(voterAddress).send({ 
        from: account,
        gas: '300000' // Use string for gas limit
      });
      setSuccess('Voter registered successfully');
      setVoterAddress('');
      await loadStats();
    } catch (error) {
      console.error('Error registering voter:', error);
      setError('Failed to register voter');
    }
    
    setLoading(false);
  };

  const finalizeElection = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await contract.methods.finalize().send({
        from: account,
        gas: '300000' // Use string for gas limit
      });
      setSuccess('Election finalized successfully');
      onVotingPeriodUpdate();
    } catch (error) {
      console.error('Error finalizing election:', error);
      setError('Failed to finalize election');
    }

    setLoading(false);
  };

  const startEditingCandidate = (candidate) => {
    setEditingCandidateId(candidate.id);
    setEditedName(candidate.name);
  };

  const cancelEditing = () => {
    setEditingCandidateId(null);
    setEditedName('');
  };

  const updateCandidateName = async (candidateId) => {
    if (!editedName.trim()) {
      setError('Candidate name cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await contract.methods.updateCandidateName(candidateId, editedName).send({
        from: account,
        gas: '300000'
      });
      setSuccess('Candidate name updated successfully');
      setEditingCandidateId(null);
      setEditedName('');
      await loadCandidates();
    } catch (error) {
      console.error('Error updating candidate name:', error);
      setError('Failed to update candidate name');
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Vote className="w-5 h-5 mr-2" />
            Election Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.candidateCount}</div>
              <div className="text-sm text-gray-600">Candidates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalVotes}</div>
              <div className="text-sm text-gray-600">Total Votes</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center">
                {!votingPeriod.started ? (
                  <Badge variant="secondary" className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Not Started
                  </Badge>
                ) : votingPeriod.ended ? (
                  <Badge variant="destructive" className="flex items-center">
                    <XCircle className="w-3 h-3 mr-1" />
                    Ended
                  </Badge>
                ) : (
                  <Badge variant="default" className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">Voting Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Candidate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="w-5 h-5 mr-2" />
              Add Candidate
            </CardTitle>
            <CardDescription>
              Register new candidates for the election
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="candidateName">Candidate Name</Label>
              <Input
                id="candidateName"
                value={newCandidateName}
                onChange={(e) => setNewCandidateName(e.target.value)}
                placeholder="Enter candidate name"
                disabled={loading}
              />
            </div>
            <Button 
              onClick={addCandidate} 
              disabled={loading || !newCandidateName.trim()}
              className="w-full"
            >
              {loading ? 'Adding...' : 'Add Candidate'}
            </Button>
          </CardContent>
        </Card>

        {/* Register Voter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Register Voter
            </CardTitle>
            <CardDescription>
              Register eligible voters by their Ethereum address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="voterAddress">Voter Address</Label>
              <Input
                id="voterAddress"
                value={voterAddress}
                onChange={(e) => setVoterAddress(e.target.value)}
                placeholder="0x..."
                disabled={loading}
              />
            </div>
            <Button 
              onClick={registerVoter} 
              disabled={loading || !voterAddress}
              className="w-full"
            >
              {loading ? 'Registering...' : 'Register Voter'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current Candidates */}
      <Card>
        <CardHeader>
          <CardTitle>Current Candidates</CardTitle>
          <CardDescription>
            List of all registered candidates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No candidates registered yet
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((candidate, index) => (
                <div key={candidate.id}>
                  <div className="flex justify-between items-center py-3">
                    <div className="flex-1">
                      {editingCandidateId === candidate.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            placeholder="Enter new name"
                            className="max-w-xs"
                          />
                          <Button
                            size="sm"
                            onClick={() => updateCandidateName(candidate.id)}
                            disabled={loading}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            disabled={loading}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{candidate.name}</div>
                            <div className="text-sm text-gray-600">ID: {candidate.id}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditingCandidate(candidate)}
                            disabled={loading}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{candidate.votes}</div>
                      <div className="text-sm text-gray-600">votes</div>
                    </div>
                  </div>
                  {index < candidates.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finalize Election */}
      {votingPeriod.ended && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Finalize Election</CardTitle>
            <CardDescription>
              End the election and make results final. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={finalizeElection}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? 'Finalizing...' : 'Finalize Election'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Votes Display Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All Votes Cast</CardTitle>
          <CardDescription>
            Complete voting records with voter details, timestamps, and voting method
          </CardDescription>
        </CardHeader>
        <CardContent>
          {voteStats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">Total Votes</div>
                <div className="text-2xl font-bold text-blue-600">{voteStats.total_votes}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600">Average Confidence</div>
                <div className="text-2xl font-bold text-green-600">
                  {(voteStats.average_confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600">Voice Votes</div>
                <div className="text-2xl font-bold text-purple-600">
                  {voteStats.votes_by_method?.voice || 0}
                </div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-sm text-gray-600">Sign Language</div>
                <div className="text-2xl font-bold text-orange-600">
                  {voteStats.votes_by_method?.sign_language || 0}
                </div>
              </div>
            </div>
          )}

          {votesLoading ? (
            <div className="text-center py-8">Loading votes...</div>
          ) : votes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No votes cast yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voter</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {votes.map((vote) => (
                    <tr key={vote.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{vote.id}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(vote.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{vote.voter.name}</div>
                        <div className="text-xs text-gray-500">{vote.voter.aadhaar}</div>
                        <div className="text-xs text-gray-400 font-mono">
                          {vote.voter.wallet_address.slice(0, 10)}...
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{vote.candidate.name}</div>
                        <div className="text-xs text-gray-500">{vote.candidate.party}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            vote.vote_method === 'voice' ? 'bg-purple-100 text-purple-800' :
                            vote.vote_method === 'sign_language' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }
                        >
                          {vote.vote_method}
                        </Badge>
                        {vote.detected_sign && (
                          <div className="text-xs text-gray-500 mt-1">
                            Sign: {vote.detected_sign}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {vote.confidence_score ?
                          `${(vote.confidence_score * 100).toFixed(1)}%` :
                          'N/A'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{vote.ip_address || 'N/A'}</div>
                        {vote.user_agent && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {vote.user_agent.split(' ')[0]}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {votes.length} vote(s)
            </p>
            <Button
              onClick={() => { loadVotes(); loadVoteStats(); }}
              variant="outline"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;