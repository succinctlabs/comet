import { DeploymentManager } from '../../plugins/deployment_manager';
import relayPolygonMessage from './relayPolygonMessage';
import relayArbitrumMessage from './relayArbitrumMessage';
import relayBaseMessage from './relayBaseMessage';
import relaySuccinctMessage from './relaySuccinctMessage';

export default async function relayMessage(
  governanceDeploymentManager: DeploymentManager,
  bridgeDeploymentManager: DeploymentManager,
  startingBlockNumber: number
) {
  const bridgeNetwork = bridgeDeploymentManager.network;
  switch (bridgeNetwork) {
    case 'base-goerli':
      await relayBaseMessage(governanceDeploymentManager, bridgeDeploymentManager, startingBlockNumber);
      break;
    case 'mumbai':
    case 'polygon':
      await relayPolygonMessage(governanceDeploymentManager, bridgeDeploymentManager, startingBlockNumber);
      break;
    case 'fuji':
      await relaySuccinctMessage(governanceDeploymentManager, bridgeDeploymentManager, startingBlockNumber);
      break;
    case 'arbitrum':
    case 'arbitrum-goerli':
      await relayArbitrumMessage(governanceDeploymentManager, bridgeDeploymentManager, startingBlockNumber);
      break;
    default:
      throw new Error(`No message relay implementation from ${bridgeNetwork} -> ${governanceDeploymentManager.network}`);
  }
}
