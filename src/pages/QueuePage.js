import {
  Button,
  ButtonGroup,
  FormControl,
  Input,
  FormLabel,
  Flex,
  Box,
  VStack,
  HStack,
  GridItem,
} from "@chakra-ui/react";
import {
  chain,
  useAccount,
  useConnect,
  useDisconnect,
  useContract,
  useSigner,
} from "wagmi";
import { useAtom } from "jotai";
import { queueAtom, nonceAtom, groupAtom, groupIdAtom } from "../utils/atoms.js";

import { packToSolidityProof, generateProof } from "@semaphore-protocol/proof";
import { Identity } from "@semaphore-protocol/identity";
import { ethers, utils } from "ethers";

function QueuePage() {
  const [queue, setQueue] = useAtom(queueAtom);
  const [nonce, setNonce] = useAtom(nonceAtom);
  const [group, setGroup] = useAtom(groupAtom);
  const [groupId, setGroupId] = useAtom(groupIdAtom);

  const { address, isConnected } = useAccount();

  // TODO: cleaner way of using this code?
  const moduleContract = useContract({
    address: "0xCb044fdcdbE8F20CEF7Fa89B4d05A522af278a40",
    abi: privateModule["abi"],
    signerOrProvider: signer,
  });

  async function signTxn(txn, txnIndex) {
    // get address, re-generate the identity
    const identity = new Identity(address);

    const vote = ethers.utils.formatBytes32String(nonce);

    // const groupId = 13;

    // TODO: store this in react state or db?
    // i think react state, have the user enter in safe address
    // or have a "your safes" in db, for now just store in state
    // const group = await semaphoreContract.groups(groupId);
    // console.log(group);

    // group.root is the external nullifier that corresponds to the group
    const fullProof = await generateProof(identity, group, groupId, vote);
    console.log(fullProof);

    // initialized merkleTreeRoots
    const treeRoots = [...txn.roots, fullProof.publicSignals.merkleRoot];

    // initialized nullifier hahshes
    const nulHashes = [
      ...txn.nullifierHashes,
      fullProof.publicSignals.nullifierHash,
    ];

    // initialized proofs
    const solidityProof = packToSolidityProof(fullProof.proof);
    const proofs = [...txn.proofs, solidityProof];

    // initialized voters array
    const votes = [...txn.voters, vote];

    const newTxn = {
      ...txn,
      roots: treeRoots,
      nullifierHashes: nulHashes,
      proofs: proofs,
      voters: votes,
    };

    queue[txnIndex] = newTxn;
    setQueue(queue);
  }

  // this function just has to fix inputs, and call the execute transaction function
  async function executeTransaction(txn, txnIndex) {

    /*
    params 

    address to, 
    uint256 value,
    bytes memory data,
    Enum.Operation operation,

    uint256[] memory merkleTreeRoots,
    uint256[] memory nullifierHashes,
    uint256[8][] memory proofs,
    bytes32[] memory votes
    */

    // address val in solidity, string val in js
    const to = txn.formInfo.target

    // wei u256 value in solidity, int in js
    // TODO: big number?
    const value = txn.formInfo.value

    // right now, we are just supporting simple eth transfers and calls without args
    const args = txn.formInfo.args
    args[2] = utils.BigNumber.from(args[2])

    const funcCall = txn.formInfo.data

    // const abiCoder = utils.defaultAbiCoder
    // const encodedData = iface.encodeFunctionData(funcCall, encodedData)
    // TODO: better way of dealing with this
    // 0 is call, 1 is delegatecall
    const operation = 0;
    if (txn.formInfo.operation == "delegatecall") {
        operation = 1;
    }

    const execTxn = await moduleContract.executeTransaction(

    );
  }

  function getTransactionData(e, i) {
    /*
        nonce -
        address to - 
        calldata (function and args) - 
        eth value 
        operation

        num signatures - 
        button to sign -
        button to execute - 
        */
    return (
      <VStack
        p={4}
        spacing="10px"
        display="flex"
        flexDirection="column"
        alignItems="flex-start"
        borderRadius="10px"
        borderWidth="1px"
        borderColor="grey"
        borderStyle="solid"
      >
        <HStack spacing="10px" borderStyle="solid" borderColor="grey">
          <Box>{e.nonce}</Box>
          <Box>{e.formInfo.target}</Box>
          <Box>{e.formInfo.data}</Box>
          <Box>{e.voters.length} signers</Box>
        </HStack>
        <HStack spacing="10px" borderStyle="solid" borderColor="grey">
          <Box>{e.formInfo.operation}</Box>
          <Box>{e.formInfo.value}</Box>
        </HStack>
        <HStack spacing="10px">
          <Button onClick={() => signTxn(e, i)}>Sign</Button>
          <Button>Execute</Button>
        </HStack>
      </VStack>
    );
  }

  return <Box p={6}>{queue.map(getTransactionData)}</Box>;
}

export default QueuePage;
