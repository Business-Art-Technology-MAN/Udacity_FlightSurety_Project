
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

let contract = new Contract('localhost');

(async() => {

    let result = null;
    let opStatus = false;
    /* let contract = new Contract('localhost', () => {
        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
            opStatus = result;
        }); */
    await contract.initWeb3(eventHandler);
          
        
        // User-submitted transaction
        DOM.elid('submit-operational').addEventListener('click', () => {
            console.log("toggle operational called");
            // Write transaction

            contract.toggleOperational(!opStatus, (error, result)=>{
                display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
            });
            //opStatus = !opStatus;
            contract.isOperational((error, result) => {
                console.log(error,result);
                display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
                opStatus = result;
            });
        });

        // User-submitted transaction
        /* DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        }); */
});


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}
function eventHandler(error, event) {
    if (blockNumbersSeen.indexOf(event.transactionHash) > -1) {
        blockNumbersSeen.splice(blockNumbersSeen.indexOf(event.transactionHash), 1);
        return;
    }
    blockNumbersSeen.push(event.transactionHash);
    console.log(event.address);

    const log = DOM.elid('log-ul');
    let newLi1 = document.createElement('li');
    newLi1.append(`${event.event} - ${event.transactionHash}`);
    log.appendChild(newLi1);
}