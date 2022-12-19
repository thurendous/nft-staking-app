import {
    useAddress,
    useMetamask,
    useContract,
    useClaimNFT,
    ConnectWallet,
} from '@thirdweb-dev/react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import styles from '../styles/Home.module.css'

const Mint: NextPage = () => {
    const router = useRouter()
    const address = useAddress()
    const connectWithMetamask = useMetamask()

    const nftDropContract = useContract(
        '0x935d0724A1b64A3374783e94AC320fC44E78B607',
        'nft-drop'
    )

    async function claimNFT() {
        try {
            const tx = await nftDropContract.contract?.claim(1)
            console.log(tx)
            router.push(`/stake`)
        } catch (err) {
            console.log(err)
            alert(err)
        }
    }

    return (
        <div className={styles.container}>
            {!address ? (
                <div>Wallet Connection is needed</div>
            ) : (
                <button
                    className={`${styles.mainButton} ${styles.spaceBottom}`}
                    onClick={() => claimNFT()}
                >
                    Claim An NFT
                </button>
            )}
        </div>
    )
}

export default Mint
