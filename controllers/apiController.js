const moment = require('moment');
const passport = require('passport');

require('../auth/passport')

const Fit = require('../models/fitModel');
const Users = require('../models/userModel');
const Items = require('../models/itemModel');
const Symptom = require('../models/symptomModel');

const { 
  getUserProfile,
  setDateRange,
  newOauth2Client,
  returnAuthUrl,
  updateGoogleFit,
  saveTokens,
  moveDataFromGoogleToMongoDB,
  getDataSourcesFromGoogle,
  getUserTokenFromProfile,
  saveTokenToProfile,
  callAuthToRefreshToken,
  checkTokenHasExpired,
  getDataSource
} = require('./functions');

const {
  parseDateRange,
  countDays,
  getData,
  groupData
} = require('./item_functions');

//const { json } = require('body-parser');


const checkDataSourceId = [
  {
    name: 'nutrition_summary',
    label: 'Nutrition',
    group: 'nutrition',
    dataSourceId: 'derived:com.google.nutrition:com.google.android.gms:merged',
    dataTypeName: 'com.google.nutrition.summary',
  },
  {
    name: 'calories_expended',
    label: 'Calories Burned',
    group: 'exercise',
    dataSourceId: 'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended',
    dataTypeName: 'com.google.calories.expended',
  },
  {
    name: 'active_minutes',
    label: 'Active Minutes',
    group: 'exercise',
    dataSourceId: 'derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes',
    dataTypeName: 'com.google.active_minutes',
  },
  {
    name: 'heart_minutes_summary',
    label: 'Heart Health',
    group: 'exercise',
    dataSourceId: 'derived:com.google.heart_minutes:com.google.android.gms:merge_heart_minutes',
    dataTypeName: 'com.google.heart_minutes.summary',
  },
  {
    name: 'step_count_delta',
    label: 'Step Count',
    group: 'exercise',
    dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
    dataTypeName: 'com.google.step_count.delta',
  }
]

/*_________________________________________________________________________
Login Route______________________________________________________________*/

exports.login_route = function(req, res, next) {
  
  const { body: { user } } = req;

  if(!user.email) {
    return res.status(422).json({
      errors: {
        email: 'is required',
      },
    });
  }

  if(!user.password) {
    return res.status(422).json({
      errors: {
        password: 'is required',
      },
    });
  }
  return passport.authenticate('local', { session: false }, (err, passportUser, info) => {
    if(err) {
      return res.status(400).json({
        message: 'We are experiencing an error of unknown origin',
        user   : passportUser
      });
    }

    if (!passportUser) {
      return res.status(404).json({
        message: 'User does not exist.'
      })
    }

    if(passportUser) {
      const user = passportUser;
      user.token = passportUser.generateJWT();
      return res.json({ user: user.toAuthJSON() });
    }

    return status(400).info;
  })(req, res, next);
};





/*_________________________________________________________________________
Create New User Route____________________________________________________*/

exports.create_user = function(req, res, next) {
  const { body: {user } } = req;      

  if(!user.email) {
    return res.status(422).json({
      errors: {
        email: 'is required',
      },
    });
  }
  if(!user.password) {
    return res.status(422).json({
      errors: {
        password: 'is required',
      },
    });
  }
  console.log(user)
  const finalUser = new Users(user);
  finalUser.setPassword(user.password);
  return finalUser.save()
  .then((finalUser) => res.json({ user: finalUser.toAuthJSON() }));
};

/*_________________________________________________________________________
Read User profile data __________________________________________________*/

exports.read_user = async function(req, res, next) {
  const userID = req.payload.id;
  await Users.findById(userID, 'first_name family_name date_of_birth email weight googleFit daily_calorie_goal weight_goal')
  .exec((err, profile) => {
    if (err) {
      res.status(400).send(err)
    } else {
      res.json(profile)
    }
  })
}

/*_________________________________________________________________________
Read User profile data __________________________________________________*/

exports.edit_user = async function(req, res, next) {
  const userID = req.payload.id;
  console.log(userID)
  const { body } = req;
  await Users.findByIdAndUpdate(userID, body, {new: true})
  .exec((err, result) => {
    if (err) {
      res.status(400).send(err)
    } else {
      let { salt, hash, googleFit, _id, createdAt, __v, ...rest } = result._doc
      res.json(rest);
    }
  })
}


/*_________________________________________________________________________
Symptoms ________________________________________________________________*/

exports.create_symptom = async function(req, res, next) {
  const userID = req.payload.id;
  const symptom = req.body;
  symptom.userID = userID;
  const newSymptom = new Symptom(symptom);
  const response = await newSymptom.save();
  return res.json(response);
}

exports.read_symptom = function(req, res, next) {
  const userID = req.payload.id;
  Symptom.find({userID: userID}, function(err, arr) {
    if (err) res.send(err);
    if (arr) res.json(arr);
  });
}

exports.update_symptom = async function(req, res, next) {
  const { body, headers } = req;
  await Symptom.findByIdAndUpdate(headers.id, body, {new: true})
  .exec((err, result) => {
    if (err) {
      res.status(400).send(err)
    } else {
      res.json(result);
    }
  })
}

exports.delete_symptom = async function(req, res, next) {
  const { headers } = req;
  await Symptom.findByIdAndDelete(headers.id)
  .exec((err, result) => {
    if (err) {
      res.status(400).send(err)
    } else {
      res.json(result);
    }
  })
}





/*_________________________________________________________________________
New route for first time Google Authentication___________________________*/

exports.get_google_code = function(req, res, next) {
  const userID = req.headers.id;
  const callbackUrl = req.path;
  
  returnAuthUrl(callbackUrl, userID)
  .then(response => res.json(response))
}



/*_________________________________________________________________________
Google get first time access tokens______________________________________*/

exports.get_google_auth = (req, res, next) => {
  async function container() {
    try {
      const {id, code} = req.headers;   
      const oauth2Client = newOauth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      tokens.userID = id;
      saveTokens(tokens)
      updateGoogleFit(id)
      .then(() => res.json(tokens))
    } catch(err) {
      console.log(err)
      res.json(err)
    }
  };
  container()
}


 /*_________________________________________________________________________
Get list of DataSourceIds from Google_____________________________________*/

exports.data_sources = function(req, res, next) {
  const userID = req.payload.id
  getUserTokenFromProfile(userID)
  .then(async (token) => {
    return await callAuthToRefreshToken(token)
  })
  .then(async (token) => {
    const { credentials } = token
    const {data} = await getDataSourcesFromGoogle(credentials.access_token)
    return data
  })
  .then((response) => {
    const { dataSource } = response;
    let newArray = [];
    checkDataSourceId.forEach((obj) => {
      let [filteredData] = dataSource.filter((element) => element.dataStreamId === obj.dataSourceId);
      
      if (filteredData) {
        obj.dataDetails = filteredData;
      } else {
        obj.dataDetails = null;
      }
      
      newArray.push(obj);
    })
    return newArray
  })
  .then((response) => res.json(response) )
  .catch(err => console.log(err))
}


/*_________________________________________________________________________
Google Authentication redirect page______________________________________*/

exports.move_data_from_google = function(req, res, next) {
  const callbackUrl = req.path
  const userID = req.payload.id

  const { data_type } = req.params; 
  const dataSourceIdArray = getDataSource(data_type, checkDataSourceId);
  let days = 30


  async function container() {
    try {
      await getUserProfile(userID) //check if userProfile has googleFit 
        .then(async profile => {
          if (profile.googleFit) {
            console.log('User has googleFit set to true.')
            return tokenFromProfile = await getUserTokenFromProfile(userID)
          } else {
            console.log('User has not set googleFit before. Redirecting through returnAuthUrl.')
            returnAuthUrl(callbackUrl, userID)
              .then(response => res.redirect(response))
          }
        })
        .then(async token => {
          if (token) {
            if (checkTokenHasExpired(token)) {
              console.log('Saved token has expired. Using refresh_token to call oAuth')
              const { credentials } = await callAuthToRefreshToken(token)
              return credentials
            } else {
              console.log('Saved token from profile was still good.')
              token.fromProfile = true
              return token
            }
          } else {
            console.log('Could not find token. Redirecting back through returnAuthUrl')
            returnAuthUrl(callbackUrl, userID)
              .then(response => res.redirect(response))
          }
        })
        .then(credentials => {
          if (credentials.fromProfile) {
            console.log('Skipping save to profile')
            return credentials
          }
          console.log(`New token will expire:  ${credentials.expiry_date}.`)
          console.log(`Saving new token to profile.`)
          saveTokenToProfile(userID, credentials);
          return credentials
        })
        .then(tokens => moveDataFromGoogleToMongoDB(days, userID, tokens, dataSourceIdArray))
        .then(response => {
          console.log('Successfuly ran moveDataFromGoogleToMongoDB')
          res.json(response)})
      }
    catch(err) {
      console.log(err)
    }
  }
  container();
  }



/*_________________________________________________________________________
Get data from Database___________________________________________________*/

exports.get_range_data = function(req, res, next) {
  let userID;
  if (req.payload.id) {
    userID = req.payload.id
  } else {
    userID = req.headers.id
  }

  const { date_range, data_type } = req.params; 
  

  const dataSourceIdArray = getDataSource(data_type, checkDataSourceId);
  //console.log(dataSourceIdArray);
  // TODO: get params for dataTypes
  const days = 60;
  const fields = 'startTimeMillis endTimeMillis value' 

  function whatType(obj){
    return typeof obj
  }

  function buildChartArrays(response) {
    let newContainer = {};
    let groups = [...new Set(response.map(x => x.group))]
    for (let i=0; i < groups.length; i++) {
      //console.log(`--------------------------------------${groups[i]}`)
      newContainer[groups[i]] = {};
      newContainer[groups[i]].original = response.filter(item => item.group===groups[i]);
      newContainer[groups[i]].arrays = {}
      //console.log(newContainer[groups[i]].original.length)
      for (let ii=0; ii < newContainer[groups[i]].original.length; ii++) {
        let label = newContainer[groups[i]].original[ii].title.replace(' ','')
        //console.log(`----------------------------${label}`)
        newContainer[groups[i]].arrays[label]=[]
        //console.log(newContainer[groups[i]].original[ii].items.length)
        for (let iii=0; iii < newContainer[groups[i]].original[ii].items.length; iii++) {
          let item = newContainer[groups[i]].original[ii].items[iii]
          let objectArray = Object.entries(item.value)
          objectArray.forEach(([key, value]) => {
            let newValue = Object.entries(value)
            newValue.forEach(([key, value]) => {
              if (whatType(value)=== 'number') {
                if (value) {
                  newContainer[groups[i]].arrays[label].push({
                    date: item.startTimeMillis,
                    value: Math.round(value)
                  })
                } 
              } else {
                if (Array.isArray(value) && value.length > 0){
                  for (let j = 0; j < value.length; j++){
                    let lastValue = Object.values(value[j].value)
                    let lastKey = Object.values(value[j])
                    newContainer[groups[i]].arrays[label].push({
                      date: item.startTimeMillis,
                      value: Math.round(lastValue[0]),
                      key: lastKey[0].replace('.','_')
                    })
                  }
                }
              }
            });
          });
        }
      } 
    delete newContainer[groups[i]].original
    }
    return (newContainer)
  }

  const fetchData = async (userID, dateRangeArray, dataTypeObj) => {
    const [ start, end ] = dateRangeArray
    const { label: title, dataTypeName, group } = dataTypeObj
    const data = {};
    data.title = title;
    data.group = group;
    data.typeName = dataTypeName;
    data.dateStart = start;
    data.dateEnd = end;
    const items = await Fit.find({
      userID: userID,
      dataTypeName: dataTypeName,
      eventDate: { $gte: start,$lte: end}}, fields).sort([['eventDate', 'asc']])
    data.items = items
    return data
  }

  async function main(){
    try {
      let container = [];
      const promises = dataSourceIdArray.map(async (dataName, idx) => {
        await fetchData(userID, parseDateRange(date_range), dataName)
          .then(response => container.push(response))
      });
      await Promise.all(promises)
      return container
    } catch(err) {if (err) throw err}
  }

  main()
    .then(async response => buildChartArrays(response))
    .then(response => {res.json(response)})
    .catch((err) => {
      console.log(err);
      res.json('error')
    });
}

/*_________________________________________________________________________
Create New Records in Database __________________________________________*/

exports.create_item = async function(req, res, next) {
  const { item } = req.body;
  item.userID = req.payload.id;
  try {
    const newItem = new Items(item);
    return newItem.save()
    .then((newItem) => {
      res.json(newItem)
    })
  } catch(err) {
    res.json(err);
  }
}

/*_________________________________________________________________________
Read user items data ____________________________________________________*/

exports.read_items = async function(req, res, next) {
  let userID
  if (req.payload.id) {
    userID = req.payload.id
  } else {
    userID = req.headers.id
  }
  const { category, date_range } = req.params; 
  const [start,end] = parseDateRange(date_range);
  const days = countDays(start, end);
  
  try {
    const data = await getData(userID, start, end, category);
    const categories = [...new Set(data.map(x => x.dataTypeName))];
    const finalData = groupData(data, categories, start, days);
    res.json(finalData);
  } catch(err) {
    res.json(err);
  }
}

exports.demo = async function(req, res, next) {
  const user = {
    email: process.env.DEMO_EMAIL,
    password: process.env.DEMO_PASSWORD
  }
  res.json(user)
}
