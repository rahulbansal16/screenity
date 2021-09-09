// function promiseState(promise, callback) {
//     // Symbols and RegExps are never content-equal
//     var uniqueValue = window['Symbol'] ? Symbol('unique') : /unique/

//     function notifyPendingOrResolved(value) {
//       if (value === uniqueValue) {
//         return callback('pending')
//       } else {
//         return callback('fulfilled')
//       }
//     }

//     function notifyRejected(reason) {
//       return callback('rejected')
//     }
    
//     var race = [promise, Promise.resolve(uniqueValue)]
//     Promise.race(race).then(notifyPendingOrResolved, notifyRejected)
//   }


class Drivers {

    constructor(name) {
        this.name = name
        this.timeout = Math.floor(Math.random() * 5);
        console.log('The driver ' + this.name + ' timeout ' + this.timeout + ' seconds')
    }

    acceptRide (ride){
        console.log("In the accepttime", this.name)
        return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve({
                  status: true,
                  timeout: this.timeout,
                  name: this.name
              });
            }, this.timeout*1000);
          });

    }

}

class Ride {
    constructor(name, start,end ) {
        this.name = name
        this.name = name
        this.name = name
    }
}


const dispatch = (drivers, ride) => {
    let driverResponses = []
    drivers.map( driver => {
        driverResponses.push(driver.acceptRide(ride))
    })

    return new Promise((resolve, reject) => {

        setTimeout(() => {
        var driver = undefined;
        let time = 10000000;
        for(let driverResponse in driverResponses){

            console.log('The driverResponse is',driverResponse);
            driverResponses[driverResponse].then( response => {
                if (response.status) {
                    if ( response.timeout < time ) {
                        time = response.timeout;
                        driver = response.name
                        console.log("The dirver is ", driver)

                    }
                }
            })
            console.log("The dirver is ", driver)
        }
          resolve(driver);
        }, 10000)

      });
}



var drivers  = [
    new Drivers("Rahul"),
    new Drivers("A"),
    new Drivers("B"),
    new Drivers("C"),
    new Drivers("D"),
];
dispatch(drivers).then( result => console.log('The accepted driver is'+ result))