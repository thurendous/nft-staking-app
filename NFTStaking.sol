// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/safeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ERC721Staking is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // interfaces for ERC20 and ERC721
    IERC20 public immutable rewardsToken;
    IERC721 public immutable nftCollection;

    // constructor for function to set the rewards token and the NFT collection addresses
    constructor(IERC721 _nftCollection, IERC20 _rewardToken) {
        nftCollection = _nftCollection;
        rewardsToken = _rewardToken;
    }

    struct StakedToken {
        address staker;
        uint256 tokenId;
    }

    // staker info
    struct Staker {
        // amount of tokens staked by the staker
        uint256 amountStaked;
        // staked tokens
        StakedToken[] stakedTokens;
        // last time of the rewards were calculated for this user
        uint256 timeOfLastUpdate;
        // Calculated, but unclaimed rewards for the user. the Rewards are
        // calculated each time the user writes to the smart contract
        uint256 unclaimedRewards;
    }

    // rewards per hour per token deposited in wei
    // rewards are cumulated once every hour
    uint256 private rewardsPerHour;

    // mapping of user address to staker info
    mapping(address => Staker) public stakers;

    // mapping of token id to stker. Made for the SC to remember
    // who to send back the ERC721 token to.
    mapping(uint256 => address) public stakerAddress;

    function stake(uint256 _tokenId) external nonReentrant {
        if (stakers[msg.sender].amountStaked > 0) {
            uint256 rewards = calculateRewards(msg.sender);
            stakers[msg.sender].unclaimedRewards += rewards;
        }

        // wallet must own the token they are trying to stake
        require(
            nftCollection.ownerOf(_tokenId) == msg.sender,
            "You do not own this token!"
        );

        // transfer the token from the wallet to the SC
        nftCollection.transferFrom(msg.sender, address(this), _tokenId);

        // create StakedToken
        StakedToken memory stakedToken = StakedToken(msg.sender, _tokenId);

        // add the token to the stakedTokens array
        stakers[msg.sender].stakedTokens.push(stakedToken);

        // increment the amount staked for this wallet
        stakers[msg.sender].amountStaked++;

        // update the mapping of the tokenId to the staker's address
        stakerAddress[_tokenId] = msg.sender;

        // update the timeOfLastUpdate for the staker
        stakers[msg.sender].timeOfLastUpdate = block.timestamp;
    }

    function withdraw(uint256 _tokenId) external nonReentrant {
        // make sure the user has at least one token staked before withdrawing
        require(
            stakers[msg.sender].amountStaked > 0,
            "You have no token staked"
        );

        // wallet must own the token they are trying to withdraw
        uint256 rewards = calculateRewards(msg.sender);
        stakers[msg.sender].unclaimedRewards += rewards;

        // find the index of this token in the stakedTokens array
        uint256 index = 0;
        for (uint256 i = 0; i < stakers[msg.sender].stakedTokens.length; i++) {
            if (stakers[msg.sender].stakedTokens[i].tokenId == _tokenId) {
                index = i;
                break;
            }
        }

        stakers[msg.sender].stakedTokens[index].staker = address(0);

        stakers[msg.sender].amountStaked--;

        stakerAddress[_tokenId] = address(0);

        // transfer the token back to the withdrawer
        nftCollection.transferFrom(address(this), msg.sender, _tokenId);

        stakers[msg.sender].timeOfLastUpdate = block.timestamp;
    }

    function claimRewards() external {
        uint256 rewards = calculateRewards(msg.sender) +
            stakers[msg.sender].unclaimedRewards;

        require(rewards > 0, "You have no rewards to claim");
        stakers[msg.sender].timeOfLastUpdate = block.timestamp;
        stakers[msg.sender].unclaimedRewards = 0;

        rewardsToken.safeTransfer(msg.sender, rewards);
    }

    function calculateRewards(address _staker)
        internal
        view
        returns (uint256 _rewards)
    {
        return (((
            ((block.timestamp - stakers[_staker].timeOfLastUpdate) *
                stakers[_staker].amountStaked)
        ) * rewardsPerHour) / 3600);
    }

    function availableRewards(address _staker) public view returns (uint256) {
        uint256 rewards = calculateRewards(_staker) +
            stakers[_staker].unclaimedRewards;
        return rewards;
    }

    function getStakedToken(address _user)
        public
        view
        returns (StakedToken[] memory)
    {
        if (stakers[_user].amountStaked > 0) {
            // return all the tokens in the staked Token array for this user that are not -1
            StakedToken[] memory _stakedTokens = new StakedToken[](
                stakers[_user].amountStaked
            );
            uint256 _index = 0;

            for (uint256 j = 0; j < stakers[_user].stakedTokens.length; j++) {
                if (stakers[_user].stakedTokens[j].staker != (address(0))) {
                    _stakedTokens[_index] = stakers[_user].stakedTokens[j];
                    _index++;
                }
            }
            return _stakedTokens;
        } else {
            return new StakedToken[](0);
        }
    }
}
