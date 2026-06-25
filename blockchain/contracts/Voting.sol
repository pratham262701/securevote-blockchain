// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract Voting {
    address public admin;
    uint256 public startTime;
    uint256 public endTime;
    bool public finalized;

    struct Candidate { uint256 id; string name; uint256 votes; }
    mapping(uint256 => Candidate) public candidates;
    uint256 public candidateCount;

    mapping(address => bool) public registered;
    mapping(address => bool) public voted;
    mapping(uint256 => bytes32) public voteHashes;

    event VoterRegistered(address voter);
    event VoteCast(address voter, uint256 candidateId, bytes32 voteHash, uint256 timestamp);
    event CandidateAdded(uint256 id, string name);
    event CandidateNameUpdated(uint256 id, string oldName, string newName);
    event Finalized();

    modifier onlyAdmin() { require(msg.sender == admin, "only admin"); _; }
    modifier duringVoting() { require(block.timestamp >= startTime && block.timestamp <= endTime, "not voting period"); _; }

    constructor(uint256 _startTime, uint256 _endTime) {
        require(_endTime > _startTime, "bad times");
        admin = msg.sender;
        startTime = _startTime;
        endTime = _endTime;
    }

    function addCandidate(string memory name) external onlyAdmin {
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, name, 0);
        emit CandidateAdded(candidateCount, name);
    }

    function updateCandidateName(uint256 candidateId, string memory newName) external onlyAdmin {
        require(candidateId > 0 && candidateId <= candidateCount, "invalid candidate");
        require(bytes(newName).length > 0, "name cannot be empty");
        string memory oldName = candidates[candidateId].name;
        candidates[candidateId].name = newName;
        emit CandidateNameUpdated(candidateId, oldName, newName);
    }

    function registerVoter(address voter) external onlyAdmin {
        require(!registered[voter], "already reg");
        registered[voter] = true;
        emit VoterRegistered(voter);
    }

    // candidateId: uint256, voteHash: bytes32 (sha256 of encrypted vote)
    function castVote(uint256 candidateId, bytes32 voteHash) external duringVoting {
        require(registered[msg.sender], "not registered");
        require(!voted[msg.sender], "already voted");
        require(candidateId > 0 && candidateId <= candidateCount, "invalid candidate");
        voted[msg.sender] = true;
        candidates[candidateId].votes += 1;
        uint256 key = uint256(keccak256(abi.encodePacked(msg.sender, block.timestamp)));
        voteHashes[key] = voteHash;
        emit VoteCast(msg.sender, candidateId, voteHash, block.timestamp);
    }

    function finalize() external onlyAdmin {
        require(block.timestamp > endTime, "voting not ended");
        finalized = true;
        emit Finalized();
    }
}
