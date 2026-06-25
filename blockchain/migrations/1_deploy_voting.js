const Voting = artifacts.require("Voting");

module.exports = async function(deployer, network, accounts) {
  // deploy with startTime = now, endTime = now + 1 day (adjust)
  const now = Math.floor(Date.now() / 1000);
  const start = now;
  const end = now + 24 * 60 * 60; // +1 day
  await deployer.deploy(Voting, start, end, { from: accounts[0] });
  const instance = await Voting.deployed();
  console.log("Voting deployed at:", instance.address);
};
