import { DeploymentManager } from '../../plugins/deployment_manager';
import { impersonateAddress } from '../../plugins/scenario/utils';
import { executeBridgedProposal } from './bridgeProposal';
import { setNextBaseFeeToZero } from './hreUtils';
// import { Contract, ethers } from 'ethers';
import { Log } from '@ethersproject/abstract-provider';
import {OpenBridgedProposal} from '../context/Gov';

export default async function relaySuccinctMessage(
  governanceDeploymentManager: DeploymentManager,
  bridgeDeploymentManager: DeploymentManager,
  startingBlockNumber: number
) {
  const TELEPATHY_ROUTER_ADDRESS = '0x41EA857C32c8Cb42EEFa00AF67862eCFf4eB795a';

  // Mainnet Contracts
  const telepathyRouter = await governanceDeploymentManager.getContractOrThrow('telepathyRouter');

  // Telepathy Router will call and execute into bridge receiver
  const bridgeReceiver = await bridgeDeploymentManager.getContractOrThrow('bridgeReceiver');

  // grab all events on the Telepathy contract since the `startingBlockNumber`
  const filter = telepathyRouter.filters.SentMessage();
  
  const sentMessageEvents: Log[] = await governanceDeploymentManager.hre.ethers.provider.getLogs({
    fromBlock: startingBlockNumber,
    toBlock: 'latest',
    address: telepathyRouter.address,
    topics: filter.topics!
  });

  for (let sentMessageEvent of sentMessageEvents) {
    const {
      args: { data: sentMessageEventData }
    } = telepathyRouter.interface.parseLog(sentMessageEvent);

    // Cross-chain message passing
    const succinctReceiverSigner = await impersonateAddress(
      bridgeDeploymentManager,
      TELEPATHY_ROUTER_ADDRESS
    );

    await setNextBaseFeeToZero(bridgeDeploymentManager);
    const onStateReceiveTxn = await(
      await bridgeReceiver.connect(succinctReceiverSigner).onStateReceive(
        123, // stateId
        sentMessageEventData, // _data
        { gasPrice: 0 }
      )
    ).wait();

    const proposalCreatedEvent = onStateReceiveTxn.events.find(
      event => event.address === bridgeReceiver.address
    );
    const { args } = bridgeReceiver.interface.parseLog(proposalCreatedEvent);
    const proposal = args as unknown as OpenBridgedProposal;
    await executeBridgedProposal(bridgeDeploymentManager, proposal);
    console.log(
      `[${governanceDeploymentManager.network} -> ${bridgeDeploymentManager.network}] Executed bridged proposal ${proposal.id}`
    );
    
  
  }
}