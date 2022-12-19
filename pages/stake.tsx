import {
    ThirdwebNftMedia, // preview UI component: fetch metadata and detect what kind of media assets have
    useAddress,
    useMetamask,
    useTokenBalance,
    useOwnedNFTs, // pass in the nft contract receive back the owned nfts of the connected wallet address
    useContract,
    ConnectWallet,
} from '@thirdweb-dev/react'
import { BigNumber, ethers } from 'ethers' // for formatting datas
import type { NextPage } from 'next' // type of the next page
import { useEffect, useState } from 'react'
import styles from '../styles/Home.module.css'

const nftDropContractAddress = '0x935d0724A1b64A3374783e94AC320fC44E78B607'
const tokenContractAddress = '0x859D41fD56c08FdAac617133D672f4f58E800D04'
const stakingContractAddress = '0xfEaD41134c547494BE7541233Baf71911d775d1A'

const Stake: NextPage = () => {
    // Wallet Connection Hooks
    const address = useAddress()
    const connectWithMetamask = useMetamask()

    // Contract Hooks
    const { contract: nftDropContract } = useContract(
        nftDropContractAddress,
        'nft-drop'
    )

    const { contract: tokenContract } = useContract(
        tokenContractAddress,
        'token'
    )

    const { contract, isLoading, isError } = useContract(stakingContractAddress) // if something went wrong fetching the contract -> isError. isLoading is a flag which shows the loading screen

    // Load Unstaked NFTs
    const { data: ownedNfts } = useOwnedNFTs(nftDropContract, address)

    // Load Balance of Token -> this is just for creating a new varible name for data
    const { data: tokenBalance } = useTokenBalance(tokenContract, address)

    ///////////////////////////////////////////////////////////////////////////
    // Custom contract functions
    ///////////////////////////////////////////////////////////////////////////
    const [stakedNfts, setStakedNfts] = useState<any[]>([])
    const [claimableRewards, setClaimableRewards] = useState<BigNumber>()

    useEffect(() => {
        if (!contract) return

        async function loadStakedNfts() {
            const stakedTokens = await contract?.call('getStakedToken', address)

            // For each staked token, fetch it from the sdk
            const stakedNfts = await Promise.all(
                stakedTokens?.map(
                    async (stakedToken: {
                        staker: string
                        tokenId: BigNumber
                    }) => {
                        const nft = await nftDropContract?.get(
                            stakedToken.tokenId
                        )
                        return nft
                    }
                )
            )

            setStakedNfts(stakedNfts)
            console.log('setStakedNfts', stakedNfts)
        }

        if (address) {
            loadStakedNfts()
        }
    }, [address, contract, nftDropContract])

    useEffect(() => {
        if (!contract || !address) return

        async function loadClaimableRewards() {
            const cr = await contract?.call('availableRewards', address)
            console.log('Loaded claimable rewards', cr)
            setClaimableRewards(cr)
        }

        loadClaimableRewards()
    }, [address, contract])

    ///////////////////////////////////////////////////////////////////////////
    // Write Functions
    ///////////////////////////////////////////////////////////////////////////
    async function stakeNft(id: string) {
        if (!address) return

        const isApproved = await nftDropContract?.isApproved(
            address,
            stakingContractAddress
        )
        // If not approved, request approval
        if (!isApproved) {
            await nftDropContract?.setApprovalForAll(
                stakingContractAddress,
                true
            )
        }
        const stake = await contract?.call('stake', id)
    }

    async function withdraw(id: BigNumber) {
        const withdraw = await contract?.call('withdraw', id)
    }

    async function claimRewards() {
        const claim = await contract?.call('claimRewards')
    }

    if (isLoading) {
        return <div>Loading</div>
    }

    console.log(address)
    return (
        <div className={styles.container}>
            <h1 className={styles.h1}>NFTs Staking dApp</h1>

            <hr className={`${styles.divider} ${styles.spacerTop}`} />

            {!address ? (
                <h1 className={styles.h1}>
                    Connect Your Wallet and Stake Your NFTs
                </h1>
            ) : (
                <>
                    <h2>Your Tokens</h2>

                    <div className={styles.tokenGrid}>
                        <div className={styles.tokenItem}>
                            <h3 className={styles.tokenLabel}>
                                Claimable Rewards
                            </h3>
                            <p className={styles.tokenValue}>
                                <b>
                                    {!claimableRewards
                                        ? 'Loading...'
                                        : ethers.utils.formatUnits(
                                              claimableRewards,
                                              18
                                          )}
                                </b>{' '}
                                {tokenBalance?.symbol}
                            </p>
                        </div>
                        <div className={styles.tokenItem}>
                            <h3 className={styles.tokenLabel}>
                                Current Balance
                            </h3>
                            <p className={styles.tokenValue}>
                                <b>{tokenBalance?.displayValue}</b>{' '}
                                {tokenBalance?.symbol}
                            </p>
                        </div>
                    </div>

                    <button
                        className={`${styles.mainButton} ${styles.spacerTop}`}
                        onClick={() => claimRewards()}
                    >
                        Claim Rewards
                    </button>

                    <hr className={`${styles.divider} ${styles.spacerTop}`} />

                    <h2>Your Staked NFTs</h2>
                    <div className={styles.nftBoxGrid}>
                        {stakedNfts?.map((nft) => (
                            <div
                                className={styles.nftBox}
                                key={nft.metadata.id.toString()}
                            >
                                <ThirdwebNftMedia
                                    metadata={nft.metadata}
                                    className={styles.nftMedia}
                                />
                                <h3>{nft.metadata.name}</h3>
                                <button
                                    className={`${styles.mainButton} ${styles.spacerBottom}`}
                                    onClick={() => withdraw(nft.metadata.id)}
                                >
                                    Withdraw
                                </button>
                            </div>
                        ))}
                    </div>

                    <hr className={`${styles.divider} ${styles.spacerTop}`} />

                    <h2>Your Unstaked NFTs</h2>

                    <div className={styles.nftBoxGrid}>
                        {ownedNfts?.map((nft) => (
                            <div
                                className={styles.nftBox}
                                key={nft.metadata.id.toString()}
                            >
                                <ThirdwebNftMedia
                                    metadata={nft.metadata}
                                    className={styles.nftMedia}
                                />
                                <h3>{nft.metadata.name}</h3>
                                <button
                                    className={`${styles.mainButton} ${styles.spacerBottom}`}
                                    onClick={() => stakeNft(nft.metadata.id)}
                                >
                                    Stake
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default Stake
