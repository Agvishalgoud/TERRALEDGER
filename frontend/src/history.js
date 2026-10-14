const DEPLOYMENT_TX =
  "0xa8077a37e64811c41a85612627ab917c63cafbbc9bb311f429fd940bbbd8d990";

/**
 * Reads events declared in the loaded contract ABI from its deployment block.
 * This is generic so it does not assume a particular Solidity event signature.
 */
export async function loadBlockchainHistory(contract) {
  const provider = contract.runner?.provider;
  if (!provider) throw new Error("Blockchain provider is unavailable.");

  const receipt = await provider.getTransactionReceipt(DEPLOYMENT_TX);
  if (!receipt) {
    throw new Error("Deployment transaction was not found. Check the deployment transaction hash and Sepolia RPC.");
  }

  const latestBlock = await provider.getBlockNumber();
  const eventFragments = contract.interface.fragments.filter(
    (fragment) => fragment.type === "event"
  );

  if (eventFragments.length === 0) {
    throw new Error("The imported ABI contains no events. Existing contract activity cannot be listed from events without an event ABI or a transaction indexer.");
  }

  const collected = [];
  // Query in batches to reduce the chance of RPC block-range limits.
  const batchSize = 2000;
  for (let from = receipt.blockNumber; from <= latestBlock; from += batchSize) {
    const to = Math.min(from + batchSize - 1, latestBlock);
    const batchResults = await Promise.all(eventFragments.map(async (fragment) => {
      const filter = contract.filters[fragment.name]();
      const logs = await contract.queryFilter(filter, from, to);
      return logs.map((log) => {
        const args = {};
        fragment.inputs.forEach((input, index) => {
          args[input.name || String(index)] = log.args[index];
        });
        const actor = args.authority ?? args.owner ?? args.account ?? args.user ?? args.sender ?? null;
        return {
          eventName: fragment.name,
          args,
          actor,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
        };
      });
    }));
    collected.push(...batchResults.flat());
  }

  const blockNumbers = [...new Set(collected.map((event) => event.blockNumber))];
  const timestamps = new Map();
  // Small groups prevent overly large concurrent RPC requests.
  for (let i = 0; i < blockNumbers.length; i += 20) {
    const group = blockNumbers.slice(i, i + 20);
    const blocks = await Promise.all(group.map((number) => provider.getBlock(number)));
    blocks.forEach((block) => {
      if (block) timestamps.set(block.number, Number(block.timestamp));
    });
  }

  return collected
    .map((event) => ({ ...event, timestamp: timestamps.get(event.blockNumber) ?? null }))
    .sort((a, b) => b.blockNumber - a.blockNumber);
}
