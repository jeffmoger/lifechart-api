const axios = require('axios');
const moment = require('moment');
const { google} = require('googleapis');
const _ = require('lodash')

const Users = require('../models/userModel');
const googleToken = require('../models/googleToken');
const Fit = require('../models/fitModel');


function getUserProfile(userID) {
    return Users.findById(userID)
};

function getUserTokenFromProfile(userID) {
    return googleToken.findOne({userID: userID});
};

async function saveTokenToProfile(userID, credentials) {
    try {
        return await googleToken.findOneAndUpdate(
            {userID: userID},
            {
              access_token: credentials.access_token,
              expiry_date: credentials.expiry_date
            },
            {new: true}
          )
    } catch(err) {
        console.log(err)
    }
};

function callAuthToRefreshToken(token){
    const oauth2Client = newOauth2Client();
    oauth2Client.setCredentials({ refresh_token: token.refresh_token });
    return oauth2Client.refreshAccessToken();
};

function checkTokenHasExpired(token) {
    let dateNow = new Date();
    let timeNow = dateNow.getTime();
    let expiryDate = new Date(token.expiry_date)
    if (timeNow > token.expiry_date) {
        console.log(`Token expired ${expiryDate}.`)
        return true
    }
}


function newOauth2Client() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.G_CLIENT_ID,
        process.env.G_CLIENT_Secret,
        process.env.G_REDIRECT_URIS
    );
    return oauth2Client;
}



async function callGoogle(url) {
    const response = await axios.get(url)
    if (response.status !== 200) {
      console.log('Looks like there was a problem. Status Code: ' +
        response.status);
      return;
    }
    console.log('Generate Url from Google status: ' + response.status)
    return response.status;
  };
  
async function returnAuthUrl(callbackUrl, userID) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.G_CLIENT_ID,
        process.env.G_CLIENT_Secret,
        process.env.G_REDIRECT_URIS
    );
    const scopes = [ 
        "https://www.googleapis.com/auth/fitness.activity.read",
        "https://www.googleapis.com/auth/fitness.body.read",
        "https://www.googleapis.com/auth/fitness.nutrition.read"
    ];
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        state: JSON.stringify({
            callbackUrl: callbackUrl,
            userID: userID
        })
    });

    let urlStatus = await callGoogle(authUrl);
    console.log(urlStatus)
    if (urlStatus === 200) {
        return(authUrl)
    }
}

//update profile to set googleFit to True
async function updateGoogleFit(userID) {
    try {
        const filter = { _id: userID };
        const update = { googleFit: true };
        const response = await Users.findByIdAndUpdate(filter, update, { new: true });
        return response.googleFit;
    } catch (err) {
        console.log(err);
    }
};

function saveTokens(tokens){
    const newToken = new googleToken(tokens);
    newToken.save(function (err) {
      if (err) { return next(err); }
    });
}

function updateItem(item){
    const { dataTypeName, startTimeNanos, endTimeNanos } = item
}

/*
async function getDataSourcesFromGoogle(access_token) {
    const result = await axios({
        method: "GET",
        headers: {
            authorization: "Bearer " + access_token
        },
        "Content-Type": "application/json",
        url: `https://www.googleapis.com/fitness/v1/users/me/dataSources`,
    });
    return result
}
*/

function getDataSourcesFromGoogle(access_token) {
    return axios({
        method: "GET",
        url: "https://www.googleapis.com/fitness/v1/users/me/dataSources",
        headers: {authorization: "Bearer " + access_token}
    });
}


async function getActivity(token, startTime, endTime, dataSourceId, exclude) {
       
    let fitArray = [];
    let dataSetArray = [];
    try {
        const result = await axios({
            method: "POST",
            headers: {
                authorization: "Bearer " + token.access_token
            },
            "Content-Type": "application/json",
            url: `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
            data: {
                aggregateBy: [{
                    dataSourceId: dataSourceId
                }],
                bucketByTime: { "durationMillis": 86400000 },
                startTimeMillis: startTime,
                endTimeMillis: endTime
                }
        });
        fitArray = result.data.bucket
        for(const dataSet of fitArray) {
            let fitObject = {};
            const match = exclude.filter(item => 
                item.startTimeMillis === parseInt(dataSet.startTimeMillis,10))
            // Have not encountered a match array with more than 1 item yet !!
            if (match.length > 0 ) {
                fitObject.saved = true
                fitObject.id = match[0].id
            }

            fitObject.startTimeMillis = dataSet.startTimeMillis;
            fitObject.endTimeMillis = dataSet.endTimeMillis;
            fitObject.eventDate = new Date(parseInt(dataSet.startTimeMillis,10));
            for(const points of dataSet.dataset) {
                for(const data of points.point) {
                    fitObject.dataTypeName = data.dataTypeName;
                    fitObject.originDataSourceId = data.originDataSourceId;
                    fitObject.value = data.value;
                }
            }
            // if dataTypeName is not present, the record is empty !!
            if (fitObject.dataTypeName) {
                dataSetArray.push(fitObject);
            }
        }
        return dataSetArray
    } catch (err) {
        console.log('getActivity Catch: ' + err);
        return err
    } 
}

async function compareAndUpdate(item){
    let saved = await Fit.findById(item.id)
    let equal = _.isEqual(saved.value, item.value)
    if (!equal) {
        const filter = { _id: item.id };
        const update = {value: item.value};
        await Fit.findByIdAndUpdate(filter,update);
        return 1
    } else {
        return 0
    }
}

async function saveFitData(userID, array, dataTypeName, countArray) {
    try {
        if (array) {
            let updateCount = 0;
            let newCount = 0;
            for (i = 0; i < array.length; i++) {
                let fitItem = array[i];
                fitItem.userID = userID;
                if (fitItem.saved) {
                    compareAndUpdate(fitItem)
                        .then(response => updateCount + response);
                } else {
                    const newFit = new Fit(fitItem);
                    newFit.save();
                    newCount += 1
                }
            }
            //console.log([dataTypeName, updateCount, newCount])
            countArray.push([dataTypeName, updateCount, newCount])
            return countArray
        }
        
    } catch(err) {
        console.log('saveFitData Catch: ' + err)
        return err
    }
}

function setDateRange(days){
    let end = moment().startOf('day');
    end.add(1, 'days');
    let start = moment().startOf('day');
    start.subtract(days, 'days');
    const rangeString = start.format('lll') + ' until ' + end.format('lll');
    const intStart = parseInt(start.format('x'), 10);
    const intEnd = parseInt(end.format('x'), 10);
    return [ intStart, intEnd, rangeString ]
};

const lookupTimestamp = async (start, end, userID, dataTypeName) => {
    return await Fit.find(
        {
            userID: userID,
            dataTypeName: dataTypeName,
            eventDate: {
                $gte: start,
                $lte: end
            }
        }, 'dataTypeName startTimeMillis value');
  };



async function moveDataFromGoogleToMongoDB(days, userID, token, dataTypeArray) {
    let [ start, end ] = setDateRange(days);
    const countArray = [];
    const promises = dataTypeArray.map(async (dataName, idx) => {
        //console.log(`Received ${dataName[0]} ${idx+1}:`),
        await lookupTimestamp(start, end, userID, dataName[1])
            .then(returnObject => getActivity(token, start, end, dataName[2], returnObject)
            .then(returnArray => saveFitData(userID, returnArray, dataName[1], countArray)
            ))
            .catch(err => console.log(err))
    });
  
    
    await Promise.all(promises)
    return countArray
    
}


async function copyGoogleToDB(days, userID, token, dataTypeArray) {
    let [ start, end ] = setDateRange(days);
    const countArray = [];
    
    for (let i=0; i < dataTypeArray.length; i++) {
        const dataTypeName = dataTypeArray[i][0];
        const dataSourceId = dataTypeArray[i][1];

        lookupTimestamp(start, end, userID, dataTypeName)
            .then(returnObject => getActivity(token, start, end, dataSourceId, returnObject)
            .then(returnArray => saveFitData(userID, returnArray, dataTypeName, countArray)
            .then(() => {
                if (countArray.length === dataTypeArray.length) {
                    console.log(countArray);
                }
            })))
            .catch(err => console.log(err))
    }
    return 'done'
}

module.exports = {
    setDateRange,
    getUserProfile,
    newOauth2Client,
    callGoogle,
    returnAuthUrl,
    updateGoogleFit,
    saveTokens,
    moveDataFromGoogleToMongoDB,
    getDataSourcesFromGoogle,
    getUserTokenFromProfile,
    saveTokenToProfile,
    callAuthToRefreshToken,
    checkTokenHasExpired
}