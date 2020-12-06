pragma solidity ^0.5.3;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;
    
    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    mapping (address=>bool) private contractAuthorization;
    //variables defining a airline
    struct Airline {
        
        bool isRegistered;
        uint256 funds;
        uint256 votes;
    }

    //private map holding registered airlines
    mapping (address=>Airline) private airlines;

    uint256 private _numAirlines = 0;
    uint32 private _numFundedAirlines = 0;

    //Consensus data
    mapping (address=>address[]) private consensusMap;

    //Insurance Struct
    struct InsuranceContract{
        address passenger;
        string flight;
        uint256 value;
        bool    redeemed;
        bool    payed;
    }
    
    /******************************
    *     Insurance Data          *
    ******************************/
    mapping(bytes32 => InsuranceContract) private insuredFlightsList;
    mapping(string => address[]) private flightPassengersArray;
    mapping(address => uint256) private passengerPayoutFunds;

    /********************************************************************************************/
    /*                                 Insurance CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
    /*
    * Passenger Purchases Insurance
    */
    function passengerPurchase(string calldata flight, address passenger) external payable isAuthorizedCaller{
        //create a new contract
        InsuranceContract memory insTmp = InsuranceContract({
            passenger: passenger,
            flight: flight,
            value: msg.value,
            redeemed: false,
            payed: false
        }); 

        //keep track of it
        bytes32 tmpkey = keccak256(abi.encodePacked(flight, passenger));
        
        //keep list of insurance contracts by hashed flight Passenger pair
        insuredFlightsList[tmpkey] = insTmp;

        //keep a list of passengers with insurance by flight
        flightPassengersArray[flight].push(passenger); 

    }

    /*
    *           Get Insurance Contract
    */
    function getInsuranceContract(string calldata flight, address passenger) external view isAuthorizedCaller
        returns (address, string memory, uint256, bool, bool)
    {
        //create hashed flight Passenger pair
        bytes32 tmpkey = keccak256(abi.encodePacked(flight, passenger));
        return (insuredFlightsList[tmpkey].passenger, insuredFlightsList[tmpkey].flight, insuredFlightsList[tmpkey].value, 
                insuredFlightsList[tmpkey].redeemed, insuredFlightsList[tmpkey].payed);
    }

    /*
    *           credit passengers with flight insurance
    */
    function creditByFlight(string calldata flight)external isAuthorizedCaller
    {
        //get passengers to be credited by flight
        address[] memory psgArray = flightPassengersArray[flight];

        //loop through passengers and credit
        for(uint i = 0; i < psgArray.length; i++){
            //get key for insurance contracts
            bytes32 tmpkey = keccak256(abi.encodePacked(flight, psgArray[i]));

            //get record
            InsuranceContract storage psgInsContract = insuredFlightsList[tmpkey];

            //add passenger to a list of passengers authorized to pay
            //increase by insurance leverage 1.5 = (3*value)/2
            uint256 tmpVal = psgInsContract.value.mul(3).div(2);
            passengerPayoutFunds[psgInsContract.passenger] = tmpVal;
            
            //mark contract as redeemed
            psgInsContract.redeemed = true;

            //update stored contract
            insuredFlightsList[tmpkey] = psgInsContract;
        }

    }

    

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        contractAuthorization[msg.sender] = true;
        //create insertion of first airline
        airlines[msg.sender] = Airline(true, 0, 0);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireNotAlreadyRegistered(address toReg)
    {
        require(airlines[toReg].isRegistered, "Airline already registered!");
        _;
    }
    /**
    * @dev Modifier that requires the "authorized caller" account to be the function caller
    */
    modifier isAuthorizedCaller()
    {
        require(contractAuthorization[msg.sender], "Caller is not authorized caller");
        _;
    }
    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/
    /**
    * @dev Set authorized callors 
    * @return A bool that is the current operating status
    */
    function authorizeCaller(address dataContract) external requireContractOwner{
        contractAuthorization[dataContract] = true;
    }
    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (  
                                address airlineAddress 
                            )
                            isAuthorizedCaller
                            
                            external
    {
        //

        airlines[airlineAddress]=Airline({
            isRegistered: true,
            funds: 0,
            votes: consensusMap[airlineAddress].length
        });
        _numAirlines = _numAirlines.add(1);
    }
    /**
    * @dev deposit airline funds
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function depositAirlineFunds(address depositor, uint256 funds) 
                            isAuthorizedCaller
                            payable
                            external
    {
        airlines[depositor].funds = airlines[depositor].funds.add(funds);
    }

    /**
    * @dev deposit airline funds
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function setAirlineAsRegistered(address authorize) 
                            isAuthorizedCaller
                            payable
                            external
    {
        airlines[authorize].isRegistered = true;
        _numAirlines = _numAirlines.add(1);
    }
    /**
    * @dev vote on airline consensus
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function concensusVote(address airlineToAdd, address sponsorAirline) 
                            isAuthorizedCaller
                            external
                            payable
                            returns(uint256)
    {
        if(consensusMap[airlineToAdd].length != 0){
            for(uint i=0; i < consensusMap[airlineToAdd].length; i++){
                require(consensusMap[airlineToAdd][i] != sponsorAirline, "Airline has already voted!");
            }
        }
        
        consensusMap[airlineToAdd].push(sponsorAirline);

        airlines[airlineToAdd].votes = airlines[airlineToAdd].votes.add(1);

        return consensusMap[airlineToAdd].length;
    }

    /**
    * @dev return total votes airline funds
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function airlineTotalVotes(address airlineToAdd) 
                            isAuthorizedCaller
                            external
                            view
                            returns(uint256)
    {
        return consensusMap[airlineToAdd].length;
    }

    /**
    * @dev get current number of registered airlines
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function getNumberRegisteredAirlines() 
                            isAuthorizedCaller
                            view
                            external
                            returns(uint256)
    {
        return _numAirlines;
    }

    //this is here to make boilerplate test pass
    function isAirline(  address airlineAddress 
                    )
                    isAuthorizedCaller
                    external
                    view
                    returns (bool)
    {
        Airline memory  myAirline =airlines[airlineAddress];

        bool out = false;
        if(myAirline.isRegistered){
            out = true;
        }
        return out;
    }

    //get current funds for airline
    function getAirlineFunds(  address airlineAddress 
                    )
                    isAuthorizedCaller
                    external
                    view
                    returns (uint256)
    {
        Airline memory  myAirline =airlines[airlineAddress];

        uint256 theFunds = myAirline.funds;
        return theFunds;
    }
    //get current funds for airline
    function getAirline(  address airlineAddress 
                        )
                        isAuthorizedCaller
                        external
                        view
                        returns (bool, uint256, uint256)
    {
        Airline memory  myAirline =airlines[airlineAddress];

        
        return (myAirline.isRegistered, myAirline.funds, myAirline.votes);
    }
   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (                             
                            )
                            external
                            payable
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                external
                                pure
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            pure
    {
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
    {
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

