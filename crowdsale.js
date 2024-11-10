const axios = require('axios');
const ethers = require("ethers");

const CROWDSALE_ADDRESS = "0xB67732cA658B9f7F6c46865865fD990d634C8766";
const MULTISIG_WALLET_ADDRESS = "0x049CA649c977eC36368f31762Ff7220dB0AaE79f";
const CROWDSALE_OWNER = "0xE03ffD991908e1CD52C9cfE151A2F36B0bD940a5";
const MULTISIG_ADVISOR_ADDRESS_1 = "0x75dcB0Ba77e5f99f8ce6F01338Cb235DFE94260c";
const MULTISIG_ADVISOR_ADDRESS_2 = "0x94ddC32c61BC9a799CdDea87e6a1D1316198b0Fa";
const MULTISIG_ADVISOR_ADDRESS_3 = "0xFaE39043B8698CaA4F1417659B00737fa19b8ECC";
const ETH_SENDTO_CROWDSALE = ethers.utils.parseEther("5.764868032");
const ETH_WITHDRAW_FROM_MULTISIG_WALLET = ethers.utils.parseEther("13.720868032");

const JSON_RPC_URL = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(JSON_RPC_URL);

const CROWDSALE_ABI = [
    {
        "constant": false,
        "inputs": [],
        "name": "payout",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const MULTISIG_WALLET_ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "transactionCount",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "transactionId",
                "type": "uint256"
            }
        ],
        "name": "confirmTransaction",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "destination",
                "type": "address"
            },
            {
                "name": "value",
                "type": "uint256"
            },
            {
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "submitTransaction",
        "outputs": [
            {
                "name": "transactionId",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

async function sendRpc(method, params = []) {
    const response = await axios.post(JSON_RPC_URL, {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: new Date().getTime(),
    });
    return response.data.result;
}

async function main() {

    await sendRpc('hardhat_impersonateAccount', [CROWDSALE_OWNER]);
    await sendRpc('hardhat_impersonateAccount', [MULTISIG_ADVISOR_ADDRESS_1]);
    await sendRpc('hardhat_impersonateAccount', [MULTISIG_ADVISOR_ADDRESS_2]);
    await sendRpc('hardhat_impersonateAccount', [MULTISIG_ADVISOR_ADDRESS_3]);

    await sendRpc('hardhat_setBalance', [CROWDSALE_OWNER, ethers.utils.parseEther("5.8")._hex]);
    await sendRpc('hardhat_setBalance', [MULTISIG_ADVISOR_ADDRESS_1, ethers.utils.parseEther("0.005")._hex]);
    await sendRpc('hardhat_setBalance', [MULTISIG_ADVISOR_ADDRESS_2, ethers.utils.parseEther("0.005")._hex]);
    await sendRpc('hardhat_setBalance', [MULTISIG_ADVISOR_ADDRESS_3, ethers.utils.parseEther("0.005")._hex]);

    const crowdsaleOwner = provider.getSigner(CROWDSALE_OWNER);
    const multiSigAdvisorAddress1 = provider.getSigner(MULTISIG_ADVISOR_ADDRESS_1);
    const multiSigAdvisorAddress2 = provider.getSigner(MULTISIG_ADVISOR_ADDRESS_2);
    const multiSigAdvisorAddress3 = provider.getSigner(MULTISIG_ADVISOR_ADDRESS_3);

    console.log("BALANCE BEFORE WITHDRAW:");
    console.log();
    console.log(`crowdsaleOwner ${CROWDSALE_OWNER}: ${ethers.utils.formatEther(await crowdsaleOwner.getBalance())} ETH`);
    console.log(`multiSigAdvisorAddress1 ${MULTISIG_ADVISOR_ADDRESS_1}: ${ethers.utils.formatEther(await multiSigAdvisorAddress1.getBalance())} ETH`);
    console.log(`multiSigAdvisorAddress2 ${MULTISIG_ADVISOR_ADDRESS_2}: ${ethers.utils.formatEther(await multiSigAdvisorAddress2.getBalance())} ETH`);
    console.log(`multiSigAdvisorAddress3 ${MULTISIG_ADVISOR_ADDRESS_3}: ${ethers.utils.formatEther(await multiSigAdvisorAddress3.getBalance())} ETH`);


    const crowdsaleInstance = new ethers.Contract(
        CROWDSALE_ADDRESS,
        CROWDSALE_ABI,
        crowdsaleOwner
    );

    const multisigWalletInstance = new ethers.Contract(
        MULTISIG_WALLET_ADDRESS,
        MULTISIG_WALLET_ABI,
        multiSigAdvisorAddress1
    );

    await crowdsaleOwner.sendTransaction({
        to: multisigWalletInstance.address,
        value: ETH_SENDTO_CROWDSALE
    });

    const transactionIdTransferToCrowdsale = await multisigWalletInstance.transactionCount();
    await multisigWalletInstance.submitTransaction(
        crowdsaleInstance.address,
        ETH_SENDTO_CROWDSALE,
        "0x"
    );
    await multisigWalletInstance.connect(multiSigAdvisorAddress2).confirmTransaction(transactionIdTransferToCrowdsale);
    await multisigWalletInstance.connect(multiSigAdvisorAddress3).confirmTransaction(transactionIdTransferToCrowdsale);

    await crowdsaleInstance.payout();

    const transactionIdWithdrawFromMultisigWallet = await multisigWalletInstance.transactionCount();
    await multisigWalletInstance.submitTransaction(
        CROWDSALE_OWNER,
        ETH_WITHDRAW_FROM_MULTISIG_WALLET,
        "0x"
    );
    await multisigWalletInstance.connect(multiSigAdvisorAddress2).confirmTransaction(transactionIdWithdrawFromMultisigWallet);
    await multisigWalletInstance.connect(multiSigAdvisorAddress3).confirmTransaction(transactionIdWithdrawFromMultisigWallet);

    console.log();
    console.log("BALANCE AFTER WITHDRAW:");
    console.log();
    console.log(`crowdsaleOwner ${CROWDSALE_OWNER}: ${ethers.utils.formatEther(await crowdsaleOwner.getBalance())} ETH`);
    console.log(`multiSigAdvisorAddress1 ${MULTISIG_ADVISOR_ADDRESS_1}: ${ethers.utils.formatEther(await multiSigAdvisorAddress1.getBalance())} ETH`);
    console.log(`multiSigAdvisorAddress2 ${MULTISIG_ADVISOR_ADDRESS_2}: ${ethers.utils.formatEther(await multiSigAdvisorAddress2.getBalance())} ETH`);
    console.log(`multiSigAdvisorAddress3 ${MULTISIG_ADVISOR_ADDRESS_3}: ${ethers.utils.formatEther(await multiSigAdvisorAddress3.getBalance())} ETH`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});