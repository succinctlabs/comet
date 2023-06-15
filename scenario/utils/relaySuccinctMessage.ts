import { DeploymentManager } from '../../plugins/deployment_manager';
import { impersonateAddress } from '../../plugins/scenario/utils';
import { executeBridgedProposal } from './bridgeProposal';
import { setNextBaseFeeToZero } from './hreUtils';
// import { Contract, ethers } from 'ethers';
import { Log } from '@ethersproject/abstract-provider';
import { utils, BigNumber } from 'ethers';
import {OpenBridgedProposal} from '../context/Gov';

export default async function relaySuccinctMessage(
  governanceDeploymentManager: DeploymentManager,
  bridgeDeploymentManager: DeploymentManager,
  startingBlockNumber: number
) {
  console.log("---RELAY SUCCINCT MESSAGE---");
  const POLYGON_RECEIVER_ADDRESSS = '0x0000000000000000000000000000000000001001';

  // L1
  const telepathyRouterL1 = await governanceDeploymentManager.getContractOrThrow('telepathyRouter'); // Inbox -> Bridge

  // Telepathy Router will call and execute into bridge receiver
  const bridgeReceiver = await bridgeDeploymentManager.getContractOrThrow('bridgeReceiver');
  const telepathyRouterL2 = await bridgeDeploymentManager.getContractOrThrow('telepathyRouter');

  // grab all events on the telepathyRouterL1 contract since the `startingBlockNumber`
  const sentMessageEvents: Log[] = await governanceDeploymentManager.hre.ethers.provider.getLogs({
    fromBlock: startingBlockNumber,
    toBlock: 'latest',
    address: telepathyRouterL1.address,
    topics: [utils.id('SentMessage(uint64,bytes32,bytes)')]
  });

  console.log("Sent Message Events: ", sentMessageEvents);

  for (let sentMessageEvent of sentMessageEvents) {
    const {
      args: { data: sentMessageData }
    } = telepathyRouterL1.interface.parseLog(sentMessageEvent);

    // Cross-chain message passing
    const succinctReceiverSigner = await impersonateAddress(
      bridgeDeploymentManager,
      POLYGON_RECEIVER_ADDRESSS
    );

    await setNextBaseFeeToZero(bridgeDeploymentManager);
    console.log("Methods on telepathyRouter: ", telepathyRouterL2.address, telepathyRouterL2.interface); 
    const onStateReceiveTxn = await(
      await telepathyRouterL2.connect(succinctReceiverSigner).executeMessage(
        10000, // stateId
        sentMessageData, // _data
        [],
        []
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